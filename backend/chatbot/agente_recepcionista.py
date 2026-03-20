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

        # --- DETECÇÃO DE MENSAGEM COMPLEXA ---
        msg_lower = user_message.lower()
        palavras_chave = ['exame', 'consulta', 'obstétrico', 'obstetrico', 'morfológico', 'morfologico', 'agendar', 'marcar', 'fazer', 'eco', 'ultrassom', 'valor', 'preço', 'preco', 'quero']
        
        # Se tiver mais de 3 palavras OU tiver alguma palavra-chave de intenção, joga para a IA:
        if len(user_message.split()) > 3 or any(p in msg_lower for p in palavras_chave):
            ja_tem_nome = bool(nome_memoria)
            tem_historico = len(self.memoria_atual.get('historico_conversa', [])) > 0
            # Se já tem nome e não é a primeira mensagem da vida dele, pula a saudação longa
            pular = ja_tem_nome and tem_historico
            return self.processar_mensagem_complexa(user_message, nome_memoria, pular_saudacao=pular)

        # Se for só um "oi", "bom dia" curto para paciente conhecido:
        if self.paciente:
            msg = (f"Olá, {nome_memoria}! 🤍\n\nSou o Leônidas, assistente da Clínica Limalé — centro de referência em gestação, ultrassom fetal e cardiologia avançada.\n\n"
                   f"Que bom ter você de volta! Será um prazer te atender.\nComo posso ajudar você hoje?")
            return {"response_message": msg, "new_state": "recepcionista_aguardando_intencao", "memory_data": self.memoria_atual}

        # CENÁRIO: Mensagem curta (Paciente Novo)
        if not nome_memoria:
            msg = ("Olá 🤍\n\nSou o Leônidas, assistente da Clínica Limalé — centro de referência em gestação, ultrassom fetal e cardiologia avançada.\n\n"
                   "Será um prazer te atender.\nPara continuarmos, como você gostaria de ser chamado(a)?")
            return {"response_message": msg, "new_state": "recepcionista_aguardando_nome", "memory_data": self.memoria_atual}

        return self.perguntar_intencao(nome_memoria)

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

            # ================================================================
            # BLINDAGEM DE ROTEIRO (Evita que a IA fuja do funil)
            # ================================================================
            if not nome_conhecido:
                novo_estado = 'recepcionista_aguardando_nome'
                # BLINDAGEM 1: Se não temos o nome, PROIBIMOS a IA de falar de exames.
                # Forçamos a saudação padrão que pede APENAS o nome.
                resposta_ia = (
                    "Olá! 🤍\n\n"
                    "Sou o Leônidas, assistente da Clínica Limalé — centro de referência em gestação, ultrassom fetal e cardiologia avançada.\n\n"
                    "Seja muito bem-vindo(a)! Será um prazer te atender.\n\n"
                    "Para continuarmos de forma mais próxima, como você gostaria de ser chamado(a)?"
                )
            else:
                if intencao == 'exame_fetal':
                    novo_estado = 'mf_aguardando_semanas' 
                    # BLINDAGEM 2: Se sabemos que é Medicina Fetal, a IA não pode inventar perguntas sobre trimestres.
                    # --- CORREÇÃO DA NOMENCLATURA DO EXAME ---
                    if 'eco' in (procedimento or '').lower() or 'cardio' in (procedimento or '').lower():
                        texto_exame = "O ecocardiograma fetal é o exame específico para avaliar a estrutura e o funcionamento do coração do bebê durante a gestação."
                    else:
                        # Resposta genérica, elegante e infalível, não importa o que o paciente digitou
                        texto_exame = "Sim, os exames obstétricos e ultrassons para o acompanhamento do bebê são a nossa principal especialidade!"
                        
                    if pular_saudacao:
                        resposta_ia = f"{texto_exame}\n\nPara te orientar corretamente, poderia me informar com quantas semanas de gestação você está hoje, por favor?"
                    else:
                        resposta_ia = f"Olá, {nome_conhecido}! 🤍\n\nSou o Leônidas, assistente da Clínica Limalé — centro de referência em gestação, ultrassom fetal e cardiologia avançada.\n\nQue bom ter você por aqui! {texto_exame}\n\nPara te orientar corretamente, poderia me informar com quantas semanas de gestação você está hoje, por favor?"
                
                elif intencao == 'exame_geral':
                    novo_estado = 'inicio'
                elif intencao == 'consulta':
                    novo_estado = 'agendamento_awaiting_specialty'
                    self.memoria_atual['tipo_agendamento'] = 'Consulta'
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
            logger.error(f"Erro na IA da Recepcionista: {e}")
            return self.perguntar_intencao(nome_conhecido or "paciente")

    def processar_nome(self, user_message: str) -> dict:
        """
        Processa a resposta do usuário quando ele informa o nome pela primeira vez.
        Se ele já tinha pedido um exame antes de dar o nome, retoma o fluxo!
        """
        # Limpeza básica do nome (pega a primeira ou duas primeiras palavras)
        nome_limpo = user_message.strip().title()
        if len(nome_limpo.split()) > 2:
            nome_limpo = " ".join(nome_limpo.split()[:2])
            
        self.memoria_atual['nome_usuario'] = nome_limpo
        
        ultimo_exame = self.memoria_atual.get('ultimo_exame_citado', '')
        especialidade = self.memoria_atual.get('especialidade_indicada')
        
        # NOVA REGRA: Verifica diretamente no nome do exame se é obstétrico/fetal
        exames_fetais = ['eco', 'fetal', 'morfológico', 'morfologico', 'obstétrico', 'obstetrico', 'transvaginal', 'gestação']
        is_fetal = ultimo_exame and any(p in ultimo_exame.lower() for p in exames_fetais)
        
        # Se ele pediu exame fetal antes de dar o nome (ex: "quero eco fetal")
        if is_fetal:
            # Personaliza a mensagem dependendo se é Eco Fetal ou Morfológico
            if 'eco' in ultimo_exame.lower() or 'cardio' in ultimo_exame.lower():
                msg = f"Muito prazer, {nome_limpo}! 🤍\n\nO ecocardiograma fetal é o exame específico para avaliar a estrutura e o funcionamento do coração do bebê durante a gestação. Para te orientar corretamente, poderia me informar de quantas semanas de gestação você está hoje, por favor?"
            else:
                msg = f"Muito prazer, {nome_limpo}! 🤍\n\nPara te orientar corretamente sobre o {ultimo_exame}, poderia me informar com quantas semanas de gestação você está hoje, por favor?"
                
            return {
                "response_message": msg,
                "new_state": "mf_aguardando_semanas",
                "memory_data": self.memoria_atual
            }
            
        # Se ele pediu exame geral (ex: "quero eletrocardiograma")
        elif ultimo_exame:
            return {
                "response_message": f"Muito prazer, {nome_limpo}! 🤍\n\nSim, realizamos o {ultimo_exame} aqui na clínica! Gostaria de verificar os valores e os horários disponíveis?",
                "new_state": "inicio",
                "memory_data": self.memoria_atual
            }
            
        # Se ele pediu consulta (ex: "quero pediatra")
        elif especialidade:
            self.memoria_atual['tipo_agendamento'] = 'Consulta'
            return {
                "response_message": f"Muito prazer, {nome_limpo}! 🤍\n\nPara eu verificar a agenda correta da nossa equipe, qual especialidade médica você procura? (Ex: {especialidade})",
                "new_state": "agendamento_awaiting_specialty",
                "memory_data": self.memoria_atual
            }

        # Se ele só deu o nome e não tinha pedido nada (Ex: começou mandando só "Oi")
        return self.perguntar_intencao(nome_limpo)

    def perguntar_intencao(self, nome: str) -> dict:
        """
        Apresenta a pergunta aberta após pegar o nome do novo lead.
        """
        msg = f"Prazer, {nome}! Como posso ajudar você hoje?"
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