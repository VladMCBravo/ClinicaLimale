export const initialState = {
    subtipo: 'OBSTETRICO_2_3_TRI', 
    
    // --- DATAÇÃO ---
    dum: '', usarDum: true, exibirDataDum: false, citarDppDum: false,
    dumDesconhecida: false, naoUsarDum: false,
    
    igDum: '', dppDum: '',
    igBiometria: '', dppBiometriaCalculada: '', citarDppBiometria: false,

    // Exame Anterior
    usarExameAnterior: false,
    dataExameAnterior: '', igAnteriorSemanas: '', igAnteriorDias: '',
    igIgCorrigidaCalculada: '', dppIgCorrigidaCalculada: '',

    // --- DADOS GERAIS ---
    bexigaMaterna: 'não visualizada',
    situacao: 'longitudinal', apresentacao: 'cefálica', dorso: 'à direita',
    bcf: '140', movFetal: true, 
    degluticao: false, // <--- ADICIONADO (Faltava este)
    estomagoVisualizado: true, bexigaVisualizada: true,

    // --- BIOMETRIA ---
    dbp: '', dof: '', cc: '', ca: '', femur: '', umero: '',
    ulna: '', tibia: '', radio: '', fibula: '', 
    cerebelo: '', cisternaMagna: '', pregaNucal: '', ossoNasal: '', tnMedida: '',
    
    // Indices
    resIc: '', resCcCa: '', resCfCa: '',

    // --- DOPPLER (Checkboxes que faltavam no inicial) ---
    usarDoppler: false,
    
    // Uterinas
    checkUtDir: false, utDirIP: '', utDirIR: '', utDirSD: '', utDirIncisura: false,
    checkUtEsq: false, utEsqIP: '', utEsqIR: '', utEsqSD: '', utEsqIncisura: false,
    
    // Umbilical
    checkUmb: false, umbIP: '', umbIR: '', umbSD: '', 
    umbTraçadoNormal: true, umbDiastoleBaixa: false, umbDiastoleZero: false, umbDiastoleReversa: false,
    
    // Cerebral
    checkAcm: false, acmPVS: '', acmSD: '', acmIR: '', acmIP: '', 
    acmTraçadoNormal: true, acmDiastoleAlta: false,
    relacaoCerebroUmbilical: '',

    // Ducto Venoso
    checkDv: false, dvIP: '', dvTraçadoNormal: true, dvOndaAZero: false, dvOndaAReversa: false,

    // --- 3D / 4D ---
    usar3D: false,
    qualidade3D: 'boa', // boa, regular, prejudicada
    face3D: 'visualizada', // visualizada, não visualizada, prejudicada
    mao3D: false,
    pe3D: false,
    obs3D: '', // Para descrever "mímica facial", "bocejo", etc.

    // --- CONCLUSÃO ---
    pesoEstimado: '', pesoP10: '', pesoP90: '', percentil: '',
    sexoFetal: 'MASCULINO',
    obsAdicionais: '',

    // --- FRASES PRONTAS / SUGESTÕES (NOVOS CAMPOS) ---
    sugereDopplerRciu: false,   // Frase do percentil < 10
    semDadosPercentil: false,   // Frase da falta de DUM/Exame anterior
    morfoPrejudicado45mm: false, // CCN < 45mm
    sugereNipt: false,          // Estudo genético
};