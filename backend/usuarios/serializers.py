# backend/usuarios/serializers.py - VERSÃO COMPLETA E CORRIGIDA

from rest_framework import serializers
from rest_framework.validators import UniqueValidator # <-- 1. IMPORTE O VALIDATOR
from .models import CustomUser, Especialidade, JornadaDeTrabalho

class EspecialidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Especialidade
        fields = ['id', 'nome', 'valor_consulta']

class UserSerializer(serializers.ModelSerializer):
    especialidades_detalhes = EspecialidadeSerializer(source='especialidades', many=True, read_only=True)
    especialidades = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Especialidade.objects.all(),
        required=False
    )

    # --- 2. ADICIONE VALIDADORES EXPLÍCITOS ---
    # Isso transforma o Erro 500 em um Erro 400 amigável.
    
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
            'cargo', 'is_active', 'especialidades', 'especialidades_detalhes', 'password'
        ]
        extra_kwargs = {'password': {'write_only': True, 'required': False}}

    # --- 3. ADICIONE ESTES MÉTODOS DE VALIDAÇÃO ---
    # Isso converte strings vazias "" em None (NULL), permitindo
    # que vários usuários tenham o campo em branco sem violar a regra "unique".

    def validate_cpf(self, value):
        if value == "":
            return None
        return value

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
            'intervalo_consulta', 'ativo'
        ]
        read_only_fields = ['medico_nome', 'dia_da_semana_display']