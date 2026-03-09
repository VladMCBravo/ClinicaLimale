## chatbot/agente_recepcionista.py

import logging
from pacientes.models import Paciente
from chatbot.models import ChatMemory
from django.utils import timezone
from datetime import timedelta
# Você precisará importar a chain da recepcionista que vamos criar no chains.py
from chatbot.chains import chain_recepcionista 

logger = logging.getLogger(__name__)

class AgenteRecepcionista:
    """
    Agente de Primeiro Contato com Inteligência Ativa.
    """

    def __init__(self, session_id, memoria_atual):
        self.session_id = session_id
        self.memoria_atual = memoria_atual
        self.telefone_limpo = ''.join(filter(str.isdigit, session_id))
        self.paciente = Paciente.objects.filter(telefone_celular=self.telefone_limpo).first()

    def processar_saudacao(self, user_message: str) -> dict:
        nome_memoria = self.memoria_atual.get('nome_usuario')
        
        if not nome_memoria and self.paciente:
            nome_memoria = self.paciente.nome_completo.split()[0].title()
            self.memoria_atual['nome_usuario'] = nome_memoria

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

        # --- A GRANDE MUDANÇA: DETECÇÃO DE MENSAGEM COMPLEXA ---
        # Se a pessoa mandou mais de 4 palavras, ela não está só dando "oi".
        # Ela está explicando o que quer (Ex: "Bom dia me chamo Vladmir e quero saber preços")
        if len(user_message.split()) > 4:
            return self.processar_mensagem_complexa(user_message, nome_memoria)

        # Se for só um "oi", "bom dia" curto, segue o fluxo normal de menu:
        if self.paciente:
            msg = (
                f"Olá, {nome_memoria}! 🤍\n\n"
                f"Sou o Leônidas, assistente da Clínica Limalé — centro de referência em gestação, ultrassom fetal e cardiologia avançada.\n\n"
                f"Que bom ter você de volta! Será um prazer te atender.\n"
                f"Em que posso ajudar? Digite o que precisa ou escolha uma opção:\n\n"
                f"1️⃣ Agendar Exame\n"
                f"2️⃣ Agendar Consulta\n"
                f"3️⃣ Outros assuntos\n"
            )
            return {"response_message": msg, "new_state": "recepcionista_aguardando_intencao", "memory_data": self.memoria_atual}

        # CENÁRIO: Mensagem curta (Paciente Novo)
        if not nome_memoria:
            msg = (
                "Olá 🤍\n\n"
                "Sou o Leônidas, assistente da Clínica Limalé — centro de referência em gestação, ultrassom fetal e cardiologia avançada.\n\n"
                "Será um prazer te atender.\n"
                "Para continuarmos, como você gostaria de ser chamado(a)?"
            )
            return {"response_message": msg, "new_state": "recepcionista_aguardando_nome", "memory_data": self.memoria_atual}

        return self.perguntar_intencao(nome_memoria)

    def processar_mensagem_complexa(self, user_message: str, nome_conhecido: str) -> dict:
        """
        Usa o LLM para ler a mensagem inicial do paciente, extrair o nome (se ele disser)
        e já dar uma resposta humanizada roteando para o lugar certo.
        """
        try:
            # Chama o LLM para interpretar o textão do paciente
            analise = chain_recepcionista.invoke({
                "user_message": user_message,
                "nome_conhecido": nome_conhecido or ""
            })
            
            # O LLM nos devolve o nome (se encontrou) e a intenção
            nome_extraido = analise.get("nome_extraido")
            intencao = analise.get("intencao") 
            resposta_ia = analise.get("resposta_humanizada")
            procedimento = analise.get("procedimento_especialidade")

            if nome_extraido and not nome_conhecido:
                self.memoria_atual['nome_usuario'] = nome_extraido.title()
                nome_conhecido = nome_extraido.title()
            
            # NOVO: Salva a extração na memória (separando os novos tipos)
            if procedimento:
                if intencao in ['exame_fetal', 'exame_geral']:
                    self.memoria_atual['ultimo_exame_citado'] = procedimento
                elif intencao == 'consulta':
                    self.memoria_atual['especialidade_indicada'] = procedimento

            # A CORREÇÃO MESTRA DO ESTADO ESTÁ AQUI
            if not nome_conhecido:
                # CORREÇÃO TESTE 2: Se não temos o nome, o único estado possível é aguardar o nome.
                novo_estado = 'recepcionista_aguardando_nome'
            else:
                if intencao == 'exame_fetal':
                    # CORREÇÃO TESTE 3: Pula direto para o Agente de Medicina Fetal processar as semanas!
                    novo_estado = 'mf_aguardando_semanas' 
                elif intencao == 'exame_geral':
                    novo_estado = 'inicio' # Deixa o AgenteExames antigo avaliar
                elif intencao == 'consulta':
                    novo_estado = 'agendamento_awaiting_specialty'
                    self.memoria_atual['tipo_agendamento'] = 'Consulta'
                else:
                    novo_estado = 'ia_roteadora_livre'

            return {
                "response_message": resposta_ia,
                "new_state": novo_estado,
                "memory_data": self.memoria_atual
            }

        except Exception as e:
            logger.error(f"Erro na IA da Recepcionista: {e}")
            return self.perguntar_intencao(nome_conhecido or "paciente")

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
            f"Prazer, {nome}! Como posso ajudar você hoje?\n\n"
            f"Digite o que precisa ou escolha uma opção abaixo:\n\n"
            f"1️⃣ Agendar Exame (Ultrassom, Doppler, etc)\n"
            f"2️⃣ Agendar Consulta Médica\n"
            f"3️⃣ Outros assuntos\n"
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