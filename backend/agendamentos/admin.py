# backend/agendamentos/admin.py - VERSÃO FINAL UNIFICADA (COM EXAMES)

from django.contrib import admin
from .models import Agendamento, Sala, BloqueioAgenda, ConfiguracaoExame, DiaFuncionamentoExame
from django.utils import timezone

# --- 1. ADMIN DE SALA (ATUALIZADO PARA EXAMES) ---
@admin.register(Sala)
class SalaAdmin(admin.ModelAdmin):
    # Agora mostramos os equipamentos para você poder editar as tags
    list_display = ('nome', 'e_sala_exame', 'equipamentos') 
    search_fields = ('nome', 'equipamentos')
    list_filter = ('e_sala_exame',)
    ordering = ('nome',)

# --- 2. ADMIN DE CONFIGURAÇÃO (O "CÉREBRO") ---

# A. Tabela embutida para os dias
class DiaFuncionamentoExameInline(admin.TabularInline):
    model = DiaFuncionamentoExame
    extra = 1 # Deixa uma linha em branco para facilitar

@admin.register(ConfiguracaoExame)
class ConfiguracaoExameAdmin(admin.ModelAdmin):
    list_display = ('get_procedimento_nome', 'duracao_padrao', 'equipamento_obrigatorio')
    search_fields = ('procedimento__descricao', 'equipamento_obrigatorio')
    autocomplete_fields = ['procedimento', 'modelo_laudo_padrao']
    
    # B. Acoplamos a tabela de dias aqui dentro
    inlines = [DiaFuncionamentoExameInline] 

    def get_procedimento_nome(self, obj):
        return obj.procedimento.descricao
    get_procedimento_nome.short_description = 'Procedimento'

# --- 3. ADMIN DE AGENDAMENTO (MANTENDO SUA ORGANIZAÇÃO VISUAL) ---
@admin.register(Agendamento)
class AgendamentoAdmin(admin.ModelAdmin):
    list_display = (
        'paciente',
        'data_formatada',
        'horario_formatado',
        'tipo_agendamento',
        'quem_agendou',
        'sala',
        'status',
    )
    
    list_filter = ('status', 'tipo_agendamento', 'medico', 'sala', 'data_hora_inicio')
    search_fields = ('paciente__nome_completo', 'medico__first_name', 'medico__last_name', 'observacoes')
    
    # Adicionado para facilitar a busca se tiver muitos pacientes/médicos
    autocomplete_fields = ['paciente', 'medico'] 

    fieldsets = (
        ('Informações Principais', {
            'fields': (
                'paciente',
                'sala',
                'status',
                'data_hora_inicio',
                'data_hora_fim'
            )
        }),
        ('Classificação do Agendamento', {
            'fields': (
                'tipo_agendamento',
                'medico',
                'especialidade',
                'procedimento', # <-- Importante para o novo fluxo
            )
        }),
        ('Detalhes do Atendimento', {
            'fields': (
                'tipo_atendimento',
                'plano_utilizado',
                'modalidade',
                'tipo_visita',
                'observacoes',
            )
        }),
        ('Telemedicina (Opcional)', {
            'fields': ('link_telemedicina', 'id_sala_telemedicina'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('link_telemedicina', 'id_sala_telemedicina')

    def data_formatada(self, obj):
        if obj.data_hora_inicio:
            return timezone.localtime(obj.data_hora_inicio).strftime('%d/%m/%Y')
        return "N/A"
    data_formatada.admin_order_field = 'data_hora_inicio'
    data_formatada.short_description = 'Data'

    def horario_formatado(self, obj):
        if obj.data_hora_inicio:
            return timezone.localtime(obj.data_hora_inicio).strftime('%H:%M')
        return "N/A"
    horario_formatado.admin_order_field = 'data_hora_inicio'
    horario_formatado.short_description = 'Horário'

    def quem_agendou(self, obj):
        # 1. Verifica se foi o Chatbot lendo a assinatura invisível nas observações
        if obj.observacoes and 'Bot WhatsApp' in obj.observacoes:
            return '🤖 Chatbot Leônidas'
        
        # 2. Descobre quem estava logado no painel através do vínculo financeiro
        try:
            # O hasattr evita erro caso a consulta não tenha gerado cobrança
            if hasattr(obj, 'pagamento') and obj.pagamento and obj.pagamento.registrado_por:
                usuario = obj.pagamento.registrado_por
                nome = usuario.first_name or usuario.username
                return f"💻 Painel ({nome.title()})"
        except Exception:
            pass
            
        # 3. Fallback caso seja um agendamento importado/legado sem financeiro
        return '💻 Sistema'
    
    quem_agendou.short_description = 'Quem Agendou?'

# --- 4. ADMIN DE BLOQUEIOS (ADICIONADO TAMBÉM) ---
@admin.register(BloqueioAgenda)
class BloqueioAgendaAdmin(admin.ModelAdmin):
    list_display = ('medico', 'data_inicio', 'data_fim', 'motivo')
    list_filter = ('medico',)