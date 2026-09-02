# backend/prontuario/serializers.py - VERSÃO CORRIGIDA

from django.db import models as db_models
from rest_framework import serializers
from .models import Evolucao, Prescricao, ItemPrescricao, Anamnese, Atestado, AnamneseGinecologica, AnamneseOrtopedia, AnamneseCardiologia, AnamnesePediatria, AnamneseNeonatologia, AnamneseClinicaGeral
from .models import DocumentoPaciente, OpcaoClinica, MarcoDNPM, VacinaPaciente
from .models import TemplateRelatorio, RelatorioSalvo
from .models import Laudo, ImagemLaudo # <--- Adicione Laudo e ImagemLaudo aqui
from .models import ModeloLaudo, ModeloPrescricao
from pacientes.models import Paciente
from agendamentos.models import Agendamento


class EmptyStringToNoneMixin:
    """
    Converte '' em None para todo campo numérico do model antes da validação.

    Selects do front (ex: Apgar 1'/5'/10') mandam '' quando o médico nunca
    seleciona um valor; sem isso, o DRF rejeita o PATCH inteiro da anamnese
    com "A valid integer is required." em vez de aceitar o campo como vazio,
    mesmo o model permitindo null=True/blank=True.
    """
    _NUMERIC_FIELD_TYPES = (db_models.IntegerField, db_models.FloatField, db_models.DecimalField)

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        numeric_field_names = {
            field.name for field in self.Meta.model._meta.get_fields()
            if isinstance(field, self._NUMERIC_FIELD_TYPES)
        }
        for field_name in numeric_field_names:
            if mutable_data.get(field_name) == '':
                mutable_data[field_name] = None
        return super().to_internal_value(mutable_data)


# --- SERIALIZERS DE ESPECIALIDADES ---
class AnamneseClinicaGeralSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnamneseClinicaGeral
        exclude = ['anamnese', 'id'] # Inclui hmp, habitos_sociais, vacina_adulto_status

class AnamneseGinecologicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnamneseGinecologica
        # Apenas os campos que existem no modelo (histórico)
        exclude = ['anamnese', 'id'] # Inclui todos os campos do modelo exceto estes

class AnamneseOrtopediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnamneseOrtopedia
        exclude = ['anamnese', 'id']

class AnamneseCardiologiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnamneseCardiologia
        # --- CORREÇÃO AQUI ---
        # Removemos a lista 'fields = [...]'
        # Mantemos APENAS o 'exclude' para incluir todos os campos do modelo,
        # exceto a chave estrangeira 'anamnese' e o 'id' padrão.
        exclude = ['anamnese', 'id']

class AnamnesePediatriaSerializer(EmptyStringToNoneMixin, serializers.ModelSerializer):
    class Meta:
        model = AnamnesePediatria
        # Incluímos os novos campos e removemos os antigos/movidos
        exclude = ['anamnese', 'id'] # Inclui todos os campos do modelo exceto estes

class AnamneseNeonatologiaSerializer(EmptyStringToNoneMixin, serializers.ModelSerializer):
    class Meta:
        model = AnamneseNeonatologia
        # Apenas os campos que existem no modelo (histórico)
        exclude = ['anamnese', 'id'] # Inclui todos os campos do modelo exceto estes


# --- ★★★ AJUSTE NECESSÁRIO AQUI ★★★ ---
# Serializer para o modelo Evolucao
class EvolucaoSerializer(serializers.ModelSerializer):
    medico_nome = serializers.CharField(source='medico.get_full_name', read_only=True)
    especialidade_nome = serializers.CharField(source='especialidade.nome', read_only=True, default=None)
    
    class Meta:
        model = Evolucao
        fields = [
            'id', 'medico_nome', 'data_atendimento', 'notas_subjetivas', 'notas_objetivas',
            'avaliacao', 'plano', 'pressao_arterial', 'frequencia_cardiaca', 'peso', 'altura',
            'exames_complementares', 'agendamento', 'especialidade', 'especialidade_nome', 'cid'
        ]
        # A MÁGICA 1: Adicionamos 'especialidade' aqui para o Django não barrar textos
        read_only_fields = ['id', 'medico_nome', 'data_atendimento', 'especialidade_nome', 'especialidade']

    # A MÁGICA 2: Blindagem de inputs numéricos vindos do React
    def to_internal_value(self, data):
        import re # Importa a biblioteca de expressões regulares
        
        _mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        
        # 1. Trata o que ele DEIXOU VAZIO (o que impedia o salvamento)
        for field in ['peso', 'altura', 'frequencia_cardiaca', 'agendamento', 'cid']:
            if _mutable_data.get(field) == "":
                _mutable_data[field] = None
        
        # 2. Trata o que ele DIGITOU em peso e altura (vírgulas e letras)
        for field in ['peso', 'altura']:
            valor = _mutable_data.get(field)
            
            if isinstance(valor, str) and valor:
                # Remove letras, espaços (ex: "kg", "cm") deixando só números, vírgula e ponto
                valor_limpo = re.sub(r'[^\d,\.]', '', valor)
                
                # Troca a vírgula brasileira pelo ponto americano (ex: 10,5 vira 10.5)
                valor_limpo = valor_limpo.replace(',', '.')
                
                if valor_limpo == "":
                    _mutable_data[field] = None
                else:
                    _mutable_data[field] = valor_limpo
                    
        return super().to_internal_value(_mutable_data)
