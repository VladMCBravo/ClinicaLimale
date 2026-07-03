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

import re
from io import BytesIO
from django.template.loader import render_to_string
from xhtml2pdf import pisa
import base64
import os
import qrcode
from django.conf import settings

def formatar_texto_laudo_para_html(texto_bruto):
    """
    Traduz a lógica do frontend para HTML compatível com xhtml2pdf.
    Suporta tabelas duplas (Obstetrícia), tabelas simples (Cardiologia) e formatação de Doppler.
    """
    if not texto_bruto:
        return ""

    # Limpeza de marcadores do frontend
    texto_bruto = texto_bruto.replace("(Ver PDF)", "").replace("===", "").strip()

    linhas = texto_bruto.split('\n')
    html_out = []
    
    modo = 'NORMAL'
    em_tabela_dupla = False
    em_tabela_simples = False

    tabela_dupla_html = """
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px;">
        <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 10px;">
                <h3 style="color: #2E7D32; font-size: 10pt; font-weight: bold; border-bottom: 1px solid #E0E0E0; margin-bottom: 5px;">BIOMETRIA FETAL</h3>
                <table style="width: 100%; font-size: 9pt;">
    """

    titulos_principais = [
        'CONCLUSÃO', 'IMPRESSÃO DIAGNÓSTICA', 'OPINIÃO', 'ANÁLISE MORFOLÓGICA', 'ANÁLISE FETAL',
        'AVALIAÇÃO DO COLO UTERINO', 'ESTUDO DOPPLERFLUXOMÉTRICO', 'ESTUDO TRIDIMENSIONAL',
        'AVALIAÇÃO COMPLEMENTAR', 'RASTREAMENTO DE ANEUPLOIDIAS', 'ANEXOS', 
        'COMENTÁRIOS', 'FETO I', 'FETO II', 'FETO III', 'TABELA DE MEDIDAS'
    ]

    for linha in linhas:
        linha_original = linha
        linha = linha.strip()
        
        if not linha:
            if modo == 'NORMAL': html_out.append("<div style='height: 5px;'></div>")
            continue

        # Remove caracteres especiais do início para checar os títulos
        linha_limpa = re.sub(r'^[-=*\s]+', '', linha).strip().upper()

        # 1. VERIFICA SE É UM NOVO TÍTULO E FECHA AS TABELAS ABERTAS
        is_titulo = any(linha_limpa.startswith(t) for t in titulos_principais)

        if is_titulo or linha_limpa == "BIOMETRIA FETAL":
            if em_tabela_dupla:
                html_out.append("</table></td></tr></table>")
                em_tabela_dupla = False
            if em_tabela_simples:
                html_out.append("</table>")
                em_tabela_simples = False
            modo = 'NORMAL'

        # 2. IDENTIFICA A TABELA DE OBSTETRÍCIA (DUPLA)
        if "BIOMETRIA FETAL" in linha_limpa:
            modo = 'BIOMETRIA'
            em_tabela_dupla = True
            html_out.append(tabela_dupla_html)
            continue
            
        if "ÍNDICES E ESTIMATIVAS" in linha_limpa and em_tabela_dupla:
            modo = 'INDICES'
            html_out.append("""
                </table>
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 10px;">
                <h3 style="color: #2E7D32; font-size: 10pt; font-weight: bold; border-bottom: 1px solid #E0E0E0; margin-bottom: 5px;">ÍNDICES E ESTIMATIVAS</h3>
                <table style="width: 100%; font-size: 9pt;">
            """)
            continue

        # 3. IDENTIFICA A TABELA DE CARDIOLOGIA (SIMPLES)
        if "TABELA DE MEDIDAS" in linha_limpa:
            modo = 'ECO_TABELA'
            em_tabela_simples = True
            html_out.append("""
            <h3 style="color: #1C2E4A; font-size: 10pt; font-weight: bold; border-bottom: 1px solid #E0E0E0; margin-top: 10px; margin-bottom: 5px;">TABELA DE MEDIDAS</h3>
            <table style="width: 100%; font-size: 9pt; border-collapse: collapse; margin-bottom: 15px;">
            """)
            continue

        # 4. PREENCHE OS DADOS DENTRO DAS TABELAS
        if modo in ['BIOMETRIA', 'INDICES', 'ECO_TABELA']:
            if ':' in linha:
                partes = linha.split(':', 1)
                html_out.append(f'<tr><td style="color: #333; padding: 3px 0; border-bottom: 1px solid #f9f9f9;">{partes[0].strip()}:</td><td style="font-weight: bold; text-align: right; padding: 3px 0; border-bottom: 1px solid #f9f9f9;">{partes[1].strip()}</td></tr>')
            else:
                html_out.append(f'<tr><td colspan="2" style="color: #333; padding: 3px 0; font-weight: bold;">{linha}</td></tr>')
        
        # 5. RENDERIZA TÍTULOS E TEXTO NORMAL
        else:
            if is_titulo:
                html_out.append(f'<div style="color: #1C2E4A; font-weight: bold; font-size: 11pt; margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid #eee;">{linha.replace(":", "")}</div>')
            else:
                # Resolve o problema das tabulações (\t) usadas no Doppler
                if '\t' in linha_original:
                    linha_formatada = linha_original.replace('\t', '&nbsp;&nbsp;&nbsp;&nbsp;')
                    html_out.append(f'<div style="margin-bottom: 3px; font-family: monospace; font-size: 9pt; color: #333;">{linha_formatada.strip()}</div>')
                else:
                    html_out.append(f'<div style="margin-bottom: 3px;">{linha}</div>')

    # Garante o fechamento das tabelas no final
    if em_tabela_dupla: html_out.append("</table></td></tr></table>")
    if em_tabela_simples: html_out.append("</table>")
    
    return "".join(html_out)

