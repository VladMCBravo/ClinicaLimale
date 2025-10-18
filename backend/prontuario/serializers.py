# backend/prontuario/serializers.py - VERSÃO CORRIGIDA

from rest_framework import serializers
from .models import Evolucao, Prescricao, ItemPrescricao, Anamnese, Atestado, AnamneseGinecologica, AnamneseOrtopedia, AnamneseCardiologia, AnamnesePediatria, AnamneseNeonatologia
from .models import DocumentoPaciente, OpcaoClinica

# --- SERIALIZERS DE ESPECIALIDADES ---

class AnamneseGinecologicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnamneseGinecologica
        exclude = ['anamnese', 'id'] # Exclui a chave estrangeira e o ID automático

class AnamneseOrtopediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnamneseOrtopedia
        exclude = ['anamnese', 'id']

class AnamneseCardiologiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnamneseCardiologia
        exclude = ['anamnese', 'id']

class AnamnesePediatriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnamnesePediatria
        exclude = ['anamnese', 'id']

class AnamneseNeonatologiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnamneseNeonatologia
        exclude = ['anamnese', 'id']


# Serializer para o modelo Evolucao
class EvolucaoSerializer(serializers.ModelSerializer):
    # <<-- MUDANÇA 1: Seja mais explícito sobre o nome do médico -->>
    # Em vez de depender do __str__, vamos pegar o nome diretamente.
    # Isso cria um campo 'medico_nome' na sua API.
    medico_nome = serializers.CharField(source='medico.get_full_name', read_only=True)

    class Meta:
        model = Evolucao
        # <<-- MUDANÇA 2: Garanta que TODOS os campos necessários estejam na lista -->>
        # Incluímos o novo 'medico_nome' e mantivemos os outros.
        fields = [
            'id',
            'medico_nome', # Usaremos este no frontend
            'data_atendimento',
            'notas_subjetivas',
            'notas_objetivas',
            'avaliacao',
            'plano',
            'pressao_arterial',
            'frequencia_cardiaca',
            'peso',
            'altura',
            'exames_complementares'
        ]
        # Adicione 'medico' aqui apenas para leitura, se precisar do ID dele
        read_only_fields = ['id', 'medico_nome']

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
    ortopedica = AnamneseOrtopediaSerializer(required=False, allow_null=True)
    cardiologica = AnamneseCardiologiaSerializer(required=False, allow_null=True)
    pediatrica = AnamnesePediatriaSerializer(required=False, allow_null=True)
    neonatologia = AnamneseNeonatologiaSerializer(required=False, allow_null=True)
    
    class Meta:
        model = Anamnese
        fields = [
            'id', 'paciente', 'medico', 'queixa_principal',
            'historia_doenca_atual', 'historico_medico_pregresso',
            'historico_familiar', 'alergias', 'medicamentos_em_uso',
            # Adicionando os nomes das relações definidas nos modelos
            'ginecologica', 'ortopedica', 'cardiologica', 'pediatrica', 'neonatologia'
            # (Adicione 'reumatologia', etc. aqui)
        ]
        extra_kwargs = { field: {'required': False, 'allow_blank': True, 'allow_null': True}
                         for field in ['queixa_principal', 'historia_doenca_atual',
                                       'historico_medico_pregresso', 'historico_familiar',
                                       'alergias', 'medicamentos_em_uso'] }

    def create(self, validated_data):
        # Separando os dados das especialidades
        ginecologica_data = validated_data.pop('ginecologica', None)
        ortopedica_data = validated_data.pop('ortopedica', None)
        cardiologica_data = validated_data.pop('cardiologica', None)
        pediatrica_data = validated_data.pop('pediatrica', None)
        neonatologia_data = validated_data.pop('neonatologia', None)
        # (Adicione .pop() para Reumatologia, etc.)

        # Cria a Anamnese principal
        anamnese = Anamnese.objects.create(**validated_data)

        # Cria os registros das especialidades, se os dados foram enviados
        if ginecologica_data: AnamneseGinecologica.objects.create(anamnese=anamnese, **ginecologica_data)
        if ortopedica_data: AnamneseOrtopedia.objects.create(anamnese=anamnese, **ortopedica_data)
        if cardiologica_data: AnamneseCardiologia.objects.create(anamnese=anamnese, **cardiologica_data)
        if pediatrica_data: AnamnesePediatria.objects.create(anamnese=anamnese, **pediatrica_data)
        if neonatologia_data: AnamneseNeonatologia.objects.create(anamnese=anamnese, **neonatologia_data)
        # (Adicione create para Reumatologia, etc.)

        return anamnese

    def update(self, instance, validated_data):
        # Separando os dados das especialidades
        ginecologica_data = validated_data.pop('ginecologica', None)
        ortopedica_data = validated_data.pop('ortopedica', None)
        cardiologica_data = validated_data.pop('cardiologica', None)
        pediatrica_data = validated_data.pop('pediatrica', None)
        neonatologia_data = validated_data.pop('neonatologia', None)
        # (Adicione .pop() para Reumatologia, etc.)

        # Atualiza a Anamnese principal
        instance = super().update(instance, validated_data)

        # Atualiza ou cria os registros das especialidades
        specialty_data_map = {
            'ginecologica': (AnamneseGinecologica, ginecologica_data),
            'ortopedica': (AnamneseOrtopedia, ortopedica_data),
            'cardiologica': (AnamneseCardiologia, cardiologica_data),
            'pediatrica': (AnamnesePediatria, pediatrica_data),
            'neonatologia': (AnamneseNeonatologia, neonatologia_data),
            # (Adicione Reumatologia, etc.)
        }

        for field_name, (ModelClass, data) in specialty_data_map.items():
            if data is not None:
                obj, created = ModelClass.objects.get_or_create(anamnese=instance)
                for attr, value in data.items():
                    setattr(obj, attr, value)
                obj.save()
            elif hasattr(instance, field_name): # Se data é None, remove se existir
                getattr(instance, field_name).delete()

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