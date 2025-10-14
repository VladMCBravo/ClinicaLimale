# chatbot/conversation_manager.py

import logging
from .models import ChatMemory, ChatbotMetrics

logger = logging.getLogger(__name__)

class ConversationManager:
    """Gerencia o fluxo inteligente de conversas"""
    
    COMANDOS_CONTROLE = {
        '#recomeçar': 'recomecar',
        '#recomecar': 'recomecar', 
        '#reiniciar': 'recomecar',
        '#sair': 'sair',
        '#tchau': 'sair',
        '#encerrar': 'sair',
        '#ajuda': 'ajuda',
        '#help': 'ajuda',
        '#menu': 'ajuda'
    }
    
    PALAVRAS_ENCERRAMENTO = [
        'tchau', 'obrigado', 'obrigada', 'até logo', 'ate logo',
        'valeu', 'muito obrigado', 'muito obrigada', 'já resolvi',
        'ja resolvi', 'não preciso mais', 'nao preciso mais',
        'consegui resolver', 'tudo certo', 'está tudo ok'
    ]
    
    @classmethod
    def detectar_comando(cls, mensagem: str) -> str:
        """Detecta comandos de controle na mensagem"""
        mensagem_clean = mensagem.strip().lower()
        return cls.COMANDOS_CONTROLE.get(mensagem_clean)
    
    @classmethod
    def detectar_encerramento(cls, mensagem: str) -> bool:
        """Detecta sinais de que o usuário quer encerrar"""
        mensagem_lower = mensagem.lower()
        return any(palavra in mensagem_lower for palavra in cls.PALAVRAS_ENCERRAMENTO)
    
    @classmethod
    def processar_comando(cls, comando: str, session_id: str, memoria_atual: dict) -> dict:
        """Processa comandos de controle"""
        nome_usuario = memoria_atual.get('nome_usuario', '')
        
        if comando == 'recomecar':
            return cls._recomecar_conversa(session_id, nome_usuario)
        elif comando == 'sair':
            return cls._encerrar_conversa(session_id, nome_usuario)
        elif comando == 'ajuda':
            return cls._mostrar_ajuda(nome_usuario, memoria_atual)
        
        return None
    
    @classmethod
    def processar_encerramento(cls, session_id: str, memoria_atual: dict) -> dict:
        """Processa tentativa de encerramento natural"""
        nome_usuario = memoria_atual.get('nome_usuario', '')
        
        mensagem = (
            f"Foi um prazer te atender, {nome_usuario}! 😊\n\n"
            "Se precisar de mais alguma coisa, estarei aqui. "
            "Tenha um ótimo dia!\n\n"
            "💡 *Dica:* Digite *#recomeçar* se quiser fazer um novo agendamento."
        )
        
        # Registra encerramento
        try:
            ChatbotMetrics.objects.create(
                session_id=session_id,
                evento='conversa_encerrada_naturalmente',
                dados_evento={'nome_usuario': nome_usuario}
            )
        except Exception:
            pass
        
        return {
            "response_message": mensagem,
            "new_state": "conversa_encerrada",
            "memory_data": {'nome_usuario': nome_usuario}
        }
    
    @classmethod
    def _recomecar_conversa(cls, session_id: str, nome_usuario: str) -> dict:
        """Reinicia a conversa do zero"""
        try:
            ChatbotMetrics.objects.create(
                session_id=session_id,
                evento='conversa_reiniciada',
                dados_evento={'nome_usuario': nome_usuario}
            )
        except Exception:
            pass
        
        mensagem = (
            f"Perfeito, {nome_usuario}! Vamos começar do zero. 🔄\n\n"
            "Como posso te direcionar ao melhor cuidado hoje?"
        )
        
        return {
            "response_message": mensagem,
            "new_state": "identificando_demanda",
            "memory_data": {'nome_usuario': nome_usuario}
        }
    
    @classmethod
    def _encerrar_conversa(cls, session_id: str, nome_usuario: str) -> dict:
        """Encerra a conversa explicitamente"""
        try:
            ChatbotMetrics.objects.create(
                session_id=session_id,
                evento='conversa_encerrada_comando',
                dados_evento={'nome_usuario': nome_usuario}
            )
        except Exception:
            pass
        
        mensagem = (
            f"Entendido, {nome_usuario}! Conversa encerrada. 👋\n\n"
            "Quando precisar, é só mandar uma mensagem que estarei aqui para te ajudar!"
        )
        
        return {
            "response_message": mensagem,
            "new_state": "conversa_encerrada",
            "memory_data": {'nome_usuario': nome_usuario}
        }
    
    @classmethod
    def _mostrar_ajuda(cls, nome_usuario: str, memoria_atual: dict) -> dict:
        """Mostra opções de ajuda"""
        mensagem = (
            f"Claro, {nome_usuario}! Aqui estão suas opções: 📋\n\n"
            "🏥 *Serviços Disponíveis:*\n"
            "• Agendar consulta ou exame\n"
            "• Consultar preços\n"
            "• Cancelar agendamento\n"
            "• Informações da clínica\n\n"
            "⚡ *Comandos Rápidos:*\n"
            "• *#recomeçar* - Volta ao início\n"
            "• *#sair* - Encerra conversa\n"
            "• Digite *'atendente'* para falar com uma pessoa\n\n"
            "Como posso te ajudar?"
        )
        
        return {
            "response_message": mensagem,
            "new_state": "identificando_demanda",
            "memory_data": memoria_atual
        }