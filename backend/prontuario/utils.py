import re
import os
import io
import base64
import qrcode
from io import BytesIO
from django.conf import settings
from xhtml2pdf import pisa
from datetime import datetime

def formatar_texto_laudo_para_html(texto_bruto, titulo_exame="", bloco_assinatura=""):
    if not texto_bruto:
        return ""
    
    # =================================================================
    # 🚀 NOVO: CATRACA INTELIGENTE (BYPASS PARA O V2)
    # Verifica se o texto já é HTML nativo (veio do TinyMCE)
    texto_limpo = texto_bruto.strip()
    if texto_limpo.startswith('<') and ('</p>' in texto_limpo or '</h4>' in texto_limpo or '</table>' in texto_limpo):
        # É HTML pronto! Ignora o processador antigo e só cola a assinatura no final.
        return f'{texto_limpo}<div style="margin-top: 40px; page-break-inside: avoid;">{bloco_assinatura}</div>'
    # =================================================================

    # 👇 DAQUI PARA BAIXO, SEU CÓDIGO LEGADO CONTINUA INTACTO 👇
    texto_bruto = texto_bruto.replace("(Ver PDF)", "").replace("===", "").strip()
    linhas_brutas = texto_bruto.split('\n')
    
    # Remove títulos duplicados
    titulo_exame_upper = titulo_exame.strip().upper()
    for i in range(min(4, len(linhas_brutas))):
        linha_atual = linhas_brutas[i].strip().upper()
        if linha_atual and (linha_atual == titulo_exame_upper or "ULTRASSONOGRAFIA" in linha_atual or "ECOCARDIOGRAMA" in linha_atual):
            linhas_brutas[i] = ""
            
    linhas = "\n".join(linhas_brutas).strip().split('\n')
    
    html_out = []
    em_tabela = False
    em_bloco_final = False

    titulos_principais = [
        'CONCLUSÃO', 'IMPRESSÃO DIAGNÓSTICA', 'OPINIÃO', 'COMENTÁRIOS', 'OBSERVAÇÕES', 'ANEXOS',
        'ANÁLISE MORFOLÓGICA', 'ANÁLISE FETAL', 'RASTREAMENTO MORFOLÓGICO', 'RASTREAMENTO DE ANEUPLOIDIAS',
        'BIOMETRIA FETAL', 'ÍNDICES E ESTIMATIVAS', 'AVALIAÇÃO DO COLO UTERINO', 'ESTUDO TRIDIMENSIONAL',
        'ESTUDO DOPPLERFLUXOMÉTRICO', 'FETO I', 'FETO II', 'FETO III',
        'AVALIAÇÃO PÉLVICA', 'ÚTERO E ANEXOS', 'ÓRGÃOS ABDOMINAIS', 'AVALIAÇÃO ABDOMINAL',
        'SISTEMA CAROTÍDEO', 'ARTÉRIAS CARÓTIDAS', 'SISTEMA VERTEBRAL', 'ARTÉRIAS VERTEBRAIS',
        'MEDIDAS ECOCARDIOGRÁFICAS', 'TABELA DE MEDIDAS', 'ANÁLISE DESCRITIVA', 'AVALIAÇÃO COMPLEMENTAR'
    ]
    
    titulos_finais = ['CONCLUSÃO', 'IMPRESSÃO DIAGNÓSTICA', 'OPINIÃO']
    frases_rodape = ["FAVOR TRAZER", "A IMAGEM DIAGN", "NEM TODAS AS ALTERA", "A MEDIDA DA TRANSLUC", "ESTE EXAME NÃO SUBSTITUI"]

    def fechar_tabela():
        nonlocal em_tabela
        if em_tabela:
            html_out.append("</table></div><br/>")
            em_tabela = False

    for linha in linhas:
        linha_original = linha
        linha = linha.strip()
        
        if not linha:
            if not em_tabela:
                html_out.append("<div style='line-height: 4px;'>&nbsp;</div>")
            continue

        linha_limpa = re.sub(r'^[-=*\s]+', '', linha).strip().upper()
        is_titulo = any(linha_limpa.startswith(t) for t in titulos_principais)
        is_rodape = any(linha_limpa.startswith(f) for f in frases_rodape)

        if is_titulo:
            fechar_tabela()
            
            if em_bloco_final:
                html_out.append("</div>") # Fecha div do bloco final
                em_bloco_final = False

            titulo_limpo = linha.replace(":", "").strip()
            
            # Blocos Críticos (Conclusão e Tabelas): Envelopar em Div com page-break-inside
            if any(linha_limpa.startswith(t) for t in titulos_finais):
                html_out.append('<div style="page-break-inside: avoid;">')
                html_out.append(f'<div style="color: #2E7D32; font-weight: bold; font-size: 11pt; margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid #E0E0E0; padding-bottom: 2px;">{titulo_limpo}</div>')
                em_bloco_final = True
            elif any(x in linha_limpa for x in ["BIOMETRIA", "TABELA", "DOPPLER", "ÍNDICES", "MEDIDAS"]):
                html_out.append('<div style="page-break-inside: avoid;">')
                html_out.append(f'<div style="color: #2E7D32; font-weight: bold; font-size: 11pt; margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid #E0E0E0; padding-bottom: 4px;">{titulo_limpo}</div>')
                html_out.append('<table width="100%" border="0" cellpadding="2" cellspacing="0" style="font-size: 10pt;">')
                em_tabela = True
            else:
                html_out.append(f'<div style="color: #2E7D32; font-weight: bold; font-size: 11pt; margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid #E0E0E0; padding-bottom: 2px;">{titulo_limpo}</div>')
            continue

        if is_rodape:
            fechar_tabela()
            html_out.append(f'<div style="margin-top: 10px; font-size: 8pt; color: #555; text-align: justify; line-height: 1.1;">{linha}</div>')
            continue

        if em_tabela:
            if linha.endswith(':') and len(linha) < 45:
                html_out.append(f'<tr><td colspan="2" style="font-weight: bold; color: #1C2E4A; padding-top: 10px; padding-bottom: 2px;">{linha}</td></tr>')
            elif ':' in linha:
                partes = linha.split(':', 1)
                label = partes[0].strip()
                valor = partes[1].strip()
                if len(label) < 45 and valor:
                    html_out.append(f'<tr><td width="40%" style="color: #555; padding-left: 15px; vertical-align: top;">{label}:</td><td width="60%" style="font-weight: bold; color: #111; vertical-align: top;">{valor}</td></tr>')
                else:
                    html_out.append(f'<tr><td colspan="2" style="color: #333; padding-left: 15px; vertical-align: top;">{linha}</td></tr>')
            else:
                html_out.append(f'<tr><td colspan="2" style="color: #333; padding-left: 15px; vertical-align: top;">{linha}</td></tr>')
            continue

        # Texto Normal
        if '\t' in linha_original:
            linha_formatada = linha_original.replace('\t', '&nbsp;&nbsp;&nbsp;&nbsp;')
            html_out.append(f'<div style="margin-bottom: 2px; font-family: monospace; font-size: 10pt; color: #333;">{linha_formatada.strip()}</div>')
        elif linha.startswith('-'):
            html_out.append(f'<div style="margin-bottom: 3px; padding-left: 15px; font-size: 10pt; text-align: justify;">{linha}</div>')
        elif ': ' in linha:
            partes = linha.split(': ', 1)
            prefixo = partes[0].strip()
            resto = partes[1].strip()
            if len(prefixo) <= 45:
                html_out.append(f'<div style="margin-bottom: 4px; font-size: 10pt; text-align: justify; line-height: 1.25;"><span style="font-weight: bold; color: #1C2E4A;">{prefixo}:</span> {resto}</div>')
            else:
                html_out.append(f'<div style="margin-bottom: 3px; font-size: 10pt; text-align: justify; line-height: 1.25;">{linha}</div>')
        else:
            html_out.append(f'<div style="margin-bottom: 3px; font-size: 10pt; text-align: justify; line-height: 1.25;">{linha}</div>')

    fechar_tabela()
    
    html_joined = "".join(html_out)
    # Assinatura: tenta grudar no bloco final, ou fica solta (mas sem forçar tabelas que quebram o layout)
    if em_bloco_final:
        html_joined += f'<div style="margin-top: 40px;">{bloco_assinatura}</div></div>'
    else:
        html_joined += f'<div style="margin-top: 40px;">{bloco_assinatura}</div>'

    return html_joined

