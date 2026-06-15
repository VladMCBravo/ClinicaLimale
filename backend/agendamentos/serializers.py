# backend/agendamentos/serializers.py

from rest_framework import serializers
from .models import Agendamento, Sala
from pacientes.models import Paciente
from usuarios.models import CustomUser, Especialidade
from faturamento.models import Procedimento
from datetime import timedelta
from django.utils import timezone

# --- Serializer para LEITURA (GET) ---
class AgendamentoSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.CharField(source='paciente.nome_completo', read_only=True)
    status_pagamento = serializers.CharField(source='pagamento.status', read_only=True, default='Pendente')
    primeira_consulta = serializers.SerializerMethodField()
    
    medico_nome = serializers.CharField(source='medico.get_full_name', read_only=True, default=None)
    especialidade_nome = serializers.CharField(source='especialidade.nome', read_only=True, default=None)
    procedimento_descricao = serializers.CharField(source='procedimento.descricao', read_only=True, default=None)
    plano_utilizado = serializers.CharField(source='plano_utilizado.nome', read_only=True, default=None)
    valor_faturamento = serializers.SerializerMethodField()
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
            'sala', 'sala_nome', 'valor_faturamento'
        ]

    def get_primeira_consulta(self, obj):
        return not Agendamento.objects.filter(
            paciente=obj.paciente,
            status__in=['Realizado', 'Confirmado'],
            data_hora_inicio__lt=obj.data_hora_inicio
        ).exists()
    
    def get_valor_faturamento(self, obj):
        try:
            # Puxa o objeto financeiro atrelado (evitando quebrar se não existir)
            pagamento = getattr(obj, 'pagamento', None)
            
            if not pagamento:
                return 0.00
            
            # Se por acaso o Django trouxer como lista, pegamos o primeiro.
            # Se já for o objeto direto (o seu caso), usamos ele mesmo.
            if hasattr(pagamento, 'first'):
                pagamento = pagamento.first()
                
            if pagamento and pagamento.valor is not None:
                return float(pagamento.valor)
        except Exception:
            pass
            
        return 0.00

# --- Serializer para ESCRITA (POST, PUT, PATCH) ---
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
        # 1. Regras de Capacidade
        LIMITE_GLOBAL_CONSULTAS = 3
        LIMITE_GLOBAL_PROCEDIMENTOS = 1
        
        # O PULO DO GATO: Se 'data' não tiver o campo, buscamos da instância do banco
        instance = self.instance

        tipo_agendamento = data.get('tipo_agendamento') or (getattr(instance, 'tipo_agendamento', None))
        inicio = data.get('data_hora_inicio') or (getattr(instance, 'data_hora_inicio', None))
        fim = data.get('data_hora_fim') or (getattr(instance, 'data_hora_fim', None))
        sala_selecionada = data.get('sala') or (getattr(instance, 'sala', None))
        agendamento_id = instance.pk if instance else None

        if not inicio or not fim:
            return data

        # 1. Pegamos o usuário logado de dentro do contexto do DRF
        request = self.context.get('request')
        usuario_logado = request.user if request else None

        # --- TRAVA ATUALIZADA: BLOQUEIO DE VIAGEM NO TEMPO COM TOLERÂNCIA DE 2 HORAS (EXCETO ADMIN) ---
        agora = timezone.now()
        # Permite agendar se o horário de início for até 2 horas antes de "agora"
        limite_tolerancia_passado = agora - timedelta(hours=2)
        
        if inicio < limite_tolerancia_passado:
            # Se não tiver usuário logado OU se o cargo for diferente de admin, bloqueia!
            if not usuario_logado or usuario_logado.cargo != 'admin':
                raise serializers.ValidationError({"data_hora_inicio": "Não é permitido criar agendamentos com mais de 2 horas no passado."})
        # -----------------------------------------------

        # --- A MÁGICA DOS MILISSEGUNDOS (Tolerância de 1 segundo) ---
        inicio_tolerancia = inicio + timedelta(seconds=1)
        fim_tolerancia = fim - timedelta(seconds=1)

        # --- A MÁGICA DO ENCAIXE E DO PASSE LIVRE ADMIN ---
        is_encaixe_req = self.initial_data.get('is_encaixe', False)
        is_encaixe = str(is_encaixe_req).lower() in ['true', '1', 't']

        # SE O USUÁRIO FOR ADMIN, GANHA PASSE LIVRE AUTOMÁTICO (Age como encaixe)
        if usuario_logado and getattr(usuario_logado, 'cargo', '') == 'admin':
            is_encaixe = True
        # ----------------------------------------------------

        # 2. Validação Básica de Campos
        if tipo_agendamento == 'Consulta':
            medico = data.get('medico', getattr(instance, 'medico', None))
            if not medico: 
                raise serializers.ValidationError({"medico": "Selecione um médico."})
            if 'procedimento' in data: 
                data['procedimento'] = None
            
        elif tipo_agendamento == 'Procedimento':
            procedimento = data.get('procedimento', getattr(instance, 'procedimento', None))
            if not procedimento: 
                raise serializers.ValidationError({"procedimento": "Selecione um procedimento."})
            
            
            if 'especialidade' in data: data['especialidade'] = None
            
            if not sala_selecionada and not instance:
                sala_exame = Sala.objects.filter(e_sala_exame=True).first()
                if sala_exame:
                    data['sala'] = sala_exame
                    sala_selecionada = sala_exame
                else:
                    raise serializers.ValidationError({"sala": "Nenhuma sala de procedimentos encontrada."})

        # 3. Validação de Conflito de Sala (Ignora se for Encaixe)
        if sala_selecionada and not is_encaixe:
            conflito_sala = Agendamento.objects.filter(
                sala=sala_selecionada,
                data_hora_inicio__lt=fim_tolerancia, # Usa a tolerância!
                data_hora_fim__gt=inicio_tolerancia  # Usa a tolerância!
            ).exclude(status__in=['Cancelado', 'Não Compareceu'])

            if agendamento_id: 
                conflito_sala = conflito_sala.exclude(pk=agendamento_id)

            if conflito_sala.exists():
                raise serializers.ValidationError({"sala": f"A sala '{sala_selecionada.nome}' já está ocupada. Marque 'Forçar Encaixe' se desejar sobrepor."})

        # 4. Validação de Limite Global (Ignora se for Encaixe)
        if not is_encaixe:
            conflitos_globais = Agendamento.objects.filter(
                data_hora_inicio__lt=fim_tolerancia, # Usa a tolerância!
                data_hora_fim__gt=inicio_tolerancia, # Usa a tolerância!
                tipo_agendamento=tipo_agendamento
            ).exclude(status__in=['Cancelado', 'Não Compareceu'])

            if agendamento_id: 
                conflitos_globais = conflitos_globais.exclude(pk=agendamento_id)
            
            qtd_existente = conflitos_globais.count()

            if tipo_agendamento == 'Consulta' and qtd_existente >= LIMITE_GLOBAL_CONSULTAS:
                raise serializers.ValidationError({
                    "non_field_errors": f"Limite de consultas atingido ({LIMITE_GLOBAL_CONSULTAS})."
                })
        
            elif tipo_agendamento == 'Procedimento' and qtd_existente >= LIMITE_GLOBAL_PROCEDIMENTOS:
                raise serializers.ValidationError({
                    "non_field_errors": f"A sala de procedimentos já está ocupada ({LIMITE_GLOBAL_PROCEDIMENTOS})."
                })

        return data

class SalaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sala
        # ADICIONADOS: 'e_sala_exame' e 'equipamentos'
        fields = ['id', 'nome', 'descricao', 'e_sala_exame', 'equipamentos']