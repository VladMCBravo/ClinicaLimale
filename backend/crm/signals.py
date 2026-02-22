# backend/crm/signals.py

import re
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.apps import apps
from django.utils import timezone
from datetime import datetime, timedelta
from .services import CRMService

# 1. GATILHO: PACIENTE (Gera o Lead no CRM)
@receiver(post_save, sender='pacientes.Paciente')
def criar_lead_crm(sender, instance, created, **kwargs):
    if created:
        Ciclo = apps.get_model('crm', 'Ciclo')
        Ciclo.objects.create(
            paciente=instance,
            tipo='OUTRO', 
            fase_atual='F1', # F1 - Apenas Cadastro
            status='ativo',
            responsavel=instance.medico_responsavel
        )
        print(f"[CRM] Lead criado na F1: {instance.nome_completo}")


# =========================================================
# GATILHO 2: AGENDAMENTO (Movimenta o Funil e Detecta Retorno)
# =========================================================
@receiver(post_save, sender='agendamentos.Agendamento')
def atualizar_funil_crm(sender, instance, created, **kwargs):
    Ciclo = apps.get_model('crm', 'Ciclo')
    Agendamento = apps.get_model('agendamentos', 'Agendamento')
    
    ciclo = instance.ciclo

    # Garante a existência do Ciclo (Lead)
    if not ciclo:
        ciclo = Ciclo.objects.filter(
            paciente=instance.paciente, status='ativo'
        ).exclude(fase_atual='ENCERRADO').order_by('-data_inicio').first()

        if not ciclo:
            ciclo = Ciclo.objects.create(paciente=instance.paciente, tipo='OUTRO', fase_atual='F2', status='ativo')
        
        Agendamento.objects.filter(pk=instance.pk).update(ciclo=ciclo)
        instance.ciclo = ciclo 

    # Atualiza Especialidade/Procedimento no Card
    novo_tipo = ciclo.tipo
    if instance.tipo_agendamento == 'Consulta' and instance.especialidade:
        novo_tipo = str(instance.especialidade.nome).upper()[:20]
    elif instance.tipo_agendamento == 'Procedimento' and instance.procedimento:
        novo_tipo = str(instance.procedimento.descricao).upper()[:20]

    # -------------------------------------------------------------
    # A SUA LÓGICA DE RETORNO (VERIFICA O PASSADO)
    # -------------------------------------------------------------
    # O banco busca se existe algum agendamento 'Realizado' antes da data atual
    teve_sucesso_anterior = Agendamento.objects.filter(
        paciente=instance.paciente,
        status='Realizado',
        data_hora_inicio__lt=instance.data_hora_inicio
    ).exclude(id=instance.id).exists()

    # Se teve sucesso antes, classifica silenciosamente como "Retorno"
    if teve_sucesso_anterior and instance.tipo_visita != 'Retorno':
        Agendamento.objects.filter(id=instance.id).update(tipo_visita='Retorno')
        instance.tipo_visita = 'Retorno'
    # Se não teve, ou se o passado foi só "Não Compareceu/Cancelado", é Primeira Consulta
    elif not teve_sucesso_anterior and instance.tipo_visita != 'Primeira Consulta':
        Agendamento.objects.filter(id=instance.id).update(tipo_visita='Primeira Consulta')
        instance.tipo_visita = 'Primeira Consulta'

    # -------------------------------------------------------------
    # MOVIMENTAÇÃO DO KANBAN (A REGRA DE FERRO DA RECEPÇÃO)
    # -------------------------------------------------------------
    nova_fase = ciclo.fase_atual

    # REGRA BÁSICA: Se estava no castigo da F1 e ganhou agendamento, vai para F2.
    if nova_fase == 'F1':
        nova_fase = 'F2'

    # REGRAS DE STATUS
    status_f3 = ['Confirmado', 'Aguardando', 'Em Atendimento', 'Laudando', 'Realizado']
    status_f5 = ['Cancelado', 'Não Compareceu']

    if instance.status in status_f5:
        nova_fase = 'F5' # Paciente faltou, vai para recuperação
    elif instance.status in status_f3:
        if teve_sucesso_anterior and instance.status == 'Realizado':
            nova_fase = 'F4' # É Retorno/Retenção!
        else:
            nova_fase = 'F3' # Pós-Exame / Confirmado

    # Aplica as mudanças no CRM
    if nova_fase != ciclo.fase_atual or novo_tipo != ciclo.tipo:
        Ciclo.objects.filter(id=ciclo.id).update(fase_atual=nova_fase, tipo=novo_tipo)


