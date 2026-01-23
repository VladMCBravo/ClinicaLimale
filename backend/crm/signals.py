# backend/crm/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from pacientes.models import Paciente
from agendamentos.models import Agendamento
from .models import Ciclo, ProximaAcao

@receiver(post_save, sender=Paciente)
def criar_perfil_e_ciclo_inicial(sender, instance, created, **kwargs):
    """
    Quando um Paciente é criado, inicia automaticamente um Ciclo F1 (Entrada)
    e um Perfil Comportamental vazio.
    """
    if created:
        from .models import AnaliseComportamental
        AnaliseComportamental.objects.create(paciente=instance)
        
        # Cria ciclo padrão (pode ser ajustado via regra de negócio depois)
        Ciclo.objects.create(
            paciente=instance,
            tipo='GESTACAO' if instance.genero == 'Feminino' else 'OUTRO',
            fase_atual='F1',
            responsavel=instance.medico_responsavel
        )

@receiver(post_save, sender=Agendamento)
def atualizar_fase_funil(sender, instance, created, **kwargs):
    """
    Se agendou -> Move para F2 (Conversão).
    Se foi atendido/realizado -> Move para F3 (Pós-Exame).
    """
    if instance.ciclo:
        ciclo = instance.ciclo
        mudou = False

        # Regra de Movimentação F1 -> F2
        if ciclo.fase_atual == 'F1' and instance.status in ['Agendado', 'Confirmado']:
            ciclo.fase_atual = 'F2'
            mudou = True
        
        # Regra de Movimentação F2 -> F3
        elif instance.status == 'Realizado':
            ciclo.fase_atual = 'F3'
            # Incrementar contador de atendimentos
            ciclo.qtd_atendimentos += 1
            mudou = True
            
            # Gatilho: Criar Próxima Ação sugerida (Ex: Ligar em 24h para pós-venda)
            # Isso pode ser uma tarefa assíncrona ou direta aqui
        
        if mudou:
            ciclo.save()