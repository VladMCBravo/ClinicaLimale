import requests
import json
import urllib3

# Desabilita o aviso de "InsecureRequest" pois estamos usando certificado auto-assinado (nip.io)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configurações
API_URL = "https://evolution.116.203.150.219.nip.io"
API_KEY = "Bravotech0510" # <--- TROQUE PELA SUA SENHA DO DOCKER-COMPOSE
HEADERS = {
    "Content-Type": "application/json",
    "apikey": API_KEY
}

def criar_instancia():
    print("⏳ Tentando criar instância...")
    endpoint = f"{API_URL}/instance/create"
    payload = {
        "instanceName": "clinica_teste_01",
        "token": "token-da-clinica-01",
        "qrcode": True
    }
    
    try:
        # verify=False ignora o erro do cadeado SSL
        response = requests.post(endpoint, json=payload, headers=HEADERS, verify=False)
        
        if response.status_code == 403:
            print("❌ Erro 403: Sua API KEY está errada. Verifique o arquivo docker-compose.yml")
            return

        if response.status_code == 201 or response.status_code == 200:
            dados = response.json()
            print("✅ Sucesso! Instância Criada.")
            
            # Tenta pegar o QR Code
            if 'qrcode' in dados and 'base64' in dados['qrcode']:
                qr = dados['qrcode']['base64']
                print(f"\n📲 QR CODE (Início): {qr[:50]}...")
                print("\n👉 Agora abra este site para ler o QR Code visualmente:")
                print("http://evolution.116.203.150.219.nip.io/manager")
            else:
                print("⚠️ Instância criada, mas sem QR Code (talvez já exista).")
                print("Resposta:", dados)
        else:
            print(f"❌ Erro {response.status_code}: {response.text}")

    except Exception as e:
        print(f"❌ Erro de conexão: {e}")

if __name__ == "__main__":
    criar_instancia()
