# backend/prontuario/serializers.py - VERSÃO CORRIGIDA

from rest_framework import serializers
from .models import Evolucao, Prescricao, ItemPrescricao, Anamnese, Atestado, AnamneseGinecologica, AnamneseOrtopedia, AnamneseCardiologia, AnamnesePediatria, AnamneseNeonatologia, AnamneseClinicaGeral
from .models import DocumentoPaciente, OpcaoClinica, MarcoDNPM, VacinaPaciente
from .models import TemplateRelatorio, RelatorioSalvo

# --- SERIALIZERS DE ESPECIALIDADES ---
class AnamneseClinicaGeralSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnamneseClinicaGeral
        exclude = ['anamnese', 'id'] # Inclui hmp, habitos_sociais, vacina_adulto_status

class AnamneseGinecologicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnamneseGinecologica
        # Apenas os campos que existem no modelo (histórico)
        exclude = ['anamnese', 'id'] # Inclui todos os campos do modelo exceto estes

class AnamneseOrtopediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnamneseOrtopedia
        exclude = ['anamnese', 'id']

class AnamneseCardiologiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnamneseCardiologia
        # --- CORREÇÃO AQUI ---
        # Removemos a lista 'fields = [...]'
        # Mantemos APENAS o 'exclude' para incluir todos os campos do modelo,
        # exceto a chave estrangeira 'anamnese' e o 'id' padrão.
        exclude = ['anamnese', 'id']

class AnamnesePediatriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnamnesePediatria
        # Incluímos os novos campos e removemos os antigos/movidos
        exclude = ['anamnese', 'id'] # Inclui todos os campos do modelo exceto estes

class AnamneseNeonatologiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnamneseNeonatologia
        # Apenas os campos que existem no modelo (histórico)
        exclude = ['anamnese', 'id'] # Inclui todos os campos do modelo exceto estes


# --- ★★★ AJUSTE NECESSÁRIO AQUI ★★★ ---
# Serializer para o modelo Evolucao
class EvolucaoSerializer(serializers.ModelSerializer):
    medico_nome = serializers.CharField(source='medico.get_full_name', read_only=True)
    especialidade_nome = serializers.CharField(source='especialidade.nome', read_only=True, default=None)
    
    class Meta:
        model = Evolucao
        fields = [
            'id',
            'medico_nome',
            'data_atendimento',
            'notas_subjetivas',
            'notas_objetivas',
            'avaliacao',
            'plano',
            'pressao_arterial',
            'frequencia_cardiaca',
            'peso',
            'altura',
            'exames_complementares',
            'agendamento',      # O ID do agendamento
            'especialidade',    # O ID da especialidade
            'especialidade_nome' # O NOME da especialidade (ex: "Cardiologia")
        ]
        read_only_fields = ['id', 'medico_nome', 'data_atendimento', 'especialidade_nome']

