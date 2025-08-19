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
from .models import Pagamento, CategoriaDespesa, Despesa
from .serializers import (
    PagamentoSerializer, PagamentoCreateSerializer, 
    CategoriaDespesaSerializer, DespesaSerializer
)

# --- View de Pagamento (sem alterações, já estava boa) ---
class PagamentoCreateAPIView(generics.CreateAPIView):
    serializer_class = PagamentoCreateSerializer
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]

    def create(self, request, *args, **kwargs):
        agendamento_id = self.kwargs.get('agendamento_id')
        try:
            agendamento = Agendamento.objects.get(pk=agendamento_id)
        except Agendamento.DoesNotExist:
            return Response({"detail": "Agendamento não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if hasattr(agendamento, 'pagamento'):
            return Response({"detail": "Este agendamento já possui um pagamento registrado."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        serializer.save(
            agendamento=agendamento, 
            paciente=agendamento.paciente, 
            registrado_por=request.user
        )

        read_serializer = PagamentoSerializer(serializer.instance)
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


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
    # --- 3. PERMISSÃO REFINADA ---
    # Relatórios financeiros devem ser vistos apenas por administradores.
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        faturamento_por_forma = Pagamento.objects.values('forma_pagamento').annotate(total=Sum('valor')).order_by('-total')
        despesas_por_categoria = Despesa.objects.values('categoria__nome').annotate(total=Sum('valor')).order_by('-total')
        
        # Lógica de fluxo de caixa (já estava boa)
        faturamento_mensal = Pagamento.objects.annotate(mes=TruncMonth('data_pagamento')).values('mes').annotate(total=Sum('valor')).order_by('mes')
        despesas_mensais = Despesa.objects.annotate(mes=TruncMonth('data_despesa')).values('mes').annotate(total=Sum('valor')).order_by('mes')
        
        fluxo_caixa = {}
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