from datetime import datetime
from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from django.utils import timezone
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import HttpResponse
from .regras_faturamento import FaturamentoService # Certifique-se que este arquivo existe

# IMPORTS MODELS & SERIALIZERS
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

# ------------------------------------------------------------------
#  API PRINCIPAL: TRANSAÇÕES FINANCEIRAS (Novo Padrão)
# ------------------------------------------------------------------
class TransacaoFinanceiraViewSet(viewsets.ModelViewSet):
    queryset = TransacaoFinanceira.objects.all()
    serializer_class = TransacaoFinanceiraSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        tipo = self.request.query_params.get('tipo')
        status_filter = self.request.query_params.get('status')
        paciente = self.request.query_params.get('paciente')
        inicio = self.request.query_params.get('data_inicio')
        fim = self.request.query_params.get('data_fim')
        
        if tipo: qs = qs.filter(tipo__iexact=tipo)
        if status_filter: qs = qs.filter(status__iexact=status_filter)
        if paciente: qs = qs.filter(paciente_id=paciente)
        if inicio and fim: qs = qs.filter(data_vencimento__range=[inicio, fim])
            
        return qs

    @action(detail=False, methods=['post'], url_path='renegociar')
    def renegociar(self, request):
        ids = request.data.get('ids_originais', [])
        parcelas = request.data.get('novas_parcelas', [])
        paciente_id = request.data.get('paciente_id')
        
        if not ids: return Response({"erro": "Sem seleção."}, 400)

        with transaction.atomic():
            originais = TransacaoFinanceira.objects.filter(id__in=ids)
            if not originais.exists(): return Response({"erro": "Não encontrado."}, 400)
            
            originais.update(status='Renegociado', observacoes=f"Renegociado em {datetime.now()}")

            novos = []
            for i, p in enumerate(parcelas):
                novos.append(TransacaoFinanceira.objects.create(
                    tipo='Receita',
                    descricao=f"Renegociação ({i+1}/{len(parcelas)})",
                    valor=p['valor'],
                    data_vencimento=p['vencimento'],
                    status='Pendente',
                    paciente_id=paciente_id,
                    transacao_pai=originais.first()
                ))
        return Response({"msg": "Sucesso", "ids": [n.id for n in novos]})

    @action(detail=True, methods=['post'], url_path='baixar-multiplo')
    def baixar_multiplo(self, request, pk=None):
        pai = self.get_object()
        pagamentos = request.data.get('pagamentos', [])
        
        total = sum(float(p['valor']) for p in pagamentos)
        if abs(float(pai.valor) - total) > 0.10: 
            return Response({"erro": "Valores divergem."}, 400)

        with transaction.atomic():
            pai.status = 'Liquidado'
            pai.save()

            for p in pagamentos:
                TransacaoFinanceira.objects.create(
                    tipo=pai.tipo,
                    descricao=f"{pai.descricao} ({p['metodo']})",
                    valor=p['valor'],
                    data_vencimento=p.get('data'),
                    data_pagamento=p.get('data'),
                    status='Pago',
                    forma_pagamento=p['metodo'],
                    paciente=pai.paciente,
                    transacao_pai=pai,
                    categoria=pai.categoria
                )
        return Response({"msg": "Baixa realizada"})

# ------------------------------------------------------------------
#  APIS LEGADAS / AUXILIARES (Mantidas para compatibilidade)
# ------------------------------------------------------------------

class PagamentoViewSet(viewsets.ModelViewSet):
    queryset = Pagamento.objects.all()
    serializer_class = PagamentoSerializer
    permission_classes = [IsAuthenticated]

class DespesaViewSet(viewsets.ModelViewSet):
    queryset = Despesa.objects.all()
    serializer_class = DespesaSerializer
    permission_classes = [IsAdminUser]

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

# --- VIEWS ESPECÍFICAS DO FRONTEND (Mantidas) ---

class PagamentosPendentesListAPIView(generics.ListAPIView):
    queryset = Pagamento.objects.filter(status='Pendente')
    serializer_class = PagamentoSerializer

class CobrancasPendentesPacienteAPIView(generics.ListAPIView):
    serializer_class = CobrancaPendenteSerializer
    def get_queryset(self):
        return Pagamento.objects.filter(paciente_id=self.kwargs['paciente_id'], status='Pendente')

class AgendamentosFaturaveisAPIView(generics.ListAPIView):
    serializer_class = AgendamentoSerializer
    def get_queryset(self):
        # Lógica simplificada para exemplo
        return Agendamento.objects.filter(tipo_atendimento='Convenio', guia_tiss__isnull=True)

class GerarLoteFaturamentoAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        convenio_id = request.data.get('convenio_id')
        mes_referencia_str = request.data.get('mes_referencia')
        agendamento_ids = request.data.get('agendamento_ids', [])

        if not all([convenio_id, mes_referencia_str, agendamento_ids]):
            return Response({'detail': 'Dados insuficientes.'}, status=400)

        try:
            ano, mes = map(int, mes_referencia_str.split('-'))
            mes_ref_date = timezone.datetime(ano, mes, 1).date()

            # Chama o serviço legado (certifique-se que regras_faturamento.py existe)
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

# Stubs para views que serão migradas futuramente, mas precisam existir para não quebrar URLS
class RelatorioFinanceiroAPIView(APIView):
    def get(self, request): return Response({"msg": "Relatório em migração para TransacaoFinanceira"})

class FinanceiroDashboardAPIView(APIView):
    def get(self, request): return Response({"msg": "Dashboard em migração"})

class InterWebhookAPIView(APIView):
    permission_classes = [AllowAny]
    def post(self, request): return Response(status=200)

class LancamentoAvulsoAPIView(APIView):
    def post(self, request): return Response({"msg": "Use a nova rota /transacoes/"})

class ProjecaoFluxoCaixaAPIView(APIView):
    def get(self, request): return Response({"msg": "Projeção em migração"})