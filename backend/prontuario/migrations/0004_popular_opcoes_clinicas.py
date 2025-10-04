# prontuario/migrations/0004_popular_opcoes_clinicas.py
from django.db import migrations

def popular_opcoes(apps, schema_editor):
    OpcaoClinica = apps.get_model('prontuario', 'OpcaoClinica')

    opcoes_cardiologia_hda = [
        "Dor precordial tipo aperto",
        "Palpitações",
        "Dispneia aos esforços",
        "Síncope",
        "Edema de membros inferiores",
    ]

    for desc in opcoes_cardiologia_hda:
        OpcaoClinica.objects.get_or_create(
            descricao=desc,
            especialidade='Cardiologia',
            area_clinica='HDA'
        )

class Migration(migrations.Migration):

    dependencies = [
        ('prontuario', '0003_opcaoclinica'), # <-- CORREÇÃO
    ]

    operations = [
        migrations.RunPython(popular_opcoes),
    ]