// src/utils/htmlParser.js

export const parseLaudoToHtml = (textoRaw, tituloExame) => { 
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

    // Apaga o título duplicado do texto bruto, caso exista
    const tituloComparacao = tituloExame ? tituloExame.trim().toUpperCase() : '';
    for (let i = 0; i < Math.min(4, linhas.length); i++) {
        let linhaAtual = linhas[i].trim().toUpperCase();
        if (linhaAtual && (linhaAtual === tituloComparacao || linhaAtual.includes("ULTRASSONOGRAFIA") || linhaAtual.includes("ECOCARDIOGRAMA"))) {
            linhas[i] = ""; 
        }
    }

    linhas.forEach(linhaOriginal => {
        const linha = linhaOriginal.trim();
        if (!linha) {
            if (!emTabela) html += '<p style="margin: 0; line-height: 2px;">&nbsp;</p>\n';
            return;
        }

        const linhaLimpa = linha.toUpperCase().replace(/^[-=*\s]+/, '').replace(/:/g, '').trim();

        // FORMATAÇÃO DOS TÍTULOS DAS SEÇÕES (Verde, Negrito)
        // Reduzido a margem superior de 15px para 10px para colar mais o texto e economizar espaço
        if (titulosPrincipais.some(t => linhaLimpa.startsWith(t))) {
            fecharTabela();
            const tituloLimpo = linha.replace(":", "").trim();
            html += `<h4 style="color: #2E7D32; font-weight: bold; font-size: 11pt; margin-top: 10px; margin-bottom: 3px; border-bottom: 1px solid #E0E0E0; padding-bottom: 2px; text-transform: uppercase;">${tituloLimpo}</h4>\n`;
            
            if (["BIOMETRIA", "TABELA", "DOPPLER", "ÍNDICES", "MEDIDAS"].some(x => linhaLimpa.includes(x))) {
                html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10pt;"><tbody>\n`;
                emTabela = true;
            }
            return;
        }

        if (emTabela) {
            if (linha.toUpperCase().startsWith('NOTA:')) {
                html += `<tr><td colspan="2" style="border: 1px dotted #bbb; padding: 3px; color: #555; font-size: 9pt; font-style: italic;">${linha}</td></tr>\n`;
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
                            <td style="border: 1px dotted #bbb; padding: 3px; text-align: left; width: 60%; color: #555;">${label}</td>
                            <td style="border: 1px dotted #bbb; padding: 3px; text-align: right; font-weight: bold; color: #111; width: 40%;">${value}</td>
                         </tr>\n`;
            } else {
                html += `<tr><td colspan="2" style="border: 1px dotted #bbb; padding: 3px; text-align: left; color: #333;">${label}</td></tr>\n`;
            }
            return;
        }

        // TEXTO NORMAL
        // Margens de parágrafo reduzidas (de 3px para 2px) para compactar o laudo
        if (linhaOriginal.includes('\t')) {
            const linhaFmt = linhaOriginal.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
            html += `<p style="margin: 0 0 2px 0; font-family: monospace; font-size: 10pt; color: #333;">${linhaFmt.trim()}</p>\n`;
        } else if (linha.startsWith('-')) {
            html += `<p style="margin: 0 0 2px 0; padding-left: 15px; font-size: 10pt; text-align: justify; color: #333;">${linha}</p>\n`;
        } else if (linha.includes(': ')) {
            const partes = linha.split(': ');
            const prefixo = partes[0].trim();
            const resto = partes.slice(1).join(': ').trim();
            if (prefixo.length <= 45) {
                html += `<p style="margin: 0 0 2px 0; font-size: 10pt; text-align: justify; line-height: 1.2; color: #333;"><span style="font-weight: bold; color: #1C2E4A;">${prefixo}:</span> ${resto}</p>\n`;
            } else {
                html += `<p style="margin: 0 0 2px 0; font-size: 10pt; text-align: justify; line-height: 1.2; color: #333;">${linha}</p>\n`;
            }
        } else {
            html += `<p style="margin: 0 0 2px 0; font-size: 10pt; text-align: justify; line-height: 1.2; color: #333;">${linha}</p>\n`;
        }
    });

    fecharTabela();
    return html;
};

// GERA O CONTEÚDO PURO COM A MÁSCARA HTML DO CABEÇALHO PARA O EDITOR
export const gerarConteudoParaEditor = ({
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

    const nomePct = paciente?.nome_completo ? paciente.nome_completo.toUpperCase() : '______________________________';
    const idadePct = calcularIdadeStr(dadosEstruturados?.dataNascimento || paciente?.data_nascimento) || '______';
    
    let dataNascPct = '__________';
    if (dadosEstruturados?.dataNascimento) {
        dataNascPct = dadosEstruturados.dataNascimento.split('-').reverse().join('/');
    } else if (paciente?.data_nascimento) {
        dataNascPct = paciente.data_nascimento.split('-').reverse().join('/');
    }

    const sexoPct = (dadosEstruturados?.sexo || paciente?.genero || paciente?.sexo || '______').toUpperCase();
    const solicitanteRaw = dadosEstruturados?.medicoSolicitante || '';
    const solicitante = (solicitanteRaw && solicitanteRaw.trim() !== '') ? solicitanteRaw.toUpperCase() : 'NÃO INFORMADO';
    
    const titulo = (tituloExame || `ULTRASSONOGRAFIA DE ${tipoExame || 'EXAME'}`).toUpperCase();
    const dataFmt = dataExame ? dataExame.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');

    const corpoHtml = parseLaudoToHtml(textoLaudo, titulo);

    // MUDANÇA CRUCIAL:
    // Em vez de 'float', voltamos a usar 'position: absolute' (que o xhtml2pdf adora), 
    // mas amarramos ele rigidamente às margens do papel, desvinculando-o do fluxo do texto
    // que vem abaixo.
    return `
<div id="header_content_v2" contenteditable="false" style="position: absolute; top: 1.2cm; right: 1.5cm; width: 8.5cm; font-family: Helvetica, Arial, sans-serif; font-size: 10pt; color: #1C2E4A; line-height: 1.6; text-align: left; z-index: 10; background: transparent;">
    <div><span style="font-weight: bold;">PACIENTE:</span> ${nomePct}</div>
    <div><span style="font-weight: bold;">NASC.:</span> ${dataNascPct} &nbsp;&nbsp;|&nbsp;&nbsp; <span style="font-weight: bold;">IDADE:</span> ${idadePct}</div>
    <div><span style="font-weight: bold;">SEXO:</span> ${sexoPct}</div>
    <div><span style="font-weight: bold;">DATA:</span> ${dataFmt}</div>
    <div><span style="font-weight: bold;">SOLICITANTE:</span> ${solicitante}</div>
</div>
<!-- FIM_HEADER_V2 -->

<!-- Como o cabeçalho acima é 'absolute', ele "não existe" no fluxo. -->
<!-- Não precisamos de margens negativas bizarras. Apenas encostamos o título no topo. -->
<h3 style="text-align: center; color: #1C2E4A; font-size: 11pt; font-weight: bold; margin-top: 0; margin-bottom: 15px; text-transform: uppercase;">
    ${titulo}
</h3>

<div class="corpo-laudo-v2" style="text-align: justify; font-size: 10pt; color: #333;">
    ${corpoHtml}
</div>
    `.trim();
};