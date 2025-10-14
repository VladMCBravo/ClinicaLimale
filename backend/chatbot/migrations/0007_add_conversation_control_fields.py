# Generated manually for conversation control features

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chatbot', '0006_fix_security_issues'),
    ]

    operations = [
        migrations.AddField(
            model_name='chatmemory',
            name='transferencia_solicitada',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='chatmemory',
            name='atendimento_humano_ativo',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='chatmemory',
            name='conversa_encerrada',
            field=models.BooleanField(default=False),
        ),
        migrations.AddIndex(
            model_name='chatmemory',
            index=models.Index(fields=['transferencia_solicitada', 'updated_at'], name='chatbot_chatmemory_transfer_idx'),
        ),
        migrations.AddIndex(
            model_name='chatmemory',
            index=models.Index(fields=['conversa_encerrada', 'updated_at'], name='chatbot_chatmemory_encerrada_idx'),
        ),
    ]