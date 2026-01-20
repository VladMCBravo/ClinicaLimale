export const initialState = {
    subtipo: 'OBSTETRICO_2_3_TRI', 
    
    // --- DATAÇÃO ---
    dum: '', usarDum: false, exibirDataDum: false, citarDppDum: false,
    dumDesconhecida: false, naoUsarDum: false,
    
    igDum: '', dppDum: '',
    igBiometria: '', dppBiometriaCalculada: '', citarDppBiometria: false,

    // Exame Anterior
    usarExameAnterior: false,
    dataExameAnterior: '', igAnteriorSemanas: '', igAnteriorDias: '',
    igIgCorrigidaCalculada: '', dppIgCorrigidaCalculada: '',

    // --- DADOS GERAIS ---
    localizacaoFeto: '', 
    corionicidade: '', 
    amnionicidade: '', 

    bexigaMaterna: '',
    situacao: '', apresentacao: '', dorso: '',
    bcf: '', movFetal: false, 
    degluticao: false, 
    estomagoVisualizado: false, bexigaVisualizada: false,

    // --- PLACENTA E LÍQUIDO ---
    placentaLocalizacao: '', placentaGrau: '', placentaEspessura: '',
    liquidoAmniotico: '',
    ila: '', mbv: '',
    // NOVOS CAMPOS (ILA REF)
    ilaRefMin: '', ilaRefMax: '',

    // --- BIOMETRIA ---
    dbp: '', dof: '', cc: '', ca: '', femur: '', umero: '',
    ulna: '', tibia: '', radio: '', fibula: '', 
    cerebelo: '', cisternaMagna: '', pregaNucal: '', ossoNasal: '', tnMedida: '',
    
    // NOVOS CAMPOS DO MORFOLÓGICO/CLIENTE:
    orbitaExterna: '', 
    orbitaInterna: '',
    ventriculoPosterior: '',
    peMedida: '', 
    compBexiga: '', 

    // Indices
    resIc: '', resCcCa: '', resCfCa: '',

    // --- DOPPLER ---
    usarDoppler: false,
    checkUtDir: false, utDirIP: '', utDirIR: '', utDirSD: '', utDirIncisura: false,
    checkUtEsq: false, utEsqIP: '', utEsqIR: '', utEsqSD: '', utEsqIncisura: false,
    ipMedioUterinas: '',
    
    checkUmb: false, umbIP: '', umbIR: '', umbSD: '', 
    umbTraçadoNormal: false, umbDiastoleBaixa: false, umbDiastoleZero: false, umbDiastoleReversa: false,
    
    checkAcm: false, acmPVS: '', acmSD: '', acmIR: '', acmIP: '', 
    acmTraçadoNormal: false, acmDiastoleAlta: false,
    relacaoCerebroUmbilical: '',

    // DUCTO VENOSO (ATUALIZADO PARA NOVA INTERFACE)
    checkDv: false, dvIP: '', 
    dvOndaAPositiva: false, // Novo
    dvOndaAZero: false, 
    dvOndaAReversa: false,

    // --- INICIAL / 1º TRI ---
    sg1: '', sg2: '', sg3: '', resDmsg: '', resIgSg: '',
    ccn: '', resIgCcn: '',
    embriaoNaoVisualizado: false,
    vesiculaVitelina: false, citarVv: false,
    trofoblasto: '',
    sgComDescolamento: false, sgSemDescolamento: false, desc1: '', desc2: '',
    sgAbortoIncompleto: false,
    comprimentoColo: '', 
    
    coloEge: '', 
    coloSludge: '', 
    coloAfunilamento: false, 
    coloConclusao: '', 

    // --- MORFOLÓGICO 1º TRI (RISCOS) ---
    riscoT21Basal: '', riscoT21Corrigido: '',
    riscoT18Basal: '', riscoT18Corrigido: '',
    riscoT13Basal: '', riscoT13Corrigido: '',
    textoRiscosFMF: '', // Novo campo para colar o texto da FMF
    
    ossoNasalPresente: false,

    // --- MORFOLOGIA (Checkboxes) ---
    morfCranio: false, morfFace: false, morfColuna: false, morfCoracao: false,
    morfTorax: false, morfParedeAbd: false, morfEstomago: false, morfRins: false,
    morfBexiga: false, morfMembros: false,
    morfCerebro: false, morfVasosBase: false, morfFigado: false, morfGenitalia: false,

    // 1º Tri Específicos
    morf1Cerebro: false, morf1Globos: false, morf1Face: false, 
    morf1Estomago: false, morf1Rins: false, morf1Membros: false,
    morf1Cordao: false, morf1OssoNasal: '', citarTn: false,

    // --- 3D / 4D ---
    usar3D: false,
    modoSurface: false, modoMultiplanar: false, qualidade3D: '', fatorLimitante: '',
    face3D: '', labios3D: false, nariz3D: false, olhos3D: false, orelhas3D: false,
    maoDir3D: false, maoEsq3D: false, peDir3D: false, peEsq3D: false, coluna3D: false,
    movBocejo: false, movSorriso: false, movLingua: false, movPiscar: false, movBoca: false,
    movMaoFace: false, movMaoBoca: false, movSuccao: false, movDegluticao3D: false,
    obs3D: '',

    // --- CONCLUSÃO ---
    pesoEstimado: '', pesoP10: '', pesoP90: '', percentil: '',
    sexoFetal: '', 
    obsAdicionais: '',

    // --- FRASES PRONTAS ---
    sugereDopplerRciu: false,   
    semDadosPercentil: false,   
    morfoPrejudicado45mm: false, 
    sugereNipt: false,          
    sugereGolfBall: false,      
    sugerePieloectasia: false,  
    sugereRciu: false,      
    
    // --- CAMPOS DE OBSERVAÇÃO (ADICIONE ISTO AQUI) ---
    obsMorfologia: '',
    obsBiometria: '',
    obsDoppler: '',
    obsPlacenta: '',
    obsDatacao: ''
}; // Fim do objeto