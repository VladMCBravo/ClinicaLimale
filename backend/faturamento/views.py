# backend/faturamento/views.py - VERSÃO CORRIGIDA

from rest_framework import generics, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from django.db.models.functions import TruncMonth

# --- 1. LIMPEZA E CORREÇÃO DAS IMPORTAÇÕES ---
from agendamentos.models import Agendamento # Importação correta do Agendamento
from usuarios.permissions import IsRecepcaoOrAdmin, IsAdminUser # Importamos IsAdminUser
from .models import Pagamento, CategoriaDespesa, Despesa, Convenio, PlanoConvenio
from .serializers import (
    PagamentoSerializer, # O serializer principal para leitura
    PagamentoUpdateSerializer, # <-- Vamos criar este serializer para atualização
    CategoriaDespesaSerializer, DespesaSerializer,
    ConvenioSerializer, PlanoConvenioSerializer
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
    permission_classes = [IsAdminUser] # Apenas admins podem gerenciar

class PlanoConvenioViewSet(viewsets.ModelViewSet):
    queryset = PlanoConvenio.objects.all()
    serializer_class = PlanoConvenioSerializer
    permission_classes = [IsAdminUser] # Apenas admins podem gerenciar