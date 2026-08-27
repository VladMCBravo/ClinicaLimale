# usuarios/models.py - VERSÃO CORRIGIDA E LIMPA

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from cryptography.fernet import Fernet
import base64

# Este é o seu modelo de Especialidade. Ele está correto e é o que vamos usar.
class Especialidade(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    valor_consulta = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Valor da Consulta Particular"
    )

    def __str__(self):
        return self.nome
    
    class Meta:
        verbose_name = "Especialidade"
        verbose_name_plural = "Especialidades"
        ordering = ['nome']

# Adicione esta classe para criptografar a senha do certificado
class CertificadoMedico(models.Model):
    medico = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='certificado'
    )
    arquivo_p12 = models.FileField(upload_to='certificados_digitais/')
    senha_criptografada = models.CharField(max_length=255)
    data_expiracao = models.DateTimeField(null=True, blank=True, verbose_name="Data de Expiração")
    # Campo para checar se está válido
    data_upload = models.DateTimeField(auto_now_add=True)

    def set_password(self, senha_raw):
        """
        Criptografa a senha antes de salvar no banco usando o SECRET_KEY.
        """
        # Garante uma chave de 32 bytes baseada no SECRET_KEY
        key = base64.urlsafe_b64encode(settings.SECRET_KEY[:32].encode().ljust(32, b'='))
        f = Fernet(key)
        self.senha_criptografada = f.encrypt(senha_raw.encode()).decode()

    def get_password(self):
        """
        Descriptografa a senha para uso no serviço de assinatura.
        """
        try:
            key = base64.urlsafe_b64encode(settings.SECRET_KEY[:32].encode().ljust(32, b'='))
            f = Fernet(key)
            return f.decrypt(self.senha_criptografada.encode()).decode()
        except Exception as e:
            print(f"Erro ao descriptografar senha: {e}")
            return None

    def __str__(self):
        return f"Certificado de {self.medico.username}"


# 1. ADICIONE ESTA NOVA CLASSE (A "Ponte" entre Médico e Especialidade)
class MedicoEspecialidade(models.Model):
    medico = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='medico_especialidades' # Importante para buscarmos depois
    )
    especialidade = models.ForeignKey(Especialidade, on_delete=models.CASCADE)
    rqe = models.CharField(max_length=20, blank=True, null=True, verbose_name="RQE")

    class Meta:
        unique_together = ('medico', 'especialidade') # Evita que o médico tenha a mesma especialidade duas vezes
        verbose_name = "Especialidade do Profissional"
        verbose_name_plural = "Especialidades do Profissional"

    def __str__(self):
        return f"{self.especialidade.nome} (RQE: {self.rqe})"

