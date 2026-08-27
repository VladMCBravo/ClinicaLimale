import platform
import os
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

sistema = platform.system()
modo_simulador = (sistema != "Windows")

if not modo_simulador:
    print("🖥️ Windows detectado. Preparando SDK da Futronic...")
    # Aqui futuramente entrará o código da DLL
else:
    print("🍎 Mac detectado. Iniciando API em MODO SIMULADOR.")

@app.route('/api/capturar-template', methods=['GET'])
def capturar_template():
    """ Rota usada pelo RH para CADASTRAR um novo funcionário """
    print("RH pediu para cadastrar uma digital!")
    if modo_simulador:
        return jsonify({
            "status": "sucesso",
            "mensagem": "Digital capturada (Modo Simulador)",
            "template_b64": "TEMPLATE_FALSO_GERADO_NO_MAC_PARA_TESTES_12345"
        })

@app.route('/api/identificar-digital', methods=['POST'])
def identificar_digital():
    """ Rota usada pelo Quiosque para BATER O PONTO """
    print("Quiosque pediu para identificar um dedo!")
    dados = request.json
    lista_templates = dados.get('templates_cadastrados', [])
    
    if modo_simulador:
        # Finge que leu o dedo e encontrou o primeiro usuário da lista
        if len(lista_templates) > 0:
            usuario_id_encontrado = lista_templates[0]['usuario_id']
            return jsonify({
                "status": "sucesso",
                "mensagem": "Digital reconhecida (Modo Simulador)",
                "usuario_id": usuario_id_encontrado
            })
        else:
            return jsonify({"status": "erro", "mensagem": "Nenhuma digital cadastrada no banco."}), 404

if __name__ == '__main__':
    print("🚀 Servidor biométrico rodando na porta 8080...")
    app.run(port=8080)