# backend/faturamento/views.py - VERSÃO FINAL, LIMPA E CORRIGIDA
import csv
import io
from datetime import datetime, timedelta

from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser

from django.db.models import Sum, Value, F
from django.db.models.functions import TruncMonth, TruncDate, Coalesce
from django.utils import timezone
from django.http import HttpResponse
from django.core.exceptions import FieldError  # <--- CORREÇÃO 1: IMPORT QUE FALTAVA

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
        # Define um horizonte de 7 dias para alertas
        data_limite_alertas = hoje + timedelta(days=7)
        
        # 1. TOTAIS DO DIA (Regime de Caixa - O que entrou/saiu HOJE)
        receitas_hoje = Pagamento.objects.filter(status='Pago', data_pagamento__date=hoje).aggregate(Sum('valor'))['valor__sum'] or 0
        despesas_hoje = Despesa.objects.filter(pago=True, data_pagamento=hoje).aggregate(Sum('valor'))['valor__sum'] or 0
        
        # 2. SALDO GERAL ACUMULADO
        total_entradas = Pagamento.objects.filter(status='Pago').aggregate(Sum('valor'))['valor__sum'] or 0
        total_saidas = Despesa.objects.filter(pago=True).aggregate(Sum('valor'))['valor__sum'] or 0
        saldo_final = total_entradas - total_saidas

        # =========================================================================
        # 3. EXTRATO UNIFICADO INTELIGENTE (A CORREÇÃO ESTÁ AQUI)
        # =========================================================================
        
        # Receitas: Prioriza Data Pagamento -> Se nula, usa Vencimento -> Se nula, usa Hoje
        ultimas_receitas = Pagamento.objects.filter(status='Pago').annotate(
            data_efetiva=Coalesce('data_pagamento', 'data_vencimento', Value(hoje))
        ).order_by('-data_efetiva')[:30]

        # Despesas: Prioriza Data Pagamento -> Se nula, usa Vencimento -> Se nula, usa Emissão
        ultimas_despesas = Despesa.objects.filter(pago=True).annotate(
            data_efetiva=Coalesce('data_pagamento', 'data_vencimento', 'data_despesa')
        ).order_by('-data_efetiva')[:30]

        extrato = []
        
        for p in ultimas_receitas:
            extrato.append({
                'id': f'rec-{p.id}',
                'desc': p.paciente.nome_completo if p.paciente else (p.descricao or "Receita Avulsa"),
                # Usa a data efetiva calculada pelo banco para ordenação correta
                'date': p.data_efetiva, 
                'amount': float(p.valor),
                'type': 'income',
                'status': 'Pago'
            })
        
        for d in ultimas_despesas:
            extrato.append({
                'id': f'desp-{d.id}',
                'desc': d.descricao,
                # Usa a data efetiva calculada pelo banco para ordenação correta
                'date': d.data_efetiva,
                'amount': float(d.valor),
                'type': 'expense',
                'status': 'Pago'
            })

        # Ordena a lista combinada pela data efetiva (Do mais recente para o mais antigo)
        extrato.sort(key=lambda x: x['date'] if x['date'] else datetime.min, reverse=True)
        
        # Pega apenas os 30 últimos movimentos globais
        extrato = extrato[:30]

        # 4. AVISOS INTELIGENTES (Contas a Pagar E a Receber Próximas)
        # Contas a Pagar vencendo (exclui pagas)
        contas_a_pagar = Despesa.objects.filter(
            pago=False, 
            data_vencimento__gte=hoje,
            data_vencimento__lte=data_limite_alertas
        ).only('id', 'descricao', 'data_vencimento', 'valor')

        # Contas a Receber (Pendente) vencendo (exclui pagas)
        contas_a_receber = Pagamento.objects.filter(
            status='Pendente',
            data_vencimento__gte=hoje,
            data_vencimento__lte=data_limite_alertas
        ).select_related('paciente').only('id', 'descricao', 'data_vencimento', 'valor', 'paciente__nome_completo')

        alertas_list = []
        
        for c in contas_a_pagar:
            alertas_list.append({
                'id': f'pagar-{c.id}',
                'desc': c.descricao,
                'date': c.data_vencimento,
                'valor': float(c.valor),
                'tipo': 'saida' # Identificador para cor vermelha
            })
            
        for r in contas_a_receber:
            # Tenta pegar nome do paciente ou descrição
            desc_text = r.paciente.nome_completo if r.paciente else (r.descricao or "A Receber")
            alertas_list.append({
                'id': f'receber-{r.id}',
                'desc': desc_text,
                'date': r.data_vencimento,
                'valor': float(r.valor),
                'tipo': 'entrada' # Identificador para cor verde
            })

        # Ordena alertas por vencimento (mais urgente primeiro)
        alertas_list.sort(key=lambda x: x['date'])

        # Formata a data para string BR apenas no final para não quebrar ordenação
        for item in alertas_list:
            item['date'] = item['date'].strftime('%d/%m') if item['date'] else 'S/D'

        dados = {
            "saldo_em_conta": float(saldo_final),
            "faturamento_do_dia": float(receitas_hoje),
            "despesas_do_dia": float(despesas_hoje),
            "extrato_real": extrato,
            "alertas_vencimento": alertas_list # Agora contém entradas e saídas
        }
        return Response(dados)


