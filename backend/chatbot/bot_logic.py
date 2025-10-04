# chatbot/bot_logic.py - VERSÃO FINAL E CORRIGIDA

import logging
from .models import ChatMemory
from .agendamento_flow import AgendamentoManager
from .chains import chain_roteadora, chain_faq, faq_base_de_conhecimento
from .services import get_resposta_preco

logger = logging.getLogger(__name__)

def processar_mensagem_bot(session_id: str, user_message: str) -> dict:
    memoria_obj, _ = ChatMemory.objects.get_or_create(
        session_id=session_id,
        defaults={'memory_data': {}, 'state': 'inicio'}
    )
    memoria_atual = memoria_obj.memory_data if isinstance(memoria_obj.memory_data, dict) else {}
    estado_atual = memoria_obj.state

    logger.info(f"Processando | Session: {session_id} | Estado: '{estado_atual}' | Msg: '{user_message}'")

    if not chain_roteadora:
        logger.error("A IA roteadora não foi inicializada. Verifique a API Key.")
        return { "response_message": "Desculpe, estou com um problema técnico. A equipe de suporte já foi notificada.", "new_state": estado_atual, "memory_data": memoria_atual }

    resultado = {}

    if estado_atual and estado_atual not in ['inicio', 'aguardando_nome', 'identificando_demanda']:
        try:
            manager = AgendamentoManager(session_id, memoria_atual, "")
            resultado = manager.processar(user_message, estado_atual)
        except Exception as e:
            logger.error(f"Erro no AgendamentoManager: {e}", exc_info=True)
            resultado = {"response_message": "Desculpe, ocorreu um erro inesperado. Vamos tentar de novo?", "new_state": "identificando_demanda", "memory_data": memoria_atual}

    elif estado_atual == 'identificando_demanda':
        try:
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
            else:
                faq_data = chain_faq.invoke({"pergunta_do_usuario": user_message, "faq": faq_base_de_conhecimento})
                resposta_final = faq_data.get("resposta", "Não consegui processar sua pergunta.")
                resultado = {"response_message": resposta_final, "new_state": 'identificando_demanda', "memory_data": memoria_atual}
        except Exception as e:
            logger.error(f"Erro na IA roteadora ou FAQ: {e}", exc_info=True)
            resultado = {"response_message": "Desculpe, não consegui processar sua mensagem. Poderia repetir?", "new_state": "identificando_demanda", "memory_data": memoria_atual}

    else:
        if estado_atual == 'aguardando_nome':
            nome_usuario = user_message.strip().title().split(' ')[0]
            memoria_atual['nome_usuario'] = nome_usuario
            resposta_final = f"Certo, {nome_usuario}. Como posso te direcionar ao melhor cuidado hoje?"
            resultado = {"response_message": resposta_final, "new_state": 'identificando_demanda', "memory_data": memoria_atual}
        else: # estado 'inicio'
            resposta_final = "Olá! Sou o Leônidas, assistente virtual da Clínica Limalé, e estou aqui para te proporcionar um atendimento de excelência. Para começarmos, qual o seu nome?"
            resultado = {"response_message": resposta_final, "new_state": 'aguardando_nome', "memory_data": {}}

    try:
        if resultado:
            memoria_obj.state = resultado.get("new_state")
            memoria_obj.memory_data = resultado.get("memory_data")
            memoria_obj.save()
    except Exception as e:
        logger.error(f"Erro crítico ao salvar a memória da sessão {session_id}: {e}", exc_info=True)

    return resultado