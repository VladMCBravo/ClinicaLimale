# chatbot/agendamento_flow.py - VERSÃO MÍNIMA E ESTÁVEL

import re
from datetime import datetime, timedelta
import json
from django.utils import timezone
from decimal import Decimal
import logging

from usuarios.models import Especialidade, CustomUser
from faturamento.models import Procedimento
from agendamentos.services import buscar_proximo_horario_disponivel, criar_agendamento_e_pagamento_pendente
from pacientes.models import Paciente
from agendamentos.serializers import AgendamentoWriteSerializer

# --- FUNÇÕES DE VALIDAÇÃO ---
def validar_cpf_formato(cpf_str: str) -> bool:
    if not isinstance(cpf_str, str): return False
    return len(re.sub(r'\D', '', cpf_str)) == 11

def validar_telefone_formato(tel_str: str) -> bool:
    if not isinstance(tel_str, str): return False
    numeros = re.sub(r'\D', '', tel_str)
    if numeros.startswith('55'): numeros = numeros[2:]
    return len(numeros) in [10, 11]

def validar_data_nascimento_formato(data_str: str) -> bool:
    if not isinstance(data_str, str): return False
    try:
        return datetime.strptime(data_str.strip(), '%d/%m/%Y').date() < datetime.now().date()
    except ValueError:
        return False

def validar_email_formato(email_str: str) -> bool:
    if not isinstance(email_str, str): return False
    return bool(re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email_str.strip()))

