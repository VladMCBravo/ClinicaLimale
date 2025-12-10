import requests
import json

# Configurações
API_URL = "https://evolution.116.203.150.219.nip.io"
API_KEY = "Bravotech0510"  # A senha que definimos no docker-compose
HEADERS = {
    "Content-Type": "application/json",
    "apikey": API_KEY
}

def criar_instancia_whatsapp(nome_clinica):
    endpoint = f"{API_URL}/instance/create"
    payload = {
        "instanceName": nome_clinica,
        "token": f"token-{nome_clinica}",
        "qrcode": True
    }
    
    try:
        # verify=False é o equivalente ao -k do curl (útil em desenvolvimento)
        response = requests.post(endpoint, json=payload, headers=HEADERS, verify=False)
        response.raise_for_status()
        
        dados = response.json()
        print(f"Instância '{nome_clinica}' criada!")
        
        # Aqui você pegaria o QR Code para exibir no seu Frontend React
        if 'qrcode' in dados and 'base64' in dados['qrcode']:
            return dados['qrcode']['base64']
            
        return dados
        
    except Exception as e:
        print(f"Erro ao criar instância: {e}")
        return None

# Para testar agora mesmo:
qrcode = criar_instancia_whatsapp("clinica_teste_django")
print("QR Code Base64 recebido (mande isso pro React exibir):", qrcode[:50], "...")