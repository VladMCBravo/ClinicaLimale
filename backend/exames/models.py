# backend/exames/models.py
from django.db import models
from pacientes.models import Paciente
import uuid
import re
import os
import unicodedata
from django.utils.text import slugify
from datetime import datetime # <--- IMPORTANTE: Faltava isso para o fallback

# --- CORREÇÃO: Função segura para diretório ---
def diretorio_laudos(instance, filename):
    # Se instance.criado_em for None, usa agora.
    data_ref = instance.criado_em if instance.criado_em else datetime.now()
    
    # Pega o nome da pasta do exame vinculado
    pasta_nome = "indefinido"
    if instance.exame and instance.exame.nome_paciente_pasta:
        # Remove caracteres perigosos para URL/Sistema de arquivos por segurança
        pasta_nome = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', instance.exame.nome_paciente_pasta)
    
    # Retorna o caminho: laudos_imagens / ANO / MES / NOME_PASTA_ORIGINAL / ARQUIVO
    return 'laudos_imagens/{0}/{1}/{2}/{3}'.format(
        data_ref.strftime('%Y'),
        data_ref.strftime('%m'),
        pasta_nome,
        filename
    )

class Exame(models.Model):
    STATUS_CHOICES = [
        ('PENDENTE', 'Aguardando Vínculo'),
        ('DISPONIVEL', 'Disponível no Portal'),
    ]

    paciente = models.ForeignKey(Paciente, on_delete=models.SET_NULL, null=True, blank=True, related_name='exames')
    data_exame = models.DateField()
    nome_paciente_pasta = models.CharField(max_length=255, help_text="Nome na pasta do ultrassom")
    
    codigo_acesso = models.CharField(max_length=20, unique=True, blank=True)
    senha_acesso = models.CharField(max_length=20, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDENTE')
    criado_em = models.DateTimeField(auto_now_add=True)

    # --- NOVO CAMPO CRM ---
    # Vinculamos o exame ao Ciclo para saber quais exames compõem a jornada da gestante
    ciclo = models.ForeignKey(
        'crm.Ciclo', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='exames_realizados'
    )

    # --- ADICIONE ESTA CLASSE AQUI ---
    class Meta:
        # Garante que o banco nunca aceite dois exames iguais (mesma pasta, mesma data)
        unique_together = ('nome_paciente_pasta', 'data_exame')

    def save(self, *args, **kwargs):
        if not self.codigo_acesso:
            self.codigo_acesso = 'EX-' + str(uuid.uuid4())[:4].upper()
        if not self.senha_acesso:
            import random
            self.senha_acesso = str(random.randint(100000, 999999))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.data_exame} - {self.nome_paciente_pasta}"

class ArquivoExame(models.Model):
    exame = models.ForeignKey(Exame, related_name='arquivos', on_delete=models.CASCADE)
    
    # --- APLICAÇÃO DA CORREÇÃO AQUI ---
    arquivo = models.FileField(upload_to=diretorio_laudos) 
    
    tipo = models.CharField(max_length=10, choices=[('IMAGEM', 'Imagem'), ('VIDEO', 'Vídeo'), ('LAUDO', 'Laudo')])
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Arquivo do exame {self.exame.id}"

def upload_laudo_pdf_path(instance, filename):
    # Pega a extensão do arquivo (ex: .pdf)
    ext = filename.split('.')[-1]
    
    # Pega o nome sem a extensão
    nome_base = filename.rsplit('.', 1)[0]
    
    # Remove os acentos (Fátima -> Fatima)
    nome_sem_acento = unicodedata.normalize('NFKD', nome_base).encode('ASCII', 'ignore').decode('utf-8')
    
    # Garante que seja uma string segura (Laudo_Maria_de_Fatima -> laudo-maria-de-fatima)
    nome_seguro = slugify(nome_sem_acento)
    
    # Mantém a organização por ano e mês que você já usava
    hoje = datetime.now()
    return f'laudos_assinados/{hoje.strftime("%Y/%m")}/{nome_seguro}.{ext}'