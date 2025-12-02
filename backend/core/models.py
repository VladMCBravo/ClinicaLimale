from django.db import models
from django.core.cache import cache
from django.core.exceptions import ValidationError

class Clinica(models.Model):
    nome = models.CharField(max_length=255, default='Clinica Limalé - Especialidades Médicas e Imagem')
    endereco = models.CharField(max_length=500, default='R. Orense, 41 - sala 512, Edifício D - Office, Diadema - SP, 09920-650')
    telefone = models.CharField(max_length=20, default='(11) 919511842')
    email = models.EmailField(default='contato@limale.com.br')
    logo = models.CharField(max_length=255, default='images/logo_limale.jpg', help_text="Caminho para o logo a partir do diretório static.")

    def __str__(self):
        return self.nome

    def save(self, *args, **kwargs):
        if not self.pk and Clinica.objects.exists():
            raise ValidationError('Só pode haver uma instância de Clinica.')
        return super(Clinica, self).save(*args, **kwargs)

    @classmethod
    def get_instance(cls):
        instance = cache.get('clinica_instance')
        if not instance:
            instance = cls.objects.first()
            cache.set('clinica_instance', instance, timeout=3600) # Cache por 1 hora
        return instance