// Arquivo: ecocardiograma/logic/ecoTextBuilderV2.js

const MAP_TITULOS = {
    'ECO_TRANSTORACICO': 'ECOCARDIOGRAMA TRANSTORÁCICO',
    'ECO_DOPPLER': 'ECOCARDIOGRAMA TRANSTORÁCICO COM DOPPLER COLORIDO',
    'ECO_STRAIN': 'ECOCARDIOGRAMA COM ANÁLISE DE DEFORMAÇÃO (STRAIN)',
};

export const getTituloExame = (subtipo) => MAP_TITULOS[subtipo] || 'ECOCARDIOGRAMA';

const formatString = (str) => str ? str.replace(/_/g, ' ') : '';
const tituloSecao = (texto) => `<h4 style="color: #1C2E4A; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 15px; margin-bottom: 10px; font-size: 14px; text-transform: uppercase;">${texto}</h4>`;

export const gerarTabelaMedidasHTML = (data) => {
    const medidas = [
        { estrutura: 'Raiz aórtica', medida: data.raizAorta ? `${data.raizAorta} mm` : '-', ref: '21-37 mm' },
        { estrutura: 'Átrio esquerdo (AE)', medida: data.atrioEsq ? `${data.atrioEsq} mm` : '-', ref: '25-40 mm' },
        { estrutura: 'Volume indexado do AE', medida: data.volAe ? `${data.volAe} ml/m²` : '-', ref: '16-34 ml/m²' },
        { estrutura: 'VD (paraesternal eixo longo)', medida: data.ventriculoDir ? `${data.ventriculoDir} mm` : '-', ref: '<42 mm' },
        { estrutura: 'Septo ventricular (diástole)', medida: data.siv ? `${data.siv} mm` : '-', ref: 'F<10 mm; M<11 mm' },
        { estrutura: 'Parede posterior do VE (diástole)', medida: data.ppve ? `${data.ppve} mm` : '-', ref: 'F<10 mm; M<11 mm' },
        { estrutura: 'Diâmetro diastólico do VE', medida: data.ddve ? `${data.ddve} mm` : '-', ref: '36-52 mm' },
        { estrutura: 'Diâmetro sistólico do VE', medida: data.dsve ? `${data.dsve} mm` : '-', ref: '26-34 mm' },
        { estrutura: 'Fração de encurtamento', medida: data.resEncurtamento ? `${data.resEncurtamento}%` : '-', ref: '28-44%' },
        { estrutura: `Fração de Ejeção (${data.metodoFe || 'Teichholz'})`, medida: data.resFe ? `${data.resFe}%` : '-', ref: '>55%' },
        { estrutura: 'Índice de massa VE', medida: data.resImVE ? `${data.resImVE} g/m²` : '-', ref: 'F<96; M<116' },
        { estrutura: 'Espessura relativa de parede (RWT)', medida: data.resRwt || '-', ref: '<0,42' },
    ];

    let html = `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
        <thead>
            <tr style="background-color: #f8f9fa;">
                <th style="border: 1px solid #dee2e6; padding: 6px; text-align: left;">Estrutura</th>
                <th style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">Medida</th>
                <th style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">Referência</th>
            </tr>
        </thead>
        <tbody>
    `;

    medidas.forEach(m => {
        html += `
            <tr>
                <td style="border: 1px solid #dee2e6; padding: 6px;">${m.estrutura}</td>
                <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center; font-weight: bold;">${m.medida}</td>
                <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center; color: #555;">${m.ref}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    return html;
};

// As lógicas de `gerarRelatorio` e `gerarConclusaoAutomatica` permanecem idênticas ao original para manter 
// a inteligência clínica intacta, apenas a envelopagem final muda.
import { gerarRelatorio, gerarConclusaoAutomatica } from './ecoTextBuilder'; // Reaproveitamos do V1

export const montarTextoFinalHTML = (data) => {
    const tabelaHTML = gerarTabelaMedidasHTML(data);
    const listaComentarios = gerarRelatorio(data);
    const listaConclusao = gerarConclusaoAutomatica(data);
    const tituloExame = getTituloExame(data.subtipo);

    let htmlFinal = tituloSecao('TABELA DE MEDIDAS');
    htmlFinal += tabelaHTML;

    htmlFinal += tituloSecao('ANÁLISE DESCRITIVA');
    htmlFinal += `<ul style="line-height: 1.5; margin-bottom: 20px; padding-left: 20px;">`;
    listaComentarios.forEach(c => htmlFinal += `<li style="margin-bottom: 6px;">${c}</li>`);
    htmlFinal += `</ul>`;

    htmlFinal += tituloSecao('CONCLUSÃO');
    htmlFinal += `<ul style="line-height: 1.5; padding-left: 20px; font-weight: 500;">`;
    listaConclusao.forEach(c => htmlFinal += `<li style="margin-bottom: 6px;">${c}</li>`);
    htmlFinal += `</ul>`;

    return {
        textoPreview: htmlFinal, // Este é o HTML que vai pro TinyMCE
        dadosEstruturados: data,
        tituloExame
    };
};