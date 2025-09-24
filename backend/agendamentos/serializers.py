# backend/agendamentos/serializers.py - VERSÃO FINAL E COMPLETA

from rest_framework import serializers
from .models import Agendamento
from pacientes.models import Paciente
from usuarios.models import CustomUser, Especialidade
from faturamento.models import Procedimento

# --- Serializer para LEITURA (GET) ---
# Mostra os dados de forma legível para o frontend
class AgendamentoSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.CharField(source='paciente.nome_completo', read_only=True)
    status_pagamento = serializers.CharField(source='pagamento.status', read_only=True, default='Pendente')
    primeira_consulta = serializers.SerializerMethodField()
    
    # --- NOVOS CAMPOS PARA EXIBIÇÃO ---
    medico_nome = serializers.CharField(source='medico.get_full_name', read_only=True, default=None)
    especialidade_nome = serializers.CharField(source='especialidade.nome', read_only=True, default=None)
    procedimento_descricao = serializers.CharField(source='procedimento.descricao', read_only=True, default=None)
    plano_utilizado = serializers.CharField(source='plano_utilizado.nome', read_only=True, default=None)

    class Meta:
        model = Agendamento
        fields = [
            'id', 
            'paciente', 
            'paciente_nome', 
            'data_hora_inicio', 
            'data_hora_fim', 
            'status',
            'plano_utilizado',
            'tipo_atendimento',
            'observacoes',
            'status_pagamento',
            'primeira_consulta',
            'link_telemedicina',
            'modalidade',
            'tipo_visita',
            
            # --- CAMPOS DA NOVA LÓGICA ---
            'tipo_agendamento',
            'medico', # ID do médico
            'medico_nome', # Nome do médico
            'especialidade', # ID da especialidade
            'especialidade_nome', # Nome da especialidade
            'procedimento', # ID do procedimento
            'procedimento_descricao', # Descrição do procedimento
            'data_criacao', # Adicionado para visualização
            'data_atualizacao', # Adicionado para visualização
            'expira_em', # Adicionado para visualização
            'id_sala_telemedicina', # Adicionado para visualização
        ]

    def get_primeira_consulta(self, obj):
        return not Agendamento.objects.filter(
            paciente=obj.paciente,
            status__in=['Realizado', 'Confirmado'],
            data_hora_inicio__lt=obj.data_hora_inicio
        ).exists()

# --- Serializer para ESCRITA (POST, PUT) ---
# A MUDANÇA PRINCIPAL OCORRE AQUI
class AgendamentoWriteSerializer(serializers.ModelSerializer):
    paciente = serializers.PrimaryKeyRelatedField(queryset=Paciente.objects.all())
    medico = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.filter(cargo='medico'), required=False, allow_null=True)
    especialidade = serializers.PrimaryKeyRelatedField(queryset=Especialidade.objects.all(), required=False, allow_null=True)
    procedimento = serializers.PrimaryKeyRelatedField(queryset=Procedimento.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Agendamento
        fields = [
            'paciente', 'data_hora_inicio', 'data_hora_fim', 'status', 
            'plano_utilizado', 'tipo_atendimento', 'observacoes', 'modalidade',
            'tipo_visita', 'expira_em', 'tipo_agendamento', 'medico',
            'especialidade', 'procedimento',
        ]
         
    def validate(self, data):
        """
        Validação centralizada com a nova lógica de CAPACIDADE.
        Permite até 3 consultas e 1 procedimento no mesmo intervalo de tempo.
        """
        # --- CONSTANTES DE CAPACIDADE ---
        CAPACIDADE_CONSULTAS = 3
        CAPACIDADE_PROCEDIMENTOS = 1

        # --- DADOS DO AGENDAMENTO ATUAL ---
        tipo_agendamento_atual = data.get('tipo_agendamento')
        inicio = data.get('data_hora_inicio')
        fim = data.get('data_hora_fim')

        # --- REGRAS DE NEGÓCIO (Consulta vs Procedimento) - MANTIDAS ---
        if tipo_agendamento_atual == 'Consulta':
            if not data.get('medico'):
                raise serializers.ValidationError({"medico": "É necessário selecionar um médico para a consulta."})
            if not data.get('especialidade'):
                raise serializers.ValidationError({"especialidade": "É necessário selecionar uma especialidade para a consulta."})
            data['procedimento'] = None
        elif tipo_agendamento_atual == 'Procedimento':
            if not data.get('procedimento'):
                raise serializers.ValidationError({"procedimento": "É necessário selecionar um procedimento."})
            data['medico'] = None
            data['especialidade'] = None
            data['modalidade'] = 'Presencial'
        
        # --- NOVA VALIDAÇÃO DE CAPACIDADE DE HORÁRIO ---
        if not inicio or not fim:
             raise serializers.ValidationError("As datas de início e fim são obrigatórias.")

        # 1. Busca todos os agendamentos que conflitam no mesmo horário
        conflitos = Agendamento.objects.filter(
            data_hora_inicio__lt=fim, 
            data_hora_fim__gt=inicio
        ).exclude(status='Cancelado')

        # 2. Se estivermos atualizando, excluímos o próprio agendamento da contagem
        if self.instance:
            conflitos = conflitos.exclude(pk=self.instance.pk)

        # 3. Contamos quantos agendamentos de cada tipo já existem no horário
        consultas_no_horario = conflitos.filter(tipo_agendamento='Consulta').count()
        procedimentos_no_horario = conflitos.filter(tipo_agendamento='Procedimento').count()

        # 4. Aplicamos a regra de capacidade
        if tipo_agendamento_atual == 'Consulta':
            if consultas_no_horario >= CAPACIDADE_CONSULTAS:
                raise serializers.ValidationError(
                    f"A capacidade máxima de {CAPACIDADE_CONSULTAS} consultas para este horário já foi atingida."
                )
        elif tipo_agendamento_atual == 'Procedimento':
            if procedimentos_no_horario >= CAPACIDADE_PROCEDIMENTOS:
                raise serializers.ValidationError(
                    f"A capacidade máxima de {CAPACIDADE_PROCEDIMENTOS} procedimento(s) para este horário já foi atingida."
                )
        
        # Se passou por todas as validações, retorna os dados
        return data