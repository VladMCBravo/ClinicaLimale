# backend/prontuario/models.py

import random
import string
from django.db import models
from django.conf import settings
from pacientes.models import Paciente
import json, re
import os
import unicodedata
from django.utils.text import slugify
from datetime import datetime, timedelta
from crm.models import Ciclo

# COLE A FUNÇÃO AQUI, ANTES DE QUALQUER CLASSE (Evolucao, etc)
def upload_laudo_pdf_path(instance, filename):
    ext = filename.split('.')[-1]
    nome_base = filename.rsplit('.', 1)[0]
    nome_sem_acento = unicodedata.normalize('NFKD', nome_base).encode('ASCII', 'ignore').decode('utf-8')
    nome_seguro = slugify(nome_sem_acento)
    hoje = datetime.now()
    return f'laudos_assinados/{hoje.strftime("%Y/%m")}/{nome_seguro}.{ext}'

class Evolucao(models.Model):
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='evolucoes')
    medico = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    data_atendimento = models.DateTimeField(auto_now_add=True)
    
    # --- CAMPO DE TEXTO ANTIGO ---
    # DELETE a definição inteira do campo 'especialidade' (o CharField)
    # especialidade = models.CharField(...)  <-- DELETE ISTO
    
    # --- CAMPO DE AGENDAMENTO (Mantido) ---
    agendamento = models.OneToOneField(
        'agendamentos.Agendamento',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='evolucao'
    )

    # --- CAMPO FK (RENOMEADO) ---
    # Renomeie 'especialidade_link' para 'especialidade'
    especialidade = models.ForeignKey(
        'usuarios.Especialidade',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name="Especialidade da Consulta"
    )
    # (Campos SOAP - notas_subjetivas, notas_objetivas, etc... - Sem alteração)
    notas_subjetivas = models.TextField(blank=True, null=True, verbose_name="Subjetivo (Queixa Principal / HDA)")
    notas_objetivas = models.TextField(blank=True, null=True, verbose_name="Exame Físico (Ausculta, Sinais, etc.)")
    avaliacao = models.TextField(blank=True, null=True, verbose_name="Diagnóstico / Hipóteses")
    plano = models.TextField(blank=True, null=True, verbose_name="Plano Terapêutico / Condutas")
    
    # (Campos de vitais - pressao_arterial, peso, etc... - Sem alteração)
    pressao_arterial = models.CharField(max_length=20, blank=True, null=True, verbose_name="Pressão Arterial")
    frequencia_cardiaca = models.PositiveIntegerField(blank=True, null=True, verbose_name="Frequência Cardíaca (bpm)")
    peso = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name="Peso (kg)")
    altura = models.DecimalField(max_digits=3, decimal_places=2, blank=True, null=True, verbose_name="Altura (m)")
    exames_complementares = models.TextField(blank=True, null=True, verbose_name="Exames Complementares (ECG, Eco, etc.)")
    
    class Meta:
        ordering = ['-data_atendimento']

    def __str__(self):
        return f"Evolução de {self.paciente.nome_completo} em {self.data_atendimento.strftime('%d/%m/%Y')}"

# --- ★★★ ADICIONE ESTE MODELO FALTANDO AQUI ★★★ ---
# Este modelo foi acidentalmente removido e está causando o erro.

class Prescricao(models.Model):
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='prescricoes')
    medico = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    titulo = models.CharField(max_length=255, blank=True, null=True, verbose_name="Título da Prescrição")
    data_prescricao = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-data_prescricao']

    def __str__(self):
        return f"Prescrição para {self.paciente.nome_completo} em {self.data_prescricao.strftime('%d/%m/%Y')}"

# --- FIM DA ADIÇÃO ---

class ItemPrescricao(models.Model):
    prescricao = models.ForeignKey('Prescricao', on_delete=models.CASCADE, related_name='itens')
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

