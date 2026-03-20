# chatbot/agente_consultas.py

import re
import logging
from datetime import datetime, timedelta
from django.utils.timezone import make_aware

from pacientes.models import Paciente
from agendamentos.models import Agendamento
from usuarios.models import CustomUser

logger = logging.getLogger(__name__)

class AgenteConsultas:
    """
    Agente especialista em Consultas Médicas.
    Cruza a especialidade do paciente com a agenda real do médico (Jornadas e Bloqueios).
    """

    def __init__(self, session_id, memoria_atual):
        self.session_id = session_id
        self.memoria_atual = memoria_atual

    def processar(self, user_message: str, estado_atual: str) -> dict:
        msg_lower = user_message.lower()
        
        # --- ROTA DE TRANSFERÊNCIA HUMANA ---
        if any(p in msg_lower for p in ['recepção', 'recepcao', 'atendente', 'humano', 'falar com pessoa']):
            from chatbot.human_transfer import HumanTransferManager
            from chatbot.bot_logic import notificar_recepcao_whatsapp
            notificar_recepcao_whatsapp(self.session_id, self.memoria_atual.get('nome_usuario', 'Paciente'))
            return HumanTransferManager.processar_transferencia(self.session_id, self.memoria_atual)

        # --- ROTA DE FUGA CLARA ---
        palavras_fuga = ['cancelar', 'não quero', 'nao quero', 'deixa pra lá', 'exame', 'ultrassom', 'obrigado', 'obrigada', 'encerrar', 'desisto']
        if any(p in msg_lower for p in palavras_fuga) and len(msg_lower.split()) < 10:
            return {
                "response_message": "Entendido! Agradeço pelo contato. Se precisar de mais alguma coisa ou mudar de ideia, a Clínica Limalé está de portas abertas para você! 🤍", 
                "new_state": 'ia_roteadora_livre', 
                "memory_data": self.memoria_atual
            }

        if estado_atual == 'agendamento_awaiting_specialty':
            return self._processar_especialidade(user_message)
        elif estado_atual == 'agendamento_awaiting_slot_choice':
            return self._processar_escolha_horario(user_message)
        elif estado_atual == 'aguardando_dados_pessoais':
            return self._processar_dados_pessoais(user_message)
        elif estado_atual == 'aguardando_email_cadastro':
            return self._processar_email_e_finalizar(user_message)

        return {}

    def _processar_especialidade(self, user_message: str) -> dict:
        nome_usuario = self.memoria_atual.get('nome_usuario', '')
        especialidade_pedida = user_message.strip().title()
        
        # Filtro básico (pode ser expandido para buscar no banco futuramente)
        especialidades_atendidas = ['Ginecologista', 'Ginecologia', 'Obstetra', 'Obstetrícia', 'Pediatra', 'Pediatria', 'Cardiologista', 'Cardiologia', 'Clinico Geral', 'Clínico Geral']
        
        if not any(esp.lower() in especialidade_pedida.lower() for esp in especialidades_atendidas):
            return {"response_message": f"{nome_usuario}, não encontrei '{especialidade_pedida}' nas nossas agendas. Por favor, digite outra especialidade ou digite *'recepção'* para falar com nossa equipe! 🤍", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria_atual}

        self.memoria_atual['especialidade_indicada'] = especialidade_pedida
        
        # Busca o primeiro médico ativo (No futuro, você pode cruzar com o modelo de Especialidades)
        medico = CustomUser.objects.filter(cargo='medico', is_active=True).first()
        
        if not medico:
             return {"response_message": f"{nome_usuario}, vou pedir para a nossa equipe verificar a agenda de {especialidade_pedida} para você. Um momento! 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        # ====================================================
        # NOVA BUSCA DE AGENDA INTELIGENTE (VIA SERVICE)
        # ====================================================
        from agendamentos.services import buscar_proximo_horario_disponivel
        
        resultado_agenda = buscar_proximo_horario_disponivel(medico.id)
        opcoes = []

        if resultado_agenda:
            data_iso = resultado_agenda['data']
            horarios_livres = resultado_agenda['horarios_disponiveis'][:2] # Máximo 2 vagas
            
            data_obj = datetime.strptime(data_iso, '%Y-%m-%d')
            dias_pt = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']
            dia_semana_str = dias_pt[data_obj.weekday()]
            data_formatada = data_obj.strftime('%d/%m/%Y')

            for idx, hora in enumerate(horarios_livres):
                opcoes.append({
                    "opcao": str(idx + 1), 
                    "dia_semana": dia_semana_str, 
                    "data_iso": data_iso, 
                    "data_formatada": data_formatada, 
                    "hora": hora
                })

        if len(opcoes) == 0:
            return {"response_message": f"{nome_usuario}, nossas agendas para {especialidade_pedida} estão lotadas nos próximos dias. Vou transferir para uma atendente verificar um encaixe para você! 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        self.memoria_atual['opcoes_horario'] = opcoes
        self.memoria_atual['medico_selecionado_id'] = medico.id
        self.memoria_atual['preco_informado'] = False 

        msg = f"✅ Ótimo, {nome_usuario} 😊\n\nTemos atendimento para *{especialidade_pedida}* com nossa equipe médica.\n\n"
        
        if len(opcoes) >= 2:
            msg += f"Os horários mais próximos que encontrei são na {opcoes[0]['dia_semana']} ({opcoes[0]['data_formatada']}), às {opcoes[0]['hora']} ou {opcoes[1]['hora']}.\n\n"
        else:
             msg += f"A última vaga mais próxima que encontrei é na {opcoes[0]['dia_semana']} ({opcoes[0]['data_formatada']}), às {opcoes[0]['hora']}.\n\n"
        
        msg += f"Qual desses horários ficaria melhor para você?"
        
        return {"response_message": msg, "new_state": 'agendamento_awaiting_slot_choice', "memory_data": self.memoria_atual}

    def _processar_escolha_horario(self, user_message: str) -> dict:
        msg_lower = user_message.lower()
        nome_usuario = self.memoria_atual.get('nome_usuario', 'Paciente')
        especialidade = self.memoria_atual.get('especialidade_indicada', 'consulta')
        
        # --- 1. INTERCEPTAÇÃO: PREÇO ---
        preco_informado = self.memoria_atual.get('preco_informado', False)
        
        if not preco_informado and any(palavra in msg_lower for palavra in ['valor', 'preço', 'preco', 'custa', 'quanto', 'pagamento', 'investimento']):
            self.memoria_atual['preco_informado'] = True 
            opcoes = self.memoria_atual.get('opcoes_horario', [])
            
            # Valor placeholder - idealmente viria do modelo Especialidade
            msg = f"✅ Claro, {nome_usuario} 😊\n\nO investimento para a consulta de {especialidade} é de R$ 350,00, podendo ser dividido em até 3x sem juros.\n\n"
            
            if len(opcoes) >= 2:
                msg += f"Para nossa agenda mais próxima, temos vagas na {opcoes[0]['dia_semana']} ({opcoes[0]['data_formatada']}), às {opcoes[0]['hora']} ou {opcoes[1]['hora']}.\n\n"
            elif len(opcoes) == 1:
                msg += f"Para nossa agenda mais próxima, temos uma vaga na {opcoes[0]['dia_semana']} ({opcoes[0]['data_formatada']}), às {opcoes[0]['hora']}.\n\n"
            msg += "Qual desses horários ficaria melhor para você?"
            
            return {"response_message": msg, "new_state": 'agendamento_awaiting_slot_choice', "memory_data": self.memoria_atual}

        # --- 2. CONTROLE DE INSISTÊNCIA E OBJEÇÕES ---
        ja_tentou_contornar = self.memoria_atual.get('tentativa_contorno_objecao', False)
        
        if not ja_tentou_contornar:
            if any(palavra in msg_lower for palavra in ['caro', 'condição', 'condicao', 'desconto', 'marido', 'espos', 'parceir', 'pensar', 'ver', 'depois']):
                self.memoria_atual['tentativa_contorno_objecao'] = True
                msg = f"Entendo perfeitamente, {nome_usuario} 😊\n\nO acompanhamento com a equipe de {especialidade} é muito importante para garantir a melhor conduta para a sua saúde.\n\nSe preferir, posso deixar um dos horários provisoriamente pré-reservado para você enquanto decide, assim você não corre o risco de perder a vaga.\n\n"
                
                opcoes = self.memoria_atual.get('opcoes_horario', [])
                if len(opcoes) >= 2:
                    msg += f"Temos {opcoes[0]['dia_semana']} às {opcoes[0]['hora']} ou {opcoes[1]['hora']}.\nQual deles você prefere que eu deixe reservado?"
                elif len(opcoes) == 1:
                    msg += f"Temos {opcoes[0]['dia_semana']} às {opcoes[0]['hora']}.\nPosso deixar esse pré-reservado para você?"
                return {"response_message": msg, "new_state": 'agendamento_awaiting_slot_choice', "memory_data": self.memoria_atual}

        # --- 3. FLUXO DE ESCOLHA DE HORÁRIO ---
        opcoes = self.memoria_atual.get('opcoes_horario', [])
        escolha = None
        
        if '1' in msg_lower or 'primeir' in msg_lower or (len(opcoes) > 0 and opcoes[0]['hora'] in msg_lower):
            escolha = opcoes[0]
        elif '2' in msg_lower or 'segund' in msg_lower or (len(opcoes) > 1 and opcoes[1]['hora'] in msg_lower):
            escolha = opcoes[1] if len(opcoes) > 1 else opcoes[0]
                
        if not escolha:
            return {"response_message": f"{nome_usuario}, por favor, me confirme qual horário prefere, ou digite *'não quero'* se preferir deixar para outra hora.", "new_state": 'agendamento_awaiting_slot_choice', "memory_data": self.memoria_atual}
            
        self.memoria_atual['horario_escolhido'] = escolha
        msg = f"Perfeito, {nome_usuario} 😊\n\nJá vou deixar pré-reservado para você {escolha['dia_semana']} ({escolha['data_formatada']}) às {escolha['hora']}.\n\nPoderia me informar seu nome completo e data de nascimento, por favor? (Ex: Maria Silva, 12/05/1994)"
        return {"response_message": msg, "new_state": 'aguardando_dados_pessoais', "memory_data": self.memoria_atual}

    def _processar_dados_pessoais(self, user_message: str) -> dict:
        msg_lower = user_message.lower()
        nome_usuario = self.memoria_atual.get('nome_usuario', 'Paciente')
        
        # --- INTERCEPTADOR: MUDANÇA DE DATA OU DÚVIDA SOBRE A AGENDA ---
        if any(palavra in msg_lower for palavra in ['dia', 'data', 'outro', 'mudar', 'horário', 'horario', 'teria', 'agenda', 'amanhã']):
            horario = self.memoria_atual.get('horario_escolhido', {})
            data_fmt = horario.get('data_formatada', 'escolhido')
            hora = horario.get('hora', '')
            
            msg = (f"{nome_usuario}, eu já deixei a sua vaga do dia {data_fmt} às {hora} pré-reservada no sistema para garantir! 😊\n\n"
                   f"Se precisarmos buscar uma data diferente, eu posso transferir você para uma de nossas atendentes verificar a agenda completa com calma.\n\n"
                   f"O que prefere: manter o horário atual (bastando digitar o seu nome e data de nascimento) ou falar com a recepção?")
            return {"response_message": msg, "new_state": 'aguardando_dados_pessoais', "memory_data": self.memoria_atual}

        # --- FLUXO NORMAL: Extrair data e nome ---
        match_data = re.search(r'(\d{2}[/-]\d{2}[/-]\d{2,4})', user_message)
        
        if not match_data:
            return {"response_message": "Não consegui identificar a data de nascimento. Pode digitar seu nome completo e a data (ex: 12/05/1994)?", "new_state": 'aguardando_dados_pessoais', "memory_data": self.memoria_atual}
            
        data_nasc_str = match_data.group(1).replace('-', '/')
        self.memoria_atual['data_nascimento_paciente'] = data_nasc_str
        
        nome = user_message.replace(match_data.group(1), '').strip()
        nome = re.sub(r'[^\w\s]', '', nome).strip()
        
        if len(nome.split()) < 2:
             nome = nome_usuario 
             
        self.memoria_atual['nome_completo_paciente'] = nome.title()
        nome_curto = nome.split()[0].title() if nome else nome_usuario
        
        msg = f"Prazer, {nome_curto} 😊\n\nPor último, qual é o seu melhor e-mail para enviarmos as orientações e a confirmação?"
        return {"response_message": msg, "new_state": 'aguardando_email_cadastro', "memory_data": self.memoria_atual}

    def _processar_email_e_finalizar(self, user_message: str) -> dict:
        nome_completo = self.memoria_atual.get('nome_completo_paciente', 'Paciente')
        nome_curto = nome_completo.split()[0].title()
        
        if '@' not in user_message: 
            return {"response_message": f"{nome_curto}, esse e-mail não parece válido. Por favor, digite novamente:", "new_state": 'aguardando_email_cadastro', "memory_data": self.memoria_atual}
        
        self.memoria_atual['email_usuario'] = user_message.lower().strip()
                
        # --- MONTAGEM E SALVAMENTO ---
        telefone = ''.join(filter(str.isdigit, self.session_id))
        data_nasc_str = self.memoria_atual.get('data_nascimento_paciente', '')
        
        try:
            dia, mes, ano = data_nasc_str.split('/')
            if len(ano) == 2: ano = "19" + ano if int(ano) > 25 else "20" + ano
            data_nascimento_db = f"{ano}-{mes}-{dia}"
        except Exception:
            data_nascimento_db = '1900-01-01'
        
        paciente, _ = Paciente.objects.get_or_create(telefone_celular=telefone, defaults={'nome_completo': nome_completo, 'email': self.memoria_atual['email_usuario'], 'data_nascimento': data_nascimento_db})
        paciente.nome_completo = nome_completo
        paciente.email = self.memoria_atual['email_usuario']
        if data_nascimento_db != '1900-01-01': paciente.data_nascimento = data_nascimento_db
        paciente.save()
            
        especialidade = self.memoria_atual.get('especialidade_indicada', 'Consulta Médica')
        medico_id = self.memoria_atual.get('medico_selecionado_id')
        medico = CustomUser.objects.filter(id=medico_id).first() if medico_id else CustomUser.objects.filter(cargo='medico', is_active=True).first()
        horario = self.memoria_atual['horario_escolhido']
        
        try:
            data_hora = make_aware(datetime.strptime(f"{horario['data_iso']} {horario['hora']}", "%Y-%m-%d %H:%M"))
            
            Agendamento.objects.create(
                paciente=paciente, 
                medico=medico, 
                tipo_agendamento='Consulta', 
                data_hora_inicio=data_hora, 
                data_hora_fim=data_hora + timedelta(minutes=15), 
                status='Agendado', 
                observacoes=f"Bot WhatsApp. Especialidade: {especialidade}."
            )
            
            msg_final = f"Tudo certo, {nome_curto} 😊\n\n"
            msg_final += f"Sua consulta de *{especialidade}* ficou reservada para *{horario['dia_semana']} ({horario['data_formatada']}) às {horario['hora']}*.\n\n"
            msg_final += f"📍 *Endereço da clínica*\n"
            msg_final += f"Rua Orense, 41 - Sala 512\nCentro - Diadema\n(próximo ao Shopping Praça da Moça e ao Quarteirão da Saúde)\n\n"
            msg_final += f"☑️ Pedimos apenas que chegue 15 minutos antes do horário para o preenchimento da ficha.\n\n"
            msg_final += f"A Clínica Limalé agradece a confiança. Será um prazer cuidar da sua saúde 🤍"
        
        except Exception as e:
            logger.error(f"Erro ao salvar consulta médica: {e}")
            from chatbot.bot_logic import notificar_recepcao_whatsapp
            notificar_recepcao_whatsapp(self.session_id, nome_curto)
            msg_final = f"{nome_curto}, ocorreu uma instabilidade na nossa agenda. Uma atendente confirmará o seu horário em instantes por aqui! 🤍"

        return {"response_message": msg_final, "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}