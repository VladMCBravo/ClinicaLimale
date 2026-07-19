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
    paciente_telefone = serializers.CharField(source='paciente.telefone_celular', read_only=True, default=None)
    status_pagamento = serializers.CharField(source='pagamento.status', read_only=True, default='Pendente')
    primeira_consulta = serializers.SerializerMethodField()
    
    medico_nome = serializers.CharField(source='medico.get_full_name', read_only=True, default=None)
    medico_nome_com_prefixo = serializers.CharField(source='medico.nome_com_prefixo', read_only=True, default=None)
    medico_crm = serializers.CharField(source='medico.crm', read_only=True, default=None)
    especialidade_nome = serializers.CharField(source='especialidade.nome', read_only=True, default=None)
    procedimento_descricao = serializers.CharField(source='procedimento.descricao', read_only=True, default=None)
    plano_utilizado = serializers.CharField(source='plano_utilizado.nome', read_only=True, default=None)
    valor_faturamento = serializers.SerializerMethodField()
    sala_nome = serializers.CharField(source='sala.nome', read_only=True)

    class Meta:
        model = Agendamento
        fields = [
            'id', 'paciente', 'paciente_nome', 'paciente_telefone', 'data_hora_inicio', 'data_hora_fim',
            'status', 'plano_utilizado', 'tipo_atendimento', 'observacoes', 
            'status_pagamento', 'primeira_consulta', 'link_telemedicina', 
            'modalidade', 'tipo_visita', 'tipo_agendamento', 'medico', 'medico_nome', 'medico_nome_com_prefixo', 'medico_crm',
            'especialidade', 'especialidade_nome', 'procedimento', 'procedimento_descricao',
            'data_criacao', 'data_atualizacao', 'expira_em', 'id_sala_telemedicina',
            'sala', 'sala_nome', 'valor_faturamento', 'is_encaixe'
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
            'especialidade', 'procedimento', 'sala', 'is_encaixe'
        ]
                  
    def validate(self, data):
        # 1. Regras de Capacidade
        LIMITE_GLOBAL_CONSULTAS = 3
        LIMITE_GLOBAL_PROCEDIMENTOS = 1
        
        instance = self.instance

        tipo_agendamento = data.get('tipo_agendamento') or (getattr(instance, 'tipo_agendamento', None))
        inicio = data.get('data_hora_inicio') or (getattr(instance, 'data_hora_inicio', None))
        fim = data.get('data_hora_fim') or (getattr(instance, 'data_hora_fim', None))
        sala_selecionada = data.get('sala') or (getattr(instance, 'sala', None))
        agendamento_id = instance.pk if instance else None

        if not inicio or not fim:
            return data

        request = self.context.get('request')
        usuario_logado = request.user if request else None

        # =========================================================
        # TRAVA ATUALIZADA: LIMITE DE PASSADO (De 2h para 48h)
        # =========================================================
        agora = timezone.now()
        limite_tolerancia_passado = agora - timedelta(hours=48)
        
        if inicio < limite_tolerancia_passado:
            # Se NÃO for admin, exibe a instrução inteligente. Se FOR admin, passa direto.
            if not usuario_logado or getattr(usuario_logado, 'cargo', '') != 'admin':
                raise serializers.ValidationError({
                    "data_hora_inicio": "⚠️ Limite de Data Retroativa excedido (48 horas).\n👉 O que fazer: Corrija a data selecionada ou, se for um registro antigo necessário, solicite a um usuário Administrador para realizar este lançamento."
                })

        # --- A MÁGICA DOS MILISSEGUNDOS (Tolerância de 1 segundo) ---
        inicio_tolerancia = inicio + timedelta(seconds=1)
        fim_tolerancia = fim - timedelta(seconds=1)

        is_encaixe_req = self.initial_data.get('is_encaixe', False)
        is_encaixe = str(is_encaixe_req).lower() in ['true', '1', 't']

        if usuario_logado and getattr(usuario_logado, 'cargo', '') == 'admin':
            is_encaixe = True

        # 2. Validação Básica de Campos
        if tipo_agendamento == 'Consulta':
            medico = data.get('medico', getattr(instance, 'medico', None))
            if not medico: 
                raise serializers.ValidationError({"medico": "⚠️ Selecione um médico para poder salvar a consulta."})
            if 'procedimento' in data: 
                data['procedimento'] = None
            
        elif tipo_agendamento == 'Procedimento':
            procedimento = data.get('procedimento', getattr(instance, 'procedimento', None))
            if not procedimento: 
                raise serializers.ValidationError({"procedimento": "⚠️ Selecione qual o procedimento ou exame será realizado."})
            
            if 'especialidade' in data: data['especialidade'] = None
            
            if not sala_selecionada and not instance:
                sala_exame = Sala.objects.filter(e_sala_exame=True).first()
                if sala_exame:
                    data['sala'] = sala_exame
                    sala_selecionada = sala_exame
                else:
                    raise serializers.ValidationError({"sala": "⚠️ O sistema não encontrou uma Sala de Exames cadastrada.\n👉 O que fazer: Vá no painel Admin e crie uma Sala marcando a opção 'É sala de exames?'."})

        # 3. Validação de Conflito de Sala (Mensagem Inteligente)
        # O conflito é sempre calculado (mesmo com is_encaixe=True) para sabermos,
        # ao final, se este agendamento realmente sobrepôs outro — é isso que vira
        # o valor persistido de "is_encaixe", não a flag crua da requisição.
        conflito_sala_existe = False
        if sala_selecionada:
            conflito_sala = Agendamento.objects.filter(
                sala=sala_selecionada,
                data_hora_inicio__lt=fim_tolerancia,
                data_hora_fim__gt=inicio_tolerancia
            ).exclude(status__in=['Cancelado', 'Não Compareceu'])

            if agendamento_id:
                conflito_sala = conflito_sala.exclude(pk=agendamento_id)

            conflito_sala_existe = conflito_sala.exists()

            if conflito_sala_existe and not is_encaixe:
                raise serializers.ValidationError({
                    "sala": f"⚠️ Choque de Horário: A sala '{sala_selecionada.nome}' já tem um paciente neste mesmo horário.\n👉 O que fazer: Mude o horário do agendamento ou ligue a chave 'Forçar Encaixe' no formulário para sobrepor."
                })

        # 4. Validação de Limite Global (Mensagem Inteligente)
        # Mesma lógica: calculamos sempre, e só bloqueamos se not is_encaixe.
        conflitos_globais = Agendamento.objects.filter(
            data_hora_inicio__lt=fim_tolerancia,
            data_hora_fim__gt=inicio_tolerancia,
            tipo_agendamento=tipo_agendamento
        ).exclude(status__in=['Cancelado', 'Não Compareceu'])

        if agendamento_id:
            conflitos_globais = conflitos_globais.exclude(pk=agendamento_id)

        qtd_existente = conflitos_globais.count()

        if tipo_agendamento == 'Consulta':
            limite_excedido = qtd_existente >= LIMITE_GLOBAL_CONSULTAS
        elif tipo_agendamento == 'Procedimento':
            limite_excedido = qtd_existente >= LIMITE_GLOBAL_PROCEDIMENTOS
        else:
            limite_excedido = False

        if limite_excedido and not is_encaixe:
            if tipo_agendamento == 'Consulta':
                raise serializers.ValidationError({
                    "non_field_errors": f"⚠️ Fila Cheia: O médico já possui {LIMITE_GLOBAL_CONSULTAS} consultas marcadas neste exato momento.\n👉 O que fazer: Agende para o próximo horário disponível ou ative a chave 'Forçar Encaixe' se for urgência."
                })
            elif tipo_agendamento == 'Procedimento':
                raise serializers.ValidationError({
                    "non_field_errors": f"⚠️ Fila Cheia: Já existe {LIMITE_GLOBAL_PROCEDIMENTOS} procedimento sendo realizado neste momento.\n👉 O que fazer: Selecione outro horário livre na agenda ou ative a chave 'Forçar Encaixe'."
                })

        # O valor salvo reflete se este agendamento REALMENTE sobrepôs sala/capacidade,
        # e não apenas se a flag "is_encaixe" veio marcada na requisição (que também é
        # forçada para True silenciosamente quando o usuário é admin, ver acima).
        data['is_encaixe'] = conflito_sala_existe or limite_excedido

        return data

class SalaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sala
        # ADICIONADOS: 'e_sala_exame' e 'equipamentos'
        fields = ['id', 'nome', 'descricao', 'e_sala_exame', 'equipamentos']