# backend/pacientes/serializers.py - VERSÃO OTIMIZADA E MAIS LEVE

from rest_framework import serializers
from rest_framework.validators import UniqueValidator # <-- 1. IMPORTE O VALIDATOR
from .models import Paciente
from datetime import date
from faturamento.serializers import PlanoConvenioSerializer

class PacienteSerializer(serializers.ModelSerializer):
    idade = serializers.SerializerMethodField()
    plano_convenio_detalhes = PlanoConvenioSerializer(source='plano_convenio', read_only=True)
    total_consultas = serializers.IntegerField(read_only=True)

    # --- 2. ADICIONE VALIDADORES EXPLÍCITOS ---
    # Isso transforma o Erro 500 em um Erro 400 amigável.
    
    cpf = serializers.CharField(
        required=False, allow_blank=True, allow_null=True,
        validators=[UniqueValidator(queryset=Paciente.objects.all(), message="Já existe um paciente com este CPF.")]
    )
    email = serializers.EmailField(
        required=False, allow_blank=True, allow_null=True,
        validators=[UniqueValidator(queryset=Paciente.objects.all(), message="Já existe um paciente com este E-mail.")]
    )

    class Meta:
        model = Paciente
        fields = [
            'id', 
            'nome_completo', 
            'data_nascimento',
            'genero', # <<-- CAMPO ADICIONADO AQUI
            'dum', # <<-- CAMPO DUM ADICIONADO AQUI
            'cpf',
            'email',
            'telefone_celular',            
            'peso',
            'altura',
            # --- NOVOS CAMPOS: ENDEREÇO ---
            'cep',
            'endereco',
            'numero',
            'complemento',
            'bairro',
            'cidade',
            'estado',
            
            # --- NOVOS CAMPOS: RESPONSÁVEL ---
            'nome_responsavel',
            'cpf_responsavel',
            'telefone_responsavel',
            # --- NOVOS CAMPOS: EMERGÊNCIA ---
            'contato_emergencia_nome',
            'contato_emergencia_telefone',
            'contato_emergencia_parentesco',

            # Dados do Convênio
            'plano_convenio',
            'numero_carteirinha',
            'medico_responsavel',
            
            # Campos Read-only
            'plano_convenio_detalhes',
            'idade',
            'total_consultas',
        ]
        # Adicionamos o 'read_only_fields' para os campos calculados
        read_only_fields = ['idade', 'total_consultas', 'plano_convenio_detalhes']

    def get_idade(self, obj):
        if not obj.data_nascimento:
            return None
        hoje = date.today()
        idade = hoje.year - obj.data_nascimento.year - ((hoje.month, hoje.day) < (obj.data_nascimento.month, obj.data_nascimento.day))
        return idade
    
    # --- 3. ADICIONE ESTES MÉTODOS DE VALIDAÇÃO ---
    # Isso converte strings vazias "" em None (NULL).
    
    def validate_cpf(self, value):
        if value == "":
            return None
        return value

    def validate_email(self, value):
        if value == "":
            return None
        return value
    
    # O cpf_responsavel não é único, então não precisa de um validador

    # --- 4. ATUALIZE O MÉTODO 'UPDATE' ---
    # (Você provavelmente não tem um 'update' customizado, então pode adicionar este)
    # Se já tiver, apenas adicione o conteúdo.
    
    def update(self, instance, validated_data):
        # Converte "" para None ANTES de salvar a atualização
        if 'cpf' in validated_data and validated_data['cpf'] == "":
            validated_data['cpf'] = None
        if 'email' in validated_data and validated_data['email'] == "":
            validated_data['email'] = None
            
        return super().update(instance, validated_data)

class PacienteClinicalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paciente
        # Apenas campos clínicos, NUNCA cpf, telefone, etc.
        fields = ['id', 'nome_completo', 'data_nascimento', 'genero', 'alergias','dum'] 