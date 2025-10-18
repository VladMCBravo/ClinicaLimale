# backend/prontuario/models.py - VERSÃO CORRIGIDA E FINALIZADA

from django.db import models
from django.conf import settings
from pacientes.models import Paciente

class Evolucao(models.Model):
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='evolucoes')
    medico = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    data_atendimento = models.DateTimeField(auto_now_add=True)

    # <<-- CORREÇÃO: Campos SOAP definidos uma única vez e como opcionais (blank=True, null=True) -->>
    notas_subjetivas = models.TextField(blank=True, null=True, verbose_name="Subjetivo (Queixa Principal / HDA)")
    notas_objetivas = models.TextField(blank=True, null=True, verbose_name="Exame Físico (Ausculta, Sinais, etc.)")
    avaliacao = models.TextField(blank=True, null=True, verbose_name="Diagnóstico / Hipóteses")
    plano = models.TextField(blank=True, null=True, verbose_name="Plano Terapêutico / Condutas")

    # <<-- NOVOS CAMPOS ESTRUTURADOS (Mantidos) -->>
    pressao_arterial = models.CharField(max_length=20, blank=True, null=True, verbose_name="Pressão Arterial")
    frequencia_cardiaca = models.PositiveIntegerField(blank=True, null=True, verbose_name="Frequência Cardíaca (bpm)")
    peso = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name="Peso (kg)")
    altura = models.DecimalField(max_digits=3, decimal_places=2, blank=True, null=True, verbose_name="Altura (m)")
    exames_complementares = models.TextField(blank=True, null=True, verbose_name="Exames Complementares (ECG, Eco, etc.)")

    class Meta:
        ordering = ['-data_atendimento']

    def __str__(self):
        return f"Evolução de {self.paciente.nome_completo} em {self.data_atendimento.strftime('%d/%m/%Y')}"

# --- Os modelos abaixo já estavam corretos e foram mantidos ---

class Prescricao(models.Model):
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='prescricoes')
    medico = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    data_prescricao = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-data_prescricao']

    def __str__(self):
        return f"Prescrição para {self.paciente.nome_completo} em {self.data_prescricao.strftime('%d/%m/%Y')}"

class ItemPrescricao(models.Model):
    prescricao = models.ForeignKey(Prescricao, on_delete=models.CASCADE, related_name='itens')
    medicamento = models.CharField(max_length=200)
    dosagem = models.CharField(max_length=100)
    instrucoes = models.TextField(verbose_name="Instruções de Uso")

    def __str__(self):
        return f"{self.medicamento} ({self.dosagem})"

class Anamnese(models.Model):
    paciente = models.OneToOneField(Paciente, on_delete=models.CASCADE, related_name='anamnese')
    medico = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)
    queixa_principal = models.TextField(blank=True)
    historia_doenca_atual = models.TextField(blank=True)
    historico_medico_pregresso = models.TextField(blank=True)
    historico_familiar = models.TextField(blank=True)
    alergias = models.TextField(blank=True)
    medicamentos_em_uso = models.TextField(blank=True)

    def __str__(self):
        return f"Anamnese de {self.paciente.nome_completo}"

class Atestado(models.Model):
    TIPO_CHOICES = [
        ('Comparecimento', 'Atestado de Comparecimento'),
        ('Afastamento', 'Atestado de Afastamento'),
        ('Aptidao', 'Atestado de Aptidão Física'),
    ]
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='atestados')
    medico = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    data_emissao = models.DateTimeField(auto_now_add=True)
    tipo_atestado = models.CharField(max_length=20, choices=TIPO_CHOICES)
    observacoes = models.TextField(help_text="Texto do atestado, incluindo informações como CID, dias de afastamento, etc.")

    class Meta:
        ordering = ['-data_emissao']

    def __str__(self):
        return f"Atestado de {self.get_tipo_atestado_display()} para {self.paciente.nome_completo}"

class DocumentoPaciente(models.Model):
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='documentos')
    titulo = models.CharField(max_length=100)
    arquivo = models.FileField(upload_to='documentos_pacientes/')
    data_upload = models.DateTimeField(auto_now_add=True)
    enviado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.titulo} - {self.paciente.nome_completo}"