def gerar_pdf_laudo_backend(context):
    """Renderiza o HTML para PDF em memória (transparente)"""
    texto_bruto = context.get('laudo').texto_laudo if context.get('laudo') else ''
    context['texto_laudo_html'] = formatar_texto_laudo_para_html(texto_bruto)
    
    medico = context.get('medico')
    tem_certificado = False
    qr_code_data_url = ""
    logo_icp_data_url = ""

    # Gera a caixa visual de assinatura ICP-Brasil no rodapé se o médico tiver certificado
    if medico and hasattr(medico, 'certificado') and medico.certificado.arquivo_p12:
        tem_certificado = True
        try:
            qr = qrcode.QRCode(version=1, box_size=4, border=0)
            qr.add_data("https://validar.iti.gov.br")
            qr.make(fit=True)
            img_qr = qr.make_image(fill_color="black", back_color="#f8f9fa")
            buffer_qr = BytesIO()
            img_qr.save(buffer_qr, format="PNG")
            qr_base64 = base64.b64encode(buffer_qr.getvalue()).decode("utf-8")
            qr_code_data_url = f"data:image/png;base64,{qr_base64}"

            caminho_logo = os.path.join(settings.BASE_DIR, 'static', 'images', 'logo_icp_brasil.png')
            if os.path.exists(caminho_logo):
                with open(caminho_logo, "rb") as f:
                    logo_icp_data_url = f"data:image/png;base64,{base64.b64encode(f.read()).decode('utf-8')}"
        except Exception as e:
            print(f"Erro ao gerar selos visuais do laudo: {e}")

    context['tem_assinatura_digital'] = tem_certificado
    context['qr_code_base64_ou_url'] = qr_code_data_url
    context['logo_icp_base64'] = logo_icp_data_url

    html = render_to_string('pdfs/laudo_template.html', context)
    result = BytesIO()
    pdf = pisa.pisaDocument(BytesIO(html.encode("UTF-8")), result)
    
    if not pdf.err:
        return result.getvalue()
    return None