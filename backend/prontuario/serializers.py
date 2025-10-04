from rest_framework import serializers
from .models import Evolucao, Prescricao, ItemPrescricao, Anamnese, Atestado
from .models import DocumentoPaciente, OpcaoClinica

# Serializer para o modelo Evolucao
class EvolucaoSerializer(serializers.ModelSerializer):
    medico = serializers.StringRelatedField(read_only=True)
    paciente = serializers.StringRelatedField(read_only=True)
    paciente_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Evolucao
        fields = [
            'id', 'paciente', 'medico', 'data_atendimento',
            'notas_subjetivas', 'notas_objetivas', 'avaliacao', 'plano',
            'paciente_id'
        ]

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
    medico = serializers.StringRelatedField(read_only=True)
    paciente = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Anamnese
        fields = [
            'id', 'paciente', 'medico', 'data_criacao', 'data_atualizacao',
            'queixa_principal', 'historia_doenca_atual', 'historico_medico_pregresso',
            'historico_familiar', 'alergias', 'medicamentos_em_uso'
        ]

# Serializer para os Atestados
class AtestadoSerializer(serializers.ModelSerializer):
    medico = serializers.StringRelatedField(read_only=True)
    paciente = serializers.StringRelatedField(read_only=True)
    tipo_atestado_display = serializers.CharField(source='get_tipo_atestado_display', read_only=True)

    class Meta:
        model = Atestado
        fields = ['id', 'paciente', 'medico', 'data_emissao', 'tipo_atestado', 'tipo_atestado_display', 'observacoes']

class DocumentoPacienteSerializer(serializers.ModelSerializer):
    # Campo para mostrar o nome do usuário que fez o upload
    enviado_por_nome = serializers.CharField(source='enviado_por.get_full_name', read_only=True)

    class Meta:
        model = DocumentoPaciente
        fields = [
            'id',
            'paciente',
            'titulo',
            'arquivo',
            'data_upload',
            'enviado_por',
            'enviado_por_nome'
        ]
        # Marcamos os campos que serão preenchidos automaticamente pela view
        read_only_fields = ['paciente', 'enviado_por']

class OpcaoClinicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpcaoClinica
        fields = ['id', 'descricao', 'especialidade', 'area_clinica']


