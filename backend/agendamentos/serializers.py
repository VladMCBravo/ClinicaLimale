# backend/agendamentos/serializers.py - VERSÃO FINAL E COMPLETA

from rest_framework import serializers
from .models import Agendamento
from pacientes.models import Paciente
from faturamento.serializers import PagamentoStatusSerializer
from pacientes.serializers import PacienteSerializer # Exemplo de import


# --- Serializer para LEITURA (GET) ---
class AgendamentoSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.CharField(source='paciente.nome_completo', read_only=True)
    status_pagamento = serializers.CharField(source='pagamento.status', read_only=True, default='Pendente')
    primeira_consulta = serializers.SerializerMethodField()

    class Meta:
        model = Agendamento
        fields = [
            'id', 
            'paciente', # Mantemos o ID para o navigate
            'paciente_nome', 
            'data_hora_inicio', 
            'data_hora_fim', 
            'status', 
            'tipo_consulta',
            'plano_utilizado',
            'tipo_atendimento',
            'procedimento',
            'observacoes',
            'status_pagamento',
            'primeira_consulta',
            'link_telemedicina',
            'modalidade',
            'tipo_visita',
        ]

    def get_primeira_consulta(self, obj):
        return not Agendamento.objects.filter(
            paciente=obj.paciente,
            status__in=['Realizado', 'Confirmado'],
            data_hora_inicio__lt=obj.data_hora_inicio
        ).exists()

# --- Serializer para ESCRITA (POST, PUT) ---
class AgendamentoWriteSerializer(serializers.ModelSerializer):
    paciente = serializers.PrimaryKeyRelatedField(queryset=Paciente.objects.all())

    class Meta:
        model = Agendamento
        fields = [
            'paciente', 
            'data_hora_inicio', 
            'data_hora_fim', 
            'status', 
            'tipo_consulta',
            'plano_utilizado',
            'tipo_atendimento',
            'procedimento',
            'observacoes',
            'modalidade',
            'tipo_visita',
        ]
         
    def validate(self, data):
        """
        Garante que não haja agendamentos sobrepostos.
        (A versão duplicada foi removida)
        """
        inicio = data.get('data_hora_inicio')
        fim = data.get('data_hora_fim')

        conflitos = Agendamento.objects.filter(
            data_hora_inicio__lt=fim, 
            data_hora_fim__gt=inicio
        ).exclude(status='Cancelado')

        if self.instance:
            conflitos = conflitos.exclude(pk=self.instance.pk)

        if conflitos.exists():
            raise serializers.ValidationError("Este horário já está ocupado por outro agendamento.")

        return data