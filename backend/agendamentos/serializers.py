# backend/agendamentos/serializers.py - VERSÃO FINAL E COMPLETA

from rest_framework import serializers
from .models import Agendamento
from pacientes.models import Paciente
from faturamento.serializers import PagamentoStatusSerializer

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
    """
    Serializer de ESCRITA final. Garante que TODOS os campos do modal são aceites.
    """
    paciente = serializers.PrimaryKeyRelatedField(queryset=Paciente.objects.all())

    class Meta:
        model = Agendamento
        # --- CORREÇÃO FINAL: Todos os campos do formulário estão aqui ---
        fields = [
            'paciente', 
            'data_hora_inicio', 
            'data_hora_fim', 
            'status', 
            'tipo_consulta',
            'plano_utilizado',
            'tipo_atendimento',
            'procedimento', # <-- O campo que faltava para salvar o procedimento
            'observacoes',
        ]