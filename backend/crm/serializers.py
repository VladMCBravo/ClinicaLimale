# backend/crm/serializers.py

from rest_framework import serializers
from .models import Ciclo, AnaliseComportamental, ProximaAcao
from django.utils import timezone
from django.apps import apps # Usado para evitar erro de importação circular
from .models import Ciclo
from datetime import date
import logging

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
            'id', 'ciclo', 'descricao', 'data_alvo', 'status', 
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
    paciente_whatsapp = serializers.CharField(source='paciente.telefone_celular', read_only=True)
    proxima_acao_imediata = serializers.SerializerMethodField()
    dados_agendamento = serializers.SerializerMethodField() # Onde a mágica acontece
    paciente_foto = serializers.SerializerMethodField() # <--- Definido aqui para evitar o erro
    # NOVOS CAMPOS PARA O ALERTA
    idade_gestacional = serializers.SerializerMethodField()
    alerta_clinico = serializers.SerializerMethodField()
    
    class Meta:
        model = Ciclo
        fields = [
            'id', 
            'tipo',             # Gestação, Cardio...
            'fase_atual',       # F1, F2... (Define a coluna)
            'paciente_id', 
            'paciente_nome',
            'paciente_whatsapp',
            'paciente_foto',
            'receita_acumulada', # Para o "Painel Executivo"
            'data_inicio',
            'proxima_acao_imediata',
            'dados_agendamento',
            'idade_gestacional',
            'alerta_clinico'
        ]

    def get_paciente_foto(self, obj):
        return None

    def get_idade_gestacional(self, obj):
        try:
            # 1. Busca a DUM (Prioridade: Paciente > Ciclo)
            dum = obj.paciente.dum if obj.paciente else None
            if not dum: dum = getattr(obj, 'data_dum', None)
            
            # Validações básicas
            if not dum or dum.year < 2000: return None

            # 2. Cálculo Matemático
            from datetime import date
            hoje = date.today()
            dias_totais = (hoje - dum).days
            
            if dias_totais < 0: return None

            semanas = dias_totais // 7
            dias_restantes = dias_totais % 7
            
            # 3. FORMATAÇÃO PRECISA (AQUI ESTÁ A MUDANÇA)
            # Retorna ex: "8s + 5d" ou "12s + 0d"
            return f"{semanas}s + {dias_restantes}d"
            
        except:
            return None
        
    # 2. CORREÇÃO DO ALERTA (Morfologico, etc) NO CARD
    def get_alerta_clinico(self, obj):
        """
        LÓGICA DA TABELA MESTRA (PDF)
        Define qual exame oferecer baseado na DUM.
        """
        if obj.tipo != 'GESTACAO':
            return None

        # --- REPETIR A LÓGICA DE BUSCAR A DUM CERTA ---
        dum = obj.paciente.dum if obj.paciente else None
        if not dum: dum = getattr(obj, 'data_dum', None)
        
        if not dum or dum.year < 2000:
            return None
        
        from datetime import date
        hoje = date.today()
        dias_totais = (hoje - dum).days
        semanas = dias_totais // 7
        # ----------------------------------------------
        
        sugestao = ""
        prioridade = "normal" # normal, alta, urgente

        # Regras extraídas do PDF
        if semanas < 6:
            sugestao = "Fase Inicial: Orientação (Exame precoce)"
        elif 6 <= semanas <= 10:
            sugestao = "Ideal: Obstétrico Simples (Datação)"
        elif 11 <= semanas < 14:
            sugestao = "🚨 PRIORIDADE: Morfológico 1º Trimestre"
            prioridade = "alta"
        elif 14 <= semanas < 20:
            sugestao = "Pós-Morfo: Obstétrico Simples"
        elif 20 <= semanas <= 24:
            sugestao = "🚨 URGENTE: Morfológico 2º Trimestre"
            prioridade = "urgente"
        elif 25 <= semanas <= 28:
            sugestao = "Transição: Morfo 2T (se não fez) ou Eco Fetal"
            prioridade = "alta"
        elif 29 <= semanas < 34:
            sugestao = "Seguimento: Obstétrico com Doppler"
        elif 34 <= semanas:
            sugestao = "Reta Final: Doppler Quinzenal/Semanal"
            prioridade = "alta"

        return {
            "semanas": semanas,
            "texto": sugestao,
            "prioridade": prioridade
        }

    def get_proxima_acao_imediata(self, obj):
        acao = obj.acoes.filter(status='PENDENTE').order_by('data_alvo').first()
        if acao:
            return {
                "descricao": acao.descricao,
                "data_alvo": acao.data_alvo,
                "atrasada": acao.data_alvo < timezone.now().date()
            }
        return None

    def get_dados_agendamento(self, obj):
        try:
            # 1. Busca agendamentos vinculados a este ciclo
            hoje = timezone.now().date()
            
            # Tenta acessar via related_name='agendamentos' (definido no model Agendamento)
            if hasattr(obj, 'agendamentos'):
                qs = obj.agendamentos.all()
            else:
                return None

            if not qs.exists():
                return None

            # Prioridade: Futuros > Hoje > Passado mais recente
            agendamento = qs.filter(data_hora_inicio__date__gte=hoje).order_by('data_hora_inicio').first()
            
            # Se não tiver futuro, pega o último realizado (para cards em F3/F4)
            if not agendamento:
                agendamento = qs.order_by('-data_hora_inicio').first()

            if not agendamento:
                return None

            # 2. Busca Status Financeiro de forma segura
            status_pag = "Pendente"
            try:
                # Tenta acesso direto se tiver relacionamento
                if hasattr(agendamento, 'pagamento'):
                    status_pag = agendamento.pagamento.status
                # Tenta acesso reverso padrão do Django
                elif hasattr(agendamento, 'pagamento_set'):
                    pag = agendamento.pagamento_set.first()
                    if pag: status_pag = pag.status
                # Última tentativa: busca direta no banco
                else:
                    Pagamento = apps.get_model('faturamento', 'Pagamento')
                    pag = Pagamento.objects.filter(agendamento=agendamento).first()
                    if pag: status_pag = pag.status
            except Exception:
                pass # Mantém como Pendente se der erro

            # 3. Nome do Procedimento
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
            # Log silencioso para não quebrar a API inteira por um card com erro
            print(f"Erro ao processar card {obj.id}: {e}")
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
    # Campo DUM formatado para o Frontend
    data_dum = serializers.DateField(format="%d/%m/%Y", read_only=True)
    # Novo campo: Idade Gestacional Calculada
    idade_gestacional = serializers.SerializerMethodField()
    
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
            'data_dum',
            'idade_gestacional', # <--- AQUI ESTAVA O ERRO (Adicionados)
            # Blocos de Dados
            'comportamento',
            'acoes',        # Lista de tarefas futuras e passadas
            'agendamentos', # Histórico de consultas/procedimentos deste ciclo
            'exames',       # Resultados e arquivos vinculados
        ]

    # --- O CÁLCULO REAL E SEGURO DA IDADE GESTACIONAL ---
    def get_idade_gestacional(self, obj):
        try:
            # 1. Prioridade Total: DUM do Paciente (Fonte da Verdade)
            dum = obj.paciente.dum if obj.paciente else None
            
            # 2. Fallback: Se não tiver no paciente, tenta do Ciclo
            if not dum:
                dum = getattr(obj, 'data_dum', None)

            # 3. Se não tiver data, retorna vazio
            if not dum:
                return None

            # 4. Proteção contra datas antigas (Bug de 1529)
            if dum.year < 2000:
                return "Data Inválida (Antiga)"

            # 5. O Cálculo Matemático
            from datetime import date
            hoje = date.today()
            dias_totais = (hoje - dum).days
            
            if dias_totais < 0:
                return "Data Futura"

            semanas = dias_totais // 7
            dias_restantes = dias_totais % 7
            
            return f"{semanas} semanas + {dias_restantes} dias"

        except Exception as e:
            print(f"[ERRO SERIALIZER] Calculo IG: {e}")
            return None
    # ----------------------------
    
    def get_comportamento(self, obj):
        """Busca o perfil comportamental do paciente vinculado"""
        try:
            if hasattr(obj.paciente, 'perfil_comportamental'):
                return AnaliseComportamentalSerializer(obj.paciente.perfil_comportamental).data
            return None
        except Exception:
            return None

    def get_agendamentos(self, obj):
        try:
            from agendamentos.serializers import AgendamentoSerializer
            if hasattr(obj, 'agendamentos'):
                return AgendamentoSerializer(obj.agendamentos.all().order_by('-data_hora_inicio'), many=True).data
            return []
        except ImportError:
            return []

    def get_exames(self, obj):
        try:
            from exames.serializers import ExameSerializer
            if hasattr(obj, 'exames_realizados'):
                return ExameSerializer(obj.exames_realizados.all().order_by('-data_exame'), many=True).data
            return []
        except:
            return []
    
    def update(self, instance, validated_data):
        # 1. Atualiza os dados normais do Ciclo
        instance = super().update(instance, validated_data)

        # 2. SALVA A DUM NO PACIENTE (Correção do Bug)
        nova_dum = self.initial_data.get('dum') or self.initial_data.get('data_dum')

        if nova_dum and instance.paciente:
            print(f"🔄 CRM Atualizando DUM do Paciente {instance.paciente.nome_completo}: {nova_dum}")
            instance.paciente.dum = nova_dum
            instance.paciente.save() 
        
        return instance