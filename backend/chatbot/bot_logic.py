# chatbot/bot_logic.py - VERSÃO FOCADA NO FUNIL OBSTÉTRICO (IA EM STAND-BY)

import logging
from .models import ChatMemory
from .agendamento_flow import AgendamentoManager
from .agente_recepcionista import AgenteRecepcionista
from .chains import (
    chain_roteadora, chain_sintomas, chain_faq, faq_base_de_conhecimento,
    chain_triagem, chain_classifica_modalidade
)
from .services import get_resposta_preco
from .human_transfer import HumanTransferManager
from .conversation_manager import ConversationManager
from .agente_exames import AgenteExames
from .agente_medicina_fetal import AgenteMedicinaFetal
from .agente_consultas import AgenteConsultas

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
        'agendamento_awaiting_procedure': "Qual procedimento deseja agendar?",
        'agendamento_awaiting_slot_choice': "Qual horário prefere?",
        'cadastro_awaiting_missing_field': f"Qual {memory.get('missing_field', 'dado solicitado')}?",
        'cancelamento_awaiting_cpf': "Por favor, informe seu CPF para cancelamento.",
        'cancelamento_awaiting_choice': "Qual o número do agendamento a cancelar?",
        'cancelamento_awaiting_confirmation': "Confirma o cancelamento? (Sim/Não)",
        'awaiting_schedule_confirmation': "Gostaria de agendar/continuar? (Sim/Não)",
    }
    if state == 'agendamento_awaiting_slot_choice':
        horarios = memory.get('horarios_ofertados', {})
        data_formatada = horarios.get('data', 'uma data próxima')
        return f"Encontrei alguns horários para o dia *{data_formatada}*. Qual deles prefere?"
    if state == 'identificando_demanda' or state == 'ia_roteadora_livre':
        return f"Como posso te direcionar ao melhor cuidado hoje, {nome_usuario}?"
    return prompts.get(state, f"Como posso te ajudar, {nome_usuario}?")

MAPA_ESTADOS_INPUT = {
    'agendamento_awaiting_type': "O tipo de agendamento ('Consulta' ou 'Procedimento').",
    'agendamento_awaiting_modality': "A modalidade ('Telemedicina' ou 'Presencial').",
    'agendamento_awaiting_specialty': "O nome de uma especialidade médica da lista.",
    'agendamento_awaiting_procedure': "O nome de um procedimento da lista.",
    'agendamento_awaiting_slot_choice': "A escolha de um horário da lista OU um pedido por 'outra data'.",
    'agendamento_awaiting_slot_confirmation': "Uma confirmação ('Sim' ou 'Não').",
    'cadastro_awaiting_cpf': "O número do CPF (11 dígitos).",
    'cadastro_awaiting_missing_field': "A informação de cadastro solicitada (nome completo, data nascimento DD/MM/AAAA, telefone com DDD, email).",
    'agendamento_awaiting_payment_choice': "A escolha de pagamento ('PIX' ou 'Cartão', ou '1' ou '2').",
    'agendamento_awaiting_installments': "A escolha de parcelas (à vista, 2x ou 3x).",
    'cancelamento_awaiting_cpf': "O número do CPF para localizar agendamentos.",
    'cancelamento_awaiting_choice': "O número do agendamento que deseja cancelar (da lista apresentada).",
    'cancelamento_awaiting_confirmation': "Uma confirmação ('Sim' ou 'Não') para o cancelamento.",
    'awaiting_schedule_confirmation': "Uma confirmação ('Sim' ou 'Não') se deseja iniciar/continuar o agendamento.",
    'awaiting_inactivity_response': "Uma confirmação ('Sim' ou 'Não') se deseja continuar o atendimento após pausa.",
}

