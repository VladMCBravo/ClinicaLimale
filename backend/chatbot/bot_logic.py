# chatbot/bot_logic.py - VERSÃO FOCADA NO FUNIL OBSTÉTRICO (IA EM STAND-BY)

import logging
from .models import ChatMemory
from .agente_recepcionista import AgenteRecepcionista
from .chains import chain_faq, faq_base_de_conhecimento
from .human_transfer import HumanTransferManager
from .conversation_manager import ConversationManager
from .agente_exames import AgenteExames
from .agente_medicina_fetal import AgenteMedicinaFetal
from .agente_consultas import AgenteConsultas
from .agente_cancelamento import AgenteCancelamento

logger = logging.getLogger(__name__)

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
    
    # FORÇA O ESTADO PARA STAND-BY/HUMANO EM CONVERSAS NOVAS
    if not memoria_obj.state or memoria_obj.state == 'inicio':
        memoria_obj.state = 'humano'
        memoria_obj.save()

    # DESCOMENTADO: O código abaixo precisa existir para que o resto do arquivo não quebre
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
    # ADICIONADO O ESTADO 'mf_aguardando_confirmacao_morfo2'
    estados_protegidos = [
        'aguardando_atendente_humano', 'encerrado',
        'inicio_fetal', 'mf_aguardando_semanas', 'mf_aguardando_confirmacao_morfo2', 'mf_aguardando_horario', 
        'mf_aguardando_dados_pessoais', 'mf_aguardando_email',
        'inicio', 'exame_aguardando_horario', 'exame_aguardando_dados_pessoais', 'exame_aguardando_email',
        'agendamento_awaiting_specialty', 'agendamento_awaiting_slot_choice',
        'aguardando_dados_pessoais', 'aguardando_email_cadastro',
        'inicio_cancelamento', 'aguardando_escolha_cancelamento'
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

    # ==================================================================
    # 🕵️ CAPTURA SILENCIOSA DE LEADS E DADOS (GHOST MODE)
    # ==================================================================
    if is_conversa_nova:
        from pacientes.models import Paciente
        from crm.models import Ciclo, AnaliseComportamental
        from .chains import chain_recepcionista # <--- IA importada aqui!
        import re

        msg_lower = user_message.lower()
        origem_detectada = 'OUTRO'

        # 1. Leitura das Palavras-Chave da Campanha
        if "instagram" in msg_lower or "insta" in msg_lower:
            origem_detectada = 'INSTAGRAM'
        elif "google" in msg_lower:
            origem_detectada = 'GOOGLE'
        elif "facebook" in msg_lower or "face" in msg_lower:
            origem_detectada = 'FACEBOOK'
        elif "tiktok" in msg_lower:
            origem_detectada = 'TIKTOK'
        elif "site" in msg_lower:
            origem_detectada = 'SITE'

        # 2. INVOCAÇÃO SILENCIOSA DA IA (A mágica da extração)
        try:
            analise_ia = chain_recepcionista.invoke({
                "user_message": user_message,
                "nome_conhecido": "",
                "pular_saudacao": "SIM"
            })
            nome_extraido = analise_ia.get("nome_extraido")
            email_extraido = analise_ia.get("email_extraido")
            cpf_extraido = analise_ia.get("cpf_extraido")
            endereco_extraido = analise_ia.get("endereco_extraido")
        except Exception as e:
            logger.error(f"Erro no Ghost Mode IA: {e}")
            nome_extraido = email_extraido = cpf_extraido = endereco_extraido = None

        # 3. Limpa o telefone
        telefone_limpo = ''.join(filter(str.isdigit, session_id))
        
        # Se a IA já achou o nome na 1ª mensagem, usa ele. Senão, vira "Lead"
        nome_paciente_novo = nome_extraido.title() if nome_extraido else 'Lead (Novo Contato)'

        # 4. Cria ou Encontra o Paciente silenciosamente
        paciente, created = Paciente.objects.get_or_create(
            telefone_celular=telefone_limpo,
            defaults={'nome_completo': nome_paciente_novo, 'data_nascimento': '1900-01-01'}
        )

        # 5. Atualiza a ficha com os dados pescados pela IA
        atualizou = False
        
        if nome_extraido and "Lead" in paciente.nome_completo:
            paciente.nome_completo = nome_extraido.title()
            atualizou = True
            
        if email_extraido and not paciente.email:
            paciente.email = email_extraido.lower()
            atualizou = True
            
        if cpf_extraido and not paciente.cpf:
            # Validação simples: Remove tudo que não for número antes de salvar
            cpf_limpo = re.sub(r'\D', '', cpf_extraido)
            if len(cpf_limpo) == 11:
                paciente.cpf = cpf_limpo
                atualizou = True
                
        # Supondo que você tenha o campo 'endereco' no seu model Paciente
        if endereco_extraido and hasattr(paciente, 'endereco') and not paciente.endereco:
            paciente.endereco = endereco_extraido
            atualizou = True

        if atualizou or created:
            paciente.save()
            print(f"🤖 [GHOST MODE] Ficha de {paciente.nome_completo} processada silenciosamente pela IA.")

        # 6. Atualiza o Perfil Comportamental (Alimenta o Gráfico de Pizza)
        comp, _ = AnaliseComportamental.objects.get_or_create(paciente=paciente)
        if not comp.origem_aquisicao: 
            comp.origem_aquisicao = origem_detectada
            comp.observacoes_internas = f"Primeira mensagem (Bot): {user_message}"
            comp.save()

        # 7. Cria o Card na F1 do Kanban (Gatilho de Vendas)
        ciclo, _ = Ciclo.objects.get_or_create(
            paciente=paciente, 
            status='ativo',
            defaults={'tipo': 'OUTRO', 'fase_atual': 'F1'}
        )
    # ==================================================================

    # 1. DELEGAÇÃO PARA A RECEPCIONISTA (Boas-vindas e IA Ativa)
    # Se a conversa é nova, se tem saudação, ou se a IA antiga estava livre -> Recepcionista assume!
    if is_conversa_nova or (tem_saudacao and estado_atual not in estados_protegidos) or estado_atual in ['identificando_demanda', 'ia_roteadora_livre', None]:
        recepcionista = AgenteRecepcionista(session_id, memoria_atual)
        resultado = recepcionista.processar_saudacao(user_message)
        
    # 2. CAPTURA DO NOME (Novo Lead)
    elif estado_atual == 'recepcionista_aguardando_nome':
        recepcionista = AgenteRecepcionista(session_id, memoria_atual)
        resultado = recepcionista.processar_nome(user_message)
        
    # 3. CAPTURA DA INTENÇÃO (A pessoa respondeu ao "Como posso ajudar você hoje?")
    elif estado_atual == 'recepcionista_aguardando_intencao':
        recepcionista = AgenteRecepcionista(session_id, memoria_atual)
        # Passa pela IA para interpretar o que a pessoa digitou. 
        # O "pular_saudacao=True" proíbe o LLM de dizer "Sou o Leônidas" de novo!
        resultado = recepcionista.processar_mensagem_complexa(user_message, nome_usuario, pular_saudacao=True)

    # ==================================================================
    # --- FASE 2: OS AGENTES ESPECIALISTAS ---
    # ==================================================================
    
    # 2.A: NOVO Agente de Medicina Fetal (Ultrassons Obstétricos)
    # ADICIONADO O ESTADO 'mf_aguardando_confirmacao_morfo2' AQUI TAMBÉM
    elif estado_atual in ['inicio_fetal', 'mf_aguardando_semanas', 'mf_aguardando_confirmacao_morfo2', 'mf_aguardando_horario', 'mf_aguardando_dados_pessoais', 'mf_aguardando_email']:
        agente_fetal = AgenteMedicinaFetal(session_id, memoria_atual)
        resultado = agente_fetal.processar(user_message, estado_atual)
        
    # 2.B: O Agente de Exames Gerais (ECG, Sangue, Ultrassom Geral etc)
    elif estado_atual in ['inicio', 'exame_aguardando_horario', 'exame_aguardando_dados_pessoais', 'exame_aguardando_email']:
        agente_exames = AgenteExames(session_id, memoria_atual)
        resultado = agente_exames.processar(user_message, estado_atual)

    # 2.C: O Agente de Consultas Médicas
    elif estado_atual in ['agendamento_awaiting_specialty', 'agendamento_awaiting_slot_choice', 'aguardando_dados_pessoais', 'aguardando_email_cadastro']:
        agente_consultas = AgenteConsultas(session_id, memoria_atual)
        resultado = agente_consultas.processar(user_message, estado_atual)
        
    # 2.D: O Agente de Cancelamentos
    elif estado_atual in ['inicio_cancelamento', 'aguardando_escolha_cancelamento']:
        agente_cancelamento = AgenteCancelamento(session_id, memoria_atual)
        resultado = agente_cancelamento.processar(user_message, estado_atual)
    
    # ==================================================================
    # --- FASE 3: FAQ E FALLBACK FINAL ---
    # ==================================================================
    else:
        try:
            faq_data = chain_faq.invoke({
                "pergunta_do_usuario": user_message,
                "faq": faq_base_de_conhecimento,
                "nome_usuario": nome_usuario
            })
            # Formatação ajustada para não ficar com vírgula sobrando se o nome for vazio
            saudacao_erro = f", {nome_usuario}" if nome_usuario else ""
            resposta = faq_data.get("resposta", f"Desculpe{saudacao_erro}, não encontrei essa informação.")
            resultado = {"response_message": resposta, "new_state": 'ia_roteadora_livre', "memory_data": memoria_atual}
            
        except Exception as e:
            logger.error(f"Erro na FAQ: {e}", exc_info=True)
            resultado = {"response_message": f"Desculpe, {nome_usuario}, tive um problema para entender sua solicitação. Posso te transferir para a recepção?", "new_state": "ia_roteadora_livre", "memory_data": memoria_atual}

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