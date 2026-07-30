// src/utils/htmlParser.js

// 1. Converte o texto bruto do exame para HTML (Tabelas e Parágrafos)
export const parseLaudoToHtml = (textoRaw) => {
    if (!textoRaw) return '';
    
    // Se o texto já foi editado no TinyMCE e possui tags HTML, retorna como está
    if (textoRaw.includes('<p>') || textoRaw.includes('<table>') || textoRaw.includes('<h4')) {
        return textoRaw;
    }

    const linhas = textoRaw.split('\n');
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

        // Títulos de Seção (Verde #2E7D32)
        const isHeader = titulosConhecidos.some(t => cleanLine.startsWith(t));
        if (isHeader) {
            closeTable();
            html += `<h4 style="color: #2E7D32; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 18px; margin-bottom: 8px; font-size: 14px; text-transform: uppercase;">${linhaOriginal}</h4>\n`;
            if (cleanLine === 'BIOMETRIA FETAL' || cleanLine === 'ÍNDICES E ESTIMATIVAS') {
                html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;"><tbody>\n`;
                inTable = true;
            }
            return;
        }

        // Tabela de Medidas
        if (inTable) {
            if (linha.toUpperCase().startsWith('NOTA:')) {
                html += `<tr><td colspan="2" style="border: 1px dotted #bbb; padding: 5px 8px; color: #555; font-size: 12px; font-style: italic;">${linha}</td></tr>\n`;
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
                            <td style="border: 1px dotted #bbb; padding: 5px 8px; text-align: left;">${label}</td>
                            <td style="border: 1px dotted #bbb; padding: 5px 8px; text-align: right; font-weight: bold;">${value}</td>
                         </tr>\n`;
            } else {
                html += `<tr><td colspan="2" style="border: 1px dotted #bbb; padding: 5px 8px; text-align: left;">${label}</td></tr>\n`;
            }
            return;
        }

        // Títulos curtos de órgãos (Negrito Azul Marinho #1C2E4A)
        if (linha.endsWith(':') && linha.length < 60) {
            html += `<p style="margin: 0 0 6px 0; font-size: 13px; color: #1C2E4A;"><strong>${linha}</strong></p>\n`;
        } else {
            html += `<p style="margin: 0 0 6px 0; font-size: 13px; color: #333;">${linha}</p>\n`;
        }
    });

    closeTable();
    return html;
};

// 2. Monta o Laudo Completo na Folha A4 (Cabeçalho + Título Centralizado + Corpo)
export const gerarHtmlCompletoLaudo = ({
    paciente,
    dadosEstruturados,
    tituloExame,
    tipoExame,
    textoLaudo,
    dataExame
}) => {
    // Se já estiver montado com HTML completo, preserva a edição do médico
    if (textoLaudo && (textoLaudo.includes('class="header-paciente-a4"') || textoLaudo.includes('id="laudo-a4-container"'))) {
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
        return `${idade} anos`;
    };

    const nomePct = paciente?.nome_completo || 'NÃO INFORMADO';
    const idadePct = calcularIdadeStr(dadosEstruturados?.dataNascimento || paciente?.data_nascimento);
    const sexoPct = dadosEstruturados?.sexo || paciente?.genero || paciente?.sexo || '';
    const solicitante = dadosEstruturados?.medicoSolicitante || 'PRÓPRIO';
    const titulo = (tituloExame || `ULTRASSONOGRAFIA DE ${tipoExame || 'EXAME'}`).toUpperCase();
    
    const dataFmt = dataExame 
        ? dataExame.split('-').reverse().join('/') 
        : new Date().toLocaleDateString('pt-BR');

    const corpoHtml = parseLaudoToHtml(textoLaudo);

    return `
<div id="laudo-a4-container" style="font-family: Arial, Helvetica, sans-serif;">
  
  <div class="header-paciente-a4" style="font-size: 11px; line-height: 1.4; color: #222; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 8px;">
    <table style="width: 100%; border-collapse: collapse; border: none;">
      <tbody>
        <tr style="border: none;">
          <td style="border: none; padding: 2px 0; width: 60%; vertical-align: top;">
            <strong>Paciente:</strong> ${nomePct.toUpperCase()}<br/>
            ${idadePct ? `<strong>Idade:</strong> ${idadePct} &nbsp;&nbsp;&nbsp;` : ''}
            ${sexoPct ? `<strong>Sexo:</strong> ${sexoPct}` : ''}
          </td>
          <td style="border: none; padding: 2px 0; width: 40%; vertical-align: top; text-align: right;">
            <strong>Solicitante:</strong> ${solicitante.toUpperCase()}<br/>
            <strong>Data:</strong> ${dataFmt}
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <h3 style="text-align: center; color: #1C2E4A; font-size: 14px; font-weight: bold; margin-top: 10px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
    ${titulo}
  </h3>

  <div class="corpo-laudo-a4">
    ${corpoHtml}
  </div>

</div>
`.trim();
};