class AnamneseClinicaGeral(models.Model):
    anamnese = models.OneToOneField(Anamnese, on_delete=models.CASCADE, related_name='clinica_geral')

    # Histórico Médico Pregresso (Doenças crônicas, cirurgias, internações)
    hmp = models.TextField(blank=True, null=True, verbose_name="Histórico Médico Pregresso")

    # Hábitos de Vida e Histórico Social
    habitos_sociais = models.TextField(blank=True, null=True, verbose_name="Hábitos e Histórico Social (Tabagismo, Etilismo, Ocupação, etc.)")

    # Status Vacinal Adulto (Simplificado)
    vacina_adulto_status = models.TextField(blank=True, null=True, verbose_name="Status Vacinal (Adulto)")

    # Alergias, Medicamentos em Uso e Histórico Familiar já estão no modelo Anamnese principal

    def __str__(self):
        return f"Dados de Clínica Geral de {self.anamnese.paciente.nome_completo}"

    class Meta:
        verbose_name = "Anamnese Clínica Geral"
        verbose_name_plural = "Anamneses Clínica Geral"

class AnamneseGinecologica(models.Model):
    anamnese = models.OneToOneField(Anamnese, on_delete=models.CASCADE, related_name='ginecologica')
    
    # --- HISTÓRICO MENSTRUAL E OBSTÉTRICO (Mantidos) ---
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
    
    # --- RASTREAMENTO E CONTRACEPÇÃO (Mantidos) ---
    ultimo_preventivo_data = models.DateField(null=True, blank=True, verbose_name="Último Preventivo (Data)")
    ultimo_preventivo_resultado = models.CharField(max_length=255, blank=True, null=True, verbose_name="Resultado Preventivo")
    ultima_mamografia_data = models.DateField(null=True, blank=True, verbose_name="Última Mamografia (Data)")
    ultima_mamografia_resultado = models.CharField(max_length=255, blank=True, null=True, verbose_name="Resultado Mamografia")
    mac_atual = models.CharField(max_length=100, blank=True, null=True, verbose_name="Método Contraceptivo Atual")
    mac_anterior = models.CharField(max_length=100, blank=True, null=True, verbose_name="Métodos Anteriores")
    hists_ists = models.TextField(blank=True, null=True, verbose_name="Histórico de ISTs")
    
    # --- CAMPOS REMOVIDOS (Agora pertencem à Evolucao/SOAP Ginecológico) ---
    # sintomas = models.JSONField(...) <-- REMOVIDO
    # pa = models.CharField(...) <-- REMOVIDO
    # fc = models.PositiveIntegerField(...) <-- REMOVIDO
    # peso = models.DecimalField(...) <-- REMOVIDO
    # altura = models.DecimalField(...) <-- REMOVIDO
    # ex_mamas = models.TextField(...) <-- REMOVIDO
    # ex_abdome = models.TextField(...) <-- REMOVIDO
    # ex_genitais_externos = models.TextField(...) <-- REMOVIDO
    # ex_especular = models.TextField(...) <-- REMOVIDO
    # ex_toque = models.TextField(...) <-- REMOVIDO

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
    
    # --- ★★★ CORREÇÃO AQUI ★★★ ---
    # O seu formulário (HistoricoCardiologia.jsx) envia um texto simples,
    # então o modelo deve esperar um TextField, não um JSONField.
    
    fatores_risco = models.TextField(blank=True, null=True, verbose_name="Fatores de Risco (Texto)")
    # --- FIM DA CORREÇÃO ---

    # --- CAMPOS EXISTENTES (nomes corretos) ---
    comorbidades_outras = models.TextField(blank=True, null=True, verbose_name="Outras Comorbidades (Ex: DRC, DPOC)")
    cirurgias_cardiacas_previas = models.TextField(blank=True, null=True, verbose_name="Cirurgias Prévias (Ex: CRM, Angioplastia)")
    medicamentos_em_uso = models.TextField(blank=True, null=True, verbose_name="Medicamentos Cardiológicos em Uso")
    historico_familiar = models.TextField(blank=True, null=True, verbose_name="Histórico Familiar Cardiológico (Ex: DAC precoce)")
    habito_tabagismo = models.CharField(max_length=100, blank=True, null=True, verbose_name="Tabagismo (carga tabágica)")
    habito_etilismo = models.CharField(max_length=100, blank=True, null=True, verbose_name="Etilismo (frequência, tipo)")
    habito_atividade_fisica = models.CharField(max_length=100, blank=True, null=True, verbose_name="Atividade Física")

    def __str__(self):
        return f"Dados Cardiológicos de {self.anamnese.paciente.nome_completo}"

