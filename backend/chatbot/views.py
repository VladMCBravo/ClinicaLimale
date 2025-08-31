# chatbot/views.py - VERSÃO ATUALIZADA

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_api_key.permissions import HasAPIKey
from .models import ChatMemory

# --- NOVAS IMPORTAÇÕES ---
from pacientes.models import Paciente # Importe o modelo de Paciente
from faturamento.models import Procedimento # Importe o modelo de Procedimento
from agendamentos.serializers import AgendamentoWriteSerializer
from agendamentos.models import Agendamento # Importe o modelo de Agendamento
from datetime import datetime, time # Importe as ferramentas de data e hora
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

class VerificarPacienteView(APIView):
    """
    Verifica se um paciente existe com base no número de telefone.
    """
    permission_classes = [HasAPIKey] # Apenas o N8N pode acessar

    def get(self, request):
        telefone = request.query_params.get('telefone')
        if not telefone:
            return Response(
                {'error': 'O parâmetro "telefone" é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            paciente = Paciente.objects.get(telefone=telefone)
            return Response({
                "status": "paciente_encontrado",
                "paciente_id": paciente.id,
                "nome_completo": paciente.nome_completo
            })
        except Paciente.DoesNotExist:
            return Response(
                {"status": "paciente_nao_encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )
class ListarProcedimentosView(APIView):
    """
    Retorna uma lista de procedimentos (consultas, exames) com seus valores.
    """
    permission_classes = [HasAPIKey] # Apenas o N8N pode acessar

    def get(self, request):
        # Filtramos apenas procedimentos que têm um valor definido
        procedimentos = Procedimento.objects.filter(valor__gt=0)
        
        # Formatamos a resposta de uma forma simples para o N8N entender
        dados_formatados = [
            {
                "id": proc.id,
                "nome": proc.descricao, # Supondo que o nome do procedimento está no campo 'descricao'
                "valor": f"{proc.valor:.2f}".replace('.', ',') # Formata como "350,00"
            }
            for proc in procedimentos
        ]
        return Response(dados_formatados)

class ConsultarHorariosDisponiveisView(APIView):
    """
    Calcula e retorna os horários livres em um determinado dia.
    """
    permission_classes = [HasAPIKey]

    def get(self, request):
        data_str = request.query_params.get('data') # Formato esperado: "AAAA-MM-DD"
        if not data_str:
            return Response({'error': 'O parâmetro "data" é obrigatório.'}, status=4.00)

        try:
            data_desejada = datetime.strptime(data_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Formato de data inválido. Use AAAA-MM-DD.'}, status=4.00)

        # Lógica de horários (simplificada para o exemplo)
        # Você pode customizar isso com os horários reais da clínica
        horario_inicio_dia = time(9, 0)
        horario_fim_dia = time(18, 0)
        duracao_consulta_min = 50
        intervalo_min = 10

        # Pega todos os agendamentos já marcados para aquele dia
        agendamentos_no_dia = Agendamento.objects.filter(data_hora_inicio__date=data_desejada)
        horarios_ocupados = {ag.data_hora_inicio.time() for ag in agendamentos_no_dia}

        horarios_disponiveis = []
        horario_atual = datetime.combine(data_desejada, horario_inicio_dia)
        fim_do_dia = datetime.combine(data_desejada, horario_fim_dia)

        while horario_atual < fim_do_dia:
            if horario_atual.time() not in horarios_ocupados:
                horarios_disponiveis.append(horario_atual.strftime('%H:%M'))
            
            # Avança para o próximo slot (duração da consulta + intervalo)
            horario_atual += timedelta(minutes=duracao_consulta_min + intervalo_min)

        return Response({"data": data_str, "horarios_disponiveis": horarios_disponiveis})

class GerarPixView(APIView):
    """
    Gera uma cobrança PIX para um agendamento.
    """
    permission_classes = [HasAPIKey]

    def post(self, request):
        agendamento_id = request.data.get('agendamento_id')
        if not agendamento_id:
            return Response({'error': 'agendamento_id é obrigatório.'}, status=400)

        try:
            agendamento = Agendamento.objects.get(id=agendamento_id)
        except Agendamento.DoesNotExist:
            return Response({'error': 'Agendamento não encontrado.'}, status=404)

        # --- AQUI ENTRA A LÓGICA DO SEU GATEWAY DE PAGAMENTO ---
        # Exemplo:
        # 1. Chamar a API do Mercado Pago com os dados do agendamento.
        # 2. A API do Mercado Pago retorna os dados do PIX.
        # 3. Você salva o ID da transação no seu banco de dados.
        # ---------------------------------------------------------
        
        # Resposta de exemplo (simulada)
        qr_code_exemplo = "00020126...codigo_copia_cola_exemplo..."
        
        return Response({
            "agendamento_id": agendamento.id,
            "status": "pix_gerado",
            "qr_code_texto": qr_code_exemplo
        })