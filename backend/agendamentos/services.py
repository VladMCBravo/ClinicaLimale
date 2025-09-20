# backend/agendamentos/services.py

from django.utils import timezone
from datetime import timedelta
from faturamento.models import Pagamento
from django.contrib.auth import get_user_model
from faturamento.services.inter_service import gerar_cobranca_pix

def criar_agendamento_e_pagamento_pendente(agendamento_instance, usuario_logado):
    agendamento = agendamento_instance
    cargos_isentos = ['recepcao', 'admin'] 
    
    # Cria o objeto de Pagamento primeiro
    pagamento = Pagamento.objects.create(
        agendamento=agendamento,
        paciente=agendamento.paciente,
        valor=agendamento.procedimento.valor_particular, # Ajuste conforme sua regra de valor
        status='Pendente',
        registrado_por=usuario_logado # ou um usuário de sistema
    )
    
    # --- LÓGICA DE GERAÇÃO PIX ---
    # A regra agora é: se o agendamento NÃO foi criado pela recepção/admin,
    # significa que veio de uma fonte externa (WhatsApp/Chatbot) e precisa de um Pix.
    if not usuario_logado or usuario_logado.cargo not in cargos_isentos:
        # Chama o serviço do Inter para gerar a cobrança e atualizar o pagamento
        gerar_cobranca_pix(pagamento, minutos_expiracao=15)
        
        # A regra de expiração do AGENDAMENTO agora usa o tempo do PIX
        agendamento.expira_em = pagamento.pix_expira_em
        agendamento.save()

    return agendamento