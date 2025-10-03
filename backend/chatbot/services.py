# chatbot/services.py

from usuarios.models import Especialidade
from faturamento.models import Procedimento

def buscar_precos_servicos(nome_servico=None):
    """
    Busca os preços de todas as especialidades e procedimentos no banco de dados.
    Se um nome de serviço for fornecido, tenta encontrar um serviço específico.
    """
    servicos = []
    
    # Busca preços das consultas
    especialidades = Especialidade.objects.all()
    for esp in especialidades:
        servicos.append({
            "nome": esp.nome,
            "valor": f"{esp.valor_consulta:.2f}".replace('.', ','),
            "tipo": "Consulta"
        })

    # Busca preços dos procedimentos
    procedimentos = Procedimento.objects.filter(ativo=True, valor_particular__gt=0)
    for proc in procedimentos:
        servicos.append({
            "nome": proc.descricao,
            "valor": f"{proc.valor_particular:.2f}".replace('.', ','),
            "tipo": "Procedimento"
        })

    if not nome_servico:
        return servicos # Retorna todos os serviços se nenhum nome for especificado

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

    return None # Retorna None se não encontrar nada

# --- NOVA FUNÇÃO AUXILIAR PARA RESPOSTA DE PREÇO HUMANIZADA ---
def get_resposta_preco(nome_servico: str, nome_usuario: str = ""):
    """
    Busca o preço de um serviço e monta uma resposta humanizada.
    """
    servico_info = buscar_precos_servicos(nome_servico)
    
    # Mensagem de valorização da clínica
    texto_base = (
        f"Claro, {nome_usuario}! Antes de te passar os valores, quero destacar que aqui na Clínica Limalé prezamos "
        "pelo acolhimento, qualidade no atendimento e um time altamente qualificado.\n\n"
    )

    if servico_info:
        # Mensagem com o preço e benefícios
        resposta_final = (
            f"O serviço de *{servico_info['nome']}* tem o valor de *R$ {servico_info['valor']}*.\n"
            "Também oferecemos um desconto de 5% para pagamentos via Pix realizados no momento do agendamento. "
            "Assim, sua vaga já fica garantida!\n\nGostaria de agendar?"
        )
        return texto_base + resposta_final
    else:
        # Mensagem de fallback caso o serviço não seja encontrado
        return (
            f"{nome_usuario}, não encontrei um valor específico para o que você pediu. Nossas consultas particulares geralmente têm valores a partir de R$ 350,00. "
            "Para qual especialidade você gostaria de saber o valor?"
        )