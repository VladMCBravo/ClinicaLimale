from faturamento.models import Pagamento, Despesa, TransacaoFinanceira
from django.db import transaction
from django.utils import timezone

def migrar():
    print("🚀 INICIANDO MIGRAÇÃO DOS DADOS FINANCEIROS...")
    print("   Criando 'Transações Pai' para registros órfãos...\n")

    # Contadores
    novas_receitas = 0
    novas_despesas = 0
    erros = 0

    with transaction.atomic():
        # --- 1. MIGRAR RECEITAS (PAGAMENTOS) ---
        pagamentos_sem_pai = Pagamento.objects.filter(transacao_pai__isnull=True)
        total_pag = pagamentos_sem_pai.count()
        
        print(f"🔄 Processando {total_pag} Receitas...")
        
        for pag in pagamentos_sem_pai:
            try:
                # Tenta descobrir a data original
                data_base = pag.data_pagamento or pag.data_vencimento or timezone.now()
                
                # Cria o Pai
                pai = TransacaoFinanceira.objects.create(
                    descricao=pag.descricao or f"Receita Legada #{pag.id}",
                    tipo='Receita',
                    valor_total_original=pag.valor,
                    qtd_parcelas=1, # Legado é sempre 1x
                    paciente=pag.paciente,
                    data_criacao=data_base,
                    eh_recorrente=False # Assumimos false para legados
                )
                
                # Vincula o Filho
                pag.transacao_pai = pai
                pag.numero_parcela = 1
                pag.save()
                
                novas_receitas += 1
                
            except Exception as e:
                print(f"❌ Erro na Receita ID {pag.id}: {e}")
                erros += 1

        # --- 2. MIGRAR DESPESAS ---
        despesas_sem_pai = Despesa.objects.filter(transacao_pai__isnull=True)
        total_desp = despesas_sem_pai.count()
        
        print(f"\n🔄 Processando {total_desp} Despesas...")
        
        for desp in despesas_sem_pai:
            try:
                data_base = desp.data_pagamento or desp.data_vencimento or timezone.now()
                
                pai = TransacaoFinanceira.objects.create(
                    descricao=desp.descricao or f"Despesa Legada #{desp.id}",
                    tipo='Despesa',
                    valor_total_original=desp.valor,
                    qtd_parcelas=1,
                    categoria=desp.categoria, # Importante manter a categoria
                    data_criacao=data_base,
                    eh_recorrente=False
                )
                
                desp.transacao_pai = pai
                desp.numero_parcela = 1
                desp.save()
                
                novas_despesas += 1

            except Exception as e:
                print(f"❌ Erro na Despesa ID {desp.id}: {e}")
                erros += 1

    print("\n" + "="*50)
    print("🏁 RELATÓRIO FINAL DA MIGRAÇÃO")
    print("="*50)
    print(f"✅ Receitas Migradas: {novas_receitas}")
    print(f"✅ Despesas Migradas: {novas_despesas}")
    print(f"❌ Erros:             {erros}")
    
    if novas_receitas == 0 and novas_despesas == 0 and erros == 0:
        print("ℹ️  Nenhum registro precisava de migração.")

# Executa a função
migrar()