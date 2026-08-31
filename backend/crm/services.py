# backend/crm/services.py

from django.db import transaction
from django.db.models import Sum, Count, F, Q, ExpressionWrapper, DecimalField
from django.db.models.functions import ExtractHour
from django.utils import timezone
from datetime import timedelta

# Imports de Models
from .models import Ciclo, ProximaAcao
# Usamos apps.get_model para evitar qualquer risco de erro de importação circular
from django.apps import apps

class CRMService:

    @staticmethod
    def analise_rentabilidade(macro_area_filtro=None):
        Agendamento = apps.get_model('agendamentos', 'Agendamento')
        
        # Filtro base
        queryset = Agendamento.objects.filter(status='Realizado')
        if macro_area_filtro:
            queryset = queryset.filter(ciclo__macro_area=macro_area_filtro)

        # 1. Extração do Turno via hora do agendamento
        # CORREÇÃO: Como o campo 'custo_por_exame' não existe no cadastro do Médico,
        # igualamos o lucro à receita por enquanto para não quebrar a tela.
        dados = queryset.annotate(
            hora=ExtractHour('data_hora_inicio'),
            receita=F('pagamento__valor'), 
            lucro_liquido=F('pagamento__valor') # Temporariamente igual à receita
        ).values('procedimento__descricao', 'hora', 'medico__nome').annotate(
            total_exames=Count('id'),
            receita_total=Sum('receita'),
            lucro_total=Sum('lucro_liquido')
        ).order_by('-lucro_total')
        
        # Formatar a saída para o React
        resultado_formatado = []
        for item in dados:
            turno = 'Manhã' if item['hora'] < 12 else 'Tarde' if item['hora'] < 18 else 'Noite'
            resultado_formatado.append({
                "exame": item['procedimento__descricao'],
                "turno": turno,
                "medico": item['medico__nome'],
                "exames_realizados": item['total_exames'],
                "rentabilidade": float(item['lucro_total'] or 0)
            })
            
        return resultado_formatado

    @staticmethod
    def mover_fase(ciclo_id, nova_fase, usuario_responsavel):
        """
        Move o card e dispara automações (ex: criar tarefa se faltar agendamento).
        """
        ciclo = Ciclo.objects.get(id=ciclo_id)
        fase_anterior = ciclo.fase_atual
        
        ciclo.fase_atual = nova_fase
        ciclo.save()
        
        # --- 🧹 NOVO: ELIMINADOR DE TAREFAS ZUMBIS ---
        if nova_fase == 'ENCERRADO':
            # Pega todas as ações pendentes deste ciclo e cancela de uma vez
            tarefas_canceladas = ciclo.acoes.filter(status='PENDENTE').update(status='CANCELADA')
            print(f"[CRM] {tarefas_canceladas} tarefas pendentes foram canceladas porque o Ciclo {ciclo.id} foi encerrado.")
            return ciclo # Retorna cedo, não precisa rodar o resto

        # --- AUTOMAÇÃO: ALERTA DE QUEDA ---
        # Se moveu para F2 (Conversão), mas não tem agendamento futuro, cria alerta.
        if nova_fase == 'F2':
            Agendamento = apps.get_model('agendamentos', 'Agendamento')
            
            tem_agendamento_futuro = Agendamento.objects.filter(
                ciclo=ciclo,
                status__in=['Agendado', 'Confirmado'],
                data_hora_inicio__gte=timezone.now()
            ).exists()
            
            if not tem_agendamento_futuro:
                CRMService.criar_acao(
                    ciclo=ciclo,
                    descricao="⚠️ Paciente em F2 sem agendamento futuro. Ligar urgente!",
                    data_alvo=timezone.now().date(),
                    responsavel=usuario_responsavel
                )

        return ciclo

    @staticmethod
    def atualizar_ltv(ciclo):
        """
        Recalcula a receita total DESTE ciclo somando os pagamentos.
        """
        Pagamento = apps.get_model('faturamento', 'Pagamento')
        
        # Soma todos os pagamentos (PAGOS) vinculados aos agendamentos deste ciclo
        total = Pagamento.objects.filter(
            agendamento__ciclo=ciclo, # <--- A mágica acontece aqui
            status='Pago'
        ).aggregate(total=Sum('valor'))['total'] or 0.00
        
        ciclo.receita_acumulada = total
        ciclo.save()
        return total

    @staticmethod
    def criar_acao(ciclo, descricao, data_alvo, responsavel=None):
        return ProximaAcao.objects.create(
            ciclo=ciclo,
            descricao=descricao,
            data_alvo=data_alvo,
            responsavel=responsavel or ciclo.responsavel,
            status='PENDENTE'
        )

    @staticmethod
    def processar_gatilho_agendamento(agendamento, criado=False):
        """
        Automação: O Agendamento empurra o Card no Kanban.
        """
        if not agendamento.ciclo:
            return

        ciclo = agendamento.ciclo
        
        # Regra 1: Confirmou Agendamento? Vai para F2 (se estiver em F1)
        if agendamento.status == 'Confirmado' and ciclo.fase_atual == 'F1':
            ciclo.fase_atual = 'F2'
            ciclo.save()
            print(f"[CRM] Ciclo {ciclo.id} movido para F2 via Agendamento {agendamento.id}")
        
        # Regra 2: Realizou o Exame? Vai para F3 (Pós-Exame/Retenção)
        if agendamento.status == 'Realizado' and ciclo.fase_atual in ['F1', 'F2']:
            ciclo.fase_atual = 'F3'
            ciclo.save()
            
            # Cria tarefa de Follow-up pós-exame para 2 dias depois
            CRMService.criar_acao(
                ciclo=ciclo,
                descricao="Pós-venda: Ligar para saber se gostou do atendimento",
                data_alvo=timezone.now().date() + timedelta(days=2)
            )
            print(f"[CRM] Ciclo {ciclo.id} movido para F3 e tarefa criada.")

    @staticmethod
    def obter_dados_kanban(usuario_filtro=None, macro_area_filtro=None):
        from .serializers import CicloKanbanSerializer
        
        # Mantendo o prefetch para performance
        queryset = Ciclo.objects.filter(status='ativo').select_related(
            'paciente',
            'responsavel',
            'paciente__perfil_comportamental'
        ).prefetch_related(
            'agendamentos',
            'acoes'
        ).order_by('-data_inicio')
        
        if usuario_filtro:
            queryset = queryset.filter(responsavel=usuario_filtro)
            
        # --- FILTRO DE MACRO ÁREA ---
        if macro_area_filtro:
            queryset = queryset.filter(macro_area=macro_area_filtro)
            
        serializer = CicloKanbanSerializer(queryset, many=True)
        data = serializer.data
        
        kanban_data = { "F1": [], "F2": [], "F3": [], "F4": [], "F5": [], "ENCERRADO": [] }
        
        for item in data:
            fase = item.get('fase_atual', 'F1')
            if fase in kanban_data:
                kanban_data[fase].append(item)
            else:
                kanban_data.setdefault(fase, []).append(item)
                
        return kanban_data
    
    @staticmethod
    def obter_painel_executivo(macro_area_filtro=None): # <-- Adicione o parâmetro aqui
        from faturamento.models import Pagamento, Despesa
        from .models import Ciclo, AnaliseComportamental
        from django.db.models import Sum, Count, Avg, Q

        hoje = timezone.now()
        mes_atual = hoje.month
        ano_atual = hoje.year

        # --- Base de Ciclos Filtrada ---
        ciclos_base = Ciclo.objects.all()
        if macro_area_filtro:
            ciclos_base = ciclos_base.filter(macro_area=macro_area_filtro)

        # 1. FINANCEIRO
        # Se for separar receita por macro área, precisamos filtrar os pagamentos 
        # vinculados aos agendamentos dos ciclos dessa macro área.
        query_pagamentos = Pagamento.objects.filter(
            status='Pago', 
            data_pagamento__month=mes_atual, 
            data_pagamento__year=ano_atual
        )
        if macro_area_filtro:
            query_pagamentos = query_pagamentos.filter(agendamento__ciclo__macro_area=macro_area_filtro)
            
        receita_mes = query_pagamentos.aggregate(total=Sum('valor'))['total'] or 0.00

        despesa_mes = Despesa.objects.filter(
            pago=True, 
            data_pagamento__month=mes_atual,
            data_pagamento__year=ano_atual
        ).aggregate(total=Sum('valor'))['total'] or 0.00

        lucro = float(receita_mes) - float(despesa_mes)
        margem_percentual = round((lucro / float(receita_mes) * 100), 1) if receita_mes > 0 else 0

        # 2. ESTRATÉGICO
        marketing = Despesa.objects.filter(
            Q(categoria__nome__icontains='Marketing') | 
            Q(categoria__nome__icontains='Anúncio') | 
            Q(categoria__nome__icontains='Tráfego') |
            Q(categoria__nome__icontains='Ads') |
            Q(categoria__nome__icontains='Google') |
            Q(categoria__nome__icontains='Instagram'),
            data_pagamento__month=mes_atual,
            pago=True
        ).aggregate(total=Sum('valor'))['total'] or 0.00
        
        novos_ciclos = ciclos_base.filter(data_inicio__month=mes_atual).count()
        cac = round(float(marketing) / novos_ciclos, 2) if novos_ciclos > 0 else 0.00
        
        ltv = ciclos_base.aggregate(media=Avg('receita_acumulada'))['media'] or 0.00

        # 3. FUNIL (Aplicando o filtro na base)
        ciclos_ativos = ciclos_base.filter(status='ativo')
        funil_stats = {
            'entradas': ciclos_ativos.filter(fase_atual='F1').count(),
            'conversao': ciclos_ativos.filter(fase_atual='F2').count(),
            'pos_exame': ciclos_ativos.filter(fase_atual='F3').count(),
            'retencao': ciclos_ativos.filter(fase_atual='F4').count(),
        }

        # 4. INTELIGÊNCIA DE DADOS
        objecoes_bd = AnaliseComportamental.objects.exclude(
            Q(principal_objecao__isnull=True) | Q(principal_objecao__exact='')
        )
        
        # Se filtramos por área, cruzamos o perfil comportamental com os ciclos
        if macro_area_filtro:
            objecoes_bd = objecoes_bd.filter(paciente__ciclos__macro_area=macro_area_filtro)
            
        objecoes_bd = objecoes_bd.values('principal_objecao').annotate(total=Count('id')).order_by('-total')

        motivos_perda = []
        for item in objecoes_bd:
            nome_amigavel = dict(AnaliseComportamental.OBJECOES_COMUNS).get(item['principal_objecao'], item['principal_objecao'])
            motivos_perda.append({"motivo": nome_amigavel, "quantidade": item['total']})

        origens_bd = AnaliseComportamental.objects.exclude(
            Q(origem_aquisicao__isnull=True) | Q(origem_aquisicao__exact='')
        )
        
        if macro_area_filtro:
            origens_bd = origens_bd.filter(paciente__ciclos__macro_area=macro_area_filtro)
            
        origens_bd = origens_bd.values('origem_aquisicao').annotate(total=Count('id')).order_by('-total')

        grafico_origem = []
        for item in origens_bd:
            nome_amigavel = dict(AnaliseComportamental.ORIGEM_CHOICES).get(item['origem_aquisicao'], item['origem_aquisicao'])
            grafico_origem.append({"origem": nome_amigavel, "quantidade": item['total']})

        return {
            "kpis_financeiros": {
                "receita_mensal": float(receita_mes),
                "margem_percentual": margem_percentual,
                "margem_liquida": float(lucro)
            },
            "kpis_estrategicos": {
                "cac": cac,
                "ltv": float(ltv)
            },
            "riscos": {
                "nivel_alto": ciclos_base.filter(nivel_risco='CRITICO').count()
            },
            "funil": funil_stats,
            "inteligencia_negocio": {
                "motivos_abandono": motivos_perda,
                "origem_captacao": grafico_origem
            }
        }
    
    @staticmethod
    def registrar_abandono_chatbot(telefone, motivo_abandono="silêncio pós-proposta", nome_lead="Lead (Bot)", dados_extraidos=None):
        """
        Invocado pelo Chatbot (Recovery Manager) quando um lead esfria.
        Move para F5 e anota a objeção para acionar a cadência comercial.
        """
        from pacientes.models import Paciente
        from .models import Ciclo, AnaliseComportamental
        from django.utils import timezone
        from datetime import timedelta
        
        telefone_limpo = ''.join(filter(str.isdigit, str(telefone)))
        
        # 1. Busca o paciente ou CRIA UM NOVO (Salva leads que abandonaram no meio)
        paciente = Paciente.objects.filter(telefone_celular=telefone_limpo).first()
        if not paciente:
            paciente = Paciente.objects.create(
                nome_completo=nome_lead,
                telefone_celular=telefone_limpo,
                data_nascimento='1900-01-01'
            )
            print(f"👤 Novo Lead criado pelo resgate do Bot: {nome_lead}")
            
        # 2. Busca o ciclo ativo ou CRIA UM NOVO
        ciclo = Ciclo.objects.filter(paciente=paciente, status='ativo').first()
        if not ciclo:
            ciclo = Ciclo.objects.create(
                paciente=paciente,
                tipo='OUTRO',
                fase_atual='F1',
                status='ativo'
            )
            
        # 3. Atualiza a análise comportamental
        comp, _ = AnaliseComportamental.objects.get_or_create(paciente=paciente)
        
        # Lógica de Objeção melhorada
        motivo_lower = motivo_abandono.lower()
        if "agenda" in motivo_lower or "horário" in motivo_lower:
            comp.principal_objecao = 'AGENDA'
        elif "preço" in motivo_lower or "valor" in motivo_lower or "caro" in motivo_lower:
            comp.principal_objecao = 'PRECO'
        elif "longe" in motivo_lower or "distância" in motivo_lower or "distancia" in motivo_lower:
            comp.principal_objecao = 'LOCALIZACAO'
        elif "parcela" in motivo_lower or "pagamento" in motivo_lower:
            comp.principal_objecao = 'FORMA_PAGAMENTO'
        elif "convênio" in motivo_lower or "plano" in motivo_lower:
            comp.principal_objecao = 'CONVENIO'
        else:
            comp.principal_objecao = 'CURIOSIDADE' # Assume que se esfriou do nada, era curiosidade
            
        # Alimenta o banco com os dados que o Bot conseguiu extrair (A IA faz esse trabalho)
        if dados_extraidos:
            if dados_extraidos.get('origem'): comp.origem_aquisicao = dados_extraidos['origem']
            if dados_extraidos.get('cidade'): comp.cidade_interesse = dados_extraidos['cidade']
            if dados_extraidos.get('bairro'): comp.bairro_interesse = dados_extraidos['bairro']
            if dados_extraidos.get('especialidade'): comp.especialidade_interesse = dados_extraidos['especialidade']

        comp.observacoes_internas = f"Abandono no Bot: {motivo_abandono}"
        comp.save()

        # 4. Move para Recuperação (F5) e dispara a automação
        if ciclo.fase_atual != 'F5':
            # Usa o método existente para mover a fase de forma segura
            CRMService.mover_fase(ciclo.id, 'F5', getattr(ciclo, 'responsavel', None))
            
            # Cria a cadência orientada ao motivo
            hoje = timezone.now().date()
            CRMService.criar_acao(ciclo, f"D0 (Bot): Lead parou de responder por {motivo_abandono}. Puxar conversa!", hoje)
            CRMService.criar_acao(ciclo, f"D1 (Bot): Mandar áudio curto ou gatilho de escassez.", hoje + timedelta(days=1))
            CRMService.criar_acao(ciclo, f"D3 (Bot): Fechar a porta de forma educada (Quebra de padrão).", hoje + timedelta(days=3))
            
            print(f"🤖 [CRM] Abandono de bot registrado para {paciente.nome_completo}. Cadência armada.")
            return True
            
        return False