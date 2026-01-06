# backend/agendamentos/views.py - VERSÃO FINAL CORRIGIDA

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError # <--- Importante para bloquear exclusão
from usuarios.permissions import IsRecepcaoOrAdmin, AllowRead_WriteRecepcaoAdmin
from django.utils.dateparse import parse_datetime, parse_date
from .models import Agendamento, Sala
from .serializers import AgendamentoSerializer, AgendamentoWriteSerializer, SalaSerializer
from django.utils import timezone
from django.core.mail import send_mail
from faturamento.models import Pagamento, Procedimento
import datetime
import requests
import os
from . import services
from rest_framework_api_key.permissions import HasAPIKey
from .management.commands.cancelar_agendamentos_expirados import Command as CancelarAgendamentosCommand

# --- VIEW PARA LISTAR AS SALAS (Usada pelo Modal para popular o Dropdown) ---
class SalaListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Sala.objects.all().order_by('nome')
    serializer_class = SalaSerializer

# --- VIEW PRINCIPAL DE AGENDAMENTOS ---
class AgendamentoListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [AllowRead_WriteRecepcaoAdmin]
    serializer_class = AgendamentoSerializer # Default para GET
    
    def get_queryset(self):
        queryset = Agendamento.objects.select_related(
            'paciente', 'medico', 'especialidade', 'sala', 'procedimento', 'plano_utilizado'
        ).prefetch_related('pagamento').all().order_by('data_hora_inicio')
        
        # Filtros (usados pelo FullCalendar e Frontend)
        sala_id = self.request.query_params.get('sala_id')
        if sala_id:
            queryset = queryset.filter(sala_id=sala_id)

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
        
        # --- MUDANÇA 1: DESCRIÇÃO LIMPA ---
        # Antes: "Ref. Agendamento 196 - Obstétrico..."
        # Agora: "Obstétrico com Doppler" (ou "Consulta")
        valor_inicial = 0
        descricao_texto = "Consulta"

        if agendamento.procedimento:
            valor_inicial = agendamento.procedimento.valor_particular
            descricao_texto = agendamento.procedimento.descricao 

        Pagamento.objects.create(
            agendamento=agendamento,
            paciente=agendamento.paciente,
            valor=valor_inicial,
            descricao=descricao_texto, 
            status='Pendente',
            data_vencimento=agendamento.data_hora_inicio.date(),
            registrado_por=self.request.user
        )


class AgendamentoDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowRead_WriteRecepcaoAdmin]
    queryset = Agendamento.objects.select_related(
        'paciente', 'medico', 'especialidade', 'sala', 'procedimento', 'plano_utilizado'
    ).prefetch_related('pagamento').all()
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return AgendamentoWriteSerializer
        return AgendamentoSerializer

    def perform_update(self, serializer):
        agendamento = serializer.save()
        pagamento = getattr(agendamento, 'pagamento', None)
        
        # --- MUDANÇA 2: NÃO COMPARECEU ---
        if agendamento.status == 'Não Compareceu':
            # Se o paciente não foi, cancelamos a cobrança pendente.
            # "Cancelado" faz sumir das listas de "A Receber", mas mantêm o registro auditável.
            if pagamento and pagamento.status == 'Pendente':
                pagamento.status = 'Cancelado'
                pagamento.save()
            return # Encerra aqui, não recalcula valor

        # Atualização normal (se ainda for Pendente)
        if pagamento and pagamento.status == 'Pendente':
            valor_novo = 0
            desc_nova = "Consulta"
            
            if agendamento.procedimento:
                valor_novo = agendamento.procedimento.valor_particular
                desc_nova = agendamento.procedimento.descricao # Descrição Limpa
            
            pagamento.paciente = agendamento.paciente
            pagamento.valor = valor_novo
            pagamento.descricao = desc_nova
            pagamento.data_vencimento = agendamento.data_hora_inicio.date()
            pagamento.save()

    def perform_destroy(self, instance):
        """
        Lógica personalizada de exclusão.
        """
        agora = timezone.now()
        
        # --- MUDANÇA 3: BLOQUEIO DE PASSADO ---
        # "Qualquer agendamento depois do horario da consulta nao será excluído"
        # (Interpretei como: se a consulta já passou, não pode excluir)
        if instance.data_hora_inicio < agora:
            raise ValidationError("Por segurança e histórico, não é permitido excluir agendamentos passados. Marque como 'Cancelado' ou 'Não Compareceu'.")

        # --- MUDANÇA 4: APAGAR FINANCEIRO FUTURO ---
        # "Excluir até um tempo determinado antes... exclui também o financeiro"
        pagamento = getattr(instance, 'pagamento', None)
        if pagamento and pagamento.status == 'Pendente':
            pagamento.delete()
            
        instance.delete()


class AgendamentosNaoPagosListAPIView(generics.ListAPIView):
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]
    def get_queryset(self):
        return Agendamento.objects.select_related(
            'paciente', 'medico', 'especialidade', 'sala', 'procedimento', 'plano_utilizado'
        ).filter(pagamento__isnull=True).order_by('data_hora_inicio')


class AgendamentosHojeListView(generics.ListAPIView):
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        hoje = timezone.localtime(timezone.now()).date()
        queryset = Agendamento.objects.select_related(
            'paciente', 'medico', 'especialidade', 'sala', 'procedimento', 'plano_utilizado'
        ).prefetch_related('pagamento').filter(data_hora_inicio__date=hoje).order_by('data_hora_inicio')
        
        medico_id = self.request.query_params.get('medico_id')
        if medico_id:
            queryset = queryset.filter(medico_id=medico_id)
            
        return queryset


class HorariosDisponiveisAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        data_str = request.query_params.get('data')
        medico_id = request.query_params.get('medico_id')
        especialidade_id = request.query_params.get('especialidade_id')

        if not data_str or not medico_id:
            return Response({'detail': 'Parâmetros obrigatórios ausentes.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            data_selecionada = parse_date(data_str)
            if not data_selecionada: raise ValueError
        except ValueError:
            return Response({'detail': 'Data inválida.'}, status=status.HTTP_400_BAD_REQUEST)

        horarios = services.buscar_horarios_para_data(data_selecionada, medico_id, especialidade_id)
        return Response(horarios, status=status.HTTP_200_OK)
    

class ListaEsperaListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AgendamentoSerializer

    def get_queryset(self):
        hoje = timezone.localtime(timezone.now()).date()
        inicio_do_dia = timezone.make_aware(datetime.datetime.combine(hoje, datetime.time.min))

        return Agendamento.objects.filter(
            sala__isnull=True,
            modalidade='Presencial',
            data_hora_inicio__gte=inicio_do_dia
        ).order_by('data_hora_inicio')


class EnviarLembretesCronView(APIView):
    permission_classes = [HasAPIKey]

    def get(self, request, *args, **kwargs):
        agora = timezone.localtime(timezone.now())
        amanha = agora.date() + datetime.timedelta(days=1)
        inicio = timezone.make_aware(datetime.datetime.combine(amanha, datetime.time.min))
        fim = timezone.make_aware(datetime.datetime.combine(amanha, datetime.time.max))

        agendamentos = Agendamento.objects.filter(
            data_hora_inicio__gte=inicio, data_hora_inicio__lte=fim, status='Confirmado'
        ).select_related('paciente')

        enviados = 0
        for ag in agendamentos:
            if ag.paciente.email:
                try:
                    send_mail(
                        subject="Lembrete de Consulta - Clínica Limalé",
                        message=f"Olá {ag.paciente.nome_completo}, lembramos da sua consulta amanhã às {timezone.localtime(ag.data_hora_inicio).strftime('%H:%M')}.",
                        from_email=None,
                        recipient_list=[ag.paciente.email],
                        fail_silently=False,
                    )
                    enviados += 1
                except Exception: pass
        
        return Response({'status': f'{enviados} lembretes enviados.'})


class CriarSalaTelemedicinaView(APIView):
    def post(self, request, agendamento_id):
        try:
            agendamento = Agendamento.objects.get(pk=agendamento_id)
        except Agendamento.DoesNotExist:
            return Response({'detail': 'Não encontrado.'}, status=404)

        api_key = os.environ.get('DAILY_API_KEY')
        if not api_key: return Response({'detail': 'API Key não configurada.'}, status=500)

        expiracao = agendamento.data_hora_inicio + datetime.timedelta(hours=2)
        try:
            res = requests.post(
                'https://api.daily.co/v1/rooms', 
                headers={'Authorization': f'Bearer {api_key}'}, 
                json={'properties': {'exp': int(expiracao.timestamp())}}
            )
            res.raise_for_status()
            data = res.json()
            
            agendamento.link_telemedicina = data.get('url')
            agendamento.id_sala_telemedicina = data.get('id')
            agendamento.save()
            
            return Response({'roomUrl': data.get('url')}, status=201)
        except Exception as e:
            return Response({'detail': str(e)}, status=500)


class TelemedicinaListView(generics.ListAPIView):
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Agendamento.objects.filter(
            data_hora_inicio__gte=timezone.now(),
            modalidade='Telemedicina'
        ).order_by('data_hora_inicio').select_related('paciente')


class ExecutarCancelamentosExpiradosView(APIView):
    permission_classes = [HasAPIKey]
    def post(self, request):
        call_command = CancelarAgendamentosCommand()
        try:
            call_command.handle()
            return Response({"status": "Executado"}, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class VerificarCapacidadeHorarioAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        inicio_str = request.query_params.get('inicio')
        fim_str = request.query_params.get('fim')
        
        if not inicio_str or not fim_str:
            return Response({'detail': 'Dados insuficientes.'}, status=400)

        try:
            inicio = parse_datetime(inicio_str)
            fim = parse_datetime(fim_str)
        except ValueError:
            return Response({'detail': 'Data inválida.'}, status=400)

        agendamentos_conflitantes = Agendamento.objects.filter(
            data_hora_inicio__lt=fim, 
            data_hora_fim__gt=inicio,
        ).exclude(status='Cancelado')

        qtd_consultas = agendamentos_conflitantes.filter(tipo_agendamento='Consulta').count()
        qtd_procedimentos = agendamentos_conflitantes.filter(tipo_agendamento='Procedimento').count()
        
        return Response({
            'consultas_agendadas': qtd_consultas,
            'procedimentos_agendados': qtd_procedimentos,
            'verificacao_por_sala': False
        })
        

class MinhaAgendaView(generics.ListAPIView):
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        hoje = timezone.now().date()
        return Agendamento.objects.filter(
            medico=self.request.user, 
            data_hora_inicio__date__gte=hoje,
            status__in=['Agendado', 'Confirmado']
        ).order_by('data_hora_inicio')

class DashboardKPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hoje = timezone.localtime(timezone.now()).date()
        agora = timezone.now()
        inicio_mes = hoje.replace(day=1)

        count_hoje = Agendamento.objects.filter(data_hora_inicio__date=hoje).count()

        count_confirmar = Agendamento.objects.filter(
            data_hora_inicio__gte=agora,
            status='Agendado'
        ).count()

        try:
            from pacientes.models import Paciente
            count_novos = Paciente.objects.filter(data_cadastro__gte=inicio_mes).count()
        except AttributeError:
            count_novos = 0
        except Exception:
            count_novos = 0

        return Response({
            "hoje": count_hoje,
            "novos": count_novos,
            "confirmar": count_confirmar
        })