from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Laudo
from crm.models import Ciclo
from .utils import extrair_dum_do_laudo


@receiver(post_save, sender=Laudo)
def sincronizar_laudo_com_crm(sender, instance, created, **kwargs):
    """
    Sempre que um laudo é finalizado, atualiza o Ciclo de Gestação no CRM.
    """
    if not instance.paciente:
        return

    if instance.status != 'FINALIZADO':
        return

    print(f"[SIGNAL PRONTUARIO] Processando Laudo {instance.id} para CRM...")

    try:
        ciclo = Ciclo.objects.filter(
            paciente=instance.paciente,
            tipo='GESTACAO',
            status='ativo'
        ).order_by('-data_inicio').first()

        if not ciclo:
            print("[SIGNAL PRONTUARIO] Nenhum ciclo de gestação ativo para atualizar.")
            return

        nova_dum = extrair_dum_do_laudo(instance)

        if nova_dum:
            if ciclo.data_dum != nova_dum:
                print(f"[CRM UPDATE] Atualizando DUM da {instance.paciente.nome_completo}")
                print(f"   ANTIGA: {ciclo.data_dum} -> NOVA: {nova_dum}")

                ciclo.data_dum = nova_dum

                if ciclo.fase_atual in ['F1', 'F2']:
                    ciclo.fase_atual = 'F3'
                    print("   Fase movida para F3 (Pós-Exame)")

                ciclo.save()
            else:
                print("[CRM] DUM já está atualizada.")
        else:
            print("[SIGNAL PRONTUARIO] Nenhuma data válida encontrada no Laudo.")

    except Exception as e:
        # Isola o sync do CRM: um bug aqui NUNCA deve derrubar o save()
        # do Laudo, que roda dentro de uma Thread de background (tasks.py)
        # ou de uma view síncrona (RegerarLaudoPDFView).
        print(f"[SIGNAL PRONTUARIO] Erro ao sincronizar Laudo {instance.id} com o CRM: {e}")