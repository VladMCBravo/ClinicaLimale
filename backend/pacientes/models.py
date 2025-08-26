# backend/pacientes/models.py

from django.db import models
from django.conf import settings
from usuarios.models import CustomUser


class Paciente(models.Model):
    GENERO_CHOICES = [
        ('Masculino', 'Masculino'),
        ('Feminino', 'Feminino'),
        ('Outro', 'Outro'),
    ]

    medico_responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'cargo': 'medico'},
        related_name='pacientes'
    )
    
    # Dados Demográficos
    nome_completo = models.CharField(max_length=255)
    data_nascimento = models.DateField()
    cpf = models.CharField(max_length=14, unique=True)
    genero = models.CharField(max_length=20, choices=GENERO_CHOICES, blank=True)
    # NOVO: Adicionamos os campos de peso e altura aqui.
    # Usamos blank=True e null=True para torná-los opcionais.
    peso = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, help_text="Peso em kg")
    altura = models.DecimalField(max_digits=3, decimal_places=2, blank=True, null=True, help_text="Altura em metros")

    # Informações de Contato
    telefone_celular = models.CharField(max_length=20)
    email = models.EmailField(unique=True, blank=True, null=True)
    cep = models.CharField(max_length=9, blank=True)
    endereco = models.CharField(max_length=255, blank=True)
    numero = models.CharField(max_length=10, blank=True)
    complemento = models.CharField(max_length=100, blank=True)
    bairro = models.CharField(max_length=100, blank=True)
    cidade = models.CharField(max_length=100, blank=True)
    estado = models.CharField(max_length=2, blank=True)

    
    # Usamos uma string para referenciar o modelo de outro app
    plano_convenio = models.ForeignKey(
        'faturamento.PlanoConvenio', # <-- MUDANÇA AQUI
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pacientes'
    )

    # Metadados
    data_cadastro = models.DateTimeField(auto_now_add=True) # Preenchido automaticamente na criação
    data_atualizacao = models.DateTimeField(auto_now=True)  # Preenchido automaticamente na atualização
    numero_carteirinha = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return self.nome_completo