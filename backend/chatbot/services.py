# chatbot/services.py

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

# --- FUNÇÃO get_resposta_preco MODIFICADA ---
def get_resposta_preco(nome_servico: str, memoria_atual: dict) -> str:
    try:
        nome_usuario = memoria_atual.get('nome_usuario', '') # Pega nome da memória
        nome_usuario_seguro = escape(str(nome_usuario)[:50]) if nome_usuario else ""
        nome_servico_seguro_busca = escape(str(nome_servico)[:100]).strip() if nome_servico else ""

        servico_info = None
        especialidade_contexto = memoria_atual.get('especialidade_nome') # Pega especialidade da memória

        # --- LÓGICA MELHORADA ---
        if nome_servico_seguro_busca.lower() == 'consulta':
            if especialidade_contexto:
                # Usa o logger definido globalmente
                logger.info(f"Buscando preço de consulta para especialidade em contexto: {especialidade_contexto}")
                servico_info = buscar_precos_servicos(especialidade_contexto)
            else:
                # Usa o logger definido globalmente
                logger.info("Busca genérica de 'Consulta' sem especialidade em contexto.")
                pass
        else:
            servico_info = buscar_precos_servicos(nome_servico_seguro_busca)
        # --- FIM DA LÓGICA MELHORADA ---

    except Exception as e:
        # Usa o logger definido globalmente
        logger.error(f"Erro em get_resposta_preco: {e}")
        return f"Desculpe, {nome_usuario_seguro}, não consegui consultar os preços no momento. Por favor, tente novamente."

    texto_base = (
        # Removido texto introdutório para deixar a resposta mais direta após interrupção
        # f"Claro, {nome_usuario_seguro}! Antes do valor, quero que saiba que uma consulta aqui na Limalé é um investimento na sua saúde...\n\n"
        "" 
    )

    if servico_info and 'valor' in servico_info:
        nome_servico_seguro_display = escape(str(servico_info.get('nome', 'Serviço'))[:100])
        valor_seguro = escape(str(servico_info.get('valor', ''))[:20])

        resposta_final = (
            f"Certo, {nome_usuario_seguro}! O valor para *{nome_servico_seguro_display}* é de *R$ {valor_seguro}*.\n\n"
            "Oferecemos **5% de desconto** no pagamento via PIX realizado antecipadamente."
            # Removida pergunta sobre agendar aqui, pois será feita no bot_logic
        )
        return texto_base + resposta_final
    else:
        # Resposta genérica (se não achou ou se pediu 'consulta' sem contexto)
        return (
            f"{nome_usuario_seguro}, nossas consultas particulares geralmente têm valores a partir de R$ 350,00. "
            f"Se você me disser para qual *especialidade* deseja saber o valor, posso te informar o preço exato."
        )