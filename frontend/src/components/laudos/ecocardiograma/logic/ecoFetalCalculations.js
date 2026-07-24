/**
 * Cálculos puros do Ecocardiograma Fetal.
 * Não dependem de React. Recebem dados, retornam resultados.
 */

import { computeZScore, isAutoZScoreAvailable } from './zScoreReferenceTables';

/**
 * ESCORE CARDIOVASCULAR DE HUHTA (Cardiovascular Profile Score - CVPS)
 * ---------------------------------------------------------------------
 * Escore de 10 pontos para avaliação de risco/gravidade de insuficiência
 * cardíaca fetal (Huhta JC). São 5 categorias, cada uma de 0 a 2 pontos;
 * pontuação máxima (normal) = 10.
 *
 * Referência: Huhta JC. "Guidelines for the evaluation of heart failure in
 * the fetus with or without hydrops." Pediatr Cardiol 2004.
 *
 * Cada categoria é modelada como valor 0/1/2 escolhido pelo médico na UI.
 * O total é a soma (equivalente a 10 menos as deduções).
 */
export const HUHTA_CATEGORIAS = [
    {
        key: 'huhtaHidropsia',
        label: 'Hidropsia',
        opcoes: [
            { valor: 2, texto: 'Ausente' },
            { valor: 1, texto: 'Ascite, derrame pleural ou pericárdico' },
            { valor: 0, texto: 'Edema de pele (anasarca)' },
        ],
    },
    {
        key: 'huhtaVenoso',
        label: 'Doppler venoso (veia umbilical / ducto venoso)',
        opcoes: [
            { valor: 2, texto: 'Normal' },
            { valor: 1, texto: 'Ducto venoso com onda A reversa' },
            { valor: 0, texto: 'Pulsação de veia umbilical' },
        ],
    },
    {
        key: 'huhtaTamanho',
        label: 'Tamanho cardíaco (índice cardiotorácico)',
        opcoes: [
            { valor: 2, texto: 'Normal (> 0,20 e < 0,35)' },
            { valor: 1, texto: 'Aumentado (0,35 a 0,50)' },
            { valor: 0, texto: 'Muito aumentado (> 0,50) ou < 0,20' },
        ],
    },
    {
        key: 'huhtaFuncao',
        label: 'Função cardíaca',
        opcoes: [
            { valor: 2, texto: 'Normal (biventricular, valvas AV normais)' },
            { valor: 1, texto: 'Insuf. tricúspide holossistólica ou FE reduzida' },
            { valor: 0, texto: 'Insuf. mitral holossistólica ou enchimento monofásico' },
        ],
    },
    {
        key: 'huhtaArterial',
        label: 'Doppler arterial (artéria umbilical)',
        opcoes: [
            { valor: 2, texto: 'Normal' },
            { valor: 1, texto: 'Diástole zero (ausência de fluxo diastólico final)' },
            { valor: 0, texto: 'Diástole reversa' },
        ],
    },
];

const clampPonto = (v) => {
    const n = parseInt(v, 10);
    if (isNaN(n)) return 2;
    if (n < 0) return 0;
    if (n > 2) return 2;
    return n;
};

/**
 * Calcula o Escore de Huhta a partir do estado do formulário.
 * @returns {{ total:number, breakdown: Array<{label:string, valor:number, texto:string}> }}
 */
export const calcularScoreHuhta = (data) => {
    const breakdown = HUHTA_CATEGORIAS.map((cat) => {
        const valor = clampPonto(data[cat.key]);
        const opcao = cat.opcoes.find((o) => o.valor === valor) || cat.opcoes[0];
        return { label: cat.label, valor, texto: opcao.texto };
    });
    const total = breakdown.reduce((acc, b) => acc + b.valor, 0);
    return { total, breakdown };
};

/**
 * Escore-Z fetal de uma estrutura, com fallback para valor manual.
 *
 * @param {string} structureKey  chave em Z_SCORE_TABLE (ex.: 'fetal_isthmus_3vv')
 * @param {number|string} medidaMm  medida em mm
 * @param {object} ctx  { femurLength, valorManual }
 * @returns {{ valor:string, auto:boolean, source:string|null }}
 *   valor: string formatada com sinal (ex.: '+0,80'), ou '' se indisponível
 *   auto: true se calculado automaticamente, false se veio do valor manual
 */
export const resolverZScoreFetal = (structureKey, medidaMm, ctx = {}) => {
    if (isAutoZScoreAvailable(structureKey)) {
        const r = computeZScore(structureKey, medidaMm, { femurLength: ctx.femurLength });
        if (r && r.z !== null && r.z !== undefined) {
            return { valor: formatarZ(r.z), auto: true, source: r.source };
        }
    }
    // Fallback: valor digitado manualmente pelo médico.
    const manual = (ctx.valorManual ?? '').toString().trim();
    return { valor: manual ? formatarZManual(manual) : '', auto: false, source: null };
};

const formatarZ = (z) => {
    const s = (z >= 0 ? '+' : '') + z.toFixed(2);
    return s.replace('.', ',');
};

const formatarZManual = (raw) => {
    const n = parseFloat(raw.replace(',', '.'));
    if (isNaN(n)) return raw; // devolve como digitado se não for número
    return formatarZ(n);
};

/**
 * Converte idade gestacional em texto para semanas decimais.
 * Aceita "24s3d", "24s", "24+3", "24 3", "24" e "24,3"/"24.3" (semanas decimais).
 * Retorna número (semanas, fracionário) ou null se não reconhecer.
 */
export const parseIgParaSemanas = (str) => {
    if (str == null) return null;
    const s = String(str).trim().toLowerCase();
    if (!s) return null;
    let m = s.match(/^(\d+)\s*s(?:em|emanas)?\s*(?:(\d+)\s*d?)?$/); // 24s3d, 24s
    if (m) return Number(m[1]) + (m[2] ? Number(m[2]) / 7 : 0);
    m = s.match(/^(\d+)\s*\+\s*(\d+)$/); // 24+3
    if (m) return Number(m[1]) + Number(m[2]) / 7;
    m = s.match(/^(\d+)\s+(\d+)$/); // 24 3
    if (m) return Number(m[1]) + Number(m[2]) / 7;
    m = s.match(/^(\d+(?:[.,]\d+)?)$/); // 24 ou 24,3 (semanas decimais)
    if (m) return parseFloat(m[1].replace(',', '.'));
    return null;
};
