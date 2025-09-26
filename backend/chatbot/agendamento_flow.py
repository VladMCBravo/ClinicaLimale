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
        """Função auxiliar para fazer chamadas à nossa própria API."""
        url = f"{self.base_url}api/chatbot/{endpoint}/"
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=self.headers, params=params, timeout=15)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=self.headers, json=data, timeout=15)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            # Em caso de erro na API, podemos logar e retornar None ou lançar uma exceção
            print(f"Erro ao chamar API interna: {e}") # Usando print para debug no Render
            return None

    def processar(self, resposta_usuario):
        estado_atual = self.memoria.get('state', 'agendamento_inicio')

        handlers = {
            'agendamento_inicio': self.handle_inicio,
            'agendamento_awaiting_type': self.handle_awaiting_type,
            'agendamento_awaiting_modality': self.handle_awaiting_modality, # <-- ADICIONADO AQUI
            'agendamento_awaiting_specialty': self.handle_awaiting_specialty,
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

    # --- Funções "Handler" para Cada Estado ---

    def handle_inicio(self, resposta_usuario):
        # Limpa qualquer memória de agendamentos antigos para começar um novo
        nome_usuario = self.memoria.get('nome_usuario', 'tudo bem') # Pega o nome do usuário, ou usa um fallback
        self.memoria.clear() 
        self.memoria['nome_usuario'] = nome_usuario # Garante que o nome não seja apagado
        
        return {
            "response_message": f"Ótimo, {nome_usuario}, vamos agendar! Você gostaria de marcar uma Consulta ou um Procedimento?",
            "new_state": "agendamento_awaiting_type",
            "memory_data": self.memoria
        }

    def handle_awaiting_type(self, resposta_usuario):
        # Corresponde ao seu estado N8N: AGUARDANDO TIPO (CONSULTA OU PROCEDIMENTO)
        escolha = resposta_usuario.lower()
        
        if 'consulta' in escolha or '1' in escolha:
            self.memoria['tipo_agendamento'] = 'Consulta'
            especialidades = self._chamar_api('especialidades')
            
            if not especialidades:
                return {"response_message": "Desculpe, não consegui carregar as especialidades no momento. Tente novamente em alguns instantes.", "new_state": "inicio", "memory_data": {}}

            self.memoria['lista_especialidades'] = especialidades
            nomes_especialidades = '\n'.join([f"• {esp['nome']}" for esp in especialidades])
            
            return {
                "response_message": f"Entendido, consulta. Qual a modalidade de atendimento que prefere? Por favor, responda com *Presencial* ou *Telemedicina*.",
                "new_state": "agendamento_awaiting_modality", # Próximo estado
                "memory_data": self.memoria
            }
            
        elif 'procedimento' in escolha or '2' in escolha:
            self.memoria['tipo_agendamento'] = 'Procedimento'
            procedimentos = self._chamar_api('procedimentos')

            if not procedimentos:
                 return {"response_message": "Desculpe, não consegui carregar os procedimentos no momento. Tente novamente em alguns instantes.", "new_state": "inicio", "memory_data": {}}

            self.memoria['lista_procedimentos'] = procedimentos
            nomes_procedimentos = '\n'.join([f"• {proc['nome']} (R$ {proc['valor']})" for proc in procedimentos])

            return {
                "response_message": f"Certo, procedimento. Qual destes você gostaria de agendar?\n\n{nomes_procedimentos}",
                "new_state": "agendamento_awaiting_procedure", # Próximo estado
                "memory_data": self.memoria
            }
        else:
            return {
                "response_message": "Desculpe, não entendi. Por favor, responda com 'Consulta' ou 'Procedimento'.",
                "new_state": "agendamento_awaiting_type", # Pede para tentar de novo
                "memory_data": self.memoria
            }

    def handle_awaiting_modality(self, resposta_usuario):
        # Corresponde ao seu estado N8N: AGUARDANDO MODALIDADE
        modalidade = resposta_usuario.strip().capitalize()

        if modalidade not in ['Presencial', 'Telemedicina']:
            return {
                "response_message": "Desculpe, não entendi. Por favor, responda com *Presencial* ou *Telemedicina*.",
                "new_state": "agendamento_awaiting_modality",
                "memory_data": self.memoria
            }

        self.memoria['modalidade'] = modalidade
        
        # Pega a lista de especialidades que já buscamos no passo anterior
        especialidades = self.memoria.get('lista_especialidades', [])
        nomes_especialidades = '\n'.join([f"• {esp['nome']}" for esp in especialidades])
        
        return {
            "response_message": f"Entendido, atendimento {modalidade}. Temos estas especialidades:\n{nomes_especialidades}\n\nQual delas você deseja agendar?",
            "new_state": "agendamento_awaiting_specialty",
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