def gerar_pdf_laudo_backend(context):
    laudo = context.get('laudo')
    paciente = context.get('paciente')
    medico = context.get('medico')
    idade_formatada = context.get('idade_formatada', '')
    data_exame = context.get('data_exame')
    imagens = context.get('imagens', [])
    texto_bruto = laudo.texto_laudo if laudo else ''
    
    dados_estruturados = laudo.dados_estruturados if laudo and isinstance(laudo.dados_estruturados, dict) else {}
    medico_solicitante = dados_estruturados.get('medicoSolicitante', 'NÃO INFORMADO').upper()
    titulo_do_laudo = laudo.titulo_exame if laudo else 'RELATÓRIO MÉDICO'
    data_formatada = data_exame.strftime("%d/%m/%Y") if data_exame else ""

    tem_certificado = False
    qr_code_tag = ""
    logo_icp_tag = ""
    assinatura_data = ""
    
    if medico and hasattr(medico, 'certificado') and medico.certificado.arquivo_p12:
        tem_certificado = True
        assinatura_data = datetime.now().strftime("%d/%m/%Y - %H:%M:%S (GMT-3)")
        
        try:
            qr = qrcode.QRCode(version=1, box_size=4, border=0)
            qr.add_data("https://validar.iti.gov.br")
            qr.make(fit=True)
            img_qr = qr.make_image(fill_color="black", back_color="white")
            buffer_qr = BytesIO()
            img_qr.save(buffer_qr, format="PNG")
            qr_base64 = base64.b64encode(buffer_qr.getvalue()).decode("utf-8")
            qr_code_tag = f'<img src="data:image/png;base64,{qr_base64}" width="55" height="55"/>'

            caminho_logo = os.path.join(settings.BASE_DIR, 'static', 'images', 'logo_icp_brasil.png')
            if os.path.exists(caminho_logo):
                with open(caminho_logo, "rb") as f:
                    logo_base64 = base64.b64encode(f.read()).decode('utf-8')
                    logo_icp_tag = f'<img src="data:image/png;base64,{logo_base64}" width="55"/>'
        except Exception:
            pass

    bloco_assinatura = ""
    if tem_certificado:
        medico_nome = f"{'Dra.' if str(medico.first_name).endswith('a') else 'Dr.'} {medico.get_full_name() or medico.username}"
        crm = f" - CRM {medico.crm}" if medico.crm else ""
        
        bloco_assinatura = f"""
        <table align="center" width="85%" border="0" cellpadding="0" cellspacing="0">
            <tr>
                <td width="20%" align="right" valign="middle">{logo_icp_tag}</td>
                <td width="60%" align="center" valign="middle" style="line-height: 1.2; padding-left: 15px; padding-right: 15px;">
                    <div style="font-size: 8pt; font-weight: bold; color: #000;">Assinado digitalmente por {medico_nome}{crm}</div>
                    <div style="font-size: 7.5pt; color: #333; margin-top: 1px;">Data e hora: {assinatura_data}</div>
                    <div style="font-size: 7pt; color: #555; margin-top: 1px;">Assinatura eletrônica em conformidade com a MP 2.200-2/2001 (ICP-Brasil).</div>
                    <div style="font-size: 7pt; color: #555; margin-top: 1px;">*Para validar, acesse validar.iti.gov.br ou aponte a câmera.</div>
                </td>
                <td width="20%" align="left" valign="middle">{qr_code_tag}</td>
            </tr>
        </table>
        """
    else:
        bloco_assinatura = f"""
        <div style="text-align: center;">
            <div style="border-top: 1px solid #999; width: 60%; margin: 0 auto; padding-top: 5px;"></div>
            <div style="font-size: 10pt; font-weight: bold; color: #333;">{medico.get_full_name() or medico.username}</div>
            <div style="font-size: 9pt; color: #666;">CRM: {medico.crm if medico.crm else 'Não informado'}</div>
        </div>
        """

    html_corpo = formatar_texto_laudo_para_html(texto_bruto, titulo_do_laudo, bloco_assinatura)

    bloco_imagens = ""
    if imagens:
        bloco_imagens = """
        <pdf:nexttemplate name="fotos" />
        <pdf:nextpage />
        <div style="color: #2E7D32; font-size: 11pt; font-weight: bold; margin-bottom: 10px; text-transform: uppercase;">DOCUMENTAÇÃO FOTOGRÁFICA</div>
        <table width="100%" border="0" cellpadding="5" cellspacing="5">
        """
        for i in range(0, len(imagens), 2):
            img1 = imagens[i]
            img2 = imagens[i+1] if i+1 < len(imagens) else ""
            bloco_imagens += "<tr>"
            bloco_imagens += f'<td width="50%" align="center"><img src="{img1}" style="max-height: 160px;"/></td>'
            if img2:
                bloco_imagens += f'<td width="50%" align="center"><img src="{img2}" style="max-height: 160px;"/></td>'
            else:
                bloco_imagens += '<td width="50%"></td>'
            bloco_imagens += "</tr>"
        bloco_imagens += "</table>"

    html_final = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: a4;
                margin-top: 6.0cm; 
                margin-bottom: 2.0cm; 
                margin-left: 1.5cm;
                margin-right: 1.5cm;
                
                @frame header_info {{
                    -pdf-frame-content: header_content;
                    left: 11.2cm; 
                    right: 1.5cm;
                    top: 1.5cm;  
                    height: 3.5cm;
                }}
            }}
            
            @page fotos {{
                size: a4;
                margin-top: 6.0cm; 
                margin-bottom: 1.5cm; 
                margin-left: 1.5cm;
                margin-right: 1.5cm;
                
                @frame header_info {{
                    -pdf-frame-content: header_content;
                    left: 11.2cm; 
                    right: 1.5cm;
                    top: 1.5cm;  
                    height: 3.5cm;
                }}
            }}
            
            body {{ font-family: "Helvetica", sans-serif; font-size: 10pt; color: #333; line-height: 1.15; }}
            .header-text {{ font-family: "Helvetica", sans-serif; font-size: 10pt; color: #1C2E4A; line-height: 1.6; }}
            .titulo-exame {{ text-align: center; color: #1C2E4A; font-size: 12pt; font-weight: bold; margin-bottom: 20px; text-transform: uppercase; }}
            .corpo-laudo {{ text-align: justify; font-size: 10pt; }}
        </style>
    </head>
    <body>
        <div id="header_content">
            <div class="header-text">
                <div><span style="font-weight: bold;">PACIENTE:</span> {paciente.nome_completo.upper() if paciente else 'NÃO INFORMADO'}</div>
                <div><span style="font-weight: bold;">NASC.:</span> {paciente.data_nascimento.strftime('%d/%m/%Y') if paciente and paciente.data_nascimento else 'N/A'} &nbsp;&nbsp;|&nbsp;&nbsp; <span style="font-weight: bold;">IDADE:</span> {idade_formatada}</div>
                <div><span style="font-weight: bold;">SEXO:</span> {'MASCULINO' if paciente and paciente.genero == 'M' else 'FEMININO'} &nbsp;&nbsp;|&nbsp;&nbsp; <span style="font-weight: bold;">DATA:</span> {data_formatada}</div>
                <div><span style="font-weight: bold;">SOLICITANTE:</span> {medico_solicitante}</div>
            </div>
        </div>
        
        <div class="titulo-exame">
            {titulo_do_laudo}
        </div>
        
        <div class="corpo-laudo">
            {html_corpo}
        </div>
        
        {bloco_imagens}
    </body>
    </html>
    """

    try:
        result = BytesIO()
        pdf = pisa.pisaDocument(BytesIO(html_final.encode("UTF-8")), result)
        if not pdf.err: return result.getvalue()
        else: raise Exception("O gerador xhtml2pdf reportou erro interno.")
    except Exception as e:
        print("\n\n" + "="*50)
        print("🚨 FALHA NO HTML DO LAUDO:")
        print(html_final)
        print("="*50 + "\n\n")
        raise e
        
    return None