# backend/faturamento/serializers.py - VERSÃO ATUALIZADA

from rest_framework import serializers
from .models import (
    Pagamento, CategoriaDespesa, Despesa, Convenio, 
    PlanoConvenio, Procedimento, ValorProcedimentoConvenio # 1. Importe o novo modelo
)
from agendamentos.models import Agendamento

# --- TODOS OS SEUS SERIALIZERS EXISTENTES (Pagamento, Despesa, etc.) FICAM AQUI EM CIMA ---
# ... (seu código de PagamentoSerializer, DespesaSerializer, etc. não muda) ...
class PagamentoStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pagamento
        fields = ['id', 'status', 'valor']

class AgendamentoInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agendamento
        fields = ['id', 'data_hora_inicio', 'tipo_consulta']

class PagamentoSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.CharField(source='paciente.nome_completo', read_only=True)
    registrado_por = serializers.StringRelatedField(read_only=True)
    forma_pagamento_display = serializers.CharField(source='get_forma_pagamento_display', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    agendamento = AgendamentoInfoSerializer(read_only=True)
    class Meta:
        model = Pagamento
        fields = ['id', 'agendamento', 'paciente', 'paciente_nome', 'valor', 'status', 'status_display', 'forma_pagamento', 'forma_pagamento_display', 'data_pagamento', 'registrado_por']

class PagamentoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pagamento
        fields = ['valor', 'forma_pagamento']

class PagamentoUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pagamento
        fields = ['valor', 'forma_pagamento', 'status']

class CategoriaDespesaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaDespesa
        fields = '__all__'

class DespesaSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    registrado_por_nome = serializers.CharField(source='registrado_por.get_full_name', read_only=True, allow_null=True)
    class Meta:
        model = Despesa
        fields = ['id', 'categoria', 'categoria_nome', 'descricao', 'valor', 'data_despesa', 'registrado_por', 'registrado_por_nome', 'data_registro']
        read_only_fields = ['registrado_por']

# --- Serializers de Convênios e Planos (Mantidos) ---
class PlanoConvenioSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanoConvenio
        fields = ['id', 'nome', 'descricao', 'ativo']

class ConvenioSerializer(serializers.ModelSerializer):
    planos = PlanoConvenioSerializer(many=True, required=False)
    class Meta:
        model = Convenio
        fields = ['id', 'nome', 'ativo', 'planos']

    def create(self, validated_data):
        planos_data = validated_data.pop('planos', [])
        convenio = Convenio.objects.create(**validated_data)
        for plano_data in planos_data:
            PlanoConvenio.objects.create(convenio=convenio, **plano_data)
        return convenio

    def update(self, instance, validated_data):
        planos_data = validated_data.pop('planos', None)
        instance.nome = validated_data.get('nome', instance.nome)
        instance.ativo = validated_data.get('ativo', instance.ativo)
        instance.save()
        if planos_data is not None:
            instance.planos.all().delete()
            for plano_data in planos_data:
                PlanoConvenio.objects.create(convenio=instance, **plano_data)
        return instance

# --- ATUALIZAÇÃO E NOVOS SERIALIZERS PARA PROCEDIMENTOS E PREÇOS ---

# 2. NOVO: Serializer para a nossa "tabela de preços"
class ValorProcedimentoConvenioSerializer(serializers.ModelSerializer):
    # Para mostrar o nome e ID do plano, e não apenas o ID
    plano_convenio = PlanoConvenioSerializer(read_only=True)
    # Campo para receber o ID do plano ao criar/atualizar um preço
    plano_convenio_id = serializers.PrimaryKeyRelatedField(
        queryset=PlanoConvenio.objects.all(), source='plano_convenio', write_only=True
    )

    class Meta:
        model = ValorProcedimentoConvenio
        fields = ['id', 'plano_convenio', 'plano_convenio_id', 'valor']

# 3. ATUALIZADO: O serializer principal de Procedimento
class ProcedimentoSerializer(serializers.ModelSerializer):
    # A mágica está aqui: mostramos todos os preços de convênios associados
    valores_convenio = ValorProcedimentoConvenioSerializer(many=True, read_only=True)

    class Meta:
        model = Procedimento
        fields = [
            'id', 
            'codigo_tuss', 
            'descricao', 
            'valor_particular', # 4. Corrigido de 'valor' para 'valor_particular'
            'ativo', 
            'valores_convenio' # 5. Campo aninhado com a lista de preços
        ]