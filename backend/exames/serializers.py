from rest_framework import serializers
from .models import Exame, ArquivoExame

class ArquivoExameSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArquivoExame
        fields = ['id', 'arquivo', 'tipo', 'criado_em']

class ExameSerializer(serializers.ModelSerializer):
    arquivos = ArquivoExameSerializer(many=True, read_only=True)
    
    class Meta:
        model = Exame
        fields = ['id', 'paciente', 'data_exame', 'nome_paciente_pasta', 'codigo_acesso', 'senha_acesso', 'status', 'arquivos']