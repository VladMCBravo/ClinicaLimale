import re
import os
import io
import base64
import qrcode
from io import BytesIO
from django.conf import settings
from xhtml2pdf import pisa
from datetime import datetime

def formatar_texto_laudo_para_html(texto_bruto):
    if not texto_bruto:
        return ""

    texto_bruto = texto_bruto.replace("(Ver PDF)", "").replace("===", "").strip()
    linhas = texto_bruto.split('\n')
    html_out = []
    
    modo = 'NORMAL'
    em_tabela = False
    modo_rodape = False

    titulos_principais = [
        'CONCLUSÃO', 'IMPRESSÃO DIAGNÓSTICA', 'OPINIÃO', 'ANÁLISE MORFOLÓGICA', 'ANÁLISE FETAL',
        'AVALIAÇÃO DO COLO UTERINO', 'ESTUDO DOPPLERFLUXOMÉTRICO', 'ESTUDO TRIDIMENSIONAL',
        'AVALIAÇÃO COMPLEMENTAR', 'RASTREAMENTO DE ANEUPLOIDIAS', 'ANEXOS', 
        'COMENTÁRIOS', 'FETO I', 'FETO II', 'FETO III', 'TABELA DE MEDIDAS', 'ÍNDICES E ESTIMATIVAS'
    ]

    for linha in linhas:
        linha_original = linha
        linha = linha.strip()
        
        if not linha:
            if modo == 'NORMAL': html_out.append("<div style='line-height: 4px;'>&nbsp;</div>")
            continue

        linha_limpa = re.sub(r'^[-=*\s]+', '', linha).strip().upper()
        is_titulo = any(linha_limpa.startswith(t) for t in titulos_principais)

        if is_titulo or linha_limpa == "BIOMETRIA FETAL":
            modo_rodape = False 
            if em_tabela:
                html_out.append("<br/>") 
                em_tabela = False
            modo = 'NORMAL'

        if "BIOMETRIA FETAL" in linha_limpa or "TABELA DE MEDIDAS" in linha_limpa:
            modo = 'TABELA'
            em_tabela = True
            titulo_tabela = linha.replace(":", "").strip()
            
            # Fonte 11pt, sem tabelas HTML para proteger contra Erro 500
            html_out.append(f"""
            <div style="color: #2E7D32; font-size: 11pt; font-weight: bold; margin-top: 10px; margin-bottom: 6px;">{titulo_tabela}</div>
            """)
            continue

        if modo == 'TABELA':
            tem_dois_pontos = ':' in linha
            label_curta = tem_dois_pontos and len(linha.split(':', 1)[0]) <= 45

            if tem_dois_pontos and label_curta:
                partes = linha.split(':', 1)
                label = partes[0].strip()
                valor = partes[1].strip()
                
                html_out.append(f'<div style="margin-bottom: 2px; font-size: 10pt;"><span style="color: #333;">{label}:</span> <span style="margin-left: 5px; font-weight: bold;">{valor}</span></div>')
                continue 
            else:
                html_out.append("<br/>")
                em_tabela = False
                modo = 'NORMAL'
        
        if modo == 'NORMAL':
            if is_titulo:
                html_out.append(f'<div style="color: #2E7D32; font-weight: bold; font-size: 11pt; margin-top: 15px; margin-bottom: 5px;">{linha.replace(":", "")}</div>')
            else:
                frases_rodape = ["FAVOR TRAZER", "A IMAGEM DIAGN", "NEM TODAS AS ALTERA", "A MEDIDA DA TRANSLUC", "ESTE EXAME NÃO SUBSTITUI"]
                
                if any(linha_limpa.startswith(f) for f in frases_rodape):
                    if not modo_rodape:
                        html_out.append("<div style='height: 12px;'></div>") 
                    modo_rodape = True
                
                if modo_rodape:
                    html_out.append(f'<div style="margin-bottom: 1px; font-size: 8pt; color: #555; text-align: justify; line-height: 1.1;">{linha}</div>')
                elif '\t' in linha_original:
                    linha_formatada = linha_original.replace('\t', '&nbsp;&nbsp;&nbsp;&nbsp;')
                    html_out.append(f'<div style="margin-bottom: 2px; font-family: monospace; font-size: 10pt; color: #333;">{linha_formatada.strip()}</div>')
                else:
                    if linha.startswith('-'):
                        html_out.append(f'<div style="margin-bottom: 2px; padding-left: 10px; font-size: 10pt;">{linha}</div>')
                    else:
                        html_out.append(f'<div style="margin-bottom: 2px; font-size: 10pt; text-align: justify; line-height: 1.1;">{linha}</div>')

    return "".join(html_out)


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
    
    html_corpo = formatar_texto_laudo_para_html(texto_bruto)
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
        except Exception as e:
            print(f"DEBUG: Erro ao gerar selos visuais: {e}")

    # ==========================================================
    # ASSINATURA ELETRÔNICA
    # ==========================================================
    bloco_assinatura = ""
    if tem_certificado:
        medico_nome = f"{'Dra.' if str(medico.first_name).endswith('a') else 'Dr.'} {medico.get_full_name() or medico.username}"
        crm = f" - CRM {medico.crm}" if medico.crm else ""
        
        bloco_assinatura = f"""
        <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
                <td width="65" align="left" valign="middle">
                    {logo_icp_tag}
                </td>
                <td align="left" valign="middle" style="line-height: 1.2;">
                    <div style="font-size: 8pt; font-weight: bold; color: #000;">Assinado digitalmente por {medico_nome}{crm}</div>
                    <div style="font-size: 7.5pt; color: #333; margin-top: 1px;">Data e hora: {assinatura_data}</div>
                    <div style="font-size: 7pt; color: #555; margin-top: 1px;">Assinatura eletrônica em conformidade com a MP 2.200-2/2001 (ICP-Brasil).</div>
                    <div style="font-size: 7pt; color: #555; margin-top: 1px;">*Para validar, acesse validar.iti.gov.br ou aponte a câmera.</div>
                </td>
                <td width="65" align="right" valign="middle">
                    {qr_code_tag}
                </td>
            </tr>
        </table>
        """
    else:
        bloco_assinatura = f"""
        <div style="text-align: center;">
            <div style="border-top: 1px solid #999; width: 50%; margin: 0 auto; padding-top: 3px;"></div>
            <div style="font-size: 10pt; font-weight: bold; color: #333;">{medico.get_full_name() or medico.username}</div>
            <div style="font-size: 9pt; color: #666;">CRM: {medico.crm if medico.crm else 'Não informado'}</div>
        </div>
        """

    # ==========================================================
    # IMAGENS (Fotos)
    # ==========================================================
    bloco_imagens = ""
    if imagens:
        # A tag <pdf:nexttemplate> aciona o css '@page fotos' onde não existe a caixa de assinatura!
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

    # ==========================================================
    # MONTAGEM FINAL DO PDF USANDO SEU CSS DE REFERÊNCIA
    # ==========================================================
    html_final = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            /* 1. FOLHA DO LAUDO (Tem cabeçalho E assinatura) */
            @page {{
                size: a4;
                margin-top: 4.5cm; 
                margin-bottom: 4.5cm; 
                margin-left: 1.5cm;
                margin-right: 1.5cm;
                
                @frame header_info {{
                    -pdf-frame-content: header_content;
                    left: 10cm; 
                    right: 1.5cm;
                    top: 1.2cm;  
                    height: 3.0cm;
                }}

                @frame assinatura_footer {{
                    -pdf-frame-content: assinatura_digital;
                    left: 2.0cm; 
                    right: 2.0cm;
                    bottom: 1.0cm; 
                    height: 3.2cm; 
                }}
            }}
            
            /* 2. FOLHAS DE FOTOS (Tem cabeçalho MAS NÃO tem assinatura) */
            @page fotos {{
                size: a4;
                margin-top: 4.5cm; 
                margin-bottom: 1.5cm; /* Mais espaço para as fotos respirarem no rodapé */
                margin-left: 1.5cm;
                margin-right: 1.5cm;
                
                @frame header_info {{
                    -pdf-frame-content: header_content;
                    left: 10cm; 
                    right: 1.5cm;
                    top: 1.2cm;  
                    height: 3.0cm;
                }}
                /* Repare que o frame "assinatura_footer" não existe aqui! */
            }}
            
            body {{ font-family: "Helvetica", sans-serif; font-size: 10pt; color: #333; line-height: 1.15; }}
            .header-text {{ font-family: "Helvetica", sans-serif; font-size: 10pt; color: #1C2E4A; line-height: 1.6; }}
            .titulo-exame {{ text-align: center; color: #1C2E4A; font-size: 12pt; font-weight: bold; margin-bottom: 15px; margin-top: 0px; text-transform: uppercase; }}
            .corpo-laudo {{ text-align: justify; font-size: 10pt; }}
        </style>
    </head>
    <body>
        <div id="header_content">
            <div class="header-text">
                <div><span style="font-weight: bold;">PACIENTE:</span> {paciente.nome_completo.upper() if paciente else 'NÃO INFORMADO'}</div>
                <div><span style="font-weight: bold;">NASC.:</span> {paciente.data_nascimento.strftime('%d/%m/%Y') if paciente and paciente.data_nascimento else 'N/A'} &nbsp;&nbsp;|&nbsp;&nbsp; <span style="font-weight: bold;">IDADE:</span> {idade_formatada}</div>
                <div><span style="font-weight: bold;">SEXO:</span> {'MASCULINO' if paciente and paciente.genero == 'M' else 'FEMININO'}</div>
                <div><span style="font-weight: bold;">SOLICITANTE:</span> {medico_solicitante}</div>
                <div><span style="font-weight: bold;">DATA:</span> {data_formatada}</div>
            </div>
        </div>
        
        <div id="assinatura_digital">
            {bloco_assinatura}
        </div>
        
        <div class="titulo-exame">
            {laudo.titulo_exame if laudo else 'RELATÓRIO MÉDICO'}
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