class OpcaoClinica(models.Model):
    ESPECIALIDADE_CHOICES = [
        ('Cardiologia', 'Cardiologia'),
        ('Ginecologia', 'Ginecologia'),
        ('Neonatologia', 'Neonatologia'),
        ('Obstetrícia', 'Obstetrícia'), # <-- Corrigido com acento
        ('Ortopedia', 'Ortopedia'),
        ('Pediatria', 'Pediatria'),
        ('Reumatologia', 'Reumatologia'),
        ('Reumatologia Pediátrica', 'Reumatologia Pediátrica'), # <-- Corrigido com acento
    ]
    AREA_CHOICES = [
        ('QUEIXA_PRINCIPAL', 'Queixa Principal'),
        ('HDA', 'História da Doença Atual'),
        ('HMP', 'História Médica Pregressa'),
        ('EXAME_FISICO_GERAL', 'Exame Físico - Geral'),
        ('EXAME_FISICO_CARDIO', 'Exame Físico - Cardiovascular'),
        ('EXAME_FISICO_RESP', 'Exame Físico - Respiratório'),
        ('EXAME_FISICO_ORTO', 'Exame Físico - Ortopédico'),
    ]

    descricao = models.CharField(max_length=255, help_text="Ex: 'Dor precordial tipo aperto'")
    especialidade = models.CharField(max_length=50, choices=ESPECIALIDADE_CHOICES, db_index=True)
    area_clinica = models.CharField(max_length=50, choices=AREA_CHOICES, db_index=True, verbose_name="Área do Prontuário")

    class Meta:
        verbose_name = "Opção Clínica"
        verbose_name_plural = "Opções Clínicas"
        unique_together = ('descricao', 'especialidade', 'area_clinica')
        ordering = ['especialidade', 'area_clinica', 'descricao']

    def __str__(self):
        return f"[{self.especialidade} / {self.area_clinica}] {self.descricao}"

class AnamneseGinecologica(models.Model):
    anamnese = models.OneToOneField(Anamnese, on_delete=models.CASCADE, related_name='ginecologica')
    # Histórico Menstrual e Obstétrico
    dum = models.DateField(null=True, blank=True, verbose_name="DUM")
    menarca_idade = models.PositiveIntegerField(null=True, blank=True, verbose_name="Idade da Menarca")
    ciclo_regular = models.CharField(max_length=10, choices=[('regular', 'Regular'), ('irregular', 'Irregular')], null=True, blank=True)
    ciclo_intervalo = models.CharField(max_length=50, blank=True, null=True, verbose_name="Intervalo do Ciclo")
    ciclo_duracao = models.CharField(max_length=50, blank=True, null=True, verbose_name="Duração do Ciclo")
    dismenorreia = models.CharField(max_length=3, choices=[('sim', 'Sim'), ('nao', 'Não')], default='nao', null=True, blank=True)
    gesta = models.PositiveIntegerField(null=True, blank=True, verbose_name="Gesta (G)")
    para = models.PositiveIntegerField(null=True, blank=True, verbose_name="Para (P)")
    cesareas = models.PositiveIntegerField(null=True, blank=True, verbose_name="Cesáreas (C)")
    abortos = models.PositiveIntegerField(null=True, blank=True, verbose_name="Abortos (A)")
    complicacoes_obstetricas = models.TextField(blank=True, null=True, verbose_name="Complicações Obstétricas Anteriores")
    # Rastreamento e Contracepção
    ultimo_preventivo_data = models.DateField(null=True, blank=True, verbose_name="Último Preventivo (Data)")
    ultimo_preventivo_resultado = models.CharField(max_length=255, blank=True, null=True, verbose_name="Resultado Preventivo")
    ultima_mamografia_data = models.DateField(null=True, blank=True, verbose_name="Última Mamografia (Data)")
    ultima_mamografia_resultado = models.CharField(max_length=255, blank=True, null=True, verbose_name="Resultado Mamografia")
    mac_atual = models.CharField(max_length=100, blank=True, null=True, verbose_name="Método Contraceptivo Atual")
    mac_anterior = models.CharField(max_length=100, blank=True, null=True, verbose_name="Métodos Anteriores")
    hists_ists = models.TextField(blank=True, null=True, verbose_name="Histórico de ISTs")
    # Queixa Atual (Sintomas são tratados no frontend/serializer)
    sintomas = models.JSONField(default=dict, blank=True, null=True) # Armazena os checkboxes { "corrimento": true, ... }
    # Exame Físico
    pa = models.CharField(max_length=20, blank=True, null=True, verbose_name="Pressão Arterial (mmHg)")
    fc = models.PositiveIntegerField(null=True, blank=True, verbose_name="Frequência Cardíaca (bpm)")
    peso = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="Peso (kg)")
    altura = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True, verbose_name="Altura (m)")
    ex_mamas = models.TextField(blank=True, null=True, verbose_name="Exame das Mamas")
    ex_abdome = models.TextField(blank=True, null=True, verbose_name="Exame Abdominal")
    ex_genitais_externos = models.TextField(blank=True, null=True, verbose_name="Exame Genitais Externos")
    ex_especular = models.TextField(blank=True, null=True, verbose_name="Exame Especular")
    ex_toque = models.TextField(blank=True, null=True, verbose_name="Toque Vaginal Bimanual")

    def __str__(self):
        return f"Dados Ginecológicos de {self.anamnese.paciente.nome_completo}"