# 2. ATUALIZE A SUA CLASSE CustomUser
class CustomUser(AbstractUser):
    GENERO_CHOICES = [
        ('M', 'Masculino'),
        ('F', 'Feminino'),
    ]
    
    genero = models.CharField(
        max_length=1, 
        choices=GENERO_CHOICES, 
        null=True, 
        blank=True
    )
    # --- NOVOS CAMPOS AQUI ---
    data_nascimento = models.DateField(
        null=True, 
        blank=True,
        verbose_name="Data de Nascimento"
    )
    telefone = models.CharField(
        max_length=20, 
        blank=True, 
        null=True,
        verbose_name="Telefone / Celular"
    )
    cpf = models.CharField(
        max_length=14, 
        blank=True, 
        null=True, 
        unique=True,
        verbose_name="CPF"
    )
    # --- FIM DOS NOVOS CAMPOS ---

    # <-- NOVO CAMPO -->
    pin_ponto = models.CharField(
        max_length=6, 
        blank=True, 
        null=True, 
        help_text="PIN numérico de 4 a 6 dígitos para o ponto eletrônico"
    )
    # <-- FIM DO NOVO CAMPO -->

    # <-- NOVO CAMPO PARA BIOMETRIA -->
    digital_template = models.TextField(
        blank=True,
        null=True,
        help_text="Template da digital gerado pelo SDK da Futronic"
    )
    
    CARGO_CHOICES = [
        ('admin', 'Administrador'),
        ('medico', 'Médico'),
        ('recepcao', 'Recepção'),
    ]
    cargo = models.CharField(max_length=10, choices=CARGO_CHOICES, default='recepcao')
    crm = models.CharField(max_length=20, blank=True, null=True, unique=True, verbose_name="CRM")
    
    # --- NOVOS: CAMPOS DE ENDEREÇO ---
    logradouro = models.CharField(max_length=255, blank=True, null=True)
    numero = models.CharField(max_length=20, blank=True, null=True)
    complemento = models.CharField(max_length=100, blank=True, null=True)
    bairro = models.CharField(max_length=100, blank=True, null=True)
    cidade = models.CharField(max_length=100, blank=True, null=True)
    uf = models.CharField(max_length=2, blank=True, null=True, verbose_name="UF")
    cep = models.CharField(max_length=9, blank=True, null=True, verbose_name="CEP")
    # --- FIM DO ENDEREÇO ---
    
    # ✅ ATUALIZE O CAMPO ESPECIALIDADES (Adicionando o 'through')
    especialidades = models.ManyToManyField(
        Especialidade, 
        through='MedicoEspecialidade', # Diz ao Django para usar a nossa nova classe
        blank=True, 
        verbose_name="Especialidades do Profissional"
    )

    # ✅ ADICIONE ESTA FUNÇÃO NO FINAL DO CustomUser
    # Ela vai gerar o texto formatado lindamente para os PDFs!
    def get_texto_especialidades_rqe(self):
        relacoes = self.medico_especialidades.all().select_related('especialidade')
        if not relacoes.exists():
            return ""
        
        lista_formatada = []
        for rel in relacoes:
            texto = rel.especialidade.nome
            if rel.rqe:
                texto += f" - RQE {rel.rqe}"
            lista_formatada.append(texto)
        
        # Junta todas as especialidades com " | " (Ex: Cardiologia - RQE 123 | Clínica Médica)
        return " | ".join(lista_formatada)

    @property
    def nome_com_prefixo(self):
        nome = self.get_full_name()
        if not nome:
            return "Médico(a)"
            
        # 1. Tenta usar o campo de gênero do banco de dados (mais preciso)
        if self.genero == 'F':
            return f"Dra. {nome}"
        elif self.genero == 'M':
            return f"Dr. {nome}"
            
        # 2. Fallback: Se o gênero não estiver preenchido, usa a regra da última letra
        primeiro_nome = nome.strip().split(' ')[0].lower()
        prefixo = "Dra." if primeiro_nome.endswith('a') else "Dr."
        return f"{prefixo} {nome}"

    def __str__(self):
        return self.get_full_name() or self.username

class JornadaDeTrabalho(models.Model):
    class DiaSemana(models.IntegerChoices):
        SEGUNDA = 0, _('Segunda-feira')
        TERCA = 1, _('Terça-feira')
        QUARTA = 2, _('Quarta-feira')
        QUINTA = 3, _('Quinta-feira')
        SEXTA = 4, _('Sexta-feira')
        SABADO = 5, _('Sábado')
        DOMINGO = 6, _('Domingo')

    medico = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='jornadas_de_trabalho',
        limit_choices_to={'cargo': 'medico'}
    )
    dia_da_semana = models.IntegerField(choices=DiaSemana.choices)
    hora_inicio = models.TimeField()
    hora_fim = models.TimeField()
    intervalo_consulta = models.IntegerField(
        default=20,
        verbose_name="Intervalo entre consultas (minutos)",
        help_text="Tempo em minutos entre cada consulta"
    )
    ativo = models.BooleanField(
        default=True,
        verbose_name="Ativo",
        help_text="Define se esta jornada está ativa"
    )
    semanas_do_mes = models.JSONField(default=list, blank=True, null=True)

    class Meta:
        verbose_name = "Jornada de Trabalho"
        verbose_name_plural = "Jornadas de Trabalho"
        unique_together = ('medico', 'dia_da_semana', 'hora_inicio')

    def __str__(self):
        nome_medico = self.medico.get_full_name() or self.medico.username
        return f"{nome_medico} - {self.get_dia_da_semana_display()}: {self.hora_inicio.strftime('%H:%M')} às {self.hora_fim.strftime('%H:%M')}"

