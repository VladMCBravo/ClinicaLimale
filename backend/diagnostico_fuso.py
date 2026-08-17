from agendamentos.models import Agendamento
from zoneinfo import ZoneInfo
from datetime import timedelta

FUSO_CLINICA = ZoneInfo('America/Sao_Paulo')
HORARIO_ABERTURA = 6
HORARIO_FECHAMENTO = 22

qs = Agendamento.objects.all()
suspeitos = []

for ag in qs.select_related('paciente', 'medico'):
    if not ag.data_hora_inicio:
        continue
    hora_local = ag.data_hora_inicio.astimezone(FUSO_CLINICA)
    hora = hora_local.hour
    if hora < HORARIO_ABERTURA or hora >= HORARIO_FECHAMENTO:
        suspeitos.append({
            'id': ag.id,
            'paciente': ag.paciente.nome_completo if ag.paciente else '(sem paciente)',
            'medico': str(ag.medico) if ag.medico else '(sem médico)',
            'horario_salvo_brt': hora_local.strftime('%d/%m/%Y %H:%M'),
            'horario_bruto_banco': ag.data_hora_inicio,
            'status': ag.status,
        })

print(f"\n{'='*70}")
print(f"Total de agendamentos analisados: {qs.count()}")
print(f"Suspeitos encontrados (horario fora de 06:00-22:00 BRT): {len(suspeitos)}")
print(f"{'='*70}\n")

for s in suspeitos:
    hora_corrigida = (s['horario_bruto_banco'] + timedelta(hours=3)).astimezone(FUSO_CLINICA)
    print(f"ID {s['id']:>5} | salvo: {s['horario_salvo_brt']} | {s['paciente']:<30} | {s['medico']:<25} | status={s['status']}")
    print(f"        -> Se fosse +3h, seria: {hora_corrigida.strftime('%d/%m/%Y %H:%M')}")
    print()