class AnamnesePediatria(models.Model):
    anamnese = models.OneToOneField(Anamnese, on_delete=models.CASCADE, related_name='pediatrica')
    
    # --- Gestacional e Nascimento (VERIFIQUE ISSO) ---
    tipo_parto = models.CharField(max_length=50, blank=True, null=True)
    idade_gestacional = models.CharField(max_length=50, blank=True, null=True)
    
    # ★★★ CORREÇÃO DE TIPO DE DADO ★★★
    # Deve ser IntegerField (ou DecimalField), não CharField, para o 'peso_nascimento: 3500' funcionar
    peso_nascimento = models.PositiveIntegerField(null=True, blank=True, verbose_name="Peso ao Nascer (g)")
    
    # ★★★ CORREÇÃO DE TIPO DE DADO ★★★
    # Os 3 campos separados (como o médico quer)
    apgar_1 = models.PositiveIntegerField(null=True, blank=True, verbose_name="APGAR 1º Min")
    apgar_5 = models.PositiveIntegerField(null=True, blank=True, verbose_name="APGAR 5º Min")
    apgar_10 = models.PositiveIntegerField(null=True, blank=True, verbose_name="APGAR 10º Min")
    
    # REMOVA ESTE CAMPO SE ELE EXISTIR
    # apgar = models.CharField(max_length=10, blank=True, null=True, verbose_name="APGAR (1º/5º)")

    intercorrencias_gestacao_parto = models.TextField(blank=True, null=True)
    
    # --- Vacinação (Mantido - Resumo) ---
    # (A caderneta detalhada está em VacinaPaciente)
    vacinacao = models.CharField(max_length=20, blank=True, null=True, help_text="Resumo: Em dia / Atrasada")
    vacinacao_obs = models.TextField(blank=True, null=True)
    
    # --- DNPM (Mantido - Resumo) ---
    # (Os marcos detalhados estão em MarcoDNPM)
    dnpm = models.JSONField(default=dict, blank=True, null=True, help_text="Resumo dos marcos principais")
    
    # --- CAMPOS ANTIGOS DE ALIMENTAÇÃO (REMOVIDOS/SUBSTITUÍDOS) ---
    # aleitamento = models.CharField(...) <-- REMOVIDO
    # introducao_alimentar = models.TextField(...) <-- REMOVIDO

    # --- NOVA SEÇÃO: Alimentação 0-6 Meses ---
    alimentacao_0_6m = models.JSONField(default=dict, blank=True, null=True, 
        help_text="JSON com chaves: tipo_aleitamento (AME/Misto/Formula), pega (Boa/Parcial/Ruim), succao (Eficaz/Fraca/Ausente), diurese (Adequada/Reduzida), evacuacao (Normal/Ressecada/Diarreica), suplementacao (Vitamina/Ferro/Nenhuma)")
    alimentacao_0_6m_obs = models.TextField(blank=True, null=True, verbose_name="Observações Alimentação 0-6m")

    # --- NOVA SEÇÃO: Alimentação 6-12+ Meses ---
    alimentacao_6_12m = models.JSONField(default=dict, blank=True, null=True,
        help_text="JSON com chaves: tipo_alimentacao (Mantem AM/Formula/Ambos), refeicoes_dia (2/3/>3), textura (Amassada/Picada/Pedaços), aceitacao (Boa/Parcial/Ruim), agua (Adequada/Baixa), suplementacao (VitD/Ferro/Nenhuma), aceitacao_geral (Adequada/Seletiva/Dificuldade Textura)")
    metodo_ia = models.CharField(max_length=50, blank=True, null=True, verbose_name="Método Introdução Alimentar (Tradicional/BLW/BLISS/Misto)")
    copo_transicao = models.CharField(max_length=50, blank=True, null=True, verbose_name="Tipo de Copo de Transição")
    alimentacao_6_12m_obs = models.TextField(blank=True, null=True, verbose_name="Observações Alimentação 6-12m")

    # --- NOVA SEÇÃO: Sono / Cólicas / Comportamento ---
    sono_comportamento = models.JSONField(default=dict, blank=True, null=True,
        help_text="JSON com chaves: sono_diurno (Adequado/Alterado), sono_noturno (Adequado/Alterado), colica (Adequado/Alterado), choro (Adequado/Alterado), vinculo (Adequado/Alterado)")
    sono_comportamento_obs = models.TextField(blank=True, null=True, verbose_name="Observações Sono/Comportamento")

    # --- CAMPOS REMOVIDOS (Agora pertencem à Evolucao/SOAP Pediátrico) ---
    # sintomas = models.JSONField(...) <-- REMOVIDO (Fica na consulta atual)
    # peso = models.DecimalField(...) <-- REMOVIDO (Peso atual fica na evolução)
    # altura = models.DecimalField(...) <-- REMOVIDO (Altura atual fica na evolução)
    # pc = models.DecimalField(...) <-- REMOVIDO (PC atual fica na evolução)
    # temperatura = models.DecimalField(...) <-- REMOVIDO
    # estado_geral = models.TextField(...) <-- REMOVIDO
    # oroscopia = models.TextField(...) <-- REMOVIDO
    # ausculta_resp = models.TextField(...) <-- REMOVIDO
    # ausculta_card = models.TextField(...) <-- REMOVIDO
    # abdome = models.TextField(...) <-- REMOVIDO
    # pele_faneros = models.TextField(...) <-- REMOVIDO

    def __str__(self):
        return f"Dados Pediátricos de {self.anamnese.paciente.nome_completo}"

