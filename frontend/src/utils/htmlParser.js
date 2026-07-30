// src/utils/htmlParser.js

// 1. O Motor Exato do Backend (V1) Traduzido para JS
export const parseLaudoToHtml = (textoRaw) => {
    if (!textoRaw) return '';
    
    // Se o médico já editou no TinyMCE, respeitamos o HTML dele!
    if (textoRaw.includes('<div') || textoRaw.includes('<table>') || textoRaw.includes('<h4')) {
        return textoRaw;
    }

    const linhas = textoRaw.replace(/\(Ver PDF\)/g, "").replace(/===/g, "").split('\n');
    
    const titulosPrincipais = [
        'CONCLUSÃO', 'IMPRESSÃO DIAGNÓSTICA', 'OPINIÃO', 'COMENTÁRIOS', 'OBSERVAÇÕES', 'ANEXOS',
        'ANÁLISE MORFOLÓGICA', 'ANÁLISE FETAL', 'RASTREAMENTO MORFOLÓGICO', 'RASTREAMENTO DE ANEUPLOIDIAS',
        'BIOMETRIA FETAL', 'ÍNDICES E ESTIMATIVAS', 'AVALIAÇÃO DO COLO UTERINO', 'ESTUDO TRIDIMENSIONAL',
        'ESTUDO DOPPLERFLUXOMÉTRICO', 'FETO I', 'FETO II', 'FETO III',
        'AVALIAÇÃO PÉLVICA', 'ÚTERO E ANEXOS', 'ÓRGÃOS ABDOMINAIS', 'AVALIAÇÃO ABDOMINAL',
        'SISTEMA CAROTÍDEO', 'ARTÉRIAS CARÓTIDAS', 'SISTEMA VERTEBRAL', 'ARTÉRIAS VERTEBRAIS',
        'MEDIDAS ECOCARDIOGRÁFICAS', 'TABELA DE MEDIDAS', 'ANÁLISE DESCRITIVA', 'AVALIAÇÃO COMPLEMENTAR',
        'DESCRIÇÃO', 'CONDUTA', 'SCORE DE HIDROPSIA'
    ];
    
    const frasesRodape = ["FAVOR TRAZER", "A IMAGEM DIAGN", "NEM TODAS AS ALTERA", "A MEDIDA DA TRANSLUC", "ESTE EXAME NÃO SUBSTITUI"];

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
        const isTitulo = titulosPrincipais.some(t => linhaLimpa.startsWith(t));
        const isRodape = frasesRodape.some(f => linhaLimpa.startsWith(f));

        if (isTitulo) {
            fecharTabela();
            const tituloLimpo = linha.replace(":", "").trim();
            html += `<div style="color: #2E7D32; font-weight: bold; font-size: 15px; margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid #E0E0E0; padding-bottom: 2px; text-transform: uppercase;">${tituloLimpo}</div>\n`;
            
            if (["BIOMETRIA", "TABELA", "DOPPLER", "ÍNDICES", "MEDIDAS"].some(x => linhaLimpa.includes(x))) {
                html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 13px;"><tbody>\n`;
                emTabela = true;
            }
            return;
        }

        if (isRodape) {
            fecharTabela();
            html += `<div style="margin-top: 10px; font-size: 11px; color: #555; text-align: justify; line-height: 1.1;">${linha}</div>\n`;
            return;
        }

        if (emTabela) {
            if (linha.endsWith(':') && linha.length < 45) {
                html += `<tr><td colspan="2" style="font-weight: bold; color: #1C2E4A; padding-top: 10px; padding-bottom: 2px;">${linha}</td></tr>\n`;
            } else if (linha.includes(':')) {
                const partes = linha.split(':');
                const label = partes[0].trim() + ':';
                const valor = partes.slice(1).join(':').trim();
                if (label.length < 45 && valor) {
                    html += `<tr>
                                <td style="width: 40%; color: #555; padding-left: 15px; vertical-align: top;">${label}</td>
                                <td style="width: 60%; font-weight: bold; color: #111; vertical-align: top;">${valor}</td>
                             </tr>\n`;
                } else {
                    html += `<tr><td colspan="2" style="color: #333; padding-left: 15px; vertical-align: top;">${linha}</td></tr>\n`;
                }
            } else {
                html += `<tr><td colspan="2" style="color: #333; padding-left: 15px; vertical-align: top;">${linha}</td></tr>\n`;
            }
            return;
        }

        // TEXTO NORMAL
        if (linhaOriginal.includes('\t')) {
            const linhaFmt = linhaOriginal.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
            html += `<div style="margin-bottom: 2px; font-family: monospace; font-size: 13px; color: #333;">${linhaFmt.trim()}</div>\n`;
        } else if (linha.startsWith('-')) {
            html += `<div style="margin-bottom: 3px; padding-left: 15px; font-size: 13px; text-align: justify;">${linha}</div>\n`;
        } else if (linha.includes(': ')) {
            const partes = linha.split(': ');
            const prefixo = partes[0].trim();
            const resto = partes.slice(1).join(': ').trim();
            if (prefixo.length <= 45) {
                html += `<div style="margin-bottom: 4px; font-size: 13px; text-align: justify; line-height: 1.25;"><span style="font-weight: bold; color: #1C2E4A;">${prefixo}:</span> ${resto}</div>\n`;
            } else {
                html += `<div style="margin-bottom: 3px; font-size: 13px; text-align: justify; line-height: 1.25;">${linha}</div>\n`;
            }
        } else {
            html += `<div style="margin-bottom: 3px; font-size: 13px; text-align: justify; line-height: 1.25;">${linha}</div>\n`;
        }
    });

    fecharTabela();
    return html;
};

