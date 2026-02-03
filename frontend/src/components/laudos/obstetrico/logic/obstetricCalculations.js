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

// --- TABELA OFICIAL CCN (Robinson & Fleming 1975)  ---
const CCN_TABLE = {
    4: 42, 5: 44, 6: 46, 7: 48, 8: 49, 9: 51, 10: 53, 11: 55, 12: 56, 13: 58, 
    14: 60, 15: 62, 16: 63, 18: 66, 20: 69, 22: 70, 24: 72, 26: 74, 28: 76, 
    30: 77, 32: 79, 34: 81, 36: 83, 38: 84, 40: 85, 42: 86, 44: 87, 46: 88, 
    48: 89, 50: 90, 52: 91, 54: 92, 56: 93, 58: 94, 60: 95, 62: 96, 64: 97
};

export const calcularIG_CCN = (ccnMm) => {
    if (!ccnMm) return '';
    const ccn = parseFloat(ccnMm);
    if (isNaN(ccn) || ccn < 4) return ''; 
    if (ccn > 84) return 'Superior a 13s6d'; // Limite máximo da técnica [cite: 3, 9]

    let diasTotais;
    if (CCN_TABLE[ccn]) {
        diasTotais = CCN_TABLE[ccn];
    } else {
        // Interpolação para valores quebrados (ex: 17mm)
        const keys = Object.keys(CCN_TABLE).map(Number).sort((a, b) => a - b);
        let inf = keys[0], sup = keys[keys.length - 1];
        for (let i = 0; i < keys.length; i++) {
            if (keys[i] > ccn) { sup = keys[i]; inf = keys[i - 1]; break; }
        }
        const proporcao = (ccn - inf) / (sup - inf);
        diasTotais = Math.round(CCN_TABLE[inf] + (CCN_TABLE[sup] - CCN_TABLE[inf]) * proporcao);
    }

    const semanas = Math.floor(diasTotais / 7);
    const dias = diasTotais % 7;
    return `${semanas} semanas e ${dias} dias`;
};

// MOTOR DE DECISÃO: Aplica as regras de redatação 
export const decidirVereditoDatacao = (dados) => {
    const igCcnStr = calcularIG_CCN(dados.ccn);
    const igDumRes = calcularIGeDPP_DUM(dados.dum);
    
    // 1. Se DUM estiver desligada ou vazia, usa o CCN (mesmo que vazio)
    if (!dados.usarDum || !dados.dum) return { final: igCcnStr, motivo: 'CCN' };

    const parseDias = (str) => {
        const m = str.match(/(\d+) semanas e (\d+) dias/);
        return m ? (parseInt(m[1]) * 7) + parseInt(m[2]) : null;
    };

    const dCcn = parseDias(igCcnStr);
    const dDum = parseDias(igDumRes.ig);

    // 2. Se temos AMBOS (DUM e CCN), fazemos a comparação técnica
    if (dCcn && dDum) {
        const diff = Math.abs(dCcn - dDum);
        // Nota 7: Até 8s6d (62 dias), redatar se diferença > 5 dias [cite: 7]
        if (dCcn <= 62 && diff > 5) return { final: igCcnStr, motivo: 'CCN_REDATADO' };
        // Nota 8: De 9s0d a 13s6d, redatar se diferença > 7 dias [cite: 8]
        if (dCcn > 62 && dCcn <= 97 && diff > 7) return { final: igCcnStr, motivo: 'CCN_REDATADO' };
        
        // Se a diferença for aceitável, Mantém a DUM
        return { final: igDumRes.ig, motivo: 'DUM' };
    }
    // 3. CORREÇÃO CRÍTICA AQUI:
    // Se temos DUM mas NÃO temos CCN (campo vazio), o motivo deve ser DUM, não 'INDEFINIDO'.
    if (dDum && !dCcn) {
        return { final: igDumRes.ig, motivo: 'DUM' };
    }

    // Fallback final
    return { final: igCcnStr || igDumRes.ig, motivo: 'INDEFINIDO' };
};

