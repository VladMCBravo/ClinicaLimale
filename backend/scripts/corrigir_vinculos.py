import os
import sys
import django

# Configuração do ambiente
caminho_script = os.path.dirname(os.path.abspath(__file__))
caminho_projeto = os.path.dirname(caminho_script)
sys.path.append(caminho_projeto)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from prontuario.models import Laudo
from exames.models import Exame

def consertar_fotos_dos_laudos_v2():
    print("\n=== 🛠️ CORRIGINDO VÍNCULOS DE FOTOS E LAUDOS (V2) ===\n")
    
    laudos = Laudo.objects.filter(exame__isnull=False, status='FINALIZADO')
    corrigidos = 0
    
    for laudo in laudos:
        data_do_texto = laudo.data_criacao.date()
        data_das_fotos = laudo.exame.data_exame
        
        if data_do_texto != data_das_fotos:
            print(f"🔄 Paciente: {laudo.paciente.nome_completo.split()[0]}")
            print(f"   O Laudo de {data_do_texto.strftime('%d/%m/%Y')} aponta para {data_das_fotos.strftime('%d/%m/%Y')}.")
            
            # Procura pastas no dia correto que estejam LIVRES (sem nenhum laudo vinculado)
            pasta_livre_do_dia = Exame.objects.filter(
                paciente=laudo.paciente, 
                data_exame=data_do_texto,
                laudo_prontuario_vinculo__isnull=True
            ).first()
            
            if pasta_livre_do_dia:
                # Desfaz o nó: Aponta o laudo para a pasta livre do dia!
                laudo.exame = pasta_livre_do_dia
                laudo.save()
                corrigidos += 1
                print("   ✅ Corrigido! Vinculado a uma pasta livre do dia correto.\n")
            else:
                # Se não tem pasta livre, outro laudo já pegou a pasta principal (ex: 2 exames no dia).
                # Criamos um contêiner "virtual" na data certa para ancorar o laudo sem dar erro de duplicidade.
                print("   ⚠️  A pasta principal já está ocupada. Criando contêiner âncora...")
                novo_exame = Exame.objects.create(
                    paciente=laudo.paciente,
                    data_exame=data_do_texto,
                    nome_paciente_pasta=f"{laudo.paciente.nome_completo} - L{laudo.id} (Ajustado)",
                    status='DISPONIVEL'
                )
                laudo.exame = novo_exame
                laudo.save()
                corrigidos += 1
                print("   ✅ Corrigido! Contêiner ancorado na data correta.\n")
                
    print(f"🎉 Finalizado! {corrigidos} laudos voltaram para suas datas corretas.")

if __name__ == "__main__":
    consertar_fotos_dos_laudos_v2()