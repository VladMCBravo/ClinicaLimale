# backend/usuarios/serializers.py - VERSÃO COMPLETA E CORRIGIDA

from rest_framework import serializers
from rest_framework.validators import UniqueValidator
# 1. IMPORTAR A NOVA CLASSE MedicoEspecialidade
from .models import CustomUser, Especialidade, JornadaDeTrabalho, ValorEspecialidadeConvenio, RegistroPonto, ConfiguracaoClinica, MedicoEspecialidade

class ValorEspecialidadeConvenioSerializer(serializers.ModelSerializer):
    plano_convenio_id = serializers.IntegerField(source='plano_convenio.id', read_only=True)
    plano_nome = serializers.CharField(source='plano_convenio.nome', read_only=True)
    convenio_nome = serializers.CharField(source='plano_convenio.convenio.nome', read_only=True)

    class Meta:
        model = ValorEspecialidadeConvenio
        fields = ['id', 'plano_convenio_id', 'plano_nome', 'convenio_nome', 'valor']

class EspecialidadeSerializer(serializers.ModelSerializer):
    valores_convenio = ValorEspecialidadeConvenioSerializer(many=True, read_only=True)

    class Meta:
        model = Especialidade
        fields = ['id', 'nome', 'valor_consulta', 'valores_convenio']

# 2. CRIAR O NOVO SERIALIZER DA TABELA INTERMEDIÁRIA
class MedicoEspecialidadeSerializer(serializers.ModelSerializer):
    especialidade_nome = serializers.CharField(source='especialidade.nome', read_only=True)

    class Meta:
        model = MedicoEspecialidade
        fields = ['especialidade', 'especialidade_nome', 'rqe']

class UserSerializer(serializers.ModelSerializer):
    medico_especialidades = MedicoEspecialidadeSerializer(many=True, required=False)
    jornadas = serializers.SerializerMethodField()
    
    # 1. O TRUQUE MÁGICO: Recriamos o campo antigo apenas como leitura
    especialidades = serializers.SerializerMethodField()
    
    cpf = serializers.CharField(
        required=False, allow_blank=True, allow_null=True,
        validators=[UniqueValidator(queryset=CustomUser.objects.all(), message="Já existe um usuário com este CPF.")]
    )
    crm = serializers.CharField(
        required=False, allow_blank=True, allow_null=True,
        validators=[UniqueValidator(queryset=CustomUser.objects.all(), message="Já existe um usuário com este CRM.")]
    )

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'first_name', 'last_name', 
            'genero', 'data_nascimento', 'telefone', 'cpf', 'email',
            'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'cep', 
            'crm', 'cargo', 'is_active', 'password', 'jornadas', 'pin_ponto',
            'medico_especialidades', 'especialidades'
        ]
        extra_kwargs = {'password': {'write_only': True, 'required': False}}

    def validate_cpf(self, value):
        if value == "":
            return None
        return value
    
    def get_jornadas(self, obj):
        return obj.jornadas_de_trabalho.filter(ativo=True).values(
            'dia_da_semana', 'hora_inicio', 'hora_fim', 'semanas_do_mes'
        )
    
    def get_especialidades(self, obj):
        # Vai no banco de dados e traz uma lista limpa: [1, 2, 5]
        # Assim o frontend pode usar o .includes() sem quebrar nada!
        return list(obj.especialidades.values_list('id', flat=True))

    def validate_crm(self, value):
        if value == "":
            return None
        return value

    def create(self, validated_data):
        # 4. CAPTURAR OS DADOS DO NOVO CAMPO
        medico_especialidades_data = validated_data.pop('medico_especialidades', [])
        password = validated_data.pop('password', None)
        
        user = CustomUser.objects.create_user(**validated_data)
        
        if password:
            user.set_password(password)
            user.save()
            
        # 5. SALVAR CADA ESPECIALIDADE E RQE NO BANCO
        for esp_data in medico_especialidades_data:
            MedicoEspecialidade.objects.create(medico=user, **esp_data)
            
        return user

    def update(self, instance, validated_data):
        # 4. CAPTURAR OS DADOS DO NOVO CAMPO
        medico_especialidades_data = validated_data.pop('medico_especialidades', None)
        password = validated_data.pop('password', None)
        
        if password:
            instance.set_password(password)
        
        if 'cpf' in validated_data and validated_data['cpf'] == "":
            validated_data['cpf'] = None
        if 'crm' in validated_data and validated_data['crm'] == "":
            validated_data['crm'] = None
            
        user = super().update(instance, validated_data)

        # 5. ATUALIZAR ESPECIALIDADES E RQEs
        if medico_especialidades_data is not None:
            # Limpa as antigas para evitar duplicação ou manter removidas
            instance.medico_especialidades.all().delete()
            # Cria as novas com os RQEs atualizados
            for esp_data in medico_especialidades_data:
                MedicoEspecialidade.objects.create(medico=user, **esp_data)

        return user

class JornadaDeTrabalhoSerializer(serializers.ModelSerializer):
    medico_nome = serializers.CharField(source='medico.get_full_name', read_only=True)
    dia_da_semana_display = serializers.CharField(source='get_dia_da_semana_display', read_only=True)

    medico = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(cargo='medico')
    )
    
    class Meta:
        model = JornadaDeTrabalho
        fields = [
            'id', 'medico', 'medico_nome', 'dia_da_semana', 
            'dia_da_semana_display', 'hora_inicio', 'hora_fim', 
            'intervalo_consulta', 'ativo', 'semanas_do_mes'
        ]
        read_only_fields = ['medico_nome', 'dia_da_semana_display']

class UserMeUpdateSerializer(serializers.ModelSerializer):
    # Adicionamos como leitura apenas para garantir que o médico veja suas especialidades
    medico_especialidades = MedicoEspecialidadeSerializer(many=True, read_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'first_name', 'last_name', 'genero', 'data_nascimento', 
            'telefone', 'logradouro', 'numero', 'complemento', 
            'bairro', 'cidade', 'uf', 'cep', 'medico_especialidades'
        ]

class ValorEspecialidadeConvenioSerializer(serializers.ModelSerializer):
    plano_convenio_id = serializers.IntegerField(source='plano_convenio.id', read_only=True)
    plano_nome = serializers.CharField(source='plano_convenio.nome', read_only=True)
    convenio_nome = serializers.CharField(source='plano_convenio.convenio.nome', read_only=True)

    class Meta:
        model = ValorEspecialidadeConvenio
        fields = ['id', 'plano_convenio_id', 'plano_nome', 'convenio_nome', 'valor']
    
class RegistroPontoSerializer(serializers.ModelSerializer):
    nome_funcionario = serializers.CharField(source='usuario.get_full_name', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    
    class Meta:
        model = RegistroPonto
        fields = [
            'id', 'usuario', 'nome_funcionario', 'data_hora', 
            'tipo', 'tipo_display', 'latitude', 'longitude', 
            'distancia_metros', 'status', 'ip_address'
        ]
        read_only_fields = ['data_hora', 'distancia_metros', 'status', 'usuario']

class ConfiguracaoClinicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoClinica
        fields = '__all__'