import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from prontuario.models import Laudo
from pacientes.models import Paciente

def investigar_todos():
    print("\n=== 🔍 RAIO-X COMPLETO DE TODOS OS LAUDOS ===\n")
    
    laudos = Laudo.objects.all().order_by('paciente__nome_completo', '-data_criacao')
    
    laudos_por_paciente = {}
    laudos_sem_paciente = [] # Perigo real: dados flutuando sem dono
    
    for l in laudos:
        if l.paciente:
            nome = l.paciente.nome_completo
            if nome not in laudos_por_paciente:
                laudos_por_paciente[nome] = []
            laudos_por_paciente[nome].append(l)
        else:
            laudos_sem_paciente.append(l)

    print(f"📊 Total Geral de Laudos no Banco: {laudos.count()}")
    print("-" * 70)
    
    # Lista os laudos que estão normais (com paciente)
    for nome, lista_laudos in laudos_por_paciente.items():
        print(f"\n👤 PACIENTE: {nome} (Total: {len(lista_laudos)} laudos)")
        for l in lista_laudos:
            tem_dados = "SIM" if l.dados_estruturados else "NÃO"
            tem_exame = f"ID {l.exame.id}" if l.exame else "SEM IMAGENS VINCULADAS"
            tipo = "👻 FANTASMA (Automático)" if "Exames Anexados" in l.titulo_exame else "✅ REAL (Médico)"
            
            print(f"   [{tipo}] ID: {l.id} | Título: '{l.titulo_exame}' | Imagens: {tem_exame} | Tem Dados Estruturados? {tem_dados}")
    
    print("\n" + "=" * 70)
    
    # Alerta 1: Laudos sem Paciente (Isso não deveria acontecer, mas vamos caçar)
    if laudos_sem_paciente:
        print("\n🚨🚨 ATENÇÃO: LAUDOS SEM PACIENTE (DADOS ÓRFÃOS) 🚨🚨")
        for l in laudos_sem_paciente:
            tem_dados = "SIM" if l.dados_estruturados else "NÃO"
            print(f"   ID: {l.id} | Título: '{l.titulo_exame}' | Tem Dados? {tem_dados} | Criado em: {l.data_criacao.strftime('%d/%m/%Y')}")
    else:
         print("\n✅ Ótima notícia: Nenhum laudo perdeu o vínculo com o paciente!")

    # Alerta 2: Laudos reais que perderam a pasta de imagens
    laudos_reais_sem_exame = Laudo.objects.exclude(titulo_exame__icontains="Exames Anexados").filter(exame__isnull=True)
    if laudos_reais_sem_exame.exists():
        print("\n⚠️ LAUDOS REAIS SEM PASTA DE IMAGENS (Podem causar erro no PDF) ⚠️")
        for l in laudos_reais_sem_exame:
            paciente_nome = l.paciente.nome_completo if l.paciente else "DESCONHECIDO"
            print(f"   ID: {l.id} | Título: '{l.titulo_exame}' | Paciente: {paciente_nome}")

if __name__ == "__main__":
    investigar_todos()