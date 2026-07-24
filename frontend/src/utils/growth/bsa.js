/**
 * ============================================================================
 * SUPERFÍCIE CORPÓREA (BSA / SC) — fórmulas fechadas e exatas
 * ============================================================================
 *
 * A BSA é a "ponte" entre o tamanho do corpo e o Escore-Z das estruturas
 * cardíacas pós-natais (que são indexadas à BSA). Este módulo é COMPARTILHADO
 * (eco adulto, pediátrico, etc.).
 *
 * Todas as fórmulas recebem peso em kg e altura/comprimento em cm e devolvem a
 * BSA em m². Coeficientes conferidos em fonte publicada:
 *
 *   - DuBois & DuBois (1916):   0.007184 · W^0.425  · H^0.725
 *   - Haycock et al. (J Pediatr 1978;93:62-66): 0.024265 · W^0.5378 · H^0.3964
 *       → mais usada em pediatria (inclui prematuros); base de vários
 *         nomogramas de Z-score cardíaco (ex.: Boston Children's).
 *   - Mosteller (N Engl J Med 1987): sqrt(W · H / 3600)
 *   - Gehan & George (1970):    0.0235   · W^0.51456 · H^0.42246
 *   - Boyd (1935):              0.0333 · W^(0.6157 − 0.0188·log10 W) · H^0.3
 * ============================================================================
 */

const num = (v) => {
    const f = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(f) ? f : null;
};

const round4 = (x) => Math.round(x * 10000) / 10000;

export const bsaDuBois = (pesoKg, alturaCm) => {
    const w = num(pesoKg), h = num(alturaCm);
    if (w === null || h === null || w <= 0 || h <= 0) return null;
    return round4(0.007184 * Math.pow(w, 0.425) * Math.pow(h, 0.725));
};

export const bsaHaycock = (pesoKg, alturaCm) => {
    const w = num(pesoKg), h = num(alturaCm);
    if (w === null || h === null || w <= 0 || h <= 0) return null;
    return round4(0.024265 * Math.pow(w, 0.5378) * Math.pow(h, 0.3964));
};

export const bsaMosteller = (pesoKg, alturaCm) => {
    const w = num(pesoKg), h = num(alturaCm);
    if (w === null || h === null || w <= 0 || h <= 0) return null;
    return round4(Math.sqrt((w * h) / 3600));
};

export const bsaGehanGeorge = (pesoKg, alturaCm) => {
    const w = num(pesoKg), h = num(alturaCm);
    if (w === null || h === null || w <= 0 || h <= 0) return null;
    return round4(0.0235 * Math.pow(w, 0.51456) * Math.pow(h, 0.42246));
};

export const bsaBoyd = (pesoKg, alturaCm) => {
    const w = num(pesoKg), h = num(alturaCm);
    if (w === null || h === null || w <= 0 || h <= 0) return null;
    const expW = 0.6157 - 0.0188 * Math.log10(w);
    return round4(0.0333 * Math.pow(w, expW) * Math.pow(h, 0.3));
};

export const BSA_FORMULAS = {
    haycock: { label: 'Haycock (pediátrica)', fn: bsaHaycock },
    dubois: { label: 'DuBois', fn: bsaDuBois },
    mosteller: { label: 'Mosteller', fn: bsaMosteller },
    gehan: { label: 'Gehan & George', fn: bsaGehanGeorge },
    boyd: { label: 'Boyd', fn: bsaBoyd },
};

/**
 * Calcula a BSA pela fórmula escolhida (padrão: Haycock, adequada da faixa
 * neonatal à adulta e base de nomogramas cardíacos pediátricos).
 * @returns {number|null} BSA em m²
 */
export const calcularBSA = (pesoKg, alturaCm, formula = 'haycock') => {
    const f = BSA_FORMULAS[formula] || BSA_FORMULAS.haycock;
    return f.fn(pesoKg, alturaCm);
};
