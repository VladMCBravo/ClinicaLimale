# backend/prontuario/migrations/0024_migrar_especialidades_para_fk.py

from django.db import migrations

def migrar_dados(apps, schema_editor):
    """
    Pega o texto de 'especialidade' (ex: "cardiologia") e encontra
    o ID da especialidade correspondente em 'usuarios.Especialidade'
    (ex: onde nome="Cardiologia"), salvando-o em 'especialidade_link'.
    """
    Evolucao = apps.get_model('prontuario', 'Evolucao')
    Especialidade = apps.get_model('usuarios', 'Especialidade')
    
    # Tenta importar o Agendamento, mas não falha se não conseguir
    # (pode não ser necessário para esta migração específica)
    try:
        Agendamento = apps.get_model('agendamentos', 'Agendamento')
    except LookupError:
        Agendamento = None

    # Filtra apenas evoluções que ainda não foram migradas
    for evolucao in Evolucao.objects.filter(
        especialidade_link__isnull=True
    ):
        especialidade_herdada = None
        
        # 1. Tenta herdar do Agendamento primeiro (lógica nova)
        if Agendamento and evolucao.agendamento:
            try:
                # O 'agendamento' (OneToOne) já está na evolucao
                especialidade_herdada = evolucao.agendamento.especialidade
            except Agendamento.DoesNotExist:
                 pass # Agendamento pode ter sido deletado
        
        # 2. Se não tiver agendamento, tenta pelo texto antigo
        if not especialidade_herdada and evolucao.especialidade:
            nome_str = evolucao.especialidade.lower()
            try:
                esp_obj = Especialidade.objects.get(nome__iexact=nome_str)
                especialidade_herdada = esp_obj
            except Especialidade.DoesNotExist:
                print(f"\nAviso: Não foi encontrada especialidade para o texto '{nome_str}' (Evolucao ID {evolucao.id})")
            except Especialidade.MultipleObjectsReturned:
                esp_obj = Especialidade.objects.filter(nome__iexact=nome_str).first()
                especialidade_herdada = esp_obj
        
        # 3. Salva o que encontrou
        if especialidade_herdada:
            evolucao.especialidade_link = especialidade_herdada
            evolucao.save(update_fields=['especialidade_link'])


class Migration(migrations.Migration):

    dependencies = [
        # ★★★ CORREÇÃO AQUI ★★★
        # Use o nome EXATO do arquivo que o makemigrations criou
        # no seu último log de sucesso:
        ('prontuario', '0023_evolucao_agendamento_evolucao_especialidade_link_and_more'),
        
        ('usuarios', '__first__'), 
        ('agendamentos', '__first__'),
    ]

    operations = [
        migrations.RunPython(migrar_dados),
    ]