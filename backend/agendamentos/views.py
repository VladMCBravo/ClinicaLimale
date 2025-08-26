# backend/agendamentos/views.py - VERSÃO FINAL E COMPLETA

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from usuarios.permissions import IsRecepcaoOrAdmin, IsAdminUser
from .models import Agendamento
from .serializers import AgendamentoSerializer, AgendamentoWriteSerializer
from django.utils import timezone
from django.core.mail import send_mail
from faturamento.models import Pagamento, Procedimento
import datetime
import requests
import os

class AgendamentoListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Agendamento.objects.all().select_related('paciente').order_by('data_hora_inicio')
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AgendamentoWriteSerializer
        return AgendamentoSerializer
    def perform_create(self, serializer):
        agendamento = serializer.save()
        if agendamento.tipo_atendimento == 'Particular':
            valor_do_pagamento = 0.00
            if agendamento.procedimento:
                valor_do_pagamento = agendamento.procedimento.valor
            Pagamento.objects.create(
                agendamento=agendamento,
                paciente=agendamento.paciente,
                valor=valor_do_pagamento,
                status='Pendente',
                registrado_por=self.request.user
            )

class AgendamentoDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Agendamento.objects.all()
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return AgendamentoWriteSerializer
        return AgendamentoSerializer

class AgendamentosNaoPagosListAPIView(generics.ListAPIView):
    # ... (sem alterações nesta view)
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]
    def get_queryset(self):
        return Agendamento.objects.filter(pagamento__isnull=True).order_by('data_hora_inicio')

class AgendamentosHojeListView(generics.ListAPIView):
    # ... (sem alterações nesta view)
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        hoje = timezone.localtime(timezone.now()).date()
        return Agendamento.objects.filter(data_hora_inicio__date=hoje).order_by('data_hora_inicio')

# --- VIEW PARA O CRON JOB EXTERNO (AGORA SEM ERROS) ---
class EnviarLembretesCronView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        SECRET_KEY_CRON = os.environ.get('SECRET_KEY_CRON')
        provided_key = request.query_params.get('key')

        if not SECRET_KEY_CRON or provided_key != SECRET_KEY_CRON:
            return Response({'detail': 'Acesso não autorizado.'}, status=status.HTTP_401_UNAUTHORIZED)

        # A lógica para encontrar os agendamentos está correta
        agora = timezone.localtime(timezone.now())
        amanha = agora.date() + datetime.timedelta(days=1)
        inicio_de_amanha = timezone.make_aware(datetime.datetime.combine(amanha, datetime.time.min))
        fim_de_amanha = timezone.make_aware(datetime.datetime.combine(amanha, datetime.time.max))

        agendamentos_de_amanha = Agendamento.objects.filter(
            data_hora_inicio__gte=inicio_de_amanha,
            data_hora_inicio__lte=fim_de_amanha,
            status='Confirmado'
        ).select_related('paciente')

        if not agendamentos_de_amanha.exists():
            return Response({'status': 'Nenhum agendamento para amanhã.'})

        # --- BLOCO DE CÓDIGO RESTAURADO ---
        total_enviado = 0
        falhas = 0
        for agendamento in agendamentos_de_amanha:
            paciente = agendamento.paciente
            if paciente.email:
                hora_local = timezone.localtime(agendamento.data_hora_inicio)
                data_formatada = hora_local.strftime('%d/%m/%Y')
                hora_formatada = hora_local.strftime('%H:%M')

                assunto = f"Lembrete de Consulta - Clínica Limalé"
                mensagem = f"""
                Olá, {paciente.nome_completo}!

                Este é um lembrete da sua consulta amanhã, dia {data_formatada} às {hora_formatada}.

                Se precisar reagendar, por favor, entre em contato.

                Atenciosamente,
                Clínica Limalé
                """
                
                try:
                    # Esta é a função que realmente envia o email
                    send_mail(
                        subject=assunto,
                        message=mensagem,
                        from_email=None,  # Usa o DEFAULT_FROM_EMAIL do settings.py
                        recipient_list=[paciente.email],
                        fail_silently=False,
                    )
                    total_enviado += 1
                except Exception as e:
                    # Se houver uma falha, registamos o erro
                    print(f"Falha ao enviar email para {paciente.email}: {e}")
                    falhas += 1
        
        return Response({'status': f'Processo concluído. {total_enviado} emails enviados, {falhas} falhas.'})

# --- VIEW DE TELEMEDICINA COM A CORREÇÃO DE FUSO HORÁRIO ---
class CriarSalaTelemedicinaView(APIView):
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]
    def post(self, request, agendamento_id, *args, **kwargs):
        try:
            agendamento = Agendamento.objects.get(id=agendamento_id)
        except Agendamento.DoesNotExist:
            return Response({'detail': 'Agendamento não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if agendamento.link_telemedicina:
            return Response({'link_telemedicina': agendamento.link_telemedicina}, status=status.HTTP_200_OK)

        api_key = os.environ.get('WHEREBY_API_KEY')
        if not api_key:
            return Response({'detail': 'API Key do serviço de vídeo não configurada no servidor.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        headers = { 'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json' }
        end_time = agendamento.data_hora_fim + datetime.timedelta(hours=1)
        end_time_utc = end_time.astimezone(datetime.timezone.utc)
        endDate = end_time_utc.strftime('%Y-%m-%dT%H:%M:%S.000Z')
        payload = { "endDate": endDate, "fields": ["hostRoomUrl"] }

        try:
            response = requests.post('https://api.whereby.com/v1/meetings', headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            link_sala = data.get('roomUrl')
            id_sala = data.get('meetingId')

            if not link_sala:
                return Response({'detail': 'Não foi possível obter o link da sala.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            agendamento.link_telemedicina = link_sala
            agendamento.id_sala_telemedicina = id_sala
            agendamento.save()
            return Response({'link_telemedicina': link_sala}, status=status.HTTP_201_CREATED)
        except requests.exceptions.RequestException as e:
            return Response({'detail': f'Erro ao comunicar com a API do Whereby: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- A VIEW QUE ESTAVA EM FALTA ---
class TelemedicinaListView(generics.ListAPIView):
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        hoje = timezone.now()
        return Agendamento.objects.filter(
            data_hora_inicio__gte=hoje,
            procedimento__descricao__icontains='Telemedicina'
        ).order_by('data_hora_inicio').select_related('paciente', 'procedimento')