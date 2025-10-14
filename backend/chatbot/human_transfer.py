# chatbot/human_transfer.py

import logging
from .models import ChatMemory, ChatbotMetrics

logger = logging.getLogger(__name__)

class HumanTransferManager:
    """Gerencia transferências para atendimento humano"""
    
    PALAVRAS_TRANSFERENCIA = [
        'atendente', 'humano', 'pessoa', 'falar com alguém', 'falar com alguem',
        'operador', 'funcionário', 'funcionario', 'recepção', 'recepcao',
        'secretária', 'secretaria', 'não consigo', 'nao consigo',
        'não entendo', 'nao entendo', 'complicado', 'difícil', 'dificil'
    ]
    
    @classmethod
    def detectar_solicitacao_humano(cls, mensagem: str) -> bool:
        """Detecta se o usuário quer falar com um humano"""
        mensagem_lower = mensagem.lower()
        return any(palavra in mensagem_lower for palavra in cls.PALAVRAS_TRANSFERENCIA)
    
    @classmethod
    def processar_transferencia(cls, session_id: str, memoria_atual: dict) -> dict:
        """Processa a transferência para atendimento humano"""
        nome_usuario = memoria_atual.get('nome_usuario', '')
        
        try:
            memoria_obj = ChatMemory.objects.get(session_id=session_id)
            memoria_obj.transferencia_solicitada = True # Atualizado para usar o campo do modelo
            memoria_obj.save()
            
            # Registra métrica
            ChatbotMetrics.objects.create(
                session_id=session_id,
                evento='transferencia_humano_solicitada',
                dados_evento={'nome_usuario': nome_usuario}
            )
        except Exception as e:
            logger.error(f"Erro ao marcar transferência e registrar métrica: {e}")
        
        mensagem = (
            f"Entendo perfeitamente, {nome_usuario}! 🤝\n\n"
            "Vou transferir você para nossa equipe de atendimento. "
            "Em alguns instantes, um de nossos atendentes entrará em contato.\n\n"
            "Enquanto isso, se mudar de ideia e quiser continuar comigo, "
            "é só digitar *'continuar'*."
        )
        
        return {
            "response_message": mensagem,
            "new_state": "aguardando_atendente_humano",
            "memory_data": memoria_atual
        }
    
    @classmethod
    def verificar_sessoes_pendentes(cls):
        """Retorna sessões que precisam de atendimento humano"""
        return ChatMemory.objects.filter(
            memory_data__transferencia_solicitada=True,
            state='aguardando_atendente_humano'
        )