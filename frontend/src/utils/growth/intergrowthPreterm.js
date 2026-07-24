/**
 * ============================================================================
 * INTERGROWTH-21st — Crescimento PÓS-NATAL do PREMATURO (Villar 2015)
 * ============================================================================
 *
 * Percentil/escore-Z de peso, comprimento e perímetro cefálico para a idade
 * PÓS-MENSTRUAL (27 a 64 semanas exatas) do recém-nascido prematuro — as curvas
 * "INTERGROWTH Prematuros" que o médico usa.
 *
 * Coeficientes copiados da implementação oficial de referência (pacote `gigs`,
 * arquivo R/ig_png.R, função ig_png_mu_sigma). NÃO transcritos de memória.
 * Codificação de sexo conforme a fonte: M = 1, F = 0.
 *
 * Referência: Villar J et al. Postnatal growth standards for preterm infants:
 * the Preterm Postnatal Follow-up Study of the INTERGROWTH-21st Project.
 * Lancet Glob Health 2015;3(11):e681-91.
 *
 * Modelos:
 *  - peso e comprimento: LOG-normais → z = (ln(valor) − μ) / σ
 *  - perímetro cefálico: normal      → z = (valor − μ) / σ
 * Unidades: peso em kg, comprimento e PC em cm.
 * ============================================================================
 */

import { percentileFromZ } from './lmsEngine';

const num = (v) => {
    const f = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(f) ? f : null;
};

const SOURCE = 'INTERGROWTH-21st Preterm Postnatal (Villar 2015), via implementação de referência lshtm-gigs/gigs';

const PMA_MIN = 27; // semanas pós-menstruais
const PMA_MAX = 64;

export const IG_PRETERM_MEDIDAS = {
    weight: { rotulo: 'Peso', unidade: 'kg', log: true },
    length: { rotulo: 'Comprimento', unidade: 'cm', log: true },
    hc: { rotulo: 'Perímetro cefálico', unidade: 'cm', log: false },
};

// μ e σ para idade pós-menstrual x (semanas) e sexo ('M'|'F').
const muSigma = (medida, x, sexo) => {
    const sexM = sexo === 'M' ? 1 : 0;
    switch (medida) {
        case 'weight':
            return {
                mu: 2.591277 - 0.01155 * x ** 0.5 - 2201.705 * x ** -2 + 0.0911639 * sexM,
                sigma: 0.1470258 + 505.92394 / x ** 2 - (140.0576 / x ** 2) * Math.log(x),
            };
        case 'length':
            return {
                mu: 4.136244 - 547.0018 * x ** -2 + 0.0026066 * x + 0.0314961 * sexM,
                sigma: 0.050489 + 310.44761 * x ** -2 - (90.0742 * x ** -2) * Math.log(x),
            };
        case 'hc':
            return {
                mu: 55.53617 - 852.0059 * x ** -1 + 0.7957903 * sexM,
                sigma: 3.0582292 + 3910.05 * x ** -2 - 180.5625 * x ** -1,
            };
        default:
            return null;
    }
};

/**
 * Escore-Z e percentil do prematuro pós-natal (INTERGROWTH Villar 2015).
 * @param {string} medida  'weight' | 'length' | 'hc'
 * @param {'M'|'F'} sexo
 * @param {number} idadePMSemanas  idade pós-menstrual em semanas (27–64)
 * @param {number} valor  peso em kg, comprimento/PC em cm
 * @returns {{ z:number, percentil:number, source:string, medida:string } | null}
 */
export const calcularIGPreterm = (medida, sexo, idadePMSemanas, valor) => {
    const meta = IG_PRETERM_MEDIDAS[medida];
    if (!meta) return null;
    if (sexo !== 'M' && sexo !== 'F') return null;
    const x = num(idadePMSemanas);
    const y = num(valor);
    if (x === null || y === null) return null;
    if (x < PMA_MIN || x > PMA_MAX) return null;
    if (y <= 0) return null;

    const ms = muSigma(medida, x, sexo);
    if (!ms || ms.sigma === 0) return null;

    const yy = meta.log ? Math.log(y) : y;
    const z = (yy - ms.mu) / ms.sigma;
    if (!Number.isFinite(z)) return null;

    return {
        z: Math.round(z * 100) / 100,
        percentil: Math.round(percentileFromZ(z) * 10) / 10,
        source: SOURCE,
        medida,
    };
};

/**
 * Mediana esperada (z = 0) para a idade/sexo — útil para exibir a referência.
 */
export const medianaIGPreterm = (medida, sexo, idadePMSemanas) => {
    const meta = IG_PRETERM_MEDIDAS[medida];
    if (!meta || (sexo !== 'M' && sexo !== 'F')) return null;
    const x = num(idadePMSemanas);
    if (x === null || x < PMA_MIN || x > PMA_MAX) return null;
    const ms = muSigma(medida, x, sexo);
    if (!ms) return null;
    const med = meta.log ? Math.exp(ms.mu) : ms.mu;
    return Math.round(med * 1000) / 1000;
};
