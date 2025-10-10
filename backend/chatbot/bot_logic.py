# chatbot/bot_logic.py - VERSÃO FINAL COM LÓGICA CONTEXTUAL E DE TIMEOUT

import logging
from .models import ChatMemory
from .agendamento_flow import AgendamentoManager
from .chains import chain_roteadora, chain_sintomas, chain_faq, faq_base_de_conhecimento
from .services import get_resposta_preco
from usuarios.models import Especialidade

logger = logging.getLogger(__name__)

# Adicionamos a função de re-pergunta que criamos anteriormente
def get_reprompt_message(state: str, memory: dict) -> str:
    nome_usuario = memory.get('nome_usuario', '')
    prompts = {
        'agendamento_awaiting_type': f"Perfeito, {nome_usuario}! O agendamento será para uma *Consulta* ou *Procedimento*?",
        'agendamento_awaiting_modality': "Prefere *Telemedicina* ou *Presencial*?",
        'agendamento_awaiting_specialty': "Qual das nossas especialidades você deseja?",
        'agendamento_awaiting_slot_confirmation': "Confirma o horário pré-reservado? (Sim/Não)",
        'cadastro_awaiting_cpf': "Por favor, me informe o seu *CPF*.",
        'agendamento_awaiting_payment_choice': "Como prefere pagar? (PIX ou Cartão)",
    }
    if state == 'agendamento_awaiting_slot_choice':
        horarios = memory.get('horarios_ofertados', {})
        data_formatada = horarios.get('data', 'uma data próxima')
        return f"Encontrei alguns horários para o dia *{data_formatada}*. Qual deles prefere?"
    return prompts.get(state, f"Como posso te ajudar, {nome_usuario}?")


def processar_mensagem_bot(session_id: str, user_message: str) -> dict:
    memoria_obj, _ = ChatMemory.objects.get_or_create(
        session_id=session_id,
        defaults={'memory_data': {}, 'state': 'inicio'}
    )
    memoria_atual = memoria_obj.memory_data if isinstance(memoria_obj.memory_data, dict) else {}
    estado_atual = memoria_obj.state
    nome_usuario = memoria_atual.get('nome_usuario', '')
    resposta_lower = user_message.lower().strip()

    logger.info(f"Processando | Session: {session_id} | Estado: '{estado_atual}' | Msg: '{user_message}'")

    # --- NÍVEL 1: LÓGICA DE ESTADOS ESPECIAIS E CONTEXTUAIS ---
    
    # Lida com a resposta do usuário à pergunta de inatividade (CORREÇÃO 1)
    if estado_atual == 'awaiting_inactivity_response':
        if 'sim' in resposta_lower:
            estado_anterior = memoria_obj.previous_state or 'identificando_demanda'
            reprompt = get_reprompt_message(estado_anterior, memoria_atual)
            return {
                "response_message": f"Ótimo! Continuando de onde paramos.\n\n{reprompt}",
                "new_state": estado_anterior, "memory_data": memoria_atual
            }
        else: # "Não" ou qualquer outra coisa encerra
            return {
                "response_message": "Entendido. Quando precisar, é só chamar!",
                "new_state": 'inicio', "memory_data": {'nome_usuario': nome_usuario}
            }

    # Lida com a confirmação para agendar após uma consulta de preço (CORREÇÃO 2)
    if estado_atual == 'awaiting_schedule_confirmation':
        if 'sim' in resposta_lower:
            # Inicia o fluxo de agendamento do zero
            manager = AgendamentoManager(session_id, memoria_atual, "")
            return manager.processar(user_message, 'agendamento_inicio')
        else: # Se não for "sim", voltamos ao estado geral
            return {
                "response_message": "Tudo bem. Se mudar de ideia, é só me dizer o que gostaria de fazer.",
                "new_state": 'identificando_demanda', "memory_data": memoria_atual
            }

    # --- NÍVEL 2: ROTEAMENTO POR IA PARA NOVAS INTENÇÕES ---
    
    if not chain_roteadora:
        return {"response_message": "Desculpe, estou com um problema técnico.", "new_state": estado_atual, "memory_data": memoria_atual}

    try:
        intent_data = chain_roteadora.invoke({"user_message": user_message})
        intent = intent_data.get("intent")
        entity = intent_data.get("entity")
    except Exception as e:
        logger.error(f"Erro na IA roteadora: {e}", exc_info=True)
        return {"response_message": "Desculpe, não consegui processar sua mensagem.", "new_state": estado_atual, "memory_data": memoria_atual}

    intencoes_de_reset = ['buscar_preco', 'cancelar_agendamento', 'pergunta_geral', 'triagem_sintomas']

    if estado_atual in ['inicio', 'aguardando_nome'] or intent in intencoes_de_reset:
        logger.warning(f"Roteando para um novo fluxo com a intenção: '{intent}'")
        
        # --- Bloco de tratamento de intenções de reset ---
        if estado_atual == 'inicio':
            return {"response_message": "Olá! Sou o Leônidas, e estou aqui para te ajudar. Para começar, qual o seu nome?", "new_state": 'aguardando_nome', "memory_data": {}}
        if estado_atual == 'aguardando_nome':
            nome_usuario = user_message.strip().title().split(' ')[0]
            memoria_atual['nome_usuario'] = nome_usuario
            return {"response_message": f"Certo, {nome_usuario}. Como posso te ajudar hoje?", "new_state": 'identificando_demanda', "memory_data": memoria_atual}
        
        if intent == "buscar_preco":
            resposta_final = get_resposta_preco(entity, nome_usuario)
            # AQUI ESTÁ A MUDANÇA: definimos um estado específico para a resposta
            return {"response_message": resposta_final, "new_state": 'awaiting_schedule_confirmation', "memory_data": memoria_atual}
        
        if intent == "iniciar_agendamento":
            manager = AgendamentoManager(session_id, memoria_atual, "")
            return manager.processar(user_message, 'agendamento_inicio')

        # ... (outros intents como triagem, cancelar, etc. continuam aqui) ...
        
        else: # pergunta_geral
            faq_data = chain_faq.invoke({"pergunta_do_usuario": user_message, "faq": faq_base_de_conhecimento})
            return {"response_message": faq_data.get("resposta"), "new_state": 'identificando_demanda', "memory_data": memoria_atual}

    else:
        # --- NÍVEL 3: CONTINUAÇÃO DE UM FLUXO EXISTENTE ---
        logger.warning(f"Continuando o fluxo existente no estado '{estado_atual}'.")
        try:
            manager = AgendamentoManager(session_id, memoria_atual, "")
            resultado = manager.processar(user_message, estado_atual)
        except Exception as e:
            logger.error(f"Erro no AgendamentoManager: {e}", exc_info=True)
            resultado = {"response_message": "Desculpe, ocorreu um erro. Vamos tentar de novo?", "new_state": "identificando_demanda", "memory_data": memoria_atual}
        
        # Salva o resultado final no banco de dados
        memoria_obj.state = resultado.get("new_state")
        memoria_obj.memory_data = resultado.get("memory_data")
        memoria_obj.save()
        return resultado