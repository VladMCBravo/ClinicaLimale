# faturamento/serializers.py

from rest_framework import serializers
from .models import Pagamento, CategoriaDespesa, Despesa

# SERIALIZER PARA LEITURA (O seu, que já era ótimo!)
# Usado para mostrar os detalhes de um pagamento.
class PagamentoSerializer(serializers.ModelSerializer):
    paciente = serializers.StringRelatedField(read_only=True)
    registrado_por = serializers.StringRelatedField(read_only=True)
    forma_pagamento_display = serializers.CharField(source='get_forma_pagamento_display', read_only=True)

    class Meta:
        model = Pagamento
        fields = [
            'id', 
            'agendamento', 
            'paciente', 
            'valor', 
            'forma_pagamento',
            'forma_pagamento_display',
            'data_pagamento', 
            'registrado_por'
        ]

# -----------------------------------------------------------------------------

# NOVO SERIALIZER PARA CRIAÇÃO (POST)
# Usado apenas para validar os dados enviados pelo frontend ao criar um pagamento.
class PagamentoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pagamento
        # Apenas os campos que o frontend irá enviar no formulário.
        # Os outros (agendamento, paciente, registrado_por) são adicionados na view.
        fields = ['valor', 'forma_pagamento']

class PagamentoSerializer(serializers.ModelSerializer):
    paciente = serializers.StringRelatedField(read_only=True)
    registrado_por = serializers.StringRelatedField(read_only=True)
    forma_pagamento_display = serializers.CharField(source='get_forma_pagamento_display', read_only=True)

    class Meta:
        model = Pagamento
        fields = [
            'id', 
            'agendamento', 
            'paciente', 
            'valor', 
            'forma_pagamento',
            'forma_pagamento_display',
            'data_pagamento', 
            'registrado_por'
        ]

class PagamentoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pagamento
        fields = ['valor', 'forma_pagamento']

# --- Novos Serializers para Despesas ---

class CategoriaDespesaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaDespesa
        fields = '__all__' # Inclui todos os campos do modelo


class DespesaSerializer(serializers.ModelSerializer):
    # Campos extras para mostrar os nomes, e não apenas os IDs
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    registrado_por_nome = serializers.CharField(source='registrado_por.get_full_name', read_only=True)

    class Meta:
        model = Despesa
        fields = [
            'id',
            'categoria',
            'categoria_nome',
            'descricao',
            'valor',
            'data_despesa',
            'registrado_por',
            'registrado_por_nome',
            'data_registro'
        ]
        # O campo 'registrado_por' será preenchido automaticamente pela view, então é apenas de leitura.
        read_only_fields = ['registrado_por']