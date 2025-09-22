# backend/agendamentos/services.py

import sys  # <-- 1. Importe o módulo 'sys'
import logging 
from django.utils import timezone
from datetime import timedelta
from faturamento.models import Pagamento
from django.contrib.auth import get_user_model
from faturamento.services.inter_service import gerar_cobranca_pix, gerar_link_pagamento_cartao

logger = logging.getLogger(__name__)

def criar_agendamento_e_pagamento_pendente(agendamento_instance, usuario_logado, metodo_pagamento_escolhido='PIX'):
    
    # --- USANDO PRINT PARA STDERR PARA GARANTIR A SAÍDA ---
    print("\n--- INICIANDO CRIAR_AGENDAMENTO_E_PAGAMENTO_PENDENTE ---", file=sys.stderr)
    sys.stderr.flush()
    # ----------------------------------------------------

    agendamento = agendamento_instance
    cargos_isentos = ['recepcao', 'admin']

    # Lógica de cálculo de valor
    valor_do_pagamento = 0.00
    if agendamento.tipo_agendamento == 'Consulta':
        if agendamento.especialidade and agendamento.especialidade.valor_consulta:
            valor_do_pagamento = agendamento.especialidade.valor_consulta
    elif agendamento.tipo_agendamento == 'Procedimento':
        if agendamento.procedimento and agendamento.procedimento.valor_particular:
            valor_do_pagamento = agendamento.procedimento.valor_particular
    
    # --- DIAGNÓSTICO COM PRINT ---
    print(f"[SERVICE-DIAG] Valor do pagamento calculado: {valor_do_pagamento}", file=sys.stderr)
    sys.stderr.flush()
    # ---------------------------
    
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
            print(f"[SERVICE-DIAG] Serviço recebeu a escolha: {metodo_pagamento_escolhido}", file=sys.stderr)
            sys.stderr.flush()

            if metodo_pagamento_escolhido == 'PIX':
                print("[SERVICE-DIAG] Entrando no bloco para gerar PIX.", file=sys.stderr)
                sys.stderr.flush()
                gerar_cobranca_pix(pagamento, minutos_expiracao=15)

            elif metodo_pagamento_escolhido == 'CartaoCredito':
                print("[SERVICE-DIAG] Entrando no bloco para gerar LINK DE CARTÃO.", file=sys.stderr)
                sys.stderr.flush()
                gerar_link_pagamento_cartao(pagamento, minutos_expiracao=15)
                
            else:
                print("[SERVICE-DIAG] NENHUMA CONDIÇÃO DE PAGAMENTO FOI ATENDIDA.", file=sys.stderr)
                sys.stderr.flush()

            if pagamento.pix_expira_em:
                agendamento.expira_em = pagamento.pix_expira_em
                agendamento.save()

    print("--- FINALIZANDO CRIAR_AGENDAMENTO_E_PAGAMENTO_PENDENTE ---", file=sys.stderr)
    sys.stderr.flush()
    return agendamento