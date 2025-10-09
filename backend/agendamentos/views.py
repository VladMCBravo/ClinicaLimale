# backend/agendamentos/views.py - VERSÃO FINAL E COMPLETA

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from usuarios.permissions import IsRecepcaoOrAdmin, IsAdminUser
from django.utils.dateparse import parse_datetime, parse_date
from .models import Agendamento, Sala
from .serializers import AgendamentoSerializer, AgendamentoWriteSerializer, SalaSerializer
from django.utils import timezone
from django.core.mail import send_mail
from faturamento.models import Pagamento, Procedimento
import datetime # ALTERADO: Importe o módulo datetime inteiro
import requests
import os
from usuarios.permissions import IsRecepcaoOrAdmin, IsAdminUser, AllowRead_WriteRecepcaoAdmin
from . import services # <-- 1. IMPORTE O NOVO MÓDULO DE SERVIÇOS
from rest_framework_api_key.permissions import HasAPIKey
# Importa a classe do nosso comando de cancelamento
from .management.commands.cancelar_agendamentos_expirados import Command as CancelarAgendamentosCommand

# <<-- NOVA VIEW PARA LISTAR AS SALAS -->>
class SalaListView(generics.ListAPIView):
    """
    Endpoint para listar todas as salas de atendimento disponíveis.
    """
    permission_classes = [IsAuthenticated]
    queryset = Sala.objects.all().order_by('nome')
    serializer_class = SalaSerializer

# --- CLASSE DE AGENDAMENTOS ALTERADA PARA FILTRAR POR SALA ---
class AgendamentoListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [AllowRead_WriteRecepcaoAdmin]
    serializer_class = AgendamentoSerializer # Default para GET
    
    def get_queryset(self):
        """
        Adiciona a capacidade de filtrar agendamentos por sala.
        """
        queryset = Agendamento.objects.all().select_related(
            'paciente', 'medico', 'especialidade', 'sala' # Adiciona 'sala' para otimizar a query
        ).order_by('data_hora_inicio')
        
        # Filtro por sala (usado pelo FullCalendar para a visão de recursos)
        sala_id = self.request.query_params.get('sala_id')
        if sala_id:
            queryset = queryset.filter(sala_id=sala_id)

        # Filtros existentes (você pode adicionar outros aqui, como por data)
        medico_id = self.request.query_params.get('medico_id')
        if medico_id:
            queryset = queryset.filter(medico_id=medico_id)
            
        return queryset

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AgendamentoWriteSerializer
        return AgendamentoSerializer
    
    def perform_create(self, serializer):
        agendamento = serializer.save()
        services.criar_agendamento_e_pagamento_pendente(agendamento, self.request.user)


class AgendamentoDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowRead_WriteRecepcaoAdmin]
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

# ALTERADA: Agora aceita o filtro por médico
class AgendamentosHojeListView(generics.ListAPIView):
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        hoje = timezone.localtime(timezone.now()).date()
        queryset = Agendamento.objects.filter(data_hora_inicio__date=hoje).order_by('data_hora_inicio')
        
        # Lógica de filtro adicionada
        medico_id = self.request.query_params.get('medico_id')
        if medico_id:
            queryset = queryset.filter(medico_id=medico_id)
            
        return queryset

