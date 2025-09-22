# backend/agendamentos/services.py

import logging 
from django.utils import timezone
from datetime import timedelta
from faturamento.models import Pagamento
from django.contrib.auth import get_user_model
from faturamento.services.inter_service import gerar_cobranca_pix, gerar_link_pagamento_cartao

logger = logging.getLogger(__name__)

def criar_agendamento_e_pagamento_pendente(agendamento_instance, usuario_logado, metodo_pagamento_escolhido='PIX'):
    
    agendamento = agendamento_instance
    cargos_isentos = ['recepcao', 'admin']

    # Lógica de cálculo de valor (está correta)
    valor_do_pagamento = 0.00
    if agendamento.tipo_agendamento == 'Consulta':
        if agendamento.especialidade and agendamento.especialidade.valor_consulta:
            valor_do_pagamento = agendamento.especialidade.valor_consulta
    elif agendamento.tipo_agendamento == 'Procedimento':
        if agendamento.procedimento and agendamento.procedimento.valor_particular:
            valor_do_pagamento = agendamento.procedimento.valor_particular
    
    # Cria o objeto de Pagamento (está correto)
    pagamento = Pagamento.objects.create(
        agendamento=agendamento,
        paciente=agendamento.paciente,
        valor=valor_do_pagamento,
        status='Pendente',
        registrado_por=usuario_logado
    )
    
    # Lógica de geração de pagamento
    if not usuario_logado or usuario_logado.cargo not in cargos_isentos:
        if valor_do_pagamento > 0:
            logger.warning("[DIAGNÓSTICO] Serviço recebeu a escolha: %s", metodo_pagamento_escolhido)

            if metodo_pagamento_escolhido == 'PIX':
                logger.warning("[DIAGNÓSTICO] Entrando no bloco para gerar PIX.")
                # --- CHAMADA RESTAURADA ---
                gerar_cobranca_pix(pagamento, minutos_expiracao=15)

            elif metodo_pagamento_escolhido == 'CartaoCredito':
                logger.warning("[DIAGNÓSTICO] Entrando no bloco para gerar LINK DE CARTÃO.")
                # --- CHAMADA RESTAURADA ---
                gerar_link_pagamento_cartao(pagamento, minutos_expiracao=15)
                
            else:
                logger.warning("[DIAGNÓSTICO] NENHUMA CONDIÇÃO DE PAGAMENTO FOI ATENDIDA.")

            # Atualiza a expiração do agendamento (está correto)
            if pagamento.pix_expira_em:
                agendamento.expira_em = pagamento.pix_expira_em
                agendamento.save()

    return agendamento