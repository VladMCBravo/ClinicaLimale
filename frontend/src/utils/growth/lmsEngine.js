/**
 * ============================================================================
 * MOTOR GENÉRICO DE CÁLCULO LMS (escore-Z ↔ percentil)
 * ============================================================================
 *
 * Motor COMPARTILHADO de percentis/escore-Z antropométricos, reutilizável pelo
 * eco fetal, obstétrico e módulos pediátricos. Contém apenas MATEMÁTICA — nenhum
 * dado clínico. Os coeficientes L/M/S vivem em arquivos de referência separados
 * (utils/growth/references/*.js), cada um citando sua fonte oficial.
 *
 * Método LMS (Cole & Green): uma medida antropométrica em função da idade é
 * modelada por três curvas — L (lambda, assimetria/Box-Cox), M (mediana) e
 * S (coeficiente de variação). O escore-Z é:
 *
 *     Z = ((valor / M)^L − 1) / (L · S)        , quando L ≠ 0
 *     Z = ln(valor / M) / S                     , quando L = 0
 *
 * E a transformação inversa (valor esperado para um dado Z):
 *
 *     valor = M · (1 + L · S · Z)^(1/L)         , quando L ≠ 0
 *     valor = M · exp(S · Z)                     , quando L = 0
 *
 * Referências do método: Cole TJ, Green PJ. Smoothing reference centile curves:
 * the LMS method and penalized likelihood. Stat Med 1992;11:1305-19.
 * (usado por OMS, CDC, Fenton e INTERGROWTH-21st pós-natal).
 * ============================================================================
 */

const num = (v) => {
    const f = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(f) ? f : null;
};

const EPS_L = 1e-7; // |L| abaixo disso é tratado como L = 0 (forma logarítmica)

/**
 * Escore-Z de um valor medido dado o trio LMS.
 * @param {number} value  valor medido
 * @param {{L:number, M:number, S:number}} lms
 * @returns {number|null}
 */
export const zScoreFromLMS = (value, lms) => {
    const x = num(value);
    const L = num(lms && lms.L);
    const M = num(lms && lms.M);
    const S = num(lms && lms.S);
    if (x === null || L === null || M === null || S === null) return null;
    if (x <= 0 || M <= 0 || S <= 0) return null;

    if (Math.abs(L) < EPS_L) {
        return Math.log(x / M) / S;
    }
    return (Math.pow(x / M, L) - 1) / (L * S);
};

/**
 * Valor esperado (transformação inversa) para um dado escore-Z.
 * Útil para desenhar faixas de referência (ex.: limite de +2 DP).
 * @param {number} z
 * @param {{L:number, M:number, S:number}} lms
 * @returns {number|null}
 */
export const valueFromZ = (z, lms) => {
    const Z = num(z);
    const L = num(lms && lms.L);
    const M = num(lms && lms.M);
    const S = num(lms && lms.S);
    if (Z === null || L === null || M === null || S === null) return null;
    if (M <= 0 || S <= 0) return null;

    if (Math.abs(L) < EPS_L) {
        return M * Math.exp(S * Z);
    }
    const base = 1 + L * S * Z;
    if (base <= 0) return null; // fora do domínio válido da curva
    return M * Math.pow(base, 1 / L);
};

/**
 * Função de distribuição acumulada da normal padrão (Φ). Aproximação de
 * Abramowitz & Stegun 7.1.26 via erf; erro máximo ~1.5e-7.
 */
export const normalCdf = (z) => {
    const Z = num(z);
    if (Z === null) return null;
    // erf(x) por A&S 7.1.26
    const sign = Z < 0 ? -1 : 1;
    const x = Math.abs(Z) / Math.SQRT2;
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    const erf = sign * y;
    return 0.5 * (1 + erf);
};

/**
 * Percentil (0–100) correspondente a um escore-Z.
 */
export const percentileFromZ = (z) => {
    const cdf = normalCdf(z);
    return cdf === null ? null : cdf * 100;
};

/**
 * Percentil a partir de um valor medido + trio LMS.
 */
export const percentileFromLMS = (value, lms) => {
    const z = zScoreFromLMS(value, lms);
    return z === null ? null : percentileFromZ(z);
};

/**
 * Interpola linearmente o trio LMS entre dois pontos de idade/x quando o valor
 * exato não está tabelado. Recebe uma tabela ordenada por `x` no formato
 * [{ x, L, M, S }, ...] e o x desejado.
 *
 * - Fora do intervalo tabelado: retorna null (não extrapola — segurança).
 * - x exatamente tabelado: retorna o próprio ponto.
 * @returns {{L:number, M:number, S:number}|null}
 */
export const interpolateLMS = (table, x) => {
    const xt = num(x);
    if (xt === null || !Array.isArray(table) || table.length === 0) return null;

    // Assume tabela ordenada crescente por x.
    const first = table[0];
    const last = table[table.length - 1];
    if (xt < num(first.x) || xt > num(last.x)) return null;

    for (let i = 0; i < table.length; i++) {
        const p = table[i];
        if (num(p.x) === xt) return { L: num(p.L), M: num(p.M), S: num(p.S) };
        if (num(p.x) > xt) {
            const prev = table[i - 1];
            if (!prev) return null;
            const x0 = num(prev.x); const x1 = num(p.x);
            const frac = (xt - x0) / (x1 - x0);
            const lerp = (a, b) => a + (b - a) * frac;
            return {
                L: lerp(num(prev.L), num(p.L)),
                M: lerp(num(prev.M), num(p.M)),
                S: lerp(num(prev.S), num(p.S)),
            };
        }
    }
    return null;
};

/**
 * Cálculo de alto nível: dado uma referência LMS-tabelada, o sexo, o x (idade)
 * e o valor medido, retorna { z, percentil, lms, source }.
 *
 * @param {object} reference  { source, tables: { M:[...], F:[...] } } com cada
 *                            tabela no formato [{x,L,M,S}]
 * @param {'M'|'F'} sexo
 * @param {number} x          idade/grandeza-eixo (unidade da própria tabela)
 * @param {number} value      valor medido
 */
export const calcularLMS = (reference, sexo, x, value) => {
    if (!reference || !reference.tables) return null;
    const tabela = reference.tables[sexo];
    if (!tabela) return null;
    const lms = interpolateLMS(tabela, x);
    if (!lms) return null;
    const z = zScoreFromLMS(value, lms);
    if (z === null) return null;
    return {
        z: Math.round(z * 100) / 100,
        percentil: Math.round(percentileFromZ(z) * 10) / 10,
        lms,
        source: reference.source || null,
    };
};
