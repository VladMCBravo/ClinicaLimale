/**
 * ARQUIVO DE CÁLCULOS OBSTÉTRICOS (PADRÃO HADLOCK)
 * Unidades de Entrada: MM (Milímetros)
 * Unidades de Cálculo Interno: CM (Centímetros) para Hadlock
 */

// --- HELPERS DE DATA ---
export const formatData = (isoStr) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length !== 3) return isoStr;
    const [ano, mes, dia] = parts;
    return `${dia}/${mes}/${ano}`;
};

export const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

export const diffDays = (d1, d2) => {
    const timeDiff = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24)); 
};

// --- DATAÇÃO PELA DUM ---
export const calcularIGeDPP_DUM = (dumIso) => {
    if (!dumIso) return { ig: '', dpp: '' };
    const dum = new Date(dumIso + 'T12:00:00'); // Fix fuso horário
    const hoje = new Date();
    
    // IG: Diferença entre DUM e Hoje
    const diff = diffDays(dum, hoje);
    const semanas = Math.floor(diff / 7);
    const dias = diff % 7;

    // DPP: DUM + 280 dias
    const dppDate = addDays(dum, 280);
    const dpp = dppDate.toISOString().split('T')[0]; // YYYY-MM-DD

    return { 
        ig: `${semanas} semanas e ${dias} dias`,
        dpp: formatData(dpp)
    };
};

// --- DATAÇÃO PELO USG ANTERIOR ---
export const calcularIGeDPP_Anterior = (dataExameAntIso, igSem, igDias) => {
    if (!dataExameAntIso || !igSem) return { ig: '', dpp: '' };
    
    const dtAnt = new Date(dataExameAntIso + 'T12:00:00');
    const hoje = new Date();
    
    // Dias passados desde o exame anterior
    const diasPassados = diffDays(dtAnt, hoje);
    
    // IG Total em dias (IG na época + dias passados)
    const igTotalDias = (parseInt(igSem) * 7) + parseInt(igDias || 0) + diasPassados;
    
    const semanas = Math.floor(igTotalDias / 7);
    const dias = igTotalDias % 7;

    // DPP Projetada: Data Anterior + (280 - dias de IG na época)
    const diasRestantesPara40 = 280 - ((parseInt(igSem) * 7) + parseInt(igDias || 0));
    const dppDate = addDays(dtAnt, diasRestantesPara40);

    return {
        ig: `${semanas} semanas e ${dias} dias`,
        dpp: formatData(dppDate.toISOString().split('T')[0])
    };
};

// --- CÁLCULOS DE SACO GESTACIONAL (1º TRI) ---
export const calcularDMSG = (sg1, sg2, sg3) => {
    const v1 = parseFloat(sg1);
    const v2 = parseFloat(sg2);
    const v3 = parseFloat(sg3);
    if (!isNaN(v1) && !isNaN(v2) && !isNaN(v3)) {
        return ((v1 + v2 + v3) / 3).toFixed(1).replace('.', ',');
    }
    return '';
};

export const calcularIGDmsg = (dmsgValor) => {
    if (!dmsgValor) return '';
    const dmsg = parseFloat(dmsgValor.toString().replace(',', '.'));
    if (isNaN(dmsg) || dmsg <= 0) return '';
    const diasTotais = Math.round(dmsg + 30); // Regra de Hellman
    const semanas = Math.floor(diasTotais / 7);
    const dias = diasTotais % 7;
    return `${semanas} semanas e ${dias} dias`;
};

// --- DATAÇÃO PELO CCN (1º TRI) ---
export const calcularIG_CCN = (ccnMm) => {
    if (!ccnMm) return '';
    const ccn = parseFloat(ccnMm);
    if (isNaN(ccn) || ccn <= 0) return '';

    // Fórmula Robinson: Dias = CCN(mm) + 42
    const diasTotais = Math.round(ccn + 42);
    const semanas = Math.floor(diasTotais / 7);
    const dias = diasTotais % 7;

    return `${semanas} semanas e ${dias} dias`;
};

