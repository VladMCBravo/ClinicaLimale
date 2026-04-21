import os
import django
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from prontuario.models import Laudo
from crm.models import Ciclo

def resgatar_dados_gestacionais():
    print("\n=== 🚑 INICIANDO RESGATE DE GESTAÇÕES ===\n")
    
    # Busca laudos reais (que têm JSON)
    laudos = Laudo.objects.exclude(titulo_exame__icontains="Exames Anexados").exclude(dados_estruturados__isnull=True)
    resgatados = 0

    for laudo in laudos:
        dados = laudo.dados_estruturados
        paciente = laudo.paciente
        
        if not paciente or not dados:
            continue

        # Tenta achar a DUM dentro do JSON do Feto 1
        feto1 = dados.get('feto1', {})
        if isinstance(feto1, dict) and 'dum' in feto1 and feto1['dum']:
            dum_str = feto1['dum']
            
            try:
                # Converte a string "YYYY-MM-DD" para data
                dum_data = datetime.strptime(dum_str, '%Y-%m-%d').date()
                
                atualizou = False
                
                # 1. Salva no Paciente (se estiver vazio)
                if not hasattr(paciente, 'dum') or not paciente.dum:
                    paciente.dum = dum_data
                    paciente.save()
                    atualizou = True
                
                # 2. Salva no Ciclo Ativo do CRM
                ciclo = Ciclo.objects.filter(paciente=paciente, status='ativo').first()
                if ciclo and not getattr(ciclo, 'data_dum', None):
                    ciclo.data_dum = dum_data
                    ciclo.save()
                    atualizou = True
                    
                if atualizou:
                    print(f"✅ GESTAÇÃO RESGATADA: {paciente.nome_completo} (DUM: {dum_data.strftime('%d/%m/%Y')})")
                    resgatados += 1

            except Exception as e:
                print(f"⚠️ Erro ao ler DUM de {paciente.nome_completo}: {e}")

    print(f"\n🎉 RESGATE CONCLUÍDO! {resgatados} pacientes foram atualizados no CRM.")

if __name__ == '__main__':
    resgatar_dados_gestacionais()