class AnamneseNeonatologia(models.Model):
    anamnese = models.OneToOneField(Anamnese, on_delete=models.CASCADE, related_name='neonatologia')
    
    # --- DADOS MATERNOS E GESTACIONAIS (Já existentes) ---
    idade_materna = models.PositiveIntegerField(null=True, blank=True)
    gpa = models.CharField(max_length=20, blank=True, null=True, verbose_name="Gesta/Para/Aborto")
    tipo_sanguineo_mae = models.CharField(max_length=5, blank=True, null=True)
    coombs_indireto = models.CharField(max_length=50, blank=True, null=True)
    sorologias = models.JSONField(default=dict, blank=True, null=True) # { "vdrl": true, ... }
    intercorrencias_gestacao = models.TextField(blank=True, null=True)
    # --- NOVOS CAMPOS PRÉ-NATAL (do PDF [cite: 8, 10, 11, 12]) ---
    pre_natal = models.CharField(max_length=20, blank=True, null=True, verbose_name="Pré-Natal") # Adequado/Inadequado/Ignorado
    tipo_gestacao = models.CharField(max_length=20, blank=True, null=True, verbose_name="Tipo Gestação") # Única/Gemelar
    corticoterapia = models.CharField(max_length=10, blank=True, null=True, verbose_name="Corticoterapia") # Sim/Não
    neuroprotecao_mg = models.CharField(max_length=20, blank=True, null=True, verbose_name="Neuroproteção (Sulf. Magnésio)") # Sim/Não/Ignorado
    
    # --- DADOS DO PARTO (Já existentes) ---
    tipo_parto = models.CharField(max_length=50, blank=True, null=True)
    idade_gestacional = models.CharField(max_length=50, blank=True, null=True)
    bolsa_rota = models.CharField(max_length=100, blank=True, null=True)
    liquido_amniotico = models.CharField(max_length=100, blank=True, null=True)
    reanimacao = models.JSONField(default=dict, blank=True, null=True, verbose_name="Reanimação em Sala de Parto (JSON)")

    # --- DADOS DO RN AO NASCER (Já existentes) ---
    peso_nascimento = models.PositiveIntegerField(null=True, blank=True, verbose_name="Peso ao Nascer (g)")
    comprimento = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, verbose_name="Comprimento (cm)")
    pc_nascimento = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, verbose_name="PC ao Nascer (cm)")
    apgar = models.CharField(max_length=10, blank=True, null=True, verbose_name="APGAR (1º/5º/10')") # PDF pede 1', 5' e 10' [cite: 67]
    
    # --- TRIAGENS (Já existente) ---
    triagens = models.JSONField(default=dict, blank=True, null=True) # { "pezinho": true, ... }

    # --- ★ NOVOS CAMPOS: HISTÓRICO HOSPITALAR (Seção IV do PDF ) ★ ---
    ig_classificacao = models.CharField(max_length=50, blank=True, null=True, verbose_name="Classificação IG") # Ex: RNPTE, A Termo
    peso_classificacao = models.CharField(max_length=50, blank=True, null=True, verbose_name="Adequação Peso") # Ex: PIG, AIG, GIG
    tempo_internacao = models.CharField(max_length=50, blank=True, null=True, verbose_name="Tempo de Internação (dias)")
    suporte_ventilatorio = models.CharField(max_length=100, blank=True, null=True, verbose_name="Suporte Ventilatório (VM/CPAP/O2)")
    fototerapia = models.CharField(max_length=50, blank=True, null=True, verbose_name="Fototerapia (dias)")
    npp = models.CharField(max_length=50, blank=True, null=True, verbose_name="NPP (dias)")
    antibioticos = models.TextField(blank=True, null=True, verbose_name="Antibióticos (Esquema/Dias)")
    diagnosticos_principais = models.TextField(blank=True, null=True, verbose_name="Diagnósticos Principais na Alta")
    exames_realizados = models.JSONField(default=dict, blank=True, null=True, verbose_name="Exames Hospitalares (US-TF, Eco, etc.)")
    outros_exames = models.JSONField(default=list, blank=True, verbose_name="Lista de Outros Exames")
    # --- FIM DAS NOVAS ADIÇÕES ---

    def __str__(self):
        return f"Dados Neonatais de {self.anamnese.paciente.nome_completo}"

    class Meta:
        verbose_name = "Anamnese Neonatal"
        verbose_name_plural = "Anamneses Neonatais"

