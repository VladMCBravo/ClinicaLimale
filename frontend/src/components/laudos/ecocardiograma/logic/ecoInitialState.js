export const ecoInitialState = {
    subtipo: 'ECO_TRANSTORACICO',
    
    // TÉCNICA
    peso: '', altura: '', sc: '', imc: '',
    citarTecnica: true, tecnicaQualidade: 'boa', localExame: 'nao_citar', posicaoPaciente: 'nao_citar',

    // MEDIDAS
    raizAorta: '', aortaAsc: '', arcoAorta: '', atrioEsq: '', volAe: '', 
    ventriculoDir: '', volAd: '', volDiastVd: '', volSistVd: '',
    siv: '', ppve: '', ddve: '', dsve: '', 
    volDiast: '', volSist: '',
    metodoFe: 'Teichholz',
    
    // RESULTADOS CALCULADOS
    resFe: '', resEncurtamento: '', resMassaVE: '', resImVE: '', resRwt: '', 
    
    // ESTRUTURAL
    ritmo: 'Regular',
    camaras: 'Normal', camIndAd: 'normal', camIndAe: 'normal', camIndVd: 'normal', camIndVe: 'normal', camDeformidade: false,
    espessuraVe: 'normal', espessuraVeTipo: 'concentrica', septoSigmoide: '', espessuraVd: 'nao_citar',
    
    // FUNÇÃO
    sistolicoGlobal: 'normal', sistolicoReduzidoVe: false, sistolicoReduzidoVeGrau: 'discreto', sistolicoReduzidoVd: false, sistolicoReduzidoVdGrau: 'discreto', 
    contratilidadeAlterada: false, movAnomaloSepto: false, 
    diastolica: 'normal',

    // VALVAS (Mapeamento completo)
    mitralAspecto: 'normal', mitralEspessura: 'normal', mitralMobilidade: 'normal', mitralAbertura: 'normal', mitralCorda: 'normal', mitralAnel: 'normal', mitralRefluxo: 'ausente', mitralEstenose: 'ausente', mitralArea: '',
    
    triAspecto: 'normal', triEspessura: 'normal', triMobilidade: 'normal', triAbertura: 'normal', triCorda: 'normal', triRefluxo: 'ausente', triEstenose: 'nao_citar', triSeveraArea: '', 
    
    artPulmonar: 'normal', sinaisHipertensao: false, ausenciaSinaisHipertensao: false, checkPsap: false, psap: '', checkPmap: false, pmap: '', 
    pulEstenose: 'ausente', pulPicoVel: '', pulPicoGrad: '', pulAspecto: 'normal', pulRefluxo: 'ausente',

    aortaEstrutura: 'normal', aortaEctasiaRaiz: false, aortaEctasiaAsc: false, aortaEctasiaArco: false, aortaObsNaoVis: false, aortaPlacas: false, aortaAteromatose: false, aortaDisseccao: false, 
    veiaCava: 'nao_citar',
    
    pericardioDerra: 'sem_derrame', periLoculado: false, periCircunferencial: false, periHomogeneo: false, periHeterogeneo: false, periRepercussao: 'nao_citar',
    
    strainGls: '', strainConclusao: 'preservado'
};