# prontuario/services_auditoria.py

import json
import os
from anthropic import Anthropic, APIConnectionError, RateLimitError, APIStatusError
from django.conf import settings

PROMPT_SISTEMA_AUDITOR = """
Você é um auditor de qualidade e integridade de laudos médicos de diagnóstico por imagem.
Sua única função é identificar INCONSISTÊNCIAS FACTUAIS e CONTRADIÇÕES entre:
1. Os "Dados Estruturados" (JSON com parâmetros, medições, sexo).
2. O "Texto do Laudo" (conteúdo narrativo final).

DIRETRIZES FUNDAMENTAIS:
- NÃO dê diagnósticos, condutas ou palpites terapêuticos.
- Foque em discrepâncias lógicas estruturais.

🚨 REGRA DE OURO (RISCO MÉDICO-LEGAL): 
Se o JSON indicar paciente do sexo "Masculino" ou "M", JAMAIS pode haver descrições de útero, ovários, endométrio, gestação ou anexos pélvicos femininos no texto. BARRE IMEDIATAMENTE.
Se o JSON indicar paciente do sexo "Feminino" ou "F", JAMAIS pode haver descrições de próstata ou testículos.

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
    Possui tolerância a falhas: se a IA cair, o laudo é aprovado automaticamente.
    """
    api_key = os.environ.get('ANTHROPIC_API_KEY') or getattr(settings, 'ANTHROPIC_API_KEY', '')
    
    if not api_key:
        print("[AUDITORIA IA] ⚠️ Chave não configurada. Fallback ativado: Laudo liberado.")
        return {"aprovado": True, "discrepancias": []}

    try:
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
            temperature=0.0,
            system=PROMPT_SISTEMA_AUDITOR,
            messages=[{"role": "user", "content": prompt_usuario}]
        )

        conteudo_raw = response.content[0].text.strip()
        
        if conteudo_raw.startswith("```"):
            conteudo_raw = conteudo_raw.split("```")[1]
            if conteudo_raw.startswith("json"):
                conteudo_raw = conteudo_raw[4:]
        
        return json.loads(conteudo_raw.strip())
        
    except (APIConnectionError, RateLimitError, APIStatusError) as e:
        # =====================================================================
        # 🛡️ O Famoso Fallback de Segurança
        # Captura erros de internet, excesso de requisições ou falta de saldo
        # =====================================================================
        print(f"[AUDITORIA IA] 🚨 Instabilidade ou Falta de Crédito na Anthropic: {e}")
        print("[AUDITORIA IA] 🛡️ Fallback ativado: O laudo seguirá para assinatura normalmente para não travar a clínica.")
        return {"aprovado": True, "discrepancias": []}
        
    except Exception as e:
        print(f"[AUDITORIA IA] ❌ Erro interno no script: {e}")
        return {"aprovado": True, "discrepancias": []}