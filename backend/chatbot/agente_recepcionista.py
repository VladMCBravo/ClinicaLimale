# chatbot/agente_recepcionista.py

import logging
from pacientes.models import Paciente
from chatbot.models import ChatMemory
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

class AgenteRecepcionista:
    """
    Agente responsável pelo Primeiro Contato, Boas-vindas e Roteamento Inicial.
    A ÚNICA responsabilidade dela é acolher, pegar o nome e descobrir com qual 
    agente o paciente precisa falar (Consulta, Procedimento ou Humano).
    """

    def __init__(self, session_id, memoria_atual):
        self.session_id = session_id
        self.memoria_atual = memoria_atual
        self.telefone_limpo = ''.join(filter(str.isdigit, session_id))
        self.paciente = Paciente.objects.filter(telefone_celular=self.telefone_limpo).first()

    def processar_saudacao(self, user_message: str) -> dict:
        """
        Ponto de entrada do agente. Avalia o contexto e devolve a mensagem correta.
        """
        nome_memoria = self.memoria_atual.get('nome_usuario')
        
        # 1. Tenta recuperar o nome do banco se não estiver na memória
        if not nome_memoria and self.paciente:
            # Pega só o primeiro nome para ficar mais amigável
            nome_memoria = self.paciente.nome_completo.split()[0].title()
            self.memoria_atual['nome_usuario'] = nome_memoria

        # 2. CENÁRIO C: Retomada de Conversa (Lead que ficou em silêncio pouco tempo)
        if self._is_retomada_recente():
            estado_anterior = self.memoria_atual.get('previous_state', 'seu atendimento')
            msg = (
                f"Oi{', ' + nome_memoria if nome_memoria else ''}! 🤍\n"
                f"Vi que paramos no meio do seu atendimento mais cedo.\n\n"
                f"Gostaria de continuar de onde paramos ou quer começar um novo assunto?"
            )
            return {
                "response_message": msg,
                "new_state": "aguardando_decisao_retomada",
                "memory_data": self.memoria_atual
            }

        # 3. CENÁRIO B: Paciente Conhecido (Já está no CRM/Banco)
        if self.paciente:
            msg = (
                f"Olá, {nome_memoria}! Que bom ter você de volta na Clínica Limalé. 🤍\n\n"
                f"Como posso cuidar de você hoje?\n"
                f"Pode digitar o que precisa (Ex: 'marcar ultrassom', 'agendar consulta', etc) "
                f"ou escolher uma opção:\n\n"
                f"1️⃣ Agendar Exame\n"
                f"2️⃣ Agendar Consulta\n"
                f"3️⃣ Falar com a recepção"
            )
            return {
                "response_message": msg,
                "new_state": "recepcionista_aguardando_intencao",
                "memory_data": self.memoria_atual
            }

        # 4. CENÁRIO A: Novo Contato (Lead Desconhecido)
        # Se chegou aqui, não tem paciente no banco e não tem nome na memória
        if not nome_memoria:
            msg = (
                "Olá! 🤍 Sou o Leônidas, o assistente virtual da Clínica Limalé.\n\n"
                "Para eu te atender de forma mais rápida e personalizada, **como você gostaria de ser chamado(a)?**"
            )
            return {
                "response_message": msg,
                "new_state": "recepcionista_aguardando_nome",
                "memory_data": self.memoria_atual
            }

        # Fallback de segurança (Se já pegou o nome mas a intenção não foi capturada ainda)
        return self.perguntar_intencao(nome_memoria)

    def processar_nome(self, user_message: str) -> dict:
        """
        Processa a resposta do usuário quando ele informa o nome pela primeira vez.
        """
        # Limpeza básica do nome (pega a primeira ou duas primeiras palavras)
        nome_limpo = user_message.strip().title()
        if len(nome_limpo.split()) > 2:
            nome_limpo = " ".join(nome_limpo.split()[:2])
            
        self.memoria_atual['nome_usuario'] = nome_limpo
        
        return self.perguntar_intencao(nome_limpo)

    def perguntar_intencao(self, nome: str) -> dict:
        """
        Apresenta o menu principal após pegar o nome do novo lead.
        """
        msg = (
            f"Prazer, {nome}! Como posso cuidar de você hoje?\n\n"
            f"Digite o que precisa ou escolha uma opção abaixo:\n\n"
            f"1️⃣ Agendar Exame (Ultrassom, Doppler, etc)\n"
            f"2️⃣ Agendar Consulta Médica\n"
            f"3️⃣ Falar com a recepção"
        )
        return {
            "response_message": msg,
            "new_state": "recepcionista_aguardando_intencao",
            "memory_data": self.memoria_atual
        }

    def _is_retomada_recente(self) -> bool:
        """
        Verifica se a última interação foi há menos de 4 horas, 
        configurando uma retomada em vez de um "novo bom dia".
        """
        try:
            memoria_obj = ChatMemory.objects.get(session_id=self.session_id)
            agora = timezone.now()
            limite_retomada = agora - timedelta(hours=4)
            
            # Se a conversa foi atualizada há menos de 4 horas e não está em estado de início
            if memoria_obj.updated_at > limite_retomada and self.memoria_atual.get('state') not in ['inicio', None]:
                return True
            return False
        except Exception:
            return False