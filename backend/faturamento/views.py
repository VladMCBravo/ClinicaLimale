# backend/faturamento/views.py - VERSÃO FINAL, LIMPA E CORRIGIDA
import csv
import io
from datetime import datetime, timedelta, date, time, timezone

from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser

from django.db.models import Sum
from django.db.models.functions import TruncMonth, TruncDate
from django.utils import timezone
from django.http import HttpResponse

# --- IMPORTAÇÕES DE OUTROS APPS ---
from agendamentos.serializers import AgendamentoSerializer
from agendamentos.models import Agendamento
from usuarios.permissions import IsRecepcaoOrAdmin

# --- TENTA IMPORTAR O SERVIÇO DO INTER COM SEGURANÇA ---
try:
    from .services import inter_service
except ImportError:
    inter_service = None

from .models import (
    Pagamento, CategoriaDespesa, Despesa, Convenio, 
    PlanoConvenio, LoteFaturamento, GuiaTiss, Procedimento, 
    ValorProcedimentoConvenio
)
from .serializers import (
    PagamentoSerializer, PagamentoUpdateSerializer,
    CategoriaDespesaSerializer, DespesaSerializer,
    CobrancaPendenteSerializer, LancamentoAvulsoReceitaSerializer,
    ConvenioSerializer, PlanoConvenioSerializer, ProcedimentoSerializer
)

# ============================================================================
#  VIEWS DE INTELIGÊNCIA (DASHBOARD E PROJEÇÃO)
# ============================================================================

class FinanceiroDashboardAPIView(APIView):
    permission_classes = [IsRecepcaoOrAdmin]

    def get(self, request):
        hoje = timezone.localdate()
        
        # =========================================================================
        # 1. TOTAIS GERAIS
        # =========================================================================
        receitas_hoje = Pagamento.objects.filter(status='Pago', data_pagamento__date=hoje).aggregate(Sum('valor'))['valor__sum'] or 0
        despesas_hoje = Despesa.objects.filter(pago=True, data_pagamento=hoje).aggregate(Sum('valor'))['valor__sum'] or 0
        
        total_entradas = Pagamento.objects.filter(status='Pago').aggregate(Sum('valor'))['valor__sum'] or 0
        total_saidas = Despesa.objects.filter(pago=True).aggregate(Sum('valor'))['valor__sum'] or 0
        saldo_final = total_entradas - total_saidas

        # =========================================================================
        # 2. EXTRATO (CORREÇÃO DE DATAS)
        # =========================================================================
        # Objetivo: Converter tudo para DATETIME AWARE (com fuso horário) para ordenar corretamente

        receitas_reais = Pagamento.objects.filter(
            status='Pago',
            data_pagamento__isnull=False 
        ).select_related('paciente').only(
            'id', 'paciente__nome_completo', 'descricao', 'data_pagamento', 'valor', 'forma_pagamento'
        ).order_by('-data_pagamento')[:30]

        despesas_reais = Despesa.objects.filter(
            pago=True,
            data_pagamento__isnull=False
        ).only(
            'id', 'descricao', 'data_pagamento', 'valor', 'categoria'
        ).order_by('-data_pagamento')[:30]

        extrato = []
        
        for r in receitas_reais:
            nome = r.paciente.nome_completo if r.paciente else (r.descricao or "Receita Avulsa")
            extrato.append({
                'id': f'rec-{r.id}',
                'desc': nome,
                'date': r.data_pagamento, # Já é datetime aware
                'amount': float(r.valor),
                'type': 'income',
                'forma': r.forma_pagamento
            })

        for d in despesas_reais:
            # CORREÇÃO CRÍTICA: Despesa é 'date', Pagamento é 'datetime'.
            # Convertemos Despesa para 'datetime' (início do dia) para poder comparar.
            data_full = d.data_pagamento
            if isinstance(data_full, date) and not isinstance(data_full, datetime):
                # Combina a data com a hora 00:00:00
                data_naive = datetime.combine(data_full, time.min)
                # Adiciona o fuso horário para ficar igual ao Pagamento
                data_full = timezone.make_aware(data_naive)
            
            extrato.append({
                'id': f'desp-{d.id}',
                'desc': d.descricao,
                'date': data_full, 
                'amount': float(d.valor),
                'type': 'expense',
                'forma': 'Despesa'
            })

        # Agora ordena sem erro (ambos são datetimes com fuso)
        extrato.sort(key=lambda x: x['date'] if x['date'] else timezone.now(), reverse=True)
        extrato = extrato[:40]

        # =========================================================================
        # 3. ALERTAS (CORREÇÃO DE TIPAGEM)
        # =========================================================================
        
        pagar_futuro = Despesa.objects.filter(pago=False, data_vencimento__gte=hoje).order_by('data_vencimento')[:10]
        receber_futuro = Pagamento.objects.filter(status='Pendente', data_vencimento__gte=hoje).select_related('paciente').order_by('data_vencimento')[:10]

        alertas_list = []

        for c in pagar_futuro:
            alertas_list.append({
                'id': f'pg-{c.id}',
                'desc': c.descricao,
                'date': c.data_vencimento, # É date
                'valor': float(c.valor),
                'tipo': 'saida'
            })
            
        for r in receber_futuro:
            nome = r.paciente.nome_completo if r.paciente else (r.descricao or "A Receber")
            alertas_list.append({
                'id': f'rc-{r.id}',
                'desc': nome,
                'date': r.data_vencimento, # É date
                'valor': float(r.valor),
                'tipo': 'entrada'
            })

        # CORREÇÃO CRÍTICA: Ordenação segura. Se date for None, joga para o final (date.max)
        # Usamos date.max em vez de datetime.max para não dar erro de comparação
        alertas_list.sort(key=lambda x: x['date'] if x['date'] else date.max)
        
        # Formata para string
        for item in alertas_list:
            item['date'] = item['date'].strftime('%d/%m') if item['date'] else 'S/D'

        return Response({
            "saldo_em_conta": float(saldo_final),
            "faturamento_do_dia": float(receitas_hoje),
            "despesas_do_dia": float(despesas_hoje),
            "extrato_real": extrato,
            "alertas_vencimento": alertas_list
        })


