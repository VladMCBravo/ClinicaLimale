# chatbot/agendamento_flow.py - VERSÃO FINAL CORRIGIDA

import re
from datetime import datetime, timedelta
import json
from django.utils import timezone
from decimal import Decimal # <-- 1. IMPORTAÇÃO ADICIONADA AQUI
from usuarios.models import Especialidade, CustomUser
from faturamento.models import Procedimento
from agendamentos.services import (
    buscar_proximo_horario_disponivel,
    buscar_proximo_horario_procedimento,
    criar_agendamento_e_pagamento_pendente,
    listar_agendamentos_futuros,
    cancelar_agendamento_service
)
from pacientes.models import Paciente
from agendamentos.serializers import AgendamentoWriteSerializer

# --- FUNÇÕES DE VALIDAÇÃO (MANTIDAS) ---
def validar_cpf_formato(cpf_str: str) -> bool:
    if not isinstance(cpf_str, str): return False
    numeros = re.sub(r'\D', '', cpf_str)
    return len(numeros) == 11

def validar_telefone_formato(tel_str: str) -> bool:
    if not isinstance(tel_str, str): return False
    numeros = re.sub(r'\D', '', tel_str)
    if numeros.startswith('55'):
        numeros = numeros[2:]
    return len(numeros) in [10, 11]

def validar_data_nascimento_formato(data_str: str) -> bool:
    if not isinstance(data_str, str): return False
    try:
        data_obj = datetime.strptime(data_str.strip(), '%d/%m/%Y')
        if data_obj.date() >= datetime.now().date():
            return False
        return True
    except ValueError:
        return False

def validar_email_formato(email_str: str) -> bool:
    if not isinstance(email_str, str): return False
    return bool(re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email_str.strip()))

