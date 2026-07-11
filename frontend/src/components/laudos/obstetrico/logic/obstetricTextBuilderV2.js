// Arquivo: obstetrico/logic/obstetricTextBuilderV2.js
import { formatData } from './obstetricCalculations';

const tituloSecao = (texto) => `<h4 style="color: #1C2E4A; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; font-size: 14px; text-transform: uppercase;">${texto}</h4>`;
const paragrafo = (texto) => `<p style="margin-bottom: 6px; line-height: 1.5; text-align: justify;">${texto}</p>`;

// Removemos a gambiarra dos pontos e passamos a usar Tabela HTML
const formatBioLineHTML = (label, value, unit = 'mm') => {
    if (!value) return '';
    return `
        <tr>
            <td style="border-bottom: 1px dotted #ccc; padding: 4px 8px; width: 60%;">${label}</td>
            <td style="border-bottom: 1px dotted #ccc; padding: 4px 8px; width: 40%; font-weight: bold;">${value} ${unit}</td>
        </tr>
    `;
};

// ... Mantenha as funções `montarTextoCordao`, `montarTextoUtero`, `montarTextoAnexos` e `montarAnaliseMorfologica` 
// iguais às originais, apenas envelopando os retornos em paragrafo(). Exemplo:
// const montarTextoCordaoHTML = (d) => paragrafo(montarTextoCordao(d));

const renderBiometriaHTML = (d) => {
    let t = `<table style="width: 100%; max-width: 500px; border-collapse: collapse; margin-bottom: 15px; font-size: 13px;"><tbody>`;
    
    const bios = [
        d.ccn ? formatBioLineHTML('Comprimento Cabeça-Nádega (CCN)', d.ccn) : '',
        formatBioLineHTML('Diâmetro Biparietal', d.dbp),
        formatBioLineHTML('Diâmetro Occipitofrontal', d.dof),
        formatBioLineHTML('Circunferência Cefálica', d.cc),
        formatBioLineHTML('Circunferência Abdominal', d.ca),
        formatBioLineHTML('Comprimento do Fêmur', d.femur),
        formatBioLineHTML('Comprimento do Úmero', d.umero),
        // ... (Insira todas as medidas originais aqui)
        formatBioLineHTML('Translucência Nucal', d.tnMedida),
    ].join('');

    t += bios + `</tbody></table>`;

    const ccnVal = parseFloat(d.ccn);
    if (!isNaN(ccnVal)) {
        if (d.subtipo === 'OBSTETRICO_1_TRI' && ccnVal < 45) {
            t += paragrafo(`<strong>NOTA:</strong> Medida de CCN abaixo de 45 mm limita a avaliação de risco para trissomias pela TN.`);
        } else if (d.subtipo === 'OBSTETRICO_MORFOLOGICO' && ccnVal > 84) {
            t += paragrafo(`<strong>NOTA:</strong> Medida de CCN acima de 84 mm. Avaliação de risco pela TN não aplicável nesta fase.`);
        }
    }
    return t;
};

const renderDopplerHTML = (d) => {
    if (!d.usarDoppler) return '';
    
    let html = tituloSecao('ESTUDO DOPPLERFLUXOMÉTRICO');
    html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="border: 1px solid #dee2e6; padding: 6px; text-align: left;">Vaso</th>
                        <th style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">IP</th>
                        <th style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">IR</th>
                        <th style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">Outros Achados</th>
                    </tr>
                </thead>
                <tbody>`;

    if (d.checkAcm || d.acmIP) {
        html += `<tr><td style="border: 1px solid #dee2e6; padding: 6px;">Artéria Cerebral Média</td>
                     <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">${d.acmIP || '-'}</td>
                     <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">${d.acmIR || '-'}</td>
                     <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">${d.acmPVS ? `PVS: ${d.acmPVS} cm/s` : ''} ${d.acmDiastoleAlta ? '(Centralização)' : ''}</td></tr>`;
    }
    
    if (d.checkUmb || d.umbIP) {
        html += `<tr><td style="border: 1px solid #dee2e6; padding: 6px;">Artéria Umbilical</td>
                     <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">${d.umbIP || '-'}</td>
                     <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">${d.umbIR || '-'}</td>
                     <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">${d.umbDiastoleZero ? 'Diástole Zero' : (d.umbDiastoleReversa ? 'Diástole Reversa' : '-')}</td></tr>`;
    }
    
    html += `</tbody></table>`;
    
    if (d.relacaoCerebroUmbilical) {
        html += paragrafo(`<strong>Relação Cérebro/Umbilical:</strong> ${d.relacaoCerebroUmbilical} (n/l maior/igual à 1,0)`);
    }
    
    return html;
};

export const gerarRelatorioFetoHTML = (d) => {
    // ... Aqui você importa e utiliza o mesmo fluxo do `gerarRelatorioFeto` antigo,
    // Substituindo as concatenações de "\n" pelas chamadas das funções paragrafo() e tituloSecao().
    
    let html = '';
    // Exemplo de como a biometria é chamada no meio do fluxo:
    html += tituloSecao('BIOMETRIA FETAL');
    html += renderBiometriaHTML(d);
    
    html += renderDopplerHTML(d);
    
    // ... Retorna o HTML final
    return { texto: html };
};

export const montarTextoFinalMultiploHTML = (resF1, resF2, resF3, qtdFetos, listaFetos = []) => {
    let textoFinal = '';
    
    // Lógica idêntica, mas usando divisores HTML para gêmeos
    if (qtdFetos > 1) {
        textoFinal += `<hr style="border: 0; border-top: 2px solid #1C2E4A; margin: 20px 0;" />`;
        textoFinal += `<h3 style="color: #1C2E4A;">FETO I</h3>`;
    }
    textoFinal += resF1.texto;
    
    if (qtdFetos >= 2 && resF2) {
        textoFinal += `<hr style="border: 0; border-top: 2px solid #1C2E4A; margin: 20px 0;" />`;
        textoFinal += `<h3 style="color: #1C2E4A;">FETO II</h3>`;
        textoFinal += resF2.texto;
    }
    
    return textoFinal;
};