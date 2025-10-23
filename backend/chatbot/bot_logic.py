# chatbot/bot_logic.py - VERSÃO FINAL COM LÓGICA CONTEXTUAL E DE TIMEOUT

import logging
from .models import ChatMemory
from .agendamento_flow import AgendamentoManager
# MODIFICADO: Importa a nova chain e garante que as outras continuem
from .chains import (
    chain_roteadora, chain_sintomas, chain_faq, faq_base_de_conhecimento,
    chain_triagem # <--- ADICIONADO
)
from .services import get_resposta_preco
from .human_transfer import HumanTransferManager
from .conversation_manager import ConversationManager

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
        # Adicione outros estados que precisam de reprompt, se houver
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
    # CORREÇÃO: O estado identificando_demanda não tinha um prompt, causando a resposta genérica.
    if state == 'identificando_demanda':
        return f"Como posso te direcionar ao melhor cuidado hoje, {nome_usuario}?"
    return prompts.get(state, f"Como posso te ajudar, {nome_usuario}?")

# --- NÓVA SEÇÃO: MAPA DE ESTADOS PARA CONTEXTO DA TRIAGEM ---
# Este dicionário ajuda a chain_triagem a entender o que o bot espera em cada estado.
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
    # Adicione aqui outros estados que fazem parte de um fluxo e esperam input específico
}
# --- FIM DA NÓVA SEÇÃO ---

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
    # MODIFICADO: Tratamos isso ANTES da triagem, pois é prioritário
    if HumanTransferManager.detectar_solicitacao_humano(user_message):
        resultado = HumanTransferManager.processar_transferencia(session_id, memoria_atual)
        memoria_obj.state = resultado.get("new_state")
        # ADICIONADO: Atualiza transferencia_solicitada no objeto de memória
        memoria_obj.transferencia_solicitada = True
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
             # --- LÓGICA DE EXTRAÇÃO DE NOME MELHORADA ---
             nome_candidato = None
             msg_lower = user_message.lower().strip()
             
             # Tenta padrões comuns
             padroes = [
                 r"me chamo (\w+)", 
                 r"meu nome é (\w+)", 
                 r"sou o? (\w+)"
             ]
             import re # Garanta que 're' está importado no início do arquivo
             for padrao in padroes:
                 match = re.search(padrao, msg_lower)
                 if match:
                     nome_candidato = match.group(1).title()
                     break
             
             # Se não achou em padrões, pega a última palavra (ou a única)
             if not nome_candidato:
                  partes = user_message.strip().title().split(' ')
                  if partes:
                      nome_candidato = partes[-1] # Pega a última palavra

             # Validação simples (pelo menos 3 letras)
             if nome_candidato and len(nome_candidato) >= 3 and nome_candidato.isalpha():
                 memoria_atual['nome_usuario'] = nome_candidato
                 resultado = {"response_message": f"Prazer, {nome_candidato}! Como posso te direcionar ao melhor cuidado hoje?", "new_state": 'identificando_demanda', "memory_data": memoria_atual}
             else:
                 resultado = {"response_message": "Não entendi bem. Por favor, qual o seu primeiro nome?", "new_state": 'aguardando_nome', "memory_data": {}}
             # --- FIM DA LÓGICA MELHORADA ---
    else:
        # ==================================================================
        # --- HIERARQUIA DE PROCESSAMENTO (ESTRUTURA CORRIGIDA) ---
        # ==================================================================
        
        # MODIFICADO: Usamos as chaves do MAPA como a lista de estados de fluxo
        estados_de_fluxo = list(MAPA_ESTADOS_INPUT.keys())
        # ADICIONADO: Também incluímos estados que não esperam input mas são parte de um fluxo
        estados_de_fluxo.extend(['aguardando_atendente_humano']) # Adicione outros se houver

        historico = memoria_atual.get('historico_conversa', [])
        historico_formatado = "\n".join(historico[-4:]) # Pega as últimas 4 linhas para contexto

        # NÍVEL 1: Verifica se estamos EM UM FLUXO.
        if estado_atual in estados_de_fluxo:
            logger.warning(f"Estado '{estado_atual}' detectado como parte de um fluxo.")

            # --- NÓVA LÓGICA DE TRIAGEM ---
            # Só faz a triagem se o estado ESPERA um input específico
            if estado_atual in MAPA_ESTADOS_INPUT:
                logger.info("Estado espera input, acionando Chain de Triagem.")
                try:
                    # Garante que temos a chain_triagem inicializada
                    if not chain_triagem:
                        raise ValueError("Chain de Triagem não inicializada.")

                    input_esperado = MAPA_ESTADOS_INPUT.get(estado_atual, "Uma resposta específica do usuário.")

                    triagem_data = chain_triagem.invoke({
                        "estado_atual": estado_atual,
                        "input_esperado": input_esperado,
                        "historico_conversa": historico_formatado,
                        "user_message": user_message
                    })

                    intent_triagem = triagem_data.get("intent")
                    entity_triagem = triagem_data.get("entity")
                    logger.info(f"Resultado Triagem: Intenção='{intent_triagem}', Entidade='{entity_triagem}'")

                except Exception as e:
                    logger.error(f"Erro na chain_triagem: {e}. Tratando como 'continuacao' por segurança.", exc_info=True)
                    intent_triagem = 'continuacao'
                    entity_triagem = None
            else:
                # Se o estado é parte de um fluxo mas não espera input específico (ex: aguardando_atendente),
                # trata como continuação direta desse estado.
                logger.info(f"Estado '{estado_atual}' não espera input mapeado, tratando como continuação direta.")
                intent_triagem = 'continuacao'
                entity_triagem = None
            # --- FIM DA NÓVA LÓGICA DE TRIAGEM ---


            # --- PROCESSAMENTO BASEADO NO RESULTADO DA TRIAGEM ---

            if intent_triagem == 'continuacao':
                logger.info("Triagem: 'continuacao'. Processando com AgendamentoManager ou lógica específica do estado.")
                # O usuário respondeu o que esperávamos (ou é um estado sem triagem). Segue o fluxo normal.

                # --- Tratamento de casos especiais que NÃO estão no AgendamentoManager ---
                # (Seu código existente para 'aguardando_atendente_humano', 'awaiting_inactivity_response', etc.)
                if estado_atual == 'aguardando_atendente_humano':
                     if 'continuar' in user_message.lower():
                         # ADICIONADO: Marca que não precisa mais de transferência
                         memoria_obj.transferencia_solicitada = False
                         resultado = {"response_message": f"Perfeito, {nome_usuario}! Vamos continuar nosso atendimento. Como posso te ajudar?", "new_state": "identificando_demanda", "memory_data": memoria_atual}
                     else:
                         resultado = {"response_message": f"Entendido, {nome_usuario}. Nossa equipe entrará em contato em breve. Aguarde um momento.", "new_state": "aguardando_atendente_humano", "memory_data": memoria_atual}

                elif estado_atual == 'awaiting_inactivity_response':
                     if 'sim' in user_message.lower():
                         memoria_atual.pop('tipo_agendamento', None); memoria_atual.pop('lista_procedimentos', None); # Limpa contexto antigo
                         resultado = {"response_message": f"Que bom que voltou, {nome_usuario}! Como posso te ajudar agora?", "new_state": "identificando_demanda", "memory_data": memoria_atual}
                     else:
                         # ADICIONADO: Define estado 'encerrado' para indicar fim da conversa
                         memoria_obj.conversa_encerrada = True # Marca no objeto DB
                         resultado = {"response_message": "Entendido. Quando precisar, é só chamar!", "new_state": 'encerrado', "memory_data": {'nome_usuario': nome_usuario}} # Limpa memória, muda estado

                # ADICIONADO: Lógica para confirmar continuação após interrupção
                # --- LÓGICA CORRIGIDA para confirmar continuação OU iniciar novo fluxo ---
                elif estado_atual == 'awaiting_schedule_confirmation':
                    nome_usuario = memoria_atual.get('nome_usuario', '') 
                    
                    if 'sim' in user_message.lower():
                        # Usuário quer continuar/agendar. Verificamos COMO chegamos aqui.
                        
                        # CENÁRIO 1: Voltando de uma interrupção (temos previous_state)
                        if 'previous_state' in memoria_atual:
                            estado_anterior = memoria_atual.pop('previous_state') # Recupera e remove
                            logger.info(f"Retomando fluxo do estado anterior: {estado_anterior}")
                            reprompt = get_reprompt_message(estado_anterior, memoria_atual)
                            resultado = {"response_message": f"Ótimo! Continuando de onde paramos:\n\n{reprompt}", "new_state": estado_anterior, "memory_data": memoria_atual}
                        
                        # CENÁRIO 2: Iniciando agendamento após sugestão (temos entidade_agendar)
                        elif 'entidade_agendar' in memoria_atual:
                            entidade = memoria_atual.pop('entidade_agendar') 
                            logger.info(f"Iniciando novo fluxo de agendamento para entidade: {entidade}")
                            memoria_atual['entidade_inicial_agendamento'] = entidade 
                            manager = AgendamentoManager(session_id, memoria_atual, "")
                            # ***** CORREÇÃO AQUI *****
                            # Atribui o retorno do manager diretamente a 'resultado'
                            resultado = manager.processar("iniciar com entidade", 'agendamento_inicio') 
                            # ***** FIM DA CORREÇÃO *****
                        
                        # CENÁRIO 3: Fallback (não deveria acontecer, mas por segurança)
                        else:
                            logger.warning("Estado awaiting_schedule_confirmation sem previous_state nem entidade_agendar. Indo para identificando_demanda.")
                            resultado = {"response_message": f"Entendido, {nome_usuario}. Como posso te ajudar agora?", "new_state": 'identificando_demanda', "memory_data": memoria_atual}

                    else:
                         # Usuário não quer continuar/agendar. Volta ao menu principal.
                         logger.info("Usuário recusou a continuação/agendamento.")
                         # Limpa 'previous_state' e 'entidade_agendar' se existirem, para não confundir fluxos futuros
                         memoria_atual.pop('previous_state', None)
                         memoria_atual.pop('entidade_agendar', None)
                         resultado = {"response_message": "Tudo bem. Se mudar de ideia ou precisar de outra coisa, é só me dizer!", "new_state": 'identificando_demanda', "memory_data": memoria_atual}
                # --- FIM DA LÓGICA CORRIGIDA ---

                # --- Para todos os outros estados de fluxo mapeados, usamos o AgendamentoManager ---
                elif estado_atual in MAPA_ESTADOS_INPUT: # Garante que só chame o manager para estados mapeados
                    manager = AgendamentoManager(session_id, memoria_atual, "") # URL base não é usada aqui
                    resultado = manager.processar(user_message, estado_atual)
                else:
                    # Fallback caso um estado de fluxo não tenha lógica específica nem esteja no manager
                    logger.error(f"Estado de fluxo '{estado_atual}' sem handler definido. Voltando para identificando_demanda.")
                    resultado = {"response_message": f"Me desculpe, {nome_usuario}, me perdi um pouco. Pode me dizer novamente como posso te ajudar?", "new_state": "identificando_demanda", "memory_data": memoria_atual}


            elif intent_triagem == 'interrupcao_preco':
                logger.warning(f"Triagem: 'interrupcao_preco'. Usuário perguntou por '{entity_triagem}'.")
                # Salva o estado atual para poder voltar DEPOIS de responder o preço
                memoria_atual['previous_state'] = estado_atual

                resposta_base = get_resposta_preco(entity_triagem, memoria_atual) # <--- Linha Corrigida (passa memoria_atual)
                # MODIFICADO: Pergunta se quer CONTINUAR o fluxo ANTERIOR
                resposta_final = (
                    f"{resposta_base}\n\n"
                    f"Aliás, {nome_usuario}, estávamos tratando de outra coisa. "
                    f"Gostaria de continuar de onde paramos? (Sim/Não)"
                )
                # MODIFICADO: Muda para um estado que espera a confirmação de continuação
                resultado = {"response_message": resposta_final, "new_state": 'awaiting_schedule_confirmation', "memory_data": memoria_atual}

            elif intent_triagem == 'interrupcao_pergunta':
                logger.warning(f"Triagem: 'interrupcao_pergunta'. Usuário perguntou sobre '{entity_triagem}'.")
                memoria_atual['previous_state'] = estado_atual # Salva estado

                faq_data = chain_faq.invoke({
                    "pergunta_do_usuario": user_message,
                    "faq": faq_base_de_conhecimento,
                    "nome_usuario": nome_usuario
                })
                resposta_faq = faq_data.get("resposta", f"Desculpe {nome_usuario}, não encontrei essa informação.")

                # Responde à pergunta e pergunta se quer continuar o fluxo anterior
                resposta_final = (
                    f"{resposta_faq}\n\n"
                    f"Posso te ajudar com mais alguma coisa ou gostaria de continuar o que estávamos fazendo antes? (Sim/Não)"
                )
                resultado = {"response_message": resposta_final, "new_state": 'awaiting_schedule_confirmation', "memory_data": memoria_atual}

            elif intent_triagem == 'interrupcao_cancelamento_fluxo':
                logger.warning("Triagem: 'interrupcao_cancelamento_fluxo'. Cancelando fluxo atual.")
                # O usuário desistiu do fluxo atual. Usamos a lógica de interrupção do AgendamentoManager.
                manager = AgendamentoManager(session_id, memoria_atual, "")
                # Enviamos uma mensagem padrão de cancelamento para o manager processar
                resultado = manager.processar("cancelar fluxo", estado_atual) # O manager já tem a lógica para limpar a memória e voltar

            # ADICIONADO: Tratamento explícito de transferência humana pela triagem (redundante mas seguro)
            elif intent_triagem == 'transferencia_humano':
                 logger.warning("Triagem: 'transferencia_humano'. Acionando transferência.")
                 resultado = HumanTransferManager.processar_transferencia(session_id, memoria_atual)
                 memoria_obj.transferencia_solicitada = True # Marca no objeto DB

        # NÍVEL 2: Se NÃO estamos em um fluxo, usamos a IA Roteadora.
        else:
            logger.warning("Nenhum fluxo ativo. Usando IA Roteadora com contexto para nova intenção.")
            # --- BLOCO TRY...EXCEPT CORRIGIDO ---
            try:
                # Pega histórico para a chain roteadora
                historico = memoria_atual.get('historico_conversa', [])
                # Usa histórico mais curto para prompts, evitando excesso de tokens
                historico_formatado_roteador = "\n".join(historico[-4:]) 

                # Chama a chain roteadora para obter intenção e entidades
                intent_data = chain_roteadora.invoke({
                    "user_message": user_message,
                    "historico_conversa": historico_formatado_roteador # Usa histórico curto
                })

                intent = intent_data.get("intent")
                entity = intent_data.get("entity")
                logger.info(f"Roteador: Intenção='{intent}', Entidade='{entity}'")

                # Salva a entidade principal para uso futuro (handle_inicio)
                memoria_atual['entidade_inicial_agendamento'] = entity

                # Salva outras entidades extraídas se existirem
                modalidade = intent_data.get("modalidade")
                medico = intent_data.get("medico_preferencia")
                dia = intent_data.get("dia_preferencia")
                hora = intent_data.get("hora_preferencia")

                if modalidade: memoria_atual['modalidade'] = modalidade
                if medico: memoria_atual['medico_preferencia'] = medico
                if dia: memoria_atual['dia_preferencia'] = dia
                if hora: memoria_atual['hora_preferencia'] = hora
                logger.info(f"Roteador extraiu também: Mod={modalidade}, Med={medico}, Dia={dia}, Hora={hora}")

                # --- Lógica de Roteamento Baseada na Intenção ---
                if intent == "buscar_preco":
                    resposta_base = get_resposta_preco(entity, memoria_atual) # Passa memoria_atual
                    resposta_final = f"{resposta_base}\n\nQue tal aproveitarmos para já verificar os próximos horários disponíveis para {entity}, {nome_usuario}? (Sim/Não)"
                    memoria_atual['entidade_agendar'] = entity # Salva para confirmar agendamento
                    resultado = {"response_message": resposta_final, "new_state": 'awaiting_schedule_confirmation', "memory_data": memoria_atual}

                elif intent == "iniciar_agendamento":
                    manager = AgendamentoManager(session_id, memoria_atual, "")
                    # O handle_inicio agora usará 'entidade_inicial_agendamento' e outras infos salvas
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

                elif intent == "encerrar_conversa":
                    resultado = ConversationManager.processar_encerramento(session_id, memoria_atual)
                    memoria_obj.conversa_encerrada = True

                else: # pergunta_geral ou fallback do roteador
                    if not chain_faq: raise ValueError("Chain FAQ não inicializada.") # Garante que existe
                    faq_data = chain_faq.invoke({
                        "pergunta_do_usuario": user_message,
                        "faq": faq_base_de_conhecimento,
                        "nome_usuario": nome_usuario
                    })
                    resposta = faq_data.get("resposta", f"Desculpe {nome_usuario}, não encontrei informações sobre isso.")
                    resultado = {"response_message": resposta, "new_state": 'identificando_demanda', "memory_data": memoria_atual}

            # --- CLÁUSULA EXCEPT CORRIGIDA E INDENTADA ---
            except Exception as e:
                logger.error(f"Erro na IA Roteadora ou processamento de intenção no Nível 2: {e}", exc_info=True)
                # Mensagem de erro genérica, mas mantém o usuário no início
                resultado = {"response_message": f"Desculpe, {nome_usuario}, tive um problema para entender sua solicitação. Poderia tentar de outra forma?", "new_state": "identificando_demanda", "memory_data": memoria_atual}
            # --- FIM DO BLOCO TRY...EXCEPT CORRIGIDO ---

    # --- PONTO DE SAÍDA ÚNICO: ATUALIZA A MEMÓRIA E O HISTÓRICO ---
    if not resultado: # Fallback geral se nada acima gerar um resultado
        resultado = {"response_message": f"Não entendi muito bem, {nome_usuario}. Poderia repetir?", "new_state": estado_atual, "memory_data": memoria_atual} # Mantém estado atual no fallback

    # Atualiza o histórico
    memoria_para_salvar = resultado.get("memory_data", memoria_atual) # Pega a memória do resultado ou a atual
    historico = memoria_para_salvar.get('historico_conversa', [])
    if isinstance(historico, list): # Garante que é uma lista
        historico.append(f"Usuário: {user_message}")
        historico.append(f"Bot: {resultado.get('response_message')}")
        memoria_para_salvar['historico_conversa'] = historico[-6:] # Mantém apenas as últimas 6 linhas
    else:
        logger.error("Histórico de conversa não é uma lista. Resetando.")
        memoria_para_salvar['historico_conversa'] = []

    # Atualiza o estado e a memória no banco de dados
    memoria_obj.state = resultado.get("new_state", estado_atual) # Usa novo estado ou mantém atual
    memoria_obj.memory_data = memoria_para_salvar
    # ADICIONADO: Garante que previous_state seja limpo se não for mais necessário
    if memoria_obj.state != 'awaiting_schedule_confirmation' and 'previous_state' in memoria_obj.memory_data:
         memoria_obj.memory_data.pop('previous_state', None)

    memoria_obj.save()

    return resultado