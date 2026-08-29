# backend/agendamentos/models.py

from django.db import models
from pacientes.models import Paciente
from django.utils import timezone
from django.conf import settings
from datetime import timedelta

class Sala(models.Model):
    """Representa uma sala física ou um recurso (Ex: Aparelho Samsung V7)."""
    nome = models.CharField(max_length=100, unique=True, help_text="Ex: Sala 1 - Ultrassom Samsung")
    descricao = models.TextField(blank=True, null=True)
    
    # Define se esta sala é exclusiva para exames
    e_sala_exame = models.BooleanField(default=False, verbose_name="É sala de exames?")
    
    # Tags de equipamentos para o algoritmo de busca saber onde agendar
    equipamentos = models.CharField(
        max_length=255, 
        blank=True, 
        help_text="Tags separadas por vírgula. Ex: SAMSUNG_V7, DOPPLER, 4D"
    )

    def __str__(self):
        return self.nome

class ConfiguracaoExame(models.Model):
    """
    Vincula o item financeiro (Procedimento) às regras clínicas e de agenda.
    """
    procedimento = models.OneToOneField(
        'faturamento.Procedimento', 
        on_delete=models.CASCADE, 
        related_name='configuracao_clinica'
    )
    
    # Regra de Agenda: Duração específica
    duracao_padrao = models.DurationField(default=timedelta(minutes=20))
    
    # Regra de Recurso: Qual equipamento este exame EXIGE?
    equipamento_obrigatorio = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text="Ex: SAMSUNG_V7. Se preenchido, só agenda em salas com esse equipamento."
    )
    
    # Regra de Laudo: Qual template usar?
    modelo_laudo_padrao = models.ForeignKey(
        'laudos.ModeloLaudo', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='procedimentos_associados'
    )

    def __str__(self):
        return f"Regra Clínica: {self.procedimento.descricao}"

class DiaFuncionamentoExame(models.Model):
    """Define em quais dias e horários um exame ou procedimento pode ser realizado."""
    DIAS_SEMANA = [
        (0, 'Segunda-feira'), (1, 'Terça-feira'), (2, 'Quarta-feira'),
        (3, 'Quinta-feira'), (4, 'Sexta-feira'), (5, 'Sábado'), (6, 'Domingo')
    ]
    
    configuracao = models.ForeignKey(
        'ConfiguracaoExame', 
        on_delete=models.CASCADE, 
        related_name='dias_funcionamento'
    )
    dia_semana = models.IntegerField(choices=DIAS_SEMANA, verbose_name="Dia da Semana")
    hora_inicio = models.TimeField(default="08:00", verbose_name="Hora de Início")
    hora_fim = models.TimeField(default="18:00", verbose_name="Hora de Fim")
    
    class Meta:
        verbose_name = "Dia de Funcionamento"
        verbose_name_plural = "Dias de Funcionamento"
        # Garante que não teremos duas "Segundas-feiras" cadastradas para o mesmo exame
        unique_together = ('configuracao', 'dia_semana') 

    def __str__(self):
        return f"{self.get_dia_semana_display()} ({self.hora_inicio.strftime('%H:%M')} às {self.hora_fim.strftime('%H:%M')})"
    
