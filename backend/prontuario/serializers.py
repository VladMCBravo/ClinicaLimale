# backend/prontuario/serializers.py - VERSÃO CORRIGIDA

from rest_framework import serializers
from .models import Evolucao, Prescricao, ItemPrescricao, Anamnese, Atestado, AnamneseGinecologica
from .models import DocumentoPaciente, OpcaoClinica

class AnamneseGinecologicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnamneseGinecologica
        # Lista de todos os campos que criamos, exceto 'anamnese' que será tratado automaticamente
        fields = ['dum', 'menarca_idade', 'gesta', 'para', 'abortos', 'antecedentes_ginecologicos', 'antecedentes_obstetricos']

# Serializer para o modelo Evolucao
class EvolucaoSerializer(serializers.ModelSerializer):
    medico = serializers.StringRelatedField(read_only=True)
    paciente = serializers.StringRelatedField(read_only=True)
    
    # <<-- CORREÇÃO APLICADA AQUI -->>
    class Meta:
        model = Evolucao
        # A lista 'fields' não precisa mais do 'paciente_id'.
        # A view se encarregará de associar o paciente pela URL.
        fields = [
            'id', 'paciente', 'medico', 'data_atendimento',
            'notas_subjetivas', 'notas_objetivas', 'avaliacao', 'plano',
            'pressao_arterial',
            'frequencia_cardiaca',
            'peso',
            'altura',
            'exames_complementares'
        ]

# --- Os serializers abaixo já estavam corretos e foram mantidos ---

# Serializer para os Itens da Prescrição
class ItemPrescricaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemPrescricao
        fields = ['medicamento', 'dosagem', 'instrucoes']

# Serializer para a Prescrição (que contém os Itens)
class PrescricaoSerializer(serializers.ModelSerializer):
    itens = ItemPrescricaoSerializer(many=True)
    medico = serializers.StringRelatedField(read_only=True)
    paciente = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Prescricao
        fields = ['id', 'paciente', 'medico', 'data_prescricao', 'itens']

    def create(self, validated_data):
        itens_data = validated_data.pop('itens')
        prescricao = Prescricao.objects.create(**validated_data)
        for item_data in itens_data:
            ItemPrescricao.objects.create(prescricao=prescricao, **item_data)
        return prescricao

# Serializer para a Anamnese
class AnamneseSerializer(serializers.ModelSerializer):
    ginecologica = AnamneseGinecologicaSerializer(required=False, allow_null=True)
    medico = serializers.StringRelatedField(read_only=True) # Adicionado para visualização
    paciente = serializers.StringRelatedField(read_only=True) # Adicionado para visualização

    class Meta:
        model = Anamnese
        fields = [
            'id', 'paciente', 'medico', 'queixa_principal', 
            'historia_doenca_atual', 'historico_medico_pregresso', 
            'historico_familiar', 'alergias', 'medicamentos_em_uso',
            'ginecologica'
        ]
        # <<-- CORREÇÃO APLICADA AQUI -->>
        # Adiciona kwargs para tornar os campos de texto opcionais na API,
        # assim como eles são no modelo (blank=True)
        extra_kwargs = {
            'queixa_principal': {'required': False, 'allow_blank': True},
            'historia_doenca_atual': {'required': False, 'allow_blank': True},
            'historico_medico_pregresso': {'required': False, 'allow_blank': True},
            'historico_familiar': {'required': False, 'allow_blank': True},
            'alergias': {'required': False, 'allow_blank': True},
            'medicamentos_em_uso': {'required': False, 'allow_blank': True},
        }

    # A lógica de create e update continua a mesma
    def create(self, validated_data):
        ginecologica_data = validated_data.pop('ginecologica', None)
        anamnese = Anamnese.objects.create(**validated_data)
        if ginecologica_data:
            AnamneseGinecologica.objects.create(anamnese=anamnese, **ginecologica_data)
        return anamnese

    def update(self, instance, validated_data):
        ginecologica_data = validated_data.pop('ginecologica', None)
        
        instance = super().update(instance, validated_data)

        if ginecologica_data is not None:
            ginecologica_instance, created = AnamneseGinecologica.objects.get_or_create(anamnese=instance)
            for attr, value in ginecologica_data.items():
                setattr(ginecologica_instance, attr, value)
            ginecologica_instance.save()
            
        return instance

# Serializer para os Atestados
class AtestadoSerializer(serializers.ModelSerializer):
    medico = serializers.StringRelatedField(read_only=True)
    paciente = serializers.StringRelatedField(read_only=True)
    tipo_atestado_display = serializers.CharField(source='get_tipo_atestado_display', read_only=True)

    class Meta:
        model = Atestado
        fields = ['id', 'paciente', 'medico', 'data_emissao', 'tipo_atestado', 'tipo_atestado_display', 'observacoes']

class DocumentoPacienteSerializer(serializers.ModelSerializer):
    enviado_por_nome = serializers.CharField(source='enviado_por.get_full_name', read_only=True)

    class Meta:
        model = DocumentoPaciente
        fields = [
            'id', 'paciente', 'titulo', 'arquivo', 'data_upload',
            'enviado_por', 'enviado_por_nome'
        ]
        read_only_fields = ['paciente', 'enviado_por']

class OpcaoClinicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpcaoClinica
        fields = ['id', 'descricao', 'especialidade', 'area_clinica']