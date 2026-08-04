# chatbot/services.py

import os
import requests
from usuarios.models import Especialidade
from faturamento.models import Procedimento
from django.utils.html import escape
import logging # Garanta que logging está importado

# --- ADICIONE ESTA LINHA ---
logger = logging.getLogger(__name__)
# ---------------------------

def buscar_precos_servicos(nome_servico=None):
    """
    Busca os preços de todas as especialidades e procedimentos no banco de dados.
    Se um nome de serviço for fornecido, tenta encontrar um serviço específico.
    """
    try:
        servicos = []
        
        # Busca preços das consultas - otimizada
        especialidades = Especialidade.objects.only('nome', 'valor_consulta')
        servicos.extend([
            {
                "nome": esp.nome,
                "valor": f"{esp.valor_consulta:.2f}".replace('.', ','),
                "tipo": "Consulta"
            }
            for esp in especialidades
        ])

        # Busca preços dos procedimentos - otimizada
        procedimentos = Procedimento.objects.filter(
            ativo=True, 
            valor_particular__gt=0
        ).only('descricao', 'valor_particular')
        
        servicos.extend([
            {
                "nome": proc.descricao,
                "valor": f"{proc.valor_particular:.2f}".replace('.', ','),
                "tipo": "Procedimento"
            }
            for proc in procedimentos
        ])

        if not nome_servico:
            return servicos

        # Se um nome foi especificado, tenta encontrar o serviço
        nome_servico_lower = nome_servico.lower()
        
        # Busca por correspondência exata primeiro
        for s in servicos:
            if s['nome'].lower() == nome_servico_lower:
                return s
                
        # Se não achar, busca por correspondência parcial
        for s in servicos:
            if nome_servico_lower in s['nome'].lower():
                return s

        return None
    except Exception as e:
        from django.conf import settings
        logger.error(f"Erro ao buscar preços: {e}")
        return []

def enviar_template_whatsapp(numero, nome_template, idioma="pt_BR", parametros=None, formato="positional"):
    """
    Envia uma mensagem de modelo (template) aprovada pela Meta.
    Necessário para iniciar/reabrir conversa fora da janela de 24h
    (lembretes de consulta, reengajamento de leads frios, etc).

    parametros: lista de valores (formato 'positional') ou dict {nome: valor} (formato 'named')
    """
    token = os.environ.get("META_ACCESS_TOKEN")
    phone_id = os.environ.get("META_PHONE_NUMBER_ID")
    api_version = os.environ.get("META_API_VERSION", "v25.0")

    if not token or not phone_id:
        logger.error("❌ Erro: META_ACCESS_TOKEN ou META_PHONE_NUMBER_ID não encontrados no .env")
        return False

    url = f"https://graph.facebook.com/{api_version}/{phone_id}/messages"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    components = []
    if parametros:
        if formato == "named":
            components = [{
                "type": "body",
                "parameters": [
                    {"type": "text", "parameter_name": nome, "text": str(valor)}
                    for nome, valor in parametros.items()
                ]
            }]
        else:  # positional
            components = [{
                "type": "body",
                "parameters": [{"type": "text", "text": str(valor)} for valor in parametros]
            }]

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": numero,
        "type": "template",
        "template": {
            "name": nome_template,
            "language": {"code": idioma},
            "components": components
        }
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        logger.info(f"✅ Template '{nome_template}' enviado para {numero}: {response.text}")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Erro ao enviar template '{nome_template}' para {numero}: {e}")
        if e.response is not None:
            logger.error(f"Detalhes do erro Meta: {e.response.text}")
        return False

def enviar_msg_whatsapp(numero, texto):
    """
    Envia mensagens ativas pelo WhatsApp usando a API Oficial da Meta.
    """
    token = os.environ.get("META_ACCESS_TOKEN")
    phone_id = os.environ.get("META_PHONE_NUMBER_ID")
    api_version = os.environ.get("META_API_VERSION", "v25.0")
    
    if not token or not phone_id:
        logger.error("❌ Erro: META_ACCESS_TOKEN ou META_PHONE_NUMBER_ID não encontrados no .env")
        return False

    url = f"https://graph.facebook.com/{api_version}/{phone_id}/messages"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": numero,
        "type": "text",
        "text": {
            "body": texto
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        logger.info(f"✅ Resposta da Meta: {response.status_code} - {response.text}")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Erro ao enviar mensagem para {numero} via Meta: {e}")
        if e.response is not None:
            logger.error(f"Detalhes do erro Meta: {e.response.text}")
            try:
                erro_data = e.response.json().get("error", {})
                if erro_data.get("code") == 131047:
                    logger.warning(
                        f"⏰ Janela de 24h fechada para {numero}. "
                        f"Use enviar_template_whatsapp() para reabrir a conversa."
                    )
            except ValueError:
                pass
        return False