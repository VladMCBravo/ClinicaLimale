import os
import django
from difflib import SequenceMatcher

# Configuração do ambiente Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from pacientes.models import Paciente

# --- IMPORTANDO TODAS AS DEPENDÊNCIAS DESCOBERTAS NO RAIO-X ---
from agendamentos.models import Agendamento
from faturamento.models import TransacaoFinanceira, Pagamento
from exames.models import Exame
from integracao_dicom.models import ExameDicom
from crm.models import Ciclo, AnaliseComportamental

# Importando do prontuário (e dando um apelido para o Laudo para não dar conflito)
from prontuario.models import (
    Evolucao, Prescricao, Anamnese, Atestado, DocumentoPaciente, 
    MarcoDNPM, VacinaPaciente, RelatorioSalvo, Laudo as LaudoProntuario
)
# Importando o Laudo do app de laudos (com apelido)
from laudos.models import Laudo as LaudoGeral

TAXA_SEMELHANCA = 0.85 

def nomes_sao_parecidos(nome1, nome2):
    if not nome1 or not nome2:
        return False
    n1 = " ".join(nome1.lower().split())
    n2 = " ".join(nome2.lower().split())
    return SequenceMatcher(None, n1, n2).ratio() >= TAXA_SEMELHANCA

def mesclar_pacientes(paciente_principal, paciente_remover):
    """Transfere TODAS as dependências do raio-x para o principal e deleta o secundário."""
    
    # Lista com todos os modelos que possuem o campo 'paciente'
    modelos_relacionados = [
        Agendamento, TransacaoFinanceira, Pagamento, Exame, ExameDicom,
        Ciclo, AnaliseComportamental, Evolucao, Prescricao, Anamnese, 
        Atestado, DocumentoPaciente, MarcoDNPM, VacinaPaciente, 
        RelatorioSalvo, LaudoProntuario, LaudoGeral
    ]
    
    print(f"\n   🔄 Transferindo dados de '{paciente_remover.nome_completo}' (ID {paciente_remover.id}) para '{paciente_principal.nome_completo}' (ID {paciente_principal.id})...")
    
    for modelo in modelos_relacionados:
        try:
            qtd_atualizados = modelo.objects.filter(paciente=paciente_remover).update(paciente=paciente_principal)
            if qtd_atualizados > 0:
                print(f"      ✅ {qtd_atualizados} registro(s) transferido(s) em {modelo.__name__}.")
        except Exception as e:
            print(f"      ⚠️ Erro ao transferir {modelo.__name__}: {e}")

    try:
        nome_removido = paciente_remover.nome_completo
        id_removido = paciente_remover.id
        paciente_remover.delete()
        print(f"   🗑️ Paciente '{nome_removido}' (ID: {id_removido}) deletado com sucesso.\n")
    except Exception as e:
        print(f"   ❌ Erro ao deletar paciente ID {paciente_remover.id}. Pode haver vínculos residuais: {e}\n")


def buscar_e_gerenciar():
    print("🔍 Buscando pacientes iguais ou parecidos...\n")
    
    todos_pacientes = list(Paciente.objects.all())
    processados = set()
    
    for i, p1 in enumerate(todos_pacientes):
        if p1.id in processados:
            continue
            
        similares = []
        for p2 in todos_pacientes[i+1:]:
            if p2.id in processados:
                continue
            if nomes_sao_parecidos(p1.nome_completo, p2.nome_completo):
                similares.append(p2)
                
        if similares:
            grupo = [p1] + similares
            print("-" * 60)
            print("⚠️ GRUPO DE PACIENTES SUSPEITOS ENCONTRADO:")
            for idx, p in enumerate(grupo):
                print(f"[{idx}] ID: {p.id} | Nome: {p.nome_completo}")
                processados.add(p.id)
            
            print("\nComandos:")
            print("[0, 1...] Digite o número do paciente para MANTER (os outros serão mesclados para ele)")
            print("[P] Pular grupo")
            
            escolha = input("Sua escolha: ").strip().upper()
            
            if escolha == 'P':
                print("⏭️ Pulado.")
                continue
                
            elif escolha.isdigit():
                idx_manter = int(escolha)
                if 0 <= idx_manter < len(grupo):
                    principal = grupo[idx_manter]
                    secundarios = [p for j, p in enumerate(grupo) if j != idx_manter]
                    
                    for sec in secundarios:
                        mesclar_pacientes(principal, sec)
                else:
                    print("❌ Índice inválido. Pulando...")
            else:
                print("❌ Comando não reconhecido. Pulando...")
                
if __name__ == "__main__":
    buscar_e_gerenciar()