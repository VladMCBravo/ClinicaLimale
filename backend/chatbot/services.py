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