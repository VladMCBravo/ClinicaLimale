# chatbot/views.py - VERSÃO REFATORADA E INTEGRADA

import re
import mercadopago
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_api_key.permissions import HasAPIKey
from .models import ChatMemory

# --- IMPORTAÇÕES ---
from pacientes.models import Paciente
from faturamento.models import Procedimento, Pagamento
from agendamentos.serializers import AgendamentoWriteSerializer
from agendamentos.models import Agendamento
from datetime import datetime, time, timedelta
from django.utils import timezone
from usuarios.models import CustomUser
from pacientes.serializers import PacienteSerializer
# --- 1. A IMPORTAÇÃO MAIS IMPORTANTE ---
# Importamos o nosso módulo de serviços do app de agendamentos
from agendamentos import services as agendamento_services

class ChatMemoryView(APIView):
    # ... (sem alterações) ...
    permission_classes = [HasAPIKey]
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

# ... (CadastrarPacienteView e ConsultarAgendamentosPacienteView não mudam) ...
class CadastrarPacienteView(APIView):
    permission_classes = [HasAPIKey]
    def post(self, request):
        cpf = request.data.get('cpf')
        email = request.data.get('email')
        if cpf:
            cpf = re.sub(r'\D', '', cpf)
        if Paciente.objects.filter(cpf=cpf).exists():
            return Response({'error': 'Um paciente com este CPF já está cadastrado.'}, status=status.HTTP_409_CONFLICT)
        if Paciente.objects.filter(email=email).exists():
            return Response({'error': 'Um paciente com este email já está cadastrado.'}, status=status.HTTP_409_CONFLICT)
        serializer = PacienteSerializer(data=request.data)
        if serializer.is_valid():
            paciente = serializer.save()
            return Response(
                {'sucesso': f"Paciente {paciente.nome_completo} cadastrado com sucesso!", "paciente_id": paciente.id},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ConsultarAgendamentosPacienteView(APIView):
    permission_classes = [HasAPIKey]
    def get(self, request):
        cpf = request.query_params.get('cpf')
        if cpf:
            cpf = re.sub(r'\D', '', cpf)
        if not cpf:
            return Response({'error': 'O parâmetro "cpf" é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            paciente = Paciente.objects.get(cpf=cpf)
            agendamentos = Agendamento.objects.filter(paciente=paciente).order_by('-data_hora_inicio')
            dados_formatados = [
                {
                    "id": ag.id,
                    "data_hora": timezone.localtime(ag.data_hora_inicio).strftime('%d/%m/%Y às %H:%M'),
                    "status": ag.status,
                    "procedimento": ag.procedimento.descricao if ag.procedimento else "Não especificado"
                }
                for ag in agendamentos
            ]
            return Response(dados_formatados)
        except Paciente.DoesNotExist:
            return Response({"error": "Paciente com este CPF não encontrado."}, status=status.HTTP_404_NOT_FOUND)

# --- A VIEW PRINCIPAL QUE VAMOS REFATORAR ---
class AgendamentoChatbotView(APIView):
    permission_classes = [HasAPIKey]

    def post(self, request):
        session_id = request.data.get('sessionId')
        cpf_paciente = request.data.get('cpf')
        data_hora_inicio_str = request.data.get('data_hora_inicio')
        procedimento_id = request.data.get('procedimentoId')
        # Define o prazo de validade para 15 minutos a partir de agora
        prazo_expiracao = timezone.now() + timedelta(minutes=15)

        if cpf_paciente:
            cpf_paciente = re.sub(r'\D', '', cpf_paciente)

        if not all([session_id, cpf_paciente, data_hora_inicio_str]):
            return Response({'error': 'sessionId, cpf e data_hora_inicio são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            paciente = Paciente.objects.get(cpf=cpf_paciente, telefone_celular=session_id)
        except Paciente.DoesNotExist:
            return Response({'error': 'Paciente não encontrado ou dados não conferem.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            data_hora_inicio = timezone.datetime.fromisoformat(data_hora_inicio_str)
            data_hora_fim = data_hora_inicio + timedelta(minutes=50)
        except ValueError:
             return Response({'error': 'Formato de data inválido. Use AAAA-MM-DDTHH:MM:SS.'}, status=status.HTTP_400_BAD_REQUEST)

        dados_agendamento = {
            'paciente': paciente.id,
            'data_hora_inicio': data_hora_inicio,
            'data_hora_fim': data_hora_fim,
            'status': 'Agendado',
            'tipo_atendimento': 'Particular',
            'procedimento': procedimento_id,
            'expira_em': prazo_expiracao, # <-- ADICIONE ESTA LINHA
        }

        serializer = AgendamentoWriteSerializer(data=dados_agendamento)

        if serializer.is_valid():
            # 2. A MÁGICA DA REFATORAÇÃO
            # Em vez de salvar e depois criar o pagamento aqui, delegamos tudo para o serviço.
            agendamento = serializer.save()
            
            # Busca o usuário de serviço que será usado como 'registrado_por'
            try:
                usuario_servico = CustomUser.objects.get(username='servico_chatbot')
            except CustomUser.DoesNotExist:
                usuario_servico = CustomUser.objects.get(id=1) # Fallback para o admin

            # Chamamos a função de serviço que já contém TODA a lógica de negócio
            agendamento_services.criar_agendamento_e_pagamento_pendente(agendamento, usuario_servico)

        return Response(
                {'sucesso': f"Agendamento para {paciente.nome_completo} criado com sucesso para {data_hora_inicio.strftime('%d/%m/%Y às %H:%M')}. Status: {agendamento.status}",
                 'agendamento_id': agendamento.id  # <-- ADICIONE ESTA LINHA
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# --- O resto das views não precisa de alterações ---
# ... (VerificarPacienteView, ListarProcedimentosView, etc. continuam aqui) ...
class VerificarPacienteView(APIView):
    permission_classes = [HasAPIKey]
    def get(self, request):
        telefone = request.query_params.get('telefone')
        if not telefone:
            return Response({'error': 'O parâmetro "telefone" é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            paciente = Paciente.objects.get(telefone_celular=telefone)
            return Response({"status": "paciente_encontrado", "paciente_id": paciente.id, "nome_completo": paciente.nome_completo})
        except Paciente.DoesNotExist:
            return Response({"status": "paciente_nao_encontrado"}, status=status.HTTP_404_NOT_FOUND)

class ListarProcedimentosView(APIView):
    permission_classes = [HasAPIKey]
    def get(self, request):
        procedimentos = Procedimento.objects.filter(valor_particular__gt=0).filter(ativo=True)
        dados_formatados = [{"id": proc.id, "nome": proc.descricao, "valor": f"{proc.valor_particular:.2f}".replace('.', ',')} for proc in procedimentos]
        return Response(dados_formatados)

class ConsultarHorariosDisponiveisView(APIView):
    permission_classes = [HasAPIKey]
    def get(self, request):
        data_str = request.query_params.get('data')
        if not data_str:
            return Response({'error': 'O parâmetro "data" é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            data_desejada = datetime.strptime(data_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Formato de data inválido. Use AAAA-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        
                
        horario_inicio_dia = time(8, 0)
        horario_fim_dia = time(18, 0)
        duracao_consulta_min = 50
        intervalo_min = 10
        agendamentos_no_dia = Agendamento.objects.filter(
        data_hora_inicio__date=data_desejada
        ).exclude(status='Cancelado')
        horarios_ocupados = {timezone.localtime(ag.data_hora_inicio).time() for ag in agendamentos_no_dia}
        horarios_disponiveis = []
        horario_atual = datetime.combine(data_desejada, horario_inicio_dia)
        fim_do_dia = datetime.combine(data_desejada, horario_fim_dia)
        while horario_atual < fim_do_dia:
            if horario_atual.time() not in horarios_ocupados:
                horarios_disponiveis.append(horario_atual.strftime('%H:%M'))
            horario_atual += timedelta(minutes=duracao_consulta_min + intervalo_min)
        return Response({"data": data_str, "horarios_disponiveis": horarios_disponiveis})

class VerificarSegurancaView(APIView):
    permission_classes = [HasAPIKey]
    def post(self, request):
        telefone = request.data.get('telefone_celular')
        cpf = request.data.get('cpf')
        if cpf:
            cpf = re.sub(r'\D', '', cpf)
        if not telefone or not cpf:
            return Response({'error': 'Os campos "telefone_celular" e "cpf" são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)
        paciente_existe = Paciente.objects.filter(telefone_celular=telefone, cpf=cpf).exists()
        if paciente_existe:
            return Response({"status": "verificado"})
        else:
            return Response({"status": "dados_nao_conferem"}, status=status.HTTP_403_FORBIDDEN)
        
class GerarPixView(APIView):
    permission_classes = [HasAPIKey]
    def post(self, request):
        agendamento_id = request.data.get('agendamento_id')
        if not agendamento_id:
            return Response({'error': 'agendamento_id é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            agendamento = Agendamento.objects.get(id=agendamento_id)
            pagamento = Pagamento.objects.get(agendamento=agendamento)
        except (Agendamento.DoesNotExist, Pagamento.DoesNotExist):
            return Response({'error': 'Agendamento ou Pagamento não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        sdk = mercadopago.SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)
        notification_url = request.build_absolute_uri('/api/chatbot/pagamentos/webhook/')
        payment_data = {
            "transaction_amount": float(pagamento.valor),
            "description": f"Pagamento para consulta: {agendamento.procedimento.descricao}",
            "payment_method_id": "pix",
            "payer": {
                "email": agendamento.paciente.email,
                "first_name": agendamento.paciente.nome_completo.split(' ')[0],
            },
            "notification_url": notification_url,
        }
        payment_response = sdk.payment().create(payment_data)
        payment = payment_response["response"]
        if payment_response["status"] == 201:
            pagamento.id_transacao_externa = str(payment['id'])
            pagamento.save()
            qr_code = payment['point_of_interaction']['transaction_data']['qr_code']
            qr_code_base64 = payment['point_of_interaction']['transaction_data']['qr_code_base64']
            return Response({
                "agendamento_id": agendamento.id,
                "status": "pix_gerado",
                "qr_code_texto": qr_code,
                "qr_code_imagem": f"data:image/png;base64,{qr_code_base64}"
            })
        else:
            return Response(payment_response, status=status.HTTP_400_BAD_REQUEST)

class MercadoPagoWebhookView(APIView):
    def post(self, request):
        query_params = request.query_params
        if query_params.get("type") == "payment":
            payment_id = query_params.get("data.id")
            sdk = mercadopago.SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)
            payment_info = sdk.payment().get(payment_id)
            if payment_info["status"] == 200:
                payment_data = payment_info["response"]
                try:
                    pagamento = Pagamento.objects.get(id_transacao_externa=str(payment_data["id"]))
                    if payment_data["status"] == "approved" and pagamento.agendamento.status == "Agendado":
                        pagamento.status = 'Pago'
                        pagamento.save()
                        agendamento = pagamento.agendamento
                        agendamento.status = 'Confirmado'
                        agendamento.save()
                except Pagamento.DoesNotExist:
                    pass
        return Response(status=status.HTTP_200_OK)

