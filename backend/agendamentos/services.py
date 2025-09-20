# backend/agendamentos/services.py

from django.utils import timezone
from datetime import timedelta
from faturamento.models import Pagamento
from django.contrib.auth import get_user_model
from faturamento.services.inter_service import gerar_cobranca_pix, gerar_link_pagamento_cartao

def criar_agendamento_e_pagamento_pendente(agendamento_instance, usuario_logado, metodo_pagamento_escolhido='PIX'):
    agendamento = agendamento_instance
    cargos_isentos = ['recepcao', 'admin'] # Cargos que não geram Pix automaticamente 
    
    # Cria o objeto de Pagamento primeiro
    pagamento = Pagamento.objects.create(
        agendamento=agendamento,
        paciente=agendamento.paciente,
        valor=agendamento.procedimento.valor_particular, # Ajuste conforme sua regra de valor
        status='Pendente',
        registrado_por=usuario_logado # ou um usuário de sistema
    )
    
    # --- LÓGICA DE GERAÇÃO DE PAGAMENTO ATUALIZADA ---
    if not usuario_logado or usuario_logado.cargo not in cargos_isentos:
        
        # DECIDE QUAL FUNÇÃO CHAMAR COM BASE NA ESCOLHA DO USUÁRIO
        if metodo_pagamento_escolhido == 'PIX':
            gerar_cobranca_pix(pagamento, minutos_expiracao=15)
        elif metodo_pagamento_escolhido == 'CartaoCredito':
            gerar_link_pagamento_cartao(pagamento, minutos_expiracao=15)
        
        # A regra de expiração do AGENDAMENTO continua a mesma
        if pagamento.pix_expira_em:
            agendamento.expira_em = pagamento.pix_expira_em
            agendamento.save()

    return agendamento