// --- CÁLCULO DE PESO FETAL (HADLOCK 4) ---
// Esta função agora é restrita: ou calcula com precisão total ou não calcula.
const calcularPesoHadlock4 = (dbp, cc, ca, fl) => {
    const BPD = parseFloat(dbp) / 10;
    const HC = parseFloat(cc) / 10;
    const AC = parseFloat(ca) / 10;
    const FL = parseFloat(fl) / 10;

    // Se qualquer medida for zero, nula ou inválida, interrompe o cálculo imediatamente.
    // Isso evita o erro de "informações desencontradas" no peso.
    if (!BPD || !HC || !AC || !FL || BPD <= 0 || HC <= 0 || AC <= 0 || FL <= 0) {
        return null;
    }

    // Fórmula Hadlock 4 (Log10)
    const logWeight = 1.3596 
        - (0.00386 * AC * FL) 
        + (0.0064 * HC) 
        + (0.00061 * BPD * AC) 
        + (0.0424 * AC) 
        + (0.174 * FL);
    
    return Math.round(Math.pow(10, logWeight)); 
};

// --- ÍNDICES BIOMÉTRICOS & MÉDIAS ---
export const calcularIndicesBiometricos = (dados) => {
    const dbp = parseFloat(dados.dbp);
    const dof = parseFloat(dados.dof);
    const cc = parseFloat(dados.cc);
    const ca = parseFloat(dados.ca);
    const femur = parseFloat(dados.femur);

    const safeDiv = (num, den, scale = 1, fixed = 2) => {
        if (!num || !den || isNaN(num) || isNaN(den)) return '';
        const val = (num / den) * scale;
        return val.toFixed(fixed).replace('.', ',');
    };

    // Cálculos de índices (mantidos para análise de morfologia)
    const resIc = safeDiv(dbp, dof, 100, 0);   
    const resCcCa = safeDiv(cc, ca, 1, 2);     
    const resCfCa = safeDiv(femur, ca, 100, 1); 
    const resCfCc = safeDiv(femur, cc, 100, 1); 

    // O peso agora só será atribuído se a função rigorosa acima retornar um valor
    let pesoEstimado = '';
    const peso = calcularPesoHadlock4(dbp, cc, ca, femur);
    if (peso) pesoEstimado = peso.toString();

    return { resIc, resCcCa, resCfCa, resCfCc, pesoEstimado };
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
    
    // ALTERAÇÃO AQUI: Exigir pelo menos 2 medidas para dar um veredito de IG.
    // Se tiver só o fêmur, ele não deve mudar a "Idade Gestacional" do laudo sozinho.
    if (validos.length < 2) return { ig: '', dpp: '' };

    const totalDays = validos.reduce((a, b) => a + b, 0) / validos.length;
    
    const semanas = Math.floor(totalDays / 7);
    const dias = Math.floor(totalDays % 7);

    // Calcula DPP baseada nessa média
    const hoje = new Date();
    const diasRestantes = 280 - totalDays;
    const dppDate = addDays(hoje, diasRestantes);

    return {
        ig: `${semanas} semanas e ${dias} dias`,
        dpp: formatData(dppDate.toISOString().split('T')[0])
    };
};

// --- CÁLCULO DE VOLUME OVARIANO ---
export const calcularVolumeOvario = (m1, m2, m3) => {
    const v1 = parseFloat(m1);
    const v2 = parseFloat(m2);
    const v3 = parseFloat(m3);

    if (!isNaN(v1) && !isNaN(v2) && !isNaN(v3) && v1 > 0 && v2 > 0 && v3 > 0) {
        // Medidas em mm, resultado em cm³ -> (m1 * m2 * m3) * 0.523 / 1000
        const vol = (v1 * v2 * v3 * 0.523) / 1000;
        return vol.toFixed(1).replace('.', ',');
    }
    return '';
};