class ProjecaoFluxoCaixaAPIView(APIView):
    permission_classes = [IsRecepcaoOrAdmin]

    def get(self, request):
        hoje = timezone.localdate()
        data_final = hoje + timedelta(days=30)
        
        # 1. CÁLCULO DO SALDO INICIAL REAL (Baseado no histórico do sistema)
        # Se não usar API do banco Inter, calculamos: Tudo que entrou - Tudo que saiu (status Pago)
        total_entradas_historico = Pagamento.objects.filter(status='Pago').aggregate(Sum('valor'))['valor__sum'] or 0
        total_saidas_historico = Despesa.objects.filter(pago=True).aggregate(Sum('valor'))['valor__sum'] or 0
        
        # Saldo de partida para o gráfico de hoje
        saldo_acumulado = float(total_entradas_historico) - float(total_saidas_historico)
        
        # (Opcional) Se tiver integração Inter ativa e quiser usar o saldo real do banco:
        # try:
        #     if inter_service:
        #         saldo_banco = inter_service.consultar_saldo()
        #         if saldo_banco is not None:
        #             saldo_acumulado = float(saldo_banco)
        # except: pass

        # 2. MAPEAR RECEITAS FUTURAS (Agendamentos + Financeiro Pendente)
        mapa_receitas = {}

        # A) Financeiro já lançado (Boletos gerados, Parcelas de cartão a cair)
        receitas_fin = Pagamento.objects.filter(
            status='Pendente',
            data_vencimento__range=[hoje, data_final]
        ).annotate(dia=TruncDate('data_vencimento')).values('dia').annotate(total=Sum('valor')).order_by('dia')

        for r in receitas_fin:
            d = r['dia']
            mapa_receitas[d] = mapa_receitas.get(d, 0) + (float(r['total'] or 0))

        # B) Agendamentos Confirmados (Que AINDA NÃO têm financeiro lançado)
        # Isso é crucial: Pega consultas futuras que vão virar dinheiro.
        agendamentos_futuros = Agendamento.objects.filter(
            data_hora_inicio__date__range=[hoje, data_final],
            status__in=['Agendado', 'Confirmado'],
            pagamento__isnull=True  # Só os que não geraram cobrança ainda
        ).annotate(dia=TruncDate('data_hora_inicio')).values('dia').annotate(
            # Tenta pegar valor do procedimento ou valor fixo da consulta
            total=Sum('procedimento__valor_particular') 
        ).order_by('dia')

        for ag in agendamentos_futuros:
            d = ag['dia']
            # Se o valor for null (ex: retorno), soma 0
            mapa_receitas[d] = mapa_receitas.get(d, 0) + (float(ag['total'] or 0))

        # 3. MAPEAR DESPESAS FUTURAS (Contas a Pagar)
        mapa_despesas = {}
        despesas_futuras = Despesa.objects.filter(
            pago=False,
            data_vencimento__range=[hoje, data_final]
        ).annotate(dia=TruncDate('data_vencimento')).values('dia').annotate(total=Sum('valor')).order_by('dia')
        
        for d in despesas_futuras:
            mapa_despesas[d['dia']] = float(d['total'] or 0)

        # 4. CONSTRUÇÃO DA LINHA DO TEMPO
        datas = []
        saldo_linha = []
        despesa_linha = []

        saldo_atual_loop = saldo_acumulado

        for i in range(31):
            data_corrente = hoje + timedelta(days=i)
            
            entrada = float(mapa_receitas.get(data_corrente, 0))
            saida = float(mapa_despesas.get(data_corrente, 0))
            
            saldo_atual_loop = saldo_atual_loop + entrada - saida
            
            datas.append(data_corrente.strftime('%d/%m'))
            saldo_linha.append(saldo_atual_loop)
            despesa_linha.append(saida)

        return Response({
            'labels': datas,
            'saldo_projetado': saldo_linha,
            'despesas_previstas': despesa_linha
        })

