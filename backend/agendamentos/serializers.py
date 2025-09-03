# backend/agendamentos/serializers.py - VERSÃO FINAL E COMPLETA

from rest_framework import serializers
from .models import Agendamento
from pacientes.models import Paciente
from faturamento.serializers import PagamentoStatusSerializer
from pacientes.serializers import PacienteSerializer # Exemplo de import


# --- Serializer para LEITURA (GET) ---
class AgendamentoSerializer(serializers.ModelSerializer):
    """
    Serializer de LEITURA final. Envia todos os dados necessários para
    a Agenda, Sidebar, Faturamento, etc.
    """
    paciente_nome = serializers.CharField(source='paciente.nome_completo', read_only=True)
    pagamento = PagamentoStatusSerializer(read_only=True)
    primeira_consulta = serializers.SerializerMethodField()

    class Meta:
        model = Agendamento
        fields = [
            'id',
            'paciente',
            'paciente_nome',
            'data_hora_inicio',
            'data_hora_fim',
            'status',
            'tipo_atendimento',
            'link_telemedicina', # <-- NOVO: Adicione este campo
            'tipo_consulta', # <-- O campo que faltava para a tabela de faturamento
            'procedimento',  # <-- O ID do procedimento
            'pagamento',
            'primeira_consulta',
            'plano_utilizado',
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