/**
 * Arquivo de Cálculos Matemáticos e Lógica de Datas
 * Objetivo: Funções puras que recebem valores e retornam resultados.
 * Não contém JSX nem Hooks.
 */

// --- HELPERS DE DATA ---

// Formata YYYY-MM-DD para DD/MM/YYYY
export const formatData = (isoStr) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length !== 3) return isoStr;
    const [ano, mes, dia] = parts;
    return `${dia}/${mes}/${ano}`;
};

// Adiciona dias a uma data e retorna objeto Date
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

// Calcula diferença em dias entre duas datas
const diffDays = (d1, d2) => {
    const timeDiff = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24)); 
};

// Converte dias totais em texto "X semanas e Y dias"
const diasParaTextoIG = (totalDias) => {
    const semanas = Math.floor(totalDias / 7);
    const dias = totalDias % 7;
    return `${semanas} semanas e ${dias} dias`;
};

// --- DATAÇÃO (DUM, DPP, ANTERIOR) ---

export const calcularIGeDPP_DUM = (dumIso) => {
    if (!dumIso) return { ig: '', dpp: '' };

    const dataDum = new Date(dumIso + 'T12:00:00'); // Fixa hora para evitar fuso
    const hoje = new Date();

    if (isNaN(dataDum.getTime())) return { ig: '', dpp: '' };

    // IG Atual
    const diff = diffDays(hoje, dataDum);
    const ig = diasParaTextoIG(diff);

    // DPP (DUM + 280 dias)
    const dataDpp = addDays(dataDum, 280);
    const dpp = dataDpp.toLocaleDateString('pt-BR');

    return { ig, dpp, diasTotais: diff };
};

export const calcularIGeDPP_Anterior = (dataExameAnt, semanasAnt, diasAnt) => {
    if (!dataExameAnt) return { ig: '', dpp: '' };

    // Tenta criar a data de forma segura (lidando com timezone)
    const partes = dataExameAnt.split('-'); // Espera YYYY-MM-DD
    const ano = parseInt(partes[0]);
    const mes = parseInt(partes[1]) - 1; // JS conta meses de 0 a 11
    const dia = parseInt(partes[2]);
    
    const dAnt = new Date(ano, mes, dia, 12, 0, 0); // Meio-dia para evitar fuso
    const hoje = new Date();
    hoje.setHours(12,0,0,0); // Normaliza hoje também

    if (isNaN(dAnt.getTime())) return { ig: '', dpp: '' };

    // Dias totais da gestação na data do exame anterior
    const s = parseInt(semanasAnt) || 0;
    const d = parseInt(diasAnt) || 0;
    const igAnteriorEmDias = (s * 7) + d;
    
    // Dias passados desde o exame até hoje
    // Diferença em milissegundos / ms por dia
    const diffTime = hoje.getTime() - dAnt.getTime();
    const diasPassados = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diasPassados < 0) return { ig: 'Data futura?', dpp: '' };

    // IG Atual Corrigida
    const igAtualTotalDias = igAnteriorEmDias + diasPassados;
    const semanasAtual = Math.floor(igAtualTotalDias / 7);
    const diasAtual = igAtualTotalDias % 7;
    const igTexto = `${semanasAtual} semanas e ${diasAtual} dias`;

    // DPP Corrigida (Data Anterior + (280 - IG Anterior))
    const diasFaltantes = 280 - igAnteriorEmDias;
    const dataDpp = new Date(dAnt);
    dataDpp.setDate(dataDpp.getDate() + diasFaltantes);
    
    const dppTexto = dataDpp.toLocaleDateString('pt-BR');

    return { ig: igTexto, dpp: dppTexto };
};

