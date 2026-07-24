/**
 * ============================================================================
 * INTERGROWTH-21st — Padrões de CRESCIMENTO FETAL (biometria e peso estimado)
 * ============================================================================
 *
 * Percentil/escore-Z de biometria fetal por idade gestacional. Os padrões
 * fetais do INTERGROWTH-21st NÃO são específicos por sexo.
 *
 * Coeficientes copiados da implementação oficial de referência (pacote `gigs`,
 * London School of Hygiene & Tropical Medicine / equipe INTERGROWTH — arquivo
 * R/ig_fet.R, função ig_fet_mu_sigma / ig_fet_lms). NÃO transcritos de memória.
 *
 * Referências:
 *  - Papageorghiou AT et al. International standards for fetal growth based on
 *    serial ultrasound measurements: the Fetal Growth Longitudinal Study of the
 *    INTERGROWTH-21st Project. Lancet 2014;384(9946):869-79.
 *  - Stirnemann J et al. International estimated fetal weight standards of the
 *    INTERGROWTH-21st Project. Ultrasound Obstet Gynecol 2017;49:478-486.
 *
 * Modelo: a maioria das medidas usa μ(IG) e σ(IG) com resíduo normal →
 *   z = (medida − μ) / σ.
 * O peso fetal estimado (EFW) usa um modelo LMS sobre ln(EFW).
 * ============================================================================
 */

import { percentileFromZ } from './lmsEngine';

const num = (v) => {
    const f = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(f) ? f : null;
};

const SOURCE = 'INTERGROWTH-21st (Papageorghiou 2014 / Stirnemann 2017), via implementação de referência lshtm-gigs/gigs';

// Faixa de validade (idade gestacional em dias). Biometria: 14–40 sem.
const IG_MIN_DIAS = 14 * 7; // 98
const IG_MAX_DIAS = 40 * 7; // 280
const EFW_MIN_DIAS = 22 * 7; // 154

// Metadados dos padrões suportados.
export const IG_FETAL_MEDIDAS = {
    HC: { rotulo: 'Perímetro cefálico (PC)', unidade: 'mm' },
    BPD: { rotulo: 'Diâmetro biparietal (DBP)', unidade: 'mm' },
    OFD: { rotulo: 'Diâmetro occipitofrontal (DOF)', unidade: 'mm' },
    AC: { rotulo: 'Circunferência abdominal (CA)', unidade: 'mm' },
    FL: { rotulo: 'Comprimento do fêmur (CF)', unidade: 'mm' },
    EFW: { rotulo: 'Peso fetal estimado (PFE)', unidade: 'g' },
};

// μ e σ (mm) para as medidas biométricas, com w = idade gestacional em semanas.
const muSigma = (medida, w) => {
    const lnw = Math.log(w);
    switch (medida) {
        case 'HC':
            return {
                mu: -28.2849 + 1.69267 * w ** 2 - 0.397485 * w ** 2 * lnw,
                sigma: 1.98735 + 0.0136772 * w ** 3 - 0.00726264 * w ** 3 * lnw
                    + 0.000976253 * w ** 3 * lnw ** 2,
            };
        case 'BPD':
            return {
                mu: 5.60878 + 0.158369 * w ** 2 - 0.00256379 * w ** 3,
                sigma: Math.exp(0.101242 + 0.00150557 * w ** 3 - 0.000771535 * w ** 3 * lnw
                    + 0.0000999638 * w ** 3 * lnw ** 2),
            };
        case 'AC':
            return {
                mu: -81.3243 + 11.6772 * w - 0.000561865 * w ** 3,
                sigma: -4.36302 + 0.121445 * w ** 2 - 0.0130256 * w ** 3
                    + 0.00282143 * w ** 3 * lnw,
            };
        case 'FL':
            return {
                mu: -39.9616 + 4.32298 * w - 0.0380156 * w ** 2,
                sigma: Math.exp(0.605843 - 42.0014 * w ** -2 + 0.00000917972 * w ** 3),
            };
        case 'OFD':
            return {
                mu: -12.4097 + 0.626342 * w ** 2 - 0.148075 * w ** 2 * lnw,
                sigma: Math.exp(-0.880034 + 0.0631165 * w ** 2 - 0.0317136 * w ** 2 * lnw
                    + 0.00408302 * w ** 2 * lnw ** 2),
            };
        default:
            return null;
    }
};

// LMS (sobre ln(EFW)) para o peso fetal estimado.
const efwLMS = (w) => {
    const w3 = w ** 3;
    const coeff = w3 * Math.log(w);
    return {
        l: -4.257629 - 2162.234 * w ** -2 + 0.0002301829 * w3,
        m: 4.956737 + 0.0005019687 * w3 - 0.0001227065 * coeff,
        s: 1e-4 * (-6.997171 + 0.057559 * w3 - 0.01493946 * coeff),
    };
};

const EPS_L = 1e-7;

/**
 * Escore-Z e percentil de uma medida fetal pelo INTERGROWTH-21st.
 * @param {string} medida  'HC' | 'BPD' | 'OFD' | 'AC' | 'FL' | 'EFW'
 * @param {number} idadeGestacionalDias  idade gestacional em dias
 * @param {number} valor  medida (mm para biometria; g para EFW)
 * @returns {{ z:number, percentil:number, source:string, medida:string } | null}
 */
export const calcularIGFetal = (medida, idadeGestacionalDias, valor) => {
    if (!IG_FETAL_MEDIDAS[medida]) return null;
    const dias = num(idadeGestacionalDias);
    const y = num(valor);
    if (dias === null || y === null) return null;
    if (dias < IG_MIN_DIAS || dias > IG_MAX_DIAS) return null;

    const w = dias / 7;
    let z;

    if (medida === 'EFW') {
        if (dias < EFW_MIN_DIAS) return null;
        if (y <= 0) return null;
        const { l, m, s } = efwLMS(w);
        const logEfw = Math.log(y);
        if (s === 0 || m === 0) return null;
        z = Math.abs(l) < EPS_L
            ? Math.log(logEfw / m) / s
            : (Math.pow(logEfw / m, l) - 1) / (l * s);
    } else {
        const ms = muSigma(medida, w);
        if (!ms || ms.sigma === 0) return null;
        z = (y - ms.mu) / ms.sigma;
    }

    if (!Number.isFinite(z)) return null;
    return {
        z: Math.round(z * 100) / 100,
        percentil: Math.round(percentileFromZ(z) * 10) / 10,
        source: SOURCE,
        medida,
    };
};

/**
 * Mediana esperada (z = 0) de uma medida biométrica na idade gestacional dada.
 * Útil para exibir a referência ao lado do valor medido. (Não implementado para
 * EFW aqui — usar calcularIGFetal para o z.)
 */
export const medianaIGFetal = (medida, idadeGestacionalDias) => {
    const dias = num(idadeGestacionalDias);
    if (dias === null || dias < IG_MIN_DIAS || dias > IG_MAX_DIAS) return null;
    if (medida === 'EFW') {
        const { m } = efwLMS(dias / 7);
        return Math.round(Math.exp(m) * 10) / 10; // exp(m) = EFW mediano (g)
    }
    const ms = muSigma(medida, dias / 7);
    return ms ? Math.round(ms.mu * 100) / 100 : null;
};
