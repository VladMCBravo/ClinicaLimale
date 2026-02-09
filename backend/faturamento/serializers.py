# backend/faturamento/serializers.py - VERSÃO ATUALIZADA

from rest_framework import serializers
from .models import (
    TransacaoFinanceira, Pagamento, CategoriaDespesa, Despesa, Convenio, 
    PlanoConvenio, Procedimento, ValorProcedimentoConvenio # 1. Importe o novo modelo
)
from agendamentos.models import Agendamento

# --- O NOVO SERIALIZER UNIFICADO ---
class TransacaoFinanceiraSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.SerializerMethodField()
    status_visual = serializers.SerializerMethodField()
    atrasado = serializers.SerializerMethodField()
    origem_display = serializers.SerializerMethodField()
    # CAMPOS EXTRAS PARA COMPATIBILIDADE COM TELAS ANTIGAS
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    categoria_tipo = serializers.CharField(source='categoria.tipo', read_only=True)
    pago = serializers.SerializerMethodField()

    class Meta:
        model = TransacaoFinanceira
        fields = '__all__'

    def get_paciente_nome(self, obj):
        return obj.paciente.nome_completo if obj.paciente else "Avulso/Fornecedor"

    def get_atrasado(self, obj):
        from datetime import date
        if obj.status == 'Pendente' and obj.data_vencimento and obj.data_vencimento < date.today():
            return True
        return False

    def get_status_visual(self, obj):
        if obj.status == 'Pago': return 'success'
        if obj.status == 'Renegociado' or obj.status == 'Liquidado': return 'info'
        if obj.status == 'Cancelado': return 'default'
        if self.get_atrasado(obj): return 'error'
        return 'warning' # Pendente

    def get_origem_display(self, obj):
        if obj.transacao_pai:
            return "Renegociação/Parcelamento"
        if obj.agendamento:
            return f"Agendamento {obj.agendamento.tipo_agendamento}"
        return "Lançamento Manual"
    
    def get_pago(self, obj):
        return obj.status == 'Pago'
    
# --- TODOS OS SEUS SERIALIZERS EXISTENTES (Pagamento, Despesa, etc.) FICAM AQUI EM CIMA ---
# ... (seu código de PagamentoSerializer, DespesaSerializer, etc. não muda) ...
class PagamentoStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pagamento
        fields = ['id', 'status', 'valor']

class AgendamentoInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agendamento
        fields = ['id', 'data_hora_inicio', 'tipo_agendamento']

# <<< NOVO SERIALIZER PARA A LISTA DE COBRANÇAS PENDENTES (ABA 1) >>>
class CobrancaPendenteSerializer(serializers.ModelSerializer):
    """Serializer leve para listar débitos pendentes de um paciente."""
    data_agendamento = serializers.DateTimeField(source='agendamento.data_hora_inicio', read_only=True)
    tipo_agendamento = serializers.CharField(source='agendamento.get_tipo_agendamento_display', read_only=True)

    class Meta:
        model = Pagamento
        fields = ['id', 'valor', 'data_agendamento', 'tipo_agendamento']

# <<< NOVO SERIALIZER PARA LANÇAMENTO DE RECEITA AVULSA (ABA 2) >>>
class LancamentoAvulsoReceitaSerializer(serializers.ModelSerializer):
    """Serializer para criar um pagamento avulso (receita)."""
    class Meta:
        model = Pagamento
        # ADICIONE 'data_vencimento' e 'status' NA LISTA ABAIXO
        fields = ['paciente', 'descricao', 'valor', 'forma_pagamento', 'data_vencimento', 'status']

class PagamentoSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.SerializerMethodField()
    descricao_visual = serializers.SerializerMethodField()
    registrado_por = serializers.StringRelatedField(read_only=True)
    forma_pagamento_display = serializers.CharField(source='get_forma_pagamento_display', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Resolvido: agora explicitamente incluído no Meta fields
    agendamento_id = serializers.PrimaryKeyRelatedField(source='agendamento', read_only=True)
    agendamento_detalhes = AgendamentoInfoSerializer(source='agendamento', read_only=True)

    class Meta:
        model = Pagamento
        fields = [
            'id', 'agendamento_id', 'agendamento_detalhes', 'paciente', 'paciente_nome', 'descricao',
            'descricao_visual', 'valor', 'status', 'status_display', 'forma_pagamento', 
            'forma_pagamento_display', 'data_pagamento', 'data_vencimento',
            'registrado_por', 'pix_copia_e_cola', 'pix_qr_code_base64', 'pix_expira_em', 'link_pagamento'
        ]
        read_only_fields = ['registrado_por']

    def get_paciente_nome(self, obj):
        return obj.paciente.nome_completo if obj.paciente else "Cliente Avulso"

    def get_descricao_visual(self, obj):
        # Prioridade 1: Agendamento Clínico
        if obj.agendamento:
            try:
                # Se for um procedimento específico
                if getattr(obj.agendamento, 'procedimento', None):
                    return obj.agendamento.procedimento.descricao
                # Se for uma consulta padrão
                if obj.agendamento.tipo_agendamento == 'Consulta':
                    return "Consulta Médica"
                return f"Atendimento ({obj.agendamento.get_tipo_agendamento_display()})"
            except Exception:
                return "Atendimento Clínico"

        # Prioridade 2: Descrição manual do lançamento avulso
        if obj.descricao:
            return obj.descricao

        # Fallback
        return "Receita Diversa"

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
        fields = '__all__' # Ele já vai pegar o novo campo 'tipo' automaticamente

class DespesaSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    # ADICIONE ESTE CAMPO PARA O FRONTEND LER
    categoria_tipo = serializers.CharField(source='categoria.tipo', read_only=True)
    registrado_por_nome = serializers.CharField(source='registrado_por.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = Despesa
        fields = [
            'id', 'categoria', 'categoria_nome', 
            'categoria_tipo', # <--- NÃO ESQUEÇA DE ADICIONAR AQUI NA LISTA
            'descricao', 
            'valor', 'data_despesa', 'data_vencimento', 'pago', 'data_pagamento',
            'registrado_por', 'registrado_por_nome', 'data_registro'
        ]

# --- Serializers de Convênios e Planos (Mantidos) ---
class PlanoConvenioSerializer(serializers.ModelSerializer):
    # ADICIONE ESTE CAMPO:
    convenio_nome = serializers.CharField(source='convenio.nome', read_only=True)

    class Meta:
        model = PlanoConvenio
        # ADICIONE 'convenio_nome' NA LISTA:
        fields = ['id', 'nome', 'descricao', 'ativo', 'convenio_nome']
        
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
            'categoria',        # <--- ADICIONE ESTA LINHA AQUI
            'descricao', 
            'valor_particular', 
            'ativo', 
            'valores_convenio'
        ]