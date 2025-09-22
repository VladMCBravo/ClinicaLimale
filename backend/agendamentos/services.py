# backend/agendamentos/services.py

import logging 
from django.utils import timezone
from datetime import timedelta
from faturamento.models import Pagamento
from django.contrib.auth import get_user_model
# --- Importe os serviços do Inter que já criamos ---
from faturamento.services.inter_service import gerar_cobranca_pix, gerar_link_pagamento_cartao

# 2. Crie um logger para este arquivo
logger = logging.getLogger(__name__)

def criar_agendamento_e_pagamento_pendente(agendamento_instance, usuario_logado, metodo_pagamento_escolhido='PIX'):
    agendamento = agendamento_instance
    cargos_isentos = ['recepcao', 'admin']

    # --- LÓGICA DE CÁLCULO DE VALOR CORRIGIDA E ROBUSTA ---
    valor_do_pagamento = 0.00
    
    # Se for uma CONSULTA, o valor vem da ESPECIALIDADE
    if agendamento.tipo_agendamento == 'Consulta':
        if agendamento.especialidade and agendamento.especialidade.valor_consulta:
            valor_do_pagamento = agendamento.especialidade.valor_consulta

    # Se for um PROCEDIMENTO, o valor vem do PROCEDIMENTO
    elif agendamento.tipo_agendamento == 'Procedimento':
        if agendamento.procedimento and agendamento.procedimento.valor_particular:
            valor_do_pagamento = agendamento.procedimento.valor_particular
    # ---------------------------------------------------------
    
    # Cria o objeto de Pagamento primeiro
    pagamento = Pagamento.objects.create(
        agendamento=agendamento,
        paciente=agendamento.paciente,
        valor=valor_do_pagamento, # <-- USA A VARIÁVEL QUE CALCULAMOS
        status='Pendente',
        registrado_por=usuario_logado # ou um usuário de sistema
    )
    
    # Lógica de geração de pagamento (PIX ou Link)
    if not usuario_logado or usuario_logado.cargo not in cargos_isentos:
        if valor_do_pagamento > 0: # Só gera cobrança se houver valor
           # --- ALTERADO PARA logger.warning ---
            logger.warning("[DIAGNÓSTICO] Serviço recebeu a escolha: %s", metodo_pagamento_escolhido)

            if metodo_pagamento_escolhido == 'PIX':
                logger.warning("[DIAGNÓSTICO] Entrando no bloco para gerar PIX.")
                # ...
            elif metodo_pagamento_escolhido == 'CartaoCredito':
                logger.warning("[DIAGNÓSTICO] Entrando no bloco para gerar LINK DE CARTÃO.")
                # ...
            else:
                logger.warning("[DIAGNÓSTICO] NENHUMA CONDIÇÃO DE PAGAMENTO FOI ATENDIDA.")
            # ------------------------------------

            # A regra de expiração do AGENDAMENTO agora usa o tempo do pagamento
            if pagamento.pix_expira_em:
                agendamento.expira_em = pagamento.pix_expira_em
                agendamento.save()

    return agendamento