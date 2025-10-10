# chatbot/bot_logic.py - VERSÃO CORRIGIDA E MAIS ROBUSTA

import logging
from .models import ChatMemory
from .agendamento_flow import AgendamentoManager
from .chains import chain_roteadora, chain_sintomas, chain_faq, faq_base_de_conhecimento
from .services import get_resposta_preco
from usuarios.models import Especialidade

logger = logging.getLogger(__name__)

def processar_mensagem_bot(session_id: str, user_message: str) -> dict:
    memoria_obj, _ = ChatMemory.objects.get_or_create(
        session_id=session_id,
        defaults={'memory_data': {}, 'state': 'inicio'}
    )
    memoria_atual = memoria_obj.memory_data if isinstance(memoria_obj.memory_data, dict) else {}
    estado_atual = memoria_obj.state

    logger.info(f"Processando | Session: {session_id} | Estado: '{estado_atual}' | Msg: '{user_message}'")
    
    # --- INÍCIO DO NOVO BLOCO DE LÓGICA ---
    # Lida com a resposta do usuário à pergunta de inatividade.
    if estado_atual == 'awaiting_inactivity_response':
        resposta_lower = user_message.lower()
        
        if 'sim' in resposta_lower:
            # Restaura o estado anterior e avisa o usuário
            estado_anterior = memoria_obj.previous_state or 'identificando_demanda'
            memoria_obj.state = estado_anterior
            memoria_obj.previous_state = None # Limpa o estado anterior
            memoria_obj.save()
            return {
                "response_message": "Ótimo! Continuando de onde paramos.",
                "new_state": estado_anterior,
                "memory_data": memoria_atual
            }
        elif 'não' in resposta_lower or 'nao' in resposta_lower:
            # Reseta a conversa
            nome_usuario = memoria_atual.get('nome_usuario', '')
            memoria_nova = {'nome_usuario': nome_usuario} # Preserva o nome
            return {
                "response_message": f"Entendido. Quando precisar, é só chamar!",
                "new_state": 'inicio',
                "memory_data": memoria_nova
            }
        else:
            # Se a resposta não for clara, pergunta novamente.
            return {
                "response_message": "Desculpe, não entendi. Você deseja continuar o atendimento? (Sim/Não)",
                "new_state": 'awaiting_inactivity_response',
                "memory_data": memoria_atual
            }
    # --- FIM DO NOVO BLOCO DE LÓGICA ---

    if not chain_roteadora:
        logger.error("A IA roteadora não foi inicializada.")
        return {"response_message": "Desculpe, estou com um problema técnico.", "new_state": estado_atual, "memory_data": memoria_atual}

    resultado = {}
    nome_usuario = memoria_atual.get('nome_usuario', '')

    # --- LÓGICA DE RECUPERAÇÃO E RESET GLOBAL ---
    # Se o usuário digitar comandos de reset, o fluxo recomeça.
    comandos_de_reset = ['recomeçar', 'menu', 'início', 'ajuda', 'voltar ao início']
    if any(comando in user_message.lower() for comando in comandos_de_reset):
        memoria_atual.clear()
        memoria_atual['nome_usuario'] = nome_usuario
        resposta = f"Claro, {nome_usuario}. Vamos recomeçar. Como posso te ajudar hoje? Você pode agendar uma consulta, verificar preços ou cancelar um agendamento." if nome_usuario else "Claro. Vamos recomeçar. Para começar, qual o seu nome?"
        novo_estado = 'identificando_demanda' if nome_usuario else 'aguardando_nome'
        resultado = {"response_message": resposta, "new_state": novo_estado, "memory_data": memoria_atual}
        
        # Salva e retorna imediatamente
        memoria_obj.state = resultado.get("new_state")
        memoria_obj.memory_data = resultado.get("memory_data")
        memoria_obj.save()
        return resultado

    # --- LÓGICA DE ROTEAMENTO INTELIGENTE (REFEITA) ---
    
    # Se estamos num fluxo, primeiro tentamos continuar.
    if estado_atual not in ['inicio', 'aguardando_nome', 'identificando_demanda']:
        try:
            manager = AgendamentoManager(session_id, memoria_atual, "")
            # Tentativa de processar como continuação do fluxo
            resultado = manager.processar(user_message, estado_atual)
            
            # Se o resultado for o fallback, significa que o usuário mudou de assunto.
            # Vamos deixar a lógica de intenção abaixo lidar com isso.
            if resultado.get("new_state") == 'identificando_demanda':
                 logger.warning(f"Flow Manager retornou fallback. Re-avaliando intenção do usuário: '{user_message}'")
                 resultado = {} # Limpa o resultado para reprocessar
            else:
                 # Salva o estado e retorna se o processamento foi bem-sucedido
                memoria_obj.state = resultado.get("new_state")
                memoria_obj.memory_data = resultado.get("memory_data")
                memoria_obj.save()
                return resultado

        except Exception as e:
            logger.error(f"Erro no AgendamentoManager: {e}", exc_info=True)
            resultado = {} # Limpa para reprocessar

    # Se não estamos em um fluxo ou se o fluxo se perdeu, usamos a IA Roteadora.
    if not resultado:
        try:
            intent_data = chain_roteadora.invoke({"user_message": user_message})
            intent = intent_data.get("intent")
            entity = intent_data.get("entity")

            manager = AgendamentoManager(session_id, memoria_atual, "")

            if estado_atual == 'aguardando_nome':
                nome_usuario = user_message.strip().title().split(' ')[0]
                memoria_atual['nome_usuario'] = nome_usuario
                resposta_final = f"Certo, {nome_usuario}. Como posso te direcionar ao melhor cuidado hoje?"
                resultado = {"response_message": resposta_final, "new_state": 'identificando_demanda', "memory_data": memoria_atual}
            elif estado_atual == 'inicio':
                resposta_final = "Olá! Sou o Leônidas, e estou aqui para te proporcionar um atendimento de excelência. Para começarmos, qual o seu nome?"
                resultado = {"response_message": resposta_final, "new_state": 'aguardando_nome', "memory_data": {}}
            
            elif intent == "buscar_preco":
                resposta_final = get_resposta_preco(entity, nome_usuario) if entity else "Claro! Qual consulta, exame ou procedimento você gostaria de saber o valor?"
                resultado = {"response_message": resposta_final, "new_state": 'identificando_demanda', "memory_data": memoria_atual}
            
            elif intent == "triagem_sintomas":
                sintomas_data = chain_sintomas.invoke({"sintomas_do_usuario": user_message})
                especialidade_sugerida = sintomas_data.get("especialidade_sugerida", "Nenhuma")
                if especialidade_sugerida != 'Nenhuma':
                    resposta_acolhimento = f"Entendo sua preocupação com '{entity or 'isso'}'. Com base no que você descreveu, a especialidade mais indicada é *{especialidade_sugerida}*. Vamos encontrar um horário para você cuidar disso?"
                    especialidades_db = list(Especialidade.objects.all().order_by('nome').values('id', 'nome'))
                    memoria_atual['lista_especialidades'] = especialidades_db
                    resultado_agendamento = manager.handle_awaiting_specialty(especialidade_sugerida)
                    resultado_agendamento['response_message'] = resposta_acolhimento + "\n\n" + resultado_agendamento['response_message']
                    resultado = resultado_agendamento
                else:
                    resultado = {"response_message": "Com base nos sintomas, não consegui identificar uma especialidade. Que tal agendar com um Clínico Geral para uma avaliação inicial?", "new_state": 'identificando_demanda', "memory_data": memoria_atual}

            elif intent == "iniciar_agendamento":
                resultado = manager.processar(user_message, 'agendamento_inicio')
            
            elif intent == "cancelar_agendamento":
                resultado = manager.processar(user_message, 'cancelamento_inicio')

            else: # pergunta_geral ou fallback da IA
                faq_data = chain_faq.invoke({"pergunta_do_usuario": user_message, "faq": faq_base_de_conhecimento})
                resposta_final = faq_data.get("resposta", "Não consegui processar sua pergunta.")
                resultado = {"response_message": resposta_final, "new_state": 'identificando_demanda', "memory_data": memoria_atual}

        except Exception as e:
            logger.error(f"Erro na IA roteadora ou na lógica principal: {e}", exc_info=True)
            resultado = {"response_message": f"Desculpe, {nome_usuario}, não consegui entender. Poderia tentar de outra forma?", "new_state": "identificando_demanda", "memory_data": memoria_atual}

    # Salva o estado final no banco de dados
    try:
        if resultado:
            memoria_obj.state = resultado.get("new_state")
            memoria_obj.memory_data = resultado.get("memory_data")
            memoria_obj.save()
    except Exception as e:
        logger.error(f"Erro crítico ao salvar a memória: {e}", exc_info=True)

    return resultado