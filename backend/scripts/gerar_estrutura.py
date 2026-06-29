import os

# Pastas que serão ignoradas para manter o arquivo .txt limpo e focado no código
IGNORAR_DIRS = {'.git', 'node_modules', '__pycache__', 'venv', '.venv', 'env', 'build', 'dist', '.vscode'}

def gerar_arvore(diretorio, prefixo=""):
    resultado = []
    try:
        itens = sorted(os.listdir(diretorio))
    except PermissionError:
        return resultado

    # Filtra as pastas ignoradas
    itens = [i for i in itens if i not in IGNORAR_DIRS]

    for indice, item in enumerate(itens):
        caminho_completo = os.path.join(diretorio, item)
        eh_ultimo = (indice == len(itens) - 1)
        
        conector = "└── " if eh_ultimo else "├── "
        resultado.append(f"{prefixo}{conector}{item}")
        
        if os.path.isdir(caminho_completo):
            proximo_prefixo = prefixo + ("    " if eh_ultimo else "│   ")
            resultado.extend(gerar_arvore(caminho_completo, proximo_prefixo))
            
    return resultado

if __name__ == "__main__":
    diretorio_atual = os.getcwd()
    linhas = [f"Estrutura do Projeto: {os.path.basename(diretorio_atual)}", ""]
    linhas.extend(gerar_arvore(diretorio_atual))
    
    # Salva o mapeamento no arquivo estrutura.txt
    with open("estrutura.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(linhas))
    print("Sucesso! O arquivo 'estrutura.txt' foi gerado na raiz do projeto.")