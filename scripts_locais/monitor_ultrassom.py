import os
import time
import shutil 
import requests
import re

# --- CONFIGURAÇÕES ---

# Onde o ultrassom salva os exames (Use o 'r' antes das aspas para Windows)
PASTA_ENTRADA = r"C:\Users\Pichau\Desktop\Laudos"

# URL do seu Backend (Produção)
URL_API = "https://clinicalimale.onrender.com/api/exames/upload/"

def processar_pasta(caminho_pasta, nome_pasta):
    print(f"--> Processando: {nome_pasta}")
    
    # 1. Validação do Nome da Pasta (Regex)
    # Padrão esperado: 26112025-1_NOME DO PACIENTE
    match = re.match(r"(\d{2})(\d{2})(\d{4})-(\d+)_(.*)", nome_pasta)
    
    if not match:
        print(f"❌ Ignorado: Pasta '{nome_pasta}' fora do padrão de nome.")
        return False

    dia, mes, ano, seq, nome_paciente = match.groups()
    data_formatada = f"{ano}-{mes}-{dia}" # YYYY-MM-DD
    
    print(f"    Paciente: {nome_paciente}")
    print(f"    Data: {data_formatada}")

    # 2. Preparar Arquivos
    arquivos_para_enviar = []
    lista_arquivos_abertos = [] 

    for arquivo in os.listdir(caminho_pasta):
        caminho_arquivo = os.path.join(caminho_pasta, arquivo)
        
        # Ignora arquivos de sistema e subpastas
        if arquivo.startswith('.') or os.path.isdir(caminho_arquivo):
            continue
            
        try:
            f = open(caminho_arquivo, 'rb')
            lista_arquivos_abertos.append(f)
            arquivos_para_enviar.append(('arquivos', (arquivo, f)))
        except Exception as e:
            print(f"    ⚠️ Erro ao ler arquivo {arquivo}: {e}")

    if not arquivos_para_enviar:
        print("    Pasta vazia. Pulando.")
        return False

    # 3. Enviar para a API
    # ATENÇÃO: Adicionei o campo 'nome_pasta_original' aqui
    dados = {
        'nome_paciente': nome_paciente,
        'data_exame': data_formatada,
        'nome_pasta_original': nome_pasta  # <--- NOVA INFORMAÇÃO PARA O SUPABASE
    }

    sucesso = False
    try:
        print("    Enviando para a nuvem... aguarde...")
        # Timeout aumentado para 180s (3 min) para exames grandes
        resposta = requests.post(URL_API, data=dados, files=arquivos_para_enviar, timeout=180)
        
        if resposta.status_code == 201:
            print("✅ Sucesso! Exame salvo na nuvem.")
            sucesso = True
        else:
            print(f"❌ Erro do Servidor: {resposta.status_code} - {resposta.text}")
            sucesso = False
            
    except Exception as e:
        print(f"❌ Erro de Conexão: {e}")
        sucesso = False

    # 4. Fechar arquivos
    for f in lista_arquivos_abertos:
        f.close()

    return sucesso

def loop_monitoramento():
    print(f"👀 Monitorando pasta: {PASTA_ENTRADA}")
    print("    -> Modo Seguro: Arquivos serão marcados como [ENVIADO], não deletados.")
    print("Pressione CTRL+C para parar.\n")
    
    while True:
        try:
            if not os.path.exists(PASTA_ENTRADA):
                print(f"⚠️ Pasta de entrada não encontrada: {PASTA_ENTRADA}")
                time.sleep(10)
                continue

            itens = os.listdir(PASTA_ENTRADA)
            
            for item in itens:
                caminho_completo = os.path.join(PASTA_ENTRADA, item)
                
                # PULA se já tiver a marcação de enviado
                if "[ENVIADO]" in item:
                    continue

                if os.path.isdir(caminho_completo):
                    
                    if processar_pasta(caminho_completo, item):
                        # SUCESSO: Renomeia a pasta
                        try:
                            novo_nome = f"[ENVIADO] {item}"
                            novo_caminho = os.path.join(PASTA_ENTRADA, novo_nome)
                            
                            os.rename(caminho_completo, novo_caminho)
                            print(f"    🏷️  Pasta renomeada para: {novo_nome}\n")
                        except Exception as e:
                            print(f"    ⚠️  Exame subiu, mas erro ao renomear: {e}\n")
                    else:
                        pass
            
            time.sleep(5) 

        except KeyboardInterrupt:
            print("\n🛑 Robô paralisado pelo usuário.")
            break
        except Exception as e:
            print(f"Erro fatal no loop: {e}")
            time.sleep(5)

if __name__ == "__main__":
    loop_monitoramento()