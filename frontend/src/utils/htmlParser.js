// src/utils/htmlParser.js

// 1. O Motor Exato do Backend (V1) Traduzido para JS
export const parseLaudoToHtml = (textoRaw, tituloExame, tipoExame) => {
    if (!textoRaw) return '';
    
    // Se o texto já foi editado no TinyMCE e possui tags HTML, retorna como está
    if (textoRaw.includes('<p>') || textoRaw.includes('<table>') || textoRaw.includes('<h4')) {
        return textoRaw;
    }

    const linhas = textoRaw.replace(/\(Ver PDF\)/g, "").replace(/===/g, "").split('\n');
    const titulosPrincipais = [
        'CONCLUSÃO', 'IMPRESSÃO DIAGNÓSTICA', 'OPINIÃO', 'ANÁLISE MORFOLÓGICA', 
        'RASTREAMENTO MORFOLÓGICO', 'BIOMETRIA FETAL', 'ÍNDICES E ESTIMATIVAS', 
        'AVALIAÇÃO COMPLEMENTAR', 'ANEXOS'
    ];

    let html = '';
    let emTabela = false;

    const fecharTabela = () => {
        if (emTabela) {
            html += '</tbody></table>\n';
            emTabela = false;
        }
    };

    // INSERE O TÍTULO CENTRALIZADO APENAS 1 VEZ
    const titulo = (tituloExame || `ULTRASSONOGRAFIA DE ${tipoExame || 'EXAME'}`).toUpperCase();
    html += `<h3 style="text-align: center; color: #1C2E4A; font-size: 12pt; font-weight: bold; margin-top: 0; margin-bottom: 20px; text-transform: uppercase;">${titulo}</h3>\n`;

    linhas.forEach(linhaOriginal => {
        const linha = linhaOriginal.trim();
        if (!linha) {
            if (!emTabela) html += '<div style="line-height: 4px;">&nbsp;</div>\n';
            return;
        }

        const linhaLimpa = linha.toUpperCase().replace(/^[-=*\s]+/, '').replace(/:/g, '').trim();

        if (titulosPrincipais.some(t => linhaLimpa.startsWith(t))) {
            fecharTabela();
            const tituloLimpo = linha.replace(":", "").trim();
            html += `<h4 style="color: #2E7D32; font-weight: bold; font-size: 11pt; margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid #E0E0E0; padding-bottom: 2px; text-transform: uppercase;">${tituloLimpo}</h4>\n`;
            
            if (["BIOMETRIA", "TABELA", "DOPPLER", "ÍNDICES", "MEDIDAS"].some(x => linhaLimpa.includes(x))) {
                html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10pt;"><tbody>\n`;
                emTabela = true;
            }
            return;
        }

        if (emTabela) {
            if (linha.toUpperCase().startsWith('NOTA:')) {
                html += `<tr><td colspan="2" style="border: 1px dotted #bbb; padding: 4px; color: #555; font-size: 9pt; font-style: italic;">${linha}</td></tr>\n`;
                return;
            }

            let label = linha, value = '';
            if (linha.includes(':')) {
                const parts = linha.split(':');
                label = parts[0].trim() + ':';
                value = parts.slice(1).join(':').trim();
            } else if (linha.includes('...')) {
                // CORREÇÃO: Faltava o "const" aqui na frente do "parts"
                const parts = linha.split(/\.{2,}/);
                label = parts[0].trim();
                value = parts[1] ? parts[1].trim() : '';
            }

            if (value) {
                html += `<tr>
                            <td style="border: 1px dotted #bbb; padding: 4px; text-align: left; width: 60%; color: #555;">${label}</td>
                            <td style="border: 1px dotted #bbb; padding: 4px; text-align: right; font-weight: bold; color: #111; width: 40%;">${value}</td>
                         </tr>\n`;
            } else {
                html += `<tr><td colspan="2" style="border: 1px dotted #bbb; padding: 4px; text-align: left; color: #333;">${label}</td></tr>\n`;
            }
            return;
        }

        // TEXTO NORMAL
        if (linhaOriginal.includes('\t')) {
            const linhaFmt = linhaOriginal.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
            html += `<div style="margin-bottom: 2px; font-family: monospace; font-size: 10pt; color: #333;">${linhaFmt.trim()}</div>\n`;
        } else if (linha.startsWith('-')) {
            html += `<div style="margin-bottom: 3px; padding-left: 15px; font-size: 10pt; text-align: justify;">${linha}</div>\n`;
        } else if (linha.includes(': ')) {
            const partes = linha.split(': ');
            const prefixo = partes[0].trim();
            const resto = partes.slice(1).join(': ').trim();
            if (prefixo.length <= 45) {
                html += `<div style="margin-bottom: 4px; font-size: 10pt; text-align: justify; line-height: 1.25;"><span style="font-weight: bold; color: #1C2E4A;">${prefixo}:</span> ${resto}</div>\n`;
            } else {
                html += `<div style="margin-bottom: 3px; font-size: 10pt; text-align: justify; line-height: 1.25;">${linha}</div>\n`;
            }
        } else {
            html += `<div style="margin-bottom: 3px; font-size: 10pt; text-align: justify; line-height: 1.25;">${linha}</div>\n`;
        }
    });

    fecharTabela();
    return html;
};