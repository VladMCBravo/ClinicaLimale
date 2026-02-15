from agendamentos.models import Agendamento
from crm.models import Ciclo

print("=== RECLASSIFICANDO RETORNOS (V4) ===")
ciclos = Ciclo.objects.all()
atualizados = 0

for ciclo in ciclos:
    ultimo_agendamento = Agendamento.objects.filter(paciente=ciclo.paciente).order_by('-data_hora_inicio').first()
    
    if ultimo_agendamento:
        # Existe exame REALIZADO no passado deste paciente?
        teve_sucesso = Agendamento.objects.filter(
            paciente=ciclo.paciente, 
            status='Realizado', 
            data_hora_inicio__lt=ultimo_agendamento.data_hora_inicio
        ).exists()
        
        if teve_sucesso:
            Agendamento.objects.filter(id=ultimo_agendamento.id).update(tipo_visita='Retorno')
            # Se ele está agendado atualmente, tira da F2 e joga pra F4
            if ultimo_agendamento.status in ['Agendado', 'Confirmado'] and ciclo.fase_atual != 'F4':
                Ciclo.objects.filter(id=ciclo.id).update(fase_atual='F4')
                atualizados += 1
        else:
            Agendamento.objects.filter(id=ultimo_agendamento.id).update(tipo_visita='Primeira Consulta')

print(f"-> {atualizados} pacientes reclassificados como RETORNO e movidos para a F4.")
print("=== FIM ===")