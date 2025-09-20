# backend/faturamento/views.py - VERSÃO CORRIGIDA
import csv
import io # Para ler o arquivo em memória
from rest_framework.parsers import MultiPartParser, FormParser # Para lidar com uploads de arquivos

from argparse import Action
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action  # <-- ADICIONE ESTA LINHA AQUI
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from django.http import HttpResponse

# --- 1. LIMPEZA E CORREÇÃO DAS IMPORTAÇÕES ---
from agendamentos.serializers import AgendamentoSerializer
from agendamentos.models import Agendamento
from usuarios.permissions import IsRecepcaoOrAdmin, IsAdminUser # Importamos IsAdminUser
# Linha nova e corrigida
from .models import Pagamento, CategoriaDespesa, Despesa, Convenio, PlanoConvenio, LoteFaturamento, GuiaTiss, Procedimento, ValorProcedimentoConvenio
from .serializers import (
    PagamentoSerializer,  # O serializer principal para leitura
    PagamentoUpdateSerializer,  # <-- Vamos criar este serializer para atualização
    CategoriaDespesaSerializer, DespesaSerializer,
    ConvenioSerializer, PlanoConvenioSerializer, ProcedimentoSerializer
)

# --- View de Pagamento (sem alterações, já estava boa) ---
class PagamentoViewSet(viewsets.ModelViewSet):
    """
    API endpoint que permite que os pagamentos sejam vistos ou editados.
    A criação de pagamentos agora é feita automaticamente via Agendamento.
    Este endpoint é usado principalmente para listar e ATUALIZAR (marcar como pago).
    """
    queryset = Pagamento.objects.all().select_related('paciente', 'agendamento').order_by('-agendamento__data_hora_inicio')
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]

    # Método inteligente para usar o serializer correto para cada ação
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            # Para atualizar, usamos um serializer mais simples
            return PagamentoUpdateSerializer
        # Para todas as outras ações (como listar), usamos o serializer completo
        return PagamentoSerializer

# --- ADICIONADO: Nova view para a tela do Financeiro ---
class PagamentosPendentesListAPIView(generics.ListAPIView):
    """
    Endpoint para listar todos os pagamentos com status 'Pendente'.
    Esta view substitui a lógica antiga de buscar agendamentos sem pagamento.
    """
    serializer_class = PagamentoSerializer # Reutilizamos o serializer principal que melhoramos
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # A nova lógica correta: buscar Pagamentos com status 'Pendente'
        return Pagamento.objects.filter(status='Pendente').order_by('agendamento__data_hora_inicio')


# --- ViewSets para Despesas (com lógica de produção) ---
class CategoriaDespesaViewSet(viewsets.ModelViewSet):
    queryset = CategoriaDespesa.objects.all().order_by('nome')
    serializer_class = CategoriaDespesaSerializer
    permission_classes = [IsAdminUser]


class DespesaViewSet(viewsets.ModelViewSet):
    queryset = Despesa.objects.all().order_by('-data_despesa')
    serializer_class = DespesaSerializer
    permission_classes = [IsAdminUser] 

    # --- 2. LÓGICA DE PRODUÇÃO REATIVADA ---
    def perform_create(self, serializer):
        # Agora que o login funciona, associamos o usuário que registrou a despesa.
        serializer.save(registrado_por=self.request.user)

