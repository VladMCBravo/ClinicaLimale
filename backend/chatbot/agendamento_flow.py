# chatbot/agendamento_flow.py - VERSÃO FINAL E LIMPA

import re
import json
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone

from .validators import ChatbotValidators
from usuarios.models import Especialidade, CustomUser
from pacientes.models import Paciente
from agendamentos.serializers import AgendamentoWriteSerializer
from agendamentos.services import (
    buscar_proximo_horario_disponivel,
    criar_agendamento_e_pagamento_pendente,
    listar_agendamentos_futuros,
    cancelar_agendamento_service
)

logger = logging.getLogger(__name__)

class AgendamentoManager:
    def __init__(self, session_id, memoria, base_url, **kwargs):
        self.session_id = session_id
        self.memoria = memoria
        self.base_url = base_url.rstrip('/')
        self.validators = ChatbotValidators()

    def _get_especialidades_from_db(self):
        return list(Especialidade.objects.all().order_by('nome').values('id', 'nome'))

    def _get_medicos_from_db(self, especialidade_id):
        return list(CustomUser.objects.filter(cargo='medico', especialidades__id=especialidade_id).values('id', 'first_name', 'last_name'))

    def processar(self, resposta_usuario, estado_atual):
        handlers = {
            'agendamento_inicio': self.handle_inicio,
            'agendamento_awaiting_type': self.handle_awaiting_type,
            'agendamento_awaiting_modality': self.handle_awaiting_modality,
            'agendamento_awaiting_specialty': self.handle_awaiting_specialty,
            'agendamento_awaiting_slot_choice': self.handle_awaiting_slot_choice,
            'agendamento_awaiting_slot_confirmation': self.handle_awaiting_slot_confirmation,
            'cadastro_awaiting_cpf': self.handle_cadastro_awaiting_cpf,
            'cadastro_awaiting_missing_field': self.handle_cadastro_awaiting_missing_field,
            'agendamento_awaiting_payment_choice': self.handle_awaiting_payment_choice,
            'agendamento_awaiting_installments': self.handle_awaiting_installments,
            'agendamento_awaiting_confirmation': self.handle_awaiting_confirmation,
            'cancelamento_inicio': self.handle_cancelamento_inicio,
            'cancelamento_awaiting_cpf': self.handle_cancelamento_awaiting_cpf,
            'cancelamento_awaiting_choice': self.handle_cancelamento_awaiting_choice,
            'cancelamento_awaiting_confirmation': self.handle_cancelamento_awaiting_confirmation,
        }
        handler = handlers.get(estado_atual, self.handle_fallback)
        return handler(resposta_usuario)

    def handle_fallback(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        return {"response_message": f"Desculpe, {nome_usuario}, me perdi. Vamos recomeçar?", "new_state": "identificando_demanda", "memory_data": {'nome_usuario': nome_usuario}}

    def handle_inicio(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        self.memoria.clear()
        self.memoria['nome_usuario'] = nome_usuario
        return {"response_message": f"Perfeito, {nome_usuario}! Nosso time está pronto para te atender. O agendamento será para uma *Consulta* ou *Procedimento*?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}

    def handle_awaiting_type(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        if 'consulta' in resposta_usuario.lower():
            self.memoria['tipo_agendamento'] = 'Consulta'
            return {"response_message": "Ótimo. E você prefere o conforto da *Telemedicina* ou o atendimento *Presencial* em nossa clínica?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        elif 'procedimento' in resposta_usuario.lower():
            return {"response_message": "No momento, agendamentos de procedimentos são feitos com nossa equipe. Posso te ajudar a agendar uma consulta de avaliação?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}
        return {"response_message": f"Não entendi, {nome_usuario}. É 'Consulta' ou 'Procedimento'?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}

    def handle_awaiting_modality(self, resposta_usuario):
        modalidade = "".join(resposta_usuario.strip().split()).capitalize()
        if modalidade not in ['Presencial', 'Telemedicina']:
            return {"response_message": "Modalidade inválida. É *Presencial* ou *Telemedicina*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}

        self.memoria['modalidade'] = modalidade
        especialidades = self._get_especialidades_from_db()
        self.memoria['lista_especialidades'] = especialidades
        nomes_especialidades = '\n'.join([f"• {esp['nome']}" for esp in especialidades])
        return {"response_message": f"Perfeito. Qual das nossas especialidades você deseja?\n\n{nomes_especialidades}", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

    def handle_awaiting_specialty(self, resposta_usuario):
        especialidade_escolhida = next((esp for esp in self.memoria.get('lista_especialidades', []) if resposta_usuario.lower() in esp['nome'].lower()), None)
        if not especialidade_escolhida:
            return {"response_message": "Não encontrei essa especialidade. Pode tentar de novo?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

        self.memoria.update({'especialidade_id': especialidade_escolhida['id'], 'especialidade_nome': especialidade_escolhida['nome']})
        return self._iniciar_busca_de_horarios(especialidade_escolhida['id'], especialidade_escolhida['nome'])

    def _iniciar_busca_de_horarios(self, especialidade_id, especialidade_nome):
        medicos = self._get_medicos_from_db(especialidade_id=especialidade_id)
        if not medicos:
            return {"response_message": f"Desculpe, não encontrei médicos para {especialidade_nome} no momento.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}

        medico = medicos[0]
        self.memoria.update({'medico_id': medico['id'], 'medico_nome': f"{medico['first_name']} {medico['last_name']}"})
        horarios = buscar_proximo_horario_disponivel(medico_id=medico['id'])

        if not horarios or not horarios.get('horarios_disponiveis'):
            medico_nome = self.memoria.get('medico_nome', 'médico')
            return {"response_message": f"Infelizmente, não há horários disponíveis para Dr(a). {medico_nome} nos próximos dias.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}

        self.memoria['horarios_ofertados'] = horarios
        try:
            from dateutil.parser import parse
            data_formatada = parse(horarios['data']).strftime('%d/%m/%Y')
        except (ValueError, TypeError):
            data_formatada = horarios.get('data', 'Data inválida')
        
        horarios_formatados = [f"• *{h}*" for h in horarios['horarios_disponiveis'][:5]]
        medico_nome_completo = f"Dr(a). {self.memoria['medico_nome']}"
        mensagem = (f"Excelente escolha! Cuidar da saúde é fundamental. Encontrei estes horários com {medico_nome_completo}, que é uma referência na área, para o dia *{data_formatada}*:\n\n" + "\n".join(horarios_formatados) + "\n\nQual deles prefere?")
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

    def handle_awaiting_slot_choice(self, resposta_usuario):
        horario_str = resposta_usuario.strip()
        horarios_ofertados = self.memoria.get('horarios_ofertados', {})

        if horario_str not in horarios_ofertados.get('horarios_disponiveis', []):
            return {"response_message": f"Hum, não encontrei '{horario_str}'. Por favor, escolha um dos horários da lista.", "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
        try:
            from dateutil.parser import parse
            data_obj = parse(horarios_ofertados['data']).date()
            hora_obj = parse(horario_str).time()
            self.memoria['data_hora_inicio'] = timezone.make_aware(datetime.combine(data_obj, hora_obj)).isoformat()
        except (ValueError, TypeError) as e:
            logger.error(f"Erro ao fazer parse da data/hora: {e}")
            return {"response_message": "Erro ao processar horário. Tente novamente.", "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

        return {"response_message": f"Perfeito! Seu horário com Dr(a). {self.memoria.get('medico_nome')} para *{data_obj.strftime('%d/%m/%Y')} às {horario_str}* está pré-reservado. Confirma? (Sim/Não)", "new_state": "agendamento_awaiting_slot_confirmation", "memory_data": self.memoria}

    def handle_awaiting_slot_confirmation(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        if 'sim' not in resposta_usuario.lower():
            self.memoria.pop('data_hora_inicio', None)
            return {"response_message": f"Ok, {nome_usuario}, o pré-agendamento foi cancelado.", "new_state": "identificando_demanda", "memory_data": self.memoria}

        mensagem = "Ótimo! Para agilizar e garantir a segurança do seu agendamento, por favor, me informe o seu *CPF* (apenas os números). Assim, posso verificar se você já tem um cadastro conosco."
        return {"response_message": mensagem, "new_state": "cadastro_awaiting_cpf", "memory_data": self.memoria}

    def handle_cadastro_awaiting_cpf(self, resposta_usuario):
        is_valid, mensagem_erro, cpf_limpo = self.validators.validar_cpf_completo(resposta_usuario)
        if not is_valid:
            return {"response_message": f"O CPF parece inválido. {mensagem_erro}. Tente novamente.", "new_state": "cadastro_awaiting_cpf", "memory_data": self.memoria}

        paciente = Paciente.objects.filter(cpf=cpf_limpo).first()
        if paciente:
            self.memoria.update({
                'cpf': paciente.cpf, 'nome_completo': paciente.nome_completo,
                'data_nascimento': paciente.data_nascimento.strftime('%d/%m/%Y') if paciente.data_nascimento else '',
                'telefone_celular': paciente.telefone_celular, 'email': paciente.email
            })
            primeiro_nome = paciente.nome_completo.split(' ')[0]
            mensagem = f"Que ótimo te ver de volta, {primeiro_nome}! Já encontrei seu cadastro. Estamos prontos para ir para o pagamento."
            return {"response_message": mensagem, "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}
        else:
            self.memoria['cpf'] = cpf_limpo
            mensagem = "Entendido. Para seu primeiro agendamento, preciso de algumas informações rápidas. Vamos começar pelo seu *nome completo*, por favor."
            self.memoria['dados_paciente'] = {'cpf': cpf_limpo}
            self.memoria['missing_field'] = 'nome_completo'
            return {"response_message": mensagem, "new_state": "cadastro_awaiting_missing_field", "memory_data": self.memoria}

    def handle_cadastro_awaiting_missing_field(self, resposta_usuario):
        campo_faltante = self.memoria.get('missing_field')
        if campo_faltante:
            self.memoria['dados_paciente'][campo_faltante] = resposta_usuario.strip()
        return self._validar_e_coletar_proximo_campo()

    def _validar_e_coletar_proximo_campo(self):
        campos_a_validar = {
            'nome_completo': self.validators.validar_nome_completo,
            'data_nascimento': self.validators.validar_data_nascimento_avancada,
            'cpf': self.validators.validar_cpf_completo,
            'telefone_celular': self.validators.validar_telefone_brasileiro,
            'email': self.validators.validar_email_avancado,
        }
        dados_paciente = self.memoria.get('dados_paciente', {})
        for campo, funcao_validacao in campos_a_validar.items():
            valor = dados_paciente.get(campo, "")
            is_valid, mensagem_erro, _ = funcao_validacao(valor)
            if not is_valid:
                mensagens_pedido = {
                    'nome_completo': "Qual o *nome completo* do paciente?",
                    'data_nascimento': f"Hmm, a data parece inválida. {mensagem_erro}. Qual a data correta (DD/MM/AAAA)?",
                    'cpf': "Já tenho um CPF, mas parece inválido. Por favor, digite o *CPF* correto (11 números).",
                    'telefone_celular': f"O telefone parece inválido. {mensagem_erro}. Qual o *celular com DDD*?",
                    'email': f"O e-mail parece inválido. {mensagem_erro}. Qual o *e-mail* correto?",
                }
                self.memoria['missing_field'] = campo
                return {"response_message": mensagens_pedido[campo], "new_state": "cadastro_awaiting_missing_field", "memory_data": self.memoria}

        self.memoria.update(dados_paciente)
        self.memoria.pop('missing_field', None)
        self.memoria.pop('dados_paciente', None)
        primeiro_nome = self.memoria['nome_completo'].split(' ')[0]
        mensagem = (f"Excelente, {primeiro_nome}! Recebi seus dados.\n\nComo prefere pagar? 💳\n\n1️⃣ *PIX* (5% de desconto)\n2️⃣ *Cartão de Crédito* (até 3x sem juros)")
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}

    # As funções de pagamento, confirmação final e cancelamento podem ser coladas aqui sem alterações
    # ...