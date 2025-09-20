# backend/faturamento/services/inter_service.py

import uuid
from datetime import datetime, timedelta
from django.utils import timezone
from decimal import Decimal

# NOTA: Quando você tiver as chaves, a biblioteca oficial do Inter ou 'requests' será usada aqui.
# Por enquanto, vamos simular a resposta da API.

def gerar_cobranca_pix(pagamento_obj, minutos_expiracao=15):
    """
    Função que simula a criação de uma cobrança Pix no Banco Inter.
    
    No futuro, esta função irá:
    1. Se autenticar na API do Inter com as credenciais do cliente.
    2. Enviar uma requisição POST para o endpoint de criação de cobranças.
    3. Receber a resposta do Inter e extrair os dados.
    """
    print("--- SIMULANDO GERAÇÃO DE COBRANÇA PIX NO INTER ---")

    # Dados que seriam enviados para o Inter:
    dados_para_inter = {
        "calendario": {"expiracao": minutos_expiracao * 60}, # em segundos
        "devedor": {"cpf": pagamento_obj.paciente.cpf, "nome": pagamento_obj.paciente.nome_completo},
        "valor": {"original": f"{pagamento_obj.valor:.2f}"},
        "chave": "sua-chave-pix-do-cliente", # Virá das configurações
        "solicitacaoPagador": f"Pagamento consulta/procedimento ID {pagamento_obj.agendamento.id}"
    }
    print(f"Enviando para Inter (simulado): {dados_para_inter}")

    # Resposta que o Inter nos daria (simulada):
    agora = timezone.now()
    data_expiracao = agora + timedelta(minutes=minutos_expiracao)
    
    resposta_simulada_inter = {
        "txid": str(uuid.uuid4()).replace('-', ''), # Gera um ID de transação único
        "pixCopiaECola": f"simulado_pix_copia_e_cola_{pagamento_obj.id}",
        "loc": {"id": 12345, "location": "pix.inter.co/v2/cob/..." },
        "calendario": {"criacao": agora.isoformat(), "expiracao": data_expiracao.isoformat()},
        # Na API real, o Inter retorna a imagem do QR code já em base64
        "imagemQrcode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA..." # QR Code Falso
    }
    print(f"Resposta do Inter (simulada): {resposta_simulada_inter}")

    # Atualiza o objeto de Pagamento com os dados recebidos
    pagamento_obj.inter_txid = resposta_simulada_inter['txid']
    pagamento_obj.pix_copia_e_cola = resposta_simulada_inter['pixCopiaECola']
    pagamento_obj.pix_qr_code_base64 = resposta_simulada_inter['imagemQrcode']
    pagamento_obj.pix_expira_em = data_expiracao
    pagamento_obj.save()

    print("--- PAGAMENTO ATUALIZADO COM DADOS DO PIX ---")
    return pagamento_obj

# --- NOVA FUNÇÃO PARA GERAR LINK DE PAGAMENTO ---
def gerar_link_pagamento_cartao(pagamento_obj, minutos_expiracao=15):
    """
    Função que simula a criação de um link de pagamento para cartão no Banco Inter.
    
    No futuro, esta função irá chamar o endpoint correspondente da API do Inter.
    """
    print("--- SIMULANDO GERAÇÃO DE LINK DE PAGAMENTO (CARTÃO) ---")

    # Resposta simulada que o Inter (ou outro provedor) nos daria
    data_expiracao = timezone.now() + timedelta(minutes=minutos_expiracao)
    
    resposta_simulada = {
        "id": f"pl_{uuid.uuid4()}", # Payment Link ID
        "url": f"https://pagamento.bancointer.com.br/simulado/{pagamento_obj.id}",
        "expira_em": data_expiracao.isoformat()
    }
    print(f"Resposta do Inter (simulada): {resposta_simulada}")

    # Atualiza o objeto de Pagamento com os dados recebidos
    pagamento_obj.link_pagamento = resposta_simulada['url']
    pagamento_obj.pix_expira_em = data_expiracao # Reutilizamos o campo de expiração
    pagamento_obj.save()

    print("--- PAGAMENTO ATUALIZADO COM LINK DE PAGAMENTO ---")
    return pagamento_obj

# --- NOVAS FUNÇÕES DE LEITURA ---

def consultar_saldo():
    """
    Função que simula a consulta de saldo na API do Banco Inter.

    No futuro, esta função irá:
    1. Se autenticar na API.
    2. Fazer uma requisição GET ao endpoint de saldo.
    3. Retornar o valor formatado.
    """
    print("--- SIMULANDO CONSULTA DE SALDO NO INTER ---")
    # A resposta real da API seria um JSON como {"valor": 15780.55}
    saldo_simulado = Decimal('15780.55')
    print(f"Saldo retornado (simulado): {saldo_simulado}")
    return saldo_simulado

def consultar_extrato(data_inicio, data_fim):
    """
    Função que simula a consulta de extrato por período na API do Inter.
    """
    print(f"--- SIMULANDO CONSULTA DE EXTRATO DE {data_inicio} ATÉ {data_fim} ---")
    # A resposta real seria uma lista de transações
    extrato_simulado = [
        {
            "data": (timezone.now() - timedelta(hours=1)).isoformat(),
            "tipo": "PIX_RECEBIDO",
            "valor": Decimal('150.00'),
            "descricao": "PIX recebido de Maria Souza"
        },
        {
            "data": (timezone.now() - timedelta(hours=3)).isoformat(),
            "tipo": "PAGAMENTO_BOLETO",
            "valor": Decimal('-350.70'),
            "descricao": "Pagamento de conta de luz"
        },
        {
            "data": (timezone.now() - timedelta(hours=5)).isoformat(),
            "tipo": "PIX_RECEBIDO",
            "valor": Decimal('200.00'),
            "descricao": "PIX recebido de João Pereira"
        }
    ]
    print(f"Extrato retornado (simulado): {len(extrato_simulado)} transações.")
    return extrato_simulado