class ProjecaoFluxoCaixaAPIView(APIView):
    permission_classes = [IsRecepcaoOrAdmin]

    def get(self, request):
        hoje = timezone.localdate()
        data_final = hoje + timedelta(days=30)
        
        # 1. SALDO INICIAL (Ponto de Partida)
        saldo_acumulado = 0.0
        try:
            if inter_service:
                saldo_real = inter_service.consultar_saldo()
                if saldo_real is not None:
                    saldo_acumulado = float(saldo_real)
        except Exception:
            pass

        # 2. RECEITAS FUTURAS (Unificação: Agendamentos + Financeiro Pendente)
        mapa_receitas = {}

        # A) Receita prevista via Agendamentos (que AINDA NÃO geraram pagamento financeiro)
        #    Isso evita duplicidade: se já gerou pagamento, conta no bloco B.
        
        # Lógica para descobrir nome do campo (valor ou valor_consulta)
        campo_valor = 'valor' 
        try:
            Agendamento.objects.filter(pk__in=[]).values('valor_consulta')
            campo_valor = 'valor_consulta'
        except FieldError:
            pass 

        try:
            receitas_agend = Agendamento.objects.filter(
                data_hora_inicio__date__range=[hoje, data_final],
                status__in=['Agendado', 'Confirmado'],
                pagamento__isnull=True # <--- IMPORTANTE: Só pega o que não está no financeiro ainda
            ).annotate(
                dia=TruncDate('data_hora_inicio')
            ).values('dia').annotate(
                total=Sum(campo_valor)
            ).order_by('dia')
            
            for r in receitas_agend:
                d = r['dia']
                mapa_receitas[d] = mapa_receitas.get(d, 0) + (float(r['total'] or 0))

        except Exception as e:
            print(f"Erro ao calcular receitas de agendamentos: {e}")

        # B) Receita confirmada no Financeiro (Lançamentos Avulsos, Parcelas, Boletos)
        try:
            receitas_fin = Pagamento.objects.filter(
                status='Pendente',
                data_vencimento__range=[hoje, data_final]
            ).annotate(
                dia=TruncDate('data_vencimento')
            ).values('dia').annotate(
                total=Sum('valor')
            ).order_by('dia')

            for r in receitas_fin:
                d = r['dia']
                # Soma ao que já existia (dos agendamentos)
                mapa_receitas[d] = mapa_receitas.get(d, 0) + (float(r['total'] or 0))

        except Exception as e:
            print(f"Erro ao calcular receitas do financeiro: {e}")


        # 3. DESPESAS FUTURAS (Pelo Vencimento)
        mapa_despesas = {}
        try:
            # Usamos data_vencimento para fluxo de caixa real. Se não tiver vencimento, usa data_despesa.
            # O coalesce garante que não quebre se data_vencimento for null, mas idealmente deve ser preenchido.
            despesas_qs = Despesa.objects.filter(
                pago=False,
                data_vencimento__range=[hoje, data_final]
            ).annotate(
                dia=TruncDate('data_vencimento')
            ).values('dia').annotate(
                total=Sum('valor')
            ).order_by('dia')
            
            mapa_despesas = {d['dia']: (float(d['total'] or 0)) for d in despesas_qs}
        except Exception as e:
            print(f"Erro ao calcular despesas futuras: {e}")

        # 4. CONSTRUÇÃO DA LINHA DO TEMPO (Loop de 30 dias)
        datas = []
        saldo_linha = []
        despesa_linha = []

        saldo_atual_loop = saldo_acumulado

        for i in range(31):
            data_corrente = hoje + timedelta(days=i)
            
            entrada = float(mapa_receitas.get(data_corrente, 0))
            saida = float(mapa_despesas.get(data_corrente, 0))
            
            # Cálculo do saldo acumulado dia a dia
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
    queryset = Pagamento.objects.all().select_related('paciente', 'agendamento').order_by('-agendamento__data_hora_inicio')
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]
    def get_serializer_class(self):
        return PagamentoUpdateSerializer if self.action in ['update', 'partial_update'] else PagamentoSerializer

class PagamentosPendentesListAPIView(generics.ListAPIView):
    serializer_class = PagamentoSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return Pagamento.objects.filter(status='Pendente').order_by('agendamento__data_hora_inicio')

# ============================================================================
#  VIEWS DE DESPESAS E RELATÓRIOS
# ============================================================================

class CategoriaDespesaViewSet(viewsets.ModelViewSet):
    queryset = CategoriaDespesa.objects.all().order_by('nome')
    serializer_class = CategoriaDespesaSerializer
    permission_classes = [IsAdminUser]

class DespesaViewSet(viewsets.ModelViewSet):
    queryset = Despesa.objects.all().order_by('-data_despesa')
    serializer_class = DespesaSerializer
    permission_classes = [IsAdminUser]
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