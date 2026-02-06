# backend/crm/serializers.py

from rest_framework import serializers
from .models import Ciclo, AnaliseComportamental, ProximaAcao
from agendamentos.serializers import AgendamentoSerializer
from exames.serializers import ExameSerializer
from pacientes.models import Paciente
from usuarios.models import CustomUser

# --- 1. COMPORTAMENTO E AÇÕES (BLOCOS MENORES) ---

class AnaliseComportamentalSerializer(serializers.ModelSerializer):
    """
    Exibe o 'Psicológico' da paciente.
    Conecta com o conceito: "Onde dói e como converte".
    """
    class Meta:
        model = AnaliseComportamental
        fields = ['id', 'perfil_emocional', 'principal_objecao', 'observacoes_internas']

class ProximaAcaoSerializer(serializers.ModelSerializer):
    """
    Tarefas do CRM.
    """
    responsavel_nome = serializers.CharField(source='responsavel.get_full_name', read_only=True)

    class Meta:
        model = ProximaAcao
        fields = [
            'id', 'descricao', 'data_alvo', 'status', 
            'agendamento_vinculado', 'responsavel', 'responsavel_nome',
            'criado_em'
        ]

# --- 2. SERIALIZER KANBAN (LEVE - PARA A TELA DE CARDS) ---

class CicloKanbanSerializer(serializers.ModelSerializer):
    """
    Serializer otimizado para a visualização em Colunas (Kanban).
    Traz apenas o essencial para decisão rápida.
    """
    paciente_nome = serializers.CharField(source='paciente.nome_completo', read_only=True)
    paciente_whatsapp = serializers.CharField(source='paciente.telefone_celular', read_only=True)
    paciente_foto = serializers.SerializerMethodField() # Se tiver foto no futuro
    
    # Traz a próxima ação mais urgente para exibir no Card (ex: "Ligar Amanhã")
    proxima_acao_imediata = serializers.SerializerMethodField()

    class Meta:
        model = Ciclo
        fields = [
            'id', 
            'tipo',             # Gestação, Cardio...
            'fase_atual',       # F1, F2... (Define a coluna)
            'paciente_id', 
            'paciente_nome',
            'paciente_whatsapp',
            'receita_acumulada', # Para o "Painel Executivo"
            'data_inicio',
            'proxima_acao_imediata',
            'paciente_foto'
        ]

    def get_proxima_acao_imediata(self, obj):
        """Retorna a tarefa pendente mais próxima (Regra de Ouro)"""
        acao = obj.acoes.filter(status='PENDENTE').order_by('data_alvo').first()
        if acao:
            return {
                "descricao": acao.descricao,
                "data": acao.data_alvo,
                "atrasada": acao.data_alvo < serializers.datetime.date.today()
            }
        return None

    def get_paciente_foto(self, obj):
        # Placeholder. No futuro pode conectar com Avatar do usuário
        return None

# --- 3. SERIALIZER DETALHADO (PESADO - PARA A FICHA DO CICLO) ---

class CicloDetalheSerializer(serializers.ModelSerializer):
    """
    Visão 360º do Ciclo. 
    Quando o médico clica no card, ele vê TUDO o que aconteceu nesta gestação.
    """
    paciente_nome = serializers.CharField(source='paciente.nome_completo', read_only=True)
    # --- DADOS ANINHADOS (Carregados sob demanda) ---
    comportamento = serializers.SerializerMethodField()
    agendamentos = serializers.SerializerMethodField()
    exames = serializers.SerializerMethodField()
    acoes = ProximaAcaoSerializer(many=True, read_only=True)
    
    # Trazemos o histórico filtrado por ESTE ciclo
    agendamentos = AgendamentoSerializer(many=True, read_only=True)
    exames = ExameSerializer(many=True, read_only=True, source='exames_realizados')
    acoes = ProximaAcaoSerializer(many=True, read_only=True)

    class Meta:
        model = Ciclo
        fields = [
            'id', 
            'tipo', 
            'fase_atual', 
            'status',
            'paciente_id', 
            'paciente_nome',
            'receita_acumulada', 
            'qtd_atendimentos',
            'data_inicio',
            'responsavel',
            # Blocos de Dados
            'comportamento',
            'acoes',        # Lista de tarefas futuras e passadas
            'agendamentos', # Histórico de consultas/procedimentos deste ciclo
            'exames',       # Resultados e arquivos vinculados
        ]

    def get_comportamento(self, obj):
        """Busca o perfil comportamental do paciente vinculado"""
        try:
            # Verifica se o paciente tem perfil (related_name='perfil_comportamental')
            if hasattr(obj.paciente, 'perfil_comportamental'):
                return AnaliseComportamentalSerializer(obj.paciente.perfil_comportamental).data
            return None
        except Exception:
            return None

    def get_agendamentos(self, obj):
        """
        Importa o Serializer DENTRO da função para evitar Circular Import.
        Isso salva sua pele se o AgendamentoSerializer também usar coisas do CRM.
        """
        try:
            from agendamentos.serializers import AgendamentoSerializer
            # Ordena do mais recente para o mais antigo
            qs = obj.agendamentos.all().order_by('-data_hora_inicio')
            return AgendamentoSerializer(qs, many=True).data
        except ImportError:
            return []

    def get_exames(self, obj):
        """
        Tenta buscar exames vinculados.
        Se 'exames_realizados' não existir no Model, evita erro 500.
        """
        try:
            from exames.serializers import ExameSerializer
            # Opção A: Se você configurou o related_name='exames_realizados' no Model Exame
            if hasattr(obj, 'exames_realizados'):
                return ExameSerializer(obj.exames_realizados.all(), many=True).data
            
            # Opção B (Fallback Inteligente): Busca exames através dos agendamentos deste ciclo
            # "Me dê todos os exames cujos agendamentos pertencem a este ciclo"
            # return ExameSerializer(Exame.objects.filter(agendamento__ciclo=obj), many=True).data
            
            return [] 
        except ImportError:
            return []
        except Exception as e:
            print(f"Erro ao serializar exames: {e}")
            return []