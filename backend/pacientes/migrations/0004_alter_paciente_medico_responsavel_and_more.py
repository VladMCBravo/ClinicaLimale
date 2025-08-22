# backend/pacientes/migrations/0004_... .py

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        # As dependências que o Django gerou para você devem permanecer aqui
        ('pacientes', '0003_paciente_medico_responsavel'),
        ('faturamento', '0004_convenio_planoconvenio'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # --- PASSO DE LIMPEZA DE DADOS ADICIONADO AQUI ---
        # Esta operação SQL é executada ANTES da alteração do campo.
        # Ela encontra todas as linhas onde 'plano_convenio' é um texto vazio
        # e as substitui por NULO.
        migrations.RunSQL(
            "UPDATE pacientes_paciente SET plano_convenio = NULL WHERE plano_convenio = '';",
            # O segundo argumento é para o caso de você querer reverter a migração.
            migrations.RunSQL.noop 
        ),

        # O resto das operações geradas pelo Django continuam as mesmas
        migrations.AlterField(
            model_name='paciente',
            name='medico_responsavel',
            field=models.ForeignKey(blank=True, limit_choices_to={'cargo': 'medico'}, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='pacientes', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='paciente',
            name='plano_convenio',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='pacientes', to='faturamento.planoconvenio'),
        ),
    ]