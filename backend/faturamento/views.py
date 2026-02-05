from datetime import datetime
from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import HttpResponse
from django.utils import timezone

# --- IMPORTAÇÕES DE OUTROS APPS ---
from usuarios.permissions import IsRecepcaoOrAdmin
from agendamentos.serializers import AgendamentoSerializer
from agendamentos.models import Agendamento
from pacientes.models import Paciente

# --- IMPORTAÇÃO DO SERVICE ---
from .services import FaturamentoService

# --- MODELS E SERIALIZERS ---
from .models import (
    Pagamento, CategoriaDespesa, Despesa, Convenio, 
    PlanoConvenio, Procedimento, ValorProcedimentoConvenio
)
from .serializers import (
    PagamentoSerializer, PagamentoUpdateSerializer,
    CategoriaDespesaSerializer, DespesaSerializer,
    CobrancaPendenteSerializer, ConvenioSerializer, 
    PlanoConvenioSerializer, ProcedimentoSerializer
)

# ============================================================================
#  1. VIEWS DE INTELIGÊNCIA (Delegadas ao Service)
# ============================================================================

class FinanceiroDashboardAPIView(APIView):
    permission_classes = [IsRecepcaoOrAdmin]
    def get(self, request):
        try:
            return Response(FaturamentoService.obter_dados_dashboard())
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class ProjecaoFluxoCaixaAPIView(APIView):
    permission_classes = [IsRecepcaoOrAdmin]
    def get(self, request):
        try:
            return Response(FaturamentoService.calcular_projecao_fluxo_caixa(dias=30))
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class RelatorioFinanceiroAPIView(APIView):
    """
    Restaura a view de relatórios gerais usada pelo frontend.
    Agora chama o service para manter o padrão.
    """
    permission_classes = [IsAdminUser]
    def get(self, request):
        try:
            return Response(FaturamentoService.gerar_relatorio_completo())
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class InterWebhookAPIView(APIView):
    permission_classes = [AllowAny]
    def post(self, request, *args, **kwargs):
        try:
            FaturamentoService.processar_webhook_inter(request.data)
            return Response(status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Erro Webhook: {e}") 
            return Response(status=status.HTTP_200_OK)

# ============================================================================
#  2. LANÇAMENTOS E OPERAÇÕES
# ============================================================================

class LancamentoAvulsoAPIView(APIView):
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]
    def post(self, request, *args, **kwargs):
        dados = request.data.copy()
        tipo = dados.get('tipo')

        for campo in ['data_pagamento', 'data_vencimento', 'data_despesa']:
            if campo in dados and dados[campo] == '':
                dados[campo] = None

        data_venc_str = dados.get('data_vencimento')
        data_vencimento_base = datetime.strptime(str(data_venc_str), '%Y-%m-%d').date() if data_venc_str else timezone.localdate()

        qtd_parcelas = int(dados.get('qtd_parcelas', 1))
        valor_total = float(dados.get('valor', 0))
        descricao = dados.get('descricao', '')
        data_pagamento_manual = dados.get('data_pagamento')

        try:
            if tipo == 'receita':
                objetos = FaturamentoService.criar_receita(
                    paciente=dados.get('paciente'),
                    valor_total=valor_total,
                    qtd_parcelas=qtd_parcelas,
                    data_vencimento_base=data_vencimento_base,
                    user=request.user,
                    descricao=descricao,
                    forma_pagamento=dados.get('forma_pagamento'),
                    status_inicial=dados.get('status', 'Pendente'),
                    data_pagamento_manual=data_pagamento_manual
                )
                msg = f"{len(objetos)} lançamentos de receita gerados."

            elif tipo == 'despesa':
                pago_input = str(dados.get('pago', 'false')).lower() == 'true'
                objetos = FaturamentoService.criar_despesa(
                    categoria_id=dados.get('categoria'),
                    valor_total=valor_total,
                    qtd_parcelas=qtd_parcelas,
                    data_vencimento_base=data_vencimento_base,
                    user=request.user,
                    descricao=descricao,
                    pago_inicialmente=pago_input,
                    data_pagamento_manual=data_pagamento_manual,
                    data_despesa_competencia=dados.get('data_despesa')
                )
                msg = f"{len(objetos)} lançamentos de despesa gerados."
            else:
                return Response({'error': 'Tipo inválido'}, status=400)
            return Response({'msg': msg}, status=201)

        except Exception as e:
            return Response({'error': str(e)}, status=500)

