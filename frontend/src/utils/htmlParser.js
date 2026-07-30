// src/utils/htmlParser.js

export const parseLaudoToHtml = (textoRaw) => {
    if (!textoRaw) return '';
    
    // 🛑 TRAVA DE SEGURANÇA:
    // Se o texto já tiver tags HTML estruturais (porque o médico editou e salvou no TinyMCE),
    // nós não re-processamos para não quebrar a formatação avançada dele.
    if (textoRaw.includes('<p>') || textoRaw.includes('<table>') || textoRaw.includes('<h4')) {
        return textoRaw;
    }

    const linhas = textoRaw.split('\n');
    
    // As mesmas palavras-chave do seu gerador antigo!
    const titulosConhecidos = [
        'CONCLUSÃO', 'IMPRESSÃO DIAGNÓSTICA', 'OPINIÃO', 'ANÁLISE MORFOLÓGICA', 
        'RASTREAMENTO MORFOLÓGICO', 'BIOMETRIA FETAL', 'ÍNDICES E ESTIMATIVAS', 
        'AVALIAÇÃO COMPLEMENTAR', 'ANEXOS'
    ];

    let html = '';
    let inTable = false;

    const closeTable = () => {
        if (inTable) {
            html += '</tbody></table>\n';
            inTable = false;
        }
    };

    linhas.forEach(linhaOriginal => {
        const linha = linhaOriginal.trim();
        
        if (linha === '') {
            if (!inTable) html += '<br/>\n';
            return;
        }

        const cleanLine = linha.toUpperCase().replace(/^[-*\s]+/, '').replace(/:/g, '').trim();

        // 1. DETECTAR CABEÇALHOS GLOBAIS (Ex: CONCLUSÃO)
        const isHeader = titulosConhecidos.some(t => cleanLine.startsWith(t));
        if (isHeader) {
            closeTable();
            // Aplica o seu verde clássico (#2E7D32) com uma linha sutil embaixo
            html += `<h4 style="color: #2E7D32; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 20px; margin-bottom: 8px; font-size: 15px; text-transform: uppercase;">${linhaOriginal}</h4>\n`;
            
            // Se for tabela de medidas, já abre a estrutura HTML da tabela
            if (cleanLine === 'BIOMETRIA FETAL' || cleanLine === 'ÍNDICES E ESTIMATIVAS') {
                html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;"><tbody>\n`;
                inTable = true;
            }
            return;
        }

        // 2. MODO TABELA (Gera as grades perfeitamente alinhadas)
        if (inTable) {
            let isNote = linha.toUpperCase().startsWith('NOTA:');
            if (isNote) {
                html += `<tr><td colspan="2" style="border: 1px dotted #bbb; padding: 6px 8px; color: #555; font-size: 12px; font-style: italic;">${linha}</td></tr>\n`;
                return;
            }

            let label = linha, value = '';
            if (linha.includes(':')) {
                const parts = linha.split(':');
                label = parts[0].trim() + ':';
                value = parts.slice(1).join(':').trim();
            } else if (linha.includes('...')) {
                const parts = linha.split(/\.{2,}/);
                label = parts[0].trim();
                value = parts[1] ? parts[1].trim() : '';
            } else {
                const match = linha.match(/^(.*?)\s+([\d,]+\s*[a-zA-Z%]+.*)$/);
                if (match) {
                    label = match[1].trim();
                    value = match[2].trim();
                }
            }

            if (value) {
                html += `<tr>
                            <td style="border: 1px dotted #bbb; padding: 6px 8px; text-align: left;">${label}</td>
                            <td style="border: 1px dotted #bbb; padding: 6px 8px; text-align: right; font-weight: bold;">${value}</td>
                         </tr>\n`;
            } else {
                html += `<tr><td colspan="2" style="border: 1px dotted #bbb; padding: 6px 8px; text-align: left;">${label}</td></tr>\n`;
            }
            return;
        }

        // 3. TEXTO NORMAL (Gera os Parágrafos)
        // O Truque de UX: Se a linha for curta e terminar com ":", deixa em Negrito e Azul Marinho! (Ex: FÍGADO:)
        if (linha.endsWith(':') && linha.length < 60) {
            html += `<p style="margin: 0 0 6px 0; font-size: 14px; color: #1C2E4A;"><strong>${linha}</strong></p>\n`;
        } else {
            html += `<p style="margin: 0 0 6px 0; font-size: 14px; color: #333;">${linha}</p>\n`;
        }
    });

    closeTable();
    return html;
};