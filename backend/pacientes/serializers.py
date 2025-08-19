# backend/pacientes/serializers.py

from rest_framework import serializers
from .models import Paciente
from datetime import date

class PacienteSerializer(serializers.ModelSerializer):
    # Campos calculados para enriquecer a resposta da API
    idade = serializers.SerializerMethodField()
    total_consultas = serializers.SerializerMethodField()

    class Meta:
        model = Paciente
        # Adicionamos os novos campos à lista
        fields = [
            'id', 
            'nome_completo', 
            'cpf', 
            'data_nascimento',
            'telefone_celular',
            'idade', 
            'total_consultas'
            # Adicione aqui outros campos que queira exibir, como 'convenio'
        ]

    def get_idade(self, obj):
        if not obj.data_nascimento:
            return None
        hoje = date.today()
        idade = hoje.year - obj.data_nascimento.year - ((hoje.month, hoje.day) < (obj.data_nascimento.month, obj.data_nascimento.day))
        return idade

    def get_total_consultas(self, obj):
        # 'agendamentos' é o related_name do ForeignKey em Agendamento
        # Se você não definiu um, o padrão é 'agendamento_set'
        if hasattr(obj, 'agendamentos'):
             return obj.agendamentos.count()
        return 0