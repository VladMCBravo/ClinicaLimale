# backend/pacientes/models.py

from django.db import models
from django.conf import settings
from datetime import date

class Paciente(models.Model):
    # --- 1. CONFIGURAÇÕES DE ESCOLHA (CHOICES) ---
    GENERO_CHOICES = [
        ('Masculino', 'Masculino'),
        ('Feminino', 'Feminino'),
        ('Outro', 'Outro'),
    ]

    # --- 2. TRAVA DE SEGURANÇA (SOFT DELETE) ---
    ativo = models.BooleanField(
        default=True, 
        verbose_name="Paciente Ativo",
        help_text="Desmarque para arquivar o paciente em vez de excluí-lo permanentemente."
    )

    # --- 3. DADOS PESSOAIS E DEMOGRÁFICOS ---
    nome_completo = models.CharField(max_length=255, verbose_name="Nome Completo")
    cpf = models.CharField(max_length=14, unique=True, null=True, blank=True, verbose_name="CPF")
    data_nascimento = models.DateField(null=True, blank=True, verbose_name="Data de Nascimento")
    genero = models.CharField(max_length=20, choices=GENERO_CHOICES, blank=True, verbose_name="Gênero")
    dum = models.DateField(null=True, blank=True, verbose_name="DUM", help_text="Data da Última Menstruação")
    
    # --- 4. DADOS VITAIS (Atualizados via Evolução/Recepção) ---
    peso = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, help_text="Peso em kg")
    altura = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, help_text="Altura em cm")

    # --- 5. INFORMAÇÕES DE CONTATO ---
    telefone_celular = models.CharField(max_length=20, verbose_name="Telefone Celular")
    email = models.EmailField(unique=True, blank=True, null=True, verbose_name="E-mail")
    cep = models.CharField(max_length=9, blank=True, verbose_name="CEP")
    endereco = models.CharField(max_length=255, blank=True, verbose_name="Endereço")
    numero = models.CharField(max_length=10, blank=True, verbose_name="Número")
    complemento = models.CharField(max_length=100, blank=True, verbose_name="Complemento")
    bairro = models.CharField(max_length=100, blank=True, verbose_name="Bairro")
    cidade = models.CharField(max_length=100, blank=True, verbose_name="Cidade")
    estado = models.CharField(max_length=2, blank=True, verbose_name="Estado (UF)")

    # --- 6. INFORMAÇÕES DE RESPONSÁVEL E EMERGÊNCIA ---
    nome_responsavel = models.CharField(max_length=255, blank=True, verbose_name="Nome do Responsável", help_text="Obrigatório para menores")
    cpf_responsavel = models.CharField(max_length=14, blank=True, verbose_name="CPF do Responsável")
    telefone_responsavel = models.CharField(max_length=20, blank=True, verbose_name="Telefone do Responsável")
    
    contato_emergencia_nome = models.CharField(max_length=255, blank=True, verbose_name="Contato de Emergência")
    contato_emergencia_telefone = models.CharField(max_length=20, blank=True, verbose_name="Telefone de Emergência")
    contato_emergencia_parentesco = models.CharField(max_length=50, blank=True, verbose_name="Parentesco")

    # --- 7. VÍNCULOS E METADADOS ---
    medico_responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        limit_choices_to={'cargo': 'medico'},
        related_name='pacientes',
        verbose_name="Médico Responsável"
    )

    plano_convenio = models.ForeignKey(
        'faturamento.PlanoConvenio', 
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='pacientes',
        verbose_name="Plano/Convênio"
    )
    numero_carteirinha = models.CharField(max_length=100, blank=True, verbose_name="Nº da Carteirinha")

    data_cadastro = models.DateTimeField(auto_now_add=True, verbose_name="Data de Cadastro") 
    data_atualizacao = models.DateTimeField(auto_now=True, verbose_name="Última Atualização")

    # ==========================================
    # COMPORTAMENTOS DA CLASSE (MÉTODOS)
    # ==========================================

    class Meta:
        ordering = ['nome_completo']
        verbose_name = "Paciente"
        verbose_name_plural = "Pacientes"

    def __str__(self):
        return self.nome_completo

    def delete(self, *args, **kwargs):
        """
        SOFT DELETE: Intercepta a exclusão. Em vez de apagar os dados do banco 
        e destruir o histórico do paciente, ele apenas desativa o cadastro.
        """
        self.ativo = False
        self.save(update_fields=['ativo'])

    def get_idade_anos(self):
        """
        Calcula e retorna a idade exata do paciente em anos.
        Usado para preencher a barra de informações vitais no Frontend e nos PDFs.
        """
        if not self.data_nascimento:
            return "Idade não informada"
        
        hoje = date.today()
        anos = hoje.year - self.data_nascimento.year - ((hoje.month, hoje.day) < (self.data_nascimento.month, self.data_nascimento.day))
        return f"{anos} anos"