def notificar_recepcao_whatsapp(session_id, nome_paciente):
    """Envia um alerta para o celular da recepção."""
    from .whatsapp_service import WhatsAppBotHandler
    import os
    
    # ⚠️ MUDE AQUI: Coloque o número do celular da sua recepcionista (com 55 e DDD)
    NUMERO_RECEPCAO = os.environ.get("TELEFONE_RECEPCAO", "5511941041657")
    
    # Prepara o link para a recepcionista clicar e já abrir a conversa
    telefone_paciente = ''.join(filter(str.isdigit, session_id))
    nome = nome_paciente if nome_paciente else "Uma paciente"
    
    mensagem = (
        f"🚨 *ALERTA DE ATENDIMENTO* 🚨\n\n"
        f"*{nome}* pediu para falar com a recepção!\n\n"
        f"📲 *Clique no link abaixo para assumir a conversa:*\n"
        f"https://wa.me/{telefone_paciente}"
    )
    
    try:
        bot = WhatsAppBotHandler(NUMERO_RECEPCAO)
        bot.enviar_mensagem(mensagem)
    except Exception as e:
        logger.error(f"Erro ao enviar alerta para recepção: {e}")


def verificar_resposta_lembrete(session_id, user_message, memoria_atual):
    """Verifica se a mensagem é uma confirmação (SIM) ou cancelamento (NÃO) de um exame próximo."""
    from agendamentos.models import Agendamento
    from django.utils import timezone
    
    msg_limpa = user_message.strip().lower()
    
    # Define as intenções básicas de resposta curta
    is_confirmacao = msg_limpa in ['sim', 'confirmo', 'confirmado', 'com certeza', 'vou', 'vou sim']
    is_cancelamento = msg_limpa in ['não', 'nao', 'cancelar', 'não vou', 'nao vou', 'desmarcar']
    
    # Só processa se for uma resposta curta e exata
    if (is_confirmacao or is_cancelamento) and len(msg_limpa.split()) <= 3:
        telefone = ''.join(filter(str.isdigit, session_id))
        hoje = timezone.localtime(timezone.now()).date()
        
        # Procura se existe algum agendamento pendente (a partir de hoje) para este telefone
        agendamentos = Agendamento.objects.filter(
            paciente__telefone_celular__contains=telefone,
            status='Agendado',
            data_hora_inicio__date__gte=hoje
        ).order_by('data_hora_inicio')
        
        if agendamentos.exists():
            agendamento = agendamentos.first()
            exame_nome = agendamento.procedimento.descricao if agendamento.procedimento else "exame"
            data_formatada = timezone.localtime(agendamento.data_hora_inicio).strftime('%d/%m às %H:%M')
            
            if is_confirmacao:
                agendamento.status = 'Confirmado'
                agendamento.save()
                return {
                    "response_message": f"Que maravilha! A sua presença para o *{exame_nome}* no dia {data_formatada} está **Confirmada**! 🤍\nEstamos à sua espera.",
                    "new_state": 'ia_roteadora_livre',
                    "handled": True
                }
                
            elif is_cancelamento:
                agendamento.status = 'Cancelado'
                agendamento.save()
                return {
                    "response_message": f"Entendido. O seu agendamento para o *{exame_nome}* foi cancelado.\nSe quiser reagendar para outra data, é só dizer!",
                    "new_state": 'ia_roteadora_livre',
                    "handled": True
                }
                
    return {"handled": False}

