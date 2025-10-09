# prontuario/migrations/0005_carregar_opcoes_queixa_cardiologia.py

from django.db import migrations

SINTOMAS_CARDIOLOGIA = [
    "Palpitações", "Tosse", "Hemoptoicos", "Ortopneia", "Síncope",
    "Pré Síncope", "Tontura", "Mal estar", "Dispneia aos esforços",
    "Dispneia em repouso", "Dispneia paroxística noturna", "Dor torácica",
    "Fadiga", "Cefaleia", "Edema",
]

def carregar_opcoes(apps, schema_editor):
    OpcaoClinica = apps.get_model('prontuario', 'OpcaoClinica')
    for sintoma in SINTOMAS_CARDIOLOGIA:
        OpcaoClinica.objects.get_or_create(
            descricao=sintoma,
            especialidade='Cardiologia',
            # A área clínica aqui é a nova: QUEIXA_ATUAL
            area_clinica='QUEIXA_ATUAL' 
        )

def remover_opcoes(apps, schema_editor):
    OpcaoClinica = apps.get_model('prontuario', 'OpcaoClinica')
    OpcaoClinica.objects.filter(
        especialidade='Cardiologia',
        area_clinica='QUEIXA_ATUAL'
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        # IMPORTANTE: Coloque aqui o nome da sua última migração, que é a 0004
        ('prontuario', '0004_popular_opcoes_clinicas'), 
    ]

    operations = [
        migrations.RunPython(carregar_opcoes, reverse_code=remover_opcoes),
    ]