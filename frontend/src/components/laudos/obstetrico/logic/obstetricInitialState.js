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
    localizacaoFeto: '', 
    corionicidade: 'dicoriônica', 
    amnionicidade: 'diamniótica', 

    bexigaMaterna: 'não visualizada',
    situacao: 'longitudinal', apresentacao: 'cefálica', dorso: 'à direita',
    bcf: '140', movFetal: true, 
    degluticao: false, 
    estomagoVisualizado: true, bexigaVisualizada: true,

    // --- PLACENTA E LÍQUIDO ---
    placentaLocalizacao: 'corporal posterior', placentaGrau: '0', placentaEspessura: '',
    liquidoAmniotico: 'Normal',
    ila: '', mbv: '', 

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
    umbTraçadoNormal: true, umbDiastoleBaixa: false, umbDiastoleZero: false, umbDiastoleReversa: false,
    
    checkAcm: false, acmPVS: '', acmSD: '', acmIR: '', acmIP: '', 
    acmTraçadoNormal: true, acmDiastoleAlta: false,
    relacaoCerebroUmbilical: '',

    checkDv: false, dvIP: '', dvTraçadoNormal: true, dvOndaAZero: false, dvOndaAReversa: false,

    // --- INICIAL / 1º TRI ---
    sg1: '', sg2: '', sg3: '', resDmsg: '', resIgSg: '',
    ccn: '', resIgCcn: '',
    embriaoNaoVisualizado: false,
    vesiculaVitelina: true, citarVv: true,
    trofoblasto: 'normal',
    sgComDescolamento: false, sgSemDescolamento: true, desc1: '', desc2: '',
    sgAbortoIncompleto: false,
    comprimentoColo: '', 
    
    coloEge: 'presente', 
    coloSludge: 'ausente', 
    coloAfunilamento: true, 
    coloConclusao: 'Colo uterino ecograficamente preservado', 

    // --- MORFOLÓGICO 1º TRI (RISCOS) ---
    // ATUALIZADO CONFORME FOTO DA TABELA
    riscoT21Basal: '', riscoT21Corrigido: '',
    riscoT18Basal: '', riscoT18Corrigido: '',
    riscoT13Basal: '', riscoT13Corrigido: '',
    
    ossoNasalPresente: true,

    // --- MORFOLOGIA (Checkboxes) ---
    morfCranio: true, morfFace: true, morfColuna: true, morfCoracao: true,
    morfTorax: true, morfParedeAbd: true, morfEstomago: true, morfRins: true,
    morfBexiga: true, morfMembros: true,
    morfCerebro: true, morfVasosBase: true, morfFigado: true, morfGenitalia: true,

    // 1º Tri Específicos
    morf1Cerebro: true, morf1Globos: true, morf1Face: true, 
    morf1Estomago: true, morf1Rins: false, morf1Membros: true,
    morf1Cordao: true, morf1OssoNasal: '', citarTn: true,

    // --- 3D / 4D ---
    usar3D: false,
    modoSurface: true, modoMultiplanar: true, qualidade3D: 'boa', fatorLimitante: '',
    face3D: 'visualizada', labios3D: true, nariz3D: true, olhos3D: true, orelhas3D: false,
    maoDir3D: false, maoEsq3D: false, peDir3D: false, peEsq3D: false, coluna3D: false,
    movBocejo: false, movSorriso: false, movLingua: false, movPiscar: false, movBoca: false,
    movMaoFace: false, movMaoBoca: false, movSuccao: false, movDegluticao3D: false,
    obs3D: '',

    // --- CONCLUSÃO ---
    pesoEstimado: '', pesoP10: '', pesoP90: '', percentil: '',
    sexoFetal: 'MASCULINO', 
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