import os
import django
import re

# Configuração do Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from pacientes.models import Paciente

def limpar_nome_arquivo(arquivo):
    # Tira a extensão .pdf
    nome = arquivo.replace('.pdf', '')
    # Tira o prefixo "Laudo_" (ignorando maiúsculas/minúsculas)
    nome = re.sub(r'^laudo_', '', nome, flags=re.IGNORECASE)
    # Tira sufixos comuns de exames se houver (ex: _OBSTETRICO)
    nome = re.sub(r'(_obstetrico|_transvaginal|_ecocardiograma|_abdome|_doppler_carotidas).*$', '', nome, flags=re.IGNORECASE)
    # Troca os underlines por espaço e tira espaços sobrando nas pontas
    nome = nome.replace('_', ' ').strip()
    return nome

def assistente_de_renomeacao():
    pasta = 'pdfs_antigos'
    
    if not os.path.exists(pasta):
        print(f"❌ A pasta '{pasta}' não existe. Crie a pasta e coloque os PDFs lá.")
        return

    arquivos = [f for f in os.listdir(pasta) if f.endswith('.pdf')]
    
    # Filtra para ignorar arquivos que já começam com número (já estão com ID)
    arquivos_baguncados = [f for f in arquivos if not f[0].isdigit()]

    if not arquivos_baguncados:
        print("✅ Nenhum arquivo precisando de renomeação encontrado!")
        return

    print(f"\n=== 🤖 INICIANDO ASSISTENTE DE RENOMEAÇÃO ({len(arquivos_baguncados)} arquivos) ===\n")

    sucessos = 0

    for arquivo in arquivos_baguncados:
        caminho_antigo = os.path.join(pasta, arquivo)
        
        # Transforma "Laudo_Ana_Luiza.pdf" em "Ana Luiza"
        nome_busca = limpar_nome_arquivo(arquivo)

        # Busca no banco de dados
        pacientes = Paciente.objects.filter(nome_completo__icontains=nome_busca)

        # Se não achar pelo nome exato, tenta apenas com o 1º e 2º nome
        if not pacientes.exists():
            partes = nome_busca.split()
            if len(partes) >= 2:
                busca_curta = f"{partes[0]} {partes[1]}"
                pacientes = Paciente.objects.filter(nome_completo__icontains=busca_curta)

        if pacientes.exists():
            paciente = pacientes.first()
            
            # Monta o nome perfeito (ex: 123_Ana_Luiza.pdf)
            nome_limpo_sem_espaco = paciente.nome_completo.replace(' ', '_')
            novo_nome = f"{paciente.id}_{nome_limpo_sem_espaco}.pdf"
            caminho_novo = os.path.join(pasta, novo_nome)

            print(f"📄 Arquivo original: {arquivo}")
            # A pergunta exata que você pediu
            resposta = input(f"Encontra {paciente.nome_completo} com o id {paciente.id}, confirma alteração do nome? (S/n): ")
            
            # Se o usuário apertar Enter (vazio) ou digitar 's', ele renomeia
            if resposta.lower() in ['', 's', 'sim', 'y']:
                os.rename(caminho_antigo, caminho_novo)
                print(f"✅ Renomeado para: {novo_nome}\n")
                sucessos += 1
            else:
                print("⏭️ Pulado.\n")
        else:
            print(f"📄 Arquivo original: {arquivo}")
            print(f"❌ Não consegui achar paciente parecido com '{nome_busca}' no sistema.\n")

    print("="*60)
    print(f"🎉 FINALIZADO! {sucessos} arquivos renomeados e prontos para o CRM.")
    print("="*60 + "\n")

if __name__ == '__main__':
    assistente_de_renomeacao()