# --- View para Relatórios (com permissão corrigida) ---
class RelatorioFinanceiroAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        # --- CORREÇÃO PRINCIPAL ESTÁ AQUI ---
        # Apenas pagamentos com status 'Pago' devem entrar nos relatórios financeiros
        pagamentos_confirmados = Pagamento.objects.filter(status='Pago')

        faturamento_por_forma = pagamentos_confirmados.values('forma_pagamento').annotate(total=Sum('valor')).order_by('-total')
        despesas_por_categoria = Despesa.objects.values('categoria__nome').annotate(total=Sum('valor')).order_by('-total')
        
        # A lógica do fluxo de caixa agora também usa apenas pagamentos confirmados
        faturamento_mensal = pagamentos_confirmados.annotate(mes=TruncMonth('data_pagamento')).values('mes').annotate(total=Sum('valor')).order_by('mes')
        despesas_mensais = Despesa.objects.annotate(mes=TruncMonth('data_despesa')).values('mes').annotate(total=Sum('valor')).order_by('mes')
        
        # O resto da lógica para formatar o fluxo_caixa permanece o mesmo
        fluxo_caixa = {}
        # ... (código de formatação inalterado) ...
        for item in faturamento_mensal:
            mes_str = item['mes'].strftime('%Y-%m')
            if mes_str not in fluxo_caixa:
                fluxo_caixa[mes_str] = {'receitas': 0, 'despesas': 0}
            fluxo_caixa[mes_str]['receitas'] = item['total'] or 0
        for item in despesas_mensais:
            mes_str = item['mes'].strftime('%Y-%m')
            if mes_str not in fluxo_caixa:
                fluxo_caixa[mes_str] = {'receitas': 0, 'despesas': 0}
            fluxo_caixa[mes_str]['despesas'] = item['total'] or 0
        fluxo_caixa_formatado = [{'mes': mes, **valores} for mes, valores in fluxo_caixa.items()]
        
        data = {
            'faturamento_por_forma': list(faturamento_por_forma),
            'despesas_por_categoria': list(despesas_por_categoria),
            'fluxo_caixa_mensal': fluxo_caixa_formatado,
        }
        
        return Response(data)

class ConvenioViewSet(viewsets.ModelViewSet):
    queryset = Convenio.objects.prefetch_related('planos').all()
    serializer_class = ConvenioSerializer
    permission_classes = [IsRecepcaoOrAdmin]

class PlanoConvenioViewSet(viewsets.ModelViewSet):
    queryset = PlanoConvenio.objects.all()
    serializer_class = PlanoConvenioSerializer
    permission_classes = [IsRecepcaoOrAdmin]

class AgendamentosFaturaveisAPIView(generics.ListAPIView):
    """
    Endpoint para listar agendamentos de um convênio específico
    dentro de um mês, que ainda não foram faturados (não têm uma guia TISS associada).
    """
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]

    def get_queryset(self):
        # Pegamos os parâmetros da URL (ex: ?convenio_id=1&mes=8&ano=2025)
        convenio_id = self.request.query_params.get('convenio_id')
        mes = self.request.query_params.get('mes')
        ano = self.request.query_params.get('ano')

        # Se os parâmetros essenciais не forem fornecidos, retorna uma lista vazia
        if not all([convenio_id, mes, ano]):
            return Agendamento.objects.none()

        # Filtra os agendamentos com base nos critérios
        queryset = Agendamento.objects.filter(
            plano_utilizado__convenio__id=convenio_id,
            data_hora_inicio__month=mes,
            data_hora_inicio__year=ano,
            tipo_atendimento='Convenio',
            guia_tiss__isnull=True  # O filtro mágico: apenas os que ainda não têm guia!
        ).select_related('paciente', 'plano_utilizado').order_by('data_hora_inicio')

        return queryset

