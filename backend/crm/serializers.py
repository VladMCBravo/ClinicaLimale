# backend/crm/serializers.py

from rest_framework import serializers
from .models import Ciclo, AnaliseComportamental, ProximaAcao
from agendamentos.serializers import AgendamentoSerializer
from exames.serializers import ExameSerializer
from pacientes.models import Paciente
from usuarios.models import CustomUser
from django.utils import timezone
from django.apps import apps # Usado para evitar erro de importação circular

# --- 1. COMPORTAMENTO E AÇÕES (BLOCOS MENORES) ---

class AnaliseComportamentalSerializer(serializers.ModelSerializer):
    """
    Exibe o 'Psicológico' da paciente.
    Conecta com o conceito: "Onde dói e como converte".
    """
    class Meta:
        model = AnaliseComportamental
        fields = '__all__'

class ProximaAcaoSerializer(serializers.ModelSerializer):
    """
    Tarefas do CRM.
    """
    responsavel_nome = serializers.CharField(source='responsavel.get_full_name', read_only=True)
    atrasada = serializers.SerializerMethodField()

    class Meta:
        model = ProximaAcao
        fields = [
            'id', 'descricao', 'data_alvo', 'status', 
            'agendamento_vinculado', 'responsavel', 'responsavel_nome',
            'criado_em', 'atualizado_em', 'atrasada'
        ]

    def get_atrasada(self, obj):
        return obj.status == 'PENDENTE' and obj.data_alvo < timezone.now().date()

# --- 2. SERIALIZER KANBAN (LEVE - PARA A TELA DE CARDS) ---

class CicloKanbanSerializer(serializers.ModelSerializer):
    """
    Serializer otimizado para a visualização em Colunas (Kanban).
    Traz apenas o essencial para decisão rápida.
    """
    paciente_nome = serializers.CharField(source='paciente.nome_completo', read_only=True)
    proxima_acao_imediata = serializers.SerializerMethodField()
    dados_agendamento = serializers.SerializerMethodField() # Onde a mágica acontece
    
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
            'dados_agendamento',
            'paciente_foto',
        ]

    def get_proxima_acao_imediata(self, obj):
        """Retorna a tarefa pendente mais próxima (Regra de Ouro)"""
        acao = obj.acoes.filter(status='PENDENTE').order_by('data_alvo').first()
        if acao:
            return {
                "descricao": acao.descricao,
                "data": acao.data_alvo,
                "atrasada": acao.data_alvo < timezone.now().date()
            }
        return None

    def get_dados_agendamento(self, obj):
        try:
            # 1. Busca agendamentos vinculados a este ciclo
            # Prioridade: Futuros > Hoje > Passado mais recente
            hoje = timezone.now().date()
            
            qs = obj.agendamentos.all() # Usa o related_name='agendamentos' do seu model
            
            if not qs.exists():
                return None

            # Tenta pegar o próximo futuro
            agendamento = qs.filter(data_hora_inicio__date__gte=hoje).order_by('data_hora_inicio').first()
            
            # Se não tiver futuro, pega o último realizado (para cards em F3/F4)
            if not agendamento:
                agendamento = qs.order_by('-data_hora_inicio').first()

            if not agendamento:
                return None

            # 2. Busca o Pagamento de forma segura (Evita erro de Attribute)
            status_pag = "Pendente"
            try:
                # Tenta acesso direto (OneToOne)
                if hasattr(agendamento, 'pagamento'):
                    status_pag = agendamento.pagamento.status
                # Tenta acesso reverso (ForeignKey padrão)
                elif hasattr(agendamento, 'pagamento_set'):
                    pag = agendamento.pagamento_set.first()
                    if pag: status_pag = pag.status
                # Tenta buscar na unha se os anteriores falharem
                else:
                    Pagamento = apps.get_model('faturamento', 'Pagamento')
                    pag = Pagamento.objects.filter(agendamento=agendamento).first()
                    if pag: status_pag = pag.status
            except Exception:
                status_pag = "Erro"

            # 3. Monta o objeto visual
            procedimento_nome = "Consulta"
            if agendamento.procedimento:
                procedimento_nome = agendamento.procedimento.descricao
            elif agendamento.tipo_agendamento:
                procedimento_nome = agendamento.tipo_agendamento

            return {
                "data": agendamento.data_hora_inicio,
                "procedimento": procedimento_nome,
                "status_ag": agendamento.status,
                "status_pag": status_pag
            }
        except Exception as e:
            print(f"Erro ao serializar card CRM {obj.id}: {e}")
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