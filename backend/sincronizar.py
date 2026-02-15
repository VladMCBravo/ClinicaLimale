from pacientes.models import Paciente
from agendamentos.models import Agendamento
from crm.models import Ciclo
from django.utils import timezone
from datetime import timedelta

print("=== INICIANDO SINCRONIZAÇÃO DO CRM ===")

# --- PASSO 1: GARANTIR QUE TODO PACIENTE SEJA UM LEAD (F1) ---
pacientes = Paciente.objects.all()
pacientes_criados = 0

for paciente in pacientes:
    # A MÁGICA ANTIDUPLICAÇÃO: Só cria se o paciente não tiver NENHUM ciclo
    if not Ciclo.objects.filter(paciente=paciente).exists():
        Ciclo.objects.create(
            paciente=paciente,
            tipo='OUTRO',
            fase_atual='F1',
            status='ativo',
            responsavel=paciente.medico_responsavel
        )
        pacientes_criados += 1

print(f"-> {pacientes_criados} pacientes antigos adicionados à coluna F1.")


# --- PASSO 2: CONECTAR AGENDAMENTOS E MOVIMENTAR O FUNIL ---
agendamentos_sem_crm = Agendamento.objects.filter(ciclo__isnull=True).order_by('data_hora_inicio')
agendamentos_atualizados = 0

agora = timezone.now()
limite_retencao = agora - timedelta(days=30)

for ag in agendamentos_sem_crm:
    ciclo = Ciclo.objects.filter(paciente=ag.paciente, status='ativo').first()
    
    if not ciclo:
        continue
        
    Agendamento.objects.filter(id=ag.id).update(ciclo=ciclo)
    agendamentos_atualizados += 1
    
    novo_tipo = ciclo.tipo
    if ag.tipo_agendamento == 'Consulta' and ag.especialidade:
        novo_tipo = str(ag.especialidade.nome).upper()[:50]
    elif ag.tipo_agendamento == 'Procedimento' and ag.procedimento:
        novo_tipo = str(ag.procedimento.descricao).upper()[:50]
        
    nova_fase = ciclo.fase_atual
    
    if ag.status in ['Agendado', 'Confirmado']:
        nova_fase = 'F2'
    elif ag.status in ['Aguardando', 'Em Atendimento', 'Laudando']:
        nova_fase = 'F3'
    elif ag.status == 'Realizado':
        if ag.data_hora_inicio < limite_retencao:
            nova_fase = 'F4' 
        else:
            nova_fase = 'F3'
            
    Ciclo.objects.filter(id=ciclo.id).update(tipo=novo_tipo, fase_atual=nova_fase)

print(f"-> {agendamentos_atualizados} agendamentos processados e funil atualizado.")
print("=== SINCRONIZAÇÃO CONCLUÍDA ===")