# ============================================================================
#  VIEWS DE PAGAMENTOS E COBRANÇAS
# ============================================================================

class CobrancasPendentesPacienteAPIView(generics.ListAPIView):
    serializer_class = CobrancaPendenteSerializer
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]
    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        return Pagamento.objects.filter(
            paciente_id=paciente_id,
            status='Pendente',
            agendamento__isnull=False
        ).order_by('agendamento__data_hora_inicio')

class LancamentoAvulsoAPIView(APIView):
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]
    
    def post(self, request, *args, **kwargs):
        tipo = request.data.get('tipo')
        
        # Lógica para RECEITA (Pagamento)
        if tipo == 'receita':
            dados = request.data.copy()
            qtd_parcelas = int(dados.get('qtd_parcelas', 1))
            forma_pagamento = dados.get('forma_pagamento')
            valor_total = float(dados.get('valor', 0))
            descricao_original = dados.get('descricao', '')
            
            # Se for Crédito e tiver parcelas > 1, cria múltiplos registros
            if forma_pagamento == 'CartaoCredito' and qtd_parcelas > 1:
                valor_parcela = valor_total / qtd_parcelas
                data_base = timezone.localdate() # Começa hoje (ou use data do payload se houver)
                
                pagamentos_criados = []
                
                for i in range(qtd_parcelas):
                    # Calcula data futura (30 dias por parcela)
                    data_vencimento = data_base + timedelta(days=30 * (i + 1))
                    
                    novo_pagamento = Pagamento.objects.create(
                        paciente_id=dados.get('paciente'), # Pode ser None
                        descricao=f"{descricao_original} ({i+1}/{qtd_parcelas})",
                        valor=valor_parcela,
                        forma_pagamento=forma_pagamento,
                        status='Pendente', # Parcelas futuras nascem como Pendente (A Receber)
                        data_pagamento=None, # Ainda não caiu na conta
                        registrado_por=request.user
                    )
                    # Opcional: Se a 1ª parcela já foi paga na hora, você pode marcar a primeira como paga aqui
                    pagamentos_criados.append(novo_pagamento)
                
                return Response({'msg': f'{qtd_parcelas} parcelas geradas.'}, status=status.HTTP_201_CREATED)

            # Lançamento normal (1x ou à vista)
            else:
                serializer = LancamentoAvulsoReceitaSerializer(data=request.data)
                if serializer.is_valid():
                    # Se for dinheiro ou débito, geralmente já nasce pago. 
                    # Se quiser confirmar, pode passar status='Pago' no front ou forçar aqui.
                    obj = serializer.save(registrado_por=request.user)
                    
                    # Força data de hoje se já veio como Pago
                    if obj.status == 'Pago' and not obj.data_pagamento:
                        obj.data_pagamento = timezone.now()
                        obj.save()
                        
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Lógica para DESPESA (mantida)
        elif tipo == 'despesa':
            serializer = DespesaSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(registrado_por=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        else:
            return Response({'error': 'Tipo inválido'}, status=status.HTTP_400_BAD_REQUEST)

class PagamentoViewSet(viewsets.ModelViewSet):
    """
    Endpoint principal para Listagem de Receitas.
    Permite filtrar por status para criar abas no frontend:
    - ?status=Pendente -> Mostra só o que tem pra receber
    - ?status=Pago     -> Mostra o histórico de recebimentos
    - (Sem parametro)  -> Mostra tudo misturado (útil para extrato geral)
    """
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]
    
    def get_serializer_class(self):
        # Usa serializer de update para edições, e o normal para leitura/criação
        return PagamentoUpdateSerializer if self.action in ['update', 'partial_update'] else PagamentoSerializer

    def get_queryset(self):
        # Começa pegando tudo
        queryset = Pagamento.objects.all().select_related('paciente', 'agendamento')
        
        # 1. Filtro por Status (Para as abas do Frontend)
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # 2. Filtro por Data (Opcional, caso queira filtrar por mês/ano específico na listagem geral)
        data_inicio = self.request.query_params.get('data_inicio')
        data_fim = self.request.query_params.get('data_fim')
        
        if data_inicio and data_fim:
            # Se filtrar por data, olhamos a data de vencimento (para pendentes) ou pagamento (para pagos)
            # Para simplificar, usamos vencimento como base cronológica geral
            queryset = queryset.filter(data_vencimento__range=[data_inicio, data_fim])

        # 3. Ordenação Inteligente
        # - Se for tudo ou pendente: Ordena por vencimento (mais urgente primeiro ou cronológico)
        # - Se for pago: Ordena por data de pagamento (mais recente primeiro)
        if status_param == 'Pago':
            return queryset.order_by('-data_pagamento')
        else:
            # Ordena por vencimento decrescente (do mais longe para o mais perto/atrasado)
            # Ou use 'data_vencimento' (crescente) se quiser ver os atrasados no topo
            return queryset.order_by('data_vencimento')

