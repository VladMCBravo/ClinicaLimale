# backend/usuarios/serializers.py - VERSÃO FINAL E CORRIGIDA

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
    # Isso força o DRF a checar a unicidade ANTES de salvar,
    # transformando o erro 500 (crash) em um erro 400 (validação).

    # O 'username' já é validado pelo AbstractUser
    
    # Validadores para os campos que VOCÊ definiu como únicos:
    cpf = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, # Mantém as regras do modelo
        validators=[UniqueValidator(queryset=CustomUser.objects.all(), message="Já existe um usuário com este CPF.")]
    )
    crm = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, # Mantém as regras do modelo
        validators=[UniqueValidator(queryset=CustomUser.objects.all(), message="Já existe um usuário com este CRM.")]
    )
    # --- FIM DA CORREÇÃO ---

    class Meta:
        model = CustomUser
        # 3. GARANTA QUE TODOS OS CAMPOS ESTÃO AQUI
        fields = [
            'id', 'username', 'first_name', 'last_name', 
            'genero', 'data_nascimento', 'telefone', 'cpf', 'email',
            'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'cep', 
            'crm', 'rqe', 
            'cargo', 'is_active', 'especialidades', 'especialidades_detalhes', 'password'
        ]
        extra_kwargs = {'password': {'write_only': True, 'required': False}}

    def create(self, validated_data):
        especialidades_data = validated_data.pop('especialidades', [])
        
        # <<-- CORREÇÃO APLICADA AQUI -->>
        # Usamos .pop('password', None) para obter a senha de forma segura.
        # Se a senha não for enviada, a variável 'password' será None e não causará erro.
        password = validated_data.pop('password', None)
        
        # Criamos o usuário com os dados restantes.
        user = CustomUser.objects.create_user(**validated_data)
        
        # Se uma senha foi fornecida, nós a definimos de forma segura (criptografada).
        if password:
            user.set_password(password)
            user.save()
        # <<-- FIM DA CORREÇÃO -->>

        if especialidades_data:
            user.especialidades.set(especialidades_data)
        return user

    def update(self, instance, validated_data):
        # Sua lógica de update já estava correta e foi mantida.
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)

        if 'especialidades' in validated_data:
            especialidades_data = validated_data.pop('especialidades')
            instance.especialidades.set(especialidades_data)

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