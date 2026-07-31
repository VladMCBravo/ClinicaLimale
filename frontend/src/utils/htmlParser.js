// src/utils/htmlParser.js

// Converte o texto bruto do formulário para HTML rico
export const parseLaudoToHtml = (textoRaw) => {
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

        // TEXTO NORMAL (Tamanho 10pt)
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

// =========================================================================
// GERA O CONTEÚDO COMPLETO COM CABEÇALHO (MÉTODO ÚNICO PARA PREVIEW E MODAL)
// =========================================================================
export const gerarHtmlCompletoLaudo = ({
    paciente, dadosEstruturados, tituloExame, tipoExame, textoLaudo, dataExame
}) => {
    if (textoLaudo && textoLaudo.includes('id="header_content_v2"')) {
        return textoLaudo;
    }

    const calcularIdadeStr = (dataNasc) => {
        if (!dataNasc) return '';
        const nascimento = new Date(dataNasc);
        if (isNaN(nascimento.getTime())) return dataNasc;
        const hoje = new Date();
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const m = hoje.getMonth() - nascimento.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
        return `${idade} ANOS`;
    };

    // VAZIOS FORMATADOS COM LINHAS QUANDO NÃO SELECIONADO
    const nomePct = paciente?.nome_completo ? paciente.nome_completo.toUpperCase() : '______________________________';
    const idadePct = calcularIdadeStr(dadosEstruturados?.dataNascimento || paciente?.data_nascimento) || '______';
    
    let dataNascPct = '__________';
    if (dadosEstruturados?.dataNascimento) {
        dataNascPct = dadosEstruturados.dataNascimento.split('-').reverse().join('/');
    } else if (paciente?.data_nascimento) {
        dataNascPct = paciente.data_nascimento.split('-').reverse().join('/');
    }

    const sexoPct = (dadosEstruturados?.sexo || paciente?.genero || paciente?.sexo || '______').toUpperCase();
    
    // REQUISITO: Se não constar médico solicitante, exibe obrigatoriamente "NÃO INFORMADO"
    const solicitante = (dadosEstruturados?.medicoSolicitante && dadosEstruturados.medicoSolicitante.trim() !== '')
        ? dadosEstruturados.medicoSolicitante.toUpperCase()
        : 'NÃO INFORMADO';
    
    const titulo = (tituloExame || `ULTRASSONOGRAFIA DE ${tipoExame || 'EXAME'}`).toUpperCase();
    const dataFmt = dataExame ? dataExame.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');

    const corpoHtml = parseLaudoToHtml(textoLaudo);

    return `
<div id="header_content_v2" contenteditable="false" style="font-family: Helvetica, Arial, sans-serif; font-size: 13px; color: #1C2E4A; line-height: 1.6; margin-left: 9.7cm; margin-top: -4.5cm; margin-bottom: 2cm;">
    <div><span style="font-weight: bold;">PACIENTE:</span> ${nomePct}</div>
    <div><span style="font-weight: bold;">NASC.:</span> ${dataNascPct} &nbsp;&nbsp;|&nbsp;&nbsp; <span style="font-weight: bold;">IDADE:</span> ${idadePct}</div>
    <div><span style="font-weight: bold;">SEXO:</span> ${sexoPct} &nbsp;&nbsp;|&nbsp;&nbsp; <span style="font-weight: bold;">DATA:</span> ${dataFmt}</div>
    <div><span style="font-weight: bold;">SOLICITANTE:</span> ${solicitante}</div>
</div>

<h3 style="text-align: center; color: #1C2E4A; font-size: 12pt; font-weight: bold; margin-top: 0; margin-bottom: 20px; text-transform: uppercase;">
    ${titulo}
</h3>

<div class="corpo-laudo-a4" style="text-align: justify; font-size: 10pt; color: #333;">
    ${corpoHtml}
</div>
    `.trim();
};