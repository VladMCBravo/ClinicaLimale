# chatbot/services.py

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

def enviar_msg_whatsapp(numero, texto):
    # ATUAL: Evolution API
    # FUTURO: Basta trocar a URL e o Header para os da META
    url = "https://sua-instancia-evolution.com/message/sendText/limale"
    headers = {"apikey": "sua_chave_aqui"}
    payload = {"number": numero, "text": texto}
    requests.post(url, json=payload, headers=headers)