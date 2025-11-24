# backend/laudos/models.py
from django.db import models
from django.conf import settings
from pacientes.models import Paciente
# Importamos agendamentos apenas como string para evitar ciclo, mas usamos no ForeignKey

class ModeloLaudo(models.Model):
    """Templates de Laudo (Substitui lógica antiga do Turing)"""
    titulo = models.CharField(max_length=255, unique=True)
    
    # Código mnemônico para facilitar busca pelo médico
    codigo_mnemonico = models.CharField(max_length=20, blank=True, null=True, help_text="Ex: USG-OBS-GEMELAR")
    
    # Conteúdo estruturado (TipTap/JSON)
    conteudo_padrao = models.JSONField(default=dict, blank=True) 
    
    # Texto puro para fallback ou visualização simples
    texto_padrao_html = models.TextField(blank=True, help_text="Versão HTML simples se não usar editor rico")

    especialidade = models.CharField(max_length=100, default='Radiologia')
    ativo = models.BooleanField(default=True)

    def __str__(self):
        return self.titulo

class Laudo(models.Model):
    STATUS_CHOICES = [
        ('RASCUNHO', 'Rascunho'),
        ('REVISAO', 'Em Revisão'),
        ('ASSINADO', 'Assinado/Finalizado'),
    ]

    # Vínculo Forte: Um agendamento gera UM laudo.
    agendamento = models.OneToOneField(
        'agendamentos.Agendamento', 
        on_delete=models.PROTECT, 
        related_name='laudo',
        null=True, blank=True # Opcional pois pode haver laudo avulso (raro, mas possível)
    )

    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='laudos')
    
    # Quem laudou (pode ser diferente de quem atendeu na sala, mas geralmente é o mesmo)
    # ALTERAÇÃO AQUI: Adicione null=True, blank=True
    medico_executante = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT,
        related_name='laudos_assinados',
        null=True,  # <--- Adicionado
        blank=True  # <--- Adicionado
    )
    
    titulo_exame = models.CharField(max_length=255)
    
    # O conteúdo final
    conteudo_laudo = models.JSONField(default=dict)
    texto_puro = models.TextField(blank=True) # Para indexação/busca
    
    # Imagens Selecionadas do Orthanc (Armazenamos os UIDs ou Links)
    imagens_ids = models.JSONField(default=list, blank=True, help_text="Lista de InstanceUIDs do DICOM selecionados")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='RASCUNHO')
    
    # Assinatura Digital
    hash_assinatura = models.CharField(max_length=256, blank=True, null=True)
    data_assinatura = models.DateTimeField(null=True, blank=True)

    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Laudo: {self.titulo_exame} - {self.paciente.nome_completo}"