# Mantemos essa view caso você use em algum dropdown específico de cobrança rápida,
# mas a PagamentoViewSet acima já cobre a função dela se usar ?status=Pendente
class PagamentosPendentesListAPIView(generics.ListAPIView):
    serializer_class = PagamentoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Pagamento.objects.filter(status='Pendente').order_by('data_vencimento')
# ============================================================================
#  VIEWS DE DESPESAS E RELATÓRIOS
# ============================================================================

class CategoriaDespesaViewSet(viewsets.ModelViewSet):
    queryset = CategoriaDespesa.objects.all().order_by('nome')
    serializer_class = CategoriaDespesaSerializer
    permission_classes = [IsAdminUser]

class DespesaViewSet(viewsets.ModelViewSet):
    """
    Endpoint principal para Listagem de Despesas.
    Filtros para o Frontend:
    - ?status=pago     -> Histórico de contas pagas
    - ?status=pendente -> Contas a pagar (boleto, fornecedor)
    """
    serializer_class = DespesaSerializer
    permission_classes = [IsAdminUser] # Apenas admin vê despesas

    def get_queryset(self):
        queryset = Despesa.objects.all()

        # 1. Filtro por Status
        status_param = self.request.query_params.get('status') # 'pago' ou 'pendente'
        
        if status_param == 'pago':
            queryset = queryset.filter(pago=True)
        elif status_param == 'pendente':
            queryset = queryset.filter(pago=False)

        # 2. Filtro por Data
        data_inicio = self.request.query_params.get('data_inicio')
        data_fim = self.request.query_params.get('data_fim')
        if data_inicio and data_fim:
            queryset = queryset.filter(data_vencimento__range=[data_inicio, data_fim])

        # 3. Ordenação
        if status_param == 'pago':
            # Pagas: Data que pagou (recente primeiro)
            return queryset.order_by('-data_pagamento')
        else:
            # A Pagar: Data de vencimento (Próximos a vencer ou vencidos no topo)
            # Ordenação crescente: vencidos (-10 dias) aparecem antes de futuros (+10 dias)
            return queryset.order_by('data_vencimento')

    def perform_create(self, serializer):
        serializer.save(registrado_por=self.request.user)

