import os
import unicodedata

pasta = 'pdfs_antigos'

print("\n=== 🧹 REMOVENDO ACENTOS DOS ARQUIVOS ===")
for arquivo in os.listdir(pasta):
    if arquivo.endswith('.pdf'):
        # Tira os acentos (ex: Araújo -> Araujo)
        nome_limpo = unicodedata.normalize('NFKD', arquivo).encode('ASCII', 'ignore').decode('utf-8')
        
        if arquivo != nome_limpo:
            caminho_antigo = os.path.join(pasta, arquivo)
            caminho_novo = os.path.join(pasta, nome_limpo)
            os.rename(caminho_antigo, caminho_novo)
            print(f"✅ Renomeado: {arquivo} -> {nome_limpo}")
            
print("🎉 Concluído!\n")