# -----------------------------------------------

# Serializer para os Itens da Prescrição
class ItemPrescricaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemPrescricao
        fields = ['medicamento', 'via', 'dosagem', 'instrucoes']

# Serializer para a Prescrição (que contém os Itens)
class PrescricaoSerializer(serializers.ModelSerializer):
    itens = ItemPrescricaoSerializer(many=True)
    medico = serializers.StringRelatedField(read_only=True)
    paciente = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Prescricao
        fields = ['id', 'paciente', 'medico', 'data_prescricao', 'titulo', 'itens']

    def create(self, validated_data):
        itens_data = validated_data.pop('itens')
        prescricao = Prescricao.objects.create(**validated_data)
        for item_data in itens_data:
            ItemPrescricao.objects.create(prescricao=prescricao, **item_data)
        return prescricao

class ModeloPrescricaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModeloPrescricao
        fields = ['id', 'titulo', 'itens', 'data_criacao']
        # Não incluímos 'medico' aqui pois ele será salvo automaticamente pela View

# Serializer para a Anamnese
class AnamneseSerializer(serializers.ModelSerializer):
    ginecologica = AnamneseGinecologicaSerializer(required=False, allow_null=True)
    ortopedica = AnamneseOrtopediaSerializer(required=False, allow_null=True)
    cardiologica = AnamneseCardiologiaSerializer(required=False, allow_null=True)
    pediatrica = AnamnesePediatriaSerializer(required=False, allow_null=True)
    neonatologia = AnamneseNeonatologiaSerializer(required=False, allow_null=True)
    clinica_geral = AnamneseClinicaGeralSerializer(required=False, allow_null=True) # <-- ADICIONE ESTA LINHA
    
    class Meta:
        model = Anamnese
        fields = [
            'id', 'paciente', 'medico',
            # Campos principais da Anamnese que serão usados pelo Histórico de Clínica Geral:
            'queixa_principal', # Pode ser útil exibir a QP da primeira consulta
            'historia_doenca_atual', # HDA da primeira consulta
            'historico_medico_pregresso', # Campo geral (pode coexistir com o HMP específico)
            'historico_familiar', # Reutilizado
            'alergias', # Reutilizado
            'medicamentos_em_uso', # Reutilizado
            # Campos de especialidade:
            'ginecologica', 'ortopedica', 'cardiologica', 'pediatrica', 'neonatologia',
            'clinica_geral' # <-- ADICIONE ESTA LINHA
        ]
        extra_kwargs = { field: {'required': False, 'allow_blank': True, 'allow_null': True}
                         for field in ['queixa_principal', 'historia_doenca_atual',
                                       'historico_medico_pregresso', 'historico_familiar',
                                       'alergias', 'medicamentos_em_uso'] }

    def create(self, validated_data):
        # Separando os dados das especialidades
        ginecologica_data = validated_data.pop('ginecologica', None)
        ortopedica_data = validated_data.pop('ortopedica', None)
        cardiologica_data = validated_data.pop('cardiologica', None)
        pediatrica_data = validated_data.pop('pediatrica', None)
        neonatologia_data = validated_data.pop('neonatologia', None)
        clinica_geral_data = validated_data.pop('clinica_geral', None) # <-- ADD POP

        # Cria a Anamnese principal
        anamnese = Anamnese.objects.create(**validated_data)

        # Cria os registros das especialidades, se os dados foram enviados
        if ginecologica_data: AnamneseGinecologica.objects.create(anamnese=anamnese, **ginecologica_data)
        if ortopedica_data: AnamneseOrtopedia.objects.create(anamnese=anamnese, **ortopedica_data)
        if cardiologica_data: AnamneseCardiologia.objects.create(anamnese=anamnese, **cardiologica_data)
        if pediatrica_data: AnamnesePediatria.objects.create(anamnese=anamnese, **pediatrica_data)
        if neonatologia_data: AnamneseNeonatologia.objects.create(anamnese=anamnese, **neonatologia_data)
        if clinica_geral_data: AnamneseClinicaGeral.objects.create(anamnese=anamnese, **clinica_geral_data) # <-- ADD CREATE

        return anamnese

    def update(self, instance, validated_data):
        # Separando os dados das especialidades
        ginecologica_data = validated_data.pop('ginecologica', None)
        ortopedica_data = validated_data.pop('ortopedica', None)
        cardiologica_data = validated_data.pop('cardiologica', None)
        pediatrica_data = validated_data.pop('pediatrica', None)
        neonatologia_data = validated_data.pop('neonatologia', None)
        clinica_geral_data = validated_data.pop('clinica_geral', None)

        # Atualiza a Anamnese principal
        instance = super().update(instance, validated_data)

        # Atualiza ou cria os registros das especialidades
        specialty_data_map = {
            'ginecologica': (AnamneseGinecologica, ginecologica_data),
            'ortopedica': (AnamneseOrtopedia, ortopedica_data),
            'cardiologica': (AnamneseCardiologia, cardiologica_data),
            'pediatrica': (AnamnesePediatria, pediatrica_data),
            'neonatologia': (AnamneseNeonatologia, neonatologia_data),
            'clinica_geral': (AnamneseClinicaGeral, clinica_geral_data),
        }

        for field_name, (ModelClass, data) in specialty_data_map.items():
            if data is not None:
                obj, created = ModelClass.objects.get_or_create(anamnese=instance)
                
                # MUDANÇA AQUI: Rastreamos exatamente quais campos vieram no JSON
                update_fields = []
                for attr, value in data.items():
                    setattr(obj, attr, value)
                    update_fields.append(attr)
                
                if update_fields:
                    # 🚀 MÁGICA: Salva APENAS as colunas alteradas!
                    # Evita que o patch do DNPM apague a anamnese e vice-versa.
                    obj.save(update_fields=update_fields)
                elif created:
                    obj.save()
            elif hasattr(instance, field_name): 
                getattr(instance, field_name).delete()

        return instance