# 3. GATILHO: EXAMES (Move para Pós-Atendimento)
# APAGUE ISTO DO SEU ARQUIVO:
# @receiver(post_save, sender='exames.Exame')
# def acionar_crm_exame(sender, instance, created, **kwargs):
#     if instance.ciclo and instance.ciclo.fase_atual in ['F1', 'F2']:
#         Ciclo = apps.get_model('crm', 'Ciclo')
#         Ciclo.objects.filter(pk=instance.ciclo.pk).update(fase_atual='F3')

# =========================================================
# GATILHO 4: FATURAMENTO (Atualiza o LTV do Paciente no CRM)
# =========================================================
@receiver(post_save, sender='faturamento.Pagamento')
def atualizar_receita_ciclo(sender, instance, **kwargs):
    """
    Sempre que a recepção der baixa em um pagamento, 
    o CRM escuta, procura a qual ciclo esse agendamento pertence
    e recalcula a receita total (LTV).
    """
    # Verifica se o pagamento foi concluído e se ele está ligado a um ciclo
    if instance.status == 'Pago' and instance.agendamento and instance.agendamento.ciclo:
        # Chama a função que já existe no seu model Ciclo
        instance.agendamento.ciclo.calcular_ltv()
        print(f"[CRM] LTV Atualizado para o Ciclo {instance.agendamento.ciclo.id} (Paciente: {instance.agendamento.paciente.nome_completo})")

# =========================================================
# GATILHO 5: LAUDO (Engenharia Reversa da Idade Gestacional)
# =========================================================
@receiver(post_save, sender='prontuario.Laudo')
def atualizar_dum_crm_via_laudo(sender, instance, created, **kwargs):
    """
    Escuta toda vez que um Laudo é salvo. 
    Se a ajudante não preencheu a DUM, o sistema lê a Biometria Fetal,
    volta no tempo e salva a DUM matemática no CRM.
    """
    # 1. Ignora laudos fantasmas ou da máquina
    if instance.titulo_exame and "Exames Anexados" in instance.titulo_exame:
        return

    dados = instance.dados_estruturados
    paciente = instance.paciente

    if not paciente or not dados:
        return

    feto1 = dados.get('feto1', {})
    if not isinstance(feto1, dict):
        return

    # Descobre a data base do exame
    data_referencia = instance.data_criacao.date()
    if instance.exame and instance.exame.data_exame:
        data_referencia = instance.exame.data_exame

    dum_data = None

    # TENTATIVA 1: DUM preenchida explicitamente no laudo
    dum_str = feto1.get('dum', '')
    if dum_str and isinstance(dum_str, str) and len(dum_str) >= 10:
        try:
            dum_data = datetime.strptime(dum_str[:10], '%Y-%m-%d').date()
        except ValueError:
            pass

    # TENTATIVA 2: Engenharia Reversa pela Biometria
    if not dum_data:
        padrao_ig = re.compile(r'(?i)(\d+)\s*(?:semanas?|sem|s|w)(?:\s*e\s*|\s+)?(?:(\d+)\s*(?:dias?|d))?')
        campos_ig = [
            feto1.get('igVeredito', ''),
            feto1.get('igBiometria', ''),
            feto1.get('igIgCorrigidaCalculada', ''),
            feto1.get('resIgCcn', ''),
            feto1.get('resIgSg', '')
        ]

        for campo in campos_ig:
            if campo and isinstance(campo, str):
                match = re.search(padrao_ig, campo)
                if match:
                    semanas = int(match.group(1))
                    dias = int(match.group(2)) if match.group(2) else 0
                    
                    # Volta no calendário
                    dias_totais = (semanas * 7) + dias
                    dum_data = data_referencia - timedelta(days=dias_totais)
                    break

    # 3. Salva a descoberta no Paciente e no CRM
    if dum_data:
        Ciclo = apps.get_model('crm', 'Ciclo')
        atualizou = False
        
        # Salva no paciente (se ele não tiver DUM)
        if not paciente.dum:
            paciente.dum = dum_data
            paciente.save(update_fields=['dum'])
            atualizou = True
            
        # Salva no Ciclo Ativo do CRM
        ciclo = Ciclo.objects.filter(paciente=paciente, status='ativo').first()
        if ciclo and not getattr(ciclo, 'data_dum', None):
            ciclo.data_dum = dum_data
            ciclo.save(update_fields=['data_dum'])
            atualizou = True

        if atualizou:
            print(f"🤖 [CRM AUTOMAÇÃO] Engenharia Reversa aplicada para {paciente.nome_completo}: DUM Calculada -> {dum_data}")