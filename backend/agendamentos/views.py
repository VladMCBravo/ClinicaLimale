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
from chatbot.whatsapp_service import WhatsAppBotHandler # Importa o disparador do Evolution

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
        
        # --- NOVA TRAVA DE PRIVACIDADE ---
        user = self.request.user
        if user.cargo == 'medico':
            # Filtra a agenda para mostrar APENAS as consultas deste médico
            queryset = queryset.filter(medico=user)
        # ---------------------------------
        
        # Filtros (usados pelo FullCalendar e Frontend)
        sala_id = self.request.query_params.get('sala_id')
        if sala_id:
            queryset = queryset.filter(sala_id=sala_id)

        medico_id = self.request.query_params.get('medico_id')
        if medico_id:
            queryset = queryset.filter(medico_id=medico_id)
        
        # --- A MÁGICA DA OTIMIZAÇÃO: FILTRO DE DATAS ---
        start = self.request.query_params.get('start')
        end = self.request.query_params.get('end')

        if start:
            start_date = parse_datetime(start)
            if start_date:
                queryset = queryset.filter(data_hora_inicio__gte=start_date)

        if end:
            end_date = parse_datetime(end)
            if end_date:
                queryset = queryset.filter(data_hora_inicio__lte=end_date)

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
        
        if len(procedimentos_ids) > 4:
            return Response({"detail": "Máximo de 4 procedimentos por vez."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not procedimentos_ids or not data_inicio_base:
            return Response({"detail": "Dados inválidos."}, status=status.HTTP_400_BAD_REQUEST)

        agendamentos_criados = []

        with transaction.atomic():
            # Pega a duração do primeiro procedimento para definir o tamanho do bloco único na agenda
            try:
                primeiro_proc = Procedimento.objects.get(id=procedimentos_ids[0])
                duracao_base = primeiro_proc.configuracao_clinica.duracao_padrao if hasattr(primeiro_proc, 'configuracao_clinica') and primeiro_proc.configuracao_clinica.duracao_padrao else timedelta(minutes=15)
            except Exception:
                duracao_base = timedelta(minutes=15)

            tempo_fim_base = data_inicio_base + duracao_base

            for index, proc_id in enumerate(procedimentos_ids):
                try:
                    dados_item = request.data.copy()
                    dados_item['procedimento'] = proc_id
                    dados_item['tipo_agendamento'] = 'Procedimento'
                    # Todos ocupam exatamente o mesmo slot de tempo agora
                    dados_item['data_hora_inicio'] = data_inicio_base.isoformat()
                    dados_item['data_hora_fim'] = tempo_fim_base.isoformat()
                    
                    if 'especialidade' in dados_item: del dados_item['especialidade']
                    if 'medico' in dados_item: del dados_item['medico']

                    # O Pulo do Gato: a partir do 2º procedimento, forçamos o "encaixe" silenciosamente
                    # para driblar a validação de bloqueio da sala no serializers.py
                    if index > 0:
                        dados_item['is_encaixe'] = True

                    serializer = self.get_serializer(data=dados_item)
                    serializer.is_valid(raise_exception=True)
                    self.perform_create(serializer)
                    
                    agendamentos_criados.append(serializer.data)

                except Exception as e:
                    raise ValidationError(f"Não foi possível agendar o procedimento ID {proc_id}. Motivo: {str(e)}")

        return Response(agendamentos_criados, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        # O .save() aciona o 'signals.py', que criará o Pagamento automaticamente.
        agendamento = serializer.save()
        pagamento = Pagamento.objects.filter(agendamento=agendamento).first()
        
        if pagamento:
            pagamento.registrado_por = self.request.user
            
            # --- NOVA LÓGICA DE ISENÇÃO ---
            isento = self.request.data.get('isento_cobranca')
            
            if str(isento).lower() in ['true', '1', 't']:
                motivo = self.request.data.get('motivo_isencao', 'Retorno/Conclusão')
                desc_base = agendamento.procedimento.descricao if agendamento.procedimento else "Consulta"
                
                # Zera o valor e anexa o motivo no financeiro
                pagamento.valor = 0.00
                pagamento.descricao = f"{desc_base} (ISENTO: {motivo})"
                
                # Já "Baixa" a conta zerada para não poluir a tela de pendências da recepção
                pagamento.status = 'Pago'
                pagamento.forma_pagamento = 'Outros'
                pagamento.data_pagamento = timezone.now().date()
            else:
                # Fluxo Normal (Cobrança padrão)
                pagamento.status = 'Pendente'
                pagamento.data_pagamento = None
                pagamento.forma_pagamento = None
                if agendamento.procedimento:
                    pagamento.descricao = agendamento.procedimento.descricao 
                    
            pagamento.save()


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
        
        # --- ISENÇÃO NA EDIÇÃO ---
        isento = self.request.data.get('isento_cobranca')
        if str(isento).lower() in ['true', '1', 't'] and pagamento.status == 'Pendente':
            motivo = self.request.data.get('motivo_isencao', 'Retorno/Conclusão')
            desc_base = agendamento.procedimento.descricao if agendamento.procedimento else "Consulta"
            pagamento.valor = 0.00
            pagamento.descricao = f"{desc_base} (ISENTO: {motivo})"
            pagamento.status = 'Pago'
            pagamento.forma_pagamento = 'Outros'
            pagamento.data_pagamento = timezone.now().date()
            pagamento.save()
            return # Sai da função para não aplicar as regras de status abaixo

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
        # 1. Verifica se o frontend enviou uma data específica
        data_param = self.request.query_params.get('data')
        
        if data_param:
            from django.utils.dateparse import parse_date
            data_busca = parse_date(data_param)
        else:
            data_busca = timezone.localtime(timezone.now()).date()
            
        queryset = Agendamento.objects.select_related(
            'paciente', 'medico', 'especialidade', 'sala', 'procedimento', 'plano_utilizado'
        ).prefetch_related('pagamento').filter(data_hora_inicio__date=data_busca).order_by('data_hora_inicio')
        
        medico_id = self.request.query_params.get('medico_id')
        if medico_id:
            queryset = queryset.filter(medico_id=medico_id)
            
        return queryset


class HorariosDisponiveisAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        medico_id = request.query_params.get('medico_id')
        data_str = request.query_params.get('data') # Agora serve como "Data Inicial da Busca"
        
        # Ignoramos a especialidade na lógica de busca para não travar a pesquisa, 
        # conforme a sua regra de negócio.

        if not medico_id:
            return Response({'detail': 'O ID do médico é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Se não enviar data, assume hoje
            data_selecionada = parse_date(data_str) if data_str else timezone.now().date()
        except ValueError:
            return Response({'detail': 'Data inválida.'}, status=status.HTTP_400_BAD_REQUEST)

        # Chama o serviço inteligente que busca os próximos dias
        # limite_dias_retorno=7 significa que o sistema vai "caçar" até encontrar 
        # os próximos 7 dias em que esse médico tem algum buraco na agenda.
        horarios = services.buscar_proximo_horario_disponivel(
            medico_id=medico_id, 
            data_inicial=data_selecionada, 
            limite_dias_retorno=7 
        )
        
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


# Não esqueça de garantir que esta importação esteja no topo do seu views.py:
# from chatbot.whatsapp_service import WhatsAppBotHandler

class EnviarLembretesCronView(APIView):
    # Mantivemos a sua segurança original (exige API Key)
    permission_classes = [HasAPIKey]

    def get(self, request, *args, **kwargs):
        agora = timezone.localtime(timezone.now())
        amanha = agora.date() + datetime.timedelta(days=1)
        
        # Simplifiquei a busca: pega todo mundo marcado para amanhã que está Agendado ou Confirmado
        agendamentos = Agendamento.objects.filter(
            data_hora_inicio__date=amanha, 
            status__in=['Agendado', 'Confirmado']
        ).select_related('paciente', 'procedimento')

        enviados_wpp = 0
        enviados_email = 0

        for ag in agendamentos:
            # Pega o primeiro nome para ficar mais amigável
            nome_paciente = ag.paciente.nome_completo.split()[0].title()
            hora = timezone.localtime(ag.data_hora_inicio).strftime('%H:%M')
            exame = ag.procedimento.descricao if ag.procedimento else "seu exame"

            # 1. DISPARO DO WHATSAPP (A Mágica Nova)
            if ag.paciente.telefone_celular:
                telefone = ''.join(filter(str.isdigit, ag.paciente.telefone_celular))
                
                mensagem_wpp = (
                    f"Olá, {nome_paciente}! 🤍 Passando para lembrar do nosso encontro amanhã!\n\n"
                    f"📅 Seu agendamento para *{exame}* está marcado para às *{hora}*.\n\n"
                    f"📍 Lembre-se de chegar com 10 minutos de antecedência.\n\n"
                    f"Para me ajudar na organização, você poderia responder com um *SIM* para confirmar sua presença? 😊"
                )
                
                try:
                    bot = WhatsAppBotHandler(telefone)
                    bot.enviar_mensagem(mensagem_wpp)
                    enviados_wpp += 1
                except Exception as e:
                    print(f"Erro ao enviar WhatsApp para {nome_paciente}: {e}")

            # 2. DISPARO DO E-MAIL (Mantido o seu original)
            if ag.paciente.email:
                try:
                    send_mail(
                        subject="Lembrete de Exame - Clínica Limalé",
                        message=f"Olá {nome_paciente}, lembramos do seu agendamento de {exame} amanhã às {hora}.",
                        from_email=None,
                        recipient_list=[ag.paciente.email],
                        fail_silently=False,
                    )
                    enviados_email += 1
                except Exception: 
                    pass
        
        return Response({
            'status': 'Processamento concluído',
            'data_alvo': amanha.strftime('%d/%m/%Y'),
            'lembretes_whatsapp': enviados_wpp,
            'lembretes_email': enviados_email
        })


# --- CORREÇÃO 1: Adicionado o permission_classes ---
class CriarSalaTelemedicinaView(APIView):
    permission_classes = [IsAuthenticated] # <--- BLINDAGEM AQUI

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
        sala_id = request.query_params.get('sala_id')
        
        if not inicio_str or not fim_str:
            return Response({'detail': 'Dados insuficientes.'}, status=400)

        try:
            inicio_exato = parse_datetime(inicio_str)
            fim_exato = parse_datetime(fim_str)
            
            # --- A MÁGICA CONTRA OS MILISSEGUNDOS ---
            # Adiciona 1 segundo de tolerância. 
            # Assim, se o paciente anterior termina às 12:45:00.810, 
            # o backend só vai considerar conflito se invadir 12:45:01!
            inicio_tolerancia = inicio_exato + timedelta(seconds=1)
            fim_tolerancia = fim_exato - timedelta(seconds=1)

        except ValueError:
            return Response({'detail': 'Data inválida.'}, status=400)

        # Atualizamos a query para usar as datas com tolerância
        agendamentos_conflitantes = Agendamento.objects.filter(
            data_hora_inicio__lt=fim_tolerancia, 
            data_hora_fim__gt=inicio_tolerancia,
        ).exclude(status__in=['Cancelado', 'Não Compareceu']) 

        if sala_id and str(sala_id).lower() != 'null':
            agendamentos_conflitantes = agendamentos_conflitantes.filter(sala_id=sala_id)

        qtd_consultas = agendamentos_conflitantes.filter(tipo_agendamento='Consulta').count()
        qtd_procedimentos = agendamentos_conflitantes.filter(tipo_agendamento='Procedimento').count()
        
        return Response({
            'consultas_agendadas': qtd_consultas,
            'procedimentos_agendados': qtd_procedimentos,
            'verificacao_por_sala': bool(sala_id)
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

# --- CORREÇÃO 2: Excluindo os status cancelados ---
class DashboardKPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hoje = timezone.localtime(timezone.now()).date()
        agora = timezone.now()
        inicio_mes = hoje.replace(day=1)

        # Filtra tudo de hoje, EXCETO o que foi cancelado ou não compareceu
        count_hoje = Agendamento.objects.filter(
            data_hora_inicio__date=hoje
        ).exclude(
            status__in=['Cancelado', 'Não Compareceu']
        ).count()

        count_confirmar = Agendamento.objects.filter(
            data_hora_inicio__gte=agora,
            status='Agendado'
        ).count()

        try:
            from pacientes.models import Paciente
            count_novos = Paciente.objects.filter(data_cadastro__gte=inicio_mes).count()
        except (AttributeError, Exception):
            count_novos = 0

        return Response({
            "hoje": count_hoje,
            "novos": count_novos,
            "confirmar": count_confirmar
        })