# backend/faturamento/services/inter_service.py
# Arquivo inutilizado e comentado a pedido (Projeto Inter pausado)

from decimal import Decimal

def gerar_cobranca_pix(pagamento_obj, minutos_expiracao=15):
    print("--- SERVIÇO INTER DESATIVADO: Geração de PIX ignorada ---")
    return pagamento_obj

def gerar_link_pagamento_cartao(pagamento_obj, minutos_expiracao=15):
    print("--- SERVIÇO INTER DESATIVADO: Geração de Cartão ignorada ---")
    return pagamento_obj

def consultar_saldo():
    print("--- SERVIÇO INTER DESATIVADO: Consulta de saldo ignorada ---")
    return Decimal('0.00')

def consultar_extrato(data_inicio, data_fim):
    print("--- SERVIÇO INTER DESATIVADO: Consulta de extrato ignorada ---")
    return []