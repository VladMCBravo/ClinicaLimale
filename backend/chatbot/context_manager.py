# chatbot/context_manager.py
from datetime import datetime, timedelta
from django.utils import timezone
import json

class ContextManager:
    """Gerencia o contexto e histórico da conversa"""

    def __init__(self, memoria_data):
        self.memoria = memoria_data
        self.historico = memoria_data.get('historico_conversa', [])

    def adicionar_interacao(self, user_message, bot_response, estado):
        """Adiciona uma interação ao histórico"""
        interacao = {
            'timestamp': timezone.now().isoformat(),
            'user_message': user_message,
            'bot_response': bot_response,
            'estado': estado
        }

        self.historico.append(interacao)

        # Mantém apenas as últimas 20 interações - otimizado
        if len(self.historico) > 20:
            self.historico = self.historico[-20:]
            self.memoria['historico_conversa'] = self.historico

        self.memoria['historico_conversa'] = self.historico

    def obter_contexto_recente(self, num_interacoes=3):
        """Obtém o contexto das últimas interações"""
        try:
            if not self.historico:
                return ""

            contexto_recente = self.historico[-num_interacoes:]
            contexto_texto = []

            for interacao in contexto_recente:
                user_msg = str(interacao.get('user_message', ''))[:100]
                bot_msg = str(interacao.get('bot_response', ''))[:100]
                contexto_texto.append(f"Usuário: {user_msg}")
                contexto_texto.append(f"Bot: {bot_msg}...")

            return "\n".join(contexto_texto)
        except Exception:
            return ""

    def detectar_intencao_mudanca(self, user_message):
        """Detecta se o usuário quer mudar de assunto"""
        palavras_mudanca = [
            'na verdade', 'aliás', 'mudando de assunto', 'esquece',
            'deixa pra lá', 'quero outra coisa', 'prefiro', 'melhor'
        ]

        message_lower = user_message.lower()
        return any(palavra in message_lower for palavra in palavras_mudanca)

    def sugerir_retomada(self):
        """Sugere retomar uma conversa anterior baseada no histórico"""
        try:
            if not self.historico:
                return None

            # Procura por agendamentos incompletos no histórico
            for interacao in reversed(self.historico[-10:]):
                estado = interacao.get('estado', '')
                if 'agendamento' in estado.lower():
                    if 'especialidade' in self.memoria and 'data_hora_inicio' not in self.memoria:
                        especialidade_nome = self.memoria.get('especialidade_nome', 'consulta')
                        return {
                            'sugestao': f"Vi que estava agendando uma consulta de {especialidade_nome}. Deseja continuar?",
                            'estado_sugerido': 'agendamento_awaiting_slot_choice'
                        }

            return None
        except Exception:
            return None
