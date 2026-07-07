import re
import os
import io
import base64
import qrcode
from io import BytesIO
from django.conf import settings
from django.template.loader import render_to_string
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
                html_out.append("<br/>") # Substitui o fechamento da tabela
                em_tabela = False
            modo = 'NORMAL'

        if "BIOMETRIA FETAL" in linha_limpa or "TABELA DE MEDIDAS" in linha_limpa:
            modo = 'TABELA'
            em_tabela = True
            titulo_tabela = linha.replace(":", "").strip()
            
            # Tabela limpa transformada em divs para evitar crash
            html_out.append(f"""
            <div style="color: #2E7D32; font-size: 14pt; font-weight: bold; border-bottom: 1px solid #E0E0E0; margin-top: 8px; margin-bottom: 6px;">{titulo_tabela}</div>
            """)
            continue

        if modo == 'TABELA':
            tem_dois_pontos = ':' in linha
            label_curta = tem_dois_pontos and len(linha.split(':', 1)[0]) <= 45

            if tem_dois_pontos and label_curta:
                partes = linha.split(':', 1)
                label = partes[0].strip()
                valor = partes[1].strip()
                
                html_out.append(f'<div style="margin-bottom: 3px; font-size: 12pt;"><span style="color: #333; font-weight: bold;">{label}:</span> <span style="margin-left: 5px;">{valor}</span></div>')
                continue 
            else:
                html_out.append("<br/>")
                em_tabela = False
                modo = 'NORMAL'
        
        if modo == 'NORMAL':
            if is_titulo:
                html_out.append(f'<div style="color: #2E7D32; font-weight: bold; font-size: 14pt; margin-top: 8px; margin-bottom: 2px; border-bottom: 1px solid #eee;">{linha.replace(":", "")}</div>')
            else:
                frases_rodape = ["FAVOR TRAZER", "A IMAGEM DIAGN", "NEM TODAS AS ALTERA", "A MEDIDA DA TRANSLUC", "ESTE EXAME NÃO SUBSTITUI"]
                
                if any(linha_limpa.startswith(f) for f in frases_rodape):
                    if not modo_rodape:
                        html_out.append("<div style='height: 12px;'></div>") 
                    modo_rodape = True
                
                if modo_rodape:
                    html_out.append(f'<div style="margin-bottom: 1px; font-size: 10pt; color: #666; text-align: justify; line-height: 1.15;">{linha}</div>')
                elif '\t' in linha_original:
                    linha_formatada = linha_original.replace('\t', '&nbsp;&nbsp;&nbsp;&nbsp;')
                    html_out.append(f'<div style="margin-bottom: 1px; font-family: monospace; font-size: 12pt; color: #333;">{linha_formatada.strip()}</div>')
                else:
                    if linha.startswith('-'):
                        html_out.append(f'<div style="margin-bottom: 1px; padding-left: 10px;">{linha}</div>')
                    else:
                        html_out.append(f'<div style="margin-bottom: 1px;">{linha}</div>')

    return "".join(html_out)


