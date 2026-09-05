import os
import sys
import django
import re

caminho_script = os.path.dirname(os.path.abspath(__file__))
caminho_projeto = os.path.dirname(caminho_script)
sys.path.append(caminho_projeto)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from exames.models import Exame
from pacientes.models import Paciente
from prontuario.models import Laudo
from agendamentos.models import Agendamento

def vincular_exames_orfaos_interativo():
    print("\n=== 🚀 INICIANDO VÍNCULO INTERATIVO (V3) ===\n")
    
    exames_pendentes = Exame.objects.filter(status='PENDENTE')
    total = exames_pendentes.count()
    print(f"Temos {total} exames aguardando resolução.\n")
    
    sucessos = 0
    pulados = 0
    
    for index, exame in enumerate(exames_pendentes, 1):
        nome_pasta = exame.nome_paciente_pasta
        paciente_encontrado = exame.paciente 
        
        # 1. TENTA AUTOMÁTICO PRIMEIRO (Para os que já foram casados ou fáceis)
        if not paciente_encontrado:
            match_novo = re.match(r"^(\d+)_(.*)", nome_pasta)
            match_antigo = re.match(r"^\d{8}-(\d+)_(.*)", nome_pasta)
            
            id_ref = None
            if match_novo:
                id_ref, nome_restante = match_novo.groups()
            elif match_antigo:
                id_ref, nome_restante = match_antigo.groups()
            else:
                nome_restante = nome_pasta
                
            nome_limpo_pasta = nome_restante.replace('_', ' ').strip().upper()
            primeiro_nome_pasta = nome_limpo_pasta.split()[0] if nome_limpo_pasta else ""

            # Travas automáticas
            if id_ref and id_ref.isdigit():
                p = Paciente.objects.filter(id=id_ref).first()
                if p and primeiro_nome_pasta in p.nome_completo.upper():
                    paciente_encontrado = p
                    
            if not paciente_encontrado and nome_limpo_pasta:
                nome_puro = re.sub(r'^[0-9-]+\s*_?', '', nome_limpo_pasta).strip()
                termos = [t for t in nome_puro.split() if len(t) > 2]
                if termos:
                    query = Paciente.objects.all()
                    for termo in termos:
                        query = query.filter(nome_completo__icontains=termo)
                    if query.count() == 1:
                        paciente_encontrado = query.first()

        # 2. SE NÃO ACHOU SOZINHO, CHAMA O HUMANO (VOCÊ)
        if not paciente_encontrado:
            print(f"\n---------------------------------------------------")
            print(f"📁 EXAME [{index}/{total}]: {nome_pasta}")
            
            while True:
                termo_busca = input("🔎 Digite um pedaço do nome, o ID correto, ou 'S' para pular: ").strip()
                
                if termo_busca.lower() == 's' or termo_busca == '':
                    print("⏭️  Pulado para o próximo.")
                    pulados += 1
                    break
                
                # Faz a busca baseada no que você digitou
                if termo_busca.isdigit():
                    candidatos = Paciente.objects.filter(id=termo_busca)
                else:
                    candidatos = Paciente.objects.filter(nome_completo__icontains=termo_busca)
                
                if not candidatos.exists():
                    print("⚠️ Nenhum paciente encontrado com esse termo. Tente novamente.")
                    continue
                
                print("\nEncontrei estes candidatos:")
                for i, cand in enumerate(candidatos, 1):
                    cpf = cand.cpf if cand.cpf else 'Sem CPF'
                    print(f"  [{i}] {cand.nome_completo} (ID: {cand.id} | CPF: {cpf})")
                print("  [0] CANCELAR essa busca e digitar outro nome")
                
                escolha = input("\n👉 Escolha o NÚMERO do paciente correto: ").strip()
                
                if escolha.isdigit():
                    escolha = int(escolha)
                    if escolha == 0:
                        continue # Volta pro input de busca
                    elif 1 <= escolha <= len(candidatos):
                        paciente_encontrado = candidatos[escolha - 1]
                        break # Sai do loop de busca e vai pro bloco de salvar
                
                print("❌ Opção inválida, tente novamente.")

        # 3. BLOCO DE SALVAMENTO (Para Automático ou Manual)
        if paciente_encontrado:
            exame.paciente = paciente_encontrado
            exame.status = 'DISPONIVEL'
            exame.save()
            
            Laudo.objects.get_or_create(
                exame=exame,
                defaults={
                    'paciente': paciente_encontrado,
                    'titulo_exame': f"Exames Anexados (Manual): {exame.nome_paciente_pasta}",
                    'status': 'FINALIZADO'
                }
            )
            sucessos += 1
            print(f"✅ VINCULADO: {paciente_encontrado.nome_completo}")
            
    print(f"\n=== 🎉 FAXINA CONCLUÍDA ===")
    print(f"Total processado: {total}")
    print(f"Exames vinculados com sucesso: {sucessos}")
    print(f"Exames pulados/ignorados: {pulados}")

if __name__ == "__main__":
    vincular_exames_orfaos_interativo()