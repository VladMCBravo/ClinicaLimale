from django.db import models
from pacientes.models import Paciente
import uuid

class Exame(models.Model):
    """ O cabeçalho do exame (A pasta do dia) """
    STATUS_CHOICES = [
        ('PENDENTE', 'Aguardando Vínculo'),
        ('DISPONIVEL', 'Disponível no Portal'),
    ]

    # Vínculo com paciente (pode ser Null se o sistema não achar o paciente automaticamente)
    paciente = models.ForeignKey(Paciente, on_delete=models.SET_NULL, null=True, blank=True, related_name='exames')
    
    # Dados extraídos da pasta
    data_exame = models.DateField()
    nome_paciente_pasta = models.CharField(max_length=255, help_text="Nome que veio escrito na pasta do ultrassom")
    
    # Controle de Acesso ao Portal
    codigo_acesso = models.CharField(max_length=20, unique=True, blank=True)
    senha_acesso = models.CharField(max_length=20, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDENTE')
    criado_em = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.codigo_acesso:
            # Gera um código único ex: EX-A1B2
            self.codigo_acesso = 'EX-' + str(uuid.uuid4())[:4].upper()
        if not self.senha_acesso:
            # Gera uma senha simples numérica (pode melhorar depois)
            import random
            self.senha_acesso = str(random.randint(100000, 999999))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.data_exame} - {self.nome_paciente_pasta}"

class ArquivoExame(models.Model):
    """ As fotos e vídeos individuais """
    exame = models.ForeignKey(Exame, related_name='arquivos', on_delete=models.CASCADE)
    arquivo = models.FileField(upload_to='exames/%Y/%m/%d/') # Vai para o Supabase automaticamente
    tipo = models.CharField(max_length=10, choices=[('IMAGEM', 'Imagem'), ('VIDEO', 'Vídeo'), ('LAUDO', 'Laudo')])
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Arquivo do exame {self.exame.id}"