# --- CLASSE DA MÁQUINA DE ESTADOS ---
class AgendamentoManager:
    def __init__(self, session_id, memoria, base_url):
        self.session_id = session_id
        self.memoria = memoria

    def _get_especialidades_from_db(self):
        return list(Especialidade.objects.all().order_by('nome').values('id', 'nome'))

    def _get_medicos_from_db(self, especialidade_id):
        return list(CustomUser.objects.filter(cargo='medico', especialidades__id=especialidade_id).values('id', 'first_name', 'last_name'))

    def _iniciar_busca_de_horarios(self, especialidade_id, especialidade_nome):
        medicos = self._get_medicos_from_db(especialidade_id=especialidade_id)
        if not medicos: return {"response_message": f"Desculpe, não encontrei médicos para {especialidade_nome}.", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}
        medico = medicos[0]
        self.memoria.update({'medico_id': medico['id'], 'medico_nome': f"{medico['first_name']} {medico['last_name']}"})
        horarios = buscar_proximo_horario_disponivel(medico_id=medico['id'])
        if not horarios or not horarios.get('horarios_disponiveis'): return {"response_message": f"Infelizmente, não há horários online para Dr(a). {self.memoria['medico_nome']}.", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}
        self.memoria['horarios_ofertados'] = horarios
        data_fmt = datetime.strptime(horarios['data'], '%Y-%m-%d').strftime('%d/%m/%Y')
        horarios_fmt = "\n".join([f"• *{h}*" for h in horarios['horarios_disponiveis'][:5]])
        return {"response_message": f"Encontrei estes horários para Dr(a). *{self.memoria['medico_nome']}* no dia *{data_fmt}*:\n\n{horarios_fmt}\n\nQual deles prefere?", "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

    def processar(self, resposta, estado):
        handlers = {
            'agendamento_inicio': self.handle_inicio, 'agendamento_awaiting_type': self.handle_awaiting_type,
            'agendamento_awaiting_modality': self.handle_awaiting_modality, 'agendamento_awaiting_specialty': self.handle_awaiting_specialty,
            'agendamento_awaiting_slot_choice': self.handle_awaiting_slot_choice, 'agendamento_awaiting_slot_confirmation': self.handle_awaiting_slot_confirmation,
            'cadastro_awaiting_adult_data': self.handle_cadastro_adult_data, 'cadastro_awaiting_nome': self.handle_cadastro_nome,
            'cadastro_awaiting_data_nasc': self.handle_cadastro_data_nasc, 'cadastro_awaiting_cpf': self.handle_cadastro_cpf,
            'cadastro_awaiting_telefone': self.handle_cadastro_telefone, 'cadastro_awaiting_email': self.handle_cadastro_email,
            'agendamento_awaiting_payment_choice': self.handle_awaiting_payment_choice, 'agendamento_awaiting_installments': self.handle_awaiting_installments,
            'agendamento_awaiting_confirmation': self.handle_awaiting_confirmation,
        }
        return handlers.get(estado, lambda r: {"response_message": "Estado desconhecido, reiniciando.", "new_state": "inicio", "memory_data": self.memoria})(resposta)

    def handle_inicio(self, r):
        return {"response_message": f"Vamos lá, {self.memoria['nome_usuario']}! O agendamento é para uma *Consulta*?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}

    def handle_awaiting_type(self, r):
        self.memoria['tipo_agendamento'] = 'Consulta'
        return {"response_message": "Será *Presencial* ou *Telemedicina*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}

    def handle_awaiting_modality(self, r):
        modalidade = "".join(r.strip().split()).capitalize()
        if modalidade not in ['Presencial', 'Telemedicina']: return {"response_message": "É *Presencial* ou *Telemedicina*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        self.memoria['modalidade'] = modalidade
        especialidades = self._get_especialidades_from_db()
        return {"response_message": "Qual especialidade você deseja?\n\n" + '\n'.join([f"• {e['nome']}" for e in especialidades]), "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

    def handle_awaiting_specialty(self, r):
        especialidades = self._get_especialidades_from_db()
        escolha = next((e for e in especialidades if r.lower() in e['nome'].lower()), None)
        if not escolha: return {"response_message": "Não encontrei essa especialidade. Pode tentar de novo?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}
        self.memoria.update({'especialidade_id': escolha['id'], 'especialidade_nome': escolha['nome']})
        return self._iniciar_busca_de_horarios(escolha['id'], escolha['nome'])

    def handle_awaiting_slot_choice(self, r):
        horario = r.strip()
        ofertados = self.memoria.get('horarios_ofertados', {})
        if horario not in ofertados.get('horarios_disponiveis', []): return {"response_message": f"Não encontrei '{horario}'. Escolha um dos horários da lista.", "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
        data_obj = datetime.strptime(ofertados['data'], '%Y-%m-%d').date()
        hora_obj = datetime.strptime(horario, '%H:%M').time()
        self.memoria['data_hora_inicio'] = timezone.make_aware(datetime.combine(data_obj, hora_obj)).isoformat()
        return {"response_message": f"Confirmar para {data_obj.strftime('%d/%m/%Y')} às {horario}? (Sim/Não)", "new_state": "agendamento_awaiting_slot_confirmation", "memory_data": self.memoria}

    def handle_awaiting_slot_confirmation(self, r):
        if 'sim' not in r.lower():
            return {"response_message": "Ok, pré-agendamento cancelado.", "new_state": "inicio", "memory_data": self.memoria}
        return {"response_message": "Ótimo! Agora vou precisar de alguns dados para finalizar.", "new_state": "cadastro_awaiting_adult_data", "memory_data": self.memoria}

    def handle_cadastro_awaiting_adult_data(self, r):
        self.memoria['dados_coletados_temp'] = {}
        return {"response_message": "Vamos lá, um de cada vez.\n\nPrimeiro, qual o seu *nome completo*?", "new_state": "cadastro_awaiting_nome", "memory_data": self.memoria}

    def handle_cadastro_nome(self, r):
        if len(r.strip().split()) < 2: return {"response_message": "Preciso do nome e sobrenome.", "new_state": "cadastro_awaiting_nome", "memory_data": self.memoria}
        self.memoria['dados_coletados_temp']['nome_completo'] = r.strip().title()
        return {"response_message": "Obrigado! Agora, sua *data de nascimento* (DD/MM/AAAA)?", "new_state": "cadastro_awaiting_data_nasc", "memory_data": self.memoria}

    def handle_cadastro_data_nasc(self, r):
        if not validar_data_nascimento_formato(r): return {"response_message": "Data inválida. Use DD/MM/AAAA.", "new_state": "cadastro_awaiting_data_nasc", "memory_data": self.memoria}
        self.memoria['dados_coletados_temp']['data_nascimento'] = r.strip()
        return {"response_message": "Perfeito. Agora, seu *CPF*.", "new_state": "cadastro_awaiting_cpf", "memory_data": self.memoria}

    def handle_cadastro_cpf(self, r):
        if not validar_cpf_formato(r): return {"response_message": "CPF inválido. Digite os 11 números.", "new_state": "cadastro_awaiting_cpf", "memory_data": self.memoria}
        self.memoria['dados_coletados_temp']['cpf'] = r.strip()
        return {"response_message": "Certo. E o seu *telefone* com DDD?", "new_state": "cadastro_awaiting_telefone", "memory_data": self.memoria}

    def handle_cadastro_telefone(self, r):
        if not validar_telefone_formato(r): return {"response_message": "Telefone inválido (ex: 11999998888).", "new_state": "cadastro_awaiting_telefone", "memory_data": self.memoria}
        self.memoria['dados_coletados_temp']['telefone_celular'] = r.strip()
        return {"response_message": "Por último, seu *e-mail*.", "new_state": "cadastro_awaiting_email", "memory_data": self.memoria}

    def handle_cadastro_email(self, r):
        if not validar_email_formato(r): return {"response_message": "E-mail inválido.", "new_state": "cadastro_awaiting_email", "memory_data": self.memoria}
        dados = self.memoria['dados_coletados_temp']
        dados['email'] = r.strip().lower()
        self.memoria.update(dados); del self.memoria['dados_coletados_temp']
        nome = self.memoria['nome_completo'].split(' ')[0]
        return {"response_message": f"Excelente, {nome}! Recebi seus dados.\n\nComo prefere pagar?", "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}

    def handle_awaiting_payment_choice(self, r):
        escolha = r.lower().strip()
        if 'pix' in escolha:
            self.memoria['metodo_pagamento_escolhido'] = 'PIX'
            return self.handle_awaiting_confirmation("confirmado")
        elif 'cartão' in escolha or 'cartao' in escolha:
            self.memoria['metodo_pagamento_escolhido'] = 'CartaoCredito'
            return {"response_message": "Cartão selecionado. À vista, 2x ou 3x?", "new_state": "agendamento_awaiting_installments", "memory_data": self.memoria}
        return {"response_message": "Não entendi. É Pix ou Cartão?", "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}

    def handle_awaiting_installments(self, r):
        if '2' in r: self.memoria['parcelas'] = 2
        elif '3' in r: self.memoria['parcelas'] = 3
        else: self.memoria['parcelas'] = 1
        return self.handle_awaiting_confirmation("confirmado")

    def handle_awaiting_confirmation(self, r):
        logger = logging.getLogger(__name__)
        try:
            cpf_limpo = re.sub(r'\D', '', self.memoria.get('cpf', ''))
            paciente, _ = Paciente.objects.get_or_create(cpf=cpf_limpo, defaults={
                'nome_completo': self.memoria.get('nome_completo', ''), 'email': self.memoria.get('email'),
                'telefone_celular': re.sub(r'\D', '', self.memoria.get('telefone_celular', '')),
                'data_nascimento': datetime.strptime(self.memoria.get('data_nascimento'), '%d/%m/%Y').date()
            })
            dados = {'paciente': paciente.id, 'data_hora_inicio': self.memoria.get('data_hora_inicio'), 'status': 'Agendado', 'tipo_agendamento': 'Consulta', 'tipo_atendimento': 'Particular', 'especialidade': self.memoria.get('especialidade_id'), 'medico': self.memoria.get('medico_id'), 'modalidade': self.memoria.get('modalidade')}
            inicio = datetime.fromisoformat(self.memoria.get('data_hora_inicio'))
            dados['data_hora_fim'] = (inicio + timedelta(minutes=50)).isoformat()
            
            serializer = AgendamentoWriteSerializer(data=dados)
            if not serializer.is_valid():
                logger.error(f"Erro de serialização: {json.dumps(serializer.errors)}")
                return {"response_message": f"Erro ao validar dados: {json.dumps(serializer.errors)}", "new_state": "inicio", "memory_data": self.memoria}
            
            agendamento = serializer.save()
            user = CustomUser.objects.filter(is_superuser=True).first()
            metodo = self.memoria.get('metodo_pagamento_escolhido', 'PIX')
            criar_agendamento_e_pagamento_pendente(agendamento, user, metodo_pagamento_escolhido=metodo, initiated_by_chatbot=True)
            agendamento.refresh_from_db()

            pagamento = agendamento.pagamento
            if metodo == 'PIX' and hasattr(pagamento, 'pix_copia_e_cola') and pagamento.pix_copia_e_cola:
                valor_desconto = pagamento.valor * Decimal('0.95')
                return {"response_message": f"Pré-agendamento OK! Para confirmar, pague R$ {valor_desconto:.2f} (com 5% de desconto) com o Pix Copia e Cola:\n`{pagamento.pix_copia_e_cola}`", "new_state": "inicio", "memory_data": self.memoria}
            
            return {"response_message": "Pré-agendamento realizado com sucesso! O pagamento será feito na clínica.", "new_state": "inicio", "memory_data": self.memoria}
        except Exception as e:
            logger.error(f"ERRO INESPERADO NA CONFIRMAÇÃO: {str(e)}", exc_info=True)
            return {"response_message": f"Desculpe, ocorreu um erro ao finalizar: {str(e)}", "new_state": "inicio", "memory_data": self.memoria}