# --- INÍCIO DAS NOVAS ADIÇÕES ---

class MarcoDNPM(models.Model):
    """
    Armazena o registro longitudinal de CADA marco de desenvolvimento
    atingido pelo paciente. (Refere-se à Aba 3)
    """
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='marcos_dnpm')
    medico = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Identificador do marco (ex: 'senta_com_apoio')
    marco_id = models.CharField(max_length=100, db_index=True)
    
    # Descrição amigável (ex: 'Senta com apoio (~6m)')
    marco_descricao = models.CharField(max_length=255)
    
    # Idade-chave do marco (ex: '6m')
    idade_marco = models.CharField(max_length=10)
    
    alcançado = models.BooleanField(default=False)
    data_registro = models.DateTimeField(auto_now_add=True)
    observacao = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['paciente', 'data_registro']
        verbose_name = "Marco de DNPM"
        verbose_name_plural = "Marcos de DNPM"

    def __str__(self):
        return f"{self.paciente.nome_completo} - {self.marco_descricao} (Alcançado: {self.alcançado})"


class VacinaPaciente(models.Model):
    """
    Armazena o registro longitudinal de CADA vacina do paciente.
    (Refere-se à Aba 4 - Caderneta de Vacinação)
    """
    STATUS_CHOICES = [
        ('Pendente', 'Pendente'),
        ('Aplicada', 'Aplicada'),
        ('Atrasada', 'Atrasada'),
        ('Não se aplica', 'Não se aplica'),
    ]

    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='vacinas')
    # ★★★ ADICIONE ESTA LINHA ★★★
    # Este é o ID do frontend (ex: 'penta_1', 'bcg')
    vacina_id = models.CharField(max_length=100, db_index=True, null=True, blank=True)

    # Nome da vacina (ex: 'Pentavalente' ou 'Pneumo 13')
    nome_vacina = models.CharField(max_length=100, db_index=True)
    
    # Idade recomendada (ex: '2m', 'Ao Nascer')
    idade_recomendada = models.CharField(max_length=20)
    
    # Dose (ex: '1ª Dose', 'Reforço')
    dose = models.CharField(max_length=50)
    
    data_aplicacao = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Pendente')
    observacao = models.TextField(blank=True, null=True, help_text="Ex: Rede privada, lote, etc.")

    class Meta:
        ordering = ['paciente', 'idade_recomendada', 'nome_vacina']
        verbose_name = "Vacina do Paciente"
        verbose_name_plural = "Vacinas do Paciente"

    def __str__(self):
        return f"{self.paciente.nome_completo} - {self.nome_vacina} ({self.dose}) - {self.status}"

# --- FIM DAS NOVAS ADIÇÕES ---

class TemplateRelatorio(models.Model):
    """
    Armazena os "modelos" de relatórios com placeholders.
    Ex: "Atestado de Atividade Física", "Risco Cirúrgico", etc.
    """
    ESPECIALIDADE_CHOICES = [
        ('cardiologia', 'Cardiologia'),
        ('pediatria', 'Pediatria'),
        ('geral', 'Geral'),
    ]

    titulo = models.CharField(max_length=255)
    especialidade = models.CharField(max_length=100, choices=ESPECIALIDADE_CHOICES, default='geral')
    # O texto do template, ex: "Atesto que {{paciente_nome}}..."
    conteudo = models.TextField() 
    
    # Opcional, mas bom: quem criou o template
    medico_criador = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, blank=True
    )

    def __str__(self):
        return f"[{self.get_especialidade_display()}] {self.titulo}"


