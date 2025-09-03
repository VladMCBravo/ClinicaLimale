# backend/usuarios/serializers.py - VERSÃO ATUALIZADA

from rest_framework import serializers
from .models import CustomUser, Especialidade # 1. Importe o modelo Especialidade

# --- NOVO SERIALIZER ADICIONADO AQUI ---
class EspecialidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Especialidade
        fields = ['id', 'nome']

# -----------------------------------------------------------------------------

# SEU SERIALIZER EXISTENTE (MANTIDO)
class MedicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'first_name', 'last_name', 'username']

# -----------------------------------------------------------------------------

# SERIALIZER DE USUÁRIO ATUALIZADO
# Este serializer agora lida com a exibição e atualização de especialidades.
class UserSerializer(serializers.ModelSerializer):
    # 2. Campo para exibir os detalhes das especialidades (somente leitura)
    especialidades = EspecialidadeSerializer(many=True, read_only=True)
    
    # 3. Campo para receber uma lista de IDs de especialidades ao ATUALIZAR um usuário (somente escrita)
    especialidades_ids = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=Especialidade.objects.all(), 
        source='especialidades', 
        write_only=True,
        required=False # Torna o campo opcional
    )

    class Meta:
        model = CustomUser
        # 4. Adicionamos os novos campos à lista de fields
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'cargo', 
            'is_active', 'especialidades', 'especialidades_ids'
        ]
        # Excluímos a senha do retorno por segurança, como você já fazia
        extra_kwargs = {'password': {'write_only': True}}


# SERIALIZER DE CRIAÇÃO DE USUÁRIOS ATUALIZADO
# Este serializer lida com a criação e também com a atribuição inicial de especialidades.
class UserCreateSerializer(serializers.ModelSerializer):
    # 5. Adicionamos o mesmo campo para receber os IDs na criação
    especialidades_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Especialidade.objects.all(),
        source='especialidades',
        write_only=True,
        required=False # Torna o campo opcional
    )

    class Meta:
        model = CustomUser
        # 6. Adicionamos o campo à lista de fields
        fields = ['username', 'password', 'first_name', 'last_name', 'cargo', 'is_active', 'especialidades_ids']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        # O método create continua seguro para a senha
        user = CustomUser.objects.create_user(**validated_data)
        return user