class RelatorioFinanceiroAPIView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request, *args, **kwargs):
        pagamentos_confirmados = Pagamento.objects.filter(status='Pago')
        faturamento_por_forma = pagamentos_confirmados.values('forma_pagamento').annotate(total=Sum('valor')).order_by('-total')
        despesas_por_categoria = Despesa.objects.values('categoria__nome').annotate(total=Sum('valor')).order_by('-total')
        
        faturamento_mensal = pagamentos_confirmados.annotate(mes=TruncMonth('data_pagamento')).values('mes').annotate(total=Sum('valor')).order_by('mes')
        despesas_mensais = Despesa.objects.annotate(mes=TruncMonth('data_despesa')).values('mes').annotate(total=Sum('valor')).order_by('mes')
        
        fluxo_caixa = {}
        for item in faturamento_mensal:
            if item['mes']:
                mes_str = item['mes'].strftime('%Y-%m')
                fluxo_caixa.setdefault(mes_str, {'receitas': 0, 'despesas': 0})
                fluxo_caixa[mes_str]['receitas'] = item['total'] or 0
        
        for item in despesas_mensais:
            if item['mes']:
                mes_str = item['mes'].strftime('%Y-%m')
                fluxo_caixa.setdefault(mes_str, {'receitas': 0, 'despesas': 0})
                fluxo_caixa[mes_str]['despesas'] = item['total'] or 0
                
        fluxo_caixa_formatado = [{'mes': mes, **valores} for mes, valores in fluxo_caixa.items()]
        
        return Response({
            'faturamento_por_forma': list(faturamento_por_forma),
            'despesas_por_categoria': list(despesas_por_categoria),
            'fluxo_caixa_mensal': fluxo_caixa_formatado,
        })

# ============================================================================
#  VIEWS DE CONVÊNIOS, FATURAMENTO E TISS
# ============================================================================

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
        if not all([convenio_id, mes, ano]):
            return Agendamento.objects.none()
        return Agendamento.objects.filter(
            plano_utilizado__convenio__id=convenio_id,
            data_hora_inicio__month=mes,
            data_hora_inicio__year=ano,
            tipo_atendimento='Convenio',
            guia_tiss__isnull=True
        ).select_related('paciente', 'plano_utilizado').order_by('data_hora_inicio')

