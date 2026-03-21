# chatbot/agente_cancelamento.py

import re
import logging
from datetime import datetime
from pacientes.models import Paciente
from agendamentos.models import Agendamento

logger = logging.getLogger(__name__)

class AgenteCancelamento:
    """
    Agente especialista em Cancelamentos.
    Exige validação de segurança (Data de Nascimento), busca agendamentos ativos
    e processa o cancelamento acionando os Signals do Django.
    """

    def __init__(self, session_id, memoria_atual):
        self.session_id = session_id
        self.memoria_atual = memoria_atual
        self.telefone_limpo = ''.join(filter(str.isdigit, session_id))

    def processar(self, user_message: str, estado_atual: str) -> dict:
        msg_lower = user_message.lower()
        
        # --- ROTA DE TRANSFERÊNCIA HUMANA ---
        if any(p in msg_lower for p in ['recepção', 'recepcao', 'atendente', 'humano', 'falar com pessoa']):
            from chatbot.human_transfer import HumanTransferManager
            from chatbot.bot_logic import notificar_recepcao_whatsapp
            notificar_recepcao_whatsapp(self.session_id, self.memoria_atual.get('nome_usuario', 'Paciente'))
            return HumanTransferManager.processar_transferencia(self.session_id, self.memoria_atual)

        # --- ROTA DE FUGA ---
        if any(p in msg_lower for p in ['desisto', 'não quero mais cancelar', 'deixa pra lá', 'manter']):
            return {
                "response_message": "Tudo bem! Seu agendamento foi mantido. Se precisar de mais alguma coisa, estou por aqui! 🤍", 
                "new_state": 'ia_roteadora_livre', 
                "memory_data": self.memoria_atual
            }

        if estado_atual == 'inicio_cancelamento':
            return self._buscar_agendamentos(user_message)
        elif estado_atual == 'aguardando_escolha_cancelamento':
            return self._processar_cancelamento(user_message)

        return {}

    def _buscar_agendamentos(self, user_message: str) -> dict:
        nome_usuario = self.memoria_atual.get('nome_usuario', 'Paciente')
        
        # 1. Validação de Segurança (Data de Nascimento)
        match_data = re.search(r'(\d{2}[/-]\d{2}[/-]\d{2,4})', user_message)
        if not match_data:
            return {
                "response_message": f"{nome_usuario}, para localizarmos o seu cadastro com segurança, por favor, digite a sua data de nascimento (ex: 12/05/1994).", 
                "new_state": 'inicio_cancelamento', 
                "memory_data": self.memoria_atual
            }
            
        data_nasc_str = match_data.group(1).replace('-', '/')
        
        try:
            dia, mes, ano = data_nasc_str.split('/')
            if len(ano) == 2: ano = "19" + ano if int(ano) > 25 else "20" + ano
            data_nascimento_db = f"{ano}-{mes}-{dia}"
        except Exception:
            return {"response_message": "A data informada parece inválida. Poderia digitar novamente? (ex: 12/05/1994)", "new_state": 'inicio_cancelamento', "memory_data": self.memoria_atual}

        # 2. Busca o Paciente
        paciente = Paciente.objects.filter(telefone_celular=self.telefone_limpo, data_nascimento=data_nascimento_db).first()
        
        if not paciente:
            msg = (f"Puxa, {nome_usuario}, não consegui localizar um cadastro ativo com esse número de celular e data de nascimento.\n\n"
                   f"Vou transferir você para uma de nossas atendentes verificar o que houve e te ajudar com o cancelamento, um momento! 🤍")
            from chatbot.bot_logic import notificar_recepcao_whatsapp
            notificar_recepcao_whatsapp(self.session_id, nome_usuario)
            return {"response_message": msg, "new_state": 'aguardando_atendente_humano', "memory_data": self.memoria_atual}

        # 3. Busca Agendamentos Ativos
        agendamentos_ativos = Agendamento.objects.filter(paciente=paciente, status='Agendado').order_by('data_hora_inicio')
        
        if not agendamentos_ativos.exists():
            return {
                "response_message": f"{nome_usuario}, verifiquei no sistema e você não possui nenhum exame ou consulta agendada no momento. Posso te ajudar com mais alguma coisa?", 
                "new_state": 'ia_roteadora_livre', 
                "memory_data": self.memoria_atual
            }

        # 4. Formata a lista de agendamentos para o usuário
        lista_agendamentos = []
        msg = f"Localizei o seu cadastro, {nome_usuario}! 😊\n\nVocê tem os seguintes agendamentos ativos:\n\n"
        
        for idx, agendamento in enumerate(agendamentos_ativos):
            data_str = agendamento.data_hora_inicio.strftime('%d/%m/%Y às %H:%M')
            desc = agendamento.procedimento.descricao if agendamento.procedimento else "Consulta Médica"
            lista_agendamentos.append({"id": agendamento.id, "descricao": desc, "data": data_str})
            msg += f"{idx + 1}️⃣ {desc} - {data_str}\n"

        self.memoria_atual['lista_agendamentos_cancelamento'] = lista_agendamentos

        if len(lista_agendamentos) == 1:
            msg += "\nVocê confirma o cancelamento deste agendamento? (Responda 'Sim' para cancelar ou 'Não' para manter)."
        else:
            msg += "\nQual deles você gostaria de cancelar? (Digite o número correspondente ou 'Todos')."

        return {"response_message": msg, "new_state": 'aguardando_escolha_cancelamento', "memory_data": self.memoria_atual}

    def _processar_cancelamento(self, user_message: str) -> dict:
        msg_lower = user_message.lower()
        nome_usuario = self.memoria_atual.get('nome_usuario', 'Paciente')
        lista_agendamentos = self.memoria_atual.get('lista_agendamentos_cancelamento', [])
        
        ids_para_cancelar = []

        # Cenário 1: Só tem 1 agendamento e o usuário disse "Sim"
        if len(lista_agendamentos) == 1:
            if any(p in msg_lower for p in ['sim', 'quero', 'confirmo', 'pode cancelar', '1']):
                ids_para_cancelar.append(lista_agendamentos[0]['id'])
            elif any(p in msg_lower for p in ['não', 'nao', 'manter']):
                return {"response_message": "Perfeito! Seu agendamento foi mantido intacto. 🤍", "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}
            else:
                return {"response_message": "Por favor, responda 'Sim' para confirmar o cancelamento, ou 'Não' para manter o agendamento.", "new_state": 'aguardando_escolha_cancelamento', "memory_data": self.memoria_atual}
        
        # Cenário 2: Múltiplos agendamentos
        else:
            if 'todos' in msg_lower:
                ids_para_cancelar = [item['id'] for item in lista_agendamentos]
            else:
                # Procura números digitados que correspondam à lista
                for idx, item in enumerate(lista_agendamentos):
                    if str(idx + 1) in msg_lower:
                        ids_para_cancelar.append(item['id'])
                
                if not ids_para_cancelar:
                    return {"response_message": "Não entendi qual você deseja cancelar. Por favor, digite o número da opção desejada (ex: 1).", "new_state": 'aguardando_escolha_cancelamento', "memory_data": self.memoria_atual}

        # 5. Efetiva o Cancelamento no Banco
        try:
            for agendamento_id in ids_para_cancelar:
                agendamento = Agendamento.objects.get(id=agendamento_id)
                agendamento.status = 'Cancelado'
                agendamento.save() # <-- ISSO AQUI DISPARA O SEU SIGNAL E MATA O FINANCEIRO!
            
            msg_final = f"Tudo certo, {nome_usuario}. O cancelamento foi realizado com sucesso no nosso sistema.\n\nA Clínica Limalé agradece o aviso e estaremos de portas abertas quando desejar remarcar! 🤍"
        except Exception as e:
            logger.error(f"Erro ao cancelar agendamento pelo bot: {e}")
            msg_final = f"Ocorreu um pequeno erro ao processar o cancelamento, {nome_usuario}. Vou pedir para a recepção verificar isso para você!"
            from chatbot.bot_logic import notificar_recepcao_whatsapp
            notificar_recepcao_whatsapp(self.session_id, nome_usuario)

        # Limpa a memória temporária
        self.memoria_atual.pop('lista_agendamentos_cancelamento', None)

        return {"response_message": msg_final, "new_state": 'ia_roteadora_livre', "memory_data": self.memoria_atual}