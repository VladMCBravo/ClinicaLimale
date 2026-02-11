# src/faturamento/views.py

import logging
logger = logging.getLogger(__name__)
import re
from datetime import datetime, date
from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Sum, Count, Case, When, Value, DecimalField, Q
from django.db.models.functions import TruncDate, TruncMonth, Coalesce

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
from agendamentos.models import Agendamento, Sala

# IMPORTANTE: Se rules_faturamento não existir, comente esta linha
try:
    from .regras_faturamento import FaturamentoService
except ImportError:
    FaturamentoService = None

# ==============================================================================
# 1. VIEWS LEGADAS (CRITICAS PARA O FUNCIONAMENTO ATUAL)
# ==============================================================================

class PagamentoViewSet(viewsets.ModelViewSet):
    # OTIMIZAÇÃO: Traz paciente e agendamento junto para evitar N+1
    queryset = Pagamento.objects.select_related('paciente', 'agendamento', 'registrado_por').all()
    serializer_class = PagamentoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        # --- BUSCA GLOBAL (Prioridade Máxima) ---
        search_term = self.request.query_params.get('search')
        if search_term:
            # Se tem busca, RETORNA TUDO que der match, ignorando mês/ano
            return qs.filter(
                Q(paciente__nome_completo__icontains=search_term) | 
                Q(descricao__icontains=search_term)
            )

        # --- FILTROS DE DATA (Só aplicam se não tiver busca) ---
        # Compatibilidade com o filtro de mês/ano do frontend
        mes = self.request.query_params.get('mes')
        ano = self.request.query_params.get('ano')
        
        if mes and ano:
            # Filtra por Vencimento (Padrão Financeiro)
            qs = qs.filter(data_vencimento__month=mes, data_vencimento__year=ano)
        
        # Filtros legados de range (mantendo compatibilidade)
        inicio = self.request.query_params.get('data_inicio')
        fim = self.request.query_params.get('data_fim')
        if inicio and fim:
            qs = qs.filter(data_vencimento__range=[inicio, fim])

        # Filtros extras
        paciente_id = self.request.query_params.get('paciente')
        if paciente_id:
            qs = qs.filter(paciente_id=paciente_id)
            
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
            
        return qs

# ==============================================================================
# 1. DASHBOARD & KPIs (A CLASSE CORRETA AGORA)
# ==============================================================================