class AnamneseOrtopedia(models.Model):
    anamnese = models.OneToOneField(Anamnese, on_delete=models.CASCADE, related_name='ortopedica')
    sintomas = models.JSONField(default=dict, blank=True, null=True) # { "dor": true, "trauma": false, ... }
    antecedentes = models.TextField(blank=True, null=True, verbose_name="Antecedentes Ortopédicos")
    ex_local = models.CharField(max_length=255, blank=True, null=True, verbose_name="Local Afetado / Articulação")
    ex_inspecao = models.TextField(blank=True, null=True, verbose_name="Inspeção")
    ex_palpacao = models.TextField(blank=True, null=True, verbose_name="Palpação")
    ex_adm = models.TextField(blank=True, null=True, verbose_name="Amplitude de Movimento (ADM)")
    ex_forca = models.TextField(blank=True, null=True, verbose_name="Força Muscular (0-5)")
    ex_neurovascular = models.TextField(blank=True, null=True, verbose_name="Exame Neurovascular")
    ex_testes = models.TextField(blank=True, null=True, verbose_name="Testes Especiais")

    def __str__(self):
        return f"Dados Ortopédicos de {self.anamnese.paciente.nome_completo}"

class AnamneseCardiologia(models.Model):
    anamnese = models.OneToOneField(Anamnese, on_delete=models.CASCADE, related_name='cardiologica')
    sintomas = models.JSONField(default=dict, blank=True, null=True) # { "dor_toracica": true, ... }
    fatores_risco = models.JSONField(default=dict, blank=True, null=True) # { "has": true, "dm": false, ... }
    pa = models.CharField(max_length=20, blank=True, null=True, verbose_name="Pressão Arterial (mmHg)")
    fc = models.PositiveIntegerField(null=True, blank=True, verbose_name="Frequência Cardíaca (bpm)")
    ictus_cordis = models.CharField(max_length=255, blank=True, null=True, verbose_name="Ictus Cordis")
    ausculta_cardiaca = models.TextField(blank=True, null=True, verbose_name="Ausculta Cardíaca")
    pulsos = models.TextField(blank=True, null=True, verbose_name="Pulsos Periféricos")
    exame_fisico_outros = models.TextField(blank=True, null=True, verbose_name="Outros Achados Exame Físico")
    medicamentos_em_uso = models.TextField(blank=True, null=True, verbose_name="Medicamentos Cardiológicos em Uso")
    historico_familiar = models.TextField(blank=True, null=True, verbose_name="Histórico Familiar Cardiológico")

    def __str__(self):
        return f"Dados Cardiológicos de {self.anamnese.paciente.nome_completo}"