def processar_mensagem_bot(session_id: str, user_message: str) -> dict:
    memoria_obj, _ = ChatMemory.objects.get_or_create(session_id=session_id)
    memoria_atual = memoria_obj.memory_data if isinstance(memoria_obj.memory_data, dict) else {}
    estado_atual = memoria_obj.state
    nome_usuario = memoria_atual.get('nome_usuario', '')
    resultado = {}

    logger.info(f"Processando | Session: {session_id} | Estado: '{estado_atual}' | Msg: '{user_message}'")

    # --- NOVO: INTERCETOR DE CONFIRMAÇÃO DE LEMBRETE ---
    resultado_lembrete = verificar_resposta_lembrete(session_id, user_message, memoria_atual)
    if resultado_lembrete.get("handled"):
        resultado_lembrete.pop("handled") # Remove a flag de controlo
        memoria_obj.state = resultado_lembrete.get("new_state")
        memoria_obj.save()
        return resultado_lembrete
    # ---------------------------------------------------

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
        memoria_obj.transferencia_solicitada = True
        memoria_obj.memory_data = resultado.get("memory_data")
        memoria_obj.save()
        notificar_recepcao_whatsapp(session_id, nome_usuario) # <--- ADICIONE ESTA LINHA AQUI
        return resultado
    
    # Verifica se usuário quer encerrar naturalmente
    if estado_atual in ['identificando_demanda', 'ia_roteadora_livre'] and ConversationManager.detectar_encerramento(user_message):
        resultado = ConversationManager.processar_encerramento(session_id, memoria_atual)
        memoria_obj.state = resultado.get("new_state")
        memoria_obj.memory_data = resultado.get("memory_data")
        memoria_obj.save()
        return resultado

    # ==================================================================
    # --- FASE 1: A RECEPCIONISTA E O ROTEAMENTO ---
    # ==================================================================
    msg_limpa = user_message.strip().lower()
    
    # BLINDAGEM MÁXIMA: Impede a Recepcionista de interromper os Agentes Especialistas!
    estados_protegidos = list(MAPA_ESTADOS_INPUT.keys()) + [
        'aguardando_atendente_humano', 'encerrado',
        'inicio_fetal', 'mf_aguardando_semanas', 'mf_aguardando_horario', 
        'mf_aguardando_nome_completo', 'mf_aguardando_nascimento', 'mf_aguardando_email',
        'inicio', 'aguardando_semanas_gestacao', 'aguardando_escolha_horario_gestacao',
        'aguardando_nome_cadastro', 'aguardando_email_cadastro',
        'agendamento_awaiting_specialty', 'agendamento_awaiting_slot_choice',
        'aguardando_tipo_exame_menu'
    ]
    
    if estado_atual == 'humano':
        estado_atual = 'aguardando_atendente_humano'

    # CORREÇÃO DO "OI": Procura palavras soltas para não confundir "depois" com "oi"
    palavras_msg = msg_limpa.replace(',', ' ').replace('!', ' ').replace('?', ' ').split()
    tem_saudacao = any(s in palavras_msg for s in ['oi', 'olá', 'ola', 'menu']) or \
                   any(s in msg_limpa for s in ['bom dia', 'boa tarde', 'boa noite', 'tudo bem'])
    
    # CORREÇÃO 2: Descobre se é o primeiro contato do paciente burlando o estado 'inicio' do banco
    historico = memoria_atual.get('historico_conversa', [])
    is_conversa_nova = len(historico) == 0

    # 1. DELEGAÇÃO PARA A RECEPCIONISTA (Boas-vindas e IA Ativa)
    # Se a conversa é nova, se tem saudação, ou se a IA antiga estava livre -> Recepcionista assume!
    if is_conversa_nova or (tem_saudacao and estado_atual not in estados_protegidos) or estado_atual in ['identificando_demanda', 'ia_roteadora_livre', None]:
        recepcionista = AgenteRecepcionista(session_id, memoria_atual)
        resultado = recepcionista.processar_saudacao(user_message)
        
    # 2. CAPTURA DO NOME (Novo Lead)
    elif estado_atual == 'recepcionista_aguardando_nome':
        recepcionista = AgenteRecepcionista(session_id, memoria_atual)
        resultado = recepcionista.processar_nome(user_message)
        
    # 3. ROTEAMENTO DO MENU PRINCIPAL (Opções 1, 2, 3)
    elif estado_atual == 'recepcionista_aguardando_intencao':
        if '1' in user_message or 'exame' in msg_limpa or 'ultrassom' in msg_limpa:
            # CORREÇÃO TESTE 1: Pergunta o tipo de exame para a IA poder classificar depois!
            resultado = {
                "response_message": f"Perfeito, {nome_usuario}! Para eu verificar a agenda correta, me diga qual exame você procura? (Ex: Morfológico, Ultrassom, Eletrocardiograma, etc.)", 
                "new_state": "aguardando_tipo_exame_menu", 
                "memory_data": memoria_atual
            }
        elif '2' in user_message or 'consulta' in msg_limpa:
            memoria_atual['tipo_agendamento'] = 'Consulta'
            resultado = {
                "response_message": f"Ótimo, {nome_usuario}. Para qual especialidade médica deseja a consulta?", 
                "new_state": "agendamento_awaiting_specialty", 
                "memory_data": memoria_atual
            }
        elif '3' in user_message or 'recepção' in msg_limpa or 'humano' in msg_limpa:
            resultado = HumanTransferManager.processar_transferencia(session_id, memoria_atual)
            memoria_obj.transferencia_solicitada = True
            notificar_recepcao_whatsapp(session_id, nome_usuario)
        else:
            estado_atual = 'ia_roteadora_livre'
            resultado = None 

    # 4. CAPTURA DO TIPO DE EXAME APÓS OPÇÃO 1
    elif estado_atual == 'aguardando_tipo_exame_menu':
        # Manda o nome do exame que o paciente digitou pro "Cérebro" LLM classificar (Fetal vs Geral) e dar a resposta humanizada!
        recepcionista = AgenteRecepcionista(session_id, memoria_atual)
        resultado = recepcionista.processar_mensagem_complexa(user_message, nome_usuario) 

    # ==================================================================
    # --- FASE 2: OS AGENTES ESPECIALISTAS ---
    # ==================================================================
    
    # 2.A: NOVO Agente de Medicina Fetal (Ultrassons Obstétricos)
    elif estado_atual in ['inicio_fetal', 'mf_aguardando_semanas', 'mf_aguardando_horario', 'mf_aguardando_dados_pessoais', 'mf_aguardando_email']:
        agente_fetal = AgenteMedicinaFetal(session_id, memoria_atual)
        resultado = agente_fetal.processar(user_message, estado_atual)
        
    # 2.B: O Agente de Exames Gerais (ECG, Sangue, etc)
    elif estado_atual in ['inicio', 'aguardando_semanas_gestacao', 'aguardando_escolha_horario_gestacao', 'aguardando_nome_cadastro', 'aguardando_email_cadastro']:
        agente_exames = AgenteExames(session_id, memoria_atual)
        resultado = agente_exames.processar(user_message, estado_atual)

    # 2.C: O Agente de Consultas Médicas
    elif estado_atual in ['agendamento_awaiting_specialty', 'agendamento_awaiting_slot_choice']:
        agente_consultas = AgenteConsultas(session_id, memoria_atual)
        resultado = agente_consultas.processar(user_message, estado_atual)
    
    # ==================================================================
    # --- IA EM STAND-BY (SÓ ATUA SE A PESSOA ESCAPAR DO FUNIL OBSTÉTRICO) ---
    # ==================================================================
    else:
        estados_de_fluxo = list(MAPA_ESTADOS_INPUT.keys())
        estados_de_fluxo.extend(['aguardando_atendente_humano'])

        historico = memoria_atual.get('historico_conversa', [])
        historico_formatado = "\n".join(historico[-4:])

        # NÍVEL 1: Verifica se estamos EM UM FLUXO AVANÇADO.
        if estado_atual in estados_de_fluxo:
            if estado_atual in MAPA_ESTADOS_INPUT:
                try:
                    input_esperado = MAPA_ESTADOS_INPUT.get(estado_atual, "Uma resposta específica do usuário.")
                    triagem_data = chain_triagem.invoke({
                        "estado_atual": estado_atual,
                        "input_esperado": input_esperado,
                        "historico_conversa": historico_formatado,
                        "user_message": user_message
                    })
                    intent_triagem = triagem_data.get("intent")
                    entity_triagem = triagem_data.get("entity")
                except Exception as e:
                    intent_triagem = 'continuacao'
                    entity_triagem = None
            else:
                intent_triagem = 'continuacao'
                entity_triagem = None

            if intent_triagem == 'continuacao':
                if estado_atual == 'aguardando_atendente_humano':
                     if 'continuar' in user_message.lower():
                         memoria_obj.transferencia_solicitada = False
                         resultado = {"response_message": f"Perfeito, {nome_usuario}! Vamos continuar nosso atendimento. Como posso te ajudar?", "new_state": "ia_roteadora_livre", "memory_data": memoria_atual}
                     else:
                         resultado = {"response_message": f"Entendido, {nome_usuario}. Nossa equipe entrará em contato em breve. Aguarde um momento.", "new_state": "aguardando_atendente_humano", "memory_data": memoria_atual}

                elif estado_atual == 'awaiting_inactivity_response':
                     if 'sim' in user_message.lower():
                         memoria_atual.pop('tipo_agendamento', None); memoria_atual.pop('lista_procedimentos', None);
                         resultado = {"response_message": f"Que bom que voltou, {nome_usuario}! Como posso te ajudar agora?", "new_state": "ia_roteadora_livre", "memory_data": memoria_atual}
                     else:
                         memoria_obj.conversa_encerrada = True
                         resultado = {"response_message": "Entendido. Quando precisar, é só chamar!", "new_state": 'encerrado', "memory_data": {'nome_usuario': nome_usuario}}

                elif estado_atual == 'awaiting_schedule_confirmation':
                    nome_usuario = memoria_atual.get('nome_usuario', '') 
                    if 'sim' in user_message.lower():
                        if 'previous_state' in memoria_atual:
                            estado_anterior = memoria_atual.pop('previous_state')
                            reprompt = get_reprompt_message(estado_anterior, memoria_atual)
                            resultado = {"response_message": f"Ótimo! Continuando de onde paramos:\n\n{reprompt}", "new_state": estado_anterior, "memory_data": memoria_atual}
                        elif 'entidade_agendar' in memoria_atual:
                            entidade = memoria_atual.pop('entidade_agendar') 
                            memoria_atual['entidade_inicial_agendamento'] = entidade 
                            manager = AgendamentoManager(session_id, memoria_atual, "")
                            resultado = manager.processar("iniciar com entidade", 'agendamento_inicio') 
                        else:
                            resultado = {"response_message": f"Entendido, {nome_usuario}. Como posso te ajudar agora?", "new_state": 'ia_roteadora_livre', "memory_data": memoria_atual}
                    else:
                         memoria_atual.pop('previous_state', None)
                         memoria_atual.pop('entidade_agendar', None)
                         resultado = {"response_message": "Tudo bem. Se mudar de ideia ou precisar de outra coisa, é só me dizer!", "new_state": 'ia_roteadora_livre', "memory_data": memoria_atual}

                elif estado_atual in MAPA_ESTADOS_INPUT:
                    manager = AgendamentoManager(session_id, memoria_atual, "")
                    resultado = manager.processar(user_message, estado_atual)
                else:
                    resultado = {"response_message": f"Me desculpe, {nome_usuario}, me perdi um pouco. Pode me dizer novamente como posso te ajudar?", "new_state": "ia_roteadora_livre", "memory_data": memoria_atual}

            elif intent_triagem == 'interrupcao_preco':
                memoria_atual['previous_state'] = estado_atual
                resposta_base = get_resposta_preco(entity_triagem, memoria_atual)
                resposta_final = f"{resposta_base}\n\nPodemos continuar com o agendamento de onde paramos, {nome_usuario}? (Sim/Não)"
                resultado = {"response_message": resposta_final, "new_state": 'awaiting_schedule_confirmation', "memory_data": memoria_atual}

            elif intent_triagem == 'interrupcao_pergunta':
                memoria_atual['previous_state'] = estado_atual
                faq_data = chain_faq.invoke({
                    "pergunta_do_usuario": user_message,
                    "faq": faq_base_de_conhecimento,
                    "nome_usuario": nome_usuario
                })
                resposta_faq = faq_data.get("resposta", f"Desculpe {nome_usuario}, não encontrei essa informação.")
                resposta_final = f"{resposta_faq}\n\nPodemos continuar com o processo anterior, {nome_usuario}? (Sim/Não)"
                resultado = {"response_message": resposta_final, "new_state": 'awaiting_schedule_confirmation', "memory_data": memoria_atual}

            elif intent_triagem == 'interrupcao_cancelamento_fluxo':
                manager = AgendamentoManager(session_id, memoria_atual, "")
                resultado = manager.processar("cancelar fluxo", estado_atual)

            elif intent_triagem == 'transferencia_humano':
                 resultado = HumanTransferManager.processar_transferencia(session_id, memoria_atual)
                 memoria_obj.transferencia_solicitada = True
                 notificar_recepcao_whatsapp(session_id, nome_usuario) # <--- E AQUI

        # NÍVEL 2: IA Roteadora (Se não está no Funil e não está em fluxo)
        else:
            try:
                historico = memoria_atual.get('historico_conversa', [])
                historico_formatado_roteador = "\n".join(historico[-4:]) 

                intent_data = chain_roteadora.invoke({
                    "user_message": user_message,
                    "historico_conversa": historico_formatado_roteador
                })

                intent = intent_data.get("intent")
                entity = intent_data.get("entity")

                memoria_atual['entidade_inicial_agendamento'] = entity
                modalidade = intent_data.get("modalidade")
                medico = intent_data.get("medico_preferencia")
                dia = intent_data.get("dia_preferencia")
                hora = intent_data.get("hora_preferencia")

                if modalidade: memoria_atual['modalidade'] = modalidade
                if medico: memoria_atual['medico_preferencia'] = medico
                if dia: memoria_atual['dia_preferencia'] = dia
                if hora: memoria_atual['hora_preferencia'] = hora

                if intent == "buscar_preco":
                    resposta_base = get_resposta_preco(entity, memoria_atual)
                    resposta_final = f"{resposta_base}\n\nQue tal aproveitarmos para já verificar os próximos horários disponíveis para {entity}, {nome_usuario}? (Sim/Não)"
                    memoria_atual['entidade_agendar'] = entity
                    resultado = {"response_message": resposta_final, "new_state": 'awaiting_schedule_confirmation', "memory_data": memoria_atual}

                elif intent == "iniciar_agendamento":
                    manager = AgendamentoManager(session_id, memoria_atual, "")
                    resultado = manager.processar(user_message, 'agendamento_inicio')

                elif intent == "cancelar_agendamento":
                    manager = AgendamentoManager(session_id, memoria_atual, "")
                    resultado = manager.processar(user_message, 'cancelamento_inicio')

                elif intent == "triagem_sintomas":
                    if not chain_sintomas: raise ValueError("Chain de Sintomas não inicializada.")
                    sintomas_data = chain_sintomas.invoke({"sintomas_do_usuario": user_message})
                    especialidade = sintomas_data.get("especialidade_sugerida", "Clínico Geral")
                    entidade_para_agendar = especialidade if especialidade != 'Nenhuma' else "Clínico Geral"
                    msg = (f"Entendo seus sintomas, {nome_usuario}. "
                           f"A especialidade mais indicada parece ser *{entidade_para_agendar}*. "
                           f"Gostaria de verificar os horários disponíveis? (Sim/Não)")
                    memoria_atual['entidade_agendar'] = entidade_para_agendar
                    resultado = {"response_message": msg, "new_state": "awaiting_schedule_confirmation", "memory_data": memoria_atual}

                elif intent == "transferencia_humano":
                    resultado = HumanTransferManager.processar_transferencia(session_id, memoria_atual)
                    memoria_obj.transferencia_solicitada = True
                    notificar_recepcao_whatsapp(session_id, nome_usuario) # <--- E AQUI TAMBÉM

                elif intent == "encerrar_conversa":
                    resultado = ConversationManager.processar_encerramento(session_id, memoria_atual)
                    memoria_obj.conversa_encerrada = True

                else:
                    if not chain_faq: raise ValueError("Chain FAQ não inicializada.")
                    faq_data = chain_faq.invoke({
                        "pergunta_do_usuario": user_message,
                        "faq": faq_base_de_conhecimento,
                        "nome_usuario": nome_usuario
                    })
                    resposta = faq_data.get("resposta", f"Desculpe {nome_usuario}, não encontrei informações sobre isso.")
                    resultado = {"response_message": resposta, "new_state": 'ia_roteadora_livre', "memory_data": memoria_atual}

            except Exception as e:
                logger.error(f"Erro na IA Roteadora no Nível 2: {e}", exc_info=True)
                resultado = {"response_message": f"Desculpe, {nome_usuario}, tive um problema para entender sua solicitação. Poderia tentar de outra forma?", "new_state": "ia_roteadora_livre", "memory_data": memoria_atual}

    # PONTO DE SAÍDA E HISTÓRICO
    if not resultado:
        resultado = {"response_message": f"Não entendi muito bem, {nome_usuario}. Poderia repetir?", "new_state": estado_atual, "memory_data": memoria_atual}

    memoria_para_salvar = resultado.get("memory_data", memoria_atual)
    historico = memoria_para_salvar.get('historico_conversa', [])
    if isinstance(historico, list):
        historico.append(f"Usuário: {user_message}")
        historico.append(f"Bot: {resultado.get('response_message')}")
        memoria_para_salvar['historico_conversa'] = historico[-6:]
    else:
        memoria_para_salvar['historico_conversa'] = []

    memoria_obj.state = resultado.get("new_state", estado_atual)
    memoria_obj.memory_data = memoria_para_salvar
    if memoria_obj.state != 'awaiting_schedule_confirmation' and 'previous_state' in memoria_obj.memory_data:
         memoria_obj.memory_data.pop('previous_state', None)

    memoria_obj.save()

    return resultado