/**
 * Funções puras para cálculos ecocardiográficos.
 * Não depende de React. Recebe dados, retorna atualizações.
 */

const safeFloat = (v) => { 
    const f = parseFloat(v); 
    return isNaN(f) ? 0 : f; 
};

// Calcula SC e IMC
export const calculateBiometry = (data) => {
    let updates = {};
    const p = safeFloat(data.peso);
    const a = safeFloat(data.altura);

    if (p > 0 && a > 0) {
        // Superfície Corpórea (Du Bois)
        const sc = 0.007184 * Math.pow(p, 0.425) * Math.pow(a, 0.725);
        updates.sc = sc.toFixed(2);

        // IMC
        const alturaMetros = a / 100;
        const imc = p / (alturaMetros * alturaMetros);
        updates.imc = imc.toFixed(1).replace('.', ',');
    }
    return updates;
};

// Calcula Função Ventricular (FE, Massa, RWT)
export const calculateVentricularFunction = (data) => {
    let updates = {};
    const d = safeFloat(data.ddve); 
    const s = safeFloat(data.dsve); 
    const siv = safeFloat(data.siv); 
    const pp = safeFloat(data.ppve);

    // Validação básica: Diástole deve ser maior que sístole
    if (d > 0 && s > 0 && d > s) {
        // Fração de Ejeção (Teichholz simplificado para cubos)
        const fe = ((Math.pow(d, 3) - Math.pow(s, 3)) / Math.pow(d, 3)) * 100;
        
        // Fração de Encurtamento
        const enc = ((d - s) / d) * 100;
        
        // RWT (Relative Wall Thickness)
        const rwt = (2 * pp) / d;
        
        // Massa VE (Devereux)
        const d_cm = d / 10; 
        const siv_cm = siv / 10; 
        const pp_cm = pp / 10;
        const massa = 0.8 * (1.04 * (Math.pow(d_cm + siv_cm + pp_cm, 3) - Math.pow(d_cm, 3))) + 0.6;

        updates.resFe = fe.toFixed(1).replace('.', ',');
        updates.resEncurtamento = enc.toFixed(1).replace('.', ',');
        updates.resRwt = rwt.toFixed(2).replace('.', ',');
        updates.resMassaVE = massa.toFixed(0);

        // Índice de Massa (se tiver SC)
        const scVal = safeFloat(data.sc);
        if (scVal > 0) {
            const im = massa / scVal;
            updates.resImVE = im.toFixed(2).replace('.', ',');
        }
    }

    return updates;
};

// Função unificadora que roda todos os cálculos
export const runAllCalculations = (data) => {
    const biometryUpdates = calculateBiometry(data);
    
    // Mesclamos updates de biometria antes de calcular função (pois IM depende de SC)
    const dataWithBio = { ...data, ...biometryUpdates };
    const functionUpdates = calculateVentricularFunction(dataWithBio);

    return { ...biometryUpdates, ...functionUpdates };
};