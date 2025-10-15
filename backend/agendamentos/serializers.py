# backend/agendamentos/serializers.py - VERSÃO FINAL E COMPLETA

from rest_framework import serializers
from .models import Agendamento, Sala
from pacientes.models import Paciente
from usuarios.models import CustomUser, Especialidade
from faturamento.models import Procedimento
from django.utils import timezone


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
    # <<-- NOVO CAMPO PARA EXIBIÇÃO DA SALA -->>
    sala_nome = serializers.CharField(source='sala.nome', read_only=True)

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
            'sala', # <-- Adiciona o ID da sala
            'sala_nome' # <-- Adiciona o nome da sala
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
    # <<-- NOVO CAMPO OBRIGATÓRIO PARA ESCRITA -->>
    # <<-- A MUDANÇA ESTÁ AQUI -->>
    # A sala agora não é obrigatória por padrão, permitindo requisições do chatbot.
    # A obrigatoriedade será verificada na lógica de validação abaixo.
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
        """
        Validação aprimorada:
        1. Procedimentos são automaticamente alocados na Sala 1.
        2. A sala é OBRIGATÓRIA para usuários do sistema (recepção/admin).
        3. A capacidade (3 consultas/1 proc) é verificada APENAS se uma sala for definida.
        """
        CAPACIDADE_CONSULTAS = 3
        CAPACIDADE_PROCEDIMENTOS = 1

        tipo_agendamento_atual = data.get('tipo_agendamento')
        inicio = data.get('data_hora_inicio')
        fim = data.get('data_hora_fim')
        # Removido daqui para ser definido após a lógica de procedimento
        # sala_atual = data.get('sala') 

        # --- REGRAS DE NEGÓCIO (Consulta vs Procedimento) ---
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
            
            # <<-- NOVA REGRA: ALOCAR PROCEDIMENTO NA SALA 1 -->>
            # Alinhando a busca com o nome correto do seu banco de dados.
            try:
                # Tenta primeiro o nome que sabemos que existe
                sala_procedimento = Sala.objects.get(nome__iexact="Consultório 1")
                data['sala'] = sala_procedimento
            except Sala.DoesNotExist:
                # Se falhar, tenta o nome alternativo
                try:
                    sala_procedimento = Sala.objects.get(nome__iexact="Sala 1")
                    data['sala'] = sala_procedimento
                except Sala.DoesNotExist:
                    # Se ambos falharem, lança o erro.
                    raise serializers.ValidationError({
                        "sala": "A sala de procedimentos ('Consultório 1' ou 'Sala 1') não foi encontrada no sistema. Por favor, cadastre-a."
                    })
            # <<-- FIM DA NOVA REGRA -->>
        
        # Pega o valor da sala APÓS a lógica de alocação de procedimento
        sala_atual = data.get('sala')

        # <<-- LÓGICA DE VALIDAÇÃO CONDICIONAL -->>
        request = self.context.get('request')
        usuario_logado = request.user if request and hasattr(request, 'user') else None

        # Passo 1: Verificar se a sala é obrigatória para este tipo de usuário.
        if usuario_logado and hasattr(usuario_logado, 'cargo') and usuario_logado.cargo in ['recepcao', 'admin']:
            # A verificação só se aplica se não for um procedimento (que já tem sala obrigatória)
            if tipo_agendamento_atual != 'Procedimento' and not sala_atual:
                raise serializers.ValidationError({"sala": "A seleção da sala é obrigatória para agendamentos feitos pelo painel."})

        # Passo 2: Se uma sala foi informada, validar a capacidade.
        if sala_atual:
            conflitos = Agendamento.objects.filter(
                data_hora_inicio__lt=fim, 
                data_hora_fim__gt=inicio,
                sala=sala_atual
            ).exclude(status='Cancelado')

            if self.instance:
                conflitos = conflitos.exclude(pk=self.instance.pk)

            consultas_na_sala = conflitos.filter(tipo_agendamento='Consulta').count()
            procedimentos_na_sala = conflitos.filter(tipo_agendamento='Procedimento').count()

            if tipo_agendamento_atual == 'Consulta' and consultas_na_sala >= CAPACIDADE_CONSULTAS:
                raise serializers.ValidationError(f"A capacidade máxima de {CAPACIDADE_CONSULTAS} consultas para esta sala e horário já foi atingida.")
            elif tipo_agendamento_atual == 'Procedimento' and procedimentos_na_sala >= CAPACIDADE_PROCEDIMENTOS:
                raise serializers.ValidationError(f"A capacidade máxima de {CAPACIDADE_PROCEDIMENTOS} procedimento(s) para esta sala e horário já foi atingida.")
        
        return data
    
# --- Serializer simples para listar as salas ---
class SalaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sala
        fields = ['id', 'nome', 'descricao']

# <<-- NOVA FUNÇÃO 1 -->>
def listar_agendamentos_futuros(cpf):
    """Busca no banco de dados todos os agendamentos futuros de um paciente."""
    try:
        paciente = Paciente.objects.get(cpf=cpf)
        agora = timezone.now()
        
        agendamentos = Agendamento.objects.filter(
            paciente=paciente,
            data_hora_inicio__gte=agora,
            status__in=['Agendado', 'Confirmado']
        ).order_by('data_hora_inicio')
        
        return list(agendamentos)
    except Paciente.DoesNotExist:
        return []

# <<-- NOVA FUNÇÃO 2 -->>
def cancelar_agendamento_service(agendamento_id):
    """Altera o status de um agendamento para 'Cancelado'."""
    try:
        agendamento = Agendamento.objects.get(id=agendamento_id)
        
        # Lógica de negócio: talvez não possa cancelar muito perto da data
        # Por enquanto, vamos permitir o cancelamento a qualquer momento
        
        agendamento.status = 'Cancelado'
        agendamento.save()
        
        # Opcional: cancelar também o pagamento associado
        if hasattr(agendamento, 'pagamento'):
            pagamento = agendamento.pagamento
            pagamento.status = 'Cancelado'
            pagamento.save()
            # Aqui entraria a lógica de estorno, se aplicável
            
        return {"status": "sucesso", "mensagem": "Agendamento cancelado com sucesso."}
    except Agendamento.DoesNotExist:
        return {"status": "erro", "mensagem": "Agendamento não encontrado."}