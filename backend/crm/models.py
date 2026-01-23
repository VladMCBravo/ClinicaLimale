# backend/crm/models.py

from django.db import models
from django.conf import settings
from pacientes.models import Paciente
from django.utils import timezone

class Ciclo(models.Model):
    """
    O Container de uma jornada.
    Ex: "Gestação 2026", "Acompanhamento Cardiológico".
    """
    TIPO_CHOICES = [
        ('GESTACAO', 'Gestação'),
        ('RN', 'Recém-Nascido'),
        ('PEDIATRIA', 'Pediatria'),
        ('CARDIO', 'Cardiologia'),
        ('OUTRO', 'Outro'),
    ]

    FASE_CHOICES = [
        ('F1', 'F1 - Entrada'),      # Contato inicial
        ('F2', 'F2 - Conversão'),    # Agendou
        ('F3', 'F3 - Pós-Exame'),    # Fez o exame -> Onde mora o LTV
        ('F4', 'F4 - Retenção'),     # Retornou para novo exame
        ('ENCERRADO', 'Ciclo Encerrado'),
    ]

    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='ciclos')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='GESTACAO')
    fase_atual = models.CharField(max_length=20, choices=FASE_CHOICES, default='F1')
    
    # Controle de Datas
    data_inicio = models.DateTimeField(auto_now_add=True)
    data_encerramento = models.DateTimeField(null=True, blank=True)
    
    # Responsável pelo sucesso deste ciclo (geralmente quem converteu)
    responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )

    # Cache de métricas (atualizado via Signals para performance)
    receita_acumulada = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    qtd_atendimentos = models.IntegerField(default=0)

    # NOVO CAMPO PARA O PAINEL DE RISCO
    NIVEL_RISCO = [
        ('NORMAL', 'Normal'),
        ('ALERTA', 'Alerta (Atraso leve)'),
        ('CRITICO', 'Crítico (Risco de Evasão)'),
    ]
    nivel_risco = models.CharField(max_length=10, choices=NIVEL_RISCO, default='NORMAL')
    
    # Para saber a origem exata da receita (Google vs Insta) no gráfico de pizza
    origem = models.CharField(max_length=50, blank=True, null=True, help_text="Cópia da origem do paciente para facilitar filtros")

    class Meta:
        ordering = ['-data_inicio']
        verbose_name = "Ciclo de Cuidado"
        verbose_name_plural = "Ciclos de Cuidado"

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.paciente.nome_completo} ({self.get_fase_atual_display()})"

    def calcular_ltv(self):
        """Varre os pagamentos dos agendamentos vinculados a este ciclo"""
        # Importação tardia para evitar erro de ciclo
        from faturamento.models import Pagamento
        
        # Busca pagamentos confirmados de agendamentos deste ciclo
        total = Pagamento.objects.filter(
            agendamento__ciclo=self,
            status='Pago'
        ).aggregate(total=models.Sum('valor'))['total'] or 0.00
        
        self.receita_acumulada = total
        self.save()

class AnaliseComportamental(models.Model):
    """
    Extensão do Paciente focada em VENDAS e ATENDIMENTO.
    "Onde dói e como converte."
    """
    PERFIL_EMOCIONAL = [
        ('TRANQUILA', 'Tranquila'),
        ('INSEGURA', 'Insegura'),
        ('ANSIOSA', 'Ansiosa'),
        ('DECIDIDA', 'Decidida'),
        ('INDEFINIDO', 'Indefinido'),
    ]
    
    OBJECOES_COMUNS = [
        ('PRECO', 'Preço'),
        ('AGENDA', 'Agenda/Horário'),
        ('MEDICO', 'Preferência por Médico'),
        ('DISTANCIA', 'Distância'),
        ('MEDO', 'Medo do Exame'),
        ('OUTRO', 'Outro'),
    ]

    paciente = models.OneToOneField(Paciente, on_delete=models.CASCADE, related_name='perfil_comportamental')
    perfil_emocional = models.CharField(max_length=20, choices=PERFIL_EMOCIONAL, default='INDEFINIDO')
    principal_objecao = models.CharField(max_length=20, choices=OBJECOES_COMUNS, blank=True, null=True)
    
    # Notas livres para a equipe de atendimento ("Gosta de ser chamada de Beta", etc)
    observacoes_internas = models.TextField(blank=True, help_text="Informações cruciais para a equipe de atendimento")

    def __str__(self):
        return f"Perfil de {self.paciente.nome_completo}"

class ProximaAcao(models.Model):
    """
    A REGRA DE OURO: Nenhum paciente fica sem próxima ação.
    Pode ser ligada a um agendamento futuro ou apenas uma tarefa (Ligar).
    """
    STATUS_ACAO = [
        ('PENDENTE', 'Pendente'),
        ('REALIZADA', 'Realizada'),
        ('CANCELADA', 'Cancelada'),
        ('ATRASADA', 'Atrasada'), # Calculado no frontend/view
    ]

    ciclo = models.ForeignKey(Ciclo, on_delete=models.CASCADE, related_name='acoes')
    descricao = models.CharField(max_length=255, help_text="Ex: Ligar para agendar Morfológico")
    data_alvo = models.DateField(help_text="Quando essa ação deve acontecer?")
    
    # Se a ação for um agendamento já marcado, vinculamos aqui
    agendamento_vinculado = models.ForeignKey(
        'agendamentos.Agendamento', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='acao_origem'
    )
    
    status = models.CharField(max_length=20, choices=STATUS_ACAO, default='PENDENTE')
    criado_em = models.DateTimeField(auto_now_add=True)
    realizado_em = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.descricao} - {self.data_alvo}"