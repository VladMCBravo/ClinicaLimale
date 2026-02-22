import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from prontuario.models import Laudo

def consertar_banco():
    print("\n=== 🛠️ INICIANDO CORREÇÃO CIRÚRGICA ===\n")
    
    # 1. Busca todos os Laudos Fantasmas
    fantasmas = list(Laudo.objects.filter(titulo_exame__icontains="Exames Anexados"))
    
    for fantasma in fantasmas:
        paciente = fantasma.paciente
        exame_id_preso = fantasma.exame_id
        titulo = fantasma.titulo_exame
        
        # 2. MATAMOS O FANTASMA PRIMEIRO!
        # Isso libera o `exame_id` no banco de dados para que ele possa ser usado.
        # A regra 'on_delete=models.SET_NULL' garante que as imagens fiquem intactas.
        fantasma.delete()
        print(f"👻 Fantasma removido para liberar a chave: '{titulo}'.")
        
        # 3. Agora que a vaga está livre, conectamos o Exame ao Laudo Real
        if exame_id_preso and paciente:
            laudo_real_orfao = Laudo.objects.exclude(titulo_exame__icontains="Exames Anexados").filter(paciente=paciente, exame__isnull=True).first()
            
            if laudo_real_orfao:
                # Transfere a pasta de imagens para o laudo real
                laudo_real_orfao.exame_id = exame_id_preso
                laudo_real_orfao.save()
                print(f"   🔗 SUCESSO: Imagens do exame {exame_id_preso} conectadas ao Laudo Real de {paciente.nome_completo}!\n")

    print("✅ BANCO DE DADOS LIMPO E CORRIGIDO COM SUCESSO!")

if __name__ == "__main__":
    consertar_banco()