class GerarLoteFaturamentoAPIView(APIView):
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]

    def post(self, request, *args, **kwargs):
        convenio_id = request.data.get('convenio_id')
        mes_referencia_str = request.data.get('mes_referencia') # 'YYYY-MM'
        agendamento_ids = request.data.get('agendamento_ids', [])

        if not all([convenio_id, mes_referencia_str, agendamento_ids]):
            return Response({'detail': 'Dados insuficientes.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # 1. Cria o Lote
            ano, mes = map(int, mes_referencia_str.split('-'))
            convenio = Convenio.objects.get(id=convenio_id)
            
            novo_lote = LoteFaturamento.objects.create(
                convenio=convenio,
                mes_referencia=timezone.datetime(ano, mes, 1).date(),
                gerado_por=request.user,
                status='Enviado'
            )
            
            # 2. Busca agendamentos
            agendamentos_para_faturar = Agendamento.objects.filter(id__in=agendamento_ids).select_related('paciente', 'procedimento')

            valor_total_lote = 0
            guias_a_criar = []

            # 3. Inicia XML
            xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
            xml_content += '<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">\n'
            xml_content += f'  <ans:loteGuias>\n'
            xml_content += f'    <ans:numeroLote>{novo_lote.id}</ans:numeroLote>\n'
            
            for ag in agendamentos_para_faturar:
                valor_da_guia = ag.procedimento.valor_particular if (ag.procedimento and hasattr(ag.procedimento, 'valor_particular')) else 0.00
                codigo_procedimento = ag.procedimento.codigo_tuss if ag.procedimento else "00000000"
                descricao_procedimento = ag.procedimento.descricao if ag.procedimento else "Procedimento não especificado"

                guias_a_criar.append(GuiaTiss(lote=novo_lote, agendamento=ag, valor_guia=valor_da_guia))
                valor_total_lote += float(valor_da_guia)
                
                # Monta XML da guia
                xml_content += f'    <ans:guiaSP-SADT>\n'
                xml_content += f'      <ans:cabecalhoGuia>\n'
                xml_content += f'        <ans:registroANS>123456</ans:registroANS>\n'
                xml_content += f'        <ans:numeroGuiaPrestador>{ag.id}</ans:numeroGuiaPrestador>\n'
                xml_content += f'      </ans:cabecalhoGuia>\n'
                xml_content += f'      <ans:dadosBeneficiario>\n'
                xml_content += f'        <ans:numeroCarteira>{ag.paciente.numero_carteirinha or "000"}</ans:numeroCarteira>\n'
                xml_content += f'        <ans:nomeBeneficiario>{ag.paciente.nome_completo}</ans:nomeBeneficiario>\n'
                xml_content += f'      </ans:dadosBeneficiario>\n'
                xml_content += f'      <ans:procedimentosExecutados>\n'
                xml_content += f'        <ans:procedimento>\n'
                xml_content += f'          <ans:codigoTabela>22</ans:codigoTabela>\n'
                xml_content += f'          <ans:codigoProcedimento>{codigo_procedimento}</ans:codigoProcedimento>\n'
                xml_content += f'          <ans:descricaoProcedimento>{descricao_procedimento}</ans:descricaoProcedimento>\n'
                xml_content += f'          <ans:quantidadeExecutada>1</ans:quantidadeExecutada>\n'
                xml_content += f'          <ans:valorProcessado>{float(valor_da_guia):.2f}</ans:valorProcessado>\n'
                xml_content += f'        </ans:procedimento>\n'
                xml_content += f'      </ans:procedimentosExecutados>\n'
                xml_content += f'      <ans:valorTotal>{float(valor_da_guia):.2f}</ans:valorTotal>\n'
                xml_content += f'    </ans:guiaSP-SADT>\n'
            
            xml_content += f'  </ans:loteGuias>\n'
            xml_content += '</ans:mensagemTISS>\n'
            
            GuiaTiss.objects.bulk_create(guias_a_criar)
            novo_lote.valor_total_lote = valor_total_lote
            novo_lote.save()
            
            response = HttpResponse(xml_content, content_type='application/xml')
            response['Content-Disposition'] = f'attachment; filename="lote_{novo_lote.id}_{convenio.nome}.xml"'
            return response

        except Exception as e:
            return Response({'detail': f'Ocorreu um erro: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProcedimentoViewSet(viewsets.ModelViewSet):
    queryset = Procedimento.objects.prefetch_related('valores_convenio__plano_convenio').filter(ativo=True).order_by('descricao')
    serializer_class = ProcedimentoSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post', 'put'], url_path='definir-preco-convenio')
    def definir_preco_convenio(self, request, pk=None):
        procedimento = self.get_object()
        plano_id = request.data.get('plano_convenio_id')
        valor = request.data.get('valor')
        
        if not plano_id or valor is None:
            return Response({'error': 'Dados incompletos'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            plano = PlanoConvenio.objects.get(id=plano_id)
            obj, created = ValorProcedimentoConvenio.objects.update_or_create(
                procedimento=procedimento, plano_convenio=plano, defaults={'valor': valor}
            )
            serializer = self.get_serializer(procedimento)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        except PlanoConvenio.DoesNotExist:
            return Response({'error': 'Plano não encontrado'}, status=status.HTTP_404_NOT_FOUND)

class TussUploadView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = (MultiPartParser, FormParser)
    def post(self, request, *args, **kwargs):
        arquivo = request.FILES.get('arquivo_tuss')
        if not arquivo: return Response({'error': 'Sem arquivo'}, status=400)
        try:
            decoded_file = arquivo.read().decode('utf-8-sig')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string, delimiter=';')
            count = 0
            for row in reader:
                if row.get('CODIGO_TUSS'):
                    Procedimento.objects.update_or_create(
                        codigo_tuss=row['CODIGO_TUSS'],
                        defaults={'descricao': row.get('DESCRICAO', '')}
                    )
                    count += 1
            return Response({'msg': f'{count} processados'})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class InterWebhookAPIView(APIView):
    permission_classes = [AllowAny]
    def post(self, request, *args, **kwargs):
        dados_webhook = request.data
        if 'pix' in dados_webhook and isinstance(dados_webhook['pix'], list):
            for pix_info in dados_webhook['pix']:
                txid = pix_info.get('txid')
                if not txid: continue
                try:
                    pagamento = Pagamento.objects.get(inter_txid=txid)
                    if pagamento.status == 'Pendente':
                        pagamento.status = 'Pago'
                        pagamento.forma_pagamento = 'PIX'
                        pagamento.save()
                except Pagamento.DoesNotExist:
                    pass
        return Response(status=status.HTTP_200_OK)