import os
import sys
import django
from django.db import transaction, IntegrityError
from django.db.models import Q

# Configuração do ambiente
caminho_script = os.path.dirname(os.path.abspath(__file__))
caminho_projeto = os.path.dirname(caminho_script)
sys.path.append(caminho_projeto)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from usuarios.models import CustomUser, MedicoEspecialidade, JornadaDeTrabalho, CertificadoMedico
from agendamentos.models import Agendamento
from pacientes.models import Paciente

def buscar_usuario(papel_texto):
    """Função interativa para buscar usuário por nome, login ou ID"""
    while True:
        termo = input(f"👉 Digite o nome, login ou ID do {papel_texto}: ").strip()
        
        if not termo:
            print("⚠️ Digite algo para buscar.")
            continue
        
        # Busca por ID ou por texto (nome, sobrenome ou login)
        if termo.isdigit():
            candidatos = CustomUser.objects.filter(id=termo)
        else:
            candidatos = CustomUser.objects.filter(
                Q(first_name__icontains=termo) | 
                Q(last_name__icontains=termo) | 
                Q(username__icontains=termo)
            )
        
        if not candidatos.exists():
            print("⚠️ Nenhum usuário encontrado com esse termo. Tente novamente.")
            continue
        
        if candidatos.count() == 1:
            return candidatos.first()
        
        print("\nEncontrei estes candidatos:")
        for i, cand in enumerate(candidatos, 1):
            nome = cand.get_full_name() or "Sem Nome"
            print(f"  [{i}] {nome} (Login: {cand.username} | Cargo: {cand.cargo} | ID: {cand.id})")
        print("  [0] CANCELAR essa busca e digitar outro nome")
        
        escolha = input("\n👉 Escolha o NÚMERO do usuário correto: ").strip()
        
        if escolha.isdigit():
            escolha = int(escolha)
            if escolha == 0:
                continue
            elif 1 <= escolha <= len(candidatos):
                return candidatos[escolha - 1]
        
        print("❌ Opção inválida, tente novamente.")

def mesclar_usuarios():
    print("\n=== 🧬 UNIFICADOR DE CONTAS (ADMIN + MÉDICO) ===\n")

    user_admin = buscar_usuario("ADMIN (a conta que VAI FICAR e receber os dados)")
    print(f"✅ Selecionado ADMIN: {user_admin.get_full_name()} (ID {user_admin.id})\n")

    user_medico = buscar_usuario("MÉDICO (a conta que SERÁ DESATIVADA após transferir os dados)")
    print(f"✅ Selecionado MÉDICO: {user_medico.get_full_name()} (ID {user_medico.id})\n")

    if user_admin.id == user_medico.id:
        print("❌ Erro: Você selecionou a mesma conta para os dois papeis!")
        return

    print("---------------------------------------------------------")
    print(f"RESUMO DA OPERAÇÃO:")
    print(f"  -> A conta [{user_admin.username}] vai absorver a agenda e dados da conta [{user_medico.username}].")
    print(f"  -> A conta [{user_medico.username}] será DESATIVADA do sistema.")
    print("---------------------------------------------------------")

    confirmacao = input("\n⚠️ Tem certeza que deseja mesclar essas contas? (S/N): ").strip().upper()
    if confirmacao != 'S':
        print("Operação cancelada.")
        return

    try:
        with transaction.atomic():
            # 0. MEMORIZA DADOS DO MÉDICO E LIMPA A CONTA PARA LIBERAR O CPF/CRM NO BANCO
            print("\n🔄 Guardando dados na memória e liberando chaves únicas...")
            campos_perfil = [
                'crm', 'cpf', 'telefone', 'data_nascimento', 'genero', 
                'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'cep',
                'digital_template', 'pin_ponto'
            ]
            
            dados_medico_memoria = {}
            for campo in campos_perfil:
                dados_medico_memoria[campo] = getattr(user_medico, campo)
            
            # Desativa e limpa a conta velha AGORA (liberando o banco de dados)
            user_medico.is_active = False
            user_medico.username = f"{user_medico.username}_mesclado_{user_medico.id}"
            user_medico.crm = None
            user_medico.cpf = None
            user_medico.save()

            # 1. COPIAR DADOS DE PERFIL PARA O ADMIN
            print("🔄 Transferindo dados de perfil para o Admin...")
            for campo in campos_perfil:
                valor_medico = dados_medico_memoria[campo]
                valor_admin = getattr(user_admin, campo)
                
                # Só copia se o admin ainda não tiver essa informação
                if valor_medico and not valor_admin:
                    setattr(user_admin, campo, valor_medico)
                    print(f"  - {campo} transferido: {valor_medico}")

            # Atualiza o cargo principal e salva (agora sem dar erro de unique)
            user_admin.cargo = 'admin_medico'
            user_admin.save()

            # 2. TRANSFERIR ESPECIALIDADES (Tabela Intermediária)
            print("🔄 Transferindo Especialidades e RQEs...")
            especialidades_medico = MedicoEspecialidade.objects.filter(medico=user_medico)
            for esp in especialidades_medico:
                try:
                    esp.medico = user_admin
                    esp.save()
                    print(f"  - Especialidade {esp.especialidade.nome} transferida.")
                except IntegrityError:
                    esp.delete() # Se o admin já tiver, apaga a duplicata

            # 3. TRANSFERIR JORNADAS DE TRABALHO
            print("🔄 Transferindo Jornadas de Trabalho...")
            jornadas = JornadaDeTrabalho.objects.filter(medico=user_medico)
            qtd_jornadas = jornadas.update(medico=user_admin)
            print(f"  - {qtd_jornadas} horários de jornada transferidos.")

            # 4. TRANSFERIR CERTIFICADO DIGITAL
            print("🔄 Transferindo Certificado Digital...")
            if hasattr(user_medico, 'certificado'):
                certificado = user_medico.certificado
                certificado.medico = user_admin
                certificado.save()
                print("  - Certificado A1 transferido com sucesso.")

            # 5. TRANSFERIR AGENDAMENTOS
            print("🔄 Transferindo Histórico de Agendamentos...")
            agendamentos = Agendamento.objects.filter(medico=user_medico)
            qtd_agendamentos = agendamentos.update(medico=user_admin)
            print(f"  - {qtd_agendamentos} agendamentos transferidos.")

            # 6. TRANSFERIR PACIENTES (Médico Responsável)
            print("🔄 Transferindo Vínculo de Pacientes...")
            pacientes = Paciente.objects.filter(medico_responsavel=user_medico)
            qtd_pacientes = pacientes.update(medico_responsavel=user_admin)
            print(f"  - {qtd_pacientes} pacientes vinculados transferidos.")

            print("\n🎉 === SUCESSO! AS CONTAS FORAM UNIFICADAS === 🎉")
            print(f"O usuário {user_admin.get_full_name()} agora é {user_admin.cargo} e herdou todas as configurações!")

    except Exception as e:
        print(f"\n❌ ERRO CRÍTICO DURANTE A MESCLA: {e}")
        print("A transação foi desfeita (Rollback automático). Nenhuma alteração foi salva no banco.")

if __name__ == "__main__":
    mesclar_usuarios()