# Serializer para os Atestados
class AtestadoSerializer(serializers.ModelSerializer):
    medico = serializers.StringRelatedField(read_only=True)
    paciente = serializers.StringRelatedField(read_only=True)
    tipo_atestado_display = serializers.CharField(source='get_tipo_atestado_display', read_only=True)

    class Meta:
        model = Atestado
        fields = ['id', 'paciente', 'medico', 'data_emissao', 'tipo_atestado', 'tipo_atestado_display', 'observacoes',
                  'cid', 'paciente_autorizou_cid' # <--- ADICIONE AQUI
        ]

class DocumentoPacienteSerializer(serializers.ModelSerializer):
    enviado_por_nome = serializers.CharField(source='enviado_por.get_full_name', read_only=True)

    class Meta:
        model = DocumentoPaciente
        fields = [
            'id', 'paciente', 'titulo', 'arquivo', 'data_upload',
            'enviado_por', 'enviado_por_nome'
        ]
        read_only_fields = ['paciente', 'enviado_por']

class OpcaoClinicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpcaoClinica
        fields = ['id', 'descricao', 'especialidade', 'area_clinica']

# --- INÍCIO DAS NOVAS ADIÇÕES ---

class MarcoDNPMSerializer(serializers.ModelSerializer):
    medico_nome = serializers.CharField(source='medico.get_full_name', read_only=True)

    class Meta:
        model = MarcoDNPM
        fields = [
            'id', 'paciente', 'medico', 'medico_nome', 'marco_id', 
            'marco_descricao', 'idade_marco', 'alcançado', 
            'data_registro', 'observacao'
        ]
        read_only_fields = ['paciente', 'medico', 'medico_nome', 'data_registro']


class VacinaPacienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = VacinaPaciente
        fields = [
            'id', 'paciente', 
            'vacina_id', # ★★★ ADICIONE ESTA LINHA ★★★
            'nome_vacina', 'idade_recomendada', 
            'dose', 'data_aplicacao', 'status', 'observacao'
        ]
        read_only_fields = ['paciente']

# --- FIM DAS NOVAS ADIÇÕES ---

class TemplateRelatorioSerializer(serializers.ModelSerializer):
    """
    Serializa os templates disponíveis (para o dropdown do frontend).
    """
    class Meta:
        model = TemplateRelatorio
        fields = ['id', 'titulo', 'especialidade']


class RelatorioSalvoListSerializer(serializers.ModelSerializer):
    """
    Serializa a LISTA de relatórios já salvos do paciente (para o histórico).
    """
    medico_nome = serializers.CharField(source='medico.get_full_name', read_only=True)
    class Meta:
        model = RelatorioSalvo
        # Mostra campos simplificados
        fields = ['id', 'titulo', 'data_criacao', 'medico_nome']


