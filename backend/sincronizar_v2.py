from pacientes.models import Paciente
from agendamentos.models import Agendamento
from crm.models import Ciclo

print("=== INICIANDO REVISÃO COMPLETA DO FUNIL (V3) ===")

ciclos = Ciclo.objects.all()
atualizados = 0

for ciclo in ciclos:
    # 1. Pega o agendamento mais recente
    ultimo_agendamento = Agendamento.objects.filter(paciente=ciclo.paciente).order_by('-data_hora_inicio').first()

    nova_fase = ciclo.fase_atual 
    novo_tipo = ciclo.tipo

    if ultimo_agendamento:
        Agendamento.objects.filter(id=ultimo_agendamento.id).update(ciclo=ciclo)

        if ultimo_agendamento.tipo_agendamento == 'Consulta' and ultimo_agendamento.especialidade:
            novo_tipo = str(ultimo_agendamento.especialidade.nome).upper()[:20]
        elif ultimo_agendamento.tipo_agendamento == 'Procedimento' and ultimo_agendamento.procedimento:
            novo_tipo = str(ultimo_agendamento.procedimento.descricao).upper()[:20]

        # REGRAS EXATAS (Sem invenção de tempo)
        st = ultimo_agendamento.status
        
        if st in ['Agendado', 'Confirmado']:
            nova_fase = 'F2'
            
        elif st in ['Aguardando', 'Em Atendimento', 'Laudando', 'Realizado']:
            nova_fase = 'F3' # Todo Realizado vai para F3 para a equipe trabalhar o pós-venda.
            
        elif st in ['Cancelado', 'Não Compareceu']:
            nova_fase = 'F5' # Cai direto na Recuperação.

    else:
        # Se não tem agendamento nenhum na história, é Lead.
        nova_fase = 'F1'

    # 3. Salva no banco
    if nova_fase != ciclo.fase_atual or novo_tipo != ciclo.tipo:
        Ciclo.objects.filter(id=ciclo.id).update(fase_atual=nova_fase, tipo=novo_tipo)
        atualizados += 1

print(f"-> {atualizados} Ciclos corrigidos (Realizados voltaram para a F3).")
print("=== REVISÃO CONCLUÍDA ===")