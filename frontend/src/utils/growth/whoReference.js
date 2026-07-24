/**
 * ============================================================================
 * REFERÊNCIA OMS (WHO Child Growth Standards 2006) — 0 a 5 anos
 * ============================================================================
 *
 * Percentil/escore-Z antropométrico usando as tabelas LMS OFICIAIS da OMS
 * (geradas por src/utils/growth/data/_generateWhoData.js a partir do
 * repositório WorldHealthOrganization/anthro — ver proveniência em cada JSON).
 *
 * Reproduz o método do software WHO Anthro, incluindo o AJUSTE DE VALORES
 * EXTREMOS: além de ±3 DP a distribuição LMS é imprecisa, então a OMS mede a
 * distância em "larguras de 1 DP" na cauda. Isso garante o mesmo número que o
 * WHO Anthro (e, se o TURING usa OMS, o mesmo número dele).
 * ============================================================================
 */

import { interpolateLMS, zScoreFromLMS, percentileFromZ, valueFromZ } from './lmsEngine';

import weightForAge from './data/who_weight-for-age.json';
import lengthHeightForAge from './data/who_length-height-for-age.json';
import headCircForAge from './data/who_head-circumference-for-age.json';
import bmiForAge from './data/who_bmi-for-age.json';

const INDICADORES = {
    'weight-for-age': weightForAge,
    'length-height-for-age': lengthHeightForAge,
    'head-circumference-for-age': headCircForAge,
    'bmi-for-age': bmiForAge,
};

export const OMS_INDICADORES = Object.fromEntries(
    Object.entries(INDICADORES).map(([k, v]) => [k, v.rotulo])
);

const num = (v) => {
    const f = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(f) ? f : null;
};

// Converte as arrays compactas {L:[],M:[],S:[]} em [{x,L,M,S}] (para o motor),
// memoizando por indicador+sexo.
const cacheTabela = {};
const obterTabela = (indicador, sexo) => {
    const key = `${indicador}:${sexo}`;
    if (cacheTabela[key]) return cacheTabela[key];
    const ind = INDICADORES[indicador];
    if (!ind || !ind[sexo]) return null;
    const { L, M, S } = ind[sexo];
    const arr = [];
    for (let age = 0; age < M.length; age++) {
        if (M[age] === undefined || M[age] === null) continue;
        arr.push({ x: age, L: L[age], M: M[age], S: S[age] });
    }
    cacheTabela[key] = arr;
    return arr;
};

// Ajuste OMS para escores fora de ±3 DP.
const ajustarZExtremo = (medido, lms, z) => {
    if (z > 3) {
        const sd3 = valueFromZ(3, lms);
        const sd2 = valueFromZ(2, lms);
        if (sd3 === null || sd2 === null || sd3 === sd2) return z;
        return 3 + (medido - sd3) / (sd3 - sd2);
    }
    if (z < -3) {
        const sd3 = valueFromZ(-3, lms);
        const sd2 = valueFromZ(-2, lms);
        if (sd3 === null || sd2 === null || sd2 === sd3) return z;
        return -3 + (medido - sd3) / (sd2 - sd3);
    }
    return z;
};

/**
 * Calcula escore-Z e percentil antropométricos pela OMS.
 *
 * @param {string} indicador  chave em OMS_INDICADORES (ex.: 'weight-for-age')
 * @param {'M'|'F'} sexo
 * @param {number} idadeDias  idade em DIAS (0–1826). Use `mesesParaDias`/`anosParaDias`.
 * @param {number} valor      medida (kg para peso, cm para comprimento/PC, kg/m² para IMC)
 * @returns {{ z:number, percentil:number, lms:object, source:string, indicador:string } | null}
 */
export const calcularOMS = (indicador, sexo, idadeDias, valor) => {
    const tabela = obterTabela(indicador, sexo);
    if (!tabela) return null;
    const idade = num(idadeDias);
    const medido = num(valor);
    if (idade === null || medido === null) return null;

    const lms = interpolateLMS(tabela, idade);
    if (!lms) return null;

    const zBruto = zScoreFromLMS(medido, lms);
    if (zBruto === null) return null;

    const z = ajustarZExtremo(medido, lms, zBruto);
    return {
        z: Math.round(z * 100) / 100,
        percentil: Math.round(percentileFromZ(z) * 10) / 10,
        lms,
        source: INDICADORES[indicador].source,
        indicador,
    };
};

// Conversões de idade → dias (a OMS trabalha em dias completos).
export const mesesParaDias = (meses) => {
    const m = num(meses);
    return m === null ? null : Math.round(m * 30.4375);
};
export const anosParaDias = (anos) => {
    const a = num(anos);
    return a === null ? null : Math.round(a * 365.25);
};
