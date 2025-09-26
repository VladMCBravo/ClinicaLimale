# chatbot/agendamento_flow.py - VERSÃO COM FLUXO INVERTIDO

import os
import requests
import re
from datetime import datetime

class AgendamentoManager:
    def __init__(self, session_id, memoria, base_url):
        self.session_id = session_id
        self.memoria = memoria
        self.base_url = base_url
        self.api_key = os.getenv('API_KEY_CHATBOT')
        self.headers = {'Api-Key': self.api_key}

    def _chamar_api(self, endpoint, method='GET', data=None, params=None):
        url = f"{self.base_url}api/chatbot/{endpoint}/"
        if method.upper() == 'GET':
            response = requests.get(url, headers=self.headers, params=params)
        elif method.upper() == 'POST':
            response = requests.post(url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()

    def processar(self, resposta_usuario):
        estado_atual = self.memoria.get('state', 'agendamento_inicio')

        handlers = {
            'agendamento_inicio': self.handle_inicio,
            'agendamento_awaiting_type': self.handle_awaiting_type,
            'agendamento_awaiting_specialty': self.handle_awaiting_specialty,
            # Adicionaremos os outros estados aqui (horário, confirmação, etc.)
            'agendamento_awaiting_final_data': self.handle_awaiting_final_data,
        }
        handler = handlers.get(estado_atual, self.handle_fallback)
        return handler(resposta_usuario)

    def handle_fallback(self, resposta_usuario):
        return {
            "response_message": "Desculpe, me perdi na nossa conversa sobre o agendamento. Vamos recomeçar.",
            "new_state": "agendamento_inicio",
            "memory_data": self.memoria
        }

    # --- NOVOS PASSOS DO FLUXO ---

    def handle_inicio(self, resposta_usuario):
        # #- NOVO PASSO 1 -# Pergunta o que o usuário deseja agendar.
        self.memoria.clear() # Limpa memória de agendamentos antigos
        return {
            "response_message": "Ótimo, vamos agendar! Você gostaria de marcar uma Consulta ou um Procedimento?",
            "new_state": "agendamento_awaiting_type",
            "memory_data": self.memoria
        }

    def handle_awaiting_type(self, resposta_usuario):
        # #- NOVO PASSO 2 -# Usuário escolhe entre Consulta e Procedimento.
        escolha = resposta_usuario.lower()
        if 'consulta' in escolha or '1' in escolha:
            self.memoria['tipo_agendamento'] = 'Consulta'
            especialidades = self._chamar_api('especialidades')
            self.memoria['lista_especialidades'] = especialidades
            nomes_especialidades = '\n'.join([f"• {esp['nome']}" for esp in especialidades])
            
            return {
                "response_message": f"Entendido, consulta. Temos estas especialidades:\n{nomes_especialidades}\n\nQual você deseja?",
                "new_state": "agendamento_awaiting_specialty",
                "memory_data": self.memoria
            }
        elif 'procedimento' in escolha or '2' in escolha:
            self.memoria['tipo_agendamento'] = 'Procedimento'
            # (A lógica para listar procedimentos viria aqui)
            return { "response_message": "Fluxo de procedimento ainda em construção.", "new_state": "inicio", "memory_data": {} }
        else:
            return {
                "response_message": "Não entendi. Por favor, escolha entre Consulta ou Procedimento.",
                "new_state": "agendamento_awaiting_type",
                "memory_data": self.memoria
            }

    def handle_awaiting_specialty(self, resposta_usuario):
        # #- NOVO PASSO 3 -# Usuário escolhe a especialidade, buscamos horários.
        especialidade_escolhida = None
        for esp in self.memoria.get('lista_especialidades', []):
            if resposta_usuario.lower() in esp['nome'].lower():
                especialidade_escolhida = esp
                break
        
        if not especialidade_escolhida:
            return {
                "response_message": "Não consegui identificar essa especialidade. Por favor, digite um nome da lista.",
                "new_state": "agendamento_awaiting_specialty",
                "memory_data": self.memoria
            }

        self.memoria['especialidade_id'] = especialidade_escolhida['id']
        self.memoria['especialidade_nome'] = especialidade_escolhida['nome']
        
        # Busca médicos e depois o próximo horário disponível
        medicos = self._chamar_api('medicos', params={'especialidade_id': especialidade_escolhida['id']})
        if not medicos:
            # (Tratamento de erro se não houver médicos)
            return { "response_message": "Nenhum médico encontrado para esta especialidade.", "new_state": "inicio", "memory_data": {} }
        
        medico = medicos[0] # Pega o primeiro médico por padrão
        self.memoria['medico_id'] = medico['id']
        self.memoria['medico_nome'] = f"{medico['first_name']} {medico['last_name']}"

        horarios = self._chamar_api('agendamentos/horarios-disponiveis', params={'medico_id': medico['id']})
        if not horarios or not horarios.get('horarios_disponiveis'):
            return { "response_message": "Não encontrei horários disponíveis para este médico.", "new_state": "inicio", "memory_data": {} }
        
        # Guarda a data e o horário na memória
        data_sugerida = horarios['data']
        horario_sugerido = horarios['horarios_disponiveis'][0]
        self.memoria['data_hora_agendamento'] = f"{data_sugerida}T{horario_sugerido}"
        
        # Formata a data para o usuário
        data_formatada = datetime.strptime(data_sugerida, '%Y-%m-%d').strftime('%d/%m/%Y')

        # #- ÚLTIMO PASSO ANTES DOS DADOS -# Apresenta o resumo e pede os dados.
        mensagem = (
            f"Ótima escolha! Encontrei um horário para {especialidade_escolhida['nome']} com Dr(a). {self.memoria['medico_nome']} "
            f"no dia {data_formatada} às {horario_sugerido}.\n\n"
            f"Para confirmarmos este horário para você, por favor, me informe o seu CPF."
        )
        return {
            "response_message": mensagem,
            "new_state": "agendamento_awaiting_final_data",
            "memory_data": self.memoria
        }
        
    def handle_awaiting_final_data(self, resposta_usuario):
        # #- PASSO FINAL -# Coleta o CPF e verifica/cadastra o paciente.
        cpf_limpo = re.sub(r'\D', '', resposta_usuario)
        if len(cpf_limpo) != 11:
            return {
                "response_message": "O CPF parece inválido. Por favor, digite novamente apenas os 11 números.",
                "new_state": "agendamento_awaiting_final_data",
                "memory_data": self.memoria
            }
        
        self.memoria['cpf'] = cpf_limpo
        
        # A lógica de verificar segurança e depois agendar viria aqui.
        # Por enquanto, vamos apenas confirmar.
        return {
            "response_message": "Perfeito! Agendamento pré-confirmado. Em breve finalizaremos a parte de pagamento.",
            "new_state": "inicio", # Finaliza o fluxo por enquanto
            "memory_data": self.memoria
        }