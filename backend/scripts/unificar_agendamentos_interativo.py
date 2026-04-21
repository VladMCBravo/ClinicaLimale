import os
import django
import sys
from collections import defaultdict

# --- CORREÇÃO DO CAMINHO ---
# Isso faz o Python "voltar uma pasta" (de /scripts/ para /backend/) para achar o 'core'
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

# Ajuste 'core.settings' se o nome da pasta principal do seu projeto for diferente
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.utils import timezone
from agendamentos.models import Agendamento

def buscar_agendamentos_agrupados():
    agora = timezone.now()
    
    # Busca apenas agendamentos futuros e ativos, trazendo dados extras para mostrar na tela
    futuros = Agendamento.objects.filter(
        data_hora_inicio__gte=agora,
        status__in=['Agendado', 'Confirmado']
    ).select_related('paciente', 'procedimento', 'especialidade').order_by('paciente_id', 'data_hora_inicio')
    
    # Agrupa por Paciente e Data
    grupos = defaultdict(list)
    for ag in futuros:
        if ag.paciente:
            data_str = ag.data_hora_inicio.date().isoformat()
            chave = f"{ag.paciente.id}_{data_str}"
            grupos[chave].append(ag)
            
    # Filtra apenas os grupos que têm mais de 1 agendamento no mesmo dia
    grupos_para_unificar = [lista for lista in grupos.values() if len(lista) > 1]
    
    return grupos_para_unificar

def formatar_hora(dt):
    return timezone.localtime(dt).strftime('%H:%M')

def realizar_unificacao():
    grupos = buscar_agendamentos_agrupados()
    
    if not grupos:
        print("✅ Nenhum paciente com múltiplos exames no mesmo dia encontrado para o futuro.")
        return

    print(f"⚠️ Encontrados {len(grupos)} pacientes com mais de um agendamento no mesmo dia.\n")

    alterados_total = 0

    for lista_ags in grupos:
        paciente_nome = lista_ags[0].paciente.nome_completo
        data_exame = timezone.localtime(lista_ags[0].data_hora_inicio).strftime('%d/%m/%Y')
        
        print("-" * 60)
        print(f"📅 Paciente: {paciente_nome} | Data: {data_exame}")
        
        # Mostra os exames do grupo de forma limpa na tela
        for ag in lista_ags:
            if ag.tipo_agendamento == 'Consulta' and ag.especialidade:
                desc = f"Consulta - {ag.especialidade.nome}"
            elif ag.tipo_agendamento == 'Procedimento' and ag.procedimento:
                desc = ag.procedimento.descricao
            else:
                desc = ag.tipo_agendamento
                
            hora_inicio = formatar_hora(ag.data_hora_inicio)
            hora_fim = formatar_hora(ag.data_hora_fim)
            print(f"   [ ID: {ag.id} ] - Horário: {hora_inicio} às {hora_fim} | {desc}")
            
        # Trava de segurança visual: Verifica se já estão unificados
        horarios_inicio = set([ag.data_hora_inicio for ag in lista_ags])
        if len(horarios_inicio) == 1:
            print("   ✔️ Estes exames já estão unificados no mesmo horário. Pulando...")
            continue
            
        # A PERGUNTA INTERATIVA
        acao = input("\n👉 Deseja UNIFICAR os horários destes exames no primeiro horário? (s/n/sair): ").strip().lower()
        
        if acao == 'sair':
            print("Encerrando o processo.")
            break
        elif acao != 's':
            continue

        try:
            ag_base = lista_ags[0]
            inicio_base = ag_base.data_hora_inicio
            fim_base = ag_base.data_hora_fim
            
            print(f"\nUnificando tudo para iniciar às {formatar_hora(inicio_base)}...")
            
            # Atualiza os secundários preservando todas as outras informações financeiras e de saúde
            for i in range(1, len(lista_ags)):
                ag_secundario = lista_ags[i]
                ag_secundario.data_hora_inicio = inicio_base
                ag_secundario.data_hora_fim = fim_base
                
                campos_update = ['data_hora_inicio', 'data_hora_fim']
                
                # Se tiver o campo is_encaixe, seta para True para enganar a trava de conflito de sala
                if hasattr(ag_secundario, 'is_encaixe'):
                    ag_secundario.is_encaixe = True
                    campos_update.append('is_encaixe')
                    
                ag_secundario.save(update_fields=campos_update)
                alterados_total += 1
                
            print("   ✅ Exames unificados com sucesso!")
            
        except Exception as e:
            print(f"❌ Erro ao unificar agendamentos do paciente {paciente_nome}: {e}")

    print(f"\n--- SCRIPT FINALIZADO ---")
    print(f"Total de {alterados_total} agendamentos secundários agrupados ao horário base.")

if __name__ == "__main__":
    realizar_unificacao()