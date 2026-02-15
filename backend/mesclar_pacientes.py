import unicodedata
from pacientes.models import Paciente
from agendamentos.models import Agendamento
from crm.models import Ciclo
from exames.models import Exame
from faturamento.models import Pagamento
from django.db import transaction

print("=== INICIANDO ASSISTENTE DE MESCLAGEM INTELIGENTE (V3) ===")

def normalizar_texto(texto):
    if not texto: return ""
    texto_sem_acento = ''.join(c for c in unicodedata.normalize('NFD', str(texto)) if unicodedata.category(c) != 'Mn')
    return texto_sem_acento.lower().strip()

todos_pacientes = Paciente.objects.all()
grupos = {}

for p in todos_pacientes:
    nome_norm = normalizar_texto(p.nome_completo)
    telefone = normalizar_texto(p.telefone_celular)
    chave_agrupamento = telefone if telefone else nome_norm
    
    if chave_agrupamento not in grupos:
        grupos[chave_agrupamento] = []
    grupos[chave_agrupamento].append(p)

duplicatas_encontradas = {chave: lista for chave, lista in grupos.items() if len(lista) > 1}

if not duplicatas_encontradas:
    print("Nenhuma duplicata foi encontrada.")
    exit()

total_mesclados = 0

for chave, lista_pacientes in duplicatas_encontradas.items():
    print(f"\n{'='*60}")
    print(f"⚠️  POSSÍVEL DUPLICATA ENCONTRADA (Chave de busca: '{chave}')")
    print(f"{'='*60}")
    
    ids_disponiveis = []
    
    for p in lista_pacientes:
        ids_disponiveis.append(str(p.id))
        qtd_agendamentos = p.agendamentos.count()
        qtd_exames = Exame.objects.filter(paciente=p).count()
        qtd_pagamentos = Pagamento.objects.filter(paciente=p).count()
        
        print(f"[{p.id}] NOME: {p.nome_completo}")
        print(f"      Nasc: {p.data_nascimento} | CPF: {p.cpf or 'Vazio'} | Email: {p.email or 'Vazio'} | Tel: {p.telefone_celular}")
        print(f"      Histórico: {qtd_agendamentos} agend(s) | {qtd_exames} exame(s) | {qtd_pagamentos} cobrança(s)")
        print("-" * 30)
        
    print("\nOpções:")
    print(" - Digite o ID do paciente que você deseja MANTER.")
    print(" - Digite 'p' para PULAR este grupo.")
    print(" - Digite 'sair' para encerrar o script.")
    
    escolha = input("Sua escolha: ").strip().lower()
    
    if escolha == 'sair':
        break
    elif escolha == 'p' or escolha not in ids_disponiveis:
        print(">> Grupo ignorado.")
        continue
    
    id_vencedor = int(escolha)
    paciente_vencedor = Paciente.objects.get(id=id_vencedor)
    pacientes_perdedores = [p for p in lista_pacientes if p.id != id_vencedor]
    
    try:
        with transaction.atomic():
            print(f"\n🔄 Iniciando mesclagem para o ID {id_vencedor}...")
            
            for perdedor in pacientes_perdedores:
                # 1. TRANSFERIR AGENDAMENTOS E EXAMES
                Agendamento.objects.filter(paciente=perdedor).update(paciente=paciente_vencedor)
                Exame.objects.filter(paciente=perdedor).update(paciente=paciente_vencedor)
                
                # 2. TRANSFERIR FINANCEIRO
                Pagamento.objects.filter(paciente=perdedor).update(paciente=paciente_vencedor)
                
                # 3. APAGAR CICLOS ANTIGOS (CRM)
                Ciclo.objects.filter(paciente=perdedor).delete()
                
                # 4. TRANSFERIR DADOS PESSOAIS COM SEGURANÇA (Liberando chaves únicas primeiro)
                
                # Limpa as chaves únicas do perdedor e salva ANTES de passar pro vencedor
                cpf_temporario = perdedor.cpf
                email_temporario = perdedor.email
                
                if not paciente_vencedor.cpf and cpf_temporario:
                    perdedor.cpf = None
                
                if not paciente_vencedor.email and email_temporario:
                    perdedor.email = None
                    
                perdedor.save() # Banco limpa os registros
                
                # Agora passa pro vencedor em segurança
                if not paciente_vencedor.cpf and cpf_temporario:
                    paciente_vencedor.cpf = cpf_temporario
                    
                if not paciente_vencedor.email and email_temporario:
                    paciente_vencedor.email = email_temporario
                    
                if not paciente_vencedor.data_nascimento and perdedor.data_nascimento:
                    paciente_vencedor.data_nascimento = perdedor.data_nascimento
                
                paciente_vencedor.save()
                
                # 5. APAGAR O PERDEDOR
                print(f"   🗑️  Apagando ID {perdedor.id} ({perdedor.nome_completo})...")
                perdedor.delete()
                
            total_mesclados += 1
            print("✅ Mesclagem concluída com sucesso!")
            
    except Exception as e:
        print(f"❌ Erro ao mesclar grupo: {e}")

print(f"\n{'='*40}")
print(f"OPERAÇÃO FINALIZADA. {total_mesclados} grupo(s) mesclado(s).")