# --- NOVA VIEW PARA O VERIFICADOR DE DISPONIBILIDADE ---
class HorariosDisponiveisAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        data_str = request.query_params.get('data')
        medico_id = request.query_params.get('medico_id')
        especialidade_id = request.query_params.get('especialidade_id')

        if not data_str or not medico_id:
            return Response(
                {'detail': 'Parâmetros "data" e "medico_id" são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            data_selecionada = parse_date(data_str)
            if not data_selecionada:
                raise ValueError
        except ValueError:
            return Response(
                {'detail': 'Formato de data inválido. Use AAAA-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        horarios = services.buscar_horarios_para_data(data_selecionada, medico_id, especialidade_id)
        return Response(horarios, status=status.HTTP_200_OK)
    
# <<-- CLASSE CORRIGIDA -->>
class ListaEsperaListView(generics.ListAPIView):
    """
    Endpoint para listar agendamentos na lista de espera.
    Regra corrigida: Mostra todos os agendamentos SEM SALA a partir do
    início do dia de hoje.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = AgendamentoSerializer

    def get_queryset(self):
        # Pega a data de hoje no fuso horário local do servidor
        hoje = timezone.localtime(timezone.now()).date()
        # Define o ponto de partida como o início (00:00) do dia de hoje
        inicio_do_dia_de_hoje = timezone.make_aware(datetime.datetime.combine(hoje, datetime.time.min))

        # Filtra por agendamentos sem sala que são do dia de hoje em diante.
        return Agendamento.objects.filter(
            sala__isnull=True,
            data_hora_inicio__gte=inicio_do_dia_de_hoje
        ).order_by('data_hora_inicio')
    
# --- VIEW DE ENVIO DE LEMBRETES COM A CORREÇÃO DE FUSO HORÁRIO ---
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
    def post(self, request, agendamento_id, *args, **kwargs):
        try:
            agendamento = Agendamento.objects.get(pk=agendamento_id)
        except Agendamento.DoesNotExist:
            return Response({'detail': 'Agendamento não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        # --- LÓGICA PARA A API DA DAILY.CO ---
        api_key = os.environ.get('DAILY_API_KEY') # <-- Usaremos uma nova variável de ambiente
        if not api_key:
            return Response(
                {'detail': 'A chave da API de vídeo não está configurada no servidor.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }

        # Vamos definir para expirar 2 horas após o início da consulta
        # ALTERADO: Acessamos o timedelta a partir do módulo datetime que importamos
        expiracao = agendamento.data_hora_inicio + datetime.timedelta(hours=2) #
        
        payload = {
            'properties': {
                'exp': int(expiracao.timestamp())
            }
        }

        try:
            # O endpoint para criar salas na Daily.co é /rooms
            response = requests.post('https://api.daily.co/v1/rooms', headers=headers, json=payload)
            response.raise_for_status()  # Lança exceção para erros 4xx/5xx

            data = response.json()
            room_url = data.get('url')
            room_id = data.get('id')

            # Salva os dados no nosso modelo de agendamento
            agendamento.link_telemedicina = room_url
            agendamento.id_sala_telemedicina = room_id
            agendamento.save()

            return Response({'roomUrl': room_url}, status=status.HTTP_201_CREATED)

        except requests.exceptions.RequestException as e:
            # Captura o erro da API e o retorna de forma clara
            error_detail = f'Erro ao comunicar com a API da Daily.co: {e}'
            if e.response:
                error_detail += f" | Resposta: {e.response.text}"

            return Response({'detail': error_detail}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- A VIEW QUE ESTAVA EM FALTA ---
class TelemedicinaListView(generics.ListAPIView):
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        hoje = timezone.now()
        
        # --- A MUDANÇA ESTÁ AQUI ---
        # Em vez de filtrar pelo nome do procedimento...
        # return Agendamento.objects.filter(procedimento__descricao__icontains='Telemedicina', ...)
        
        # ...filtramos diretamente pela nova flag de modalidade. É mais limpo e seguro.
        return Agendamento.objects.filter(
            data_hora_inicio__gte=hoje,
            modalidade='Telemedicina'
        ).order_by('data_hora_inicio').select_related('paciente', 'procedimento')

class ExecutarCancelamentosExpiradosView(APIView):
    permission_classes = [HasAPIKey]

    def post(self, request, *args, **kwargs):
        agora_utc = timezone.now()
        
        debug_info = {
            "horario_atual_utc": agora_utc.isoformat(),
            "agendamentos_pendentes_count": 0,
            "detalhes_pendentes": []
        }

        # Primeiro, buscamos todos os agendamentos pendentes para inspecionar
        agendamentos_pendentes = Agendamento.objects.filter(
            status='Agendado', 
            expira_em__isnull=False
        )
        debug_info["agendamentos_pendentes_count"] = agendamentos_pendentes.count()
        
        for ag in agendamentos_pendentes:
            debug_info["detalhes_pendentes"].append({
                "id": ag.id,
                "expira_em_utc": ag.expira_em.isoformat() if ag.expira_em else None,
                "expirado": ag.expira_em < agora_utc if ag.expira_em else False
            })

        # Agora, filtramos de verdade para ver quais realmente expiraram
        agendamentos_para_cancelar = agendamentos_pendentes.filter(expira_em__lte=agora_utc)
        
        total_cancelados = agendamentos_para_cancelar.update(status='Cancelado')
        
        return Response({
            "status": "sucesso", 
            "cancelados": total_cancelados,
            "debug_info": debug_info
        }, status=status.HTTP_200_OK)

# --- NOVA VIEW PARA VERIFICAR CAPACIDADE ---
class VerificarCapacidadeHorarioAPIView(APIView):
    permission_classes = [IsAuthenticated] # Protegido por autenticação

    def get(self, request, *args, **kwargs):
        inicio_str = request.query_params.get('inicio')
        fim_str = request.query_params.get('fim')

        if not inicio_str or not fim_str:
            return Response(
                {'detail': 'Parâmetros "inicio" e "fim" são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            inicio = parse_datetime(inicio_str)
            fim = parse_datetime(fim_str)
        except ValueError:
            return Response(
                {'detail': 'Formato de data inválido. Use o formato ISO 8601.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        conflitos = Agendamento.objects.filter(
            data_hora_inicio__lt=fim, 
            data_hora_fim__gt=inicio,
        ).exclude(status='Cancelado')

        consultas_agendadas = conflitos.filter(tipo_agendamento='Consulta').count()
        procedimentos_agendados = conflitos.filter(tipo_agendamento='Procedimento').count()

        return Response({
            'consultas_agendadas': consultas_agendadas,
            'procedimentos_agendados': procedimentos_agendados
        }, status=status.HTTP_200_OK)