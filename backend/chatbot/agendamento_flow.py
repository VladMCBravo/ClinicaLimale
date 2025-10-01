# chatbot/agendamento_flow.py
# Este arquivo contém a lógica da máquina de estados da conversa do chatbot.

# --- SEÇÃO DE IMPORTAÇÕES ---
import re
from datetime import datetime, timedelta
import json
from django.utils import timezone

# --- SEÇÃO DE IMPORTAÇÕES DOS APPS DJANGO ---
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

# --- SEÇÃO DE FUNÇÕES AUXILIARES DE VALIDAÇÃO ---
# Funções de validação rigorosa para os dados do paciente, conforme o roteiro 'Leonidas'.

def validar_cpf_formato(cpf_str: str) -> bool:
    """Valida o formato XXX.XXX.XXX-XX."""
    if not isinstance(cpf_str, str): return False
    return bool(re.match(r'^\d{3}\.\d{3}\.\d{3}-\d{2}$', cpf_str.strip()))

def validar_telefone_formato(tel_str: str) -> bool:
    """Valida o formato +55 DD 9XXXX-XXXX (com variações)."""
    if not isinstance(tel_str, str): return False
    # Limpa o telefone para verificar apenas os dígitos
    tel_limpo = re.sub(r'\D', '', tel_str)
    # Verifica se tem o código do país (55) e entre 10 ou 11 dígitos
    return tel_limpo.startswith('55') and (len(tel_limpo) == 12 or len(tel_limpo) == 13)


def validar_data_nascimento_formato(data_str: str) -> bool:
    """Valida o formato DD/MM/AAAA e se a data não está no futuro."""
    if not isinstance(data_str, str): return False
    try:
        data_obj = datetime.strptime(data_str.strip(), '%d/%m/%Y')
        if data_obj.date() >= datetime.now().date():
            return False  # Não pode ser hoje ou no futuro
        return True
    except ValueError:
        return False

# --- CLASSE PRINCIPAL DA MÁQUINA DE ESTADOS ---