def gerar_pdf_laudo_backend(context):
    """
    Renderiza o laudo para PDF usando xhtml2pdf sem o uso de @frames perigosos.
    O fluxo é sequencial e blindado contra erros 500 de frame rendering.
    """
    
    # 1. PEGA OS DADOS
    laudo = context.get('laudo')
    paciente = context.get('paciente')
    medico = context.get('medico')
    idade_formatada = context.get('idade_formatada', '')
    data_exame = context.get('data_exame')
    imagens = context.get('imagens', [])
    texto_bruto = laudo.texto_laudo if laudo else ''
    
    html_corpo = formatar_texto_laudo_para_html(texto_bruto)
    data_formatada = data_exame.strftime("%d/%m/%Y") if data_exame else ""

    # 2. GERA AS IMAGENS DA ASSINATURA ICP-BRASIL
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
            qr_code_tag = f'<img src="data:image/png;base64,{qr_base64}" width="65" height="65"/>'

            caminho_logo = os.path.join(settings.BASE_DIR, 'static', 'images', 'logo_icp_brasil.png')
            if os.path.exists(caminho_logo):
                with open(caminho_logo, "rb") as f:
                    logo_base64 = base64.b64encode(f.read()).decode('utf-8')
                    logo_icp_tag = f'<img src="data:image/png;base64,{logo_base64}" width="65"/>'
        except Exception as e:
            print(f"DEBUG: Erro ao gerar selos visuais: {e}")

    # 3. BLOCO DA ASSINATURA ELETRÔNICA
    # Transformado em DIV flex-like para o xhtml2pdf digerir fácil sem quebrar a página
    bloco_assinatura = ""
    if tem_certificado:
        medico_nome = f"{'Dra.' if str(medico.first_name).endswith('a') else 'Dr.'} {medico.get_full_name() or medico.username}"
        crm = f" - CRM {medico.crm}" if medico.crm else ""
        
        bloco_assinatura = f"""
        <div style="margin-top: 40px; padding-top: 15px; border-top: 1px solid #ccc;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                    <td width="20%" align="left" valign="middle">
                        {logo_icp_tag}
                    </td>
                    <td width="60%" align="center" valign="middle" style="line-height: 1.1;">
                        <div style="font-size: 9pt; font-weight: bold; color: #000;">Assinado digitalmente por {medico_nome}{crm}</div>
                        <div style="font-size: 8pt; color: #333; margin-top: 2px;">Data e hora: {assinatura_data}</div>
                        <div style="font-size: 7.5pt; color: #555; margin-top: 2px;">Assinatura eletrônica em conformidade com a MP 2.200-2/2001 (ICP-Brasil).</div>
                        <div style="font-size: 7.5pt; color: #555; margin-top: 2px;">*Para validar, acesse validar.iti.gov.br ou aponte a câmera.</div>
                    </td>
                    <td width="20%" align="right" valign="middle">
                        {qr_code_tag}
                    </td>
                </tr>
            </table>
        </div>
        """
    else:
        bloco_assinatura = f"""
        <div style="margin-top: 60px; text-align: center;">
            <div style="border-top: 1px solid #999; width: 50%; margin: 0 auto; padding-top: 5px;"></div>
            <div style="font-size: 11pt; font-weight: bold; color: #333;">{medico.get_full_name() or medico.username}</div>
            <div style="font-size: 10pt; color: #666;">CRM: {medico.crm if medico.crm else 'Não informado'}</div>
        </div>
        """

    # 4. GALERIA DE IMAGENS
    bloco_imagens = ""
    if imagens:
        bloco_imagens = """
        <pdf:nextpage />
        <div style="color: #2E7D32; font-size: 12pt; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 20px; margin-bottom: 15px;">DOCUMENTAÇÃO FOTOGRÁFICA</div>
        <table width="100%" border="0" cellpadding="5" cellspacing="5">
        """
        for i in range(0, len(imagens), 2):
            img1 = imagens[i]
            img2 = imagens[i+1] if i+1 < len(imagens) else ""
            
            bloco_imagens += "<tr>"
            bloco_imagens += f'<td width="50%" align="center"><img src="{img1}" style="max-height: 180px;"/></td>'
            if img2:
                bloco_imagens += f'<td width="50%" align="center"><img src="{img2}" style="max-height: 180px;"/></td>'
            else:
                bloco_imagens += '<td width="50%"></td>'
            bloco_imagens += "</tr>"
            
        bloco_imagens += "</table>"

    # 5. MONTA O HTML FINAL MESTRE
    # Este HTML não tem o @frame, o que impede totalmente o Erro 500
    html_final = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: a4;
                margin-top: 4.5cm;
                margin-bottom: 2.0cm;
                margin-left: 1.5cm;
                margin-right: 1.5cm;
            }}
            body {{ font-family: "Helvetica", sans-serif; font-size: 12pt; color: #333; line-height: 1.15; }}
            .header-box {{ margin-left: 8.5cm; margin-bottom: 1.5cm; font-size: 9pt; color: #1C2E4A; line-height: 1.4; border-bottom: 1px solid #E67E22; padding-bottom: 5px; }}
            .titulo-exame {{ text-align: center; color: #1C2E4A; font-size: 14pt; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; }}
            .corpo-laudo {{ text-align: justify; font-size: 12pt; }}
        </style>
    </head>
    <body>
        <div class="header-box">
            <div><strong>PACIENTE:</strong> &nbsp;{paciente.nome_completo.upper() if paciente else 'NÃO INFORMADO'}</div>
            <div>
                <strong>NASC.:</strong> &nbsp;{paciente.data_nascimento.strftime('%d/%m/%Y') if paciente and paciente.data_nascimento else 'N/A'} &nbsp;&nbsp;|&nbsp;&nbsp; 
                <strong>IDADE:</strong> &nbsp;{idade_formatada}
            </div>
            <div><strong>SEXO:</strong> &nbsp;{'MASCULINO' if paciente and paciente.genero == 'M' else 'FEMININO'}</div>
            <div><strong>DATA:</strong> &nbsp;{data_formatada}</div>
        </div>
        
        <div class="titulo-exame">
            {laudo.titulo_exame if laudo else 'RELATÓRIO MÉDICO'}
        </div>
        
        <div class="corpo-laudo">
            {html_corpo}
        </div>
        
        {bloco_assinatura}
        
        {bloco_imagens}
    </body>
    </html>
    """

    try:
        result = BytesIO()
        pdf = pisa.pisaDocument(BytesIO(html_final.encode("UTF-8")), result)
        
        if not pdf.err:
            return result.getvalue()
        else:
            raise Exception("O gerador xhtml2pdf reportou erro.")
            
    except Exception as e:
        print("\n\n" + "="*50)
        print("🚨 FALHA CRÍTICA NO XHTML2PDF - INSPECIONE O HTML ABAIXO:")
        print("="*50)
        print(html_final)
        print("="*50 + "\n\n")
        raise e
        
    return None