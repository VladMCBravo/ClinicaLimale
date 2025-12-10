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
    // NOVO: Localização específica do feto (Ex: "à direita da mãe" para gêmeos)
    localizacaoFeto: '', 
    
    // NOVO: Tipo de Gemelaridade (Define Corionicidade/Amnionicidade)
    // Geralmente definido no Feto 1, mas mantemos no estado para replicar
    corionicidade: 'dicoriônica', // monocoriônica, dicoriônica
    amnionicidade: 'diamniótica', // diamniótica, monoamniótica

    bexigaMaterna: 'não visualizada',
    situacao: 'longitudinal', apresentacao: 'cefálica', dorso: 'à direita',
    bcf: '140', movFetal: true, 
    degluticao: false, 
    estomagoVisualizado: true, bexigaVisualizada: true,

    // --- PLACENTA E LÍQUIDO ---
    placentaLocalizacao: 'corporal posterior', placentaGrau: '0', placentaEspessura: '',
    liquidoAmniotico: 'Normal',
    ila: '', 
    mbv: '', // NOVO: Maior Bolsão Vertical (Para Gemelares)
    ilaRefMin: '', ilaRefMax: '',

    // --- BIOMETRIA ---
    dbp: '', dof: '', cc: '', ca: '', femur: '', umero: '',
    ulna: '', tibia: '', radio: '', fibula: '', 
    cerebelo: '', cisternaMagna: '', pregaNucal: '', ossoNasal: '', tnMedida: '',
    
    // NOVOS CAMPOS DO MORFOLÓGICO/CLIENTE:
    orbitaExterna: '', 
    orbitaInterna: '',
    ventriculoPosterior: '',
    peMedida: '', // Comprimento do Pé
    compBexiga: '', // Comprimento da Bexiga (Morfo 1º Tri)

    // Indices
    resIc: '', resCcCa: '', resCfCa: '',

    // --- DOPPLER (Checkboxes que faltavam no inicial) ---
    usarDoppler: false,
    
    // Uterinas
    checkUtDir: false, utDirIP: '', utDirIR: '', utDirSD: '', utDirIncisura: false,
    checkUtEsq: false, utEsqIP: '', utEsqIR: '', utEsqSD: '', utEsqIncisura: false,
    ipMedioUterinas: '', // NOVO: Para exibir a média calculada
    
    // Umbilical
    checkUmb: false, umbIP: '', umbIR: '', umbSD: '', 
    umbTraçadoNormal: true, umbDiastoleBaixa: false, umbDiastoleZero: false, umbDiastoleReversa: false,
    
    // Cerebral
    checkAcm: false, acmPVS: '', acmSD: '', acmIR: '', acmIP: '', 
    acmTraçadoNormal: true, acmDiastoleAlta: false,
    relacaoCerebroUmbilical: '',

    // Ducto Venoso
    checkDv: false, dvIP: '', dvTraçadoNormal: true, dvOndaAZero: false, dvOndaAReversa: false,

    // --- INICIAL / 1º TRI ---
    sg1: '', sg2: '', sg3: '', resDmsg: '', resIgSg: '',
    ccn: '', resIgCcn: '',
    embriaoNaoVisualizado: false,
    vesiculaVitelina: true, citarVv: true,
    trofoblasto: 'normal',
    sgComDescolamento: false, sgSemDescolamento: true, desc1: '', desc2: '',
    sgAbortoIncompleto: false,
    comprimentoColo: '', // Usado no Transvaginal

    // --- MORFOLÓGICO 1º TRI (RISCOS) ---
    // NOVOS CAMPOS PEDIDOS PELO CLIENTE
    riscoIdade: '', // Ex: "1:1400"
    riscoExame: '', // Ex: "1:5000"
    ossoNasalPresente: true, // Checkbox específico

    // --- MORFOLOGIA (Checkboxes) ---
    morfCranio: true, morfFace: true, morfColuna: true, morfCoracao: true,
    morfTorax: true, morfParedeAbd: true, morfEstomago: true, morfRins: true,
    morfBexiga: true, morfMembros: true,
    morfCerebro: true, morfVasosBase: true, morfFigado: true, morfGenitalia: true,

    // --- 3D / 4D ---
    usar3D: false,
    
    // Técnica e Qualidade
    modoSurface: true,
    modoMultiplanar: true,
    qualidade3D: 'boa', // otima, boa, regular, ruim
    fatorLimitante: '', // 'posicao', 'liquido', 'biotipo', 'placenta'

    // Morfologia 3D (Estática)
    face3D: 'visualizada', 
    labios3D: true,
    nariz3D: true,
    olhos3D: true,
    orelhas3D: false,
    
    maoDir3D: false, maoEsq3D: false,
    peDir3D: false, peEsq3D: false,
    coluna3D: false, // Avaliação de superfície da coluna

    // Comportamento 4D (Dinâmica)
    movBocejo: false,
    movSorriso: false,
    movLingua: false, // Extrusão da língua
    movPiscar: false,
    movBoca: false, // Abertura de boca
    
    movMaoFace: false,
    movMaoBoca: false,
    movSuccao: false,
    movDegluticao3D: false, // Diferente da 2D

    obs3D: '',

    // --- CONCLUSÃO ---
    pesoEstimado: '', pesoP10: '', pesoP90: '', percentil: '',
    sexoFetal: 'MASCULINO', // Ou 'FEMININO', 'NAO_CITAR', 'DUVIDA'
    obsAdicionais: '',

    // --- FRASES PRONTAS / SUGESTÕES (NOVOS CAMPOS) ---
    sugereDopplerRciu: false,   // RCIU / Oligoâmnio
    semDadosPercentil: false,   // Falta de dados para calcular
    morfoPrejudicado45mm: false, // CCN < 45mm
    sugereNipt: false,          // Estudo genético
    
    // Novas Frases do Cliente:
    sugereGolfBall: false,      // "Foco ecogênico..."
    sugerePieloectasia: false,  // "Dilatação pielo-calicial..."
    sugereRciu: false           // Reforço para RCIU
};