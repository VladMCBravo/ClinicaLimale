import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from crm.models import Ciclo
from agendamentos.models import Agendamento

def aplicar_castigo_recepcao():
    print("\n=== 🚨 INICIANDO AUDITORIA DE PROCESSOS DA RECEPÇÃO ===\n")
    
    ciclos = Ciclo.objects.filter(status='ativo')
    
    rebaixados = 0
    promovidos = 0
    
    for ciclo in ciclos:
        agendamentos = Agendamento.objects.filter(ciclo=ciclo)
        
        # REGRA 1: Não tem agendamento? Castigo na F1.
        if not agendamentos.exists():
            if ciclo.fase_atual != 'F1':
                fase_antiga = ciclo.fase_atual
                ciclo.fase_atual = 'F1'
                ciclo.save(update_fields=['fase_atual'])
                rebaixados += 1
                print(f"⬇️ DE CASTIGO NA F1: {ciclo.paciente.nome_completo} (Estava na {fase_antiga} sem agendamento!)")
                
        # REGRA 2: Tem agendamento? Vamos checar o status correto.
        else:
            ultimo_ag = agendamentos.order_by('-data_hora_inicio').first()
            
            # Mapeamento de Status
            status_f3 = ['Confirmado', 'Aguardando', 'Em Atendimento', 'Laudando', 'Realizado']
            status_f5 = ['Cancelado', 'Não Compareceu']
            
            # Descobre a fase baseada no status
            if ultimo_ag.status in status_f5:
                nova_fase = 'F5' # Foi para a Recuperação
            elif ultimo_ag.status in status_f3:
                nova_fase = 'F3' # Está fluindo normalmente
            else:
                nova_fase = 'F2' # Agendado, mas ainda não confirmado
                
            # Só atualiza se precisar (e ignora quem já encerrou ou está no LTV)
            if ciclo.fase_atual != nova_fase and ciclo.fase_atual not in ['F4', 'ENCERRADO']:
                fase_antiga = ciclo.fase_atual
                ciclo.fase_atual = nova_fase
                ciclo.save(update_fields=['fase_atual'])
                promovidos += 1
                
                if nova_fase == 'F5':
                    print(f"⚠️ MOVIDO PARA RECUPERAÇÃO (F5): {ciclo.paciente.nome_completo} (Faltou/Cancelou)")
                else:
                    print(f"⬆️ AJUSTADO PARA {nova_fase}: {ciclo.paciente.nome_completo} (Status do Agendamento: {ultimo_ag.status})")

    print("\n" + "="*50)
    print(f"📋 RESULTADO DA AUDITORIA:")
    print(f"⛔ Rebaixados para F1 (Erro da recepção): {rebaixados}")
    print(f"✅ Ajustados para F2/F3 (Fluxo correto): {promovidos}")
    print("="*50 + "\n")

if __name__ == '__main__':
    aplicar_castigo_recepcao()