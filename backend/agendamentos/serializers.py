from rest_framework import serializers
from .models import Agendamento
from pacientes.models import Paciente # Importamos o modelo Paciente
from faturamento.serializers import PagamentoStatusSerializer # <-- Importe

# --- Serializer para LEITURA (GET) ---
# O seu, que já era ótimo, para exibir os dados de forma rica.
class AgendamentoSerializer(serializers.ModelSerializer):
    paciente = serializers.StringRelatedField(read_only=True)
    paciente_id = serializers.IntegerField(source='paciente.id', read_only=True)
    pago = serializers.SerializerMethodField()
    primeira_consulta = serializers.SerializerMethodField()
    pagamento = PagamentoStatusSerializer(read_only=True)

    class Meta:
        model = Agendamento
        fields = [
            'id', 
            'paciente', 
            'paciente_id',
            'data_hora_inicio', 
            'data_hora_fim', 
            'tipo_consulta', 
            'status',
            'pago',
            'primeira_consulta'
            'pagamento', # <-- Garanta que ele está na lista
        ]
        
    def get_pago(self, obj):
        return hasattr(obj, 'pagamento')

    def get_primeira_consulta(self, obj):
        # Esta é uma forma simplificada. Pode ser aprimorada se necessário.
        return not Agendamento.objects.filter(
            paciente=obj.paciente, 
            data_hora_inicio__lt=obj.data_hora_inicio
        ).exists()


# --- Serializer para ESCRITA (POST, PUT) ---
# Novo e mais simples, apenas para validar os dados que vêm do formulário.
class AgendamentoWriteSerializer(serializers.ModelSerializer):
    # Ao criar/editar, esperamos receber o ID numérico do paciente.
    paciente = serializers.PrimaryKeyRelatedField(queryset=Paciente.objects.all())

    class Meta:
        model = Agendamento
        # Apenas os campos que o nosso formulário do frontend realmente envia.
        fields = ['paciente', 'data_hora_inicio', 'data_hora_fim', 'status', 'tipo_consulta']