class RelatorioSalvoCreateSerializer(serializers.ModelSerializer):
    """
    Usado para CRIAR (POST) um novo relatório salvo.
    """
    class Meta:
        model = RelatorioSalvo
        # O frontend enviará apenas estes campos
        fields = ['titulo', 'conteudo_final', 'consulta', 'template_origem', 'cid', 'paciente_autorizou_cid']
        extra_kwargs = {
            'consulta': {'required': False, 'allow_null': True},
            'template_origem': {'required': False, 'allow_null': True},
        }

# --- MANTENHA O CÓDIGO IGUAL ATÉ CHEGAR AQUI EMBAIXO NA PARTE DE LAUDOS ---

class ModeloLaudoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModeloLaudo
        fields = '__all__'

class ImagemLaudoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagemLaudo
        fields = ['id', 'arquivo', 'data_upload']

class LaudoSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.CharField(source='paciente.nome_completo', read_only=True)
    medico_nome = serializers.CharField(source='medico.get_full_name', read_only=True)
    
    imagens = ImagemLaudoSerializer(many=True, read_only=True)
    arquivos_exame = serializers.SerializerMethodField()
    credenciais = serializers.SerializerMethodField()

    # --- A CORREÇÃO MÁGICA ---
    # Isso diz: "O campo 'titulo' do JSON deve ser gravado na coluna 'titulo_exame' do banco"
    titulo = serializers.CharField(source='titulo_exame') 
    # -------------------------

    class Meta:
        model = Laudo
        fields = [
            'id', 
            'paciente', 'paciente_nome', 
            'medico', 'medico_nome',
            'agendamento', 
            'titulo',      # O front envia 'titulo'
            'tipo_exame', 
            'dados_estruturados', 
            'texto_laudo',        
            'imagens',          
            'imagens_ids',      
            'status', 
            'data_criacao', 'data_atualizacao',
            'medico_responsavel',  
            'crm_medico',          
            'credenciais',         
            'arquivo_pdf',         
            'arquivos_exame'       
        ]
        
        read_only_fields = ['medico', 'data_criacao', 'data_atualizacao', 'credenciais', 'imagens', 'paciente_nome', 'medico_nome']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['medico'] = request.user
        return super().create(validated_data)

    def get_arquivos_exame(self, obj):
        try:
            from exames.serializers import ArquivoExameSerializer
            if hasattr(obj, 'exame') and obj.exame:
                return ArquivoExameSerializer(obj.exame.arquivos.all(), many=True).data
        except ImportError:
            pass
        return []

    def get_credenciais(self, obj):
        # Ignora as credenciais do Exame (EX-) e força SEMPRE o uso do Laudo (PCT-)
        if obj.codigo_acesso and obj.senha_acesso:
            return {
                'codigo': obj.codigo_acesso,
                'senha': obj.senha_acesso,
                'link': 'https://clinica-limale.vercel.app/resultados',
                'fonte': 'laudo'
            }
        return None

class PatientBannerSerializer(serializers.ModelSerializer):
    """
    Entrega os dados mastigados para a barra preta do topo (Patient Banner)
    """
    idade_formatada = serializers.SerializerMethodField()
    sinais_vitais = serializers.SerializerMethodField()

    class Meta:
        model = Paciente
        # Note que se o seu model Paciente usa 'sexo' em vez de 'genero', altere abaixo:
        fields = ['id', 'nome_completo', 'genero', 'data_nascimento', 'idade_formatada', 'sinais_vitais']

    def get_idade_formatada(self, obj):
        # Tenta usar a função de calcular idade do seu model, se existir
        if hasattr(obj, 'get_idade_anos'):
            return obj.get_idade_anos()
        return "Idade Indisponível"

    def get_sinais_vitais(self, obj):
        # Busca a última evolução do paciente para mostrar os sinais vitais mais recentes na barra
        ultima_evolucao = Evolucao.objects.filter(paciente=obj).order_by('-data_atendimento').first()
        if ultima_evolucao:
            return {
                'pa': ultima_evolucao.pressao_arterial or 'N/A',
                'fc': ultima_evolucao.frequencia_cardiaca or 'N/A',
                'peso': ultima_evolucao.peso or 'N/A'
            }
        return {'pa': 'N/A', 'fc': 'N/A', 'peso': 'N/A'}

class WorkspacePacienteSerializer(serializers.ModelSerializer):
    """
    Entrega a lista de pacientes (Menu Esquerdo) com metadados
    """
    ultima_consulta = serializers.SerializerMethodField()
    
    class Meta:
        model = Paciente
        fields = ['id', 'nome_completo', 'cpf', 'data_nascimento', 'ultima_consulta']

    def get_ultima_consulta(self, obj):
        ev = Evolucao.objects.filter(paciente=obj).order_by('-data_atendimento').first()
        return ev.data_atendimento.strftime('%d/%m/%Y') if ev else "Sem registros"