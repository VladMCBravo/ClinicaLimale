import os
import sys
import django
import json
import csv

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings') 

try:
    django.setup()
    print("✅ Django configurado.")
except Exception as e:
    print(f"❌ Erro: {e}")
    sys.exit(1)

from crm.models import Ciclo
from prontuario.models import Laudo
from agendamentos.models import Agendamento

def gerar_diagnostico():
    # Pegamos todos os ciclos ativos que não tem DUM
    ciclos = Ciclo.objects.filter(data_dum__isnull=True, status='ativo').select_related('paciente')
    print(f"--- Analisando {ciclos.count()} pacientes sem IG no CRM ---")
    
    with open('diagnostico_crm.csv', mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['Paciente', 'Fase', 'Ultimo Agendamento', 'Pista / Motivo', 'Detalhe do Laudo'])

        for c in ciclos:
            paciente = c.paciente
            pista = "Desconhecido"
            detalhe = ""

            # 1. Checar se tem agendamento e qual o tipo
            agend = Agendamento.objects.filter(paciente=paciente).order_by('-data_hora_inicio').first()
            proc = agend.procedimento.descricao if (agend and agend.procedimento) else "Sem procedimento"
            
            # 2. Checar se tem laudo
            laudo = Laudo.objects.filter(paciente=paciente).order_by('-data_criacao').first()
            
            if not laudo:
                pista = "Paciente não possui nenhum laudo salvo no prontuário"
            else:
                dados = laudo.dados_estruturados
                if isinstance(dados, str):
                    try: dados = json.loads(dados)
                    except: dados = {}
                
                # Pista baseada no conteúdo do laudo
                if 'feto1' in dados:
                    ig = dados['feto1'].get('igVeredito') or dados['feto1'].get('igBiometria')
                    if not ig:
                        pista = "Laudo Obstétrico existe, mas os campos de IG estão vazios"
                    else:
                        pista = "Laudo tem IG, mas o script fix_crm não sincronizou (verificar formato)"
                        detalhe = f"IG encontrada: {ig}"
                else:
                    pista = f"Laudo de outra especialidade ou tipo ({laudo.tipo_exame})"

            # Ajuste de pista por procedimento
            if "Consulta" in proc:
                pista = "Paciente de Consulta (Geralmente não tem DUM)"
            elif "Cardio" in proc or "Ecocardiograma" in proc:
                pista = "Especialidade Cardiologia"
            elif "Transvaginal" in proc:
                pista = "Exame Ginecológico (não gestacional)"

            writer.writerow([paciente.nome_completo, c.get_fase_atual_display(), proc, pista, detalhe])
            print(f"🔎 {paciente.nome_completo}: {pista}")

    print(f"\n✅ Relatório 'diagnostico_crm.csv' gerado com sucesso!")

if __name__ == "__main__":
    gerar_diagnostico()