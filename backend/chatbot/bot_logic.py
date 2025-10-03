import logging
from .models import ChatMemory
from .agendamento_flow import AgendamentoManager
# Importe os "cérebros" da IA que você definiu em views.py
from .chains import chain_roteadora, chain_sintomas, chain_extracao_dados, chain_faq, faq_base_de_conhecimento
from .services import get_resposta_preco # Adicione esta linha
from usuarios.models import Especialidade

logger = logging.getLogger(__name__)

def processar_mensagem_bot(session_id: str, user_message: str) -> dict:
    """
    Esta função é o novo "cérebro" central. Ela recebe uma mensagem
    e retorna a resposta do bot e o novo estado da conversa.
    """
    memoria_obj, _ = ChatMemory.objects.get_or_create(
        session_id=session_id,
        defaults={'memory_data': {}, 'state': 'inicio'}
    )
    memoria_atual = memoria_obj.memory_data if isinstance(memoria_obj.memory_data, dict) else {}
    estado_atual = memoria_obj.state

    logger.info(f"Processando no 'cérebro' central | Session: {session_id} | Estado: '{estado_atual}' | Msg: '{user_message}'")

    resultado = {}

    # Se a conversa está em andamento, continua o fluxo no AgendamentoManager
    if estado_atual and estado_atual not in ['inicio', 'aguardando_nome', 'identificando_demanda']:
        manager_chain_sintomas = chain_sintomas if estado_atual == 'triagem_processar_sintomas' else None
        manager_chain_extracao = chain_extracao_dados if estado_atual in ['cadastro_awaiting_data', 'cadastro_awaiting_missing_field'] else None

        manager = AgendamentoManager(
            session_id, memoria_atual, "", manager_chain_sintomas, manager_chain_extracao
        )
        resultado = manager.processar(user_message, estado_atual)

    # Se está identificando a demanda, usa a IA roteadora
    elif estado_atual == 'identificando_demanda':
        intent_data = chain_roteadora.invoke({"user_message": user_message})
        intent = intent_data.get("intent")
        entity = intent_data.get("entity")
        nome_usuario = memoria_atual.get('nome_usuario', '')

        if intent == "buscar_preco":
            resposta_final = get_resposta_preco(entity or user_message, nome_usuario)
            resultado = {"response_message": resposta_final, "new_state": 'identificando_demanda', "memory_data": memoria_atual}
        elif intent == "iniciar_agendamento":
            manager = AgendamentoManager(session_id, memoria_atual, "")
            resultado = manager.processar(user_message, 'agendamento_inicio')
        elif intent == "cancelar_agendamento":
            manager = AgendamentoManager(session_id, memoria_atual, "")
            resultado = manager.processar(user_message, 'cancelamento_inicio')
        # Adicione outras intenções aqui se necessário...
        else: # Pergunta geral / FAQ
            faq_data = chain_faq.invoke({"pergunta_do_usuario": user_message, "faq": faq_base_de_conhecimento})
            resposta_final = faq_data.get("resposta")
            resultado = {"response_message": resposta_final, "new_state": 'identificando_demanda', "memory_data": memoria_atual}

    # Se a conversa está começando
    else:
        if estado_atual == 'aguardando_nome':
            nome_usuario = user_message.strip().title().split(' ')[0]
            memoria_atual['nome_usuario'] = nome_usuario
            resposta_final = f"Prazer, {nome_usuario}! 😊 Como posso te ajudar hoje?"
            novo_estado = 'identificando_demanda'
            resultado = {"response_message": resposta_final, "new_state": novo_estado, "memory_data": memoria_atual}
        else: # 'inicio'
            resposta_final = "Olá! Sou o Leônidas, assistente virtual da Clínica Limalé. Para começarmos, qual o seu nome?"
            novo_estado = 'aguardando_nome'
            resultado = {"response_message": resposta_final, "new_state": novo_estado, "memory_data": {}}

    # Salva o novo estado e a memória
    memoria_obj.state = resultado.get("new_state")
    memoria_obj.memory_data = resultado.get("memory_data")
    memoria_obj.save()

    return resultado