class FinanceiroDashboardAPIView(APIView):
    """
    Dashboard Compacto e Otimizado.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # 1. Filtros (Convertendo para Inteiro com Segurança)
            mes = request.query_params.get('mes')
            ano = request.query_params.get('ano')
            
            modo_mensal = False
            if mes and ano and mes != 'undefined' and ano != 'undefined':
                modo_mensal = True
                mes = int(mes)
                ano = int(ano)
            else:
                hoje = timezone.localdate()
                mes = hoje.month
                ano = hoje.year

            # 2. Querysets Base
            receitas_qs = Pagamento.objects.all()
            despesas_qs = Despesa.objects.all()

            # --- PREPARAÇÃO DOS DADOS DE KPI (FILTRADOS) ---
            if modo_mensal:
                # Filtragem Mensal
                receitas_kpi = receitas_qs.filter(data_vencimento__month=mes, data_vencimento__year=ano)
                despesas_kpi = despesas_qs.filter(data_despesa__month=mes, data_despesa__year=ano)
                
                # Pagos (Usamos data_pagamento para efetivação)
                receitas_pagas = receitas_qs.filter(status='Pago', data_pagamento__month=mes, data_pagamento__year=ano)
                despesas_pagas = despesas_qs.filter(pago=True, data_pagamento__month=mes, data_pagamento__year=ano)
            else:
                # Filtragem Geral (Acumulada)
                receitas_kpi = receitas_qs
                despesas_kpi = despesas_qs
                receitas_pagas = receitas_qs.filter(status='Pago')
                despesas_pagas = despesas_qs.filter(pago=True)

            # --- CÁLCULO KPIS ---
            total_operacional = receitas_pagas.filter(paciente__isnull=False).aggregate(t=Sum('valor'))['t'] or 0
            total_aportes = receitas_pagas.filter(paciente__isnull=True).aggregate(t=Sum('valor'))['t'] or 0
            
            total_pendente = receitas_kpi.filter(status='Pendente').aggregate(t=Sum('valor'))['t'] or 0
            # Atrasado sempre olha para o passado global se estiver no modo geral
            if modo_mensal:
                total_atrasado = receitas_kpi.filter(status='Pendente', data_vencimento__lt=timezone.localdate()).aggregate(t=Sum('valor'))['t'] or 0
            else:
                total_atrasado = receitas_qs.filter(status='Pendente', data_vencimento__lt=timezone.localdate()).aggregate(t=Sum('valor'))['t'] or 0

            total_despesas_cadastradas = despesas_kpi.aggregate(t=Sum('valor'))['t'] or 0
            total_despesas_pagas_val = despesas_pagas.aggregate(t=Sum('valor'))['t'] or 0

            # --- GRÁFICO (FLUXO) ---
            grafico_fluxo = []
            
            if modo_mensal:
                # Gráfico Diário
                r_dia = receitas_pagas.annotate(dia=TruncDate('data_pagamento')).values('dia').annotate(total=Sum('valor'))
                d_dia = despesas_pagas.annotate(dia=TruncDate('data_pagamento')).values('dia').annotate(total=Sum('valor'))
                
                mapa_r = {item['dia']: item['total'] for item in r_dia}
                mapa_d = {item['dia']: item['total'] for item in d_dia}
                
                from calendar import monthrange
                _, dias_no_mes = monthrange(ano, mes)
                
                for d in range(1, dias_no_mes + 1):
                    data_obj = date(ano, mes, d)
                    grafico_fluxo.append({
                        "name": str(d),
                        "entradas": float(mapa_r.get(data_obj, 0)),
                        "saidas": float(mapa_d.get(data_obj, 0))
                    })
            else:
                # Gráfico Mensal (Últimos 12 meses)
                # IMPORTANTE: Usamos data_pagamento para refletir caixa real
                limite = timezone.now().date() - timezone.timedelta(days=365)
                
                r_mes = receitas_qs.filter(status='Pago', data_pagamento__gte=limite)\
                    .annotate(m=TruncMonth('data_pagamento')).values('m').annotate(total=Sum('valor'))
                d_mes = despesas_qs.filter(pago=True, data_pagamento__gte=limite)\
                    .annotate(m=TruncMonth('data_pagamento')).values('m').annotate(total=Sum('valor'))

                # Formata chaves como "YYYY-MM" para o mapa
                mapa_r = {item['m'].strftime('%Y-%m'): item['total'] for item in r_mes if item['m']}
                mapa_d = {item['m'].strftime('%Y-%m'): item['total'] for item in d_mes if item['m']}

                for i in range(11, -1, -1):
                    # Gera as datas dos últimos 12 meses corretamente
                    d_ref = (timezone.now().date().replace(day=1) - timezone.timedelta(days=30*i))
                    # Ajuste fino para garantir mês correto
                    key = d_ref.strftime('%Y-%m')
                    label = d_ref.strftime('%b') # Ex: Fev
                    
                    grafico_fluxo.append({
                        "name": label,
                        "entradas": float(mapa_r.get(key, 0)),
                        "saidas": float(mapa_d.get(key, 0))
                    })

            # --- CUSTOS PIZZA ---
            fixas = despesas_kpi.filter(categoria__tipo='Fixa').aggregate(t=Sum('valor'))['t'] or 0
            variaveis = despesas_kpi.filter(categoria__tipo__in=['Variavel', 'Variavel (Consumo/Eventual)']).aggregate(t=Sum('valor'))['t'] or 0

            return Response({
                "kpis": {
                    "valorOperacional": float(total_operacional),
                    "valorAportes": float(total_aportes),
                    "totalDespesas": float(total_despesas_cadastradas),
                    "despesasPagas": float(total_despesas_pagas_val),
                    "saldo": float(total_operacional + total_aportes - total_despesas_pagas_val),
                    "ticketMedio": 0, # Simplificado
                    "totalReceber": float(total_pendente),
                    "totalAtrasado": float(total_atrasado)
                },
                "grafico_fluxo": grafico_fluxo,
                "custos_mes": {
                    "fixas": float(fixas),
                    "variaveis": float(variaveis)
                }
            })
        except Exception as e:
            import traceback
            print("ERRO DASHBOARD:", traceback.format_exc())
            return Response({"erro": str(e)}, status=500)

class DashboardOperacionalAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        mes = request.query_params.get('mes', timezone.now().month)
        ano = request.query_params.get('ano', timezone.now().year)

        qtd_salas = Sala.objects.filter(ativa=True).count() or 1
        dias_uteis = 22 
        horas_dia = 9 
        capacidade_horas = qtd_salas * dias_uteis * horas_dia
        
        agendamentos_mes = Agendamento.objects.filter(data_hora_inicio__month=mes, data_hora_inicio__year=ano).exclude(status='Cancelado')
        horas_ocupadas = agendamentos_mes.count() 
        
        faturamento_total = Pagamento.objects.filter(data_pagamento__month=mes, data_pagamento__year=ano, status='Pago').aggregate(Sum('valor'))['valor__sum'] or 0
        ticket_medio = faturamento_total / horas_ocupadas if horas_ocupadas > 0 else 0

        return Response({
            "capacidade_total_slots": capacidade_horas,
            "slots_ocupados": horas_ocupadas,
            "taxa_ocupacao": round((horas_ocupadas / capacidade_horas) * 100, 1) if capacidade_horas > 0 else 0,
            "faturamento_real": faturamento_total,
            "ticket_medio_hora": round(ticket_medio, 2)
        })
    
class DespesaViewSet(viewsets.ModelViewSet):
    # OTIMIZAÇÃO CRÍTICA: Traz categoria e usuário junto.
    # Isso transforma 880 queries em apenas 1 query.
    queryset = Despesa.objects.select_related('categoria', 'registrado_por').all().order_by('-data_despesa')
    serializer_class = DespesaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        
        # 1. BUSCA GLOBAL (Resolve o problema da busca limitada ao mês)
        search_term = self.request.query_params.get('search')
        if search_term:
            # Se tiver busca, ignora filtros de data e retorna tudo que der match
            return qs.filter(descricao__icontains=search_term)

        # 2. Filtros de Data (Só aplicados se NÃO tiver busca)
        mes = self.request.query_params.get('mes')
        ano = self.request.query_params.get('ano')
        
        if mes and ano:
            qs = qs.filter(data_despesa__month=mes, data_despesa__year=ano)
            
        return qs

    @action(detail=True, methods=['delete'], url_path='excluir-serie')
    def excluir_serie(self, request, pk=None):
        """
        Exclui a despesa atual E todas as outras criadas no mesmo lote (ex: erro de parcelamento).
        Lógica: Mesmo usuário + Mesma data de registro (margem de 10s) + Descrição similar.
        """
        despesa_alvo = self.get_object()
        
        # Remove a parte "(x/y)" da descrição para achar as irmãs
        descricao_base = re.sub(r'\s*\(\d+/\d+\)$', '', despesa_alvo.descricao)
        
        # Margem de segurança de tempo (mesmo lote de criação)
        time_margin = timezone.timedelta(seconds=30)
        
        irmas = Despesa.objects.filter(
            registrado_por=despesa_alvo.registrado_por,
            data_registro__range=(despesa_alvo.data_registro - time_margin, despesa_alvo.data_registro + time_margin),
            descricao__startswith=descricao_base
        )
        
        total = irmas.count()
        irmas.delete()
        
        return Response({"msg": f"{total} lançamentos da série foram excluídos com sucesso."})

    @action(detail=True, methods=['patch'], url_path='editar-serie')
    def editar_serie(self, request, pk=None):
        """
        Edita o valor ou categoria de toda a série
        """
        despesa_alvo = self.get_object()
        descricao_base = re.sub(r'\s*\(\d+/\d+\)$', '', despesa_alvo.descricao)
        time_margin = timezone.timedelta(seconds=30)
        
        irmas = Despesa.objects.filter(
            registrado_por=despesa_alvo.registrado_por,
            data_registro__range=(despesa_alvo.data_registro - time_margin, despesa_alvo.data_registro + time_margin),
            descricao__startswith=descricao_base
        )

        dados = request.data
        update_fields = {}
        
        if 'valor' in dados: update_fields['valor'] = dados['valor']
        if 'categoria' in dados: update_fields['categoria_id'] = dados['categoria']
        
        if update_fields:
            irmas.update(**update_fields)
            
        return Response({"msg": f"Série atualizada ({irmas.count()} itens)."})
    
    def create(self, request, *args, **kwargs):
        """
        Sobrescreve o create padrão para usar o Service quando houver parcelamento/recorrência.
        """
        qtd_parcelas = int(request.data.get('qtd_parcelas', 1))
        
        # Se for parcela única, usa o padrão do Django Rest Framework (Simples e rápido)
        if qtd_parcelas <= 1:
            return super().create(request, *args, **kwargs)

        # Se tiver parcelas, delega para a Inteligência do Service
        try:
            # Captura dados
            dados = request.data
            categoria_id = dados.get('categoria_id') or dados.get('categoria')
            valor = float(dados.get('valor'))
            vencimento = datetime.strptime(dados.get('data_vencimento'), '%Y-%m-%d').date()
            pago = dados.get('pago') is True or str(dados.get('pago')).lower() == 'true'
            
            # Detecta se é Recorrência (Repetir valor) ou Rateio (Dividir valor)
            # Vamos assumir: Se veio do front como 'repetir_valor', é recorrência.
            # Caso contrário, comportamento padrão é dividir.
            modo_recorrencia = dados.get('repetir_valor') is True

            # Chama o Service
            FaturamentoService.criar_despesa(
                categoria_id=categoria_id,
                valor_total=valor,
                qtd_parcelas=qtd_parcelas,
                data_vencimento_base=vencimento,
                user=request.user,
                descricao=dados.get('descricao'),
                pago_inicialmente=pago,
                data_pagamento_manual=vencimento if pago else None, # Assume data caixa = vencimento se não vier
                modo_recorrencia=modo_recorrencia
            )
            
            return Response({"msg": f"{qtd_parcelas} lançamentos gerados com sucesso."}, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'], url_path='timeline')
    def timeline(self, request, pk=None):
        """
        Retorna a despesa atual E todas as suas irmãs de série (parcelas).
        """
        despesa_alvo = self.get_object()
        
        # 1. Tenta identificar a série pela descrição base (remove " (x/y)")
        # Ex: "Aluguel (1/12)" vira "Aluguel"
        import re
        descricao_base = re.sub(r'\s*\(\d+/\d+\)$', '', despesa_alvo.descricao).strip()
        
        # 2. Busca itens com mesma descrição base, mesmo valor (ou próximo) e mesmo dia de criação
        # Margem de 1 minuto na criação para pegar o lote
        time_margin = timezone.timedelta(minutes=1)
        
        # 1. Busca Irmãs
        # 2. Anota uma data efetiva (Vencimento ou Competência)
        # 3. Ordena Decrescente por essa data efetiva
        irmas = Despesa.objects.select_related('categoria', 'registrado_por').filter(
            registrado_por=despesa_alvo.registrado_por,
            data_registro__range=(despesa_alvo.data_registro - time_margin, despesa_alvo.data_registro + time_margin),
            descricao__startswith=descricao_base
        ).annotate(
            data_ordenacao=Coalesce('data_vencimento', 'data_despesa')
        ).order_by('-data_ordenacao', '-id') # Desempate por ID garante ordem estável

        if not irmas.exists():
            irmas = [despesa_alvo]

        serializer = self.get_serializer(irmas, many=True)
        return Response(serializer.data)

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
    # OTIMIZAÇÃO: select_related aqui também
    queryset = TransacaoFinanceira.objects.select_related('paciente', 'categoria', 'transacao_pai').all().order_by('-data_vencimento')
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
class InterWebhookAPIView(APIView):
    def post(self, request): return Response(status=200)
class LancamentoAvulsoAPIView(APIView):
    def post(self, request): return Response({"msg": "Use /transacoes/"})
class ProjecaoFluxoCaixaAPIView(APIView):
    def get(self, request): return Response({"msg": "OK"})