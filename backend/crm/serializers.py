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
    alerta_whatsapp = serializers.SerializerMethodField()
    alerta_operacional = serializers.SerializerMethodField()

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
            'alerta_clinico',
            'alerta_whatsapp' # <--- ADICIONE ESTA LINHA
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

    def get_alerta_operacional(self, obj):
        from django.utils import timezone
        
        # 1. ALERTA DE DUM FALTANTE (Mais inteligente)
        # Agora ele procura por palavras-chave em vez de um texto exato
        tipo_upper = (obj.tipo or '').upper()
        e_obstetrico = 'GESTA' in tipo_upper or 'OBST' in tipo_upper or 'MORF' in tipo_upper or 'FETAL' in tipo_upper
        
        if e_obstetrico:
            dum = obj.paciente.dum if obj.paciente and hasattr(obj.paciente, 'dum') and obj.paciente.dum else getattr(obj, 'data_dum', None)
            
            if not dum:
                return {"cor": "#d32f2f", "icone": "🚨", "texto": "Pedir DUM urgente!"}
            
            # ALERTA DE NASCIMENTO
            from datetime import date
            if (date.today() - dum).days >= 280:
                return {"cor": "#9c27b0", "icone": "👶", "texto": "Nasceu? Parabenizar e encerrar!"}

        # 2. ALERTA DE RESGATE (F5)
        if obj.fase_atual == 'F5':
            return {"cor": "#ef6c00", "icone": "🔄", "texto": "Faltou/Cancelou. Reagendar hoje!"}

        # 3. ALERTA DE LEAD FRIO (F1)
        if obj.fase_atual == 'F1':
            dias_na_base = (timezone.now() - obj.data_inicio).days
            # Coloquei >= 0 só para você conseguir ver funcionando hoje!
            # Na vida real da clínica, mude o 0 para 2 (ou seja, 48 horas de geladeira).
            if dias_na_base >= 0: 
                return {"cor": "#0288d1", "icone": "❄️", "texto": f"Lead Frio ({dias_na_base} dias). Puxar conversa!"}

        # 4. NOVO: ALERTA DE PÓS-VENDA (F3 - Pós Exame)
        if obj.fase_atual == 'F3':
             return {"cor": "#2e7d32", "icone": "⭐", "texto": "Pedir avaliação no Google e Feedback"}

        return None

    # 2. CORREÇÃO DO ALERTA (Morfologico, etc) NO CARD
    def get_alerta_clinico(self, obj):
        dados = obj.get_dados_gestacionais()
        if not dados:
            return None
            
        semanas = dados['semanas']
        dias = dados['dias']
        
        sugestao = ""
        prioridade = "normal"

        # Regras atualizadas exatamente conforme o PDF da Tabela Mestra
        if semanas < 6:
            sugestao = "1 Orientação (Fase inicial)"
        elif 6 <= semanas <= 10:
            sugestao = "1 Obstétrico simples"
        elif 11 <= semanas <= 13: # Cobre 11 a 13+6
            sugestao = "🚨 1 Morfológico 1º Tri"
            prioridade = "alta"
        elif 14 <= semanas <= 19:
            sugestao = "1 Obstétrico simples (Pós-Morfo)"
        elif 20 <= semanas <= 23:
            sugestao = "🚨 1 Morfológico 2º Tri"
            prioridade = "urgente"
        elif semanas == 24:
            sugestao = "🚨 1 Morfo 2º Tri | 2 Eco Fetal"
            prioridade = "urgente"
        elif 25 <= semanas <= 28:
            # Texto compactado para caber no layout sem quebrar o card
            sugestao = "Morfo 2T (se faltar) OU Obst. c/ Doppler | 2 Eco | 3 US 4D"
            prioridade = "alta"
        elif 29 <= semanas <= 33: # O PDF vai de 29-32 e pula pra >=34. Cobrimos a 33 aqui.
            sugestao = "1 Obst. c/ Doppler | 2 Eco (se faltar) | 3 US 4D"
        elif semanas >= 34:
            sugestao = "1 Obstétrico c/ Doppler (15d ou semanal)"
            prioridade = "alta"

        return {
            "semanas": semanas,
            "dias": dias,
            "texto": sugestao,
            "prioridade": prioridade
        }
        
    def get_alerta_whatsapp(self, obj):
        dados = obj.get_dados_gestacionais()
        if not dados: return None

        dum = obj.paciente.dum if obj.paciente and hasattr(obj.paciente, 'dum') and obj.paciente.dum else getattr(obj, 'data_dum', None)
        if not dum or dum.year < 2000: return None

        from datetime import date, timedelta
        hoje = date.today()
        semanas_atuais = dados['semanas']

        proximo_exame = ""
        semana_alvo = 0
        tipo_alerta = None
        msg = ""

        # --- A MATEMÁTICA BASEADA NA TABELA MESTRA ---
        if semanas_atuais < 11:
            proximo_exame = "Morfológico de 1º Trimestre"
            semana_alvo = 12 
        elif 11 <= semanas_atuais < 14: 
            proximo_exame = "Obstétrico Simples (Avaliação Pós-Morfo)"
            semana_alvo = 16 
        elif 14 <= semanas_atuais < 20:
            proximo_exame = "Morfológico de 2º Trimestre"
            semana_alvo = 22 
        elif 20 <= semanas_atuais < 24:
            proximo_exame = "Ecocardiograma Fetal e Doppler"
            semana_alvo = 26 
        elif 24 <= semanas_atuais < 29:
            proximo_exame = "Obstétrico com Doppler e Ultrassom 4D"
            semana_alvo = 30 
        elif 29 <= semanas_atuais < 34:
            proximo_exame = "Obstétrico com Doppler (Reta Final)"
            semana_alvo = 35 
        # --- NOVO: A MENSAGEM DE APOIO (38 SEMANAS) ---
        elif 38 <= semanas_atuais <= 39:
            primeiro_nome = obj.paciente.nome_completo.split(' ')[0]
            return {
                "dias_restantes": 0,
                "exame_alvo": "Parto / Reta Final",
                "tipo_alerta": "Mensagem de Apoio",
                "mensagem": f"Olá {primeiro_nome}! Aqui é da equipe da Clínica Limalé. Vimos que você está entrando na reta final da gestação e viemos apenas mandar boas energias! Que você tenha uma boa hora e que o bebê venha com muita saúde. Estamos na torcida por vocês! \u2764\ufe0f"
            }
        else:
            return None 

        data_ideal = dum + timedelta(weeks=semana_alvo)
        dias_para_ideal = (data_ideal - hoje).days

        if 13 <= dias_para_ideal <= 16:
            tipo_alerta = "15 Dias"
        elif 5 <= dias_para_ideal <= 8:
            tipo_alerta = "7 Dias"

        if not tipo_alerta:
            return None 

        primeiro_nome = obj.paciente.nome_completo.split(' ')[0]
        msg = f"Olá {primeiro_nome}, tudo bem? Aqui é da Clínica Limalé. Cuidando da sua gestação de perto, vimos que daqui a pouco você entra na fase ideal para realizar o seu {proximo_exame}. Como a agenda das doutoras costuma lotar, viemos te avisar com antecedência! Quer deixar o melhor horário garantido?"

        return {
            "dias_restantes": dias_para_ideal,
            "exame_alvo": proximo_exame,
            "tipo_alerta": tipo_alerta,
            "mensagem": msg
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
        dados = obj.get_dados_gestacionais()
        if not dados:
            # Retorna as mensagens de aviso caso não tenha data
            dum = obj.paciente.dum if obj.paciente and hasattr(obj.paciente, 'dum') else getattr(obj, 'data_dum', None)
            if dum and dum.year < 2000: return "Data Inválida (Antiga)"
            if dum and (date.today() - dum).days < 0: return "Data Futura"
            return None
            
        return f"{dados['semanas']} semanas + {dados['dias']} dias"
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
        
        # 3. SALVA OS DADOS DE ENGAJAMENTO/MARKETING
        comportamento_data = self.initial_data.get('comportamento')
        if comportamento_data and instance.paciente:
            from .models import AnaliseComportamental
            # Pega o perfil existente ou cria um novo se for um paciente antigo que não tinha
            comp, created = AnaliseComportamental.objects.get_or_create(paciente=instance.paciente)
            
            # Atualiza apenas os campos que vieram no payload
            if 'segue_instagram' in comportamento_data:
                comp.segue_instagram = comportamento_data['segue_instagram']
            if 'avaliou_google' in comportamento_data:
                comp.avaliou_google = comportamento_data['avaliou_google']
            if 'indicou_outros' in comportamento_data:
                comp.indicou_outros = comportamento_data['indicou_outros']
            if 'origem_aquisicao' in comportamento_data:
                comp.origem_aquisicao = comportamento_data['origem_aquisicao']
            
            comp.save()
            print(f"📈 Dados de engajamento atualizados para: {instance.paciente.nome_completo}")
        
        return instance