from rest_framework import serializers
from .models import ModeloLaudo, Laudo
from pacientes.serializers import PacienteSerializer # Reaproveita o que você já tem

class ModeloLaudoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModeloLaudo
        fields = '__all__'

class LaudoSerializer(serializers.ModelSerializer):
    # Traz o nome do paciente para facilitar a exibição na lista
    paciente_nome = serializers.CharField(source='paciente.nome_completo', read_only=True)
    medico_nome = serializers.CharField(source='medico.nome_completo', read_only=True)

    class Meta:
        model = Laudo
        fields = [
            'id', 'paciente', 'paciente_nome', 'medico', 'medico_nome',
            'agendamento_id', 'titulo_exame', 'conteudo_laudo', 
            'imagens_selecionadas', 'status', 'data_criacao', 'data_atualizacao'
        ]
        read_only_fields = ['medico', 'data_criacao', 'data_atualizacao']

    def create(self, validated_data):
        # Garante que o médico logado seja o dono do laudo
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['medico'] = request.user
        return super().create(validated_data)