class TussUploadView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = (MultiPartParser, FormParser)
    def post(self, request, *args, **kwargs):
        arquivo = request.FILES.get('arquivo_tuss')
        if not arquivo: return Response({'error': 'Sem arquivo'}, status=400)
        try:
            count = FaturamentoService.processar_arquivo_tuss(arquivo)
            return Response({'msg': f'{count} procedimentos processados.'})
        except ValueError as e:
            return Response({'error': str(e)}, status=400)
        except Exception as e:
            return Response({'error': 'Erro interno.'}, status=500)

class GerarLoteFaturamentoAPIView(APIView):
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]
    def post(self, request, *args, **kwargs):
        convenio_id = request.data.get('convenio_id')
        mes_referencia_str = request.data.get('mes_referencia')
        agendamento_ids = request.data.get('agendamento_ids', [])

        if not all([convenio_id, mes_referencia_str, agendamento_ids]):
            return Response({'detail': 'Dados insuficientes.'}, status=400)

        try:
            ano, mes = map(int, mes_referencia_str.split('-'))
            mes_ref_date = timezone.datetime(ano, mes, 1).date()

            lote, xml_content = FaturamentoService.processar_lote_tiss(
                convenio_id=convenio_id,
                mes_referencia_date=mes_ref_date,
                agendamento_ids=agendamento_ids,
                user=request.user
            )
            response = HttpResponse(xml_content, content_type='application/xml')
            response['Content-Disposition'] = f'attachment; filename="lote_{lote.id}_{lote.convenio.nome}.xml"'
            return response
        except ValueError as ve:
            return Response({'detail': str(ve)}, status=400)
        except Exception as e:
            return Response({'detail': f'Erro: {str(e)}'}, status=500)

# ============================================================================
#  3. CRUDs PADRÃO
# ============================================================================

class PagamentoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]
    def get_serializer_class(self):
        return PagamentoUpdateSerializer if self.action in ['update', 'partial_update'] else PagamentoSerializer

    def get_queryset(self):
        queryset = Pagamento.objects.all().select_related('paciente', 'agendamento')
        status_param = self.request.query_params.get('status')
        if status_param: queryset = queryset.filter(status=status_param)
        data_inicio = self.request.query_params.get('data_inicio')
        data_fim = self.request.query_params.get('data_fim')
        if data_inicio and data_fim: queryset = queryset.filter(data_vencimento__range=[data_inicio, data_fim])
        
        if status_param == 'Pago': return queryset.order_by('-data_pagamento')
        return queryset.order_by('data_vencimento')

class PagamentosPendentesListAPIView(generics.ListAPIView):
    """
    Restaura a view usada explicitamente pelo frontend em '/pagamentos-pendentes/'
    """
    serializer_class = PagamentoSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return Pagamento.objects.filter(status='Pendente', paciente__isnull=False).select_related('paciente', 'agendamento').order_by('data_vencimento')

class CobrancasPendentesPacienteAPIView(generics.ListAPIView):
    serializer_class = CobrancaPendenteSerializer
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]
    def get_queryset(self):
        return Pagamento.objects.filter(paciente_id=self.kwargs.get('paciente_id'), status='Pendente').order_by('data_vencimento')

