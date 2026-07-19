import csv
import io
from datetime import datetime, date, timedelta
from dateutil.relativedelta import relativedelta
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone

# Ajuste os imports conforme sua estrutura exata de pastas
from .models import (
    Pagamento, Despesa, LoteFaturamento, GuiaTiss, 
    Convenio, Procedimento, CategoriaDespesa
)
# Se agendamentos for um app separado na raiz:
from agendamentos.models import Agendamento 

class FaturamentoService:
    
    # =========================================================================
    # 1. GESTÃO DE LANÇAMENTOS (Receitas e Despesas)
    # =========================================================================

    @staticmethod
    def _calcular_parcelas(valor_total, qtd_parcelas):
        """Helper interno para evitar dízimas e perda de centavos."""
        if qtd_parcelas < 1: qtd_parcelas = 1
        valor_parcela = round(valor_total / qtd_parcelas, 2)
        diferenca = round(valor_total - (valor_parcela * qtd_parcelas), 2)
        return valor_parcela, diferenca

    @staticmethod
    @transaction.atomic
    def criar_receita(paciente, valor_total, qtd_parcelas, data_vencimento_base, user, descricao, forma_pagamento, status_inicial, data_pagamento_manual=None):
        valor_parcela, diferenca_centavos = FaturamentoService._calcular_parcelas(valor_total, qtd_parcelas)
        objetos_criados = []

        for i in range(qtd_parcelas):
            data_venc = data_vencimento_base + relativedelta(months=i)
            
            # Regra: Se parcelado, só a primeira pode nascer paga
            if i == 0:
                status_atual = status_inicial
                data_pag = data_pagamento_manual if status_inicial == 'Pago' else None
                valor_final = valor_parcela + diferenca_centavos
            else:
                status_atual = 'Pendente'
                data_pag = None
                valor_final = valor_parcela

            novo_pag = Pagamento.objects.create(
                paciente_id=paciente if paciente else None,
                descricao=f"{descricao} ({i+1}/{qtd_parcelas})" if qtd_parcelas > 1 else descricao,
                valor=valor_final,
                forma_pagamento=forma_pagamento,
                status=status_atual,
                data_vencimento=data_venc,
                data_pagamento=data_pag,
                registrado_por=user
            )
            objetos_criados.append(novo_pag)
            
        return objetos_criados

    @staticmethod
    @transaction.atomic
    def criar_despesa(categoria_id, valor_total, qtd_parcelas, data_vencimento_base, user, descricao, pago_inicialmente, data_pagamento_manual=None, data_despesa_competencia=None, modo_recorrencia=False):
        """
        modo_recorrencia=True: Repete o valor (Ex: Aluguel 100,00 x 12 = 12 parcelas de 100,00)
        modo_recorrencia=False: Divide o valor (Ex: Compra 1000,00 / 10 = 10 parcelas de 100,00)
        """
        objetos_criados = []
        
        # LÓGICA DE CÁLCULO
        if modo_recorrencia:
            valor_parcela = valor_total
            diferenca_centavos = 0
        else:
            valor_parcela, diferenca_centavos = FaturamentoService._calcular_parcelas(valor_total, qtd_parcelas)
        
        if not data_despesa_competencia:
            data_despesa_competencia = data_vencimento_base

        for i in range(qtd_parcelas):
            nova_data_venc = data_vencimento_base + relativedelta(months=i)
            nova_data_competencia = data_despesa_competencia + relativedelta(months=i)

            # Ajuste de centavos apenas na primeira parcela e SE for rateio
            if i == 0 and not modo_recorrencia:
                valor_final = valor_parcela + diferenca_centavos
            else:
                valor_final = valor_parcela
            
            # Lógica de Pagamento Inicial
            if i == 0:
                esta_pago = pago_inicialmente
                data_pag = data_pagamento_manual if esta_pago else None
            else:
                esta_pago = False
                data_pag = None

            nova_despesa = Despesa.objects.create(
                categoria_id=categoria_id,
                descricao=f"{descricao} ({i+1}/{qtd_parcelas})" if qtd_parcelas > 1 else descricao,
                valor=valor_final,
                data_despesa=nova_data_competencia,
                data_vencimento=nova_data_venc,
                pago=esta_pago,
                data_pagamento=data_pag,
                registrado_por=user
            )
            objetos_criados.append(nova_despesa)
            
        return objetos_criados

    # =========================================================================
    # 2. FATURAMENTO TISS E CONVÊNIOS
    # =========================================================================

    @staticmethod
    @transaction.atomic
    def processar_lote_tiss(convenio_id, mes_referencia_date, agendamento_ids, user):
        try:
            convenio = Convenio.objects.get(id=convenio_id)
        except Convenio.DoesNotExist:
            raise ValueError("Convênio não encontrado.")

        novo_lote = LoteFaturamento.objects.create(
            convenio=convenio,
            mes_referencia=mes_referencia_date,
            gerado_por=user,
            status='Enviado'
        )

        agendamentos = Agendamento.objects.filter(id__in=agendamento_ids).select_related('paciente', 'procedimento')
        
        valor_total_lote = 0
        guias_a_criar = []
        xml_fragments = []

        xml_fragments.append('<?xml version="1.0" encoding="UTF-8"?>')
        xml_fragments.append('<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">')
        xml_fragments.append('  <ans:loteGuias>')
        xml_fragments.append(f'    <ans:numeroLote>{novo_lote.id}</ans:numeroLote>')

        for ag in agendamentos:
            valor_da_guia = 0.00
            codigo_proc = "00000000"
            desc_proc = "Procedimento não especificado"

            if ag.procedimento:
                valor_da_guia = getattr(ag.procedimento, 'valor_particular', 0.00)
                codigo_proc = getattr(ag.procedimento, 'codigo_tuss', "00000000")
                desc_proc = getattr(ag.procedimento, 'descricao', "Procedimento não especificado")

            guias_a_criar.append(GuiaTiss(lote=novo_lote, agendamento=ag, valor_guia=valor_da_guia))
            valor_total_lote += float(valor_da_guia)

            xml_fragments.append('    <ans:guiaSP-SADT>')
            xml_fragments.append('      <ans:cabecalhoGuia>')
            xml_fragments.append('        <ans:registroANS>123456</ans:registroANS>') 
            xml_fragments.append(f'        <ans:numeroGuiaPrestador>{ag.id}</ans:numeroGuiaPrestador>')
            xml_fragments.append('      </ans:cabecalhoGuia>')
            xml_fragments.append('      <ans:dadosBeneficiario>')
            xml_fragments.append(f'        <ans:numeroCarteira>{getattr(ag.paciente, "numero_carteirinha", "000") or "000"}</ans:numeroCarteira>')
            xml_fragments.append(f'        <ans:nomeBeneficiario>{ag.paciente.nome_completo}</ans:nomeBeneficiario>')
            xml_fragments.append('      </ans:dadosBeneficiario>')
            xml_fragments.append('      <ans:procedimentosExecutados>')
            xml_fragments.append('        <ans:procedimento>')
            xml_fragments.append('          <ans:codigoTabela>22</ans:codigoTabela>')
            xml_fragments.append(f'          <ans:codigoProcedimento>{codigo_proc}</ans:codigoProcedimento>')
            xml_fragments.append(f'          <ans:descricaoProcedimento>{desc_proc}</ans:descricaoProcedimento>')
            xml_fragments.append('          <ans:quantidadeExecutada>1</ans:quantidadeExecutada>')
            xml_fragments.append(f'          <ans:valorProcessado>{float(valor_da_guia):.2f}</ans:valorProcessado>')
            xml_fragments.append('        </ans:procedimento>')
            xml_fragments.append('      </ans:procedimentosExecutados>')
            xml_fragments.append(f'      <ans:valorTotal>{float(valor_da_guia):.2f}</ans:valorTotal>')
            xml_fragments.append('    </ans:guiaSP-SADT>')

        xml_fragments.append('  </ans:loteGuias>')
        xml_fragments.append('</ans:mensagemTISS>')

        GuiaTiss.objects.bulk_create(guias_a_criar)
        novo_lote.valor_total_lote = valor_total_lote
        novo_lote.save()

        return novo_lote, "\n".join(xml_fragments)

    @staticmethod
    def processar_arquivo_tuss(arquivo_csv):
        try:
            decoded_file = arquivo_csv.read().decode('utf-8-sig')
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
            return count
        except Exception as e:
            raise ValueError(f"Erro ao processar CSV TUSS: {str(e)}")

    # =========================================================================
    # 3. INTELIGÊNCIA E RELATÓRIOS (DASHBOARD)
    # =========================================================================

    @staticmethod
    def obter_dados_dashboard():
        hoje = timezone.localdate()
        pagamentos_qs = Pagamento.objects.all()
        
        total_recebido_mes = pagamentos_qs.filter(status='Pago', data_pagamento__month=hoje.month, data_pagamento__year=hoje.year).aggregate(Sum('valor'))['valor__sum'] or 0
        total_pendente = pagamentos_qs.filter(status='Pendente').aggregate(Sum('valor'))['valor__sum'] or 0
        atrasados_count = pagamentos_qs.filter(status='Pendente', data_vencimento__lt=hoje).count()

        despesas_por_tipo = Despesa.objects.filter(data_despesa__month=hoje.month, data_despesa__year=hoje.year).values('categoria__nome').annotate(total=Sum('valor')).order_by('-total')

        total_tickets = pagamentos_qs.filter(data_vencimento__month=hoje.month).count()
        pagos_tickets = pagamentos_qs.filter(data_vencimento__month=hoje.month, status='Pago').count()
        taxa_conversao = round((pagos_tickets / total_tickets * 100), 0) if total_tickets > 0 else 0

        receitas_recentes = pagamentos_qs.select_related('paciente').order_by('-id')[:5]
        extrato = []
        for r in receitas_recentes:
            nome = r.paciente.nome_completo if r.paciente else (r.descricao or "Avulso")
            extrato.append({'id': r.id, 'paciente_nome': nome, 'valor': float(r.valor), 'status': r.status})

        return {
            "kpis": {"recebido_mes": float(total_recebido_mes), "total_pendente": float(total_pendente), "atrasados_count": atrasados_count, "taxa_conversao": taxa_conversao},
            "distribuicao_despesas": list(despesas_por_tipo),
            "ultimos_lancamentos": extrato
        }

    @staticmethod
    def calcular_projecao_fluxo_caixa(dias=30):
        """
        Projeta o saldo em caixa somando o realizado (Pagamento 'Pago' - Despesa paga)
        às contas já lançadas para os próximos `dias` (Pagamento 'Pendente' e Despesa em aberto).

        Como todo Agendamento já gera um Pagamento automaticamente (mesmo que de valor 0),
        não existe mais o cenário de "agendamento futuro sem pagamento" — por isso a
        projeção usa só o Pagamento 'Pendente' como fonte de receita futura.
        """
        hoje = timezone.localdate()
        data_final = hoje + timedelta(days=dias)

        total_entradas = Pagamento.objects.filter(status='Pago').aggregate(Sum('valor'))['valor__sum'] or 0
        total_saidas = Despesa.objects.filter(pago=True).aggregate(Sum('valor'))['valor__sum'] or 0
        saldo_acumulado = float(total_entradas) - float(total_saidas)

        # NOTA: data_vencimento já é um DateField (sem hora) tanto em Pagamento quanto em
        # Despesa, então agrupamos direto por ele — sem TruncDate(), que é redundante aqui.
        mapa_receitas = {}
        receitas = Pagamento.objects.filter(status='Pendente', data_vencimento__range=[hoje, data_final]).values('data_vencimento').annotate(total=Sum('valor'))
        for r in receitas: mapa_receitas[r['data_vencimento']] = mapa_receitas.get(r['data_vencimento'], 0) + (float(r['total'] or 0))

        mapa_despesas = {}
        despesas = Despesa.objects.filter(pago=False, data_vencimento__range=[hoje, data_final]).values('data_vencimento').annotate(total=Sum('valor'))
        for d in despesas: mapa_despesas[d['data_vencimento']] = float(d['total'] or 0)

        resultado = {'labels': [], 'saldo_projetado': [], 'receitas_previstas': [], 'despesas_previstas': []}
        saldo_atual_loop = saldo_acumulado
        for i in range(dias + 1):
            data_corrente = hoje + timedelta(days=i)
            entrada = float(mapa_receitas.get(data_corrente, 0))
            saida = float(mapa_despesas.get(data_corrente, 0))
            saldo_atual_loop = saldo_atual_loop + entrada - saida

            resultado['labels'].append(data_corrente.strftime('%d/%m'))
            resultado['saldo_projetado'].append(round(saldo_atual_loop, 2))
            resultado['receitas_previstas'].append(round(entrada, 2))
            resultado['despesas_previstas'].append(round(saida, 2))
        return resultado

    @staticmethod
    def gerar_relatorio_completo(data_inicio=None, data_fim=None):
        """
        Gera os dados para a tela de Relatórios Detalhados.
        Aceita `data_inicio`/`data_fim` (strings 'YYYY-MM-DD') para restringir o
        período; sem eles, o relatório é acumulado (todo o histórico).
        """
        pagamentos_confirmados = Pagamento.objects.filter(status='Pago')
        despesas_qs = Despesa.objects.all()

        if data_inicio and data_fim:
            pagamentos_confirmados = pagamentos_confirmados.filter(data_pagamento__range=[data_inicio, data_fim])
            despesas_qs = despesas_qs.filter(data_despesa__range=[data_inicio, data_fim])

        faturamento_por_forma_qs = pagamentos_confirmados.values('forma_pagamento').annotate(total=Sum('valor')).order_by('-total')
        faturamento_por_forma = [
            {'forma_pagamento': item['forma_pagamento'] or 'Não informado', 'total': float(item['total'] or 0)}
            for item in faturamento_por_forma_qs
        ]

        despesas_por_categoria_qs = despesas_qs.values('categoria__nome').annotate(total=Sum('valor')).order_by('-total')
        despesas_por_categoria = [
            {'categoria_nome': item['categoria__nome'] or 'Sem categoria', 'total': float(item['total'] or 0)}
            for item in despesas_por_categoria_qs
        ]

        faturamento_mensal = pagamentos_confirmados.annotate(mes=TruncMonth('data_pagamento')).values('mes').annotate(total=Sum('valor')).order_by('mes')
        despesas_mensais = despesas_qs.annotate(mes=TruncMonth('data_despesa')).values('mes').annotate(total=Sum('valor')).order_by('mes')

        fluxo_caixa = {}
        for item in faturamento_mensal:
            if item['mes']:
                mes_str = item['mes'].strftime('%Y-%m')
                fluxo_caixa.setdefault(mes_str, {'receitas': 0.0, 'despesas': 0.0})
                fluxo_caixa[mes_str]['receitas'] = float(item['total'] or 0)

        for item in despesas_mensais:
            if item['mes']:
                mes_str = item['mes'].strftime('%Y-%m')
                fluxo_caixa.setdefault(mes_str, {'receitas': 0.0, 'despesas': 0.0})
                fluxo_caixa[mes_str]['despesas'] = float(item['total'] or 0)

        fluxo_caixa_formatado = [{'mes': mes, **valores} for mes, valores in sorted(fluxo_caixa.items())]

        return {
            'faturamento_por_forma': faturamento_por_forma,
            'despesas_por_categoria': despesas_por_categoria,
            'fluxo_caixa_mensal': fluxo_caixa_formatado,
        }