// --- CÁLCULO DE PESO FETAL (HADLOCK 4) ---
// Usa: DBP, CC, CA, Fêmur (Entrada em mm -> Converte para cm)
const calcularPesoHadlock4 = (dbp, cc, ca, fl) => {
    const BPD = parseFloat(dbp) / 10;
    const HC = parseFloat(cc) / 10;
    const AC = parseFloat(ca) / 10;
    const FL = parseFloat(fl) / 10;

    if (isNaN(BPD) || isNaN(HC) || isNaN(AC) || isNaN(FL) || 
        BPD <= 0 || HC <= 0 || AC <= 0 || FL <= 0) return null;

    // Fórmula Hadlock 4 (Log10)
    // Log10(BW) = 1.3596 - 0.00386(AC*FL) + 0.0064(HC) + 0.00061(BPD*AC) + 0.0424(AC) + 0.174(FL)
    const termo1 = 1.3596;
    const termo2 = 0.00386 * AC * FL;
    const termo3 = 0.0064 * HC;
    const termo4 = 0.00061 * BPD * AC;
    const termo5 = 0.0424 * AC;
    const termo6 = 0.174 * FL;

    const logWeight = termo1 - termo2 + termo3 + termo4 + termo5 + termo6;
    
    // Converte Log10 para valor real
    const peso = Math.pow(10, logWeight);
    return Math.round(peso); // Retorna em gramas
};

// --- ÍNDICES BIOMÉTRICOS & MÉDIAS ---
export const calcularIndicesBiometricos = (dados) => {
    const dbp = parseFloat(dados.dbp);
    const dof = parseFloat(dados.dof);
    const cc = parseFloat(dados.cc);
    const ca = parseFloat(dados.ca);
    const femur = parseFloat(dados.femur);

    // Helper para divisão segura com casas decimais
    const safeDiv = (num, den, scale = 1, fixed = 2) => {
        if (!num || !den || isNaN(num) || isNaN(den)) return '';
        const val = (num / den) * scale;
        return val.toFixed(fixed).replace('.', ',');
    };

    // 1. Cálculo dos Índices (Nomes corrigidos para bater com o Estado)
    const resIc = safeDiv(dbp, dof, 100, 0);   // Índice Cefálico
    const resCcCa = safeDiv(cc, ca, 1, 2);     // Relação CC/CA
    const resCfCa = safeDiv(femur, ca, 100, 1); // Relação Fêmur/CA
    const resCfCc = safeDiv(femur, cc, 100, 1); // Relação Fêmur/CC

    // 2. Cálculo do Peso (Se tiver as 4 medidas principais)
    let pesoEstimado = '';
    if (dbp && cc && ca && femur) {
        const peso = calcularPesoHadlock4(dbp, cc, ca, femur);
        if (peso) pesoEstimado = peso.toString();
    }

    return {
        resIc,      
        resCcCa,    
        resCfCa,    
        resCfCc,    
        pesoEstimado
    };
};

// --- DATAÇÃO PELA BIOMETRIA (MÉDIA DE HADLOCK) ---
export const calcularMediaBiometria = (dados) => {
    // Converte mm para semanas (Fórmulas aproximadas de Hadlock)
    const getDias = (medida, tipo) => {
        const v = parseFloat(medida) / 10; // cm
        if (!v || isNaN(v)) return null;
        
        let s = 0;
        if (tipo === 'dbp') s = 9.54 + 1.48*v + 0.16*(v*v); 
        if (tipo === 'cc')  s = 8.96 + 0.54*v + 0.0003*(v*v*v);
        if (tipo === 'ca')  s = 8.14 + 0.75*v + 0.0036*(v*v);
        if (tipo === 'femur') s = 10.35 + 2.46*v + 0.17*(v*v);
        
        return s * 7; 
    };

    const dDbp = getDias(dados.dbp, 'dbp');
    const dCc = getDias(dados.cc, 'cc');
    const dCa = getDias(dados.ca, 'ca');
    const dFemur = getDias(dados.femur, 'femur');

    const validos = [dDbp, dCc, dCa, dFemur].filter(d => d !== null);
    
    if (validos.length === 0) return { ig: '', dpp: '' };

    // Média dos dias
    const totalDias = validos.reduce((a, b) => a + b, 0) / validos.length;
    
    const semanas = Math.floor(totalDias / 7);
    const dias = Math.floor(totalDias % 7);

    // Calcula DPP baseada nessa média
    const hoje = new Date();
    const diasRestantes = 280 - totalDias;
    const dppDate = addDays(hoje, diasRestantes);

    return {
        ig: `${semanas} semanas e ${dias} dias`,
        dpp: formatData(dppDate.toISOString().split('T')[0])
    };
};