import random
import string
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

    # --- NOVO: Vínculo com a tabela de Exames (Arquivos/Portal) ---
    # Essencial para conectar o texto do laudo aos PDFs/Imagens do portal
    exame = models.OneToOneField(
        'exames.Exame',
        on_delete=models.SET_NULL,
        related_name='laudo_medico',
        null=True, blank=True,
        help_text="Vínculo com os arquivos e credenciais do portal"
    )
    # -------------------------------------------------------------

    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='laudos')
    
    # Médico que assinou
    medico = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT,
        related_name='laudos_assinados',
        null=True, blank=True
    )

    # --- NOVO: Nome do Médico por extenso (Snapshot) ---
    # Permite salvar "Dr. Vlad" mesmo que o usuário logado seja "Recepção"
    medico_responsavel = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        help_text="Nome do médico exibido na assinatura/lista"
    )
    # --------------------------------------------------
    
    # --- CAMPOS QUE FALTAVAM ---
    titulo_exame = models.CharField(max_length=255)
    
    # Importante: Salvar qual tipo foi (OBSTETRICO, TRANSVAGINAL, etc)
    tipo_exame = models.CharField(max_length=50, default='OBSTETRICO') 
    
    # Importante: Salvar o CRM usado no momento do laudo (histórico)
    crm_medico = models.CharField(max_length=20, blank=True, null=True)

    dados_estruturados = models.JSONField(default=dict, blank=True)
    texto_laudo = models.TextField(blank=True)
    imagens_ids = models.JSONField(default=list, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='RASCUNHO')
    
    # --- CREDENCIAIS DE ACESSO DO PACIENTE ---
    codigo_acesso = models.CharField(max_length=20, blank=True, null=True, unique=True)
    senha_acesso = models.CharField(max_length=20, blank=True, null=True)

    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)

    # ADICIONE ESTE CAMPO:
    arquivo_pdf = models.FileField(
        upload_to='laudos_assinados/%Y/%m/', 
        null=True, 
        blank=True,
        verbose_name="Arquivo PDF Assinado"
    )

    def save(self, *args, **kwargs):
        # Gera credenciais automáticas se não existirem
        if not self.codigo_acesso:
            self.codigo_acesso = self.gerar_codigo_unico()
        if not self.senha_acesso:
            self.senha_acesso = self.gerar_senha_simples()
        
        super().save(*args, **kwargs)

    def gerar_codigo_unico(self):
        # Ex: PCT-12345
        prefixo = "PCT"
        while True:
            numero = ''.join(random.choices(string.digits, k=6))
            codigo = f"{prefixo}-{numero}"
            if not Laudo.objects.filter(codigo_acesso=codigo).exists():
                return codigo

    def gerar_senha_simples(self):
        # Ex: A1B2
        chars = string.ascii_uppercase + string.digits
        return ''.join(random.choices(chars, k=6))

    def __str__(self):
        return f"Laudo: {self.titulo_exame} - {self.paciente.nome_completo}"