# backend/usuarios/serializers.py - VERSÃO COMPLETA

from rest_framework import serializers
from .models import CustomUser

# SEU SERIALIZER EXISTENTE (MANTIDO)
class MedicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'first_name', 'last_name', 'username']

# -----------------------------------------------------------------------------

# NOVO SERIALIZER PARA LISTAR E ATUALIZAR USUÁRIOS
# Este serializer mostra todos os dados que um admin precisa ver.
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        # Excluímos a senha do retorno por segurança
        exclude = ('password',)

# NOVO SERIALIZER PARA CRIAR USUÁRIOS
# Este é especial porque lida com a criação da senha de forma segura (hashing).
class UserCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['username', 'password', 'first_name', 'last_name', 'cargo', 'is_active']
        extra_kwargs = {'password': {'write_only': True}} # Garante que a senha não seja retornada

    def create(self, validated_data):
        # O método create é sobrescrito para usar o set_password do Django,
        # que armazena a senha de forma criptografada, e não em texto puro.
        user = CustomUser.objects.create_user(**validated_data)
        return user