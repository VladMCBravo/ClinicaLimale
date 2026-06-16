import sys
import os
import time

# Adiciona a pasta raiz do projeto (onde fica o manage.py) ao caminho do Python
# Isso garante que o script consiga ler o seu banco de dados mesmo estando dentro da pasta "scripts"
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure para o módulo de settings do seu projeto (troque 'core.settings' se o nome do seu app principal for diferente)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

# Importações dos seus apps (Só podem ser feitas DEPOIS do django.setup())
from chatbot.models import ChatMemory
from pacientes.models import Paciente
from crm.models import AnaliseComportamental
from chatbot.chains import chain_ghost_mode

def resgatar_origens_do_bot():
    print("\n=== 🕵️ INICIANDO VARREDURA DE ORIGEM DE PACIENTES ===\n")
    
    # Pega conversas que passaram do estágio inicial
    conversas = ChatMemory.objects.exclude(state='inicio')
    print(f"🔍 Encontradas {conversas.count()} conversas no histórico da memória.")
    
    sucessos = 0
    ignorados = 0
    
    # Palavras-chave alinhadas com a sua nova lista do Frontend
    palavras_chave = [
        'google', 'instagram', 'facebook', 'tiktok', 'site', 
        'indicação', 'indicacao', 'indicou', 'amiga', 'pesquisei', 
        'médico', 'medico', 'doutor', 'dr', 'convênio', 'convenio', 'plano'
    ]

    for conversa in conversas:
        telefone = conversa.session_id
        telefone_limpo = ''.join(filter(str.isdigit, str(telefone)))
        
        # Ajusta o formato DDI do Brasil se necessário
        if len(telefone_limpo) == 13 and telefone_limpo.startswith('55'):
            telefone_limpo = telefone_limpo[2:]
            
        paciente = Paciente.objects.filter(telefone_celular=telefone_limpo).first()
        if not paciente:
            continue
            
        memoria = conversa.memory_data
        if isinstance(memoria, dict):
            historico = memoria.get('historico_conversa', [])
            if not historico:
                continue
                
            texto_historico = "\n".join(historico)
            
            # Filtro para economizar tokens do Gemini
            if not any(p in texto_historico.lower() for p in palavras_chave):
                ignorados += 1
                continue
            
            # Checa se esse paciente já tem a origem salva (para pular os já processados)
            comp, _ = AnaliseComportamental.objects.get_or_create(paciente=paciente)
            if comp.origem_aquisicao:
                continue
            
            print(f"🤖 Analisando histórico de: {paciente.nome_completo}...")
            try:
                # Invoca a IA
                resultado = chain_ghost_mode.invoke({
                    "user_message": "Faça um scan neste histórico e diga de onde o paciente conheceu a clínica.",
                    "historico": texto_historico
                })
                
                origem = resultado.get("origem_aquisicao")
                
                if origem:
                    comp.origem_aquisicao = origem
                    comp.save()
                    sucessos += 1
                    print(f"✅ Atualizado: {paciente.nome_completo} -> Origem: {origem}")
                        
                # Pausa para evitar Rate Limit (bloqueio por excesso de requisições) da API do Gemini
                time.sleep(2)
                
            except Exception as e:
                print(f"⚠️ Erro na IA ao analisar {paciente.nome_completo}: {e}")
                
    print("\n" + "="*60)
    print(f"🎉 VARREDURA CONCLUÍDA COM SUCESSO!")
    print(f"📍 Históricos sem palavras-chave (ignorados): {ignorados}")
    print(f"📍 Origens resgatadas com IA e salvas no CRM: {sucessos}")
    print("="*60 + "\n")

if __name__ == '__main__':
    resgatar_origens_do_bot()