class AgendamentoManager:
    """Gerencia o fluxo da conversa, estado e lógica para o agendamento."""

    def __init__(self, session_id, memoria, base_url, chain_sintomas=None, chain_extracao_dados=None):
        self.session_id = session_id
        self.memoria = memoria
        self.base_url = base_url.rstrip('/')
        # Ferramentas de IA para tarefas específicas
        self.chain_sintomas = chain_sintomas
        self.chain_extracao_dados = chain_extracao_dados

    # --- MÉTODOS DE ACESSO AO BANCO DE DADOS ---
    def _get_especialidades_from_db(self):
        return list(Especialidade.objects.all().order_by('nome').values('id', 'nome'))

    def _get_medicos_from_db(self, especialidade_id):
        return list(CustomUser.objects.filter(cargo='medico', especialidades__id=especialidade_id).values('id', 'first_name', 'last_name'))

    def _get_procedimentos_from_db(self):
        return list(Procedimento.objects.filter(ativo=True, valor_particular__gt=0).order_by('descricao').values('id', 'descricao', 'descricao_detalhada'))

    # --- MÉTODOS DE LÓGICA INTERNA ---
    def _iniciar_busca_de_horarios(self, especialidade_id, especialidade_nome):
        """Busca e formata a mensagem com os próximos horários disponíveis para uma consulta."""
        medicos = self._get_medicos_from_db(especialidade_id=especialidade_id)
        if not medicos:
            return {"response_message": f"Desculpe, não encontrei médicos disponíveis para a especialidade {especialidade_nome} no momento.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        
        # Simplificação: pega o primeiro médico da lista para a especialidade.
        medico = medicos[0]
        self.memoria.update({'medico_id': medico['id'], 'medico_nome': f"{medico['first_name']} {medico['last_name']}"})
        
        horarios = buscar_proximo_horario_disponivel(medico_id=medico['id'])
        
        if not horarios or not horarios.get('horarios_disponiveis'):
            return {"response_message": f"Infelizmente, não há horários online disponíveis para Dr(a). {self.memoria['medico_nome']} nos próximos dias. Por favor, tente novamente mais tarde ou entre em contato com a clínica.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        
        self.memoria['horarios_ofertados'] = horarios
        data_formatada = datetime.strptime(horarios['data'], '%Y-%m-%d').strftime('%d/%m/%Y')
        horarios_formatados = [f"*{h}*" for h in horarios['horarios_disponiveis'][:3]] # Oferece no máximo 3 horários
        horarios_str = "\n".join(horarios_formatados)
        
        mensagem = (
            f"Temos esses horários disponíveis com Dr(a). *{self.memoria['medico_nome']}* no dia *{data_formatada}*.\n\n"
            f"{horarios_str}\n\n"
            "Qual deles seria melhor para você?"
        )
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

    # --- ROTEADOR PRINCIPAL DE ESTADOS ---
    def processar(self, resposta_usuario, estado_atual):
        """Direciona a resposta do usuário para o 'handler' (método) correto baseado no estado atual da conversa."""
        handlers = {
            # --- FLUXO DE AGENDAMENTO ---
            'agendamento_inicio': self.handle_inicio,
            'agendamento_awaiting_type': self.handle_awaiting_type,
            'agendamento_awaiting_procedure': self.handle_awaiting_procedure,
            'agendamento_awaiting_modality': self.handle_awaiting_modality,
            'agendamento_awaiting_specialty': self.handle_awaiting_specialty,
            'agendamento_awaiting_patient_type': self.handle_awaiting_patient_type,
            'agendamento_awaiting_slot_choice': self.handle_awaiting_slot_choice,
            
            # --- NOVOS ESTADOS DE CADASTRO E VALIDAÇÃO ---
            'cadastro_awaiting_adult_data': self.handle_cadastro_awaiting_adult_data,
            'cadastro_awaiting_child_data': self.handle_cadastro_awaiting_child_data,

            # --- FLUXO DE FINALIZAÇÃO ---
            'agendamento_awaiting_payment_choice': self.handle_awaiting_payment_choice,
            'agendamento_awaiting_confirmation': self.handle_awaiting_confirmation,

            # --- FLUXO DE CANCELAMENTO ---
            'cancelamento_inicio': self.handle_cancelamento_inicio,
            'cancelamento_awaiting_cpf': self.handle_cancelamento_awaiting_cpf,
            'cancelamento_awaiting_choice': self.handle_cancelamento_awaiting_choice,
            'cancelamento_awaiting_confirmation': self.handle_cancelamento_awaiting_confirmation,
        }
        handler = handlers.get(estado_atual, self.handle_fallback)
        return handler(resposta_usuario)

    # --- HANDLERS DO FLUXO DE CONVERSA ---

    def handle_fallback(self, resposta_usuario):
        """Handler de segurança para estados não reconhecidos."""
        nome_usuario = self.memoria.get('nome_usuario', '')
        self.memoria.clear()
        self.memoria['nome_usuario'] = nome_usuario
        return {"response_message": "Desculpe, me perdi um pouco. Vamos recomeçar do início, pode ser?", "new_state": "inicio", "memory_data": self.memoria}

    # --- INÍCIO DO FLUXO DE AGENDAMENTO ---

    def handle_inicio(self, resposta_usuario):
        """Inicia um novo fluxo de agendamento, limpando a memória anterior."""
        nome_usuario = self.memoria.get('nome_usuario', 'tudo bem')
        self.memoria.clear()
        self.memoria['nome_usuario'] = nome_usuario
        return {"response_message": f"Vamos lá, {nome_usuario}! Você gostaria de agendar uma *Consulta* ou um *Procedimento* (exames)?", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}

    def handle_awaiting_type(self, resposta_usuario):
        """Identifica se o usuário quer uma Consulta ou um Procedimento."""
        escolha = resposta_usuario.lower()
        if 'consulta' in escolha:
            self.memoria['tipo_agendamento'] = 'Consulta'
            return {"response_message": "Entendido. O atendimento será *Presencial* ou por *Telemedicina*?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        elif 'procedimento' in escolha or 'exame' in escolha:
            self.memoria['tipo_agendamento'] = 'Procedimento'
            procedimentos = self._get_procedimentos_from_db()
            if not procedimentos:
                return {"response_message": "Desculpe, não encontrei procedimentos disponíveis para agendamento online no momento.", "new_state": "inicio", "memory_data": self.memoria}
            self.memoria['lista_procedimentos'] = procedimentos
            nomes_procedimentos = '\n'.join([f"• {proc['descricao']}" for proc in procedimentos])
            return {"response_message": f"Certo, temos os seguintes procedimentos:\n\n{nomes_procedimentos}\n\nQual deles você deseja agendar?", "new_state": "agendamento_awaiting_procedure", "memory_data": self.memoria}
        else:
            return {"response_message": "Não entendi. Por favor, diga 'Consulta' ou 'Procedimento'.", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}

    def handle_awaiting_procedure(self, resposta_usuario):
        """Processa a escolha do procedimento e busca horários."""
        procedimento_escolhido = next((proc for proc in self.memoria.get('lista_procedimentos', []) if resposta_usuario.lower() in proc['descricao'].lower()), None)
        if not procedimento_escolhido:
            return {"response_message": "Não encontrei esse procedimento na lista. Por favor, escolha um dos nomes que enviei.", "new_state": "agendamento_awaiting_procedure", "memory_data": self.memoria}
        
        self.memoria.update({'procedimento_id': procedimento_escolhido['id'], 'procedimento_nome': procedimento_escolhido['descricao']})
        
        # Etapa 1 do roteiro: Valorização do serviço
        descricao_valorizacao = ""
        if procedimento_escolhido.get('descricao_detalhada'):
            descricao_valorizacao = f"Perfeito! Vou te explicar sobre esse exame.\n\n{procedimento_escolhido['descricao_detalhada']}\n\nEste exame é realizado com equipamentos de última geração, garantindo resultados precisos."
        
        # Etapa 2: Busca de horários
        horarios = buscar_proximo_horario_procedimento(procedimento_id=procedimento_escolhido['id'])
        if not horarios or not horarios.get('horarios_disponiveis'):
            return {"response_message": f"Infelizmente, não há horários online disponíveis para '{procedimento_escolhido['descricao']}'.", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}
        
        self.memoria['horarios_ofertados'] = horarios
        data_formatada = datetime.strptime(horarios['data'], '%Y-%m-%d').strftime('%d/%m/%Y')
        horarios_formatados = [f"*{h}*" for h in horarios['horarios_disponiveis'][:3]]
        horarios_str = "\n".join(horarios_formatados)
        
        mensagem_horarios = f"Temos esses horários disponíveis para seu exame no dia *{data_formatada}*:\n\n{horarios_str}\n\nQual deles seria melhor para você?"
        
        resposta_final = f"{descricao_valorizacao}\n\n{mensagem_horarios}".strip()
        return {"response_message": resposta_final, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

    def handle_awaiting_modality(self, resposta_usuario):
        """Processa a escolha da modalidade (Presencial/Telemedicina)."""
        modalidade = "".join(resposta_usuario.strip().split()).capitalize()
        if modalidade not in ['Presencial', 'Telemedicina']:
            return {"response_message": "Modalidade inválida. Responda com *Presencial* ou *Telemedicina*.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        
        self.memoria['modalidade'] = modalidade
        especialidades = self._get_especialidades_from_db()
        self.memoria['lista_especialidades'] = especialidades
        nomes_especialidades = '\n'.join([f"• {esp['nome']}" for esp in especialidades])
        return {"response_message": f"Perfeito. Temos estas especialidades:\n\n{nomes_especialidades}\n\nQual delas você deseja?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

    def handle_awaiting_specialty(self, resposta_usuario):
        """Processa a escolha da especialidade e verifica se é pediátrica."""
        especialidade_escolhida = next((esp for esp in self.memoria.get('lista_especialidades', []) if resposta_usuario.lower() in esp['nome'].lower() or esp['nome'].lower() in resposta_usuario.lower()), None)
        if not especialidade_escolhida:
            return {"response_message": "Não encontrei essa especialidade na lista. Por favor, escolha um dos nomes que enviei.", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}
        
        self.memoria.update({'especialidade_id': especialidade_escolhida['id'], 'especialidade_nome': especialidade_escolhida['nome']})
        
        if 'pediatria' in especialidade_escolhida['nome'].lower() or 'neonatologia' in especialidade_escolhida['nome'].lower():
            return {"response_message": "Entendido. A consulta é para você ou para uma criança?", "new_state": "agendamento_awaiting_patient_type", "memory_data": self.memoria}
        else:
            self.memoria['agendamento_para_crianca'] = False
            return self._iniciar_busca_de_horarios(especialidade_escolhida['id'], especialidade_escolhida['nome'])

    def handle_awaiting_patient_type(self, resposta_usuario):
        """Identifica se a consulta pediátrica é para o adulto ou uma criança."""
        resposta = resposta_usuario.lower()
        especialidade_id = self.memoria.get('especialidade_id')
        especialidade_nome = self.memoria.get('especialidade_nome')
        
        if 'criança' in resposta or 'filho' in resposta or 'filha' in resposta:
            self.memoria['agendamento_para_crianca'] = True
        else:
            self.memoria['agendamento_para_crianca'] = False
        
        return self._iniciar_busca_de_horarios(especialidade_id, especialidade_nome)

    def handle_awaiting_slot_choice(self, resposta_usuario):
        """Processa a escolha do horário e avança para a coleta de dados."""
        try:
            horario_escolhido_str = datetime.strptime(resposta_usuario.strip(), '%H:%M').strftime('%H:%M')
        except ValueError:
            horario_escolhido_str = resposta_usuario.strip()
            
        horarios_ofertados = self.memoria.get('horarios_ofertados', {})
        lista_horarios_validos = horarios_ofertados.get('horarios_disponiveis', [])
        
        if horario_escolhido_str not in lista_horarios_validos:
            return {"response_message": f"Hum, não encontrei o horário '{resposta_usuario.strip()}' na lista que te enviei. Por favor, escolha um dos horários disponíveis.", "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}
        
        self.memoria['data_hora_inicio'] = f"{horarios_ofertados['data']}T{horario_escolhido_str}"
        
        # Etapa 3 do roteiro: Valorização do profissional/serviço
        if self.memoria.get('tipo_agendamento') == 'Consulta':
            nome_medico = self.memoria.get('medico_nome', 'nosso especialista')
            mensagem_valorizacao = (
                f"Perfeito, sua consulta está marcada com Dr(a). *{nome_medico}*, que é referência na área e muito "
                "elogiado(a) pelo cuidado e atenção com os pacientes.\n\n"
                "Aqui na clínica, prezamos pelo acolhimento e qualidade no atendimento. Você estará em boas mãos."
            )
        else:
            nome_procedimento = self.memoria.get('procedimento_nome', 'seu exame')
            mensagem_valorizacao = (
                f"Perfeito, seu exame *{nome_procedimento}* está agendado!\n\n"
                "Aqui na clínica, prezamos pela qualidade e precisão em todos os nossos exames, realizados com "
                "equipamentos de última geração."
            )

        # Etapa 4 do roteiro: Pergunta pelos dados em bloco
        if self.memoria.get('agendamento_para_crianca'):
            mensagem_coleta_dados = (
                "Para finalizarmos o agendamento da criança, preciso de algumas informações:\n\n"
                "👶 *Dados da criança:*\n"
                "• Nome completo da criança\n"
                "• Data de nascimento (DD/MM/AAAA)\n\n"
                "👤 *Dados do responsável:*\n"
                "• Seu nome completo\n"
                "• Seu CPF (formato: XXX.XXX.XXX-XX)\n"
                "• Seu grau de parentesco (pai, mãe, etc.)\n"
                "• Seu telefone com DDD (formato: +55 11 99999-9999)"
            )
            novo_estado = "cadastro_awaiting_child_data"
        else:
            mensagem_coleta_dados = (
                "Para finalizarmos seu agendamento, preciso de algumas informações:\n\n"
                "👤 *Dados do paciente:*\n"
                "• Nome completo\n"
                "• Data de nascimento (DD/MM/AAAA)\n"
                "• CPF (formato: XXX.XXX.XXX-XX)\n\n"
                "📞 *Dados de contato:*\n"
                "• Telefone com DDD (formato: +55 11 99999-9999)"
            )
            novo_estado = "cadastro_awaiting_adult_data"
        
        resposta_final = f"{mensagem_valorizacao}\n\n{mensagem_coleta_dados}"
        return {"response_message": resposta_final, "new_state": novo_estado, "memory_data": self.memoria}

    # --- NOVOS HANDLERS PARA CADASTRO E VALIDAÇÃO ---

    def handle_cadastro_awaiting_adult_data(self, resposta_usuario):
        """Extrai e valida o bloco de dados para um paciente adulto."""
        try:
            # Usa a IA para extrair os dados de forma estruturada do texto.
            dados_extraidos = self.chain_extracao_dados.invoke({"dados_do_usuario": resposta_usuario})
        except Exception as e:
            return {"response_message": "Não consegui processar suas informações. Por favor, tente enviar novamente, uma informação por linha, como no exemplo.", "new_state": "cadastro_awaiting_adult_data", "memory_data": self.memoria}

        # Extrai e limpa os dados recebidos da IA
        nome = dados_extraidos.get('nome_completo', '').strip()
        data_nasc = dados_extraidos.get('data_nascimento', '').strip()
        cpf = dados_extraidos.get('cpf', '').strip()
        telefone = dados_extraidos.get('telefone_celular', '').strip()

        # Validações rigorosas, uma por uma, com mensagens de erro específicas
        if not (nome and len(nome.split()) > 1):
            return {"response_message": "O nome parece incompleto. Por favor, informe seu nome e sobrenome.", "new_state": "cadastro_awaiting_adult_data", "memory_data": self.memoria}
        if not validar_data_nascimento_formato(data_nasc):
            return {"response_message": "A data de nascimento parece inválida. Por favor, use o formato DD/MM/AAAA e certifique-se que não é uma data futura.", "new_state": "cadastro_awaiting_adult_data", "memory_data": self.memoria}
        if not validar_cpf_formato(cpf):
            return {"response_message": "O CPF parece inválido. Por favor, use o formato XXX.XXX.XXX-XX.", "new_state": "cadastro_awaiting_adult_data", "memory_data": self.memoria}
        if not validar_telefone_formato(telefone):
            return {"response_message": "O telefone parece inválido. Por favor, use o formato +55 11 99999-9999.", "new_state": "cadastro_awaiting_adult_data", "memory_data": self.memoria}

        # Se todas as validações passaram, salva os dados na memória da sessão
        self.memoria['nome_completo'] = nome.title()
        self.memoria['data_nascimento'] = data_nasc
        self.memoria['cpf'] = re.sub(r'\D', '', cpf)
        self.memoria['telefone_celular'] = re.sub(r'\D', '', telefone)
        
        # Avança para a escolha do pagamento
        mensagem = (f"Ótimo, {nome.split(' ')[0]}! Como prefere pagar?\n1️⃣ - *PIX* (5% de desconto)\n2️⃣ - *Cartão de Crédito* (até 3x)")
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}

    def handle_cadastro_awaiting_child_data(self, resposta_usuario):
        """Extrai e valida o bloco de dados para uma consulta pediátrica."""
        # Tenta extrair os dados usando Regex, que é mais robusto para formatos esperados.
        try:
            nome_crianca = re.search(r'Nome completo da criança: (.+)', resposta_usuario, re.IGNORECASE).group(1).strip()
            data_nasc_crianca = re.search(r'Data de nascimento: (.+)', resposta_usuario, re.IGNORECASE).group(1).strip()
            nome_responsavel = re.search(r'Seu nome completo: (.+)', resposta_usuario, re.IGNORECASE).group(1).strip()
            cpf_responsavel = re.search(r'Seu CPF: (.+)', resposta_usuario, re.IGNORECASE).group(1).strip()
            parentesco = re.search(r'Seu grau de parentesco: (.+)', resposta_usuario, re.IGNORECASE).group(1).strip()
            telefone_responsavel = re.search(r'Seu telefone com DDD: (.+)', resposta_usuario, re.IGNORECASE).group(1).strip()
        except (AttributeError, IndexError):
            return {"response_message": "Não consegui entender todos os dados. Por favor, envie novamente seguindo o exemplo que mandei, com cada informação em sua linha.", "new_state": "cadastro_awaiting_child_data", "memory_data": self.memoria}

        # Validações
        if not (nome_crianca and len(nome_crianca.split()) > 1):
            return {"response_message": "O nome da criança parece incompleto.", "new_state": "cadastro_awaiting_child_data", "memory_data": self.memoria}
        if not validar_data_nascimento_formato(data_nasc_crianca):
            return {"response_message": "A data de nascimento da criança parece inválida (formato DD/MM/AAAA).", "new_state": "cadastro_awaiting_child_data", "memory_data": self.memoria}
        if not validar_cpf_formato(cpf_responsavel):
            return {"response_message": "O CPF do responsável parece inválido (formato XXX.XXX.XXX-XX).", "new_state": "cadastro_awaiting_child_data", "memory_data": self.memoria}
        if not parentesco:
            return {"response_message": "Notei que faltou o grau de parentesco (pai, mãe, etc.).", "new_state": "cadastro_awaiting_child_data", "memory_data": self.memoria}

        # Se tudo OK, salva na memória
        self.memoria.update({
            'nome_paciente_final': nome_crianca.title(),
            'data_nascimento_paciente_final': data_nasc_crianca,
            'cpf': re.sub(r'\D', '', cpf_responsavel),
            'nome_completo_responsavel': nome_responsavel.title(),
            'telefone_celular': re.sub(r'\D', '', telefone_responsavel),
            'grau_parentesco': parentesco,
        })
        
        mensagem = (f"Obrigado! Como prefere pagar pela consulta de {self.memoria['nome_paciente_final'].split(' ')[0]}?\n"
                    "1️⃣ - *PIX* (5% de desconto)\n"
                    "2️⃣ - *Cartão de Crédito* (em até 3x)")
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}

    # --- FINALIZAÇÃO DO FLUXO DE AGENDAMENTO ---

    def handle_awaiting_payment_choice(self, resposta_usuario):
        """Processa a escolha do método de pagamento e avança para a confirmação final."""
        escolha = resposta_usuario.lower()
        if 'pix' in escolha or '1' in escolha:
            self.memoria['metodo_pagamento_escolhido'] = 'PIX'
        elif 'cartão' in escolha or 'cartao' in escolha or '2' in escolha:
            self.memoria['metodo_pagamento_escolhido'] = 'CartaoCredito'
        else:
            return {"response_message": "Não entendi sua escolha. Por favor, responda com 'PIX' ou 'Cartão'.", "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}
        
        # Chama diretamente o handler de confirmação para criar o agendamento no sistema.
        return self.handle_awaiting_confirmation("confirmado")

    def handle_awaiting_confirmation(self, resposta_usuario):
        """Cria/atualiza o paciente, cria o agendamento e o pagamento, e envia a resposta final."""
        try:
            # Lógica para criar ou buscar o paciente (adulto ou responsável)
            cpf_limpo = self.memoria.get('cpf')
            responsavel, created_responsavel = Paciente.objects.update_or_create(
                cpf=cpf_limpo,
                defaults={
                    'nome_completo': self.memoria.get('nome_completo_responsavel') or self.memoria.get('nome_completo'),
                    'data_nascimento': datetime.strptime(self.memoria.get('data_nascimento'), '%d/%m/%Y').date() if self.memoria.get('data_nascimento') else None,
                    'telefone_celular': self.memoria.get('telefone_celular'),
                    'email': self.memoria.get('email', f"{cpf_limpo}@email.com"),
                }
            )

            # Define quem é o paciente final do agendamento
            if self.memoria.get('agendamento_para_crianca'):
                data_nasc_crianca_obj = datetime.strptime(self.memoria.get('data_nascimento_paciente_final'), '%d/%m/%Y').date()
                paciente_final, _ = Paciente.objects.get_or_create(
                    nome_completo__iexact=self.memoria.get('nome_paciente_final'),
                    data_nascimento=data_nasc_crianca_obj,
                    defaults={'responsavel': responsavel, 'telefone_celular': responsavel.telefone_celular, 'email': responsavel.email}
                )
            else:
                paciente_final = responsavel

            # Monta os dados para criar o agendamento
            dados_agendamento = {
                'paciente': paciente_final.id,
                'data_hora_inicio': self.memoria.get('data_hora_inicio'),
                'status': 'Agendado',
                'tipo_agendamento': self.memoria.get('tipo_agendamento'),
                'tipo_atendimento': 'Particular'
            }
            if self.memoria.get('tipo_agendamento') == 'Consulta':
                dados_agendamento.update({
                    'data_hora_fim': datetime.fromisoformat(self.memoria.get('data_hora_inicio')) + timedelta(minutes=50),
                    'especialidade': self.memoria.get('especialidade_id'),
                    'medico': self.memoria.get('medico_id'),
                    'modalidade': self.memoria.get('modalidade')
                })
            else: # Procedimento
                dados_agendamento.update({
                    'data_hora_fim': datetime.fromisoformat(self.memoria.get('data_hora_inicio')) + timedelta(minutes=60),
                    'procedimento': self.memoria.get('procedimento_id'),
                    'modalidade': 'Presencial'
                })

            serializer = AgendamentoWriteSerializer(data=dados_agendamento)
            if not serializer.is_valid():
                return {"response_message": f"Desculpe, tive um problema ao validar os dados do agendamento. Erro: {json.dumps(serializer.errors)}", "new_state": "inicio", "memory_data": self.memoria}

            agendamento = serializer.save()
            usuario_servico = CustomUser.objects.filter(is_superuser=True).first()
            
            # Cria o pagamento pendente associado
            criar_agendamento_e_pagamento_pendente(
                agendamento, 
                usuario_servico, 
                metodo_pagamento_escolhido=self.memoria.get('metodo_pagamento_escolhido'), 
                initiated_by_chatbot=True
            )
            agendamento.refresh_from_db()
            
            # Constrói a mensagem de resposta final com base no roteiro 'Leonidas'
            pagamento = agendamento.pagamento
            nome_display = paciente_final.nome_completo.split(' ')[0]
            data_agendamento = timezone.localtime(agendamento.data_hora_inicio).strftime('%d/%m/%Y')
            hora_agendamento = timezone.localtime(agendamento.data_hora_inicio).strftime('%H:%M')

            mensagem_confirmacao = (
                f"✅ *Confirmação de Pré-Agendamento*\n\n"
                f"Olá, {nome_display}! Seu horário foi reservado com sucesso.\n"
                f"*{agendamento.get_tipo_agendamento_display()} de {self.memoria.get('especialidade_nome') or self.memoria.get('procedimento_nome')}*\n"
                f"🗓️ *Data:* {data_agendamento}\n"
                f"⏰ *Hora:* {hora_agendamento}\n\n"
            )

            secao_pagamento = "Seu agendamento foi pré-realizado. Por favor, entre em contato com a clínica para finalizar o pagamento." # Mensagem de fallback
            if self.memoria.get('metodo_pagamento_escolhido') == 'PIX' and hasattr(pagamento, 'pix_copia_e_cola') and pagamento.pix_copia_e_cola:
                valor_com_desconto = pagamento.valor * 0.95
                secao_pagamento = (
                    f"Para confirmar definitivamente seu horário, realize o pagamento via PIX com *5% de desconto*.\n\n"
                    f"*Valor com desconto:* R$ {valor_com_desconto:.2f}\n"
                    f"*Chave PIX (Copia e Cola):*\n`{pagamento.pix_copia_e_cola}`\n\n"
                    "Após o pagamento, seu horário será confirmado automaticamente. Obrigado!"
                )
            elif self.memoria.get('metodo_pagamento_escolhido') == 'CartaoCredito' and hasattr(pagamento, 'link_pagamento') and pagamento.link_pagamento:
                secao_pagamento = f"Clique no link abaixo para pagar com *Cartão de Crédito em até 3x* e confirmar seu horário:\n{pagamento.link_pagamento}"

            resposta_final = f"{mensagem_confirmacao}{secao_pagamento}"
            return {"response_message": resposta_final, "new_state": "inicio", "memory_data": {'nome_usuario': self.memoria.get('nome_usuario')}}
        except Exception as e:
            return {"response_message": f"Desculpe, ocorreu um erro inesperado ao finalizar seu agendamento: {str(e)}", "new_state": "inicio", "memory_data": self.memoria}

    # --- HANDLERS DO FLUXO DE CANCELAMENTO ---

    def handle_cancelamento_inicio(self, resposta_usuario):
        """Inicia o fluxo de cancelamento pedindo o CPF."""
        return {"response_message": "Entendido. Para localizar seu agendamento, por favor, me informe o seu *CPF*.", "new_state": "cancelamento_awaiting_cpf", "memory_data": self.memoria}

    def handle_cancelamento_awaiting_cpf(self, resposta_usuario):
        """Busca agendamentos futuros do CPF informado."""
        cpf = re.sub(r'\D', '', resposta_usuario)
        if len(cpf) != 11:
            return {"response_message": "CPF inválido. Por favor, digite os 11 números.", "new_state": "cancelamento_awaiting_cpf", "memory_data": self.memoria}
        
        agendamentos = listar_agendamentos_futuros(cpf)
        if not agendamentos:
            return {"response_message": "Não encontrei agendamentos futuros no seu CPF. Posso ajudar com algo mais?", "new_state": "inicio", "memory_data": self.memoria}
        
        self.memoria['agendamentos_para_cancelar'] = [
            {"id": ag.id, "texto": f"{ag.get_tipo_agendamento_display()} - {ag.especialidade.nome if ag.especialidade else ag.procedimento.descricao} em {timezone.localtime(ag.data_hora_inicio).strftime('%d/%m/%Y às %H:%M')}"}
            for ag in agendamentos
        ]
        
        if len(agendamentos) == 1:
            ag = self.memoria['agendamentos_para_cancelar'][0]
            self.memoria['agendamento_selecionado_id'] = ag['id']
            return {"response_message": f"Encontrei este agendamento:\n• {ag['texto']}\n\nConfirma o cancelamento? (Sim/Não)", "new_state": "cancelamento_awaiting_confirmation", "memory_data": self.memoria}
        else:
            lista_texto = "\n".join([f"{i+1} - {ag['texto']}" for i, ag in enumerate(self.memoria['agendamentos_para_cancelar'])])
            return {"response_message": f"Encontrei estes agendamentos:\n{lista_texto}\n\nQual o *número* do que deseja cancelar?", "new_state": "cancelamento_awaiting_choice", "memory_data": self.memoria}

    def handle_cancelamento_awaiting_choice(self, resposta_usuario):
        """Processa a escolha do agendamento a ser cancelado."""
        try:
            escolha = int(resposta_usuario.strip()) - 1
            agendamentos_lista = self.memoria.get('agendamentos_para_cancelar', [])
            if 0 <= escolha < len(agendamentos_lista):
                ag_selecionado = agendamentos_lista[escolha]
                self.memoria['agendamento_selecionado_id'] = ag_selecionado['id']
                return {"response_message": f"Confirma o cancelamento de:\n• {ag_selecionado['texto']}\n\n(Sim/Não)", "new_state": "cancelamento_awaiting_confirmation", "memory_data": self.memoria}
            else:
                raise ValueError("Escolha fora do intervalo.")
        except (ValueError, IndexError):
            return {"response_message": "Opção inválida. Por favor, digite apenas o número correspondente ao agendamento.", "new_state": "cancelamento_awaiting_choice", "memory_data": self.memoria}

    def handle_cancelamento_awaiting_confirmation(self, resposta_usuario):
        """Confirma e executa o cancelamento."""
        resposta = resposta_usuario.lower()
        if 'sim' in resposta:
            agendamento_id = self.memoria.get('agendamento_selecionado_id')
            resultado = cancelar_agendamento_service(agendamento_id)
            mensagem_final = resultado.get('mensagem', 'Ocorreu um erro ao processar sua solicitação.')
            if resultado.get('sucesso'):
                mensagem_final = "Seu agendamento foi cancelado com sucesso. Ficamos à disposição para quando você precisar reagendar. Cuidar da sua saúde é sempre nossa prioridade!"
            return {"response_message": mensagem_final, "new_state": "inicio", "memory_data": self.memoria}
        elif 'não' in resposta or 'nao' in resposta:
            return {"response_message": "Ok, o agendamento foi mantido. Posso ajudar com algo mais?", "new_state": "inicio", "memory_data": self.memoria}
        else:
            return {"response_message": "Não entendi sua resposta. Por favor, responda com 'Sim' ou 'Não'.", "new_state": "cancelamento_awaiting_confirmation", "memory_data": self.memoria}
