# chatbot/agendamento_flow.py

# --- SEÇÃO DE IMPORTAÇÕES ---
import os
import requests
import re
from datetime import datetime, timedelta
import json
from django.utils import timezone

# --- SEÇÃO DE IMPORTAÇÕES DOS SEUS APPS DJANGO ---
from usuarios.models import Especialidade, CustomUser
from faturamento.models import Procedimento
from agendamentos.services import buscar_proximo_horario_disponivel, buscar_proximo_horario_procedimento
from pacientes.models import Paciente
from agendamentos.serializers import AgendamentoWriteSerializer
from agendamentos.services import criar_agendamento_e_pagamento_pendente


class AgendamentoManager:
    def __init__(self, session_id, memoria, base_url):
        self.session_id = session_id
        self.memoria = memoria
        self.base_url = base_url.rstrip('/')
        self.api_key = os.getenv('API_KEY_CHATBOT')
        self.headers = {'Api-Key': self.api_key}

    # --- MÉTODOS AUXILIARES DE BUSCA NO BANCO ---
    def _get_especialidades_from_db(self):
        return list(Especialidade.objects.all().values('id', 'nome'))
            
    def _get_medicos_from_db(self, especialidade_id):
        return list(CustomUser.objects.filter(cargo='medico', especialidades__id=especialidade_id).values('id', 'first_name', 'last_name'))
    
    def _get_procedimentos_from_db(self): # <<-- NOVO MÉTODO AUXILIAR
        return list(Procedimento.objects.filter(ativo=True, valor_particular__gt=0).values('id', 'descricao'))

    # --- ROTEADOR PRINCIPAL ---
    def processar(self, resposta_usuario, estado_atual):
        handlers = {
            'agendamento_inicio': self.handle_inicio,
            'agendamento_awaiting_type': self.handle_awaiting_type,
            'agendamento_awaiting_procedure': self.handle_awaiting_procedure, # <<-- NOVO ESTADO
            'agendamento_awaiting_modality': self.handle_awaiting_modality,
            'agendamento_awaiting_specialty': self.handle_awaiting_specialty,
            'agendamento_awaiting_slot_choice': self.handle_awaiting_slot_choice,
            'agendamento_awaiting_cpf': self.handle_awaiting_cpf,
            'agendamento_awaiting_new_patient_nome': self.handle_awaiting_new_patient_nome,
            'agendamento_awaiting_new_patient_email': self.handle_awaiting_new_patient_email,
            'agendamento_awaiting_confirmation': self.handle_awaiting_confirmation,
        }
        handler = handlers.get(estado_atual, self.handle_fallback)
        return handler(resposta_usuario)

    # --- HANDLERS DO FLUXO DE CONVERSA ---
    def handle_fallback(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        return { "response_message": "Desculpe, me perdi. Vamos recomeçar.", "new_state": "inicio", "memory_data": {'nome_usuario': nome_usuario} }
        
    def handle_inicio(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', 'tudo bem')
        self.memoria.clear() 
        self.memoria['nome_usuario'] = nome_usuario
        return { "response_message": f"Vamos lá, {nome_usuario}! Você gostaria de agendar uma *Consulta* ou um *Procedimento* (exames)?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria }

    def handle_awaiting_type(self, resposta_usuario):
        escolha = resposta_usuario.lower()
        if 'consulta' in escolha:
            self.memoria['tipo_agendamento'] = 'Consulta'
            return { "response_message": "Entendido. O atendimento será *Presencial* ou por *Telemedicina*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria }
        elif 'procedimento' in escolha or 'exame' in escolha: # <<-- LÓGICA ATUALIZADA
            self.memoria['tipo_agendamento'] = 'Procedimento'
            procedimentos = self._get_procedimentos_from_db()
            if not procedimentos:
                return {"response_message": "Desculpe, não encontrei procedimentos disponíveis para agendamento online no momento.", "new_state": "inicio", "memory_data": self.memoria}
            
            self.memoria['lista_procedimentos'] = procedimentos
            nomes_procedimentos = '\n'.join([f"• {proc['descricao']}" for proc in procedimentos])
            return { "response_message": f"Certo, temos os seguintes procedimentos:\n\n{nomes_procedimentos}\n\nQual deles você deseja agendar?", "new_state": "agendamento_awaiting_procedure", "memory_data": self.memoria }
        else:
            return { "response_message": "Não entendi. Por favor, diga 'Consulta' ou 'Procedimento'.", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria }

    def handle_awaiting_procedure(self, resposta_usuario): # <<-- NOVO HANDLER
        procedimento_escolhido = next((proc for proc in self.memoria.get('lista_procedimentos', []) if resposta_usuario.lower() in proc['descricao'].lower()), None)
        if not procedimento_escolhido:
            return {"response_message": "Não encontrei esse procedimento na lista. Por favor, digite um nome válido.", "new_state": "agendamento_awaiting_procedure", "memory_data": self.memoria}

        self.memoria.update({'procedimento_id': procedimento_escolhido['id'], 'procedimento_nome': procedimento_escolhido['descricao']})
        
        horarios = buscar_proximo_horario_procedimento(procedimento_id=procedimento_escolhido['id'])
        if not horarios or not horarios.get('horarios_disponiveis'):
            return {"response_message": f"Infelizmente, não há horários disponíveis para '{procedimento_escolhido['descricao']}' nos próximos 90 dias.", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}

        self.memoria['horarios_ofertados'] = horarios
        data_formatada = datetime.strptime(horarios['data'], '%Y-%m-%d').strftime('%d/%m/%Y')
        horarios_str = ", ".join(horarios['horarios_disponiveis'])
        
        mensagem = f"Encontrei os seguintes horários para *{procedimento_escolhido['descricao']}* no dia *{data_formatada}*:\n\n*{horarios_str}*\n\nQual horário você prefere?"
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

    def handle_awaiting_modality(self, resposta_usuario):
        # ... (código existente sem alterações)
        modalidade = "".join(resposta_usuario.strip().split()).capitalize()
        if modalidade not in ['Presencial', 'Telemedicina']:
            return {"response_message": "Modalidade inválida...", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        self.memoria['modalidade'] = modalidade
        especialidades = self._get_especialidades_from_db()
        if not especialidades:
            return {"response_message": "Desculpe, problemas para carregar especialidades...", "new_state": "inicio", "memory_data": self.memoria}
        self.memoria['lista_especialidades'] = especialidades
        nomes_especialidades = '\n'.join([f"• {esp['nome']}" for esp in especialidades])
        return {"response_message": f"Perfeito. Temos estas especialidades:\n\n{nomes_especialidades}\n\nQual delas você deseja?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

    def handle_awaiting_specialty(self, resposta_usuario):
        # ... (código existente sem alterações)
        especialidade_escolhida = next((esp for esp in self.memoria.get('lista_especialidades', []) if resposta_usuario.lower() in esp['nome'].lower() or esp['nome'].lower() in resposta_usuario.lower()), None)
        if not especialidade_escolhida:
            return {"response_message": "Não encontrei essa especialidade...", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}
        self.memoria.update({'especialidade_id': especialidade_escolhida['id'], 'especialidade_nome': especialidade_escolhida['nome']})
        medicos = self._get_medicos_from_db(especialidade_id=especialidade_escolhida['id'])
        if not medicos:
            return {"response_message": f"Não encontrei médicos para {especialidade_escolhida['nome']}.", "new_state": "inicio", "memory_data": self.memoria}
        medico = medicos[0]
        self.memoria.update({'medico_id': medico['id'], 'medico_nome': f"{medico['first_name']} {medico['last_name']}"})
        horarios = buscar_proximo_horario_disponivel(medico_id=medico['id'])
        if not horarios or not horarios.get('horarios_disponiveis'):
            return {"response_message": f"Infelizmente, não há horários para Dr(a). {self.memoria['medico_nome']}.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        self.memoria['horarios_ofertados'] = horarios
        data_formatada = datetime.strptime(horarios['data'], '%Y-%m-%d').strftime('%d/%m/%Y')
        horarios_str = ", ".join(horarios['horarios_disponiveis'])
        mensagem = f"Ótimo! Para Dr(a). *{self.memoria['medico_nome']}*, encontrei os horários no dia *{data_formatada}*:\n\n*{horarios_str}*\n\nQual horário você prefere?"
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
    
    def handle_awaiting_slot_choice(self, resposta_usuario):
        # ... (código existente sem alterações)
        try:
            horario_escolhido_str = datetime.strptime(resposta_usuario.strip(), '%H:%M').strftime('%H:%M')
        except ValueError:
            horario_escolhido_str = resposta_usuario.strip()
        horarios_ofertados = self.memoria.get('horarios_ofertados', {})
        lista_horarios_validos = horarios_ofertados.get('horarios_disponiveis', [])
        if horario_escolhido_str not in lista_horarios_validos:
            return {"response_message": "Hum, não encontrei o horário na lista...", "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
        self.memoria['data_hora_inicio'] = f"{horarios_ofertados['data']}T{horario_escolhido_str}"
        return {"response_message": "Perfeito! Para confirmar, informe seu *CPF*.", "new_state": "agendamento_awaiting_cpf", "memory_data": self.memoria}
    
    def handle_awaiting_cpf(self, resposta_usuario):
        # ... (código existente sem alterações)
        cpf = re.sub(r'\D', '', resposta_usuario)
        if len(cpf) != 11:
            return {"response_message": "CPF inválido...", "new_state": "agendamento_awaiting_cpf", "memory_data": self.memoria}
        self.memoria['cpf'] = cpf
        paciente_existe = Paciente.objects.filter(cpf=cpf).exists()
        if paciente_existe:
            paciente = Paciente.objects.get(cpf=cpf)
            nome_paciente = paciente.nome_completo.split(' ')[0]
            self.memoria['nome_usuario'] = nome_paciente
            mensagem = f"Olá, {nome_paciente}! Encontrei seu cadastro. Vamos finalizar."
            return self.handle_awaiting_confirmation(mensagem)
        else:
            return {"response_message": "Vi que você é novo por aqui! Qual seu nome completo?", "new_state": "agendamento_awaiting_new_patient_nome", "memory_data": self.memoria}

    def handle_awaiting_new_patient_nome(self, resposta_usuario):
        # ... (código existente sem alterações)
        self.memoria['nome_completo'] = resposta_usuario.strip().title()
        return {"response_message": "Obrigado. Agora, seu melhor *e-mail*.", "new_state": "agendamento_awaiting_new_patient_email", "memory_data": self.memoria}

    def handle_awaiting_new_patient_email(self, resposta_usuario):
        # ... (código existente sem alterações)
        email = resposta_usuario.strip().lower()
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return {"response_message": "E-mail inválido...", "new_state": "agendamento_awaiting_new_patient_email", "memory_data": self.memoria}
        self.memoria['email'] = email
        return self.handle_awaiting_confirmation("cadastro_concluido")
    
    def handle_awaiting_confirmation(self, resposta_usuario):
        try:
            paciente, created = Paciente.objects.get_or_create(
                cpf=self.memoria.get('cpf'),
                defaults={'nome_completo': self.memoria.get('nome_completo', ''), 'email': self.memoria.get('email', '')}
            )

            dados_agendamento = {
                'paciente': paciente.id,
                'data_hora_inicio': self.memoria.get('data_hora_inicio'),
                'status': 'Agendado',
                'tipo_agendamento': self.memoria.get('tipo_agendamento'),
                'tipo_atendimento': 'Particular',
            }

            if self.memoria.get('tipo_agendamento') == 'Consulta':
                dados_agendamento.update({
                    'data_hora_fim': datetime.fromisoformat(self.memoria.get('data_hora_inicio')) + timedelta(minutes=50),
                    'especialidade': self.memoria.get('especialidade_id'),
                    'medico': self.memoria.get('medico_id'),
                    'modalidade': self.memoria.get('modalidade'),
                })
            elif self.memoria.get('tipo_agendamento') == 'Procedimento':
                dados_agendamento.update({
                    'data_hora_fim': datetime.fromisoformat(self.memoria.get('data_hora_inicio')) + timedelta(minutes=60), # Duração de 60 min
                    'procedimento': self.memoria.get('procedimento_id'),
                    'modalidade': 'Presencial',
                })

            serializer = AgendamentoWriteSerializer(data=dados_agendamento)
            if not serializer.is_valid():
                error_messages = json.dumps(serializer.errors)
                return {"response_message": f"Erro ao validar os dados: {error_messages}", "new_state": "inicio", "memory_data": self.memoria}

            agendamento = serializer.save()
            usuario_servico = CustomUser.objects.filter(is_superuser=True).first()
            criar_agendamento_e_pagamento_pendente(agendamento, usuario_servico, initiated_by_chatbot=True)
            agendamento.refresh_from_db()

            pagamento = agendamento.pagamento
            resposta_final = f"Perfeito! Seu agendamento (ID: {agendamento.id}) foi pré-realizado. Para confirmar, realize o pagamento.\n\n"
            if hasattr(pagamento, 'pix_copia_e_cola') and pagamento.pix_copia_e_cola:
                resposta_final += f"PIX Copia e Cola:\n`{pagamento.pix_copia_e_cola}`"
            
            return {"response_message": resposta_final, "new_state": "inicio", "memory_data": {'nome_usuario': self.memoria.get('nome_usuario')}}
        except Exception as e:
            return {"response_message": f"Desculpe, ocorreu um erro inesperado: {str(e)}", "new_state": "inicio", "memory_data": self.memoria}