class AnamnesePediatria(models.Model):
    anamnese = models.OneToOneField(Anamnese, on_delete=models.CASCADE, related_name='pediatrica')
    # Gestacional e Nascimento
    tipo_parto = models.CharField(max_length=50, blank=True, null=True)
    idade_gestacional = models.CharField(max_length=50, blank=True, null=True) # Pode ser '39s 2d'
    peso_nascimento = models.PositiveIntegerField(null=True, blank=True, verbose_name="Peso ao Nascer (g)")
    apgar = models.CharField(max_length=10, blank=True, null=True, verbose_name="APGAR (1º/5º)")
    intercorrencias_gestacao_parto = models.TextField(blank=True, null=True)
    # Aleitamento e Vacinação
    aleitamento = models.CharField(max_length=20, blank=True, null=True)
    introducao_alimentar = models.TextField(blank=True, null=True)
    vacinacao = models.CharField(max_length=20, blank=True, null=True)
    vacinacao_obs = models.TextField(blank=True, null=True)
    # DNPM
    dnpm = models.JSONField(default=dict, blank=True, null=True) # { "sustenta_cabeca": true, ... }
    # Sintomas
    sintomas = models.JSONField(default=dict, blank=True, null=True) # { "febre": true, ... }
    # Exame Físico Pediátrico
    peso = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="Peso Atual (kg)")
    altura = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True, verbose_name="Altura Atual (cm)") # Ajustado para cm
    pc = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, verbose_name="Perímetro Cefálico (cm)")
    temperatura = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, verbose_name="Temperatura (°C)")
    estado_geral = models.TextField(blank=True, null=True)
    oroscopia = models.TextField(blank=True, null=True)
    ausculta_resp = models.TextField(blank=True, null=True)
    ausculta_card = models.TextField(blank=True, null=True)
    abdome = models.TextField(blank=True, null=True)
    pele_faneros = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Dados Pediátricos de {self.anamnese.paciente.nome_completo}"

class AnamneseNeonatologia(models.Model):
    anamnese = models.OneToOneField(Anamnese, on_delete=models.CASCADE, related_name='neonatologia')
    # Histórico Materno e Gestacional
    idade_materna = models.PositiveIntegerField(null=True, blank=True)
    gpa = models.CharField(max_length=20, blank=True, null=True, verbose_name="Gesta/Para/Aborto")
    tipo_sanguineo_mae = models.CharField(max_length=5, blank=True, null=True)
    coombs_indireto = models.CharField(max_length=50, blank=True, null=True)
    sorologias = models.JSONField(default=dict, blank=True, null=True) # { "vdrl": true, ... }
    intercorrencias_gestacao = models.TextField(blank=True, null=True)
    # Dados do Parto
    tipo_parto = models.CharField(max_length=50, blank=True, null=True)
    idade_gestacional = models.CharField(max_length=50, blank=True, null=True)
    bolsa_rota = models.CharField(max_length=100, blank=True, null=True)
    liquido_amniotico = models.CharField(max_length=100, blank=True, null=True)
    # Dados do RN
    peso_nascimento = models.PositiveIntegerField(null=True, blank=True, verbose_name="Peso ao Nascer (g)")
    comprimento = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, verbose_name="Comprimento (cm)")
    pc = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, verbose_name="Perímetro Cefálico (cm)")
    apgar = models.CharField(max_length=10, blank=True, null=True, verbose_name="APGAR (1º/5º)")
    reanimacao = models.TextField(blank=True, null=True, verbose_name="Reanimação em Sala de Parto")
    # Triagens
    triagens = models.JSONField(default=dict, blank=True, null=True) # { "pezinho": true, ... }
    # Exame Físico Neonatal
    ex_estado_geral = models.TextField(blank=True, null=True)
    ex_pele = models.TextField(blank=True, null=True)
    ex_cabeca = models.TextField(blank=True, null=True)
    ex_resp = models.TextField(blank=True, null=True)
    ex_cardio = models.TextField(blank=True, null=True)
    ex_abdome = models.TextField(blank=True, null=True)
    ex_genitalia = models.TextField(blank=True, null=True)
    ex_neuro = models.TextField(blank=True, null=True)
    # Evolução Inicial
    alimentacao = models.CharField(max_length=20, blank=True, null=True)
    diurese = models.CharField(max_length=50, blank=True, null=True)
    evacuacao = models.CharField(max_length=50, blank=True, null=True)
    plano = models.TextField(blank=True, null=True, verbose_name="Plano e Observações")

    def __str__(self):
        return f"Dados Neonatais de {self.anamnese.paciente.nome_completo}"

    class Meta:
        verbose_name = "Anamnese Neonatal"
        verbose_name_plural = "Anamneses Neonatais"