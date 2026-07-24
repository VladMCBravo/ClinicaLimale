/**
 * ============================================================================
 * MOTOR AUDITÁVEL DE ESCORE-Z (Z-SCORE) PARA ECOCARDIOGRAFIA
 * ============================================================================
 *
 * ⚠️  LEIA ANTES DE ALTERAR — ARQUIVO CLINICAMENTE SENSÍVEL  ⚠️
 *
 * O Escore-Z é usado para decisão clínica (ex.: rastreio de coarctação,
 * hipoplasia de arco). Um coeficiente errado gera número errado no laudo.
 * Regras deste arquivo:
 *
 *   1. NENHUM coeficiente pode ser inserido "de memória". Todo número tem
 *      que vir de uma fonte publicada citada explicitamente no comentário,
 *      ou da ferramenta que o médico já usa e validou.
 *   2. Cada estrutura só entra em produção (verified: true) depois que o
 *      médico comparar uma amostra de valores calculados aqui com os
 *      valores da ferramenta que ele confia.
 *   3. Enquanto verified !== true, computeZScore() retorna null → a UI
 *      cai automaticamente para ENTRADA MANUAL do Escore-Z. Isso é o
 *      comportamento correto e seguro, não um bug.
 *
 * ----------------------------------------------------------------------------
 * FORMA DA FÓRMULA (Pasquini et al., Ultrasound Obstet Gynecol 2007;29:628-633)
 * ----------------------------------------------------------------------------
 * Para as estruturas fetais indexadas ao comprimento do fêmur (CF), o artigo
 * usa regressão log-log:
 *
 *     Z = [ ln(medida_mm) − ( m · ln(CF_mm) + c ) ] / raizMSE
 *
 * onde:
 *     c        = intercepto da regressão
 *     m        = coeficiente angular (multiplicador)
 *     raizMSE  = raiz do erro quadrático médio (≈ desvio-padrão dos resíduos)
 *
 * Os coeficientes numéricos exatos por estrutura estão em publicação com
 * acesso restrito (Wiley/paywall) e NÃO puderam ser confirmados de fonte
 * primária no momento desta implementação. Por isso as estruturas fetais
 * abaixo estão com verified:false e coeficientes null. Preencher quando o
 * médico fornecer o artigo/tabela ou os números da ferramenta dele.
 * ============================================================================
 */

const safeFloat = (v) => {
    const f = parseFloat(String(v).replace(',', '.'));
    return isNaN(f) ? null : f;
};

/**
 * Modelo de regressão log-log indexado a um preditor (ex.: comprimento do
 * fêmur). Segue a forma de Pasquini 2007.
 *
 * Campos:
 *   predictor: qual grandeza alimenta o cálculo ('femurLength' | 'bsa' | 'ga')
 *   c, m, rootMSE: coeficientes (ver regra 1 acima)
 *   verified: só true após validação do médico (ver regra 2)
 *   source: citação da fonte
 */
const LOG_LOG_FEMUR = 'logLogFemur';

export const Z_SCORE_TABLE = {
    // ---- FETAL: indexado ao comprimento do fêmur (Pasquini 2007) ----
    fetal_isthmus_3vv: {
        label: 'Istmo aórtico (corte dos 3 vasos)',
        model: LOG_LOG_FEMUR,
        predictor: 'femurLength',
        c: null,
        m: null,
        rootMSE: null,
        verified: false,
        source: 'Pasquini L et al. Ultrasound Obstet Gynecol 2007;29:628-633 (coeficientes pendentes de confirmação da fonte primária)',
    },
    fetal_isthmus_sagittal: {
        label: 'Istmo aórtico (corte sagital)',
        model: LOG_LOG_FEMUR,
        predictor: 'femurLength',
        c: null,
        m: null,
        rootMSE: null,
        verified: false,
        source: 'Pasquini L et al. Ultrasound Obstet Gynecol 2007;29:628-633 (coeficientes pendentes)',
    },
    fetal_duct_3vv: {
        label: 'Ducto arterioso (corte dos 3 vasos)',
        model: LOG_LOG_FEMUR,
        predictor: 'femurLength',
        c: null,
        m: null,
        rootMSE: null,
        verified: false,
        source: 'Pasquini L et al. Ultrasound Obstet Gynecol 2007;29:628-633 (coeficientes pendentes)',
    },
};

/**
 * Calcula o Escore-Z de uma estrutura, se e somente se ela estiver verificada
 * e todos os coeficientes/insumos existirem. Caso contrário retorna null,
 * sinalizando à UI que deve usar entrada manual.
 *
 * @param {string} structureKey  chave em Z_SCORE_TABLE
 * @param {number|string} measurementMm  medida em mm
 * @param {object} predictors  { femurLength?, bsa?, ga? } conforme o modelo
 * @returns {{ z:number, source:string } | null}
 */
export const computeZScore = (structureKey, measurementMm, predictors = {}) => {
    const entry = Z_SCORE_TABLE[structureKey];
    if (!entry) return null;
    if (entry.verified !== true) return null;

    const y = safeFloat(measurementMm);
    if (y === null || y <= 0) return null;

    if (entry.model === LOG_LOG_FEMUR) {
        const fl = safeFloat(predictors.femurLength);
        if (fl === null || fl <= 0) return null;
        if (entry.c === null || entry.m === null || entry.rootMSE === null) return null;
        if (entry.rootMSE === 0) return null;

        const predictedLn = entry.m * Math.log(fl) + entry.c;
        const z = (Math.log(y) - predictedLn) / entry.rootMSE;
        return { z: Math.round(z * 100) / 100, source: entry.source };
    }

    return null;
};

/**
 * Indica se uma estrutura tem cálculo automático disponível (verificado).
 * A UI usa isso para decidir entre campo calculado (read-only) e campo manual.
 */
export const isAutoZScoreAvailable = (structureKey) => {
    const entry = Z_SCORE_TABLE[structureKey];
    return !!(entry && entry.verified === true);
};
