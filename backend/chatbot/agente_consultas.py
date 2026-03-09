# chatbot/agente_consultas.py

import logging
from datetime import datetime, timedelta, date
from django.utils.timezone import make_aware

from pacientes.models import Paciente
from agendamentos.models import Agendamento
from usuarios.models import CustomUser
# Se você tiver um model de Especialidade, importe-o aqui. 
# Caso contrário, usaremos o cargo/especialidade do CustomUser.

logger = logging.getLogger(__name__)

class AgenteConsultas:
    """
    Agente especialista em Consultas Médicas.
    Cruza a dor/especialidade do paciente com a agenda dos médicos disponíveis.
    """

    def __init__(self, session_id, memoria_atual):
        self.session_id = session_id
        self.memoria_atual = memoria_atual

    def processar(self, user_message: str, estado_atual: str) -> dict:
        """Roteador interno das fases de agendamento de consulta."""
        
        # ESCAPE: Se a pessoa quiser cancelar ou mudar de ideia
        if any(palavra in user_message.lower() for palavra in ['cancelar', 'não quero', 'deixa pra lá', 'exame', 'ultrassom']):
            return {
                "response_message": "Sem problemas! Como posso te ajudar hoje na clínica então?", 
                "new_state": 'ia_roteadora_livre', 
                "memory_data": self.memoria_atual
            }

        if estado_atual == 'agendamento_awaiting_specialty':
            return self._processar_especialidade(user_message)
            
        elif estado_atual == 'agendamento_awaiting_slot_choice':
            return self._processar_escolha_horario(user_message)
            
        elif estado_atual == 'aguardando_nome_cadastro':
            return self._processar_nome(user_message)
            
        elif estado_atual == 'aguardando_email_cadastro':
            return self._processar_email_e_finalizar(user_message)

        return {}

    def _processar_especialidade(self, user_message: str) -> dict:
        especialidade_pedida = user_message.strip().title()
        especialidades_atendidas = ['Ginecologista', 'Ginecologia', 'Obstetra', 'Obstetrícia', 'Pediatra', 'Pediatria', 'Cardiologista', 'Cardiologia', 'Clinico Geral', 'Clínico Geral']
        
        if not any(esp.lower() in especialidade_pedida.lower() for esp in especialidades_atendidas):
            return {"response_message": f"Poxa, não encontrei '{especialidade_pedida}' nas nossas agendas. Por favor, digite outra especialidade ou *'Falar com a recepção'*! 🤍", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria_atual}

        self.memoria_atual['especialidade_indicada'] = especialidade_pedida
        medico = CustomUser.objects.filter(cargo='medico', is_active=True).first()
        from django.utils import timezone
        
        def gerar_horarios(hora_inicio, hora_fim, intervalo=15):
            lista = []
            atual = datetime.strptime(hora_inicio, '%H:%M')
            fim = datetime.strptime(hora_fim, '%H:%M')
            while atual < fim:
                lista.append(atual.strftime('%H:%M'))
                atual += timedelta(minutes=intervalo)
            return lista

        # --- REGRAS DE CONSULTA DA CLÍNICA ---
        msg_lower = especialidade_pedida.lower()
        if 'pediatr' in msg_lower:
            regras_dias = {
                0: gerar_horarios('09:00', '12:00') + gerar_horarios('15:00', '17:00'), # Segunda
                1: gerar_horarios('14:00', '16:00'),                                    # Terça
                4: gerar_horarios('10:00', '12:00') + gerar_horarios('15:00', '17:00')  # Sexta
            }
        elif 'cardio' in msg_lower:
            regras_dias = {
                1: gerar_horarios('08:00', '12:00'), # Terça
                5: gerar_horarios('08:00', '11:00')  # Sábado
            }
        else:
            regras_dias = {0: gerar_horarios('08:00', '18:00'), 1: gerar_horarios('08:00', '18:00'), 2: gerar_horarios('08:00', '18:00'), 3: gerar_horarios('08:00', '18:00'), 4: gerar_horarios('08:00', '18:00')}

        hoje = date.today()
        agora = timezone.now()
        opcoes = []
        dias_pt = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']

        # Varre os próximos 15 dias buscando 2 horários
        for i in range(15):
            if len(opcoes) >= 2: break
            data_alvo = hoje + timedelta(days=i)
            dia_semana = data_alvo.weekday()
            
            if dia_semana in regras_dias:
                for h in regras_dias[dia_semana]:
                    if len(opcoes) >= 2: break
                    
                    dt_alvo_inicio = make_aware(datetime.strptime(f"{data_alvo.strftime('%Y-%m-%d')} {h}", "%Y-%m-%d %H:%M"))
                    dt_alvo_fim = dt_alvo_inicio + timedelta(minutes=15)
                    
                    if dt_alvo_inicio < agora: continue
                        
                    ocupado = Agendamento.objects.filter(
                        data_hora_inicio__lt=dt_alvo_fim, 
                        data_hora_fim__gt=dt_alvo_inicio, 
                        status__in=['Agendado', 'Confirmado', 'Em Atendimento', 'Laudando', 'Realizado']
                    ).exists()
                    
                    if not ocupado:
                        opcoes.append({"opcao": str(len(opcoes) + 1), "dia_semana": dias_pt[dia_semana], "data_iso": data_alvo.strftime('%Y-%m-%d'), "data_formatada": data_alvo.strftime('%d/%m/%Y'), "hora": h})

        if not opcoes:
            return {"response_message": f"Poxa, nossas agendas para {especialidade_pedida} estão lotadas nos próximos dias. Vou transferir para uma atendente verificar um encaixe para você! 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}

        self.memoria_atual['opcoes_horario'] = opcoes
        msg = f"Ótimo! Temos atendimento para *{especialidade_pedida}* com nossa equipe médica.\n\nAqui estão os horários mais próximos que encontrei:\n\n"
        for op in opcoes: msg += f"{op['opcao']}️⃣ Dia {op['data_formatada']} ({op['dia_semana']}) às {op['hora']}\n"
        msg += f"\nQual dessas opções fica melhor para você? (Responda 1 ou 2)"
        
        return {"response_message": msg, "new_state": 'agendamento_awaiting_slot_choice', "memory_data": self.memoria_atual}

    def _processar_escolha_horario(self, user_message: str) -> dict:
        if '1' in user_message or 'primeir' in user_message.lower():
            self.memoria_atual['horario_escolhido'] = self.memoria_atual['opcoes_horario'][0]
        elif '2' in user_message or 'segund' in user_message.lower():
            if len(self.memoria_atual['opcoes_horario']) > 1:
                self.memoria_atual['horario_escolhido'] = self.memoria_atual['opcoes_horario'][1]
        else:
            return {"response_message": "Por favor, responda com o número 1 ou 2 para escolher o melhor horário.", "new_state": 'agendamento_awaiting_slot_choice', "memory_data": self.memoria_atual}

        # Se a recepcionista já pegou o nome lá no início, pulamos a etapa de perguntar o nome de novo!
        nome_ja_cadastrado = self.memoria_atual.get('nome_usuario')
        if nome_ja_cadastrado:
            self.memoria_atual['nome_completo'] = nome_ja_cadastrado
            return {
                "response_message": f"Excelente escolha, {nome_ja_cadastrado}! Para finalizarmos e eu te mandar a confirmação, qual é o seu melhor e-mail?", 
                "new_state": 'aguardando_email_cadastro', 
                "memory_data": self.memoria_atual
            }
        else:
            return {
                "response_message": "Excelente escolha! Para registrarmos a sua consulta, qual é o seu nome completo?", 
                "new_state": 'aguardando_nome_cadastro', 
                "memory_data": self.memoria_atual
            }

    def _processar_nome(self, user_message: str) -> dict:
        if len(user_message.split()) < 2:
            return {"response_message": "Por favor, digite seu nome e sobrenome para o prontuário:", "new_state": 'aguardando_nome_cadastro', "memory_data": self.memoria_atual}
        
        self.memoria_atual['nome_completo'] = user_message.title()
        nome_curto = self.memoria_atual['nome_completo'].split()[0]
        
        return {"response_message": f"Prazer, {nome_curto}! E qual é o seu melhor e-mail para enviarmos a confirmação?", "new_state": 'aguardando_email_cadastro', "memory_data": self.memoria_atual}

    def _processar_email_e_finalizar(self, user_message: str) -> dict:
        if '@' not in user_message:
            return {"response_message": "Esse e-mail não parece válido. Por favor, digite novamente:", "new_state": 'aguardando_email_cadastro', "memory_data": self.memoria_atual}
        
        self.memoria_atual['email_usuario'] = user_message.lower().strip()
        telefone = ''.join(filter(str.isdigit, self.session_id))
        nome_completo = self.memoria_atual.get('nome_completo', self.memoria_atual.get('nome_usuario', 'Paciente'))
        especialidade = self.memoria_atual.get('especialidade_indicada', 'Consulta Médica')
        
        # Integração Banco de Dados
        paciente, criado = Paciente.objects.get_or_create(
            telefone_celular=telefone,
            defaults={'nome_completo': nome_completo, 'email': self.memoria_atual['email_usuario'], 'data_nascimento': '1900-01-01'}
        )
        if not criado:
            paciente.nome_completo = nome_completo
            paciente.email = self.memoria_atual['email_usuario']
            paciente.save()
        
        medico = CustomUser.objects.filter(cargo='medico', is_active=True).first()
        horario = self.memoria_atual['horario_escolhido']
        data_hora_inicio = datetime.strptime(f"{horario['data_iso']} {horario['hora']}", "%Y-%m-%d %H:%M")
        
        try:
            data_hora_inicio_aware = make_aware(data_hora_inicio)
            # SALVANDO A CONSULTA: Isso dispara o signals.py e move o CRM para F2!
            Agendamento.objects.create(
                paciente=paciente, medico=medico, tipo_agendamento='Consulta',
                data_hora_inicio=data_hora_inicio_aware, data_hora_fim=data_hora_inicio_aware + timedelta(minutes=30),
                status='Agendado', observacoes=f"Agendado via Bot WhatsApp. Especialidade: {especialidade}."
            )
            nome_curto = nome_completo.split()[0]
            msg_final = (f"Tudo certo, {nome_curto}! 🎉\n\n"
                         f"Sua consulta de *{especialidade}* está confirmada para:\n"
                         f"📅 *Dia {horario['data']} às {horario['hora']}*\n\n"
                         f"Um dia antes, enviaremos um lembrete. Agradecemos por escolher a Clínica Limalé 🤍!")
        except Exception as e:
            logger.error(f"Erro ao salvar agendamento de consulta via bot: {e}")
            msg_final = "Ocorreu uma instabilidade na nossa agenda. Uma atendente confirmará o horário com você em instantes! 🤍"

        return {"response_message": msg_final, "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}