class RelatorioSalvo(models.Model):
    """
    Armazena o relatório final que foi gerado, editado e salvo pelo médico
    para um paciente específico.
    """
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name="relatorios")
    medico = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    
    # A consulta que originou o relatório (ex: a consulta de hoje)
    # Pode ser nulo se for um atestado avulso
    consulta = models.ForeignKey(
        Evolucao, 
        on_delete=models.SET_NULL, 
        null=True, blank=True
    )
    
    # O template que foi usado como base (bom para rastreabilidade)
    template_origem = models.ForeignKey(
        TemplateRelatorio,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )

    titulo = models.CharField(max_length=255) # Ex: "Atestado - João Silva - 31/10/2025"
    # O texto final, após o médico editar o template preenchido
    conteudo_final = models.TextField()
    
    data_criacao = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.titulo} - {self.paciente.nome_completo}"
    
    class Meta:
        ordering = ['-data_criacao']
        verbose_name = "Relatório Salvo"
        verbose_name_plural = "Relatórios Salvos"

# --- INÍCIO DA SEÇÃO DE LAUDOS (DENTRO DO PRONTUÁRIO) ---

class ModeloLaudo(models.Model):
    """
    Templates de Laudo. Fica aqui para que o prontuário possa consultar
    os modelos disponíveis na hora de criar um laudo.
    """
    titulo = models.CharField(max_length=255, unique=True)
    codigo_mnemonico = models.CharField(max_length=50, blank=True, null=True)
    conteudo_padrao = models.JSONField(default=dict, blank=True) 
    texto_padrao_html = models.TextField(blank=True)
    ativo = models.BooleanField(default=True)

    def __str__(self):
        return self.titulo

