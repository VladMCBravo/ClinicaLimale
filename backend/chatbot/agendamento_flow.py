import os
import requests
import re
from datetime import datetime

# --- 1. IMPORTE SEUS MODELOS AQUI ---
from usuarios.models import Especialidade, CustomUser # Assumindo o caminho dos seus apps
from faturamento.models import Procedimento # Se precisar no futuro

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
        # ... (código da sua função _chamar_api original) ...
        pass

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
        especialidade_escolhida = next((esp for esp in self.memoria.get('lista_especialidades', []) if resposta_usuario.lower() in esp['nome'].lower() or esp['nome'].lower() in resposta_usuario.lower()), None)
        
        if not especialidade_escolhida:
            return {"response_message": "Não encontrei essa especialidade. Por favor, digite um nome da lista que te enviei.", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria}

        self.memoria['especialidade_id'] = especialidade_escolhida['id']
        self.memoria['especialidade_nome'] = especialidade_escolhida['nome']
        
        # TROCA: Sai a chamada de API, entra a consulta direta ao banco
        medicos = self._get_medicos_from_db(especialidade_id=especialidade_escolhida['id'])

        if not medicos:
            return { "response_message": f"Não encontrei médicos disponíveis para {especialidade_escolhida['nome']} no momento.", "new_state": "inicio", "memory_data": self.memoria }
        
        medico = medicos[0]
        self.memoria['medico_id'] = medico['id']
        self.memoria['medico_nome'] = f"{medico['first_name']} {medico['last_name']}"

        # A busca de horários disponíveis PODE continuar sendo uma API,
        # pois é uma lógica mais complexa. Vamos assumir que ela funciona.
        horarios = self._chamar_api_externa('agendamentos/horarios-disponiveis', params={'medico_id': medico['id']})
        
        if not horarios or not horarios.get('horarios_disponiveis') or "error" in horarios:
            return { "response_message": f"Infelizmente, não há horários disponíveis para Dr(a). {self.memoria['medico_nome']} nos próximos 90 dias. Gostaria de tentar outra especialidade?", "new_state": "agendamento_awaiting_modality", "memory_data": self.memoria }
        
        data_sugerida = horarios['data']
        horario_sugerido = horarios['horarios_disponiveis'][0]
        self.memoria['data_hora_inicio'] = f"{data_sugerida}T{horario_sugerido}"
        
        data_formatada = datetime.strptime(data_sugerida, '%Y-%m-%d').strftime('%d/%m/%Y')

        mensagem = (
            f"Ótima escolha! Encontrei um horário para *{especialidade_escolhida['nome']}* com Dr(a). *{self.memoria['medico_nome']}* "
            f"no dia *{data_formatada} às {horario_sugerido}*.\n\n"
            "Para continuarmos, por favor, me informe o seu *CPF*."
        )
        return {
            "response_message": mensagem,
            "new_state": "agendamento_awaiting_cpf",
            "memory_data": self.memoria
        }

    def handle_awaiting_cpf(self, resposta_usuario):
        cpf = re.sub(r'\D', '', resposta_usuario)
        if len(cpf) != 11:
            return {"response_message": "CPF inválido. Por favor, digite os 11 números.", "new_state": "agendamento_awaiting_cpf", "memory_data": self.memoria}
        
        self.memoria['cpf'] = cpf
        
        # Usando a view VerificarSegurancaView (poderia ser uma view de verificação mais simples)
        paciente = self._chamar_api('pacientes/verificar-seguranca', method='POST', data={'cpf': cpf, 'telefone_celular': self.session_id})

        if paciente and "status" in paciente and paciente["status"] == "verificado":
            # Paciente encontrado e verificado! Vamos direto para a confirmação.
             return self.handle_awaiting_confirmation("sim") # Pula para a confirmação final
        else:
            # Paciente não encontrado, vamos iniciar o cadastro
            return {
                "response_message": "Vi que você é novo por aqui! Para criar seu cadastro, qual seu *nome completo*?",
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
        # Aqui criamos o agendamento de fato
        dados_agendamento = {
            "cpf": self.memoria.get('cpf'),
            "data_hora_inicio": self.memoria.get('data_hora_inicio'),
            "tipo_agendamento": self.memoria.get('tipo_agendamento'),
            "especialidade_id": self.memoria.get('especialidade_id'),
            "medico_id": self.memoria.get('medico_id'),
            "modalidade": self.memoria.get('modalidade'),
            # Adicione metodo_pagamento_escolhido se o usuário puder escolher
        }
        
        resultado = self._chamar_api('agendamentos/criar', method='POST', data=dados_agendamento)
        
        if not resultado or 'error' in resultado:
             return {"response_message": f"Houve um erro ao criar seu agendamento: {resultado.get('error', 'Tente novamente')}", "new_state": "inicio", "memory_data": self.memoria}
        
        # Sucesso!
        agendamento_id = resultado.get('agendamento_id')
        pagamento = resultado.get('dados_pagamento', {})
        
        resposta_final = f"Perfeito! Seu agendamento (ID: {agendamento_id}) foi pré-realizado e agora só falta o pagamento para confirmar.\n\n"
        
        if pagamento.get('tipo') == 'PIX':
            resposta_final += "Aqui está o PIX para pagamento:\n\n"
            resposta_final += f"*Copia e Cola:*\n`{pagamento.get('pix_copia_e_cola')}`"
            # (O QR Code em base64 não pode ser enviado por texto, mas o link sim)
        elif pagamento.get('tipo') == 'CartaoCredito':
             resposta_final += f"Acesse o link a seguir para pagar com cartão de crédito:\n{pagamento.get('link')}"

        resposta_final += "\n\nObrigado por agendar conosco!"
        
        return {
            "response_message": resposta_final,
            "new_state": "inicio", # Reseta o fluxo
            "memory_data": {'nome_usuario': self.memoria.get('nome_usuario')} # Mantém só o nome
        }