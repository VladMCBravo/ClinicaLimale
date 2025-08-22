# faturamento/serializers.py

from rest_framework import serializers
from .models import Pagamento, CategoriaDespesa, Despesa, Convenio, PlanoConvenio

# --- Serializers de Pagamento (Versão Limpa) ---

class PagamentoSerializer(serializers.ModelSerializer):
    """
    Serializer para LEITURA e listagem de pagamentos.
    Mostra informações detalhadas e legíveis.
    """
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
    """
    Serializer otimizado para a CRIAÇÃO de pagamentos.
    Recebe apenas os campos necessários do frontend.
    """
    class Meta:
        model = Pagamento
        fields = ['valor', 'forma_pagamento']

# --- Serializers de Despesas (Mantidos como estavam, pois estão ótimos) ---

class CategoriaDespesaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaDespesa
        fields = '__all__'


class DespesaSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    registrado_por_nome = serializers.CharField(source='registrado_por.get_full_name', read_only=True, allow_null=True)

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
        read_only_fields = ['registrado_por']

# --- Serializers de Convênios e Planos (COM A NOVA LÓGICA) ---

class PlanoConvenioSerializer(serializers.ModelSerializer):
    """
    Serializer para o modelo PlanoConvenio.
    Usado tanto para leitura quanto para escrita aninhada dentro de ConvenioSerializer.
    """
    class Meta:
        model = PlanoConvenio
        # O campo 'convenio' não é necessário aqui, pois ele será
        # inferido pelo contexto quando criarmos através do ConvenioSerializer.
        fields = ['id', 'nome', 'descricao', 'ativo']


class ConvenioSerializer(serializers.ModelSerializer):
    """
    Serializer principal para Convênio, agora com capacidade
    de criar e atualizar seus planos aninhados.
    """
    # 1. Removido 'read_only=True' para permitir a escrita.
    #    'required=False' evita erros se a lista de planos vier vazia.
    planos = PlanoConvenioSerializer(many=True, required=False)

    class Meta:
        model = Convenio
        fields = ['id', 'nome', 'ativo', 'planos']

    def create(self, validated_data):
        """
        Sobrescreve o método de criação padrão para lidar com os planos.
        """
        # 2. Separa os dados dos planos dos dados do convênio.
        planos_data = validated_data.pop('planos', [])
        
        # 3. Cria o objeto principal (Convênio).
        convenio = Convenio.objects.create(**validated_data)
        
        # 4. Itera sobre os dados dos planos e cria cada um, associando-os ao convênio recém-criado.
        for plano_data in planos_data:
            PlanoConvenio.objects.create(convenio=convenio, **plano_data)
            
        return convenio

    def update(self, instance, validated_data):
        """
        Sobrescreve o método de atualização para lidar com os planos.
        """
        # 1. Separa os dados dos planos.
        planos_data = validated_data.pop('planos', None)

        # 2. Atualiza os campos do objeto principal (Convênio).
        instance.nome = validated_data.get('nome', instance.nome)
        instance.ativo = validated_data.get('ativo', instance.ativo)
        instance.save()

        # 3. Lógica para atualizar os planos.
        #    (Uma abordagem simples é deletar os antigos e criar os novos).
        if planos_data is not None:
            instance.planos.all().delete() # Deleta os planos existentes associados a este convênio.
            for plano_data in planos_data:
                PlanoConvenio.objects.create(convenio=instance, **plano_data)

        return instance