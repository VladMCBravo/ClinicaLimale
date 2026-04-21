import os
import django

# Configuração do ambiente Django (Ajuste 'core.settings' para o nome da sua pasta principal, se necessário)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.contrib.admin.models import LogEntry
from django.db.models.signals import post_save, pre_save

# Importando os seus modelos
try:
    from faturamento.models import Pagamento, TransacaoFinanceira
    from agendamentos.models import Agendamento
except ImportError as e:
    print(f"❌ Erro ao importar modelos: {e}")
    exit()

def investigar_banco():
    print("\n" + "="*50)
    print(" 🕵️‍♂️ RAIO-X INVESTIGATIVO: CAÇA-FANTASMAS DO FINANCEIRO ")
    print("="*50)

    # ---------------------------------------------------------
    print("\n🔍 1. BUSCANDO PAGAMENTOS FANTASMAS (PAGO SEM AUTOR)")
    # ---------------------------------------------------------
    try:
        # Busca pagamentos marcados como Pago mas sem usuário que deu baixa
        fantasmas = Pagamento.objects.filter(status='Pago', baixado_por__isnull=True).order_by('-id')[:10]
        
        if not fantasmas.exists():
            print("   ✅ Nenhum 'Pagamento' fantasma encontrado nas últimas 10 faturas pagas.")
        else:
            for p in fantasmas:
                criacao = p.data_vencimento # Usando vencimento como base
                pgto = p.data_pagamento
                
                # Se data de pagamento for igual a hoje ou data de criação, provavelmente nasceu pago
                origem = "NASCERAM PAGOS (Frontend enviou pago)" if pgto == criacao else "ALTERADOS DEPOIS (Por Job ou API Genérica)"
                
                print(f"   ⚠️ ID: {p.id} | Paciente ID: {p.paciente_id} | Criado por: {p.registrado_por}")
                print(f"      -> Suspeita: {origem}")
                print(f"      -> Data Pgto: {pgto} | Inter TXID: {p.inter_txid or 'Vazio'}")
    except Exception as e:
        print(f"   ❌ Erro ao ler pagamentos: {e}")

    # ---------------------------------------------------------
    print("\n📜 2. VASCOLHANDO LOGS SECRETOS DO DJANGO ADMIN")
    # ---------------------------------------------------------
    try:
        pagamento_ct = ContentType.objects.get_for_model(Pagamento)
        logs = LogEntry.objects.filter(content_type=pagamento_ct, action_flag=2).order_by('-action_time')[:5] # action_flag=2 significa "Alteração"
        
        if not logs.exists():
            print("   ✅ Nenhuma alteração manual de Pagamento feita pelo painel Admin recentemente.")
        else:
            for log in logs:
                print(f"   🕒 {log.action_time.strftime('%d/%m/%Y %H:%M')} | Usuário ID {log.user_id} alterou o Pagamento ID {log.object_id}")
                print(f"      -> Mensagem do Sistema: {log.change_message}")
    except Exception as e:
        print(f"   ❌ Erro ao ler logs do admin: {e}")

    # ---------------------------------------------------------
    print("\n📡 3. RASTREANDO GATILHOS INVISÍVEIS (SIGNALS)")
    # ---------------------------------------------------------
    # Função auxiliar para pegar os nomes dos signals
    def obter_receivers(sinal, modelo):
        receivers = sinal._live_receivers(modelo)
        if not receivers:
            return ["Nenhum gatilho detectado."]
        return [f"{r.__module__}.{r.__name__}" if hasattr(r, '__name__') else str(r) for r in receivers]

    print("   [AGENDAMENTO - Após Salvar]:")
    for r in obter_receivers(post_save, Agendamento): print(f"      -> {r}")

    print("   [PAGAMENTO - Antes de Salvar]:")
    for r in obter_receivers(pre_save, Pagamento): print(f"      -> {r}")
        
    print("   [PAGAMENTO - Após Salvar]:")
    for r in obter_receivers(post_save, Pagamento): print(f"      -> {r}")

    # ---------------------------------------------------------
    print("\n🤖 4. VERIFICANDO TAREFAS AGENDADAS (JOBS/CELERY)")
    # ---------------------------------------------------------
    try:
        from django_celery_beat.models import PeriodicTask
        tasks = PeriodicTask.objects.filter(enabled=True)
        if not tasks.exists():
            print("   ✅ Nenhuma tarefa automática do Celery habilitada.")
        for t in tasks:
            print(f"   ⚙️ Task Ativa: {t.name} | Roda a função: {t.task}")
    except ImportError:
        print("   ✅ Celery Beat não está instalado neste projeto (menos um suspeito).")
    
    print("\n" + "="*50)
    print(" FIM DO RELATÓRIO ")
    print("="*50 + "\n")

if __name__ == "__main__":
    investigar_banco()