class GerarLoteFaturamentoAPIView(APIView):
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]

    def post(self, request, *args, **kwargs):
        convenio_id = request.data.get('convenio_id')
        mes_referencia_str = request.data.get('mes_referencia') # 'YYYY-MM'
        agendamento_ids = request.data.get('agendamento_ids', [])

        if not all([convenio_id, mes_referencia_str, agendamento_ids]):
            return Response({'detail': 'Dados insuficientes.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # --- 1. Lógica do Banco de Dados (sem alterações) ---
            ano, mes = map(int, mes_referencia_str.split('-'))
            convenio = Convenio.objects.get(id=convenio_id)
            
            novo_lote = LoteFaturamento.objects.create(
                convenio=convenio,
                mes_referencia=timezone.datetime(ano, mes, 1).date(),
                gerado_por=request.user,
                status='Enviado'
            )
            # Agora fazemos o 'select_related' do procedimento para otimizar a consulta
            agendamentos_para_faturar = Agendamento.objects.filter(id__in=agendamento_ids).select_related('paciente', 'procedimento')

            valor_total_lote = 0
            guias_a_criar = []

            # --- 2. Lógica de Geração de Guias e XML ATUALIZADA ---
            xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
            xml_content += '<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">\n'
            # ... (cabeçalho do XML continua igual)

            xml_content += f'  <ans:loteGuias>\n'
            xml_content += f'    <ans:numeroLote>{novo_lote.id}</ans:numeroLote>\n'
            
            for ag in agendamentos_para_faturar:
                # Se não houver procedimento, definimos valores padrão para não quebrar
                valor_da_guia = ag.procedimento.valor if ag.procedimento else 0.00
                codigo_procedimento = ag.procedimento.codigo_tuss if ag.procedimento else "00000000"
                descricao_procedimento = ag.procedimento.descricao if ag.procedimento else "Procedimento não especificado"

                # Cria o objeto GuiaTiss para salvar no banco de dados
                guias_a_criar.append(GuiaTiss(lote=novo_lote, agendamento=ag, valor_guia=valor_da_guia))
                valor_total_lote += valor_da_guia
                
                # Constrói o XML com os dados dinâmicos do procedimento
                xml_content += f'    <ans:guiaSP-SADT>\n'
                xml_content += f'      <ans:cabecalhoGuia>\n'
                xml_content += f'        <ans:registroANS>123456</ans:registroANS>\n' # Exemplo - Viria do seu cadastro
                xml_content += f'        <ans:numeroGuiaPrestador>{ag.id}</ans:numeroGuiaPrestador>\n'
                xml_content += f'      </ans:cabecalhoGuia>\n'
                xml_content += f'      <ans:dadosBeneficiario>\n'
                xml_content += f'        <ans:numeroCarteira>{ag.paciente.numero_carteirinha}</ans:numeroCarteira>\n'
                xml_content += f'        <ans:nomeBeneficiario>{ag.paciente.nome_completo}</ans:nomeBeneficiario>\n'
                xml_content += f'      </ans:dadosBeneficiario>\n'
                xml_content += f'      <ans:procedimentosExecutados>\n'
                xml_content += f'        <ans:procedimento>\n'
                xml_content += f'          <ans:codigoTabela>22</ans:codigoTabela>\n' # Tabela TUSS
                xml_content += f'          <ans:codigoProcedimento>{codigo_procedimento}</ans:codigoProcedimento>\n'
                xml_content += f'          <ans:descricaoProcedimento>{descricao_procedimento}</ans:descricaoProcedimento>\n'
                xml_content += f'          <ans:quantidadeExecutada>1</ans:quantidadeExecutada>\n'
                xml_content += f'          <ans:valorProcessado>{valor_da_guia:.2f}</ans:valorProcessado>\n'
                xml_content += f'        </ans:procedimento>\n'
                xml_content += f'      </ans:procedimentosExecutados>\n'
                xml_content += f'      <ans:valorTotal>{valor_da_guia:.2f}</ans:valorTotal>\n'
                xml_content += f'    </ans:guiaSP-SADT>\n'
            
            xml_content += f'  </ans:loteGuias>\n'
            xml_content += '</ans:mensagemTISS>\n'
            
            # Salva tudo no banco de dados
            GuiaTiss.objects.bulk_create(guias_a_criar)
            novo_lote.valor_total_lote = valor_total_lote
            novo_lote.save()
            
            # --- 3. Devolve o ficheiro XML (sem alterações) ---
            response = HttpResponse(xml_content, content_type='application/xml')
            response['Content-Disposition'] = f'attachment; filename="lote_{novo_lote.id}_{convenio.nome}.xml"'
            return response

        except Exception as e:
            return Response({'detail': f'Ocorreu um erro: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- NOVO VIEWSET PARA PROCEDIMENTOS ---
class ProcedimentoViewSet(viewsets.ModelViewSet): # 1. Mudamos para ModelViewSet
    """
    Endpoint que permite que procedimentos sejam listados, criados e editados.
    Inclui uma ação para definir preços por convênio.
    """
    queryset = Procedimento.objects.prefetch_related('valores_convenio__plano_convenio').filter(ativo=True).order_by('descricao')
    serializer_class = ProcedimentoSerializer
    permission_classes = [IsAuthenticated] # Mantemos a permissão

    # 2. AÇÃO CUSTOMIZADA: para adicionar/editar um preço de convênio em um procedimento
    @action(detail=True, methods=['post', 'put'], url_path='definir-preco-convenio')
    def definir_preco_convenio(self, request, pk=None):
        procedimento = self.get_object()
        plano_id = request.data.get('plano_convenio_id')
        valor = request.data.get('valor')

        if not plano_id or valor is None:
            return Response(
                {'error': 'Os campos "plano_convenio_id" e "valor" são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            plano = PlanoConvenio.objects.get(id=plano_id)
        except PlanoConvenio.DoesNotExist:
            return Response({'error': 'Plano de convênio não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Cria ou atualiza o preço para a combinação procedimento + plano
        obj, created = ValorProcedimentoConvenio.objects.update_or_create(
            procedimento=procedimento,
            plano_convenio=plano,
            defaults={'valor': valor}
        )
        
        # Retorna o procedimento completo e atualizado
        serializer = self.get_serializer(procedimento)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

class TussUploadView(APIView):
    permission_classes = [IsAdminUser] # Apenas administradores podem fazer isso
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        arquivo_csv = request.FILES.get('arquivo_tuss')
        if not arquivo_csv:
            return Response({'error': 'Nenhum arquivo enviado.'}, status=status.HTTP_400_BAD_REQUEST)

        if not arquivo_csv.name.endswith('.csv'):
            return Response({'error': 'O arquivo deve ser no formato CSV.'}, status=status.HTTP_400_BAD_REQUEST)

        criados = 0
        atualizados = 0

        try:
            # Lê o arquivo em memória de forma segura
            decoded_file = arquivo_csv.read().decode('utf-8-sig') # 'utf-8-sig' remove BOM
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string, delimiter=';')

            for row in reader:
                codigo_tuss = row.get('CODIGO_TUSS') # Ajuste o nome da coluna se necessário
                descricao = row.get('DESCRICAO')   # Ajuste o nome da coluna se necessário

                if codigo_tuss and descricao:
                    _, created = Procedimento.objects.update_or_create(
                        codigo_tuss=codigo_tuss,
                        defaults={'descricao': descricao}
                    )
                    if created:
                        criados += 1
                    else:
                        atualizados += 1
        except Exception as e:
            return Response({'error': f'Erro ao processar o arquivo: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'status': 'Importação concluída com sucesso!',
            'criados': criados,
            'atualizados': atualizados
        }, status=status.HTTP_200_OK)

# --- NOVA VIEW PARA WEBHOOK DO INTER ---
class InterWebhookAPIView(APIView):
    permission_classes = [AllowAny] # Webhooks não exigem autenticação de usuário

    def post(self, request, *args, **kwargs):
        dados_webhook = request.data
        print(f"--- WEBHOOK DO INTER RECEBIDO --- \n {dados_webhook}")

        # A API do Inter envia um array de 'pix'
        if 'pix' in dados_webhook and isinstance(dados_webhook['pix'], list):
            for pix_info in dados_webhook['pix']:
                txid = pix_info.get('txid')
                valor_pago = pix_info.get('valor')

                if not txid:
                    continue

                try:
                    # Encontra o pagamento no seu banco de dados pelo txid
                    pagamento = Pagamento.objects.get(inter_txid=txid)

                    # Verifica se o pagamento já não foi processado
                    if pagamento.status == 'Pendente':
                        pagamento.status = 'Pago'
                        pagamento.forma_pagamento = 'PIX'
                        # Opcional: validar se o valor_pago corresponde ao pagamento.valor
                        pagamento.save()
                        print(f"Pagamento {pagamento.id} confirmado via webhook com sucesso!")
                    else:
                        print(f"Pagamento {pagamento.id} já estava com status '{pagamento.status}'. Webhook ignorado.")

                except Pagamento.DoesNotExist:
                    print(f"ERRO: Webhook recebido para txid '{txid}' não encontrado no sistema.")
        
        # Sempre retorne uma resposta 200 OK para o Inter saber que você recebeu.
        return Response(status=status.HTTP_200_OK)