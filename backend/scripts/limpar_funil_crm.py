import os
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from crm.models import Ciclo
from django.utils import timezone

def limpar_gestacoes_vencidas():
    print("\n=== 🧹 ROTINA DE LIMPEZA DO FUNIL CRM ===")
    
    # Pega todos os ciclos ATIVOS de GESTAÇÃO
    ciclos_ativos = Ciclo.objects.filter(tipo='GESTACAO', status='ativo')
    encerrados = 0
    
    for ciclo in ciclos_ativos:
        dados_gestacionais = ciclo.get_dados_gestacionais()
        
        # Se os dados existirem e a idade for maior ou igual a 42 semanas
        if dados_gestacionais and dados_gestacionais['semanas'] >= 42:
            
            # Encerra o ciclo
            ciclo.status = 'encerrado'
            ciclo.fase_atual = 'ENCERRADO'
            ciclo.data_encerramento = timezone.now()
            ciclo.save(update_fields=['status', 'fase_atual', 'data_encerramento'])
            
            encerrados += 1
            print(f"✅ Encerrado: {ciclo.paciente.nome_completo} (Atingiu {dados_gestacionais['semanas']} semanas)")

    print(f"\n🎉 Limpeza concluída! {encerrados} pacientes retiradas do Kanban ativo.\n")

if __name__ == '__main__':
    limpar_gestacoes_vencidas()