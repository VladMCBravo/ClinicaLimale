# prontuario/services_auditoria.py

import json
import os
from anthropic import Anthropic
from django.conf import settings

PROMPT_SISTEMA_AUDITOR = """
Você é um auditor de qualidade e integridade de laudos médicos de diagnóstico por imagem.
Sua única função é identificar INCONSISTÊNCIAS FACTUAIS e CONTRADIÇÕES entre:
1. Os "Dados Estruturados" (JSON com parâmetros, medições, sexo, biometria).
2. O "Texto do Laudo" (conteúdo narrativo final).

DIRETRIZES FUNDAMENTAIS:
- NÃO dê diagnósticos, condutas ou palpites terapêuticos.
- Foque em discrepâncias lógicas:
  * Lateralidade oposta (ex: JSON diz rim direito dilatado, texto diz rim esquerdo).
  * Incoerência anatômica/sexo (ex: paciente masculino com descrição de ovários/útero).
  * Quantidade de estruturas (ex: gestação única no JSON, mas texto cita Feto II).
  * Valores discrepantes relevantes entre tabelas de medidas e a conclusão descritiva.
- Se o laudo estiver coerente, responda apenas: {"aprovado": true, "discrepancias": []}
- Se houver discrepâncias, aponte de forma técnica e resumida.

FORMATO DE RESPOSTA OBRIGATÓRIO (apenas JSON puro, sem markdown, sem ```json):
{
  "aprovado": false,
  "discrepancias": [
    {
      "campo": "Nome do Campo ou Seção",
      "aviso": "Descrição curta e direta da divergência encontrada."
    }
  ]
}
"""

def auditar_coerencia_laudo(dados_estruturados: dict, texto_laudo: str, tipo_exame: str) -> dict:
    """
    Executa a conferência lógica via Claude 3.5 Sonnet.
    Retorna o dicionário com 'aprovado' e lista de 'discrepancias'.
    """
    # CORREÇÃO: Tenta pegar direto do SO (Render) ou, em último caso, do settings local
    api_key = os.environ.get('ANTHROPIC_API_KEY') or getattr(settings, 'ANTHROPIC_API_KEY', '')
    
    # Se a chave não existir, aprova silenciosamente para não travar a clínica
    if not api_key:
        print("[AUDITORIA IA] Aviso: Chave da API não encontrada no Render. Pulando auditoria.")
        return {"aprovado": True, "discrepancias": []}

    try:
        # Instancia o cliente do Claude APENAS no momento do uso e com a chave garantida
        client = Anthropic(api_key=api_key)

        prompt_usuario = f"""
        TIPO DE EXAME: {tipo_exame}

        --- DADOS ESTRUTURADOS (JSON) ---
        {json.dumps(dados_estruturados, ensure_ascii=False, indent=2)}

        --- TEXTO DO LAUDO ---
        {texto_laudo}
        """

        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            temperature=0.0,  # Determinístico, sem criatividade
            system=PROMPT_SISTEMA_AUDITOR,
            messages=[{"role": "user", "content": prompt_usuario}]
        )

        conteudo_raw = response.content[0].text.strip()
        
        # Tratamento de segurança caso o modelo envolva em markdown
        if conteudo_raw.startswith("```"):
            conteudo_raw = conteudo_raw.split("```")[1]
            if conteudo_raw.startswith("json"):
                conteudo_raw = conteudo_raw[4:]
        
        return json.loads(conteudo_raw.strip())
        
    except Exception as e:
        print(f"[AUDITORIA IA] Erro ao consultar Claude: {e}")
        # Em caso de falha de conexão (ex: internet caiu), libera o laudo
        return {"aprovado": True, "discrepancias": [], "erro_comunicacao": str(e)}