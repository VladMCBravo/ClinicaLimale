# backend/usuarios/serializers.py - VERSÃO FINAL E UNIFICADA

from rest_framework import serializers
from .models import CustomUser, Especialidade

class EspecialidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Especialidade
        fields = ['id', 'nome', 'valor_consulta']

class UserSerializer(serializers.ModelSerializer):
    # Para LEITURA: Mostra os detalhes completos das especialidades.
    especialidades_detalhes = EspecialidadeSerializer(source='especialidades', many=True, read_only=True)
    
    # Para ESCRITA (criar/editar): Aceita uma lista de IDs de especialidades.
    especialidades = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Especialidade.objects.all(),
        required=False # Opcional, nem todo usuário é médico
    )

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'cargo', 
            'is_active', 'especialidades', 'especialidades_detalhes'
        ]
        # Garante que a senha não seja enviada de volta na resposta
        extra_kwargs = {'password': {'write_only': True, 'required': False}}

    def create(self, validated_data):
        # Remove as especialidades dos dados para tratar separadamente
        especialidades_data = validated_data.pop('especialidades', [])
        
        # Garante que a senha seja obrigatória na criação
        password = validated_data.pop('password')
        if not password:
            raise serializers.ValidationError({'password': 'A senha é obrigatória na criação.'})

        # Cria o usuário com a senha criptografada
        user = CustomUser.objects.create_user(**validated_data, password=password)
        
        # Associa as especialidades
        if especialidades_data:
            user.especialidades.set(especialidades_data)
        return user

    def update(self, instance, validated_data):
        # Se uma nova senha for fornecida, atualiza de forma segura
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)

        # Atualiza as especialidades, se fornecidas
        if 'especialidades' in validated_data:
            especialidades_data = validated_data.pop('especialidades')
            instance.especialidades.set(especialidades_data)

        # Atualiza os outros campos
        return super().update(instance, validated_data)