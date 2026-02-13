import os
import requests
import urllib3
from dotenv import load_dotenv

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
load_dotenv()

def test_evolution_api():
    print("\n--- Testando Evolution API ---")
    url = os.getenv('EVOLUTION_API_URL')
    key = os.getenv('EVOLUTION_API_KEY')
    
    if not url: return

    # Testando o endpoint de versão, que é o mais simples e não exige instância
    endpoint = f"{url}/instance/fetchInstances"
    
    try:
        # Tentamos com verify=False para ignorar o erro de nome não reconhecido (SNI)
        response = requests.get(endpoint, headers={"apikey": key}, timeout=10, verify=False)
        if response.status_code == 200:
            print(f"✅ Conexão com Evolution API: Sucesso!")
        else:
            print(f"❌ Erro Evolution: Status {response.status_code} (Verifique se a API_KEY está correta)")
    except Exception as e:
        print(f"❌ Falha técnica Evolution: {e}")

def test_gemini_api():
    print("\n--- Testando Google Gemini API ---")
    key = os.getenv('GOOGLE_API_KEY')
    
    if not key or "BLANK" in key:
        print("❌ Chave do Gemini ausente no .env")
        return

    # URL ATUALIZADA: Usando gemini-1.5-flash (mais estável para teste) 
    # ou gemini-2.0-flash (mais novo)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
    payload = {"contents": [{"parts": [{"text": "Diga 'Conexão Limale 2026 OK'"}]}]}
    
    try:
        response = requests.post(url, json=payload, timeout=15)
        if response.status_code == 200:
            print("✅ Conexão com Gemini: Sucesso!")
            print(f"🤖 Resposta: {response.json()['candidates'][0]['content']['parts'][0]['text']}")
        elif response.status_code == 404:
            print("❌ Erro 404: O modelo 'gemini-1.5-flash' não foi encontrado. Tentando 'gemini-pro'...")
            # Fallback rápido para o nome antigo se o novo falhar
            url_alt = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={key}"
            response = requests.post(url_alt, json=payload, timeout=15)
            if response.status_code == 200:
                 print("✅ Conexão com Gemini (via gemini-pro): Sucesso!")
            else:
                 print(f"❌ Falha definitiva no Gemini: {response.status_code}")
        else:
            print(f"❌ Erro Gemini {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Falha técnica Gemini: {e}")

if __name__ == "__main__":
    test_evolution_api()
    test_gemini_api()