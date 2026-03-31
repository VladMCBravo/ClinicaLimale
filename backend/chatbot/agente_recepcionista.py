## chatbot/agente_recepcionista.py

import logging
from pacientes.models import Paciente
from chatbot.models import ChatMemory
from django.utils import timezone
from datetime import timedelta
from chatbot.chains import chain_recepcionista 

logger = logging.getLogger(__name__)

class AgenteRecepcionista:
    """
    Agente de Primeiro Contato com Inteligência Ativa e Menu Numérico.
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

        msg_lower = user_message.lower().strip()
        
        # --- FAST-TRACK: Atalhos do Menu Numérico ---
        if msg_lower in ['1', 'opcao 1', 'opção 1']:
            self.memoria_atual['intencao_salva'] = 'exame_fetal'
            return {"response_message": "Perfeito.\n\nPara te orientar melhor, me informa com quantas semanas você está hoje, por favor.", "new_state": "mf_aguardando_semanas", "memory_data": self.memoria_atual}
        elif msg_lower in ['2', 'opcao 2', 'opção 2', '3', 'opcao 3', 'opção 3']:
            self.memoria_atual['intencao_salva'] = 'exame_geral'
            return {"response_message": "Perfeito.\n\nQual exame específico você gostaria de agendar?", "new_state": "inicio", "memory_data": self.memoria_atual}
        elif msg_lower in ['4', 'opcao 4', 'opção 4']:
            self.memoria_atual['tipo_agendamento'] = 'Consulta'
            self.memoria_atual['intencao_salva'] = 'consulta'
            return {"response_message": "Perfeito.\n\nQual especialidade médica você procura?", "new_state": "agendamento_awaiting_specialty", "memory_data": self.memoria_atual}

        # --- DETECÇÃO DE MENSAGEM COMPLEXA ---
        palavras_chave = ['exame', 'consulta', 'obstétrico', 'obstetrico', 'morfológico', 'morfologico', 'agendar', 'marcar', 'fazer', 'eco', 'ultrassom', 'valor', 'preço', 'preco', 'quero', 'gravida', 'grávida', 'gestação']
        
        if len(user_message.split()) > 3 or any(p in msg_lower for p in palavras_chave):
            ja_tem_nome = bool(nome_memoria)
            tem_historico = len(self.memoria_atual.get('historico_conversa', [])) > 0
            pular = ja_tem_nome and tem_historico
            return self.processar_mensagem_complexa(user_message, nome_memoria, pular_saudacao=pular)

        # --- SAUDAÇÃO PADRÃO COM MENU NUMÉRICO ---
        msg = (
            "Olá 😊\n\n"
            "Sou o Leônidas, assistente da Clínica Limalé — referência em gestação, medicina fetal e cardiologia avançada.\n\n"
            "Será um prazer te atender.\n\n"
            "Para te direcionar da melhor forma, me conta o que você precisa:\n\n"
            "1️⃣ Ultrassom na gestação\n"
            "2️⃣ Exames cardiológicos\n"
            "3️⃣ Ultrassonografia geral\n"
            "4️⃣ Especialidades médicas\n\n"
            "Se preferir, pode escrever diretamente."
        )
        return {"response_message": msg, "new_state": "recepcionista_aguardando_intencao", "memory_data": self.memoria_atual}

    def processar_mensagem_complexa(self, user_message: str, nome_conhecido: str, pular_saudacao: bool = False) -> dict:
        try:
            analise = chain_recepcionista.invoke({
                "user_message": user_message,
                "nome_conhecido": nome_conhecido or "",
                "pular_saudacao": "SIM" if pular_saudacao else "NAO"
            })
            
            nome_extraido = analise.get("nome_extraido")
            intencao = analise.get("intencao") 
            resposta_ia = analise.get("resposta_humanizada")
            procedimento = analise.get("procedimento_especialidade")

            if nome_extraido and not nome_conhecido:
                self.memoria_atual['nome_usuario'] = nome_extraido.title()
                nome_conhecido = nome_extraido.title()
            
            if procedimento:
                if intencao in ['exame_fetal', 'exame_geral']:
                    self.memoria_atual['ultimo_exame_citado'] = procedimento
                elif intencao == 'consulta':
                    self.memoria_atual['especialidade_indicada'] = procedimento
            
            if intencao and intencao != 'indefinida':
                self.memoria_atual['intencao_salva'] = intencao

            # BLINDAGEM E ROTEAMENTO
            if intencao == 'exame_fetal':
                novo_estado = 'mf_aguardando_semanas' 
                msg_lower = user_message.lower()
                
                if any(p in msg_lower for p in ['saber se estou', 'teste', 'suspeita', 'descobrir se', 'grávida', 'gravida']):
                    self.memoria_atual['assumir_transvaginal'] = True
                    resposta_ia = (f"Que momento especial! 🤍 Aqui na Limalé nós realizamos o *Ultrassom Transvaginal*, que é o exame usado para confirmar a gestação.\n\n"
                                   f"O ultrassom visualiza o bebê a partir de 5 semanas de gestação.\n\n"
                                   f"Você já tem um exame positivo ou gostaria de agendar o ultrassom mesmo assim? (Digite 'agendar' ou 'falar com atendente')")
                else:
                    resposta_ia = "Perfeito.\n\nPara te orientar melhor, me informa com quantas semanas você está hoje, por favor."
            
            elif intencao == 'exame_geral':
                novo_estado = 'inicio'
            elif intencao == 'consulta':
                novo_estado = 'agendamento_awaiting_specialty'
                self.memoria_atual['tipo_agendamento'] = 'Consulta'
            elif intencao == 'cancelamento':
                novo_estado = 'inicio_cancelamento'
                resposta_ia = "Compreendo. Para localizarmos o seu horário na agenda, poderia me confirmar a sua data de nascimento? (Ex: 12/05/1994)"
            elif intencao == 'humano':
                from chatbot.human_transfer import HumanTransferManager
                from chatbot.bot_logic import notificar_recepcao_whatsapp
                resultado_transf = HumanTransferManager.processar_transferencia(self.session_id, self.memoria_atual)
                notificar_recepcao_whatsapp(self.session_id, nome_conhecido)
                return resultado_transf
            else:
                novo_estado = 'ia_roteadora_livre'

            return {
                "response_message": resposta_ia,
                "new_state": novo_estado,
                "memory_data": self.memoria_atual
            }

        except Exception as e:
            logger.error(f"Erro na IA Recepcionista: {e}")
            return {"response_message": "Como posso ajudar hoje?", "new_state": "recepcionista_aguardando_intencao", "memory_data": self.memoria_atual}

    def processar_nome(self, user_message: str) -> dict:
        # Mantido para fallbacks
        nome_limpo = user_message.strip().title()
        if len(nome_limpo.split()) > 2:
            nome_limpo = " ".join(nome_limpo.split()[:2])
            
        self.memoria_atual['nome_usuario'] = nome_limpo
        return self.perguntar_intencao(nome_limpo)

    def perguntar_intencao(self, nome: str) -> dict:
        msg = (
            f"Prazer, {nome}! 😊\n\n"
            "Para te direcionar da melhor forma, me conta o que você precisa:\n\n"
            "1️⃣ Ultrassom na gestação\n"
            "2️⃣ Exames cardiológicos\n"
            "3️⃣ Ultrassonografia geral\n"
            "4️⃣ Especialidades médicas"
        )
        return {"response_message": msg, "new_state": "recepcionista_aguardando_intencao", "memory_data": self.memoria_atual}

    def _is_retomada_recente(self) -> bool:
        try:
            memoria_obj = ChatMemory.objects.get(session_id=self.session_id)
            agora = timezone.now()
            limite_retomada = agora - timedelta(hours=4)
            if memoria_obj.updated_at > limite_retomada and self.memoria_atual.get('state') not in ['inicio', None]:
                return True
            return False
        except Exception:
            return False