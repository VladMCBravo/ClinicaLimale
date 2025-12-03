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
    // Nota: Se a DUM for no futuro, a lógica deve tratar, mas assumimos passado
    const ig = diasParaTextoIG(diff);

    // DPP (DUM + 280 dias)
    const dataDpp = addDays(dataDum, 280);
    const dpp = dataDpp.toLocaleDateString('pt-BR');

    return { ig, dpp, diasTotais: diff };
};

export const calcularIGeDPP_Anterior = (dataExameAnt, semanasAnt, diasAnt) => {
    if (!dataExameAnt) return { ig: '', dpp: '' };

    const dAnt = new Date(dataExameAnt + 'T12:00:00');
    const hoje = new Date();

    if (isNaN(dAnt.getTime())) return { ig: '', dpp: '' };

    // Dias totais da gestação na data do exame anterior
    const igAnteriorEmDias = (parseInt(semanasAnt || 0) * 7) + parseInt(diasAnt || 0);
    
    // Dias passados desde o exame até hoje
    const diasPassados = Math.floor((hoje - dAnt) / (1000 * 60 * 60 * 24));
    
    if (diasPassados < 0) return { ig: 'Data futura?', dpp: '' };

    // IG Atual Corrigida
    const igAtualTotalDias = igAnteriorEmDias + diasPassados;
    const ig = diasParaTextoIG(igAtualTotalDias);

    // DPP Corrigida (Data Anterior + (280 - IG Anterior))
    // Lógica: Se ela tinha X dias, faltavam (280 - X) para o parto.
    const diasFaltantes = 280 - igAnteriorEmDias;
    const dataDpp = addDays(dAnt, diasFaltantes);
    const dpp = dataDpp.toLocaleDateString('pt-BR');

    return { ig, dpp };
};

// --- BIOMETRIA E ÍNDICES ---

// Calcula IG estimada por uma medida única (Ex: Fêmur -> Semanas)
// Substitua as fórmulas abaixo pelas tabelas de Hadlock reais quando tivermos os dados precisos
export const calcularIGPorMedida = (tipo, valorMm) => {
    const v = parseFloat(valorMm);
    if (!v || isNaN(v)) return "...";

    let weeks = 0;
    // Fórmulas Aproximadas (PLACEHOLDERS do seu código anterior)
    if (tipo === 'DBP') weeks = Math.sqrt(v) * 3.2; 
    else if (tipo === 'CC') weeks = v / 10;
    else if (tipo === 'CA') weeks = v / 9.5;
    else if (tipo === 'Fêmur') weeks = v / 2.8 + 8;
    else weeks = v / 3 + 5; // Genérico

    return weeks.toFixed(1) + " sem";
};

export const calcularIndicesBiometricos = (dados) => {
    const dbp = parseFloat(dados.dbp);
    const dof = parseFloat(dados.dof);
    const cc = parseFloat(dados.cc);
    const ca = parseFloat(dados.ca);
    const femur = parseFloat(dados.femur);

    // Helper para evitar divisão por zero ou NaN
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

// --- VOLUMES E OUTROS CÁLCULOS ---

export const calcularDMSG = (sg1, sg2, sg3) => {
    const v1 = parseFloat(sg1);
    const v2 = parseFloat(sg2);
    const v3 = parseFloat(sg3);
    if (!isNaN(v1) && !isNaN(v2) && !isNaN(v3)) {
        return ((v1 + v2 + v3) / 3).toFixed(1).replace('.', ',');
    }
    return '';
};

export const calcularVolumeElipsoide = (d1, d2, d3) => {
    const v1 = parseFloat(d1);
    const v2 = parseFloat(d2);
    const v3 = parseFloat(d3);
    if (!isNaN(v1) && !isNaN(v2) && !isNaN(v3)) {
        // Fórmula do elipsoide prolate: d1 * d2 * d3 * 0.523
        // Resultado divide por 1000 se entrada for mm para sair em cm³, ou ajusta conforme necessidade.
        // Assumindo entrada em mm e saida em cm³:
        return (v1 * v2 * v3 * 0.000523).toFixed(1).replace('.', ',');
    }
    return '';
};