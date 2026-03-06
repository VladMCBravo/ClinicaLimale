# chatbot/recovery_manager.py
from django.utils import timezone
from datetime import timedelta
from .models import ChatMemory

class ConversationRecoveryManager:
    """Gerencia recuperação de conversas interrompidas"""

    @staticmethod
    def verificar_conversa_interrompida(session_id):
        """Verifica se há uma conversa interrompida que pode ser recuperada"""
        try:
            memoria = ChatMemory.objects.get(session_id=session_id)

            # Se a conversa foi atualizada há mais de 1 hora mas menos de 24 horas
            agora = timezone.now()
            uma_hora_atras = agora - timedelta(hours=1)
            um_dia_atras = agora - timedelta(days=1)

            if um_dia_atras <= memoria.updated_at <= uma_hora_atras:
                return ConversationRecoveryManager._gerar_opcoes_recuperacao(memoria)

            return None

        except (ChatMemory.DoesNotExist, Exception) as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Erro ao verificar conversa interrompida: {e}")
            return None

    @staticmethod
    def _gerar_opcoes_recuperacao(memoria):
        """Gera opções de recuperação baseadas no estado da conversa"""
        estado = memoria.state
        dados = memoria.memory_data
        nome = dados.get('nome_usuario', '')

        # Agendamento em andamento
        if 'agendamento' in estado:
            if dados.get('especialidade_nome') and not dados.get('data_hora_inicio'):
                return {
                    'tipo': 'agendamento_incompleto',
                    'mensagem': (
                        f"Olá{f', {nome}' if nome else ''}! 👋\n\n"
                        f"Vi que você estava agendando uma consulta de *{dados.get('especialidade_nome')}* "
                        "mas não finalizou.\n\n"
                        "Deseja continuar de onde paramos?\n\n"
                        "• *Sim* - Continuar agendamento\n"
                        "• *Não* - Começar novo atendimento"
                    ),
                    'estado_recuperacao': 'agendamento_awaiting_slot_choice',
                    'dados_recuperacao': dados
                }

            elif dados.get('data_hora_inicio') and not dados.get('cpf'):
                return {
                    'tipo': 'dados_incompletos',
                    'mensagem': (
                        f"Olá{f', {nome}' if nome else ''}! 👋\n\n"
                        "Você havia escolhido um horário mas não finalizou o cadastro.\n\n"
                        "Deseja continuar?\n\n"
                        "• *Sim* - Finalizar agendamento\n"
                        "• *Não* - Começar novo atendimento"
                    ),
                    'estado_recuperacao': 'cadastro_awaiting_adult_data',
                    'dados_recuperacao': dados
                }

        # Triagem em andamento
        elif 'triagem' in estado:
            return {
                'tipo': 'triagem_incompleta',
                'mensagem': (
                    f"Olá{f', {nome}' if nome else ''}! 👋\n\n"
                    "Você estava me contando sobre alguns sintomas.\n\n"
                    "Deseja continuar a triagem?\n\n"
                    "• *Sim* - Continuar triagem\n"
                    "• *Não* - Novo atendimento"
                ),
                'estado_recuperacao': 'triagem_processar_sintomas',
                'dados_recuperacao': dados
            }

        # Conversa geral
        else:
            return {
                'tipo': 'conversa_geral',
                'mensagem': (
                    f"Olá{f', {nome}' if nome else ''}! 👋\n\n"
                    "Que bom ter você de volta!\n\n"
                    "Como posso ajudá-lo hoje?"
                ),
                'estado_recuperacao': 'identificando_demanda',
                'dados_recuperacao': {'nome_usuario': nome}
            }

        return None

    @staticmethod
    def processar_resposta_recuperacao(session_id, resposta, opcoes_recuperacao):
        """Processa a resposta do usuário sobre recuperação"""
        resposta_lower = resposta.lower().strip()

        if resposta_lower in ['sim', 's', 'continuar', 'sim, continuar']:
            # Recupera a conversa
            return {
                'recuperar': True,
                'estado': opcoes_recuperacao['estado_recuperacao'],
                'dados': opcoes_recuperacao['dados_recuperacao'],
                'mensagem': "Perfeito! Vamos continuar de onde paramos. 😊"
            }

        elif resposta_lower in ['não', 'nao', 'n', 'novo', 'começar novo']:
            # Inicia nova conversa
            nome = opcoes_recuperacao['dados_recuperacao'].get('nome_usuario', '')
            return {
                'recuperar': False,
                'estado': 'identificando_demanda',
                'dados': {'nome_usuario': nome} if nome else {},
                'mensagem': f"Certo{f', {nome}' if nome else ''}! Vamos começar um novo atendimento. Como posso ajudá-lo?"
            }

        else:
            # Resposta não reconhecida
            return {
                'recuperar': None,
                'mensagem': "Não entendi. Por favor, responda com *Sim* para continuar ou *Não* para novo atendimento."
            }
    
    @staticmethod
    def limpar_conversas_antigas():
        """Remove conversas muito antigas (mais de 7 dias)"""
        try:
            limite = timezone.now() - timedelta(days=7)
            conversas_antigas = ChatMemory.objects.filter(updated_at__lt=limite)
            count = conversas_antigas.count()
            conversas_antigas.delete()
            return count
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Erro ao limpar conversas antigas: {e}")
            return 0
    
    @classmethod
    def registrar_abandonos_no_crm(cls):
        """
        Varre as conversas paradas há mais de 2 horas e avisa o CRM
        para disparar a cadência D0/D1/D3.
        """
        try:
            # Importação local para evitar import circular
            from crm.services import CRMService 
            from .models import ChatMemory
            
            agora = timezone.now()
            # Define a janela de abandono: parou entre 2h e 24h atrás
            duas_horas_atras = agora - timedelta(hours=2)
            um_dia_atras = agora - timedelta(days=1)

            # Busca quem sumiu (não pediu humano e não encerrou a conversa)
            abandonos = ChatMemory.objects.filter(
                updated_at__gte=um_dia_atras,
                updated_at__lte=duas_horas_atras,
                conversa_encerrada=False,
                transferencia_solicitada=False
            )

            count = 0
            for memoria in abandonos:
                estado = memoria.state
                
                # Heurística para descobrir ONDE o lead esfriou
                motivo = "Silêncio genérico"
                if estado in ['agendamento_awaiting_slot_choice', 'agendamento_awaiting_slot_confirmation', 'aguardando_escolha_horario_gestacao']:
                    motivo = "Incompatibilidade de agenda (Não escolheu horário)"
                elif estado in ['agendamento_awaiting_payment_choice', 'agendamento_awaiting_installments']:
                    motivo = "Objeção de preço/condição de pagamento"
                elif estado in ['agendamento_awaiting_type', 'agendamento_awaiting_modality', 'agendamento_awaiting_specialty', 'agendamento_awaiting_procedure']:
                    motivo = "Parou na qualificação inicial"
                elif 'cadastro' in estado:
                    motivo = "Fricção no cadastro de dados"

                # Avisa o CRM para mover o card para F5 e armar a cadência D0/D1/D3
                sucesso = CRMService.registrar_abandono_chatbot(memoria.session_id, motivo)
                
                if sucesso:
                    # Marca como encerrada para o bot não ficar mandando o lead pro CRM repetidas vezes
                    memoria.conversa_encerrada = True
                    memoria.save(update_fields=['conversa_encerrada'])
                    count += 1
                    
            print(f"🧹 [RECOVERY] Varredura concluída. {count} leads esfriaram e foram enviados ao CRM para resgate.")
            return count

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Erro ao processar abandonos para o CRM: {e}")
            return 0
