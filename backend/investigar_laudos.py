import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from prontuario.models import Laudo
from pacientes.models import Paciente

def investigar_fantasmas():
    print("\n=== 🔍 RAIO-X DE LAUDOS E FANTASMAS ===\n")
    
    total_laudos = Laudo.objects.count()
    
    # Busca os laudos automáticos criados pela "Ponte Mágica"
    laudos_fantasmas = Laudo.objects.filter(titulo_exame__icontains="Exames Anexados")
    total_fantasmas = laudos_fantasmas.count()
    
    # Busca laudos fantasmas que ficaram órfãos (perderam a pasta de imagens)
    fantasmas_orfaos = laudos_fantasmas.filter(exame__isnull=True).count()
    
    # Busca laudos reais que ficaram órfãos
    laudos_reais_orfaos = Laudo.objects.exclude(titulo_exame__icontains="Exames Anexados").filter(exame__isnull=True).count()

    print(f"📊 Total de Laudos no Sistema: {total_laudos}")
    print(f"👻 Laudos 'Fantasmas' (Automáticos): {total_fantasmas}")
    print(f"🔗 Fantasmas Órfãos (Causadores do PDF em branco): {fantasmas_orfaos}")
    print(f"⚠️ Laudos Reais Órfãos: {laudos_reais_orfaos}\n")
    
    print("-" * 50)
    print("🔎 BUSCANDO A VERDADEIRA MARIA DE FÁTIMA...")
    
    pacientes = Paciente.objects.filter(nome_completo__icontains="Maria de Fatima Ferreira")
    if not pacientes.exists():
        print("❌ Paciente não encontrada.")
        return
        
    paciente = pacientes.first()
    laudos_maria = Laudo.objects.filter(paciente=paciente)
    
    print(f"\nEncontrados {laudos_maria.count()} laudos no banco para {paciente.nome_completo}:\n")
    
    for l in laudos_maria:
        tem_dados = "SIM" if l.dados_estruturados else "NÃO"
        tem_exame = f"SIM (ID: {l.exame.id})" if l.exame else "ÓRFÃO"
        
        print(f"ID: {l.id} | Título: {l.titulo_exame}")
        print(f"   -> Tem dados médicos? {tem_dados} | Status: {l.status} | Ligado à Imagens? {tem_exame}\n")

if __name__ == "__main__":
    investigar_fantasmas()