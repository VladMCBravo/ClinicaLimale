import os
import re
import base64
import qrcode
from io import BytesIO
from django.conf import settings
from xhtml2pdf import pisa
from datetime import datetime

def gerar_pdf_laudo_backend_v2(context):
    laudo = context.get('laudo')
    paciente = context.get('paciente')
    medico = context.get('medico')
    idade_formatada = context.get('idade_formatada', '')
    data_exame = context.get('data_exame')
    imagens = context.get('imagens', [])
    
    html_corpo = laudo.texto_laudo if laudo else ''
    
    html_corpo = re.sub(r'<div class="laudo-header-area".*?<!-- FIM_HEADER_V2 -->', '', html_corpo, flags=re.DOTALL)
    
    dados_estruturados = laudo.dados_estruturados if laudo and isinstance(laudo.dados_estruturados, dict) else {}
    medico_solicitante = dados_estruturados.get('medicoSolicitante', 'NÃO INFORMADO').upper()
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
            bloco_imagens += (f'<td width="50%" align="center"><img src="{img2}" style="max-height: 160px;"/></td>'
                               if img2 else '<td width="50%"></td>')
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

                /* Quadro FIXO da assinatura: sempre na mesma posição da folha,
                   perto do rodapé da máscara — não depende do tamanho do texto.
                   AJUSTE 'top' olhando o Receituario_v2.jpg até encaixar
                   exatamente onde começa o rodapé impresso. */
                @frame signature_info {{
                    -pdf-frame-content: signature_content;
                    left: 1.5cm;
                    right: 1.5cm;
                    top: 25.3cm;
                    height: 3.4cm;
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
            .corpo-laudo {{ text-align: justify; font-size: 10pt; }}
        </style>
    </head>
    <body>
        <div id="header_content">
            <div class="header-text">
                <div><span style="font-weight: bold;">PACIENTE:</span> {paciente.nome_completo.upper() if paciente else 'NÃO INFORMADO'}</div>
                <div><span style="font-weight: bold;">NASC.:</span> {paciente.data_nascimento.strftime('%d/%m/%Y') if paciente and paciente.data_nascimento else 'N/A'} &nbsp;&nbsp;|&nbsp;&nbsp; <span style="font-weight: bold;">IDADE:</span> {idade_formatada}</div>
                <div><span style="font-weight: bold;">SEXO:</span> {(paciente.genero.upper() if paciente.genero else 'NÃO INFORMADO') if paciente else 'NÃO INFORMADO'} &nbsp;&nbsp;|&nbsp;&nbsp; <span style="font-weight: bold;">DATA:</span> {data_formatada}</div>
                <div><span style="font-weight: bold;">SOLICITANTE:</span> {medico_solicitante}</div>
            </div>
        </div>

        <!-- Puxado pelo @frame signature_info: fica sempre nessa posição
             fixa da página, independente de onde o texto termina. -->
        <div id="signature_content">
            {bloco_assinatura}
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
        else: raise Exception("O gerador xhtml2pdf reportou erro interno na V2.")
    except Exception as e:
        raise e
        
    return None