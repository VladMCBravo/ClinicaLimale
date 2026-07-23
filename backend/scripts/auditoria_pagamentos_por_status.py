import os
import sys
import django

# 1. Configuração do ambiente Django
caminho_script = os.path.dirname(os.path.abspath(__file__))
caminho_projeto = os.path.dirname(caminho_script)
sys.path.append(caminho_projeto)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from faturamento.models import Pagamento

# Janela de correlação: o bug fazia dois PATCHes (agendamento, depois pagamento) na mesma
# chamada do usuário, sempre a poucos milissegundos de distância. Um recebimento manual feito
# pela tela do Financeiro não tem motivo nenhum para cair tão perto do "data_atualizacao" do
# agendamento (que só muda quando o próprio agendamento é editado).
JANELA_SUSPEITA_SEGUNDOS = 10


def auditar_pagamentos_quitados_por_status():
    print("\n" + "=" * 70)
    print(" 🕵️  AUDITORIA: PAGAMENTOS POSSIVELMENTE QUITADOS SÓ POR TROCA DE STATUS ")
    print("=" * 70)
    print(
        "\nEste script é SOMENTE LEITURA. Ele não altera nenhum registro — apenas lista\n"
        "candidatos para você revisar caso a caso antes de decidir reverter algo.\n"
    )

    candidatos = Pagamento.objects.filter(
        status='Pago',
        agendamento__isnull=False,
        agendamento__status='Realizado',
        data_hora_baixa__isnull=False,
    ).select_related('agendamento', 'paciente', 'baixado_por')

    suspeitos_fortes = []
    revisar = []

    for pag in candidatos:
        ag = pag.agendamento
        if not ag.data_atualizacao:
            continue

        delta = abs((pag.data_hora_baixa - ag.data_atualizacao).total_seconds())
        item = (pag, ag, delta)

        if delta <= JANELA_SUSPEITA_SEGUNDOS:
            suspeitos_fortes.append(item)
        elif delta <= 60:
            revisar.append(item)

    if not suspeitos_fortes and not revisar:
        print("✅ Nenhum candidato encontrado com esse critério.")
        return

    def imprimir_lista(titulo, lista):
        print(f"\n--- {titulo} ({len(lista)}) ---")
        for pag, ag, delta in sorted(lista, key=lambda x: x[2]):
            nome_paciente = pag.paciente.nome_completo if pag.paciente else '(sem paciente)'
            print(
                f"Pagamento ID {pag.id} | Agendamento ID {ag.id} | {nome_paciente}\n"
                f"  Valor: R$ {pag.valor} | Forma: {pag.forma_pagamento or '—'} | "
                f"Data pagamento: {pag.data_pagamento}\n"
                f"  Baixado por: {pag.baixado_por or '—'} | "
                f"Diferença baixa <-> atualização do agendamento: {delta:.1f}s\n"
            )

    if suspeitos_fortes:
        imprimir_lista(
            f"SUSPEITOS FORTES (baixa em até {JANELA_SUSPEITA_SEGUNDOS}s da atualização do agendamento)",
            suspeitos_fortes,
        )
    if revisar:
        imprimir_lista("REVISAR COM MAIS CALMA (correlação mais fraca, até 60s)", revisar)

    print(
        "\n👉 Nenhuma alteração foi feita. Para reverter algum destes pagamentos para\n"
        "   'Pendente', confirme caso a caso (ex: perguntando à recepção/paciente se o\n"
        "   pagamento realmente foi recebido) e faça a correção manualmente pela tela do\n"
        "   Financeiro, ou peça para eu gerar um script de correção específico para os IDs\n"
        "   que vocês confirmarem."
    )


if __name__ == '__main__':
    auditar_pagamentos_quitados_por_status()
