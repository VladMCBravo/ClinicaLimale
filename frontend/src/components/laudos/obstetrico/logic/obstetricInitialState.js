// obstetricInitialState.js
export const initialState = {
    subtipo: 'OBSTETRICO_2_3_TRI', 

    // --- DATAÇÃO (Mantido igual) ---
    dum: '', 
    usarDum: true,
    igDum: '', dppDum: '',
    // Datação Manual / Biometria
    igBiometria: '', // Caso não use DUM
    dppBiometriaCalculada: '',

    // --- DADOS DO ÚTERO / TRANSVAGINAL (NOVO) ---
    utero: 'globoso, aumentado de volume', // Para texto inicial
    miometrio: 'homogêneo',
    coloUterino: 'fechado',
    comprimentoColo: '', // em mm
    anexos: 'normais', // "Anexos parauterinos normais"

    // --- DADOS GERAIS & VITALIDADE (Ajustado para o fluxo da médica) ---
    bexigaMaterna: 'não visualizada', // Opções: 'não visualizada', 'repleta', 'vazia'
    situacao: 'longitudinal',
    apresentacao: 'cefálica',
    dorso: 'à direita',
    
    bcf: '140',
    movFetal: true, // "Movimentos fetais presentes"
    
    // Anatomia Visceral Básica
    estomagoVisualizado: true, // "Repleto e de conteúdo anecóide"
    bexigaVisualizada: true,   // "Repleta e de conteúdo anecóide"

    // --- ANEXOS (Novos campos específicos) ---
    placentaLocalizacao: 'corporal', // corporal, anterior, posterior, fúndica...
    placentaGrau: '0', // 0, I, II, III (Grannum)
    placentaEspessura: '', // em mm
    
    liquidoAmniotico: 'Normal', // Normal, Aumentado, Reduzido
    ila: '', // Valor do ILA
    ilaRefMin: '', // Para (Ref: X - Y)
    ilaRefMax: '', 

    // --- BIOMETRIA (Campos padrão mantidos) ---
    dbp: '', dof: '', cc: '', ca: '', femur: '', umero: '',
    ulna: '', tibia: '', radio: '', fibula: '', pe: '',
    cerebelo: '', cisternaMagna: '', ossoNasal: '', pregaNucal: '',

    // --- DOPPLER (Estrutura mantida) ---
    usarDoppler: false,
    
    // Artéria Uterina
    artUterinaDirIP: '', artUterinaDirIR: '', incisuraDir: false,
    artUterinaEsqIP: '', artUterinaEsqIR: '', incisuraEsq: false,
    
    // Artéria Umbilical
    artUmbilicalIP: '', artUmbilicalIR: '', artUmbilicalSD: '',
    umbilicalDiastole: 'normal', // normal, zero, reversa
    
    // Cerebral Média
    artCerebralIP: '', artCerebralIR: '', artCerebralSD: '',
    relacaoCerebroUmbilical: '', // Calculado ou manual

    // Ducto Venoso
    ductoVenosoIP: '', 
    ductoVenosoOndaA: 'positiva',

    // --- CONCLUSÃO ---
    pesoEstimado: '',
    pesoP10: '', // NOVO (Pede no laudo: P10= X)
    pesoP90: '', // NOVO (Pede no laudo: P90= Y)
    percentil: '',
    sexoFetal: 'MASCULINO',
    obsAdicionais: '',
    
    // Checkboxes de controle visual (opcionais, mas bons de manter)
    checkPeso: true
};