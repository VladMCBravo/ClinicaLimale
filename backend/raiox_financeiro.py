from faturamento.models import Pagamento, Despesa, TransacaoFinanceira
from django.db.models import Sum, Count

def imprimir_titulo(texto):
    print("\n" + "="*60)
    print(f" {texto.upper()}")
    print("="*60)

def formatar_moeda(valor):
    if valor is None:
        return "R$ 0,00"
    return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def diagnostico():
    imprimir_titulo("RAIO-X DO BANCO DE DADOS ATUAL")

    # --- 1. RECEITAS (PAGAMENTOS) ---
    total_receitas = Pagamento.objects.count()
    receitas_sem_pai = Pagamento.objects.filter(transacao_pai__isnull=True).count()
    receitas_com_pai = Pagamento.objects.filter(transacao_pai__isnull=False).count()
    valor_total_receitas = Pagamento.objects.aggregate(Sum('valor'))['valor__sum']

    print(f"💰 RECEITAS (Pagamentos)")
    print(f"   • Total de Registros:      {total_receitas}")
    print(f"   • Órfãos (Sem Pai):        {receitas_sem_pai} (Serão migrados)")
    print(f"   • Já Migrados (Com Pai):   {receitas_com_pai}")
    print(f"   • Volume Financeiro Total: {formatar_moeda(valor_total_receitas)}")
    
    if total_receitas > 0:
        ultimo = Pagamento.objects.last()
        print(f"   • Exemplo (Último ID={ultimo.id}): {ultimo.descricao} | {formatar_moeda(ultimo.valor)}")

    # --- 2. DESPESAS ---
    total_despesas = Despesa.objects.count()
    despesas_sem_pai = Despesa.objects.filter(transacao_pai__isnull=True).count()
    despesas_com_pai = Despesa.objects.filter(transacao_pai__isnull=False).count()
    valor_total_despesas = Despesa.objects.aggregate(Sum('valor'))['valor__sum']

    print(f"\n💸 DESPESAS")
    print(f"   • Total de Registros:      {total_despesas}")
    print(f"   • Órfãos (Sem Pai):        {despesas_sem_pai} (Serão migrados)")
    print(f"   • Já Migrados (Com Pai):   {despesas_com_pai}")
    print(f"   • Volume Financeiro Total: {formatar_moeda(valor_total_despesas)}")

    if total_despesas > 0:
        ultimo = Despesa.objects.last()
        print(f"   • Exemplo (Último ID={ultimo.id}): {ultimo.descricao} | {formatar_moeda(ultimo.valor)}")

    # --- 3. TRANSAÇÕES PAI (NOVA ESTRUTURA) ---
    total_pais = TransacaoFinanceira.objects.count()
    
    print(f"\n🏗️  ESTRUTURA NOVA (TransacaoFinanceira)")
    print(f"   • Total de Transações Pai: {total_pais}")
    
    if total_pais == 0:
        print("   ⚠️  A tabela PAI está vazia. Isso é esperado antes da migração.")
    else:
        print("   ℹ️  Já existem transações Pai criadas.")

    # --- 4. VERIFICAÇÃO DE INTEGRIDADE ---
    imprimir_titulo("VEREDITO")
    
    if receitas_sem_pai == total_receitas and despesas_sem_pai == total_despesas:
        print("✅ Estado LIMPO para migração.")
        print("   O script de migração irá criar:")
        print(f"   -> {receitas_sem_pai} Pais para as Receitas")
        print(f"   -> {despesas_sem_pai} Pais para as Despesas")
    elif receitas_sem_pai == 0 and despesas_sem_pai == 0 and total_pais > 0:
        print("✅ O sistema JÁ ESTÁ migrado. Não precisa fazer nada.")
    else:
        print("⚠️  Estado HÍBRIDO (Alguns migrados, outros não).")
        print("   O script de migração vai atuar apenas nos itens 'Órfãos'.")

    print("\n")

# ADICIONE ISTO NA ÚLTIMA LINHA:
diagnostico()