# backend/usuarios/serializers.py - VERSÃO COMPLETA E CORRIGIDA

from rest_framework import serializers
from rest_framework.validators import UniqueValidator # <-- 1. IMPORTE O VALIDATOR
from .models import CustomUser, Especialidade, JornadaDeTrabalho, ValorEspecialidadeConvenio, RegistroPonto, ConfiguracaoClinica

# 1º A CLASSE DO VALOR VEM PRIMEIRO:
class ValorEspecialidadeConvenioSerializer(serializers.ModelSerializer):
    plano_convenio_id = serializers.IntegerField(source='plano_convenio.id', read_only=True)
    plano_nome = serializers.CharField(source='plano_convenio.nome', read_only=True)
    convenio_nome = serializers.CharField(source='plano_convenio.convenio.nome', read_only=True)

    class Meta:
        model = ValorEspecialidadeConvenio
        fields = ['id', 'plano_convenio_id', 'plano_nome', 'convenio_nome', 'valor']

# 2º A CLASSE DA ESPECIALIDADE VEM DEPOIS:
class EspecialidadeSerializer(serializers.ModelSerializer):
    valores_convenio = ValorEspecialidadeConvenioSerializer(many=True, read_only=True)

    class Meta:
        model = Especialidade
        fields = ['id', 'nome', 'valor_consulta', 'valores_convenio']

class UserSerializer(serializers.ModelSerializer):
    especialidades_detalhes = EspecialidadeSerializer(source='especialidades', many=True, read_only=True)
    especialidades = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Especialidade.objects.all(),
        required=False
    )

    # <--- 1. ADICIONE ESTE NOVO CAMPO --->
    jornadas = serializers.SerializerMethodField()
    
    cpf = serializers.CharField(
        required=False, allow_blank=True, allow_null=True,
        validators=[UniqueValidator(queryset=CustomUser.objects.all(), message="Já existe um usuário com este CPF.")]
    )
    crm = serializers.CharField(
        required=False, allow_blank=True, allow_null=True,
        validators=[UniqueValidator(queryset=CustomUser.objects.all(), message="Já existe um usuário com este CRM.")]
    )
    
    # O validador de 'username' já é automático


    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'first_name', 'last_name', 
            'genero', 'data_nascimento', 'telefone', 'cpf', 'email',
            'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'cep', 
            'crm', 'rqe', 
            'cargo', 'is_active', 'especialidades', 'especialidades_detalhes', 'password', 'jornadas',
            'pin_ponto'
        ]
        extra_kwargs = {'password': {'write_only': True, 'required': False}}

    # --- 3. ADICIONE ESTES MÉTODOS DE VALIDAÇÃO ---
    # Isso converte strings vazias "" em None (NULL), permitindo
    # que vários usuários tenham o campo em branco sem violar a regra "unique".

    def validate_cpf(self, value):
        if value == "":
            return None
        return value
    
    # <--- 3. ADICIONE ESTA FUNÇÃO DENTRO DA CLASSE (Logo após os validate_cpf) --->
    def get_jornadas(self, obj):
        # Retorna apenas os dados essenciais das jornadas ativas deste médico
        return obj.jornadas_de_trabalho.filter(ativo=True).values(
            'dia_da_semana', 'hora_inicio', 'hora_fim', 'semanas_do_mes'
        )

    def validate_crm(self, value):
        if value == "":
            return None
        return value
    
    # --- FIM DA CORREÇÃO ---

    def create(self, validated_data):
        especialidades_data = validated_data.pop('especialidades', [])
        password = validated_data.pop('password', None)
        user = CustomUser.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        if especialidades_data:
            user.especialidades.set(especialidades_data)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        if 'especialidades' in validated_data:
            especialidades_data = validated_data.pop('especialidades')
            instance.especialidades.set(especialidades_data)
        
        # --- 4. ATUALIZE A LÓGICA DE UPDATE ---
        # Isso garante que a conversão de "" para None funcione também na edição (PATCH)
        
        # Converte "" para None ANTES de passar para o super().update
        if 'cpf' in validated_data and validated_data['cpf'] == "":
            validated_data['cpf'] = None
        if 'crm' in validated_data and validated_data['crm'] == "":
            validated_data['crm'] = None
            
        return super().update(instance, validated_data)

# --- ADICIONE ESTE NOVO SERIALIZER ---
class JornadaDeTrabalhoSerializer(serializers.ModelSerializer):
    # Para leitura (quando listamos), mostra o nome do médico
    medico_nome = serializers.CharField(source='medico.get_full_name', read_only=True)
    # Para leitura (quando listamos), mostra o nome do dia
    dia_da_semana_display = serializers.CharField(source='get_dia_da_semana_display', read_only=True)

    # Para escrita (quando criamos/editamos), usa o ID
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
    """
    Serializer estrito para o próprio usuário atualizar seu perfil.
    Bloqueia intencionalmente campos sensíveis como cargo, cpf, crm, is_active.
    """
    class Meta:
        model = CustomUser
        fields = [
            'first_name', 'last_name', 'genero', 'data_nascimento', 
            'telefone', 'logradouro', 'numero', 'complemento', 
            'bairro', 'cidade', 'uf', 'cep'
        ]
        # NENHUM campo de permissão, cargo ou documento oficial é incluído aqui.

class ValorEspecialidadeConvenioSerializer(serializers.ModelSerializer):
    # Campos virtuais para não precisarmos importar o serializer de faturamento (evita erro de import circular)
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