class Laudo(models.Model):
    """
    A tabela oficial de Laudos vinculada ao Prontuário Médico.
    Aqui ficam os textos finais e assinados.
    """
    STATUS_CHOICES = [
        ('RASCUNHO', 'Rascunho'),
        ('PROCESSANDO', 'Processando'),
        ('FINALIZADO', 'Finalizado'),
        ('ERRO', 'Erro'), # Já estava mapeado implicitamente no Celery, é bom documentar
        ('CANCELADO_POR_RETIFICACAO', 'Cancelado (Retificado)'), # <-- NOVA OPÇÃO
    ]

    # --- RELACIONAMENTOS ---
    # Usamos related_names únicos ('_prontuario') para evitar conflito com o app 'laudos'
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='laudos_prontuario')
    
    medico = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT, 
        related_name='laudos_assinados_prontuario', 
        null=True, blank=True
    )

    agendamento = models.OneToOneField(
        'agendamentos.Agendamento', 
        on_delete=models.SET_NULL, 
        related_name='laudo_prontuario',
        null=True, blank=True
    )

    # Vínculo com Exame (Pasta de Arquivos)
    exame = models.OneToOneField(
        'exames.Exame',
        on_delete=models.SET_NULL,
        related_name='laudo_prontuario_vinculo', 
        null=True, blank=True,
        help_text="Vínculo com os arquivos e credenciais do portal"
    )

    # --- CAMPOS DE DADOS ---
    titulo_exame = models.CharField(max_length=255) # O Front chama de 'titulo', o Serializer mapeia.
    tipo_exame = models.CharField(max_length=50, default='OBSTETRICO') 
    
    # Assinatura (Snapshot do momento)
    medico_responsavel = models.CharField(max_length=255, blank=True, null=True)
    crm_medico = models.CharField(max_length=20, blank=True, null=True)

    # Conteúdo
    dados_estruturados = models.JSONField(default=dict, blank=True)
    texto_laudo = models.TextField(blank=True)
    imagens_ids = models.JSONField(default=list, blank=True)
    
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='RASCUNHO')
    
    # --- CREDENCIAIS (Legado/Backup) ---
    # Estes campos existem aqui caso o laudo seja criado SEM um exame (pasta) vinculado
    codigo_acesso = models.CharField(max_length=20, blank=True, null=True, unique=True)
    senha_acesso = models.CharField(max_length=20, blank=True, null=True)

    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)

    # Arquivo PDF (Legado ou 2ª via estática)
    arquivo_pdf = models.FileField(upload_to=upload_laudo_pdf_path, null=True, blank=True)

    def save(self, *args, **kwargs):
        # --- SISTEMA DE SENHA ÚNICA (PORTAL DO PACIENTE) ---
        # Gera sempre um código e senha novos para CADA laudo criado.
        if not self.codigo_acesso:
            self.codigo_acesso = self.gerar_codigo_unico()
            self.senha_acesso = self.gerar_senha_simples()
        
        # Fallback de segurança caso a senha venha vazia por algum erro
        if not self.senha_acesso:
            self.senha_acesso = self.gerar_senha_simples()
        
        # Salva o laudo no banco de dados
        super().save(*args, **kwargs)
        
        # --- GATILHO AUTOMÁTICO: Atualiza o CRM após salvar ---
        self.sincronizar_crm()
    
    def sincronizar_crm(self):
        """
        Extrai a IG do feto1 e converte em DUM Virtual para alimentar o CRM.
        Baseado na estrutura do seu useObstetricoForm.js.
        """
        try:
            # 1. ACESSA OS DADOS DO FETO 1 (ONDE MORA A DATAÇÃO)
            dados = self.dados_estruturados
            if isinstance(dados, str): dados = json.loads(dados)
            
            feto1 = dados.get('feto1', {})
            if not feto1: return # Se não for obstétrico, ignora.

            # 2. BUSCA O MELHOR DADO DISPONÍVEL (ORDEM DE PREFERÊNCIA)
            # igVeredito é o resultado final do seu motor de cálculos do front
            ig_texto = feto1.get('igVeredito') or feto1.get('igBiometria') or feto1.get('igDum')
            dum_final = None

            # 3. TENTA A DUM REAL PRIMEIRO
            dum_real = feto1.get('dum')
            if dum_real and len(dum_real) >= 10:
                dum_final = datetime.strptime(dum_real[:10], "%Y-%m-%d").date()
            
            # 4. SE NÃO TEM DUM, FAZ A DUM REVERSA PELO TEXTO (Ex: "31s + 3d")
            if not dum_final and ig_texto:
                nums = re.findall(r'(\d+)', str(ig_texto))
                if len(nums) >= 1:
                    semanas = int(nums[0])
                    dias = int(nums[1]) if len(nums) > 1 else 0
                    
                    # Usa a data do exame como referência para o cálculo
                    ref_date = self.data_criacao.date()
                    if self.agendamento:
                        ref_date = self.agendamento.data_hora_inicio.date()
                    
                    # Cálculo: Data do Exame - Tempo de Gestação
                    dum_final = ref_date - timedelta(weeks=semanas, days=dias)

            # 5. GRAVA NO CRM E NO PACIENTE
            if dum_final:
                # Atualiza CRM
                ciclo, _ = Ciclo.objects.get_or_create(
                    paciente=self.paciente, tipo='GESTACAO', status='ativo'
                )
                if ciclo.data_dum != dum_final:
                    ciclo.data_dum = dum_final
                    ciclo.save(update_fields=['data_dum'])
                
                # Atualiza Cadastro da Paciente (Fonte da Verdade)
                if not self.paciente.dum or self.paciente.dum != dum_final:
                    self.paciente.dum = dum_final
                    self.paciente.save(update_fields=['dum'])
                    
        except Exception as e:
            print(f"Erro na sincronia inteligente: {e}")
            
    # Métodos auxiliares pertencentes a ESTE modelo
    def gerar_codigo_unico(self):
        prefixo = "PCT"
        while True:
            numero = ''.join(random.choices(string.digits, k=6))
            codigo = f"{prefixo}-{numero}"
            if not Laudo.objects.filter(codigo_acesso=codigo).exists():
                return codigo

    def gerar_senha_simples(self):
        chars = string.ascii_uppercase + string.digits
        return ''.join(random.choices(chars, k=6))

    def __str__(self):
        return f"Laudo: {self.titulo_exame} - {self.paciente.nome_completo}"

class ImagemLaudo(models.Model):
    laudo = models.ForeignKey(Laudo, on_delete=models.CASCADE, related_name='imagens')
    arquivo = models.ImageField(upload_to='laudos_imagens/%Y/%m/')
    data_upload = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Imagem do laudo {self.laudo.id}"
    
