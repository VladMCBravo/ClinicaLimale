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
        
        # Aqui, na vida real, você buscaria no banco se a clínica atende essa especialidade.
        # Exemplo simples:
        especialidades_atendidas = ['Ginecologista', 'Ginecologia', 'Obstetra', 'Obstetrícia', 'Pediatra', 'Pediatria', 'Cardiologista', 'Cardiologia', 'Clinico Geral', 'Clínico Geral']
        
        tem_especialidade = any(esp.lower() in especialidade_pedida.lower() for esp in especialidades_atendidas)
        
        if not tem_especialidade:
            # CORREÇÃO: Mantém no mesmo estado e dá a opção clara de chamar humano sem quebrar o fluxo
            return {
                "response_message": f"Poxa, não encontrei '{especialidade_pedida}' nas nossas agendas abertas.\n\nPor favor, digite outra especialidade ou digite *'Falar com a recepção'* para eu transferir você para uma de nossas atendentes! 🤍",
                "new_state": "agendamento_awaiting_specialty", 
                "memory_data": self.memoria_atual
            }

        self.memoria_atual['especialidade_indicada'] = especialidade_pedida
        
        # --- BUSCA DE AGENDA MOCKADA PARA TESTE (Igual ao de exames) ---
        medico = CustomUser.objects.filter(cargo='medico', is_active=True).first()
        hoje = date.today()
        
        # Procura horários para os próximos 2 dias úteis
        dia1 = hoje + timedelta(days=1 if hoje.weekday() < 4 else 3) 
        dia2 = dia1 + timedelta(days=1)

        horarios_dia1 = ['09:00', '10:30', '14:00']
        horarios_dia2 = ['11:00', '15:30', '16:00']

        opcoes = []
        opcoes.append({
            "opcao": "1", "dia_semana": "Amanhã" if dia1 == hoje + timedelta(days=1) else "Próximo dia útil",
            "data_iso": dia1.strftime('%Y-%m-%d'), "data": dia1.strftime('%d/%m/%Y'), "hora": horarios_dia1[0]
        })
        opcoes.append({
            "opcao": "2", "dia_semana": "Outra opção",
            "data_iso": dia2.strftime('%Y-%m-%d'), "data": dia2.strftime('%d/%m/%Y'), "hora": horarios_dia2[0]
        })

        self.memoria_atual['opcoes_horario'] = opcoes
        
        msg = (f"Ótimo! Temos atendimento para *{especialidade_pedida}* com nossa equipe médica.\n\n"
               f"Aqui estão os horários mais próximos que encontrei:\n")
        
        for op in opcoes:
            msg += f"{op['opcao']}️⃣ {op['data']} às {op['hora']}\n"
            
        msg += f"\nQual dessas opções fica melhor para você? (Digite 1 ou 2)"
        
        return {
            "response_message": msg, 
            "new_state": 'agendamento_awaiting_slot_choice', 
            "memory_data": self.memoria_atual
        }

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