# -----------------------------------------------

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
    clinica_geral = AnamneseClinicaGeralSerializer(required=False, allow_null=True) # <-- ADICIONE ESTA LINHA
    
    class Meta:
        model = Anamnese
        fields = [
            'id', 'paciente', 'medico',
            # Campos principais da Anamnese que serão usados pelo Histórico de Clínica Geral:
            'queixa_principal', # Pode ser útil exibir a QP da primeira consulta
            'historia_doenca_atual', # HDA da primeira consulta
            'historico_medico_pregresso', # Campo geral (pode coexistir com o HMP específico)
            'historico_familiar', # Reutilizado
            'alergias', # Reutilizado
            'medicamentos_em_uso', # Reutilizado
            # Campos de especialidade:
            'ginecologica', 'ortopedica', 'cardiologica', 'pediatrica', 'neonatologia',
            'clinica_geral' # <-- ADICIONE ESTA LINHA
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
        clinica_geral_data = validated_data.pop('clinica_geral', None) # <-- ADD POP

        # Cria a Anamnese principal
        anamnese = Anamnese.objects.create(**validated_data)

        # Cria os registros das especialidades, se os dados foram enviados
        if ginecologica_data: AnamneseGinecologica.objects.create(anamnese=anamnese, **ginecologica_data)
        if ortopedica_data: AnamneseOrtopedia.objects.create(anamnese=anamnese, **ortopedica_data)
        if cardiologica_data: AnamneseCardiologia.objects.create(anamnese=anamnese, **cardiologica_data)
        if pediatrica_data: AnamnesePediatria.objects.create(anamnese=anamnese, **pediatrica_data)
        if neonatologia_data: AnamneseNeonatologia.objects.create(anamnese=anamnese, **neonatologia_data)
        if clinica_geral_data: AnamneseClinicaGeral.objects.create(anamnese=anamnese, **clinica_geral_data) # <-- ADD CREATE

        return anamnese

    def update(self, instance, validated_data):
        # Separando os dados das especialidades
        ginecologica_data = validated_data.pop('ginecologica', None)
        ortopedica_data = validated_data.pop('ortopedica', None)
        cardiologica_data = validated_data.pop('cardiologica', None)
        pediatrica_data = validated_data.pop('pediatrica', None)
        neonatologia_data = validated_data.pop('neonatologia', None)
        clinica_geral_data = validated_data.pop('clinica_geral', None) # <-- ADD POP

        # Atualiza a Anamnese principal
        instance = super().update(instance, validated_data)

        # Atualiza ou cria os registros das especialidades
        specialty_data_map = {
            'ginecologica': (AnamneseGinecologica, ginecologica_data),
            'ortopedica': (AnamneseOrtopedia, ortopedica_data),
            'cardiologica': (AnamneseCardiologia, cardiologica_data),
            'pediatrica': (AnamnesePediatria, pediatrica_data),
            'neonatologia': (AnamneseNeonatologia, neonatologia_data),
            'clinica_geral': (AnamneseClinicaGeral, clinica_geral_data), # <-- ADD TO MAP
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

# --- INÍCIO DAS NOVAS ADIÇÕES ---

class MarcoDNPMSerializer(serializers.ModelSerializer):
    medico_nome = serializers.CharField(source='medico.get_full_name', read_only=True)

    class Meta:
        model = MarcoDNPM
        fields = [
            'id', 'paciente', 'medico', 'medico_nome', 'marco_id', 
            'marco_descricao', 'idade_marco', 'alcançado', 
            'data_registro', 'observacao'
        ]
        read_only_fields = ['paciente', 'medico', 'medico_nome', 'data_registro']


class VacinaPacienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = VacinaPaciente
        fields = [
            'id', 'paciente', 
            'vacina_id', # ★★★ ADICIONE ESTA LINHA ★★★
            'nome_vacina', 'idade_recomendada', 
            'dose', 'data_aplicacao', 'status', 'observacao'
        ]
        read_only_fields = ['paciente']

# --- FIM DAS NOVAS ADIÇÕES ---

class TemplateRelatorioSerializer(serializers.ModelSerializer):
    """
    Serializa os templates disponíveis (para o dropdown do frontend).
    """
    class Meta:
        model = TemplateRelatorio
        fields = ['id', 'titulo', 'especialidade']


class RelatorioSalvoListSerializer(serializers.ModelSerializer):
    """
    Serializa a LISTA de relatórios já salvos do paciente (para o histórico).
    """
    medico_nome = serializers.CharField(source='medico.get_full_name', read_only=True)
    class Meta:
        model = RelatorioSalvo
        # Mostra campos simplificados
        fields = ['id', 'titulo', 'data_criacao', 'medico_nome']


class RelatorioSalvoCreateSerializer(serializers.ModelSerializer):
    """
    Usado para CRIAR (POST) um novo relatório salvo.
    """
    class Meta:
        model = RelatorioSalvo
        # O frontend enviará apenas estes campos
        fields = ['titulo', 'conteudo_final', 'consulta', 'template_origem']
        extra_kwargs = {
            'consulta': {'required': False, 'allow_null': True},
            'template_origem': {'required': False, 'allow_null': True},
        }