# chatbot/bot_logic.py - VERSÃO FINAL COM LÓGICA CONTEXTUAL E DE TIMEOUT

import logging
from .models import ChatMemory
from .agendamento_flow import AgendamentoManager
from .chains import chain_roteadora, chain_sintomas, chain_faq, faq_base_de_conhecimento
from .services import get_resposta_preco
from .human_transfer import HumanTransferManager
from .conversation_manager import ConversationManager
from usuarios.models import Especialidade

logger = logging.getLogger(__name__)

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
    # CORREÇÃO: O estado identificando_demanda não tinha um prompt, causando a resposta genérica.
    if state == 'identificando_demanda':
        return f"Como posso te direcionar ao melhor cuidado hoje, {nome_usuario}?"
    return prompts.get(state, f"Como posso te ajudar, {nome_usuario}?")

def processar_mensagem_bot(session_id: str, user_message: str) -> dict:
    memoria_obj, _ = ChatMemory.objects.get_or_create(session_id=session_id)
    memoria_atual = memoria_obj.memory_data if isinstance(memoria_obj.memory_data, dict) else {}
    estado_atual = memoria_obj.state
    nome_usuario = memoria_atual.get('nome_usuario', '')
    resultado = {}

    logger.info(f"Processando | Session: {session_id} | Estado: '{estado_atual}' | Msg: '{user_message}'")

    # --- NÍVEL -1: VERIFICAÇÕES PRIORITÁRIAS (COMANDOS E TRANSFERÊNCIAS) ---
    
    # Verifica comandos de controle
    comando = ConversationManager.detectar_comando(user_message)
    if comando:
        resultado = ConversationManager.processar_comando(comando, session_id, memoria_atual)
        if resultado:
            memoria_obj.state = resultado.get("new_state")
            memoria_obj.memory_data = resultado.get("memory_data")
            memoria_obj.save()
            return resultado
    
    # Verifica solicitação de atendente humano
    if HumanTransferManager.detectar_solicitacao_humano(user_message):
        resultado = HumanTransferManager.processar_transferencia(session_id, memoria_atual)
        memoria_obj.state = resultado.get("new_state")
        memoria_obj.memory_data = resultado.get("memory_data")
        memoria_obj.save()
        return resultado
    
    # Verifica se usuário quer encerrar naturalmente
    if estado_atual == 'identificando_demanda' and ConversationManager.detectar_encerramento(user_message):
        resultado = ConversationManager.processar_encerramento(session_id, memoria_atual)
        memoria_obj.state = resultado.get("new_state")
        memoria_obj.memory_data = resultado.get("memory_data")
        memoria_obj.save()
        return resultado

    # --- NÍVEL 0: ONBOARDING (COLETA DO NOME) ---
    if not nome_usuario:
        if estado_atual != 'aguardando_nome':
            resultado = {"response_message": "Olá, seja bem-vindo à Clínica Limalé. Sou o Leônidas, e vou dar sequência no seu atendimento. Para começarmos, qual o seu nome?", "new_state": 'aguardando_nome', "memory_data": {}}
        else:
            nome_candidato = user_message.strip().title().split(' ')[0]
            if len(nome_candidato) > 2:
                memoria_atual['nome_usuario'] = nome_candidato
                resultado = {"response_message": f"Prazer, {nome_candidato}! Como posso te direcionar ao melhor cuidado hoje?", "new_state": 'identificando_demanda', "memory_data": memoria_atual}
            else:
                resultado = {"response_message": "Não entendi bem. Por favor, qual o seu primeiro nome?", "new_state": 'aguardando_nome', "memory_data": {}}
    else:
        # ==================================================================
        # --- HIERARQUIA DE PROCESSAMENTO (ESTRUTURA CORRIGIDA) ---
        # ==================================================================
        
        estados_de_fluxo = [
            'agendamento_awaiting_type', 'agendamento_awaiting_modality',
            'agendamento_awaiting_specialty', 'agendamento_awaiting_slot_choice',
            'agendamento_awaiting_slot_confirmation', 'cadastro_awaiting_cpf',
            'cadastro_awaiting_missing_field', 'agendamento_awaiting_payment_choice',
            'agendamento_awaiting_installments', 'awaiting_inactivity_response',
            'awaiting_schedule_confirmation', 'agendamento_awaiting_procedure', 
            'aguardando_atendente_humano', 'cancelamento_awaiting_cpf', 
            'cancelamento_awaiting_choice', 'cancelamento_awaiting_confirmation'
        ]

        # NÍVEL 1: Verifica se estamos EM UM FLUXO.
        if estado_atual in estados_de_fluxo:
            logger.warning(f"Priorizando continuação de fluxo no estado '{estado_atual}'.")
            
            # --- Tratamento de casos especiais que NÃO estão no AgendamentoManager ---
            if estado_atual == 'aguardando_atendente_humano':
                if 'continuar' in user_message.lower():
                    resultado = {"response_message": f"Perfeito, {nome_usuario}! Vamos continuar nosso atendimento. Como posso te ajudar?", "new_state": "identificando_demanda", "memory_data": memoria_atual}
                else:
                    resultado = {"response_message": f"Entendido, {nome_usuario}. Nossa equipe entrará em contato em breve. Aguarde um momento.", "new_state": "aguardando_atendente_humano", "memory_data": memoria_atual}
            
            elif estado_atual == 'awaiting_inactivity_response':
                if 'sim' in user_message.lower():
                    # Após uma pausa, sempre voltamos ao menu principal para evitar confusão.
                    memoria_atual.pop('tipo_agendamento', None)
                    memoria_atual.pop('lista_procedimentos', None)
                    resultado = {
                        "response_message": f"Que bom que voltou, {nome_usuario}! Como posso te ajudar agora?", 
                        "new_state": "identificando_demanda", 
                        "memory_data": memoria_atual
                    }
                else:
                    resultado = {"response_message": "Entendido. Quando precisar, é só chamar!", "new_state": 'inicio', "memory_data": {'nome_usuario': nome_usuario}}
            
            elif estado_atual == 'awaiting_schedule_confirmation':
                if 'sim' in user_message.lower():
                    manager = AgendamentoManager(session_id, memoria_atual, "")
                    resultado = manager.processar(user_message, 'agendamento_inicio')
                else:
                    resultado = {"response_message": "Tudo bem. Se mudar de ideia, é só me dizer o que gostaria de fazer.", "new_state": 'identificando_demanda', "memory_data": memoria_atual}
            
            # --- Para todos os outros estados de fluxo, usamos o AgendamentoManager ---
            else:
                manager = AgendamentoManager(session_id, memoria_atual, "")
                resultado = manager.processar(user_message, estado_atual)

        # NÍVEL 2: Se NÃO estamos em um fluxo, usamos a IA Roteadora.
        else:
            logger.warning("Nenhum fluxo ativo. Usando IA Roteadora com contexto para nova intenção.")
            try:
                historico = memoria_atual.get('historico_conversa', [])
                historico_formatado = "\n".join(historico)

                intent_data = chain_roteadora.invoke({
                    "user_message": user_message,
                    "historico_conversa": historico_formatado
                })

                intent = intent_data.get("intent")
                entity = intent_data.get("entity")

                if intent == "buscar_preco":
                    resposta_base = get_resposta_preco(entity, nome_usuario)
                    resposta_final = f"{resposta_base} Que tal aproveitarmos para já verificar os próximos horários disponíveis para {entity}, {nome_usuario}?"
                    resultado = {"response_message": resposta_final, "new_state": 'awaiting_schedule_confirmation', "memory_data": memoria_atual}

                elif intent == "iniciar_agendamento":
                    manager = AgendamentoManager(session_id, memoria_atual, "")
                    resultado = manager.processar(user_message, 'agendamento_inicio')

                else: # pergunta_geral ou fallback
                    faq_data = chain_faq.invoke({
                        "pergunta_do_usuario": user_message, 
                        "faq": faq_base_de_conhecimento,
                        "nome_usuario": nome_usuario
                    })
                    resultado = {"response_message": faq_data.get("resposta"), "new_state": 'identificando_demanda', "memory_data": memoria_atual}

            except Exception as e:
                logger.error(f"Erro na IA Roteadora: {e}", exc_info=True)
                resultado = {"response_message": f"Desculpe, {nome_usuario}, não consegui processar sua mensagem. Poderia tentar de outra forma?", "new_state": "identificando_demanda", "memory_data": memoria_atual}

    # --- PONTO DE SAÍDA ÚNICO: ATUALIZA A MEMÓRIA E O HISTÓRICO ---
    if not resultado:
        resultado = {"response_message": "Não entendi muito bem. Poderia repetir?", "new_state": "identificando_demanda", "memory_data": memoria_atual}
        
    historico = resultado.get("memory_data", {}).get('historico_conversa', [])
    historico.append(f"Usuário: {user_message}")
    historico.append(f"Bot: {resultado.get('response_message')}")
    resultado['memory_data']['historico_conversa'] = historico[-6:]

    memoria_obj.state = resultado.get("new_state")
    memoria_obj.memory_data = resultado.get("memory_data")
    memoria_obj.save()
    
    return resultado