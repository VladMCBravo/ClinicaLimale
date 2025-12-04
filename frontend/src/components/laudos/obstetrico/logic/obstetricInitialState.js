/**
 * Estado Inicial Completo do Formulário Obstétrico
 * Contém todos os campos controlados pelo React (Inputs, Checkboxes, Radios)
 */

export const initialState = {
    // TIPO DE EXAME
    subtipo: 'OBSTETRICO_MORFOLOGICO', // Opções: 'OBSTETRICO_1_TRI', 'OBSTETRICO_MORFOLOGICO', etc.

    // --- DATAÇÃO & DATAS ---
    dum: '', 
    usarDum: true, 
    dumDesconhecida: false, 
    naoUsarDum: false,
    
    // Campos calculados automaticamente (para salvar no banco)
    igDum: '', 
    dppDum: '',

    // Configurações de Texto da Datação
    exibirDataDum: true, 
    citarDppDum: false, 
    usarDumComoBase: false, // Se true, a IG do exame é travada na DUM

    // DPP pela Biometria
    citarDppBiometria: false,
    dppBiometriaCalculada: '', // Campo auxiliar (não editável pelo usuário, calculado pelo sistema)

    // Datação por Exame Anterior
    referirIgAnterior: false, 
    usarIgAnteriorComoBase: false,
    dataExameAnterior: '', 
    igAnteriorSemanas: '', 
    igAnteriorDias: '',
    citarDppIgCorrigida: false,
    dppIgCorrigidaCalculada: '', // Campo auxiliar

    // --- 1º TRIMESTRE (Dados Maternos e Saco Gestacional) ---
    viaExame: 'transvaginal',
    
    // Útero
    citarUteroMedidas: true, 
    ut1: '', ut2: '', ut3: '',
    citarNodulo: false, 
    nod1: '', nod2: '', nodTipo: 'subseroso', nodLocal: 'fúndica',
    
    // Colo (1º Tri)
    citarColo1Tri: true, 
    citarCompColo1Tri: false, 
    medidaColo1Tri: '',

    // Anexos (Ovários)
    corpoLuteo: 'não citar', 
    citarMedidasAnexo: false, 
    calcVolAnexo: true, 
    anx1: '', anx2: '', anx3: '', 
    resVolAnexo: '', 

    // Saco Gestacional
    citarSg: true, 
    sgLocalizacao: 'fúndica', 
    trofoblasto: 'não citar',
    sg1: '', sg2: '', sg3: '', 
    resDmsg: '', resIgSg: '',
    
    // Descolamento
    sgSemDescolamento: true, 
    sgComDescolamento: false, 
    desc1: '', desc2: '', desc3: '', 
    sgAbortoIncompleto: false,

    // Embrião (1º Tri)
    embriaoNaoVisualizado: false, 
    ccn: '', resIgCcn: '', 
    citarVv: false, vvDiametro: '', 
    bcfIndetectavel: false, // BCF específico de 1 tri

    // Morfologia Precoce (1º Tri)
    morf1Cerebro: true, 
    morf1Estomago: true, 
    morf1Cordao: true, 
    morf1Membros: true, 
    morf1Globos: true, 
    morf1OssoNasal: 'não citar',

    // Translucência Nucal (TN)
    citarTn: false, 
    tnMedida: '', 
    tnObs: true, 
    tnRisco: false, 
    riscoBasal: '1000', 
    riscoCorrigido: '1000',

    // --- 2º/3º TRIMESTRE - DADOS GERAIS ---
    citarColoNormal: false, 
    citarComprimentoColo: false, 
    medidaColo: '',
    situacao: 'longitudinal', 
    apresentacao: 'cefálica', 
    dorso: 'à esquerda',
    
    // --- BIOMETRIA FETAL ---
    dbp: '', dof: '', cc: '', ca: '', femur: '', umero: '',
    ulna: '', tibia: '', radio: '', fibula: '', pe: '',
    cerebelo: '', cisternaMagna: '', ventriculoLat: '', 
    ossoNasal: '', pregaNucal: '',
    
    // Checkboxes de inclusão no cálculo da IG média (se usar essa lógica no futuro)
    incDbp: true, incDof: true, incCc: true, incCa: true, incFemur: true,
    
    // --- CÁLCULOS E ÍNDICES ---
    pesoEstimado: '', 
    percentil: '', 
    checkPeso: true, // Incluir peso na tabela
    
    // Resultados dos Índices (Calculados em tempo real)
    resIc: '', 
    resCcCa: '', 
    resCfCa: '', 
    resCfDbp: '', 
    resCfCc: '',
    
    citarValoresNormais: true, 
    
    // Checkboxes para citar os índices no texto
    checkIndiceCefalico: false, 
    checkRelacaoCcCa: false, 
    checkRelacaoCfCa: false, 
    checkRelacaoCfDbp: false, 
    checkRelacaoCfCc: false,
    
    // --- GRÁFICOS (Configuração de exibição) ---
    checkGraficoPeso: true, 
    checkGraficoDbp: true, 
    checkGraficoFemur: true, 
    checkGraficoUmero: true, 
    checkGraficoCa: true, 
    checkGraficoCc: true,

    // --- MORFOLOGIA (2º/3º Tri) ---
    morfColuna: true, 
    morfCranio: true, 
    morfCerebro: true, 
    morfFace: true,
    morfTorax: true, 
    morfPulmoes: true, 
    morfCoracao: true, 
    morfVasosBase: true,
    morfEstomago: true, 
    morfFigado: true, 
    morfVesicula: false, 
    morfAlcas: false,
    morfRins: true, 
    morfBexiga: true, 
    morfParedeAbd: true,
    morfGenitalia: true, 
    morfMembros: true, 
    morfFalange: false,
    
    sexoFetal: 'MASCULINO',
    
    // --- VITALIDADE E ANEXOS ---
    bcf: '140', 
    movFetal: true, 
    degluticao: false,
    
    // Cordão
    cordaoNormal: true, 
    cordaoCircular: 'não citar',
    
    // Placenta
    placentaInsercao: 'Corporal Posterior', 
    placentaAspecto: 'Normal', 
    placentaEspessura: '',
    
    // Líquido Amniótico
    liquidoVolume: 'Normal', 
    ila: '', 
    maiorBolso: '',
    
    // --- DOPPLERFLUXOMETRIA ---
    usarDoppler: false,
    
    // Artéria Uterina Direita
    checkUtDir: true, 
    checkUtDirSD: false, utDirSD: '', 
    checkUtDirIR: true, utDirIR: '', 
    checkUtDirIP: true, utDirIP: '', 
    utDirIncisura: false,
    
    // Artéria Uterina Esquerda
    checkUtEsq: true, 
    checkUtEsqSD: false, utEsqSD: '', 
    checkUtEsqIR: true, utEsqIR: '', 
    checkUtEsqIP: true, utEsqIP: '', 
    utEsqIncisura: false,
    
    utIpMedio: '', // Média das uterinas

    // Artéria Umbilical
    checkUmb: true, 
    checkUmbSD: false, umbSD: '', 
    checkUmbIR: true, umbIR: '', 
    checkUmbIP: true, umbIP: '', 
    umbTraçadoNormal: true, 
    umbDiastoleBaixa: false, 
    umbDiastoleZero: false, 
    umbDiastoleReversa: false,

    // Artéria Cerebral Média (ACM)
    checkAcm: true, 
    checkAcmPVS: true, acmPVS: '', 
    checkAcmSD: false, acmSD: '', 
    checkAcmIR: true, acmIR: '', 
    checkAcmIP: true, acmIP: '', 
    acmTraçadoNormal: true, 
    acmDiastoleAlta: false,

    // Ducto Venoso
    checkDv: true, 
    checkDvIP: false, dvIP: '', 
    dvTraçadoNormal: true, 
    dvOndaAZero: false, 
    dvOndaAReversa: false,

    // --- CONCLUSÃO ---
    conclusaoNormal: false,          // Desenvolvimento/Geral Normal
    conclusaoMorfologiaNormal: false, // NOVO
    conclusaoDopplerNormal: false,    // NOVO
    conclusaoTnNormal: false,         // NOVO
    
    obsAdicionais: ''
};