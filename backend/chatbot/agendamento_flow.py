# chatbot/agendamento_flow.py
# Este ficheiro contém a lógica da máquina de estados da conversa do chatbot.

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
# from .validators import ChatbotValidators
# from .response_generator import ResponseGenerator
# from .analytics import AnalyticsManager

# --- SEÇÃO DE FUNÇÕES AUXILIARES DE VALIDAÇÃO ---
def validar_cpf_formato(cpf_str: str) -> bool:
    if not isinstance(cpf_str, str): return False
    # Remove todos os caracteres não numéricos
    numeros = re.sub(r'\D', '', cpf_str)
    # CPF deve ter exatamente 11 dígitos
    return len(numeros) == 11

def validar_telefone_formato(tel_str: str) -> bool:
    if not isinstance(tel_str, str): return False
    # Remove todos os caracteres não numéricos
    numeros = re.sub(r'\D', '', tel_str)
    # Aceita telefones com 10 ou 11 dígitos (com ou sem código do país)
    if numeros.startswith('55'):
        numeros = numeros[2:]  # Remove código do país
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

    # --- MÉTODOS DE ACESSO À BASE DE DADOS ---
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
    
    def _extrair_dados_manual(self, texto):
        """Extração manual de dados como fallback"""
        dados = {}
        
        # Trata o texto como uma única string também
        texto_completo = texto.replace('\n', ' ')
        
        # Procura por CPF (mais flexível)
        cpf_match = re.search(r'\b\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2}\b', texto_completo)
        if cpf_match:
            cpf_raw = cpf_match.group()
            # Formatar CPF
            cpf_numeros = re.sub(r'\D', '', cpf_raw)
            if len(cpf_numeros) == 11:
                dados['cpf'] = f"{cpf_numeros[:3]}.{cpf_numeros[3:6]}.{cpf_numeros[6:9]}-{cpf_numeros[9:]}"
        
        # Procura por telefone (mais flexível)
        tel_patterns = [
            r'\+55\s?\(?\d{2}\)?\s?9?\d{4,5}[-\s]?\d{4}',
            r'\(?\d{2}\)?\s?9?\d{4,5}[-\s]?\d{4}',
            r'\d{2}\s?9?\d{4,5}[-\s]?\d{4}'
        ]
        for pattern in tel_patterns:
            tel_match = re.search(pattern, texto_completo)
            if tel_match:
                tel_raw = tel_match.group()
                # Limpar e formatar
                tel_numeros = re.sub(r'\D', '', tel_raw)
                if len(tel_numeros) >= 10:
                    if not tel_raw.startswith('+55'):
                        dados['telefone_celular'] = f"+55 {tel_raw}"
                    else:
                        dados['telefone_celular'] = tel_raw
                break
        
        # Procura por email
        email_match = re.search(r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', texto_completo)
        if email_match:
            dados['email'] = email_match.group()
        
        # Procura por data
        data_patterns = [
            r'\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\b',
            r'\b\d{4}[/.-]\d{1,2}[/.-]\d{1,2}\b'
        ]
        for pattern in data_patterns:
            data_match = re.search(pattern, texto_completo)
            if data_match:
                data_raw = data_match.group()
                # Normalizar para DD/MM/AAAA
                if '/' in data_raw:
                    partes = data_raw.split('/')
                elif '-' in data_raw:
                    partes = data_raw.split('-')
                else:
                    partes = data_raw.split('.')
                
                if len(partes) == 3:
                    if len(partes[0]) == 4:  # AAAA/MM/DD
                        dados['data_nascimento'] = f"{partes[2]}/{partes[1]}/{partes[0]}"
                    else:  # DD/MM/AAAA
                        dados['data_nascimento'] = data_raw.replace('-', '/').replace('.', '/')
                break
        
        # Procura por nome (mais inteligente)
        linhas = texto.split('\n')
        for linha in linhas:
            linha = linha.strip()
            if not linha or 'nome_completo' in dados:
                continue
            
            # Remove padrões conhecidos da linha
            linha_limpa = linha
            if cpf_match:
                linha_limpa = linha_limpa.replace(cpf_match.group(), '')
            if email_match:
                linha_limpa = linha_limpa.replace(email_match.group(), '')
            
            # Remove números e caracteres especiais
            linha_limpa = re.sub(r'[\d+()\-./]', '', linha_limpa).strip()
            
            # Se sobrou algo que parece nome
            if len(linha_limpa.split()) >= 2 and len(linha_limpa) > 5:
                dados['nome_completo'] = linha_limpa
                break
        
        return dados
    
    def _pedir_dados_individuais(self, resposta_usuario):
        """Coleta dados um por vez quando extração automática falha"""
        nome_usuario = self.memoria.get('nome_usuario', '')
        # Verifica se já tem alguns dados salvos
        if not self.memoria.get('coletando_dados_individual'):
            self.memoria['coletando_dados_individual'] = True
            self.memoria['dados_coletados'] = {}
            return {"response_message": f"Sem problemas, {nome_usuario}. Vou coletar seus dados um por vez. Primeiro, qual é o seu nome completo?", "new_state": "cadastro_awaiting_nome", "memory_data": self.memoria}
        
        # Se chegou aqui, é porque já estava coletando
        return {"response_message": f"Por favor, {nome_usuario}, me informe seu nome completo.", "new_state": "cadastro_awaiting_nome", "memory_data": self.memoria}

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
        horarios_formatados = [f"• *{h}*" for h in horarios['horarios_disponiveis'][:5]] # MOSTRANDO ATÉ 5
        horarios_str = "\n".join(horarios_formatados)
        
        # MENSAGEM DE VALORIZAÇÃO HUMANIZADA
        mensagem = (
            f"Ótima escolha, {nome_usuario}! A especialidade de *{especialidade_nome}* é uma das nossas referências. "
            f"O(A) Dr(a). *{self.memoria['medico_nome']}* é um(a) excelente profissional e tenho a certeza de que você estará em boas mãos.\n\n"
            f"Encontrei estes próximos horários disponíveis no dia *{data_formatada}*:\n\n"
            f"{horarios_str}\n\n"
            "Qual deles seria melhor para você? Se preferir outro dia ou turno, pode me dizer."
        )
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_slot_choice", "memory_data": self.memoria}

    # --- ROTEADOR PRINCIPAL DE ESTADOS ---
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
            'agendamento_awaiting_slot_confirmation': self.handle_awaiting_slot_confirmation, # NOVO ESTADO
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

    # --- HANDLERS DO FLUXO DE CONVERSA ---

    def handle_fallback(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        self.memoria.clear(); self.memoria['nome_usuario'] = nome_usuario
        return {"response_message": f"Desculpe, {nome_usuario}, perdi-me. Vamos recomeçar do início?", "new_state": "inicio", "memory_data": self.memoria}

    def handle_triagem_processar_sintomas(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        try:
            resultado_ia = self.chain_sintomas.invoke({"sintomas_do_usuario": resposta_usuario})
            especialidade_sugerida = resultado_ia.get('especialidade_sugerida')

            if not especialidade_sugerida or especialidade_sugerida == 'Nenhuma':
                return {"response_message": f"{nome_usuario}, com base no que me disse, não consegui identificar uma especialidade. Pode descrever os sintomas com mais detalhes?", "new_state": "triagem_processar_sintomas", "memory_data": self.memoria}

            especialidade_obj = self._get_especialidade_por_nome(especialidade_sugerida)
            if not especialidade_obj:
                 return {"response_message": f"{nome_usuario}, sugeri {especialidade_sugerida}, mas não encontrei na nossa lista de serviços. Vamos tentar de outra forma. Qual especialidade você procura?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

            self.memoria.update({'especialidade_id': especialidade_obj.id, 'especialidade_nome': especialidade_obj.nome, 'tipo_agendamento': 'Consulta'})
            
            mensagem = (
                f"Certo, {nome_usuario}. Baseado no que me contou, a especialidade mais indicada seria *{especialidade_sugerida}*.\n"
                "Lembre-se que esta é uma sugestão e não substitui uma avaliação médica.\n\n"
                "Vamos ver os horários disponíveis para você?"
            )
            # Transição direta para a busca de horários
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
        nome_usuario = self.memoria.get('nome_usuario', '')
        modalidade = "".join(resposta_usuario.strip().split()).capitalize()
        if modalidade not in ['Presencial', 'Telemedicina']: return {"response_message": f"Modalidade inválida, {nome_usuario}. Responda com *Presencial* ou *Telemedicina*.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        self.memoria['modalidade'] = modalidade
        especialidades = self._get_especialidades_from_db()
        self.memoria['lista_especialidades'] = especialidades
        nomes_especialidades = '\n'.join([f"• {esp['nome']}" for esp in especialidades])
        return {"response_message": f"Perfeito, {nome_usuario}. Temos estas especialidades:\n\n{nomes_especialidades}\n\nQual delas você deseja?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

    def handle_awaiting_specialty(self, resposta_usuario):
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
        resposta = resposta_usuario.lower()
        especialidade_id = self.memoria.get('especialidade_id')
        especialidade_nome = self.memoria.get('especialidade_nome')
        if 'criança' in resposta or 'filho' in resposta or 'filha' in resposta:
            self.memoria['agendamento_para_crianca'] = True
        else:
            self.memoria['agendamento_para_crianca'] = False
        return self._iniciar_busca_de_horarios(especialidade_id, especialidade_nome)

    def handle_awaiting_slot_choice(self, resposta_usuario):
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

        return {
            "response_message": f"Perfeito, {nome_usuario}! Deseja confirmar o pré-agendamento para o dia {data_obj.strftime('%d/%m/%Y')} às {horario_escolhido_str}? (Sim/Não)",
            "new_state": "agendamento_awaiting_slot_confirmation",
            "memory_data": self.memoria
        }

    def handle_awaiting_slot_confirmation(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        resposta = resposta_usuario.lower()
        if 'sim' not in resposta:
            self.memoria.pop('data_hora_inicio', None)
            return {
                "response_message": f"Entendido, {nome_usuario}, o pré-agendamento foi cancelado. Posso ajudar com outros horários ou algo mais?",
                "new_state": "identificando_demanda",
                "memory_data": self.memoria
            }

        mensagem_valorizacao = f"Ótimo, {nome_usuario}! Para continuarmos com a sua reserva, preciso de alguns dados."
        
        if self.memoria.get('agendamento_para_crianca'):
            mensagem_coleta_dados = (
                "Para finalizarmos o agendamento da criança, preciso das seguintes informações:\n\n"
                "👶 *Dados da criança:*\n"
                "• Nome completo da criança\n"
                "• Data de nascimento (DD/MM/AAAA)\n\n"
                "👤 *Dados do responsável:*\n"
                "• Seu nome completo\n"
                "• Seu CPF (formato: XXX.XXX.XXX-XX)\n"
                "• Seu grau de parentesco (pai, mãe, etc.)\n"
                "• Seu telefone com DDD (formato: +55 11 99999-9999)\n"
                "• Seu e-mail"
            )
            novo_estado = "cadastro_awaiting_child_data"
        else:
            mensagem_coleta_dados = (
                "Para finalizarmos o seu agendamento, preciso de algumas informações:\n\n"
                "👤 *Dados do paciente:*\n"
                "• Nome completo\n"
                "• Data de nascimento (DD/MM/AAAA)\n"
                "• CPF (formato: XXX.XXX.XXX-XX)\n\n"
                "📞 *Dados de contato:*\n"
                "• Telefone com DDD (formato: +55 11 99999-9999)\n"
                "• E-mail"
            )
            novo_estado = "cadastro_awaiting_adult_data"
        
        resposta_final = f"{mensagem_valorizacao}\n\n{mensagem_coleta_dados}"
        return {"response_message": resposta_final, "new_state": novo_estado, "memory_data": self.memoria}

    def handle_cadastro_awaiting_adult_data(self, resposta_usuario):
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"[CADASTRO ADULTO] Iniciando. Mensagem recebida: '{resposta_usuario[:100]}...'")

        # --- Etapa de Pré-processamento ---
        linhas = resposta_usuario.strip().split('\n')
        dados_preprocessados = []
        numeros_encontrados = []
        for linha in linhas:
            linha_limpa = linha.strip()
            numeros_linha = re.sub(r'[\s./-]', '', linha_limpa)
            if "@" in linha_limpa and "." in linha_limpa:
                dados_preprocessados.append(f"Email: {linha_limpa}")
            elif re.match(r'^\d{1,2}/\d{1,2}/\d{4}$', linha_limpa):
                dados_preprocessados.append(f"Data de Nascimento: {linha_limpa}")
            elif numeros_linha.isdigit():
                numeros_encontrados.append(numeros_linha)
            else:
                dados_preprocessados.append(f"Nome Completo: {linha_limpa}")
        if len(numeros_encontrados) >= 1:
            # Assumimos o primeiro número de 11 dígitos como CPF e o segundo como telefone
            cpf_achado = False
            for num in numeros_encontrados:
                if len(num) == 11 and not cpf_achado:
                    dados_preprocessados.append(f"CPF: {num}")
                    cpf_achado = True
                elif len(num) >= 10:
                    dados_preprocessados.append(f"Telefone: {num}")
        texto_para_ia = "\n".join(dados_preprocessados)
        logger.warning(f"[CADASTRO ADULTO] Texto pré-processado para IA: {texto_para_ia}")
        # --- Fim do Pré-processamento ---

        dados_extraidos = {}
        # --- LÓGICA DE EXTRAÇÃO BLINDADA ---
        if self.chain_extracao_dados:
            try:
                # A chamada de alto risco é isolada aqui
                dados_extraidos = self.chain_extracao_dados.invoke({"dados_do_usuario": texto_para_ia})
                logger.warning(f"[CADASTRO ADULTO] IA extraiu com sucesso: {dados_extraidos}")
            except Exception as e:
                # Se a IA falhar por QUALQUER motivo, usamos o método manual como fallback
                logger.error(f"[CADASTRO ADULTO] ERRO CRÍTICO na chamada da IA: {e}. Usando fallback manual.")
                dados_extraidos = self._extrair_dados_manual(resposta_usuario)
        else:
            dados_extraidos = self._extrair_dados_manual(resposta_usuario)
        # --- FIM DA LÓGICA BLINDADA ---

        if not dados_extraidos or not any(dados_extraidos.values()):
            logger.warning("[CADASTRO ADULTO] Nenhuma informação extraída. Solicitando dados individuais.")
            return self._pedir_dados_individuais(resposta_usuario)

        # O restante da lógica de validação
        nome = (dados_extraidos.get('nome_completo') or dados_extraidos.get('nome') or '').strip()
        data_nasc = (dados_extraidos.get('data_nascimento') or '').strip()
        cpf = (dados_extraidos.get('cpf') or '').strip()
        telefone = (dados_extraidos.get('telefone_celular') or dados_extraidos.get('telefone') or '').strip()
        email = (dados_extraidos.get('email') or '').strip()
        
        logger.warning(f"[CADASTRO ADULTO] Dados brutos para validação: nome='{nome}', data='{data_nasc}', cpf='{cpf}', tel='{telefone}', email='{email}'")
        nome_usuario = self.memoria.get('nome_usuario', '')
        
        if not (nome and len(nome.split()) > 1):
            logger.error(f"[CADASTRO ADULTO] FALHA NA VALIDAÇÃO: Nome inválido -> '{nome}'")
            return {"response_message": f"{nome_usuario}, por favor, informe o seu nome completo (nome e apelido).", "new_state": "cadastro_awaiting_adult_data", "memory_data": self.memoria}
        if not validar_data_nascimento_formato(data_nasc):
            logger.error(f"[CADASTRO ADULTO] FALHA NA VALIDAÇÃO: Data de nascimento inválida -> '{data_nasc}'")
            return {"response_message": f"{nome_usuario}, a data de nascimento é inválida. Use o formato DD/MM/AAAA e não pode ser uma data futura.", "new_state": "cadastro_awaiting_adult_data", "memory_data": self.memoria}
        if not validar_cpf_formato(cpf):
            logger.error(f"[CADASTRO ADULTO] FALHA NA VALIDAÇÃO: CPF inválido -> '{cpf}'")
            return {"response_message": f"O CPF é inválido, {nome_usuario}. Ele deve conter 11 dígitos. Use o formato XXX.XXX.XXX-XX se preferir.", "new_state": "cadastro_awaiting_adult_data", "memory_data": self.memoria}
        if not validar_telefone_formato(telefone):
            logger.error(f"[CADASTRO ADULTO] FALHA NA VALIDAÇÃO: Telefone inválido -> '{telefone}'")
            return {"response_message": f"O telefone é inválido, {nome_usuario}. Use o formato com DDD, por exemplo: 11 99999-9999.", "new_state": "cadastro_awaiting_adult_data", "memory_data": self.memoria}
        if not validar_email_formato(email):
            logger.error(f"[CADASTRO ADULTO] FALHA NA VALIDAÇÃO: Email inválido -> '{email}'")
            return {"response_message": f"O e-mail parece inválido, {nome_usuario}. Por favor, verifique e envie novamente.", "new_state": "cadastro_awaiting_adult_data", "memory_data": self.memoria}

        logger.warning("[CADASTRO ADULTO] SUCESSO: Todos os dados foram validados. Prosseguindo para pagamento.")
        
        self.memoria['nome_completo'] = nome.title()
        self.memoria['data_nascimento'] = data_nasc
        self.memoria['cpf'] = re.sub(r'\D', '', cpf)
        self.memoria['telefone_celular'] = re.sub(r'\D', '', telefone)
        self.memoria['email'] = email
        
        primeiro_nome = nome.title().split(' ')[0]
        mensagem = (
            f"Ótimo, {primeiro_nome}! Seus dados foram recebidos. Aqui na Clínica Limalé, prezamos por um atendimento de excelência e o seu conforto é nossa prioridade.\n\n"
            "Como prefere pagar para confirmar sua vaga? 💳\n\n"
            f"1️⃣ *PIX* - 5% de desconto 🎉\n"
            f"2️⃣ *Cartão de Crédito* - Até 3x sem juros 💳\n\n"
            f"Digite *1* para PIX ou *2* para Cartão."
        )
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}


    def handle_cadastro_nome(self, resposta_usuario):
        nome = resposta_usuario.strip()
        if len(nome.split()) < 2:
            return {"response_message": "Por favor, informe seu nome completo (nome e sobrenome).", "new_state": "cadastro_awaiting_nome", "memory_data": self.memoria}
        
        self.memoria['dados_coletados']['nome_completo'] = nome.title()
        return {"response_message": "Perfeito! Agora me informe sua data de nascimento (DD/MM/AAAA):", "new_state": "cadastro_awaiting_data_nasc", "memory_data": self.memoria}
    
    def handle_cadastro_data_nasc(self, resposta_usuario):
        data = resposta_usuario.strip()
        if not validar_data_nascimento_formato(data):
            return {"response_message": "Data inválida. Use o formato DD/MM/AAAA (ex: 15/03/1990):", "new_state": "cadastro_awaiting_data_nasc", "memory_data": self.memoria}
        
        self.memoria['dados_coletados']['data_nascimento'] = data
        return {"response_message": "Certo! Agora me informe seu CPF (apenas números ou com pontuação):", "new_state": "cadastro_awaiting_cpf", "memory_data": self.memoria}
    
    def handle_cadastro_cpf(self, resposta_usuario):
        cpf = resposta_usuario.strip()
        if not validar_cpf_formato(cpf):
            return {"response_message": "CPF inválido. Digite apenas os 11 números ou no formato XXX.XXX.XXX-XX:", "new_state": "cadastro_awaiting_cpf", "memory_data": self.memoria}
        
        self.memoria['dados_coletados']['cpf'] = re.sub(r'\D', '', cpf)
        return {"response_message": "Perfeito! Agora me informe seu telefone com DDD:", "new_state": "cadastro_awaiting_telefone", "memory_data": self.memoria}
    
    def handle_cadastro_telefone(self, resposta_usuario):
        telefone = resposta_usuario.strip()
        if not validar_telefone_formato(telefone):
            return {"response_message": "Telefone inválido. Digite com DDD (ex: 11999998888 ou (11) 99999-8888):", "new_state": "cadastro_awaiting_telefone", "memory_data": self.memoria}
        
        self.memoria['dados_coletados']['telefone_celular'] = re.sub(r'\D', '', telefone)
        return {"response_message": "Quase pronto! Por último, me informe seu email:", "new_state": "cadastro_awaiting_email", "memory_data": self.memoria}
    
    def handle_cadastro_email(self, resposta_usuario):
        email = resposta_usuario.strip().lower()
        if not validar_email_formato(email):
            return {"response_message": "Email inválido. Digite um email válido (ex: seuemail@gmail.com):", "new_state": "cadastro_awaiting_email", "memory_data": self.memoria}
        
        # Transfere dados coletados para memória principal
        dados = self.memoria['dados_coletados']
        self.memoria['nome_completo'] = dados['nome_completo']
        self.memoria['data_nascimento'] = dados['data_nascimento']
        self.memoria['cpf'] = dados['cpf']
        self.memoria['telefone_celular'] = dados['telefone_celular']
        self.memoria['email'] = email
        
        # Limpa dados temporários
        del self.memoria['coletando_dados_individual']
        del self.memoria['dados_coletados']
        
        primeiro_nome = dados['nome_completo'].split(' ')[0]
        mensagem = (
            f"Ótimo, {primeiro_nome}! Seus dados foram recebidos. Aqui na Clínica Limalé, prezamos por um atendimento de excelência e o seu conforto é nossa prioridade.\n\n"
            "Como prefere pagar para confirmar sua vaga? 💳\n\n"
            f"1️⃣ *PIX* - 5% de desconto 🎉\n"
            f"2️⃣ *Cartão de Crédito* - Até 3x sem juros 💳\n\n"
            f"Digite *1* para PIX ou *2* para Cartão."
        )
        return {"response_message": mensagem, "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}

    def handle_cadastro_awaiting_child_data(self, resposta_usuario):
        # A lógica de extração para crianças é mais complexa e pode ser ajustada
        # Por enquanto, vamos manter uma extração simples baseada em regex ou IA mais específica
        # (Este handler precisa de ser totalmente implementado com a mesma robustez do de adulto)
        return {"response_message": "Handler de criança a ser implementado.", "new_state": "inicio", "memory_data": self.memoria}
        
    def handle_awaiting_payment_choice(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        escolha = resposta_usuario.lower().strip()
        
        if 'pix' in escolha or escolha == '1':
            self.memoria['metodo_pagamento_escolhido'] = 'PIX'
            return self.handle_awaiting_confirmation("confirmado")
        
        elif 'cartão' in escolha or 'cartao' in escolha or escolha == '2':
            # Pergunta sobre parcelamento
            mensagem_parcelamento = (
                f"Perfeito, {nome_usuario}! Cartão de crédito selecionado. 💳\n\n"
                "Como deseja pagar?\n\n"
                "1️⃣ *À vista* (sem juros)\n"
                "2️⃣ *2x sem juros*\n"
                "3️⃣ *3x sem juros*\n\n"
                "Digite o número da opção desejada."
            )
            self.memoria['metodo_pagamento_escolhido'] = 'CartaoCredito'
            return {"response_message": mensagem_parcelamento, "new_state": "agendamento_awaiting_installments", "memory_data": self.memoria}
        
        else:
            return {"response_message": f"Não entendi, {nome_usuario}. Por favor, digite *1* para PIX ou *2* para Cartão.", "new_state": "agendamento_awaiting_payment_choice", "memory_data": self.memoria}
    
    def handle_awaiting_installments(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', '')
        escolha = resposta_usuario.strip()
        
        if escolha == '1':
            self.memoria['parcelas'] = 1
        elif escolha == '2':
            self.memoria['parcelas'] = 2
        elif escolha == '3':
            self.memoria['parcelas'] = 3
        else:
            return {"response_message": f"Opção inválida, {nome_usuario}. Digite *1* (à vista), *2* (2x) ou *3* (3x).", "new_state": "agendamento_awaiting_installments", "memory_data": self.memoria}
        
        # Continua para confirmação
        return self.handle_awaiting_confirmation("confirmado")

    def handle_awaiting_confirmation(self, resposta_usuario):
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"[CONFIRMACAO] Iniciando confirmação com memória: {self.memoria}")
        
        try:
            cpf_limpo = self.memoria.get('cpf')
            logger.warning(f"[CONFIRMACAO] CPF: {cpf_limpo}")
            
            # Garante que temos um paciente para associar ao agendamento
            email_paciente = self.memoria.get('email', '')
            if not email_paciente:
                email_paciente = None  # Para evitar string vazia que pode causar erro de unique
            
            logger.warning(f"[CONFIRMACAO] Criando paciente com dados: nome={self.memoria.get('nome_completo')}, email={email_paciente}, tel={self.memoria.get('telefone_celular')}, data={self.memoria.get('data_nascimento')}")
            
            paciente, created = Paciente.objects.get_or_create(
                cpf=cpf_limpo,
                defaults={
                    'nome_completo': self.memoria.get('nome_completo', ''),
                    'email': email_paciente,
                    'telefone_celular': self.memoria.get('telefone_celular', ''),
                    'data_nascimento': datetime.strptime(self.memoria.get('data_nascimento'), '%d/%m/%Y').date()
                }
            )
            logger.warning(f"[CONFIRMACAO] Paciente {'criado' if created else 'encontrado'}: {paciente.id}")
            # Se o paciente já existia, atualiza os dados dele
            if not created:
                paciente.nome_completo = self.memoria.get('nome_completo', paciente.nome_completo)
                if email_paciente:
                    paciente.email = email_paciente
                paciente.telefone_celular = self.memoria.get('telefone_celular', paciente.telefone_celular)
                paciente.data_nascimento = datetime.strptime(self.memoria.get('data_nascimento'), '%d/%m/%Y').date()
                paciente.save()

            dados_agendamento = {
                'paciente': paciente.id,
                'data_hora_inicio': self.memoria.get('data_hora_inicio'),
                'status': 'Agendado',
                'tipo_agendamento': self.memoria.get('tipo_agendamento'),
                'tipo_atendimento': 'Particular'
            }
            if self.memoria.get('tipo_agendamento') == 'Consulta':
                duracao = 50
                dados_agendamento.update({
                    'especialidade': self.memoria.get('especialidade_id'),
                    'medico': self.memoria.get('medico_id'),
                    'modalidade': self.memoria.get('modalidade')
                })
            else: # Procedimento
                duracao = 60
                dados_agendamento.update({
                    'procedimento': self.memoria.get('procedimento_id'),
                    'modalidade': 'Presencial'
                })
            
            data_hora_inicio_obj = datetime.fromisoformat(self.memoria.get('data_hora_inicio'))
            dados_agendamento['data_hora_fim'] = (data_hora_inicio_obj + timedelta(minutes=duracao)).isoformat()

            serializer = AgendamentoWriteSerializer(data=dados_agendamento)
            if not serializer.is_valid():
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
            
            mensagem_confirmacao = (
                f"✅ *Confirmação de Pré-Agendamento*\n\n"
                f"Olá, {nome_paciente_formatado}! O seu horário foi reservado com sucesso.\n\n"
                f"*{agendamento.get_tipo_agendamento_display()} de {self.memoria.get('especialidade_nome') or self.memoria.get('procedimento_nome')}*\n"
                f"Com o(a) Dr(a). *{self.memoria.get('medico_nome')}*\n"
                f"🗓️ *Data:* {data_agendamento_fmt}\n"
                f"⏰ *Hora:* {hora_agendamento_fmt}\n\n"
            )

            secao_pagamento = "Seu agendamento foi pré-realizado. Por favor, entre em contacto com a clínica para finalizar o pagamento."
            if metodo_pagamento == 'PIX' and hasattr(pagamento, 'pix_copia_e_cola') and pagamento.pix_copia_e_cola:
                valor_com_desconto = pagamento.valor * 0.95
                secao_pagamento = (
                    f"Para confirmar, realize o pagamento via PIX com *5% de desconto*.\n\n"
                    f"*Valor com desconto:* R$ {valor_com_desconto:.2f}\n"
                    f"*Chave PIX (Copia e Cola):*\n`{pagamento.pix_copia_e_cola}`\n\n"
                    "Após o pagamento, o seu horário será confirmado automaticamente. Estamos ansiosos para recebê-lo(a)!"
                )
            elif metodo_pagamento == 'CartaoCredito' and hasattr(pagamento, 'link_pagamento') and pagamento.link_pagamento:
                parcelas = self.memoria.get('parcelas', 1)
                if parcelas == 1:
                    texto_parcelas = "à vista"
                else:
                    texto_parcelas = f"em {parcelas}x sem juros"
                secao_pagamento = f"Clique no link para pagar com *Cartão de Crédito {texto_parcelas}* e confirmar o seu horário:\n{pagamento.link_pagamento}"
            elif metodo_pagamento == 'CartaoCredito':
                parcelas = self.memoria.get('parcelas', 1)
                if parcelas == 1:
                    texto_parcelas = "à vista"
                else:
                    texto_parcelas = f"em {parcelas}x sem juros"
                secao_pagamento = f"Confirmado! O pagamento com cartão {texto_parcelas} será realizado no dia da consulta/exame. Por favor, chegue com 15 minutos de antecedência."


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