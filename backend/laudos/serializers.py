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
    credenciais = serializers.SerializerMethodField()

    class Meta:
        model = Laudo
        fields = [
            'id', 
            'paciente', 'paciente_nome', 
            'medico', 'medico_nome',
            'agendamento', # ID do agendamento
            'titulo_exame', 
            'tipo_exame', # Adicionei este campo pois o seu Front envia 'tipo_exame' no payload
            'dados_estruturados', 
            'texto_laudo',        
            'imagens_ids', # Atenção: Se seu front envia 'imagens_anexas', o nome aqui deve bater ou usar source
            'status', 
            'data_criacao', 'data_atualizacao',
            'crm_medico', # Adicionei pois vi no seu Front que ele envia o CRM
            'credenciais' # <--- IMPORTANTE: Adicionei aqui para sair na resposta
        ]
        read_only_fields = ['medico', 'data_criacao', 'data_atualizacao', 'credenciais']

    def create(self, validated_data):
        # Atribui automaticamente o médico logado ao criar o laudo
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['medico'] = request.user
        return super().create(validated_data)
    
    # --- Lógica que monta o objeto JSON de credenciais ---
    def get_credenciais(self, obj):
        # Verifica se o modelo já gerou código e senha (geralmente feito no .save() do model)
        if obj.codigo_acesso and obj.senha_acesso:
            return {
                'codigo': obj.codigo_acesso,
                'senha': obj.senha_acesso,
                'link': 'https://clinica-limale.vercel.app/resultados' # Link do portal do paciente
            }
        return None