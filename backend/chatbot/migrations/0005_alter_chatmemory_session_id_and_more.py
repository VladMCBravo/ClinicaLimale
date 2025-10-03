# Generated manually for security fixes

from django.db import migrations, models
import chatbot.models

class Migration(migrations.Migration):

    dependencies = [
        ('chatbot', '0004_alter_chatmemory_options_chatbotmetrics'),
    ]

    operations = [
        migrations.AlterField(
            model_name='chatmemory',
            name='session_id',
            field=models.CharField(db_index=True, max_length=50, unique=True),
        ),
        migrations.AlterField(
            model_name='chatmemory',
            name='memory_data',
            field=models.JSONField(default=dict, validators=[chatbot.models.validate_json_data]),
        ),
        migrations.AlterField(
            model_name='chatbotmetrics',
            name='session_id',
            field=models.CharField(db_index=True, max_length=50),
        ),
        migrations.AlterField(
            model_name='chatbotmetrics',
            name='dados_evento',
            field=models.JSONField(default=dict, validators=[chatbot.models.validate_json_data]),
        ),
    ]