# chatbot/services.py

from usuarios.models import Especialidade
from faturamento.models import Procedimento

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
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao buscar preços: {e}")
        return []

# --- NOVA FUNÇÃO AUXILIAR PARA RESPOSTA DE PREÇO HUMANIZADA ---
def get_resposta_preco(nome_servico: str, nome_usuario: str = ""):
    """
    Busca o preço de um serviço e monta uma resposta humanizada, alinhada com o marketing da clínica.
    """
    try:
        from django.utils.html import escape
        # Sanitização básica para segurança
        nome_usuario_seguro = escape(str(nome_usuario)[:50]) if nome_usuario else ""
        nome_servico_seguro_busca = escape(str(nome_servico)[:100]) if nome_servico else ""
        
        servico_info = buscar_precos_servicos(nome_servico_seguro_busca)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro em get_resposta_preco: {e}")
        return "Desculpe, não consegui consultar os preços no momento. Por favor, tente novamente."
    
    # Texto de valorização da clínica, exatamente como no prompt
    texto_base = (
        f"Claro, {nome_usuario_seguro}! Antes de te passar os valores, quero destacar que aqui na Clínica Limalé prezamos "
        "pelo acolhimento, qualidade no atendimento e um time altamente qualificado.\n\n"
    )

    if servico_info:
        nome_servico_seguro_display = escape(str(servico_info.get('nome', 'Serviço'))[:100])
        valor_seguro = escape(str(servico_info.get('valor', ''))[:20])
        
        # Monta a resposta final com os valores
        resposta_final = (
            f"O valor para *{nome_servico_seguro_display}* é de *R$ {valor_seguro}*.\n\n"
            "Temos também um desconto de 5% para pagamentos via Pix realizados no momento do agendamento. "
            "Assim, sua vaga já fica garantida!\n\nGostaria de agendar?"
        )
        return texto_base + resposta_final
    else:
        # Fallback caso o serviço específico não seja encontrado
        return (
            f"{nome_usuario_seguro}, não encontrei um valor exato para '{nome_servico_seguro_busca}'.\n\n"
            "Nossas consultas particulares geralmente têm valores a partir de R$ 350,00. "
            "Para qual especialidade você gostaria de saber o valor?"
        )