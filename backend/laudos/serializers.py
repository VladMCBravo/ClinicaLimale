from rest_framework import serializers
from .models import ModeloLaudo, Laudo

class ModeloLaudoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModeloLaudo
        fields = '__all__'

class LaudoSerializer(serializers.ModelSerializer):
    # Campos de leitura para exibir na tabela do frontend sem fazer requisições extras
    paciente_nome = serializers.CharField(source='paciente.nome_completo', read_only=True)
    medico_nome = serializers.CharField(source='medico.nome_completo', read_only=True)

    class Meta:
        model = Laudo
        fields = [
            'id', 
            'paciente', 'paciente_nome', 
            'medico', 'medico_nome',
            'agendamento', # ID do agendamento
            'titulo_exame', 
            'dados_estruturados', # O JSON dos inputs
            'texto_laudo',        # O Texto final
            'imagens_ids',        # Lista de imagens
            'status', 
            'data_criacao', 'data_atualizacao'
        ]
        read_only_fields = ['medico', 'data_criacao', 'data_atualizacao']

    def create(self, validated_data):
        # Atribui automaticamente o médico logado ao criar o laudo
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['medico'] = request.user
        return super().create(validated_data)