class ValorEspecialidadeConvenio(models.Model):
    especialidade = models.ForeignKey(Especialidade, on_delete=models.CASCADE, related_name='valores_convenio')
    plano_convenio = models.ForeignKey('faturamento.PlanoConvenio', on_delete=models.CASCADE)
    valor = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('especialidade', 'plano_convenio')
        verbose_name = "Valor de Especialidade por Convênio"

# 2. No final do arquivo models.py, adicione a classe do Ponto:
class RegistroPonto(models.Model):
    TIPO_BATIDA_CHOICES = [
        ('entrada', 'Entrada'),
        ('saida_pausa', 'Saída para Pausa/Almoço'),
        ('retorno_pausa', 'Retorno da Pausa'),
        ('saida', 'Saída (Fim do expediente)'),
    ]

    STATUS_CHOICES = [
        ('aprovado', 'Aprovado (Dentro do Raio)'),
        ('rejeitado', 'Rejeitado (Fora do Raio)'),
        ('ajuste_manual', 'Ajuste Manual (RH)'),
        ('cancelado', 'Cancelado (RH)'), # <--- NOVO STATUS ADICIONADO
    ]

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='registros_ponto')
    
    # MUDEI DE auto_now_add=True PARA default=timezone.now
    # Isso permite que o RH possa lançar pontos de dias anteriores!
    data_hora = models.DateTimeField(default=timezone.now, verbose_name="Data e Hora") 
    
    tipo = models.CharField(max_length=20, choices=TIPO_BATIDA_CHOICES)
    
    # Coordenadas capturadas
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    distancia_metros = models.FloatField(null=True, blank=True, verbose_name="Distância do centro (m)")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='aprovado')
    
    # Informações extras de segurança
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True, help_text="Navegador/Dispositivo usado")
    observacao = models.TextField(blank=True, null=True, help_text="Justificativas ou notas do RH")

    class Meta:
        verbose_name = "Registro de Ponto"
        verbose_name_plural = "Registros de Ponto"
        ordering = ['-data_hora']

    def __str__(self):
        return f"{self.usuario.get_full_name()} - {self.get_tipo_display()} - {self.data_hora.strftime('%d/%m/%Y %H:%M')}"

class ConfiguracaoClinica(models.Model):
    # Dados Cadastrais
    razao_social = models.CharField(max_length=255, blank=True, null=True)
    nome_fantasia = models.CharField(max_length=255, blank=True, null=True)
    cnpj = models.CharField(max_length=18, blank=True, null=True)
    inscricao_estadual = models.CharField(max_length=50, blank=True, null=True)
    telefone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    
    # Endereço
    cep = models.CharField(max_length=9, blank=True, null=True)
    logradouro = models.CharField(max_length=255, blank=True, null=True)
    numero = models.CharField(max_length=20, blank=True, null=True)
    bairro = models.CharField(max_length=100, blank=True, null=True)
    cidade = models.CharField(max_length=100, blank=True, null=True)
    uf = models.CharField(max_length=2, blank=True, null=True)
    
    # Geofencing (Ponto Eletrônico)
    raio_metros = models.IntegerField(default=150, help_text="Raio de tolerância em metros para bater ponto")
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)

    class Meta:
        verbose_name = "Configuração da Clínica"
        verbose_name_plural = "Configurações da Clínica"

    def __str__(self):
        return self.nome_fantasia or "Configuração Principal"