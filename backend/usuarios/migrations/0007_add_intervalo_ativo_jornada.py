# Generated migration for adding intervalo_consulta and ativo fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0006_customuser_genero'),
    ]

    operations = [
        migrations.AddField(
            model_name='jornadadetrabalho',
            name='intervalo_consulta',
            field=models.IntegerField(default=20, help_text='Tempo em minutos entre cada consulta', verbose_name='Intervalo entre consultas (minutos)'),
        ),
        migrations.AddField(
            model_name='jornadadetrabalho',
            name='ativo',
            field=models.BooleanField(default=True, help_text='Define se esta jornada está ativa', verbose_name='Ativo'),
        ),
    ]