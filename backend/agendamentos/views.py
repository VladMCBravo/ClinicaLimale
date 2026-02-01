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
from django.db import transaction # <--- IMPORTANTE
from datetime import timedelta
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
    
    def create(self, request, *args, **kwargs):
        # Verifica se é um agendamento de múltiplos procedimentos
        if 'procedimentos_ids' in request.data and isinstance(request.data['procedimentos_ids'], list):
            return self.create_multi_procedimentos(request)
            
        return super().create(request, *args, **kwargs)

    def create_multi_procedimentos(self, request):
        procedimentos_ids = request.data.pop('procedimentos_ids', [])
        data_inicio_base = parse_datetime(request.data.get('data_hora_inicio'))
        
        if len(procedimentos_ids) > 4: # Exemplo de limite de segurança
            return Response({"detail": "Máximo de 4 procedimentos por vez."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not procedimentos_ids or not data_inicio_base:
            return Response({"detail": "Dados inválidos."}, status=status.HTTP_400_BAD_REQUEST)

        agendamentos_criados = []
        errors = []

        # Usamos atomic para garantir que ou agendam todos, ou nenhum (evita agendar 3 e falhar o 4º)
        with transaction.atomic():
            tempo_acumulado = data_inicio_base

            for proc_id in procedimentos_ids:
                try:
                    # Busca detalhes do procedimento para saber a duração
                    # Se não tiver config, assume 15 min como solicitado
                    procedimento = Procedimento.objects.get(id=proc_id)
                    duracao = timedelta(minutes=15) 
                    
                    if hasattr(procedimento, 'configuracao_clinica') and procedimento.configuracao_clinica.duracao_padrao:
                        duracao = procedimento.configuracao_clinica.duracao_padrao

                    tempo_fim = tempo_acumulado + duracao

                    # Prepara os dados para este "slot"
                    dados_item = request.data.copy()
                    dados_item['procedimento'] = proc_id
                    dados_item['tipo_agendamento'] = 'Procedimento'
                    dados_item['data_hora_inicio'] = tempo_acumulado.isoformat()
                    dados_item['data_hora_fim'] = tempo_fim.isoformat()
                    
                    # Remove campos que podem dar conflito se passados duplicados
                    if 'especialidade' in dados_item: del dados_item['especialidade']
                    if 'medico' in dados_item: del dados_item['medico']

                    # Serializa e Valida (Isso vai checar colisão de sala para CADA slot)
                    serializer = self.get_serializer(data=dados_item)
                    serializer.is_valid(raise_exception=True)
                    self.perform_create(serializer)
                    
                    agendamentos_criados.append(serializer.data)

                    # Atualiza o início do próximo para o fim deste
                    tempo_acumulado = tempo_fim

                except Exception as e:
                    # Se der erro em qualquer um, o transaction.atomic desfaz tudo
                    raise ValidationError(f"Não foi possível agendar o procedimento ID {proc_id} no horário {tempo_acumulado}. Motivo: {str(e)}")

        return Response(agendamentos_criados, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        # Mantém sua lógica original de pagamentos
        agendamento = serializer.save()
        
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
        instance = self.get_object()
        agendamento = serializer.save()
        
        # DEBUG: Início do processo
        print(f"[DEBUG-FIN] Agendamento {agendamento.id} atualizado para status: {agendamento.status}")

        from faturamento.models import Pagamento
        pagamento = Pagamento.objects.filter(agendamento=agendamento).first()

        if not pagamento:
            print(f"[DEBUG-FIN] Nenhum pagamento encontrado para o Agendamento {agendamento.id}")
            return

        if agendamento.status == 'Não Compareceu':
            if pagamento.status == 'Pendente':
                pagamento.status = 'Cancelado'
                pagamento.save()
                print(f"[DEBUG-FIN] SUCESSO: Pagamento {pagamento.id} marcado como CANCELADO.")
            else:
                print(f"[DEBUG-FIN] AVISO: Pagamento {pagamento.id} ignorado (Status atual: {pagamento.status})")
                
        elif agendamento.status in ['Agendado', 'Confirmado']:
            if pagamento.status == 'Cancelado':
                pagamento.status = 'Pendente'
                pagamento.save()
                print(f"[DEBUG-FIN] SUCESSO: Pagamento {pagamento.id} revertido para PENDENTE.")

    def perform_destroy(self, instance):
        """
        Lógica personalizada de exclusão.
        """
        agora = timezone.now()
        
        # --- MUDANÇA 3: BLOQUEIO DE PASSADO ---
        # "Qualquer agendamento depois do horario da consulta nao será excluído"
        # (Interpretei como: se a consulta já passou, não pode excluir)
        #if instance.data_hora_inicio < agora:
        #    raise ValidationError("Por segurança e histórico, não é permitido excluir agendamentos passados. Marque como 'Cancelado' ou 'Não Compareceu'.")

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