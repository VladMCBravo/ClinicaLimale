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
    paciente_id = serializers.IntegerField(write_only=True)

    # <<-- CORREÇÃO APLICADA AQUI -->>
    class Meta:
        model = Evolucao
        # A lista 'fields' agora inclui corretamente todos os novos campos do modelo.
        fields = [
            'id', 'paciente', 'medico', 'data_atendimento',
            'notas_subjetivas', 'notas_objetivas', 'avaliacao', 'plano',
            'paciente_id',
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
    # 2. Adicione o serializer aninhado aqui
    ginecologica = AnamneseGinecologicaSerializer(required=False)

    class Meta:
        model = Anamnese
        # 3. Adicione 'ginecologica' à lista de campos
        fields = ['id', 'paciente', 'queixa_principal', 'historia_doenca_atual', 'historico_medico_pregresso', 'ginecologica']

    # 4. Adicione a lógica para criar/atualizar os dados aninhados
    def create(self, validated_data):
        ginecologica_data = validated_data.pop('ginecologica', None)
        anamnese = Anamnese.objects.create(**validated_data)
        if ginecologica_data:
            AnamneseGinecologica.objects.create(anamnese=anamnese, **ginecologica_data)
        return anamnese

    def update(self, instance, validated_data):
        ginecologica_data = validated_data.pop('ginecologica', None)
        
        # Atualiza a instância principal (Anamnese)
        instance = super().update(instance, validated_data)

        if ginecologica_data is not None:
            # Tenta buscar os dados ginecológicos existentes, ou cria se não existirem
            ginecologica_instance, created = AnamneseGinecologica.objects.get_or_create(anamnese=instance)
            # Atualiza os campos do modelo aninhado
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