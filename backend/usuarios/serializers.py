# backend/usuarios/serializers.py - VERSÃO FINAL E CORRIGIDA

from rest_framework import serializers
from .models import CustomUser, Especialidade

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

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'cargo', 
            'is_active', 'especialidades', 'especialidades_detalhes', 'password' # Adicionado 'password' aqui
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