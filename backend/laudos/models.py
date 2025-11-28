from django.db import models
from django.conf import settings
from pacientes.models import Paciente
# Importamos agendamentos apenas como string para evitar ciclo de importação

class ModeloLaudo(models.Model):
    """Templates de Laudo (Os modelos pré-definidos: Obstétrico, Pélvico, etc.)"""
    titulo = models.CharField(max_length=255, unique=True)
    
    # Ex: USG-OBS-1TRI
    codigo_mnemonico = models.CharField(max_length=50, blank=True, null=True)
    
    # JSON padrão para inicializar o formulário (ex: checklist padrão)
    conteudo_padrao = models.JSONField(default=dict, blank=True) 
    
    # Texto HTML simples caso não use o gerador dinâmico
    texto_padrao_html = models.TextField(blank=True)

    ativo = models.BooleanField(default=True)

    def __str__(self):
        return self.titulo

class Laudo(models.Model):
    STATUS_CHOICES = [
        ('RASCUNHO', 'Rascunho'),
        ('FINALIZADO', 'Finalizado'),
    ]

    # Relacionamento Opcional: Pode vir de um agendamento ou ser criado avulso
    agendamento = models.OneToOneField(
        'agendamentos.Agendamento', 
        on_delete=models.SET_NULL, 
        related_name='laudo',
        null=True, blank=True
    )

    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='laudos')
    
    # Médico que assinou
    medico = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT,
        related_name='laudos_assinados',
        null=True, blank=True
    )
    
    titulo_exame = models.CharField(max_length=255)
    
    # --- O CORAÇÃO DO SISTEMA TURING ---
    # Aqui salvamos o estado dos inputs: { "dbp": 45, "cranioNormal": true, ... }
    # Isso permite reabrir o laudo e continuar editando os campos, não apenas o texto.
    dados_estruturados = models.JSONField(default=dict, blank=True)
    
    # O texto final gerado para o PDF (HTML ou Texto Puro)
    texto_laudo = models.TextField(blank=True)
    
    # IDs das imagens do Orthanc ou URLs do S3
    imagens_ids = models.JSONField(default=list, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='RASCUNHO')
    
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Laudo: {self.titulo_exame} - {self.paciente.nome_completo}"