# chatbot/views.py - VERSÃO ATUALIZADA

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_api_key.permissions import HasAPIKey
from .models import ChatMemory

# --- NOVAS IMPORTAÇÕES ---
from pacientes.models import Paciente
from agendamentos.serializers import AgendamentoWriteSerializer
from django.utils import timezone
from datetime import timedelta
# -------------------------


class ChatMemoryView(APIView):
    # ... (sua view de memória do chat continua aqui, sem alterações) ...
    permission_classes = [HasAPIKey]
    # ... (código da get e post) ...
    def get(self, request, session_id):
        try:
            chat = ChatMemory.objects.get(session_id=session_id)
            return Response({'memoryData': chat.memory_data})
        except ChatMemory.DoesNotExist:
            return Response({'memoryData': []})

    def post(self, request):
        session_id = request.data.get('sessionId')
        memory_data = request.data.get('memoryData')
        if not session_id or memory_data is None:
            return Response(
                {'error': 'sessionId e memoryData são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        obj, created = ChatMemory.objects.update_or_create(
            session_id=session_id,
            defaults={'memory_data': memory_data}
        )
        return Response(
            {'status': 'Memória salva com sucesso'},
            status=status.HTTP_200_OK
        )


# --- NOVA VIEW PARA AGENDAMENTO VIA CHATBOT ---
class AgendamentoChatbotView(APIView):
    """
    Endpoint seguro para o N8N criar agendamentos.
    """
    permission_classes = [HasAPIKey]

    def post(self, request):
        session_id = request.data.get('sessionId')
        cpf_paciente = request.data.get('cpf')
        data_hora_inicio_str = request.data.get('data_hora_inicio') # Ex: "2025-09-25T10:00:00"

        if not all([session_id, cpf_paciente, data_hora_inicio_str]):
            return Response(
                {'error': 'sessionId, cpf e data_hora_inicio são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Encontrar o paciente
        try:
            # A forma mais segura é verificar o CPF E o telefone (session_id)
            paciente = Paciente.objects.get(cpf=cpf_paciente, telefone=session_id)
        except Paciente.DoesNotExist:
            return Response(
                {'error': 'Paciente não encontrado ou dados não conferem. Por favor, verifique o CPF e tente novamente.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # 2. Preparar os dados para o serializer
        # Usamos o AgendamentoWriteSerializer que você já criou!
        # Isso garante que todas as regras de negócio sejam as mesmas.
        try:
            data_hora_inicio = timezone.datetime.fromisoformat(data_hora_inicio_str)
            data_hora_fim = data_hora_inicio + timedelta(minutes=50) # Duração padrão de 50 min
        except ValueError:
             return Response(
                {'error': 'Formato de data inválido. Use AAAA-MM-DDTHH:MM:SS.'},
                status=status.HTTP_400_BAD_REQUEST
            )


        dados_agendamento = {
            'paciente': paciente.id,
            'data_hora_inicio': data_hora_inicio,
            'data_hora_fim': data_hora_fim,
            'status': 'Confirmado', # Já entra como confirmado pelo WhatsApp
            'tipo_atendimento': 'Particular', # Exemplo padrão
            # Outros campos podem ser adicionados aqui se o chatbot os coletar
        }

        serializer = AgendamentoWriteSerializer(data=dados_agendamento)

        # 3. Validar e Salvar
        if serializer.is_valid():
            # A lógica de criar o pagamento pendente que está na sua outra view
            # será executada AUTOMATICAMENTE se você estiver usando signals,
            # ou podemos chamá-la aqui diretamente. Vamos assumir que não usa signals.

            agendamento = serializer.save()

            # Replicando a lógica da sua view original para criar o pagamento
            if agendamento.tipo_atendimento == 'Particular':
                from faturamento.models import Pagamento # Importação local
                valor_pagamento = 0.00
                if agendamento.procedimento:
                    valor_pagamento = agendamento.procedimento.valor

                Pagamento.objects.create(
                    agendamento=agendamento,
                    paciente=agendamento.paciente,
                    valor=valor_pagamento,
                    status='Pendente',
                    registrado_por=request.user # O usuário será o 'n8n_service_user'
                )

            return Response(
                {'sucesso': f"Agendamento para {paciente.nome_completo} criado com sucesso para {data_hora_inicio.strftime('%d/%m/%Y às %H:%M')}."},
                status=status.HTTP_201_CREATED
            )
        else:
            # Se houver erros de validação (ex: horário ocupado), eles serão retornados
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)