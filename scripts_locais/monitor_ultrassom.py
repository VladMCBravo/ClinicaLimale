import os
import time
import shutil
import requests
import re

# --- CONFIGURAÇÕES ---
# Ajuste estes caminhos conforme o computador da clínica (Windows usa C:\\...)
PASTA_ENTRADA = "./entrada"  # Onde o ultrassom salva
PASTA_ENVIADOS = "./enviados" # Para onde vai depois de enviar

# URL do seu Backend (Produção)
# Se for testar local, use: "http://127.0.0.1:8000/api/exames/upload/"
URL_API = "https://clinicalimale.onrender.com/api/exames/upload/"

# Token de segurança (Por enquanto vamos sem, mas ideal é criar um depois)
HEADERS = {} 

def processar_pasta(caminho_pasta, nome_pasta):
    print(f"--> Processando: {nome_pasta}")
    
    # 1. Extrair Data e Nome usando Regex (Padrão: 26112025-1_NOME)
    # Regex explica: 2 dígitos dia, 2 mês, 4 ano, hífen, sequencial, underline, resto é nome
    match = re.match(r"(\d{2})(\d{2})(\d{4})-(\d+)_(.*)", nome_pasta)
    
    if not match:
        print(f"❌ Erro: Nome da pasta '{nome_pasta}' fora do padrão.")
        return False

    dia, mes, ano, seq, nome_paciente = match.groups()
    data_formatada = f"{ano}-{mes}-{dia}" # YYYY-MM-DD para o banco
    
    print(f"    Paciente identificado: {nome_paciente}")
    print(f"    Data: {data_formatada}")

    # 2. Coletar arquivos para envio
    arquivos_para_enviar = []
    lista_arquivos_abertos = [] # Para fechar depois

    for arquivo in os.listdir(caminho_pasta):
        caminho_arquivo = os.path.join(caminho_pasta, arquivo)
        
        # Ignora arquivos ocultos ou do sistema
        if arquivo.startswith('.') or os.path.isdir(caminho_arquivo):
            continue
            
        # Prepara o arquivo para o POST
        f = open(caminho_arquivo, 'rb')
        lista_arquivos_abertos.append(f)
        # 'arquivos' é o nome do campo que definimos no Django View
        arquivos_para_enviar.append(('arquivos', (arquivo, f)))

    if not arquivos_para_enviar:
        print("    Pasta vazia. Pulando.")
        return False

    # 3. Enviar para a API
    dados = {
        'nome_paciente': nome_paciente,
        'data_exame': data_formatada
    }

    try:
        print("    Enviando para o servidor... aguarde...")
        resposta = requests.post(URL_API, data=dados, files=arquivos_para_enviar, timeout=60)
        
        if resposta.status_code == 201:
            print("✅ Sucesso! Exame criado.")
            sucesso = True
        else:
            print(f"❌ Erro na API: {resposta.status_code} - {resposta.text}")
            sucesso = False
            
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
        sucesso = False

    # Fecha arquivos
    for f in lista_arquivos_abertos:
        f.close()

    return sucesso

def loop_monitoramento():
    print(f"👀 Monitorando pasta: {PASTA_ENTRADA}")
    print("Pressione CTRL+C para parar.")
    
    if not os.path.exists(PASTA_ENVIADOS):
        os.makedirs(PASTA_ENVIADOS)

    while True:
        # Lista pastas na entrada
        itens = os.listdir(PASTA_ENTRADA)
        
        for item in itens:
            caminho_completo = os.path.join(PASTA_ENTRADA, item)
            
            if os.path.isdir(caminho_completo):
                # Achou uma pasta! Processa ela.
                if processar_pasta(caminho_completo, item):
                    # Se deu certo, move para enviados
                    destino = os.path.join(PASTA_ENVIADOS, item)
                    # Se já existir lá, renomeia para não dar erro
                    if os.path.exists(destino):
                        destino = os.path.join(PASTA_ENVIADOS, f"{item}_v2")
                        
                    shutil.move(caminho_completo, destino)
                    print(f"    📂 Pasta movida para 'enviados'")
                else:
                    print("    ⚠️ Pasta mantida na entrada para verificação.")

        time.sleep(5) # Espera 5 segundos antes de olhar de novo

if __name__ == "__main__":
    loop_monitoramento()