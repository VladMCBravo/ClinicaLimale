# backend/agendamentos/services.py - VERSÃO FINAL SIMPLIFICADA

import logging 
from django.utils import timezone
from datetime import timedelta
from faturamento.models import Pagamento
from django.contrib.auth import get_user_model
from faturamento.services.inter_service import gerar_cobranca_pix, gerar_link_pagamento_cartao

logger = logging.getLogger(__name__)

def criar_agendamento_e_pagamento_pendente(agendamento_instance, usuario_logado, metodo_pagamento_escolhido='PIX'):
    agendamento = agendamento_instance

    # Lógica de cálculo de valor (está correta)
    valor_do_pagamento = 0.00
    if agendamento.tipo_agendamento == 'Consulta':
        if agendamento.especialidade and agendamento.especialidade.valor_consulta:
            valor_do_pagamento = agendamento.especialidade.valor_consulta
    elif agendamento.tipo_agendamento == 'Procedimento':
        if agendamento.procedimento and agendamento.procedimento.valor_particular:
            valor_do_pagamento = agendamento.procedimento.valor_particular
    
    pagamento = Pagamento.objects.create(
        agendamento=agendamento,
        paciente=agendamento.paciente,
        valor=valor_do_pagamento,
        status='Pendente',
        registrado_por=usuario_logado
    )
    
    # --- LÓGICA DE GERAÇÃO DE PAGAMENTO SIMPLIFICADA ---
    # Se quem registrou foi o usuário do chatbot, SEMPRE gere o pagamento.
    if usuario_logado and usuario_logado.username == 'servico_chatbot':
        if valor_do_pagamento > 0:
            logger.warning("[SERVICE-DIAG] Usuário é o 'servico_chatbot'. Gerando pagamento.")
            if metodo_pagamento_escolhido == 'PIX':
                logger.warning("[SERVICE-DIAG] Entrando no bloco para gerar PIX.")
                gerar_cobranca_pix(pagamento, minutos_expiracao=15)
            elif metodo_pagamento_escolhido == 'CartaoCredito':
                logger.warning("[SERVICE-DIAG] Entrando no bloco para gerar LINK DE CARTÃO.")
                gerar_link_pagamento_cartao(pagamento, minutos_expiracao=15)

            if hasattr(pagamento, 'pix_expira_em') and pagamento.pix_expira_em:
                agendamento.expira_em = pagamento.pix_expira_em
                agendamento.save()
    # Se for um usuário logado (recepção/admin), não faz nada, pois o pagamento será manual.
    else:
        logger.warning("[SERVICE-DIAG] Usuário é %s. Nenhum pagamento automático gerado.", usuario_logado.username)


    return agendamento