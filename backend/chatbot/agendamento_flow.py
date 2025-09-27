import os
import requests
import re
from datetime import datetime, timedelta

# --- 1. IMPORTE SEUS MODELOS AQUI ---
from usuarios.models import Especialidade, CustomUser # Assumindo o caminho dos seus apps
from faturamento.models import Procedimento # Se precisar no futuro
from agendamentos.services import buscar_proximo_horario_disponivel
from pacientes.models import Paciente
from agendamentos.serializers import AgendamentoWriteSerializer
from agendamentos.services import criar_agendamento_e_pagamento_pendente
from pacientes.models import Paciente
from usuarios.models import CustomUser # Para buscar o usuário de serviço
import json

class AgendamentoManager:
    def __init__(self, session_id, memoria, base_url):
        self.session_id = session_id
        self.memoria = memoria
        # O base_url e a API Key ainda são úteis para APIs externas, então mantemos
        self.base_url = base_url.rstrip('/')
        self.api_key = os.getenv('API_KEY_CHATBOT')
        self.headers = {'Api-Key': self.api_key}

    # Esta função agora é para APIs EXTERNAS, se precisar no futuro.
    # Não a usaremos para buscar dados internos.
    def _chamar_api_externa(self, endpoint, method='GET', data=None, params=None):
        url = f"{self.base_url}/api/chatbot/{endpoint}/"
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=self.headers, params=params, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=self.headers, json=data, timeout=30)
            
            if response.status_code == 404:
                return None
                
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Erro ao chamar API externa ({url}): {e}")
            return {"error": str(e)}

    # --- 2. CRIE FUNÇÕES PRIVADAS PARA BUSCAR DADOS NO BANCO ---
    def _get_especialidades_from_db(self):
        """Busca especialidades diretamente do banco de dados."""
        try:
            # .values() é mais eficiente pois retorna dicionários,
            # que é exatamente o que a API retornaria.
            especialidades = Especialidade.objects.all().values('id', 'nome')
            return list(especialidades) # Converte o QuerySet para uma lista
        except Exception as e:
            print(f"Erro ao buscar especialidades no banco: {e}")
            return None
            
    def _get_medicos_from_db(self, especialidade_id):
        """Busca médicos de uma especialidade diretamente do banco."""
        try:
            # A MUDANÇA É APENAS AQUI
            medicos = CustomUser.objects.filter(
                cargo='medico',
                especialidades__id=especialidade_id  # DE: especialidade_id=... PARA: especialidades__id=...
            ).values('id', 'first_name', 'last_name')
              
            # Apenas para debug, podemos remover depois
            print(f"Buscando médicos para especialidade ID: {especialidade_id}. Encontrados: {list(medicos)}")

            return list(medicos)
        except Exception as e:
            print(f"Erro ao buscar médicos no banco: {e}")
            return None

    # O processar continua o mesmo
    def processar(self, resposta_usuario, estado_atual):
        # ... (sem alterações aqui)
        handlers = {
            'agendamento_inicio': self.handle_inicio,
            'agendamento_awaiting_type': self.handle_awaiting_type,
            'agendamento_awaiting_modality': self.handle_awaiting_modality,
            'agendamento_awaiting_specialty': self.handle_awaiting_specialty,
            'agendamento_awaiting_slot_choice': self.handle_awaiting_slot_choice,
            'agendamento_awaiting_cpf': self.handle_awaiting_cpf,
            'agendamento_awaiting_new_patient_email': self.handle_awaiting_new_patient_email,
            'agendamento_awaiting_new_patient_nome': self.handle_awaiting_new_patient_nome,
            'agendamento_awaiting_confirmation': self.handle_awaiting_confirmation,
        }
        handler = handlers.get(estado_atual, self.handle_fallback)
        return handler(resposta_usuario)

    def handle_fallback(self, resposta_usuario):
        return {
            "response_message": "Desculpe, me perdi na nossa conversa. Vamos recomeçar do zero.",
            "new_state": "inicio",
            "memory_data": {'nome_usuario': self.memoria.get('nome_usuario')} # Preserva apenas o nome
        }
        
    def handle_inicio(self, resposta_usuario):
        nome_usuario = self.memoria.get('nome_usuario', 'tudo bem')
        self.memoria.clear() 
        self.memoria['nome_usuario'] = nome_usuario
        
        return {
            "response_message": f"Vamos lá, {nome_usuario}! Você gostaria de agendar uma *Consulta* ou um *Procedimento* (como exames)?",
            "new_state": "agendamento_awaiting_type",
            "memory_data": self.memoria
        }

    def handle_awaiting_type(self, resposta_usuario):
        escolha = resposta_usuario.lower()
        
        if 'consulta' in escolha:
            self.memoria['tipo_agendamento'] = 'Consulta'
            return {
                "response_message": "Entendido, consulta. O atendimento será *Presencial* ou por *Telemedicina*?",
                "new_state": "agendamento_awaiting_modality",
                "memory_data": self.memoria
            }
        elif 'procedimento' in escolha:
            # Lógica para procedimento (pode ser implementada de forma similar)
            return {"response_message": "A função de agendamento de procedimentos ainda está em desenvolvimento. Vamos focar em consultas por enquanto.", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}
        else:
            return {"response_message": "Não entendi. Por favor, diga 'Consulta' ou 'Procedimento'.", "new_state": "agendamento_awaiting_type", "memory_data": self.memoria}

    def handle_awaiting_modality(self, resposta_usuario):
        modalidade = "".join(resposta_usuario.strip().split()).capitalize()

        if modalidade not in ['Presencial', 'Telemedicina']:
            return {"response_message": "Modalidade inválida. Por favor, responda com *Presencial* ou *Telemedicina*.", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}

        self.memoria['modalidade'] = modalidade
        
        # TROCA: Sai a chamada de API, entra a consulta direta ao banco
        especialidades = self._get_especialidades_from_db()
        
        if not especialidades:
            return {"response_message": "Desculpe, estou com problemas para carregar as especialidades. Tente novamente mais tarde.", "new_state": "inicio", "memory_data": self.memoria}

        self.memoria['lista_especialidades'] = especialidades
        nomes_especialidades = '\n'.join([f"• {esp['nome']}" for esp in especialidades])
        
        return {
            "response_message": f"Perfeito, atendimento {modalidade}. Temos estas especialidades:\n\n{nomes_especialidades}\n\nQual delas você deseja?",
            "new_state": "agendamento_awaiting_specialty",
            "memory_data": self.memoria
        }

    def handle_awaiting_specialty(self, resposta_usuario):
        # ... (lógica para encontrar médico é a mesma) ...
        especialidade_escolhida = next((esp for esp in self.memoria.get('lista_especialidades', []) if resposta_usuario.lower() in esp['nome'].lower() or esp['nome'].lower() in resposta_usuario.lower()), None)
        if not especialidade_escolhida: # ... (retorna erro)
            return {"response_message": "Não encontrei essa especialidade...", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}
        
        self.memoria['especialidade_id'] = especialidade_escolhida['id']
        self.memoria['especialidade_nome'] = especialidade_escolhida['nome']
        medicos = self._get_medicos_from_db(especialidade_id=especialidade_escolhida['id'])
        if not medicos: # ... (retorna erro)
            return {"response_message": f"Não encontrei médicos para {especialidade_escolhida['nome']}.", "new_state": "inicio", "memory_data": self.memoria}
        
        medico = medicos[0] # Pega o primeiro por padrão
        self.memoria['medico_id'] = medico['id']
        self.memoria['medico_nome'] = f"{medico['first_name']} {medico['last_name']}"

        # MUDANÇA: AGORA BUSCAMOS O PRIMEIRO DIA DISPONÍVEL
        horarios = buscar_proximo_horario_disponivel(medico_id=medico['id'])
        
        if not horarios or not horarios.get('horarios_disponiveis'):
            return {"response_message": f"Infelizmente, não há horários disponíveis para Dr(a). {self.memoria['medico_nome']} nos próximos 90 dias...", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria}
        
        # Guardamos os horários encontrados na memória para validar a escolha depois
        self.memoria['horarios_ofertados'] = horarios
        
        data_sugerida = horarios['data']
        lista_horarios = horarios['horarios_disponiveis']
        
        data_formatada = datetime.strptime(data_sugerida, '%Y-%m-%d').strftime('%d/%m/%Y')
        
        # Montamos a mensagem com as opções
        horarios_str = ", ".join(lista_horarios)
        mensagem = (
            f"Ótimo! Para Dr(a). *{self.memoria['medico_nome']}*, encontrei os seguintes horários disponíveis no dia *{data_formatada}*:\n\n"
            f"*{horarios_str}*\n\n"
            "Qual horário você prefere? (Ex: 09:30)"
        )

        return {
            "response_message": mensagem,
            "new_state": "agendamento_awaiting_slot_choice", # VAMOS PARA O NOVO ESTADO
            "memory_data": self.memoria
        }

    # --- NOVO HANDLER PARA PROCESSAR A ESCOLHA ---
    def handle_awaiting_slot_choice(self, resposta_usuario):
        # Limpa a resposta do usuário para um formato padrão HH:MM
        try:
            # Tenta converter a resposta para um objeto de tempo e formata de volta
            hora_obj = datetime.strptime(resposta_usuario.strip(), '%H:%M')
            horario_escolhido_str = hora_obj.strftime('%H:%M')
        except ValueError:
            # Se o usuário digitar algo que não é um horário, a validação abaixo vai falhar
            horario_escolhido_str = resposta_usuario.strip()

        horarios_ofertados = self.memoria.get('horarios_ofertados', {})
        lista_horarios_validos = horarios_ofertados.get('horarios_disponiveis', [])

        if horario_escolhido_str not in lista_horarios_validos:
            horarios_validos_str = ", ".join(lista_horarios_validos)
            return {
                "response_message": f"Hum, não encontrei o horário '{resposta_usuario.strip()}' na lista. Por favor, escolha um destes: {horarios_validos_str}",
                "new_state": "agendamento_awaiting_slot_choice",
                "memory_data": self.memoria
            }
        
        data_sugerida = horarios_ofertados['data']
        self.memoria['data_hora_inicio'] = f"{data_sugerida}T{horario_escolhido_str}"

        return {
            "response_message": "Perfeito, horário anotado! Para confirmar seu agendamento, por favor, me informe seu *CPF*.",
            "new_state": "agendamento_awaiting_cpf",
            "memory_data": self.memoria
        }

    # AJUSTE 2: CORRIGIR A CHAMADA DA API DE VERIFICAÇÃO DE CPF
    def handle_awaiting_cpf(self, resposta_usuario):
        cpf = re.sub(r'\D', '', resposta_usuario)
        if len(cpf) != 11:
            return {"response_message": "CPF inválido. Por favor, digite os 11 números.", "new_state": "agendamento_awaiting_cpf", "memory_data": self.memoria}
        
        self.memoria['cpf'] = cpf
        
        # REMOVEMOS A CHAMADA DE API E VERIFICAMOS DIRETO NO BANCO
        paciente_existe = Paciente.objects.filter(cpf=cpf).exists()

        if paciente_existe:
            # Paciente encontrado!
            paciente = Paciente.objects.get(cpf=cpf)
            nome_paciente = paciente.nome_completo.split(' ')[0] # Pega o primeiro nome
            
            # Atualiza a memória com o nome do paciente para uso futuro
            self.memoria['nome_usuario'] = nome_paciente
            
            mensagem = f"Olá, {nome_paciente}! Encontrei seu cadastro. Vamos finalizar seu agendamento."
            # AQUI VOCÊ PODE IR DIRETO PARA O PAGAMENTO OU FAZER UMA ÚLTIMA CONFIRMAÇÃO
            # Por enquanto, vamos direto para a criação do agendamento
            return self.handle_awaiting_confirmation(mensagem)
        else:
            # Paciente não encontrado, iniciar cadastro
            return {
                "response_message": "Vi que você é novo por aqui! Para criar seu cadastro, qual seu nome completo?",
                "new_state": "agendamento_awaiting_new_patient_nome",
                "memory_data": self.memoria
            }

    def handle_awaiting_new_patient_nome(self, resposta_usuario):
        self.memoria['nome_completo'] = resposta_usuario.strip().title()
        return {
            "response_message": f"Obrigado, {self.memoria['nome_completo']}. Agora, por favor, me informe o seu melhor *e-mail*.",
            "new_state": "agendamento_awaiting_new_patient_email",
            "memory_data": self.memoria
        }

    def handle_awaiting_new_patient_email(self, resposta_usuario):
        email = resposta_usuario.strip().lower()
        # Validação simples de email
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
             return {"response_message": "Este e-mail não parece válido. Por favor, verifique e digite novamente.", "new_state": "agendamento_awaiting_new_patient_email", "memory_data": self.memoria}
        
        self.memoria['email'] = email
        
        dados_cadastro = {
            "nome_completo": self.memoria['nome_completo'],
            "email": self.memoria['email'],
            "cpf": self.memoria['cpf'],
            "telefone_celular": self.session_id # Usando o session_id como telefone
        }
        
        resultado = self._chamar_api('pacientes/cadastrar', method='POST', data=dados_cadastro)
        if not resultado or 'error' in resultado:
            return {"response_message": f"Tive um problema ao criar seu cadastro: {resultado.get('error', 'Erro desconhecido')}. Vamos tentar de novo. Qual seu CPF?", "new_state": "agendamento_awaiting_cpf", "memory_data": self.memoria}

        self.memoria['paciente_id'] = resultado.get('paciente_id')
        
        # Após cadastrar, vamos para a confirmação do agendamento
        return self.handle_awaiting_confirmation("sim")


    def handle_awaiting_confirmation(self, resposta_usuario):
        try:
            # --- LÓGICA DE CRIAÇÃO DO AGENDAMENTO (AGORA INTERNA) ---
            
            # Monta os dados necessários para o serializer
            dados_agendamento = {
                'paciente': Paciente.objects.get(cpf=self.memoria.get('cpf')).id,
                'data_hora_inicio': self.memoria.get('data_hora_inicio'),
                # A duração da consulta agora é calculada com base no que definimos antes
                'data_hora_fim': datetime.fromisoformat(self.memoria.get('data_hora_inicio')) + timedelta(minutes=50),
                'status': 'Agendado',
                'tipo_agendamento': self.memoria.get('tipo_agendamento'),
                'especialidade': self.memoria.get('especialidade_id'),
                'medico': self.memoria.get('medico_id'),
                'modalidade': self.memoria.get('modalidade'),
                'tipo_atendimento': 'Particular',
            }

            serializer = AgendamentoWriteSerializer(data=dados_agendamento)
            if not serializer.is_valid():
                # Se os dados forem inválidos por algum motivo, retorna erro
                error_messages = json.dumps(serializer.errors)
                return {"response_message": f"Desculpe, houve um erro ao validar os dados do agendamento: {error_messages}", "new_state": "inicio", "memory_data": self.memoria}

            agendamento = serializer.save()
            
            # Precisamos de um usuário para registrar o pagamento
            # Vamos pegar o primeiro superusuário como padrão
            usuario_servico = CustomUser.objects.filter(is_superuser=True).first()

            # Chama o serviço de pagamento diretamente
            criar_agendamento_e_pagamento_pendente(
                agendamento, 
                usuario_servico,
                initiated_by_chatbot=True
            )
            
            agendamento.refresh_from_db()

            # --- MONTAGEM DA RESPOSTA DE SUCESSO ---
            pagamento_associado = agendamento.pagamento
            dados_pagamento = {}

            if hasattr(pagamento_associado, 'pix_copia_e_cola') and pagamento_associado.pix_copia_e_cola:
                dados_pagamento['tipo'] = 'PIX'
                dados_pagamento['pix_copia_e_cola'] = pagamento_associado.pix_copia_e_cola
            elif hasattr(pagamento_associado, 'link_pagamento') and pagamento_associado.link_pagamento:
                dados_pagamento['tipo'] = 'CartaoCredito'
                dados_pagamento['link'] = pagamento_associado.link_pagamento
            
            resposta_final = f"Perfeito! Seu agendamento (ID: {agendamento.id}) foi pré-realizado. Para confirmar, realize o pagamento.\n\n"
            if dados_pagamento.get('tipo') == 'PIX':
                resposta_final += f"PIX Copia e Cola:\n`{dados_pagamento.get('pix_copia_e_cola')}`"
            elif dados_pagamento.get('tipo') == 'CartaoCredito':
                resposta_final += f"Link para pagamento com cartão:\n{dados_pagamento.get('link')}"
            
            return {
                "response_message": resposta_final,
                "new_state": "inicio",
                "memory_data": {'nome_usuario': self.memoria.get('nome_usuario')}
            }

        except Exception as e:
            # Captura qualquer erro inesperado e informa o usuário
            return {"response_message": f"Desculpe, ocorreu um erro inesperado ao finalizar seu agendamento: {str(e)}", "new_state": "inicio", "memory_data": self.memoria}