// --- NOVO: CÁLCULO DA MÉDIA BIOMÉTRICA (Hadlock) ---
export const calcularMediaBiometria = (dados) => {
    let totalSemanas = 0;
    let count = 0;

    // Helper: Converte mm para semanas (Hadlock)
    const calc = (val, type) => {
        if (!val || isNaN(val)) return 0;
        const v = parseFloat(val) / 10; // converte para cm
        // Fórmulas simplificadas de regressão (Hadlock / Jeanty)
        if (type === 'dbp') return 9.54 + (1.482 * v) + (0.1676 * v * v);
        if (type === 'cc') return 8.96 + (0.540 * v) + (0.0003 * Math.pow(v, 3));
        if (type === 'ca') return 8.14 + (0.753 * v) + (0.0036 * v * v);
        if (type === 'femur') return 10.35 + (2.460 * v) + (0.170 * v * v);
        return 0;
    };

    // Soma as idades calculadas das medidas principais
    const igDbp = calc(dados.dbp, 'dbp');
    if (igDbp > 0) { totalSemanas += igDbp; count++; }

    const igCc = calc(dados.cc, 'cc');
    if (igCc > 0) { totalSemanas += igCc; count++; }

    const igCa = calc(dados.ca, 'ca');
    if (igCa > 0) { totalSemanas += igCa; count++; }

    const igFemur = calc(dados.femur, 'femur');
    if (igFemur > 0) { totalSemanas += igFemur; count++; }

    // Se não tiver medidas suficientes, retorna vazio
    if (count === 0) return { ig: '', dpp: '' };

    // Calcula média
    const mediaSemanas = totalSemanas / count;
    
    // Converte para Texto "X semanas e Y dias"
    const w = Math.floor(mediaSemanas);
    const d = Math.round((mediaSemanas - w) * 7);
    const diasFinais = d === 7 ? 0 : d;
    const semanasFinais = d === 7 ? w + 1 : w;
    
    const igTexto = `${semanasFinais} semanas e ${diasFinais} dias`;

    // Calcula DPP baseada nessa biometria (Data do Exame + Dias Restantes para 40sem)
    // 40 semanas = 280 dias.
    const diasTotaisGestacao = (semanasFinais * 7) + diasFinais;
    const diasRestantes = 280 - diasTotaisGestacao;
    
    const hoje = new Date();
    const dataDpp = new Date(hoje);
    dataDpp.setDate(hoje.getDate() + diasRestantes);
    
    const dppTexto = dataDpp.toLocaleDateString('pt-BR');

    return { ig: igTexto, dpp: dppTexto };
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

// Regra de Hellman: Dias = DMSG(mm) + 30
export const calcularIGDmsg = (dmsgValor) => {
    if (!dmsgValor) return '';
    // Converte string "4,3" para float 4.3
    const dmsg = parseFloat(dmsgValor.toString().replace(',', '.'));
    
    if (isNaN(dmsg) || dmsg <= 0) return '';

    const diasTotais = Math.round(dmsg + 30);
    const semanas = Math.floor(diasTotais / 7);
    const dias = diasTotais % 7;

    return `${semanas} semanas e ${dias} dias`;
};

// --- NOVO: CÁLCULO DE CCN (EMBRIÃO) ---
// Regra simplificada: Dias = CCN(mm) + 42
export const calcularIG_CCN = (ccnMm) => {
    if (!ccnMm) return '';
    const ccn = parseFloat(ccnMm);
    if (isNaN(ccn) || ccn <= 0) return '';

    const diasTotais = Math.round(ccn + 42);
    const semanas = Math.floor(diasTotais / 7);
    const dias = diasTotais % 7;

    return `${semanas} semanas e ${dias} dias`;
};

// --- BIOMETRIA E ÍNDICES ---

export const calcularIndicesBiometricos = (dados) => {
    const dbp = parseFloat(dados.dbp);
    const dof = parseFloat(dados.dof);
    const cc = parseFloat(dados.cc);
    const ca = parseFloat(dados.ca);
    const femur = parseFloat(dados.femur);

    const safeDiv = (num, den, scale = 1) => {
        if (!num || !den || isNaN(num) || isNaN(den)) return '';
        return ((num / den) * scale).toFixed(scale === 100 ? 0 : 2).replace('.', ',');
    };

    return {
        ic: safeDiv(dbp, dof, 100),       // Índice Cefálico (DBP/DOF * 100)
        ccCa: safeDiv(cc, ca, 1),         // CC / CA
        cfCa: safeDiv(femur, ca, 100),    // (Fêmur / CA) * 100
        cfDbp: safeDiv(femur, dbp, 100),  // (Fêmur / DBP) * 100
        cfCc: safeDiv(femur, cc, 100)     // (Fêmur / CC) * 100
    };
};

export const calcularVolumeElipsoide = (d1, d2, d3) => {
    const v1 = parseFloat(d1);
    const v2 = parseFloat(d2);
    const v3 = parseFloat(d3);
    if (!isNaN(v1) && !isNaN(v2) && !isNaN(v3)) {
        // Fórmula do elipsoide: v1 * v2 * v3 * 0.523 / 1000 (para cm³)
        return (v1 * v2 * v3 * 0.000523).toFixed(1).replace('.', ',');
    }
    return '';
};