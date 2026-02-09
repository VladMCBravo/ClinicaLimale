import logging
logger = logging.getLogger(__name__)
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
        # --- CORREÇÃO AQUI: FILTRO POR PACIENTE ADICIONADO ---
        paciente_id = self.request.query_params.get('paciente')
        if paciente_id:
            qs = qs.filter(paciente_id=paciente_id)
        # -----------------------------------------------------
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
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        # Apenas para debug, pode remover depois
        print(f"========== [DEBUG BACKEND] Listando Despesas ==========")
        queryset = self.filter_queryset(self.get_queryset())
        print(f"Total de despesas: {queryset.count()}")
        print(f"========== [FIM DEBUG BACKEND] ==========")
        return super().list(request, *args, **kwargs)

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
    queryset = TransacaoFinanceira.objects.all().order_by('-data_vencimento')
    serializer_class = TransacaoFinanceiraSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filtra as transações com base nos parâmetros da URL
        """
        qs = super().get_queryset()
        
        # 1. Filtro por TIPO (Receita ou Despesa)
        tipo = self.request.query_params.get('tipo')
        if tipo:
            qs = qs.filter(tipo__iexact=tipo)

        # 2. Filtro por PACIENTE (Para o Resumo/Extrato)
        paciente_id = self.request.query_params.get('paciente')
        if paciente_id:
            qs = qs.filter(paciente_id=paciente_id)
            
        # 3. Filtro por STATUS
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status__iexact=status)

        # 4. Filtro por DATA (Vencimento)
        data_inicio = self.request.query_params.get('data_inicio')
        data_fim = self.request.query_params.get('data_fim')
        if data_inicio and data_fim:
            qs = qs.filter(data_vencimento__range=[data_inicio, data_fim])

        return qs

    @action(detail=False, methods=['post'], url_path='renegociar')
    def renegociar(self, request):
        ids = request.data.get('ids_originais', [])
        parcelas = request.data.get('novas_parcelas', [])
        paciente_id = request.data.get('paciente_id')
        
        if not ids: return Response({"erro": "Sem seleção."}, 400)

        with transaction.atomic():
            # 1. Atualiza as transações ORIGINAIS para 'Renegociado' (Histórico)
            originais_novas = TransacaoFinanceira.objects.filter(id__in=ids)
            pai = None
            
            if originais_novas.exists():
                # Soma o valor original para registro histórico se necessário
                originais_novas.update(status='Renegociado', observacoes=f"Renegociado em {datetime.now().strftime('%d/%m/%Y')}")
                pai = originais_novas.first()
            else:
                # Fallback para legado (Pagamento)
                originais_legado = Pagamento.objects.filter(id__in=ids)
                if originais_legado.exists():
                    originais_legado.update(status='Renegociado')
                else:
                    return Response({"erro": "Transações não encontradas."}, 400)

            novos_ids = []
            
            # 2. Cria as NOVAS parcelas
            for i, p in enumerate(parcelas):
                # Verifica explicitamente se o frontend marcou para pagar agora
                esta_pago = p.get('pago_agora') is True
                
                status_inicial = 'Pago' if esta_pago else 'Pendente'
                data_pgto = timezone.now().date() if esta_pago else None
                forma_pgto = p.get('forma_pagamento') if esta_pago else None

                nova = TransacaoFinanceira.objects.create(
                    tipo='Receita',
                    # Descrição clara: "Renegociação 1/3"
                    descricao=f"Renegociação ({i+1}/{len(parcelas)})",
                    valor=p['valor'],
                    data_vencimento=p['vencimento'],
                    
                    # AQUI ESTÁ A CORREÇÃO DO STATUS:
                    status=status_inicial,
                    data_pagamento=data_pgto,
                    forma_pagamento=forma_pgto,
                    
                    paciente_id=paciente_id,
                    transacao_pai=pai,
                    observacoes=f"Gerado via renegociação. Origem: {ids}"
                )
                novos_ids.append(nova.id)

        return Response({"msg": "Renegociação concluída com sucesso!", "ids": novos_ids})

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