class Agendamento(models.Model):
    TIPO_ATENDIMENTO_CHOICES = [('Convenio', 'Convênio'), ('Particular', 'Particular')]
    STATUS_CHOICES = [
        ('Agendado', 'Agendado'), ('Confirmado', 'Confirmado'),
        ('Aguardando', 'Aguardando na Recepção'), ('Em Atendimento', 'Em Atendimento'),
        ('Laudando', 'Em Processo de Laudo'),
        ('Realizado', 'Realizado'), ('Cancelado', 'Cancelado'), ('Não Compareceu', 'Não Compareceu')
    ]
    TIPO_AGENDAMENTO_CHOICES = [('Consulta', 'Consulta'), ('Procedimento', 'Procedimento')]
    TIPO_VISITA_CHOICES = [('Primeira Consulta', 'Primeira Consulta'), ('Retorno', 'Retorno')]
    MODALIDADE_CHOICES = [('Presencial', 'Presencial'), ('Telemedicina', 'Telemedicina')]

    sala = models.ForeignKey(Sala, on_delete=models.SET_NULL, null=True, blank=True, related_name='agendamentos')
    
    tipo_agendamento = models.CharField(max_length=20, choices=TIPO_AGENDAMENTO_CHOICES, default='Consulta')
    medico = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='agendamentos_como_medico'
    )
    especialidade = models.ForeignKey('usuarios.Especialidade', on_delete=models.SET_NULL, null=True, blank=True)
    tipo_visita = models.CharField(max_length=20, choices=TIPO_VISITA_CHOICES, default='Primeira Consulta', blank=True, null=True)
    modalidade = models.CharField(max_length=20, choices=MODALIDADE_CHOICES, default='Presencial', blank=True, null=True)
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='agendamentos')
    data_hora_inicio = models.DateTimeField()
    data_hora_fim = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Agendado')
    expira_em = models.DateTimeField(null=True, blank=True, verbose_name="Expira em")
    plano_utilizado = models.ForeignKey('faturamento.PlanoConvenio', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Plano Utilizado no Agendamento")
    procedimento = models.ForeignKey('faturamento.Procedimento', on_delete=models.SET_NULL, null=True, blank=True)
    link_telemedicina = models.URLField(max_length=500, blank=True, null=True, verbose_name="Link da Sala de Telemedicina")
    id_sala_telemedicina = models.CharField(max_length=200, blank=True, null=True, help_text="ID da sala retornado pela API de vídeo")
    tipo_atendimento = models.CharField(max_length=10, choices=TIPO_ATENDIMENTO_CHOICES, default='Particular')
    is_encaixe = models.BooleanField(default=False, verbose_name="É encaixe?", help_text="Marcado automaticamente quando o agendamento é salvo sobrepondo um conflito real de sala/capacidade.")
    observacoes = models.TextField(blank=True, null=True)
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)

    # --- NOVO CAMPO CRM ---
    ciclo = models.ForeignKey(
        'crm.Ciclo', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='agendamentos',
        help_text="A qual ciclo de cuidado este agendamento pertence?"
    )

    # =========================================================
    # RASTREADORES DE TEMPO E RESPONSÁVEIS (NOVO)
    # =========================================================
    hora_checkin = models.DateTimeField(null=True, blank=True, verbose_name="Hora do Check-in")
    responsavel_checkin = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='checkins_realizados', verbose_name="Responsável pelo Check-in"
    )
    
    hora_inicio_atendimento = models.DateTimeField(null=True, blank=True, verbose_name="Hora de Início do Atendimento")
    responsavel_atendimento = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='atendimentos_iniciados', verbose_name="Responsável pelo Atendimento"
    )
    
    hora_finalizacao = models.DateTimeField(null=True, blank=True, verbose_name="Hora de Finalização")
    responsavel_finalizacao = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='atendimentos_finalizados', verbose_name="Responsável pela Finalização"
    )

    # =========================================================
    # PENDÊNCIAS - GATILHOS PARA O CARD PRETO (NOVO)
    # (A pendência financeira já é lida diretamente do model Pagamento)
    # =========================================================
    pendencia_laudo = models.BooleanField(default=False, verbose_name="Pendente: Laudo")
    pendencia_declaracao = models.BooleanField(default=False, verbose_name="Pendente: Declaração/Atestado")
    pendencia_reclamacao = models.BooleanField(default=False, verbose_name="Pendente: Reclamação")
    pendencia_intercorrencia = models.BooleanField(default=False, verbose_name="Pendente: Intercorrência")
    pendencia_administrativa = models.BooleanField(default=False, verbose_name="Pendente: Administrativa")
    detalhes_pendencia = models.TextField(blank=True, null=True, verbose_name="Detalhes da Pendência (Outros)")

    def save(self, *args, **kwargs):
        # LÓGICA AUTOMÁTICA DE DURAÇÃO
        is_new = self.pk is None
        
        # Se é novo, é procedimento e não tem fim definido:
        if is_new and self.procedimento and not self.data_hora_fim:
            try:
                # Tenta acessar a configuração clínica via related_name
                config = self.procedimento.configuracao_clinica
                
                # 1. Aplica a duração correta
                if config.duracao_padrao:
                    self.data_hora_inicio = self.data_hora_inicio or timezone.now() # Safety check
                    self.data_hora_fim = self.data_hora_inicio + config.duracao_padrao
                
                # 2. (Opcional) Validação de Equipamento no Backend
                if config.equipamento_obrigatorio and self.sala:
                    # Verifica se a sala escolhida tem a tag do equipamento
                    tags_sala = [t.strip() for t in self.sala.equipamentos.split(',')]
                    if config.equipamento_obrigatorio not in tags_sala:
                        # Aqui você pode lançar erro ou apenas logar
                        print(f"AVISO: Agendamento criado em sala sem {config.equipamento_obrigatorio}")

            except Exception:
                # Fallback seguro: se não tiver config ou der erro, usa 15 min padrão
                if self.data_hora_inicio:
                    self.data_hora_fim = self.data_hora_inicio + timedelta(minutes=15)
                
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.paciente.nome_completo} - {self.get_tipo_agendamento_display()}"

class BloqueioAgenda(models.Model):
    """Representa um período de bloqueio na agenda de um médico."""
    medico = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bloqueios',
        limit_choices_to={'cargo': 'medico'}
    )
    data_inicio = models.DateTimeField(verbose_name="Início do Bloqueio")
    data_fim = models.DateTimeField(verbose_name="Fim do Bloqueio")
    motivo = models.CharField(max_length=255, blank=True, null=True, help_text="Ex: Férias, Congresso, Almoço")
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        inicio_fmt = timezone.localtime(self.data_inicio).strftime('%d/%m/%Y %H:%M')
        fim_fmt = timezone.localtime(self.data_fim).strftime('%H:%M')
        return f"Bloqueio Dr(a). {self.medico.get_full_name()} - {inicio_fmt} a {fim_fmt}"

    class Meta:
        verbose_name = "Bloqueio de Agenda"
        verbose_name_plural = "Bloqueios de Agenda"
        ordering = ['data_inicio']