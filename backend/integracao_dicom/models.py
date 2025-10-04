# integracao_dicom/models.py
from django.db import models
from pacientes.models import Paciente # Supondo que você tem um app 'pacientes'

class ExameDicom(models.Model):
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='exames_dicom')
    orthanc_study_id = models.CharField(max_length=255, unique=True, help_text="ID do Estudo no Orthanc")
    study_description = models.CharField(max_length=255, blank=True, null=True)
    study_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Exame de {self.paciente.nome} - {self.study_date.strftime('%d/%m/%Y')}"