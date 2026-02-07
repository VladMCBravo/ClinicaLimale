from datetime import timedelta, datetime
import re

def extrair_dum_do_laudo(laudo):
    """
    Lê o JSON estruturado do laudo para encontrar a DUM.
    Suporta estrutura simples e estrutura aninhada (feto1, feto2).
    """
    dados = laudo.dados_estruturados or {}
    
    if not dados:
        return None

    # --- CORREÇÃO PARA ESTRUTURA ANINHADA (GÊMEOS/MULTIPLOS) ---
    # Se o JSON tiver a chave 'feto1', usamos ela como fonte principal de dados
    # pois a datação da gestação geralmente segue o Feto 1 ou o maior.
    fonte_dados = dados
    if 'feto1' in dados and isinstance(dados['feto1'], dict):
        # Estamos no novo formato do useObstetricoForm
        fonte_dados = dados['feto1'] 
        print(f"[IA LAUDO] Detectada estrutura aninhada. Lendo dados do Feto 1.")

    try:
        # --- CASO 1: DATAÇÃO PELA DUM (A médica confiou na DUM) ---
        metodo = fonte_dados.get('metodoDatacao') # Ex: 'DUM', 'CCN', 'BIOMETRIA'
        
        # Verifica DUM explícita
        if metodo == 'DUM' and fonte_dados.get('dum'):
            return parse_data(fonte_dados.get('dum'))

        # --- CASO 2: DATAÇÃO PELA BIOMETRIA/CCN ---
        # Tenta pegar a DPP calculada para fazer a engenharia reversa
        dpp_calculada = fonte_dados.get('dppBiometriaCalculada') or fonte_dados.get('dppVeredito')
        
        if dpp_calculada:
            dpp_date = parse_data(dpp_calculada)
            if dpp_date:
                # DUM = DPP - 280 dias
                dum_operacional = dpp_date - timedelta(days=280)
                print(f"[IA LAUDO] DUM calculada via DPP ({dpp_calculada}): {dum_operacional}")
                return dum_operacional

        # --- CASO 3: FALLBACK (Pela string de IG) ---
        ig_texto = fonte_dados.get('igVeredito') or fonte_dados.get('igBiometria')
        
        # Se falhar no feto1, tenta no root (compatibilidade legada)
        if not ig_texto and fonte_dados != dados:
            ig_texto = dados.get('igVeredito')

        if ig_texto:
            semanas_match = re.search(r'(\d+)\s*sem', ig_texto)
            dias_match = re.search(r'(\d+)\s*d', ig_texto)
            
            semanas = int(semanas_match.group(1)) if semanas_match else 0
            dias = int(dias_match.group(1)) if dias_match else 0
            
            if semanas > 0:
                dias_totais = (semanas * 7) + dias
                # Pega data do exame
                data_exame = laudo.data_criacao.date()
                if laudo.exame:
                    data_exame = laudo.exame.data_exame
                
                dum_reversa = data_exame - timedelta(days=dias_totais)
                print(f"[IA LAUDO] DUM calculada via IG ({ig_texto}): {dum_reversa}")
                return dum_reversa

    except Exception as e:
        print(f"[IA LAUDO] Erro ao processar JSON: {e}")
        return None

    return None

def parse_data(data_str):
    """Helper para tentar vários formatos de data"""
    if not data_str: return None
    if isinstance(data_str, datetime): return data_str.date() # Já é objeto
    
    formatos = ['%Y-%m-%d', '%d/%m/%Y', '%Y/%m/%d']
    for fmt in formatos:
        try:
            return datetime.strptime(str(data_str)[:10], fmt).date()
        except ValueError:
            continue
    return None