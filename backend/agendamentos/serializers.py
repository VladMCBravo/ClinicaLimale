# backend/agendamentos/serializers.py - VERSÃO FINAL E CORRIGIDA

from rest_framework import serializers
from .models import Agendamento
from pacientes.models import Paciente
from faturamento.serializers import PagamentoStatusSerializer # Importamos o serializer de status

# --- Serializer para LEITURA (GET) ---
class AgendamentoSerializer(serializers.ModelSerializer):
    """
    Serializer de LEITURA para Agendamentos.
    Envia dados detalhados e formatados para o frontend consumir.
    """
    paciente_nome = serializers.CharField(source='paciente.nome_completo', read_only=True)
    paciente = serializers.PrimaryKeyRelatedField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    pagamento = PagamentoStatusSerializer(read_only=True) # Aninha o status do pagamento

    class Meta:
        model = Agendamento
        fields = [
            'id',
            'paciente', # Enviamos o ID do paciente
            'paciente_nome', # E o nome para exibição
            'data_hora_inicio',
            'data_hora_fim',
            'tipo_consulta',
            'status',
            'status_display',
            'plano_utilizado',
            'tipo_atendimento',
            'pagamento', # Objeto com { id, status, valor } do pagamento
        ]

# --- Serializer para ESCRITA (POST, PUT) ---
class AgendamentoWriteSerializer(serializers.ModelSerializer):
    """
    Serializer de ESCRITA para Agendamentos.
    Recebe os IDs e os dados que o usuário envia do formulário.
    """
    # Garante que o frontend pode enviar um ID de paciente
    paciente = serializers.PrimaryKeyRelatedField(queryset=Paciente.objects.all())

    class Meta:
        model = Agendamento
        # --- CORREÇÃO CRÍTICA: Adicionamos os campos que faltavam ---
        fields = [
            'paciente', 
            'data_hora_inicio', 
            'data_hora_fim', 
            'status', 
            'tipo_consulta',
            'plano_utilizado',    # <-- ESTAVA A FALTAR
            'tipo_atendimento',   # <-- ESTAVA A FALTAR
            'observacoes',
        ]