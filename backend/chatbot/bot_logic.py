# chatbot/bot_logic.py

import logging
from .models import ChatMemory
from .agendamento_flow import AgendamentoManager
# Importe os "cérebros" da IA que você definiu em chains.py
from .chains import chain_roteadora, chain_sintomas, chain_extracao_dados, chain_faq, faq_base_de_conhecimento
from .services import get_resposta_preco
from usuarios.models import Especialidade

logger = logging.getLogger(__name__)

def processar_mensagem_bot(session_id: str, user_message: str) -> dict:
    """
    Esta função é o "cérebro" central. Ela recebe uma mensagem
    e retorna a resposta do bot e o novo estado da conversa.
    """
    memoria_obj, _ = ChatMemory.objects.get_or_create(
        session_id=session_id,
        defaults={'memory_data': {}, 'state': 'inicio'}
    )
    memoria_atual = memoria_obj.memory_data if isinstance(memoria_obj.memory_data, dict) else {}
    estado_atual = memoria_obj.state
    logger.warning(f"[DEBUG-LOGIC] Entrando em processar_mensagem_bot com estado '{estado_atual}'.")
    logger.info(f"Processando no 'cérebro' central | Session: {session_id} | Estado: '{estado_atual}' | Msg: '{user_message}'")
    
    # --- VERIFICAÇÃO DE SAÚDE DA IA ---
    if not chain_roteadora:
        logger.error("A chain_roteadora não foi inicializada. Verifique a API Key e as configurações em chains.py.")
        # Retorna uma mensagem de erro clara para o usuário e mantém o estado
        return {
            "response_message": "Desculpe, estou com um problema técnico para processar sua solicitação. A equipe de suporte já foi notificada. Por favor, tente novamente mais tarde.",
            "new_state": estado_atual,
            "memory_data": memoria_atual
        }
    
    resultado = {}

    # --- FLUXOS EM ANDAMENTO (Agendamento, Cancelamento, etc.) ---
    # Se a conversa já passou da identificação inicial, o AgendamentoManager assume.
    if estado_atual and estado_atual not in ['inicio', 'aguardando_nome', 'identificando_demanda']:
        try:
            logger.warning(f"[DEBUG-LOGIC] Delegando para AgendamentoManager com estado '{estado_atual}'.")
            manager_chain_extracao = chain_extracao_dados if estado_atual == 'cadastro_awaiting_data' else None
            manager = AgendamentoManager(session_id, memoria_atual, "", None, manager_chain_extracao)
            resultado = manager.processar(user_message, estado_atual)
            logger.warning(f"[DEBUG-LOGIC] Resultado recebido do Manager: {resultado}")
        except Exception as e:
            logger.error(f"[DEBUG-LOGIC] Erro no AgendamentoManager: {e}", exc_info=True)
            resultado = {"response_message": "Desculpe, ocorreu um erro inesperado...", "new_state": "identificando_demanda", "memory_data": memoria_atual}
    
    # --- FLUXO DE IDENTIFICAÇÃO DA DEMANDA ---
    # Ocorre após o usuário informar o nome.
    elif estado_atual == 'identificando_demanda':
        try:
            logger.warning("[DEBUG-LOGIC] Invocando chain_roteadora...")
            intent_data = chain_roteadora.invoke({"user_message": user_message})
            logger.warning(f"[DEBUG-LOGIC] Roteador retornou: {intent_data}")
            intent = intent_data.get("intent")
            entity = intent_data.get("entity")
            nome_usuario = memoria_atual.get('nome_usuario', '')

            if intent == "buscar_preco":
                # A função get_resposta_preco já contém a lógica de marketing
                resposta_final = get_resposta_preco(entity or user_message, nome_usuario)
                resultado = {"response_message": resposta_final, "new_state": 'identificando_demanda', "memory_data": memoria_atual}
            
            elif intent == "iniciar_agendamento":
                manager = AgendamentoManager(session_id, memoria_atual, "")
                # Direciona para o início do fluxo de agendamento, que fará a pergunta de acolhimento
                resultado = manager.processar(user_message, 'agendamento_inicio')

            elif intent == "cancelar_agendamento":
                manager = AgendamentoManager(session_id, memoria_atual, "")
                resultado = manager.processar(user_message, 'cancelamento_inicio')

            elif intent == "triagem_sintomas":
                 manager = AgendamentoManager(session_id, memoria_atual, "")
                 # Inicia o fluxo de triagem
                 resultado = manager.handle_triagem_inicio(user_message) # Supondo que você crie este handler

            else: # Pergunta geral / FAQ
                faq_data = chain_faq.invoke({"pergunta_do_usuario": user_message, "faq": faq_base_de_conhecimento})
                resposta_final = faq_data.get("resposta", "Não consegui processar sua pergunta.")
                resultado = {"response_message": resposta_final, "new_state": 'identificando_demanda', "memory_data": memoria_atual}

        except Exception as e:
            logger.error(f"[DEBUG-LOGIC] Erro na IA roteadora: {e}", exc_info=True)
            resultado = {"response_message": "Desculpe, não consegui processar sua mensagem. Poderia repetir de outra forma?", "new_state": "identificando_demanda", "memory_data": memoria_atual}

    # --- FLUXO INICIAL DA CONVERSA ---
    # Onde a mágica do roteiro começa.
    else:
        if estado_atual == 'aguardando_nome':
            # Pega apenas o primeiro nome para um tratamento mais pessoal
            nome_usuario = user_message.strip().title().split(' ')[0]
            memoria_atual['nome_usuario'] = nome_usuario
            # Mensagem alinhada ao prompt
            resposta_final = f"Certo, {nome_usuario}.\nPode me contar como posso te ajudar?"
            novo_estado = 'identificando_demanda'
            resultado = {"response_message": resposta_final, "new_state": novo_estado, "memory_data": memoria_atual}
        
        else: # estado 'inicio'
            # Mensagem inicial exatamente como no prompt
            resposta_final = "Olá! Sou o Leônidas, assistente virtual da Clínica Limalé. Para começarmos, qual o seu nome?"
            novo_estado = 'aguardando_nome'
            resultado = {"response_message": resposta_final, "new_state": novo_estado, "memory_data": {}}

    # Salva o novo estado e a memória no banco de dados
    try:
        if resultado:
            logger.warning(f"[DEBUG-LOGIC] Tentando salvar no DB: novo estado='{resultado.get('new_state')}'")
            memoria_obj.state = resultado.get("new_state")
            memoria_obj.memory_data = resultado.get("memory_data")
            memoria_obj.save()
            logger.warning("[DEBUG-LOGIC] Salvo no DB com sucesso.")
        else:
            logger.warning("[DEBUG-LOGIC] Nenhum resultado para salvar no DB.")
    except Exception as e:
        logger.error(f"[DEBUG-LOGIC] Erro crítico ao salvar a memória: {e}", exc_info=True)

    logger.warning(f"[DEBUG-LOGIC] Retornando resultado final: {resultado}")
    return resultado