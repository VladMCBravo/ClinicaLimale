# backend/pacientes/serializers.py - VERSÃO OTIMIZADA E MAIS LEVE

from rest_framework import serializers
from .models import Paciente
from datetime import date
from faturamento.serializers import PlanoConvenioSerializer

class PacienteSerializer(serializers.ModelSerializer):
    idade = serializers.SerializerMethodField()
    plano_convenio_detalhes = PlanoConvenioSerializer(source='plano_convenio', read_only=True)
    
    # 1. MUDANÇA AQUI: Trocamos o SerializerMethodField por um campo simples,
    # pois o valor agora vem direto da query do banco de dados.
    total_consultas = serializers.IntegerField(read_only=True)

    class Meta:
        model = Paciente
        fields = [
            'id', 
            'nome_completo', 
            'data_nascimento',
            'email',
            'telefone_celular',
            'cpf',
            'peso',
            'altura',
            'plano_convenio',
            'numero_carteirinha',
            'medico_responsavel',
            'plano_convenio_detalhes',
            'idade',
            'total_consultas', # <-- O campo permanece aqui, mas agora é mais simples
        ]

    def get_idade(self, obj):
        if not obj.data_nascimento:
            return None
        hoje = date.today()
        idade = hoje.year - obj.data_nascimento.year - ((hoje.month, hoje.day) < (obj.data_nascimento.month, obj.data_nascimento.day))
        return idade

  