// 2. Montador Final da Folha A4
export const gerarHtmlCompletoLaudo = ({
    paciente,
    dadosEstruturados,
    tituloExame,
    tipoExame,
    textoLaudo,
    dataExame
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

    const nomePct = (paciente?.nome_completo || 'NÃO INFORMADO').toUpperCase();
    
    let dataNascPct = 'N/A';
    if (dadosEstruturados?.dataNascimento) {
        dataNascPct = dadosEstruturados.dataNascimento.split('-').reverse().join('/');
    } else if (paciente?.data_nascimento) {
        dataNascPct = paciente.data_nascimento.split('-').reverse().join('/');
    }

    const idadePct = calcularIdadeStr(dadosEstruturados?.dataNascimento || paciente?.data_nascimento);
    const sexoPct = (dadosEstruturados?.sexo || paciente?.genero || paciente?.sexo || 'NÃO INFORMADO').toUpperCase();
    const solicitante = (dadosEstruturados?.medicoSolicitante || 'NÃO INFORMADO').toUpperCase();
    
    const titulo = (tituloExame || `ULTRASSONOGRAFIA DE ${tipoExame || 'EXAME'}`).toUpperCase();
    const dataFmt = dataExame ? dataExame.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');

    const corpoHtml = parseLaudoToHtml(textoLaudo);

    return `
<div id="laudo-a4-wrapper" style="position: relative;">
  
  <div id="header_content_v2" contenteditable="false" style="position: absolute; top: -4.5cm; left: 9.7cm; width: 8.3cm; font-family: Helvetica, Arial, sans-serif; font-size: 13px; color: #1C2E4A; line-height: 1.6;">
      <div><span style="font-weight: bold;">PACIENTE:</span> ${nomePct}</div>
      <div><span style="font-weight: bold;">NASC.:</span> ${dataNascPct} &nbsp;&nbsp;|&nbsp;&nbsp; <span style="font-weight: bold;">IDADE:</span> ${idadePct}</div>
      <div><span style="font-weight: bold;">SEXO:</span> ${sexoPct} &nbsp;&nbsp;|&nbsp;&nbsp; <span style="font-weight: bold;">DATA:</span> ${dataFmt}</div>
      <div><span style="font-weight: bold;">SOLICITANTE:</span> ${solicitante}</div>
  </div>

  <div style="text-align: center; color: #1C2E4A; font-size: 16px; font-weight: bold; margin-top: 0; margin-bottom: 20px; text-transform: uppercase;">
    ${titulo}
  </div>

  <div class="corpo-laudo-a4" style="text-align: justify; font-size: 13px; color: #333;">
    ${corpoHtml}
  </div>

</div>
`.trim();
};