class DespesaViewSet(viewsets.ModelViewSet):
    serializer_class = DespesaSerializer
    permission_classes = [IsAdminUser]
    def get_queryset(self):
        queryset = Despesa.objects.select_related('categoria', 'registrado_por').all()
        status_param = self.request.query_params.get('status')
        if status_param == 'pago': queryset = queryset.filter(pago=True)
        elif status_param == 'pendente': queryset = queryset.filter(pago=False)
        data_inicio = self.request.query_params.get('data_inicio')
        data_fim = self.request.query_params.get('data_fim')
        if data_inicio and data_fim: queryset = queryset.filter(data_vencimento__range=[data_inicio, data_fim])
        return queryset.order_by('-data_vencimento')

    def perform_create(self, serializer):
        pago = self.request.data.get('pago')
        data_pag = self.request.data.get('data_pagamento') or timezone.localdate()
        serializer.save(registrado_por=self.request.user, data_pagamento=data_pag if pago else None)

    def perform_update(self, serializer):
        pago = self.request.data.get('pago')
        data_venc = self.request.data.get('data_vencimento')
        data_desp = self.request.data.get('data_despesa')
        vencimento_final = data_venc or data_desp or timezone.localdate()
        if pago is False:
            serializer.save(data_pagamento=None, pago=False, data_vencimento=vencimento_final)
        elif pago is True:
            data_pag = self.request.data.get('data_pagamento') or timezone.localdate()
            serializer.save(data_pagamento=data_pag, pago=True, data_vencimento=vencimento_final)
        else:
            serializer.save(data_vencimento=vencimento_final)

class CategoriaDespesaViewSet(viewsets.ModelViewSet):
    queryset = CategoriaDespesa.objects.all().order_by('nome')
    serializer_class = CategoriaDespesaSerializer
    permission_classes = [IsAdminUser]

class ConvenioViewSet(viewsets.ModelViewSet):
    queryset = Convenio.objects.prefetch_related('planos').all()
    serializer_class = ConvenioSerializer
    permission_classes = [IsRecepcaoOrAdmin]

class PlanoConvenioViewSet(viewsets.ModelViewSet):
    queryset = PlanoConvenio.objects.all()
    serializer_class = PlanoConvenioSerializer
    permission_classes = [IsRecepcaoOrAdmin]

class AgendamentosFaturaveisAPIView(generics.ListAPIView):
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]
    def get_queryset(self):
        convenio_id = self.request.query_params.get('convenio_id')
        mes = self.request.query_params.get('mes')
        ano = self.request.query_params.get('ano')
        if not all([convenio_id, mes, ano]): return Agendamento.objects.none()
        return Agendamento.objects.filter(
            plano_utilizado__convenio__id=convenio_id,
            data_hora_inicio__month=mes,
            data_hora_inicio__year=ano,
            tipo_atendimento='Convenio',
            guia_tiss__isnull=True
        ).select_related('paciente', 'plano_utilizado').order_by('data_hora_inicio')

class ProcedimentoViewSet(viewsets.ModelViewSet):
    queryset = Procedimento.objects.prefetch_related('valores_convenio__plano_convenio').filter(ativo=True).order_by('descricao')
    serializer_class = ProcedimentoSerializer
    permission_classes = [IsAuthenticated]
    @action(detail=True, methods=['post', 'put'], url_path='definir-preco-convenio')
    def definir_preco_convenio(self, request, pk=None):
        procedimento = self.get_object()
        plano_id = request.data.get('plano_convenio_id')
        valor = request.data.get('valor')
        if not plano_id or valor is None: return Response({'error': 'Dados incompletos'}, status=400)
        try:
            plano = PlanoConvenio.objects.get(id=plano_id)
            obj, created = ValorProcedimentoConvenio.objects.update_or_create(procedimento=procedimento, plano_convenio=plano, defaults={'valor': valor})
            serializer = self.get_serializer(procedimento)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        except PlanoConvenio.DoesNotExist: return Response({'error': 'Plano não encontrado'}, status=404)