# --- CLASSE PRINCIPAL DA MÁQUINA DE ESTADOS ---
class AgendamentoManager:
    def __init__(self, session_id, memoria, base_url, chain_sintomas=None, chain_extracao_dados=None):
        self.session_id = session_id
        self.memoria = memoria
        self.base_url = base_url.rstrip('/')
        self.chain_sintomas = chain_sintomas
        self.chain_extracao_dados = chain_extracao_dados

    # ... (os métodos _get_... e _iniciar_busca_de_horarios permanecem os mesmos) ...
    def _get_especialidades_from_db(self):
        return list(Especialidade.objects.all().order_by('nome').values('id', 'nome'))

    def _get_medicos_from_db(self, especialidade_id):
        return list(CustomUser.objects.filter(cargo='medico', especialidades__id=especialidade_id).values('id', 'first_name', 'last_name'))

    def _get_procedimentos_from_db(self):
        return list(Procedimento.objects.filter(ativo=True, valor_particular__gt=0).order_by('descricao').values('id', 'descricao', 'descricao_detalhada'))

    def _get_especialidade_por_nome(self, nome_especialidade):
        try:
            return Especialidade.objects.get(nome__iexact=nome_especialidade)
        except Especialidade.DoesNotExist:
            return None

    def _iniciar_busca_de_horarios(self, especialidade_id, especialidade_nome):
        nome_usuario = self.memoria.get('nome_usuario', '')
        medicos = self._get_medicos_from_db(especialidade_id=especialidade_id)
        if not medicos:
            return {"response_message": f"Desculpe, {nome_usuario}, não encontrei médicos para {especialidade_nome} no momento.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        
        medico = medicos[0]
        self.memoria.update({'medico_id': medico['id'], 'medico_nome': f"{medico['first_name']} {medico['last_name']}"})
        horarios = buscar_proximo_horario_disponivel(medico_id=medico['id'])
        
        if not horarios or not horarios.get('horarios_disponiveis'):
            return {"response_message": f"Infelizmente, {nome_usuario}, não há horários online para Dr(a). {self.memoria['medico_nome']}.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        
        self.memoria['horarios_ofertados'] = horarios
        data_formatada = datetime.strptime(horarios['data'], '%Y-%m-%d').strftime('%d/%m/%Y')
        horarios_formatados = [f"• *{h}*" for h in horarios['horarios_disponiveis'][:5]]
        horarios_str = "\n".join(horarios_formatados)
        
        mensagem = (f"Ótima escolha, {nome_usuario}! A especialidade de *{especialidade_nome}* é uma das nossas referências. O(A) Dr(a). *{self.memoria['medico_nome']}* é um(a) excelente profissional e tenho a certeza de que você estará em boas mãos.\n\nEncontrei estes próximos horários disponíveis no dia *{data_formatada}*:\n\n{horarios_str}\n\nQual deles seria melhor para você? Se preferir outro dia ou turno, pode me dizer.")
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

    def processar(self, resposta_usuario, estado_atual):
        handlers = {
            'triagem_processar_sintomas': self.handle_triagem_processar_sintomas,
            'agendamento_inicio': self.handle_inicio,
            'agendamento_awaiting_type': self.handle_awaiting_type,
            'agendamento_awaiting_procedure': self.handle_awaiting_procedure,
            'agendamento_awaiting_modality': self.handle_awaiting_modality,
            'agendamento_awaiting_specialty': self.handle_awaiting_specialty,
            'agendamento_awaiting_patient_type': self.handle_awaiting_patient_type,
            'agendamento_awaiting_slot_choice': self.handle_awaiting_slot_choice,
            'agendamento_awaiting_slot_confirmation': self.handle_awaiting_slot_confirmation,
            'cadastro_awaiting_adult_data': self.handle_cadastro_awaiting_adult_data,
            'cadastro_awaiting_child_data': self.handle_cadastro_awaiting_child_data,
            'cadastro_awaiting_nome': self.handle_cadastro_nome,
            'cadastro_awaiting_cpf': self.handle_cadastro_cpf,
            'cadastro_awaiting_data_nasc': self.handle_cadastro_data_nasc,
            'cadastro_awaiting_telefone': self.handle_cadastro_telefone,
            'cadastro_awaiting_email': self.handle_cadastro_email,
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

    # --- HANDLERS DO FLUXO (VERSÃO LIMPA) ---
    def handle_fallback(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        self.memoria.clear(); self.memoria['nome_usuario'] = nome_usuario
        return {"response_message": f"Desculpe, {nome_usuario}, perdi o fio da meada. Vamos recomeçar?", "new_state": "inicio", "memory_data": self.memoria}

    def handle_triagem_processar_sintomas(self, resposta_usuario):
        # ... (código mantido, sem alterações)
        nome_usuario = self.memoria.get('nome_usuario', '')
        try:
            resultado_ia = self.chain_sintomas.invoke({"sintomas_do_usuario": resposta_usuario})
            especialidade_sugerida = resultado_ia.get('especialidade_sugerida')
            if not especialidade_sugerida or especialidade_sugerida == 'Nenhuma':
                return {"response_message": f"{nome_usuario}, com base no que me disse, não consegui identificar uma especialidade. Pode descrever os sintomas com mais detalhes?", "new_state": "triagem_processar_sintomas", "memory_data": self.memoria}
            especialidade_obj = self._get_especialidade_por_nome(especialidade_sugerida)
            if not especialidade_obj:
                 return {"response_message": f"{nome_usuario}, sugeri {especialidade_sugerida}, mas não encontrei nos nossos serviços. Vamos tentar de outra forma. Qual especialidade você procura?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}
            self.memoria.update({'especialidade_id': especialidade_obj.id, 'especialidade_nome': especialidade_obj.nome, 'tipo_agendamento': 'Consulta'})
            mensagem = (f"Certo, {nome_usuario}. Baseado no que me contou, a especialidade mais indicada seria *{especialidade_sugerida}*.\nLembre-se que esta é uma sugestão e não substitui uma avaliação médica.\n\nVamos ver os horários disponíveis para você?")
            return self._iniciar_busca_de_horarios(especialidade_obj.id, especialidade_obj.nome)
        except Exception as e:
            return {"response_message": f"Ocorreu um erro na triagem, {nome_usuario}. Vamos tentar o agendamento normal.", "new_state": "agendamento_inicio", "memory_data": self.memoria}
    
    def handle_inicio(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', 'tudo bem')
        self.memoria.clear(); self.memoria['nome_usuario'] = nome_usuario
        return {"response_message": f"Vamos lá, {nome_usuario}! Gostaria de agendar uma *Consulta* ou um *Procedimento* (exames)?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}

    def handle_awaiting_type(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        escolha = resposta_usuario.lower()
        if 'consulta' in escolha:
            self.memoria['tipo_agendamento'] = 'Consulta'
            return { "response_message": f"Entendido, {nome_usuario}. O atendimento será *Presencial* ou por *Telemedicina*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria }
        elif 'procedimento' in escolha or 'exame' in escolha:
            self.memoria['tipo_agendamento'] = 'Procedimento'
            procedimentos = self._get_procedimentos_from_db()
            if not procedimentos: return {"response_message": f"Desculpe, {nome_usuario}, não encontrei procedimentos disponíveis para agendamento online.", "new_state": "inicio", "memory_data": self.memoria}
            self.memoria['lista_procedimentos'] = procedimentos
            nomes_procedimentos = '\n'.join([f"• {proc['descricao']}" for proc in procedimentos])
            return { "response_message": f"Certo, {nome_usuario}. Temos os seguintes procedimentos:\n\n{nomes_procedimentos}\n\nQual deles você deseja agendar?", "new_state": "agendamento_awaiting_procedure", "memory_data": self.memoria }
        else:
            return { "response_message": f"Não entendi, {nome_usuario}. Por favor, diga 'Consulta' ou 'Procedimento'.", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria }

    def handle_awaiting_procedure(self, resposta_usuario):
        # ... (código mantido, sem alterações)
        nome_usuario = self.memoria.get('nome_usuario', '')
        procedimento_escolhido = next((proc for proc in self.memoria.get('lista_procedimentos', []) if resposta_usuario.lower() in proc['descricao'].lower()), None)
        if not procedimento_escolhido: return {"response_message": f"{nome_usuario}, não encontrei esse procedimento na lista. Poderia verificar e me dizer novamente?", "new_state": "agendamento_awaiting_procedure", "memory_data": self.memoria}
        self.memoria.update({'procedimento_id': procedimento_escolhido['id'], 'procedimento_nome': procedimento_escolhido['descricao']})
        horarios = buscar_proximo_horario_procedimento(procedimento_id=procedimento_escolhido['id'])
        if not horarios or not horarios.get('horarios_disponiveis'): return {"response_message": f"Infelizmente, {nome_usuario}, não há horários disponíveis para '{procedimento_escolhido['descricao']}'.", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}
        self.memoria['horarios_ofertados'] = horarios
        data_formatada = datetime.strptime(horarios['data'], '%Y-%m-%d').strftime('%d/%m/%Y')
        horarios_formatados = [f"• *{h}*" for h in horarios['horarios_disponiveis'][:5]]
        horarios_str = "\n".join(horarios_formatados)
        mensagem_horarios = f"Perfeito, {nome_usuario}! Encontrei os seguintes horários para o dia *{data_formatada}*:\n\n{horarios_str}\n\nQual horário prefere?"
        return {"response_message": mensagem_horarios, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

    def handle_awaiting_modality(self, resposta_usuario):
        # ... (código mantido, sem alterações)
        nome_usuario = self.memoria.get('nome_usuario', '')
        modalidade = "".join(resposta_usuario.strip().split()).capitalize()
        if modalidade not in ['Presencial', 'Telemedicina']: return {"response_message": f"Modalidade inválida, {nome_usuario}. Responda com *Presencial* ou *Telemedicina*.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        self.memoria['modalidade'] = modalidade
        especialidades = self._get_especialidades_from_db()
        self.memoria['lista_especialidades'] = especialidades
        nomes_especialidades = '\n'.join([f"• {esp['nome']}" for esp in especialidades])
        return {"response_message": f"Perfeito, {nome_usuario}. Temos estas especialidades:\n\n{nomes_especialidades}\n\nQual delas você deseja?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

    def handle_awaiting_specialty(self, resposta_usuario):
        # ... (código mantido, sem alterações)
        nome_usuario = self.memoria.get('nome_usuario', '')
        especialidade_escolhida = next((esp for esp in self.memoria.get('lista_especialidades', []) if resposta_usuario.lower() in esp['nome'].lower() or esp['nome'].lower() in resposta_usuario.lower()), None)
        if not especialidade_escolhida:
            return {"response_message": f"Não encontrei essa especialidade na lista, {nome_usuario}. Pode verificar e tentar de novo?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}
        self.memoria.update({'especialidade_id': especialidade_escolhida['id'], 'especialidade_nome': especialidade_escolhida['nome']})
        if 'pediatria' in especialidade_escolhida['nome'].lower() or 'neonatologia' in especialidade_escolhida['nome'].lower():
            return {"response_message": f"Entendido, {nome_usuario}. A consulta é para você ou para uma criança?", "new_state": "agendamento_awaiting_patient_type", "memory_data": self.memoria}
        else:
            self.memoria['agendamento_para_crianca'] = False
            return self._iniciar_busca_de_horarios(especialidade_escolhida['id'], especialidade_escolhida['nome'])

    def handle_awaiting_patient_type(self, resposta_usuario):
        # ... (código mantido, sem alterações)
        resposta = resposta_usuario.lower()
        especialidade_id = self.memoria.get('especialidade_id')
        especialidade_nome = self.memoria.get('especialidade_nome')
        if 'criança' in resposta or 'filho' in resposta or 'filha' in resposta:
            self.memoria['agendamento_para_crianca'] = True
        else:
            self.memoria['agendamento_para_crianca'] = False
        return self._iniciar_busca_de_horarios(especialidade_id, especialidade_nome)

    def handle_awaiting_slot_choice(self, resposta_usuario):
        # ... (código mantido, sem alterações)
        nome_usuario = self.memoria.get('nome_usuario', '')
        horario_escolhido_str = resposta_usuario.strip()
        horarios_ofertados = self.memoria.get('horarios_ofertados', {})
        lista_horarios_validos = horarios_ofertados.get('horarios_disponiveis', [])
        if horario_escolhido_str not in lista_horarios_validos:
            return {"response_message": f"Hum, {nome_usuario}, não encontrei o horário '{horario_escolhido_str}' na lista. Por favor, escolha um dos horários que enviei.", "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
        data_str = horarios_ofertados['data']
        data_obj = datetime.strptime(data_str, '%Y-%m-%d').date()
        hora_obj = datetime.strptime(horario_escolhido_str, '%H:%M').time()
        data_hora_inicio_aware = timezone.make_aware(datetime.combine(data_obj, hora_obj))
        self.memoria['data_hora_inicio'] = data_hora_inicio_aware.isoformat()
        return {"response_message": f"Perfeito, {nome_usuario}! Deseja confirmar o pré-agendamento para o dia {data_obj.strftime('%d/%m/%Y')} às {horario_escolhido_str}? (Sim/Não)", "new_state": "agendamento_awaiting_slot_confirmation", "memory_data": self.memoria}

    def handle_awaiting_slot_confirmation(self, resposta_usuario):
        # ... (código mantido, sem alterações)
        nome_usuario = self.memoria.get('nome_usuario', '')
        resposta = resposta_usuario.lower()
        if 'sim' not in resposta:
            self.memoria.pop('data_hora_inicio', None)
            return {"response_message": f"Entendido, {nome_usuario}, o pré-agendamento foi cancelado. Posso ajudar com outros horários ou algo mais?", "new_state": "identificando_demanda", "memory_data": self.memoria}
        mensagem_valorizacao = f"Ótimo, {nome_usuario}! Para continuarmos com a sua reserva, preciso de alguns dados."
        if self.memoria.get('agendamento_para_crianca'):
            mensagem_coleta_dados = ("Para finalizarmos o agendamento da criança, preciso das seguintes informações:\n\n👶 *Dados da criança:*\n• Nome completo da criança\n• Data de nascimento (DD/MM/AAAA)\n\n👤 *Dados do responsável:*\n• Seu nome completo\n• Seu CPF (formato: XXX.XXX.XXX-XX)\n• Seu grau de parentesco (pai, mãe, etc.)\n• Seu telefone com DDD (formato: +55 11 99999-9999)\n• Seu e-mail")
            novo_estado = "cadastro_awaiting_child_data"
        else:
            mensagem_coleta_dados = ("Para finalizarmos o seu agendamento, preciso de algumas informações:\n\n👤 *Dados do paciente:*\n• Nome completo\n• Data de nascimento (DD/MM/AAAA)\n• CPF (formato: XXX.XXX.XXX-XX)\n\n📞 *Dados de contato:*\n• Telefone com DDD (formato: +55 11 99999-9999)\n• E-mail")
            novo_estado = "cadastro_awaiting_adult_data"
        resposta_final = f"{mensagem_valorizacao}\n\n{mensagem_coleta_dados}"
        return {"response_message": resposta_final, "new_state": novo_estado, "memory_data": self.memoria}

    # --- FLUXO DE CADASTRO SEQUENCIAL (VERSÃO CORRIGIDA E ÚNICA) ---
    def handle_cadastro_awaiting_adult_data(self, resposta_usuario):
        import logging
        logger = logging.getLogger(__name__)
        logger.warning("[CADASTRO ADULTO] Iniciando coleta sequencial de dados.")
        nome_usuario = self.memoria.get('nome_usuario', '')
        self.memoria['dados_coletados_temp'] = {} 
        mensagem = f"Entendido, {nome_usuario}. Para finalizar, preciso de alguns dados. Vamos fazer isso passo a passo.\n\nPrimeiro, qual o seu *nome completo*?"
        return {"response_message": mensagem, "new_state": "cadastro_awaiting_nome", "memory_data": self.memoria}

    def handle_cadastro_nome(self, resposta_usuario):
        nome = resposta_usuario.strip()
        if len(nome.split()) < 2:
            return {"response_message": "Por favor, preciso do seu nome e sobrenome.", "new_state": "cadastro_awaiting_nome", "memory_data": self.memoria}
        self.memoria['dados_coletados_temp']['nome_completo'] = nome.title()
        return {"response_message": "Obrigado! Agora, qual a sua *data de nascimento* (no formato DD/MM/AAAA)?", "new_state": "cadastro_awaiting_data_nasc", "memory_data": self.memoria}

    def handle_cadastro_data_nasc(self, resposta_usuario):
        data = resposta_usuario.strip()
        if not validar_data_nascimento_formato(data):
            return {"response_message": "Data inválida. Por favor, use o formato DD/MM/AAAA, por exemplo: 15/03/1990.", "new_state": "cadastro_awaiting_data_nasc", "memory_data": self.memoria}
        self.memoria['dados_coletados_temp']['data_nascimento'] = data
        return {"response_message": "Perfeito. Agora, por favor, digite o seu *CPF*.", "new_state": "cadastro_awaiting_cpf", "memory_data": self.memoria}

    def handle_cadastro_cpf(self, resposta_usuario):
        cpf = resposta_usuario.strip()
        if not validar_cpf_formato(cpf):
            return {"response_message": "CPF inválido. Por favor, digite os 11 números do seu CPF.", "new_state": "cadastro_awaiting_cpf", "memory_data": self.memoria}
        self.memoria['dados_coletados_temp']['cpf'] = cpf
        return {"response_message": "Certo. E qual o seu *telefone* com DDD?", "new_state": "cadastro_awaiting_telefone", "memory_data": self.memoria}

    def handle_cadastro_telefone(self, resposta_usuario):
        telefone = resposta_usuario.strip()
        if not validar_telefone_formato(telefone):
            return {"response_message": "Telefone inválido. Por favor, digite o número com DDD (ex: 11999998888).", "new_state": "cadastro_awaiting_telefone", "memory_data": self.memoria}
        self.memoria['dados_coletados_temp']['telefone_celular'] = telefone
        return {"response_message": "Estamos quase no fim! Por último, qual o seu *e-mail*?", "new_state": "cadastro_awaiting_email", "memory_data": self.memoria}

    def handle_cadastro_email(self, resposta_usuario):
        email = resposta_usuario.strip().lower()
        if not validar_email_formato(email):
            return {"response_message": "Este e-mail não parece válido. Poderia verificar e digitar novamente?", "new_state": "cadastro_awaiting_email", "memory_data": self.memoria}
        self.memoria['dados_coletados_temp']['email'] = email
        dados_coletados = self.memoria['dados_coletados_temp']
        self.memoria['nome_completo'] = dados_coletados['nome_completo']
        self.memoria['data_nascimento'] = dados_coletados['data_nascimento']
        self.memoria['cpf'] = re.sub(r'\D', '', dados_coletados['cpf'])
        self.memoria['telefone_celular'] = re.sub(r'\D', '', dados_coletados['telefone_celular'])
        self.memoria['email'] = dados_coletados['email']
        del self.memoria['dados_coletados_temp']
        primeiro_nome = self.memoria['nome_completo'].split(' ')[0]
        mensagem = (f"Excelente, {primeiro_nome}! Recebi todos os seus dados.\n\nComo prefere pagar para confirmar sua vaga? 💳\n\n1️⃣ *PIX* - 5% de desconto 🎉\n2️⃣ *Cartão de Crédito* - Até 3x sem juros 💳\n\nDigite *1* para PIX ou *2* para Cartão.")
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}
    
    def handle_cadastro_awaiting_child_data(self, resposta_usuario):
        return {"response_message": "Handler de criança a ser implementado.", "new_state": "inicio", "memory_data": self.memoria}
        
    def handle_awaiting_payment_choice(self, resposta_usuario):
        # ... (código mantido, sem alterações)
        nome_usuario = self.memoria.get('nome_usuario', '')
        escolha = resposta_usuario.lower().strip()
        if 'pix' in escolha or escolha == '1':
            self.memoria['metodo_pagamento_escolhido'] = 'PIX'
            return self.handle_awaiting_confirmation("confirmado")
        elif 'cartão' in escolha or 'cartao' in escolha or escolha == '2':
            mensagem_parcelamento = (f"Perfeito, {nome_usuario}! Cartão de crédito selecionado. 💳\n\nComo deseja pagar?\n\n1️⃣ *À vista* (sem juros)\n2️⃣ *2x sem juros*\n3️⃣ *3x sem juros*\n\nDigite o número da opção desejada.")
            self.memoria['metodo_pagamento_escolhido'] = 'CartaoCredito'
            return {"response_message": mensagem_parcelamento, "new_state": "agendamento_awaiting_installments", "memory_data": self.memoria}
        else:
            return {"response_message": f"Não entendi, {nome_usuario}. Por favor, digite *1* para PIX ou *2* para Cartão.", "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}
    
    def handle_awaiting_installments(self, resposta_usuario):
        # ... (código mantido, sem alterações)
        nome_usuario = self.memoria.get('nome_usuario', '')
        escolha = resposta_usuario.strip()
        if escolha == '1': self.memoria['parcelas'] = 1
        elif escolha == '2': self.memoria['parcelas'] = 2
        elif escolha == '3': self.memoria['parcelas'] = 3
        else: return {"response_message": f"Opção inválida, {nome_usuario}. Digite *1* (à vista), *2* (2x) ou *3* (3x).", "new_state": "agendamento_awaiting_installments", "memory_data": self.memoria}
        return self.handle_awaiting_confirmation("confirmado")

    def handle_awaiting_confirmation(self, resposta_usuario):
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"[CONFIRMACAO] Iniciando confirmação com memória: {self.memoria}")
        try:
            cpf_limpo = self.memoria.get('cpf')
            email_paciente = self.memoria.get('email', '')
            if not email_paciente: email_paciente = None
            paciente, created = Paciente.objects.get_or_create(
                cpf=cpf_limpo,
                defaults={
                    'nome_completo': self.memoria.get('nome_completo', ''),
                    'email': email_paciente,
                    'telefone_celular': self.memoria.get('telefone_celular', ''),
                    'data_nascimento': datetime.strptime(self.memoria.get('data_nascimento'), '%d/%m/%Y').date()
                }
            )
            if not created:
                paciente.nome_completo = self.memoria.get('nome_completo', paciente.nome_completo)
                if email_paciente: paciente.email = email_paciente
                paciente.telefone_celular = self.memoria.get('telefone_celular', paciente.telefone_celular)
                paciente.data_nascimento = datetime.strptime(self.memoria.get('data_nascimento'), '%d/%m/%Y').date()
                paciente.save()
            dados_agendamento = {'paciente': paciente.id, 'data_hora_inicio': self.memoria.get('data_hora_inicio'), 'status': 'Agendado', 'tipo_agendamento': self.memoria.get('tipo_agendamento'), 'tipo_atendimento': 'Particular'}
            if self.memoria.get('tipo_agendamento') == 'Consulta':
                duracao = 50; dados_agendamento.update({'especialidade': self.memoria.get('especialidade_id'), 'medico': self.memoria.get('medico_id'), 'modalidade': self.memoria.get('modalidade')})
            else:
                duracao = 60; dados_agendamento.update({'procedimento': self.memoria.get('procedimento_id'), 'modalidade': 'Presencial'})
            data_hora_inicio_obj = datetime.fromisoformat(self.memoria.get('data_hora_inicio'))
            dados_agendamento['data_hora_fim'] = (data_hora_inicio_obj + timedelta(minutes=duracao)).isoformat()
            serializer = AgendamentoWriteSerializer(data=dados_agendamento)
            if not serializer.is_valid():
                logger.error(f"[CONFIRMACAO] Erro de serialização: {json.dumps(serializer.errors)}")
                return {"response_message": f"Erro ao validar dados: {json.dumps(serializer.errors)}", "new_state": "inicio", "memory_data": self.memoria}
            agendamento = serializer.save()
            usuario_servico = CustomUser.objects.filter(is_superuser=True).first()
            metodo_pagamento = self.memoria.get('metodo_pagamento_escolhido', 'PIX')
            criar_agendamento_e_pagamento_pendente(agendamento, usuario_servico, metodo_pagamento_escolhido=metodo_pagamento, initiated_by_chatbot=True)
            agendamento.refresh_from_db()
            pagamento = agendamento.pagamento
            nome_paciente_formatado = paciente.nome_completo.split(' ')[0]
            data_agendamento_fmt = timezone.localtime(agendamento.data_hora_inicio).strftime('%d/%m/%Y')
            hora_agendamento_fmt = timezone.localtime(agendamento.data_hora_inicio).strftime('%H:%M')
            mensagem_confirmacao = (f"✅ *Confirmação de Pré-Agendamento*\n\nOlá, {nome_paciente_formatado}! O seu horário foi reservado com sucesso.\n\n*{agendamento.get_tipo_agendamento_display()} de {self.memoria.get('especialidade_nome') or self.memoria.get('procedimento_nome')}*\nCom o(a) Dr(a). *{self.memoria.get('medico_nome')}*\n🗓️ *Data:* {data_agendamento_fmt}\n⏰ *Hora:* {hora_agendamento_fmt}\n\n")
            secao_pagamento = "..." # Lógica de pagamento omitida para brevidade
            if metodo_pagamento == 'PIX' and hasattr(pagamento, 'pix_copia_e_cola') and pagamento.pix_copia_e_cola:
                valor_com_desconto = pagamento.valor * Decimal('0.95')
                secao_pagamento = (f"Para confirmar, realize o pagamento via PIX com *5% de desconto*.\n\n*Valor com desconto:* R$ {valor_com_desconto:.2f}\n*Chave PIX (Copia e Cola):*\n`{pagamento.pix_copia_e_cola}`\n\nApós o pagamento, o seu horário será confirmado automaticamente. Estamos ansiosos para recebê-lo(a)!")
            elif metodo_pagamento == 'CartaoCredito' and hasattr(pagamento, 'link_pagamento') and pagamento.link_pagamento:
                parcelas = self.memoria.get('parcelas', 1)
                texto_parcelas = "à vista" if parcelas == 1 else f"em {parcelas}x sem juros"
                secao_pagamento = f"Clique no link para pagar com *Cartão de Crédito {texto_parcelas}* e confirmar o seu horário:\n{pagamento.link_pagamento}"
            
            resposta_final = f"{mensagem_confirmacao}{secao_pagamento}"
            return {"response_message": resposta_final, "new_state": "inicio", "memory_data": {'nome_usuario': self.memoria.get('nome_usuario')}}
        except Exception as e:
            logger.error(f"[CONFIRMACAO] ERRO: {str(e)}", exc_info=True)
            return {"response_message": f"Desculpe, ocorreu um erro inesperado ao finalizar o seu agendamento: {str(e)}", "new_state": "inicio", "memory_data": self.memoria}

    # --- HANDLERS DO FLUXO DE CANCELAMENTO ---
    def handle_cancelamento_inicio(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        return {"response_message": f"Entendido, {nome_usuario}. Para localizar o seu agendamento, por favor, informe-me o seu *CPF*.", "new_state": "cancelamento_awaiting_cpf", "memory_data": self.memoria}

    def handle_cancelamento_awaiting_cpf(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        cpf = re.sub(r'\D', '', resposta_usuario)
        if len(cpf) != 11:
            return {"response_message": "CPF inválido. Por favor, digite os 11 números.", "new_state": "cancelamento_awaiting_cpf", "memory_data": self.memoria}
        agendamentos = listar_agendamentos_futuros(cpf)
        if not agendamentos:
            return {"response_message": f"Não encontrei agendamentos futuros no seu CPF, {nome_usuario}. Posso ajudar com mais alguma coisa?", "new_state": "inicio", "memory_data": self.memoria}
        self.memoria['agendamentos_para_cancelar'] = [{"id": ag.id, "texto": f"{ag.get_tipo_agendamento_display()} - {ag.especialidade.nome if ag.especialidade else ag.procedimento.descricao} em {timezone.localtime(ag.data_hora_inicio).strftime('%d/%m/%Y às %H:%M')}"} for ag in agendamentos]
        
        if len(agendamentos) == 1:
            ag = self.memoria['agendamentos_para_cancelar'][0]
            self.memoria['agendamento_selecionado_id'] = ag['id']
            return {"response_message": f"Encontrei este agendamento, {nome_usuario}:\n• {ag['texto']}\n\nConfirma o cancelamento? (Sim/Não)", "new_state": "cancelamento_awaiting_confirmation", "memory_data": self.memoria}
        else:
            lista_texto = "\n".join([f"{i+1} - {ag['texto']}" for i, ag in enumerate(self.memoria['agendamentos_para_cancelar'])])
            return {"response_message": f"Encontrei estes agendamentos, {nome_usuario}:\n{lista_texto}\n\nQual o *número* do que deseja cancelar?", "new_state": "cancelamento_awaiting_choice", "memory_data": self.memoria}

    def handle_cancelamento_awaiting_choice(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        try:
            escolha = int(resposta_usuario.strip()) - 1
            agendamentos_lista = self.memoria.get('agendamentos_para_cancelar', [])
            if 0 <= escolha < len(agendamentos_lista):
                ag_selecionado = agendamentos_lista[escolha]
                self.memoria['agendamento_selecionado_id'] = ag_selecionado['id']
                return {"response_message": f"Confirma o cancelamento de:\n• {ag_selecionado['texto']}\n\n(Sim/Não)", "new_state": "cancelamento_awaiting_confirmation", "memory_data": self.memoria}
            else:
                raise ValueError("Escolha fora do intervalo")
        except (ValueError, IndexError):
            return {"response_message": f"Opção inválida, {nome_usuario}. Por favor, digite apenas o número correspondente.", "new_state": "cancelamento_awaiting_choice", "memory_data": self.memoria}

    def handle_cancelamento_awaiting_confirmation(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        resposta = resposta_usuario.lower()
        if 'sim' in resposta:
            agendamento_id = self.memoria.get('agendamento_selecionado_id')
            resultado = cancelar_agendamento_service(agendamento_id)
            return {"response_message": resultado.get('mensagem', 'Ocorreu um erro.'), "new_state": "inicio", "memory_data": self.memoria}
        elif 'não' in resposta or 'nao' in resposta:
            return {"response_message": f"Ok, {nome_usuario}, o agendamento foi mantido. Posso ajudar com mais alguma coisa?", "new_state": "inicio", "memory_data": self.memoria}
        else:
            return {"response_message": "Não entendi. Responda com 'Sim' ou 'Não'.", "new_state": "cancelamento_awaiting_confirmation", "memory_data": self.memoria}