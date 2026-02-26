# chatbot/bot_logic.py - VERSÃO FOCADA NO FUNIL OBSTÉTRICO (IA EM STAND-BY)

import logging
from .models import ChatMemory
from .agendamento_flow import AgendamentoManager
from .chains import (
    chain_roteadora, chain_sintomas, chain_faq, faq_base_de_conhecimento,
    chain_triagem, chain_classifica_modalidade
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

def processar_funil_gestante(session_id, user_message, estado_atual, memoria_atual):
    """Gerencia o funil de captação focado em exames de gestação logo na saudação."""
    import re
    from datetime import datetime, timedelta, date
    from pacientes.models import Paciente
    from agendamentos.models import Agendamento
    from usuarios.models import CustomUser
    from faturamento.models import Procedimento
    from agendamentos.services import buscar_proximo_horario_procedimento # <--- IMPORTA A AGENDA REAL
    from django.utils.timezone import make_aware

    # ESCAPE: Se a pessoa disser que não está grávida ou quiser cancelar
    if any(palavra in user_message.lower() for palavra in ['não estou', 'nao estou', 'cancelar', 'outro exame', 'consulta', 'ginecologista']):
        return {"response_message": "Ah, entendi! Como posso te ajudar hoje na clínica então?", "new_state": 'ia_roteadora_livre', "memory_data": memoria_atual}

    if estado_atual == 'inicio':
        return {
            "response_message": "Bom dia 🤍\nSou o Leônidas, da Clínica Limalé.\n\nVocê está com quantas semanas hoje?\nJá verifico a fase ideal e os horários disponíveis para você 😊",
            "new_state": 'aguardando_semanas_gestacao',
            "memory_data": memoria_atual
        }

    elif estado_atual == 'aguardando_semanas_gestacao':
        match = re.search(r'\d+', user_message)
        if match:
            semanas = int(match.group())
            
            # 1. Determina exame
            if semanas <= 10: exame = "US Transvaginal"
            elif 11 <= 14: exame = "Morfológico 1 Trimestre essencial"
            elif 15 <= 19: exame = "Obstétrico essencial"
            elif 20 <= 24: exame = "Morfológico 2 Trimestre essencial"
            else: exame = "Obstétrico com Doppler"
            
            # 2. Busca o procedimento
            procedimento = Procedimento.objects.filter(descricao__icontains=exame, ativo=True).first()
            medico = CustomUser.objects.filter(cargo='medico', is_active=True).first()
            
            if procedimento and medico:
                valor_str = f"{procedimento.valor_particular:.2f}".replace('.', ',') if procedimento.valor_particular else "sob consulta"
                
                # --- NOVO SCANNER DE AGENDA (Quarta e Sábado) ---
                hoje = date.today()
                
                # Calcula próxima Quarta
                dias_quarta = (2 - hoje.weekday()) % 7
                if dias_quarta == 0: dias_quarta = 7
                data_quarta = hoje + timedelta(days=dias_quarta)
                
                # Calcula próximo Sábado
                dias_sabado = (5 - hoje.weekday()) % 7
                if dias_sabado == 0: dias_sabado = 7
                data_sabado = hoje + timedelta(days=dias_sabado)

                def encontrar_horario_livre(data_alvo, lista_horarios):
                    """Testa horários no banco para achar um buraco livre de 30 min"""
                    for h in lista_horarios:
                        dt_alvo = make_aware(datetime.strptime(f"{data_alvo.strftime('%Y-%m-%d')} {h}", "%Y-%m-%d %H:%M"))
                        # Verifica se existe agendamento que conflita com esse horário
                        ocupado = Agendamento.objects.filter(
                            medico=medico, 
                            data_hora_inicio__lt=dt_alvo + timedelta(minutes=30),
                            data_hora_fim__gt=dt_alvo,
                            status__in=['Agendado', 'Confirmado']
                        ).exists()
                        if not ocupado:
                            return h
                    return None

                # Grade de horários que o bot vai tentar achar vaga (ajuste se quiser)
                horarios_quarta = ['14:00', '14:30', '15:00', '15:30', '16:00', '09:00', '09:30', '10:00']
                horarios_sabado = ['09:00', '09:30', '10:00', '10:30', '11:00', '08:00', '08:30']

                hora_quarta = encontrar_horario_livre(data_quarta, horarios_quarta)
                hora_sabado = encontrar_horario_livre(data_sabado, horarios_sabado)

                opcoes = []
                if hora_quarta:
                    opcoes.append({
                        "opcao": str(len(opcoes)+1),
                        "dia_semana": "Quarta-feira",
                        "data_iso": data_quarta.strftime('%Y-%m-%d'),
                        "data": data_quarta.strftime('%d/%m/%Y'),
                        "hora": hora_quarta
                    })
                if hora_sabado:
                    opcoes.append({
                        "opcao": str(len(opcoes)+1),
                        "dia_semana": "Sábado",
                        "data_iso": data_sabado.strftime('%Y-%m-%d'),
                        "data": data_sabado.strftime('%d/%m/%Y'),
                        "hora": hora_sabado
                    })
                
                if not opcoes:
                    # Se lotou quarta E sábado, joga pra atendente
                    return {"response_message": f"Com {semanas} semanas, o exame indicado é o *{procedimento.descricao}* (R$ {valor_str}). Porém, nossas agendas de Quarta e Sábado estão lotadas. Quer que eu peça para uma atendente verificar um encaixe?", "new_state": 'ia_roteadora_livre', "memory_data": memoria_atual}

                memoria_atual['exame_indicado'] = procedimento.descricao
                memoria_atual['opcoes_horario'] = opcoes
                
                msg = (f"Com {semanas} semanas, o exame ideal agora é o *{procedimento.descricao}*.\n"
                       f"O valor deste exame é R$ {valor_str}.\n\n"
                       f"Temos estas opções de horários mais próximos:\n")
                
                for op in opcoes:
                    msg += f"{op['opcao']}️⃣ {op['dia_semana']} ({op['data']}) às {op['hora']}\n"
                    
                msg += f"\nQual das opções fica melhor para você? (Digite 1 ou 2)"
                
                return {"response_message": msg, "new_state": 'aguardando_escolha_horario_gestacao', "memory_data": memoria_atual}
            
            else:
                 return {"response_message": f"Com {semanas} semanas, o exame ideal seria o *{exame}*. Vou pedir para uma de nossas atendentes te passar os horários e valores exatos. Um momento!", "new_state": 'ia_roteadora_livre', "memory_data": memoria_atual}

        else:
            return {"response_message": "Não consegui identificar o número de semanas. Pode digitar apenas o número? Ex: 12", "new_state": 'aguardando_semanas_gestacao', "memory_data": memoria_atual}

    elif estado_atual == 'aguardando_escolha_horario_gestacao':
        if '1' in user_message or 'primeir' in user_message.lower():
            memoria_atual['horario_escolhido'] = memoria_atual['opcoes_horario'][0]
            return {"response_message": "Excelente escolha! Para registrarmos o seu agendamento, qual é o seu nome completo?", "new_state": 'aguardando_nome_cadastro', "memory_data": memoria_atual}
        elif '2' in user_message or 'segund' in user_message.lower():
            memoria_atual['horario_escolhido'] = memoria_atual['opcoes_horario'][1]
            return {"response_message": "Excelente escolha! Para registrarmos o seu agendamento, qual é o seu nome completo?", "new_state": 'aguardando_nome_cadastro', "memory_data": memoria_atual}
        else:
            return {"response_message": "Por favor, responda com 1 ou 2 para escolher o melhor horário.", "new_state": 'aguardando_escolha_horario_gestacao', "memory_data": memoria_atual}

    elif estado_atual == 'aguardando_nome_cadastro':
        if len(user_message.split()) < 2:
            return {"response_message": "Por favor, digite seu nome e sobrenome para o prontuário:", "new_state": 'aguardando_nome_cadastro', "memory_data": memoria_atual}
        else:
            memoria_atual['nome_usuario'] = user_message.title()
            return {"response_message": f"Prazer, {memoria_atual['nome_usuario']}! E qual é o seu melhor e-mail para enviarmos a confirmação?", "new_state": 'aguardando_email_cadastro', "memory_data": memoria_atual}

    elif estado_atual == 'aguardando_email_cadastro':
        if '@' not in user_message:
            return {"response_message": "Esse e-mail não parece válido. Por favor, digite novamente:", "new_state": 'aguardando_email_cadastro', "memory_data": memoria_atual}
        else:
            memoria_atual['email_usuario'] = user_message.lower().strip()
            
            # --- INTEGRAÇÃO COM O BANCO DE DADOS ---
            telefone = ''.join(filter(str.isdigit, session_id))
            paciente, criado = Paciente.objects.get_or_create(
                telefone_celular=telefone,
                defaults={
                    'nome_completo': memoria_atual['nome_usuario'],
                    'email': memoria_atual['email_usuario'],
                    'data_nascimento': '1900-01-01'
                }
            )
            if not criado:
                paciente.nome_completo = memoria_atual['nome_usuario']
                paciente.email = memoria_atual['email_usuario']
                paciente.save()
            
            exame_nome = memoria_atual.get('exame_indicado')
            procedimento = Procedimento.objects.filter(descricao=exame_nome, ativo=True).first()
            medico = CustomUser.objects.filter(cargo='medico', is_active=True).first()
            
            data_iso = memoria_atual['horario_escolhido']['data_iso'] 
            hora_str = memoria_atual['horario_escolhido']['hora'] 
            data_formatada_br = memoria_atual['horario_escolhido']['data']
            
            # Aqui juntamos a data YYYY-MM-DD com a hora HH:MM para salvar no banco
            data_hora_inicio = datetime.strptime(f"{data_iso} {hora_str}", "%Y-%m-%d %H:%M")
            
            try:
                data_hora_inicio_aware = make_aware(data_hora_inicio)
                Agendamento.objects.create(
                    paciente=paciente,
                    medico=medico,
                    procedimento=procedimento,
                    tipo_agendamento='Procedimento',
                    data_hora_inicio=data_hora_inicio_aware,
                    data_hora_fim=data_hora_inicio_aware + timedelta(minutes=30),
                    status='Agendado', 
                    observacoes=f"Agendado via Bot WhatsApp. Exame: {exame_nome}."
                )
                msg_final = (f"Tudo certo, {memoria_atual['nome_usuario']}! 🎉\n\n"
                             f"Seu exame de *{exame_nome}* está agendado para:\n"
                             f"📅 *Dia {data_formatada_br} às {hora_str}*\n\n"
                             f"Agradecemos por escolher a Clínica Limalé 🤍. Mais perto da data, enviaremos as orientações!")
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Erro ao salvar agendamento via bot: {e}")
                msg_final = "Seu cadastro foi feito, mas ocorreu uma instabilidade na agenda. Uma atendente confirmará o horário em instantes com você! 🤍"

            return {"response_message": msg_final, "new_state": 'ia_roteadora_livre', "memory_data": memoria_atual}

    return {}

def processar_mensagem_bot(session_id: str, user_message: str) -> dict:
    memoria_obj, _ = ChatMemory.objects.get_or_create(session_id=session_id)
    memoria_atual = memoria_obj.memory_data if isinstance(memoria_obj.memory_data, dict) else {}
    estado_atual = memoria_obj.state
    nome_usuario = memoria_atual.get('nome_usuario', '')
    resultado = {}

    logger.info(f"Processando | Session: {session_id} | Estado: '{estado_atual}' | Msg: '{user_message}'")

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
        return resultado
    
    # Verifica se usuário quer encerrar naturalmente
    if estado_atual in ['identificando_demanda', 'ia_roteadora_livre'] and ConversationManager.detectar_encerramento(user_message):
        resultado = ConversationManager.processar_encerramento(session_id, memoria_atual)
        memoria_obj.state = resultado.get("new_state")
        memoria_obj.memory_data = resultado.get("memory_data")
        memoria_obj.save()
        return resultado

    # ==================================================================
    # --- ROTEAMENTO SOBERANO: O FUNIL OBSTÉTRICO ---
    # ==================================================================
    ESTADOS_FUNIL_GESTANTE = [
        'inicio', 
        'aguardando_semanas_gestacao', 
        'aguardando_escolha_horario_gestacao', 
        'aguardando_nome_cadastro', 
        'aguardando_email_cadastro'
    ]

    # SE A MENSAGEM FOR UMA SAUDAÇÃO BÁSICA, REINICIA O FUNIL
    msg_limpa = user_message.strip().lower()
    saudacoes = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'menu']
    
    # FORÇA A PESSOA PARA O FUNIL DA GESTANTE SE ELA MANDAR SAUDAÇÃO OU ESTIVER "SOLTA"
    if msg_limpa in saudacoes or estado_atual == 'identificando_demanda':
        estado_atual = 'inicio'

    if estado_atual in ESTADOS_FUNIL_GESTANTE:
        resultado = processar_funil_gestante(session_id, user_message, estado_atual, memoria_atual)
    
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