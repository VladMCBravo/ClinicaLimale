from datetime import timedelta, datetime

def extrair_dum_do_laudo(laudo):
    """
    Lê o JSON estruturado do laudo para encontrar a DUM Real ou Operacional.
    Retorna um objeto date ou None.
    """
    dados = laudo.dados_estruturados or {}
    
    # Se não tiver dados estruturados, retorna None (evita tentar ler texto livre)
    if not dados:
        return None

    try:
        dum_final = None
        
        # --- CASO 1: DATAÇÃO PELA DUM (A médica confiou na DUM) ---
        # Verifica se o método escolhido foi 'DUM'
        metodo = dados.get('metodoDatacao') # Ex: 'DUM', 'CCN', 'BIOMETRIA'
        
        if metodo == 'DUM' and dados.get('dum'):
            dum_str = dados.get('dum') # Esperado YYYY-MM-DD do frontend
            return parse_data(dum_str)

        # --- CASO 2: DATAÇÃO PELA BIOMETRIA/CCN (A DUM não bate ou é desconhecida) ---
        # Nesse caso, calculamos a "DUM Operacional" baseada na DPP calculada pelo ultrassom.
        # Fórmula: DUM = DPP - 280 dias (40 semanas)
        
        dpp_calculada = dados.get('dppBiometriaCalculada') or dados.get('dppVeredito')
        
        if dpp_calculada:
            dpp_date = parse_data(dpp_calculada)
            if dpp_date:
                # Regra de Naegele Inversa: DUM = DPP - 280 dias
                dum_operacional = dpp_date - timedelta(days=280)
                print(f"[IA LAUDO] DUM Operacional calculada via DPP ({dpp_calculada}): {dum_operacional}")
                return dum_operacional

        # --- CASO 3: FALLBACK (Cálculo reverso pela IG informada) ---
        # Se não tiver DPP, tentamos a Idade Gestacional (igVeredito)
        # Ex: "12 semanas e 3 dias"
        ig_texto = dados.get('igVeredito') or dados.get('igBiometria')
        if ig_texto:
            # Tenta extrair números da string "12 semanas e 3 dias"
            import re
            semanas_match = re.search(r'(\d+)\s*sem', ig_texto)
            dias_match = re.search(r'(\d+)\s*d', ig_texto) # 'd' pega 'dias' ou 'd'
            
            semanas = int(semanas_match.group(1)) if semanas_match else 0
            dias = int(dias_match.group(1)) if dias_match else 0
            
            if semanas > 0:
                dias_totais = (semanas * 7) + dias
                data_exame = laudo.data_criacao.date()
                if laudo.exame:
                    data_exame = laudo.exame.data_exame
                
                dum_reversa = data_exame - timedelta(days=dias_totais)
                print(f"[IA LAUDO] DUM Reversa calculada via IG ({ig_texto}): {dum_reversa}")
                return dum_reversa

    except Exception as e:
        print(f"[IA LAUDO] Erro ao processar JSON: {e}")
        return None

    return None

def parse_data(data_str):
    """Helper para tentar vários formatos de data"""
    if not data_str: return None
    formatos = ['%Y-%m-%d', '%d/%m/%Y', '%Y/%m/%d']
    for fmt in formatos:
        try:
            return datetime.strptime(data_str[:10], fmt).date()
        except ValueError:
            continue
    return None