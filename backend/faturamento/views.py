from datetime import datetime
from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import HttpResponse
from django.utils import timezone

from .models import (
    TransacaoFinanceira, Pagamento, CategoriaDespesa, Despesa, Convenio, 
    PlanoConvenio, Procedimento, ValorProcedimentoConvenio, LoteFaturamento, GuiaTiss
)
from .serializers import (
    TransacaoFinanceiraSerializer, PagamentoSerializer, PagamentoUpdateSerializer,
    DespesaSerializer, CategoriaDespesaSerializer, ConvenioSerializer, 
    PlanoConvenioSerializer, ProcedimentoSerializer, CobrancaPendenteSerializer
)
from agendamentos.serializers import AgendamentoSerializer
from agendamentos.models import Agendamento

# IMPORTANTE: Se rules_faturamento não existir, comente esta linha
try:
    from .regras_faturamento import FaturamentoService
except ImportError:
    FaturamentoService = None

# ==============================================================================
# 1. VIEWS LEGADAS (CRITICAS PARA O FUNCIONAMENTO ATUAL)
# ==============================================================================

class PagamentoViewSet(viewsets.ModelViewSet):
    """
    Mantida para compatibilidade com o frontend atual de Agendamentos e Financeiro
    """
    queryset = Pagamento.objects.all().select_related('paciente', 'agendamento')
    serializer_class = PagamentoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        
        # Filtros de data usados no ContasReceberView
        inicio = self.request.query_params.get('data_inicio')
        fim = self.request.query_params.get('data_fim')
        if inicio and fim:
            qs = qs.filter(data_vencimento__range=[inicio, fim])
            
        return qs

class DespesaViewSet(viewsets.ModelViewSet):
    """
    Mantida para compatibilidade com o frontend de Despesas
    """
    queryset = Despesa.objects.all().order_by('-data_despesa')
    serializer_class = DespesaSerializer
    permission_classes = [IsAdminUser]

class PagamentosPendentesListAPIView(generics.ListAPIView):
    """
    Usada pelo frontend para notificações e lista rápida
    """
    serializer_class = PagamentoSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return Pagamento.objects.filter(status='Pendente').select_related('paciente', 'agendamento').order_by('data_vencimento')

class CobrancasPendentesPacienteAPIView(generics.ListAPIView):
    """
    Usada no Modal de Caixa para listar débitos de um paciente específico
    """
    serializer_class = CobrancaPendenteSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        return Pagamento.objects.filter(paciente_id=paciente_id, status='Pendente').order_by('data_vencimento')

class AgendamentosFaturaveisAPIView(generics.ListAPIView):
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated]
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
        )

# ==============================================================================
# 2. VIEWS NOVAS (TRANSAÇÃO UNIFICADA)
# ==============================================================================

class TransacaoFinanceiraViewSet(viewsets.ModelViewSet):
    queryset = TransacaoFinanceira.objects.all()
    serializer_class = TransacaoFinanceiraSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='renegociar')
    def renegociar(self, request):
        ids = request.data.get('ids_originais', [])
        parcelas = request.data.get('novas_parcelas', [])
        paciente_id = request.data.get('paciente_id')
        
        if not ids: return Response({"erro": "Sem seleção."}, 400)

        with transaction.atomic():
            # AQUI ESTÁ O TRUQUE: Buscamos nos DOIS lugares (Legado e Novo)
            # para permitir migração gradual
            
            # Tenta achar em TransacaoFinanceira
            originais_novas = TransacaoFinanceira.objects.filter(id__in=ids)
            if originais_novas.exists():
                originais_novas.update(status='Renegociado', observacoes=f"Renegociado em {datetime.now()}")
                pai = originais_novas.first()
            else:
                # Se não achou, tenta achar em Pagamento (Legado)
                originais_legado = Pagamento.objects.filter(id__in=ids)
                if not originais_legado.exists():
                    return Response({"erro": "Transações não encontradas."}, 400)
                
                originais_legado.update(status='Renegociado')
                pai = None # Legado não vira pai direto na tabela nova

            novos = []
            for i, p in enumerate(parcelas):
                novos.append(TransacaoFinanceira.objects.create(
                    tipo='Receita',
                    descricao=f"Renegociação ({i+1}/{len(parcelas)})",
                    valor=p['valor'],
                    data_vencimento=p['vencimento'],
                    status='Pendente',
                    paciente_id=paciente_id,
                    transacao_pai=pai
                ))
        return Response({"msg": "Sucesso", "ids": [n.id for n in novos]})

# ==============================================================================
# 3. VIEWS AUXILIARES (CRUDs)
# ==============================================================================

class CategoriaDespesaViewSet(viewsets.ModelViewSet):
    queryset = CategoriaDespesa.objects.all()
    serializer_class = CategoriaDespesaSerializer

class ConvenioViewSet(viewsets.ModelViewSet):
    queryset = Convenio.objects.all()
    serializer_class = ConvenioSerializer

class PlanoConvenioViewSet(viewsets.ModelViewSet):
    queryset = PlanoConvenio.objects.all()
    serializer_class = PlanoConvenioSerializer

class ProcedimentoViewSet(viewsets.ModelViewSet):
    queryset = Procedimento.objects.filter(ativo=True)
    serializer_class = ProcedimentoSerializer
    
    @action(detail=True, methods=['post'], url_path='definir-preco-convenio')
    def definir_preco(self, request, pk=None):
        proc = self.get_object()
        plano = request.data.get('plano_convenio_id')
        valor = request.data.get('valor')
        ValorProcedimentoConvenio.objects.update_or_create(
            procedimento=proc, plano_convenio_id=plano, defaults={'valor': valor}
        )
        return Response({"msg": "Preço atualizado"})

# ==============================================================================
# 4. VIEWS DE SERVIÇO (GERAÇÃO DE LOTE / UPLOAD)
# ==============================================================================

class GerarLoteFaturamentoAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, *args, **kwargs):
        if not FaturamentoService: return Response({"error": "Service indisponível"}, 500)
        try:
            lote, xml = FaturamentoService.processar_lote_tiss(
                request.data.get('convenio_id'),
                timezone.datetime.strptime(request.data.get('mes_referencia'), '%Y-%m').date(),
                request.data.get('agendamento_ids', []),
                request.user
            )
            response = HttpResponse(xml, content_type='application/xml')
            response['Content-Disposition'] = f'attachment; filename="lote_{lote.id}.xml"'
            return response
        except Exception as e:
            return Response({'detail': str(e)}, 400)

class TussUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    def post(self, request):
        if not FaturamentoService: return Response({"error": "Service indisponível"}, 500)
        try:
            count = FaturamentoService.processar_arquivo_tuss(request.FILES.get('arquivo_tuss'))
            return Response({'msg': f'{count} processados.'})
        except Exception as e:
            return Response({'error': str(e)}, 400)

# Stubs para evitar erro de importação no urls.py
class RelatorioFinanceiroAPIView(APIView):
    def get(self, request): return Response({"msg": "OK"})
class FinanceiroDashboardAPIView(APIView):
    def get(self, request): return Response({"msg": "OK"})
class InterWebhookAPIView(APIView):
    def post(self, request): return Response(status=200)
class LancamentoAvulsoAPIView(APIView):
    def post(self, request): return Response({"msg": "Use /transacoes/"})
class ProjecaoFluxoCaixaAPIView(APIView):
    def get(self, request): return Response({"msg": "OK"})