# chatbot/bot_logic.py - VERSÃO CORRIGIDA E MAIS ROBUSTA

import logging
from .models import ChatMemory
from .agendamento_flow import AgendamentoManager
from .chains import chain_roteadora, chain_sintomas, chain_faq, faq_base_de_conhecimento
from .services import get_resposta_preco
from usuarios.models import Especialidade

logger = logging.getLogger(__name__)

def get_reprompt_message(state: str, memory: dict) -> str:
    """
    Gera a mensagem de "re-pergunta" baseada no estado salvo, para que o usuário 
    saiba como continuar a conversa após um timeout.
    """
    nome_usuario = memory.get('nome_usuario', '')

    # Mapeia estados para as perguntas correspondentes
    prompts = {
        'agendamento_awaiting_type': f"Perfeito, {nome_usuario}! Nosso time está pronto para te atender. O agendamento será para uma *Consulta* ou *Procedimento*?",
        'agendamento_awaiting_modality': "Ótimo. E você prefere o conforto da *Telemedicina* ou o atendimento *Presencial* em nossa clínica?",
        'agendamento_awaiting_specialty': "Perfeito. Qual das nossas especialidades você deseja?",
        'agendamento_awaiting_slot_confirmation': "Confirma o horário pré-reservado? (Sim/Não)",
        'cadastro_awaiting_cpf': "Para agilizar e garantir a segurança do seu agendamento, por favor, me informe o seu *CPF* (apenas os números).",
        'cadastro_awaiting_missing_field': f"Estávamos preenchendo seus dados de cadastro. O próximo campo é: *{memory.get('missing_field', '...')}*.",
        'agendamento_awaiting_payment_choice': "Como prefere pagar? 💳\n\n1️⃣ *PIX* (5% de desconto)\n2️⃣ *Cartão de Crédito* (até 3x sem juros)",
        'agendamento_awaiting_installments': "Deseja pagar à vista ou parcelado em 2x ou 3x sem juros?",
        'cancelamento_awaiting_cpf': "Para localizar seu agendamento para cancelamento, por favor, informe seu *CPF*.",
        'cancelamento_awaiting_choice': "Encontrei estes agendamentos. Qual o *número* do que deseja cancelar?",
        'cancelamento_awaiting_confirmation': "Confirma o cancelamento deste agendamento? (Sim/Não)",
    }

    # Alguns estados têm prompts dinâmicos que dependem da memória
    if state == 'agendamento_awaiting_slot_choice':
        horarios = memory.get('horarios_ofertados', {})
        data_formatada = horarios.get('data', 'uma data próxima')
        medico_nome = memory.get('medico_nome', 'o médico')
        return f"Encontrei alguns horários com Dr(a). {medico_nome} para o dia *{data_formatada}*. Qual deles prefere?"

    # Retorna a pergunta do dicionário ou uma padrão
    return prompts.get(state, f"Como posso te ajudar, {nome_usuario}?")

def processar_mensagem_bot(session_id: str, user_message: str) -> dict:
    memoria_obj, _ = ChatMemory.objects.get_or_create(
        session_id=session_id,
        defaults={'memory_data': {}, 'state': 'inicio'}
    )
    memoria_atual = memoria_obj.memory_data if isinstance(memoria_obj.memory_data, dict) else {}
    estado_atual = memoria_obj.state

    logger.info(f"Processando | Session: {session_id} | Estado: '{estado_atual}' | Msg: '{user_message}'")

    if not chain_roteadora:
        logger.error("A IA roteadora não foi inicializada.")
        return {"response_message": "Desculpe, estou com um problema técnico.", "new_state": estado_atual, "memory_data": memoria_atual}

    resultado = {}

    # --- LÓGICA DE ROTEAMENTO INTELIGENTE ---
    # 1. Primeiro, vamos sempre tentar entender a intenção principal do usuário
    try:
        intent_data = chain_roteadora.invoke({"user_message": user_message})
        intent = intent_data.get("intent")
        entity = intent_data.get("entity")
        nome_usuario = memoria_atual.get('nome_usuario', '')
    except Exception as e:
        logger.error(f"Erro na IA roteadora: {e}", exc_info=True)
        return {"response_message": "Desculpe, não consegui processar sua mensagem. Poderia repetir?", "new_state": estado_atual, "memory_data": memoria_atual}

    # 2. Define quais intenções FORÇAM uma mudança de assunto (resetam o fluxo)
    intencoes_de_reset = ['buscar_preco', 'cancelar_agendamento', 'pergunta_geral', 'triagem_sintomas']

    # 3. Lógica principal: O usuário quer mudar de assunto ou continuar o fluxo atual?
    if estado_atual in ['inicio', 'aguardando_nome'] or intent in intencoes_de_reset:
        # O usuário está no início ou quer mudar de assunto.
        logger.warning(f"Roteando para um novo fluxo com a intenção: '{intent}'")
        
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
                
                # CORREÇÃO: Prepara a memória com a lista de especialidades ANTES de pular para o fluxo
                especialidades_db = list(Especialidade.objects.all().order_by('nome').values('id', 'nome'))
                memoria_atual['lista_especialidades'] = especialidades_db
                
                manager = AgendamentoManager(session_id, memoria_atual, "")
                resultado_agendamento = manager.handle_awaiting_specialty(especialidade_sugerida)
                resultado_agendamento['response_message'] = resposta_acolhimento + "\n\n" + resultado_agendamento['response_message']
                resultado = resultado_agendamento
            else:
                resultado = {"response_message": "Com base nos sintomas, não consegui identificar uma especialidade. Que tal agendar com um Clínico Geral para uma avaliação inicial?", "new_state": 'identificando_demanda', "memory_data": memoria_atual}

        elif intent == "iniciar_agendamento":
            manager = AgendamentoManager(session_id, memoria_atual, "")
            resultado = manager.processar(user_message, 'agendamento_inicio')
        
        elif intent == "cancelar_agendamento":
            manager = AgendamentoManager(session_id, memoria_atual, "")
            resultado = manager.processar(user_message, 'cancelamento_inicio')

        else: # pergunta_geral
            faq_data = chain_faq.invoke({"pergunta_do_usuario": user_message, "faq": faq_base_de_conhecimento})
            resposta_final = faq_data.get("resposta", "Não consegui processar sua pergunta.")
            resultado = {"response_message": resposta_final, "new_state": 'identificando_demanda', "memory_data": memoria_atual}

    else:
        # O usuário está continuando um fluxo já iniciado (ex: respondendo qual especialidade quer).
        logger.warning(f"Continuando o fluxo existente no estado '{estado_atual}'.")
        try:
            manager = AgendamentoManager(session_id, memoria_atual, "")
            resultado = manager.processar(user_message, estado_atual)
        except Exception as e:
            logger.error(f"Erro no AgendamentoManager: {e}", exc_info=True)
            resultado = {"response_message": "Desculpe, ocorreu um erro. Vamos tentar de novo?", "new_state": "identificando_demanda", "memory_data": memoria_atual}

    # Salva o estado final no banco de dados
    try:
        if resultado:
            memoria_obj.state = resultado.get("new_state")
            memoria_obj.memory_data = resultado.get("memory_data")
            memoria_obj.save()
    except Exception as e:
        logger.error(f"Erro crítico ao salvar a memória: {e}", exc_info=True)

    return resultado