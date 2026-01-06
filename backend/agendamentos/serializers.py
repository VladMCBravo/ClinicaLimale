# backend/agendamentos/serializers.py - VERSÃO FINAL E CORRETA

from rest_framework import serializers
from .models import Agendamento, Sala
from pacientes.models import Paciente
from usuarios.models import CustomUser, Especialidade
from faturamento.models import Procedimento

# --- Serializer para LEITURA (GET) ---
class AgendamentoSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.CharField(source='paciente.nome_completo', read_only=True)
    status_pagamento = serializers.CharField(source='pagamento.status', read_only=True, default='Pendente')
    primeira_consulta = serializers.SerializerMethodField()
    
    medico_nome = serializers.CharField(source='medico.get_full_name', read_only=True, default=None)
    especialidade_nome = serializers.CharField(source='especialidade.nome', read_only=True, default=None)
    procedimento_descricao = serializers.CharField(source='procedimento.descricao', read_only=True, default=None)
    plano_utilizado = serializers.CharField(source='plano_utilizado.nome', read_only=True, default=None)
    sala_nome = serializers.CharField(source='sala.nome', read_only=True)

    class Meta:
        model = Agendamento
        fields = [
            'id', 'paciente', 'paciente_nome', 'data_hora_inicio', 'data_hora_fim', 
            'status', 'plano_utilizado', 'tipo_atendimento', 'observacoes', 
            'status_pagamento', 'primeira_consulta', 'link_telemedicina', 
            'modalidade', 'tipo_visita', 'tipo_agendamento', 'medico', 'medico_nome', 
            'especialidade', 'especialidade_nome', 'procedimento', 'procedimento_descricao', 
            'data_criacao', 'data_atualizacao', 'expira_em', 'id_sala_telemedicina', 
            'sala', 'sala_nome'
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
    medico = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.filter(cargo='medico'), required=False, allow_null=True)
    especialidade = serializers.PrimaryKeyRelatedField(queryset=Especialidade.objects.all(), required=False, allow_null=True)
    procedimento = serializers.PrimaryKeyRelatedField(queryset=Procedimento.objects.all(), required=False, allow_null=True)
    sala = serializers.PrimaryKeyRelatedField(queryset=Sala.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Agendamento
        fields = [
            'paciente', 'data_hora_inicio', 'data_hora_fim', 'status', 
            'plano_utilizado', 'tipo_atendimento', 'observacoes', 'modalidade',
            'tipo_visita', 'expira_em', 'tipo_agendamento', 'medico',
            'especialidade', 'procedimento', 'sala'
        ]
                  
    def validate(self, data):
        # REGRAS DE CAPACIDADE
        LIMITE_GLOBAL_CONSULTAS = 3
        LIMITE_GLOBAL_PROCEDIMENTOS = 1

        tipo_agendamento = data.get('tipo_agendamento')
        inicio = data.get('data_hora_inicio')
        fim = data.get('data_hora_fim')
        sala_selecionada = data.get('sala')
        agendamento_id = self.instance.pk if self.instance else None

        # 1. Validação Básica de Campos
        if tipo_agendamento == 'Consulta':
            if not data.get('medico'): raise serializers.ValidationError({"medico": "Selecione um médico."})
            data['procedimento'] = None
        elif tipo_agendamento == 'Procedimento':
            if not data.get('procedimento'): raise serializers.ValidationError({"procedimento": "Selecione um procedimento."})
            data['medico'] = None
            data['especialidade'] = None
            
            # Tenta atribuir sala automaticamente para procedimentos se não informada
            if not sala_selecionada:
                sala_exame = Sala.objects.filter(e_sala_exame=True).first()
                if sala_exame:
                    data['sala'] = sala_exame
                    sala_selecionada = sala_exame
                else:
                    raise serializers.ValidationError({"sala": "Nenhuma sala de procedimentos encontrada."})

        # 2. Validação de Conflito Físico (Sala Específica)
        if sala_selecionada:
            conflito_sala = Agendamento.objects.filter(
                sala=sala_selecionada,
                data_hora_inicio__lt=fim,
                data_hora_fim__gt=inicio
            ).exclude(status='Cancelado')

            if agendamento_id: conflito_sala = conflito_sala.exclude(pk=agendamento_id)

            if conflito_sala.exists():
                raise serializers.ValidationError({"sala": f"A sala '{sala_selecionada.nome}' já está ocupada neste horário."})

        # 3. Validação de Limite Global (Contador da Clínica)
        conflitos_globais = Agendamento.objects.filter(
            data_hora_inicio__lt=fim,
            data_hora_fim__gt=inicio,
            tipo_agendamento=tipo_agendamento
        ).exclude(status='Cancelado')

        if agendamento_id: conflitos_globais = conflitos_globais.exclude(pk=agendamento_id)

        qtd_existente = conflitos_globais.count()

        if tipo_agendamento == 'Consulta' and qtd_existente >= LIMITE_GLOBAL_CONSULTAS:
            raise serializers.ValidationError({
                "non_field_errors": f"Limite de consultas simultâneas atingido ({LIMITE_GLOBAL_CONSULTAS}). Não há salas disponíveis."
            })
        
        elif tipo_agendamento == 'Procedimento' and qtd_existente >= LIMITE_GLOBAL_PROCEDIMENTOS:
             raise serializers.ValidationError({
                "non_field_errors": f"A sala de procedimentos já está ocupada neste horário (Limite: {LIMITE_GLOBAL_PROCEDIMENTOS})."
            })

        return data
    
class SalaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sala
        fields = ['id', 'nome', 'descricao']