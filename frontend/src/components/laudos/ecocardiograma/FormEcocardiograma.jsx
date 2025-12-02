import React, { useState, useEffect, useRef } from 'react';
import { FaHeartbeat } from 'react-icons/fa';
import '../Laudos.css'; 

// Importação das Seções
import SecaoTecnicaEco from './sections_eco/SecaoTecnicaEco';
import SecaoMedidasEco from './sections_eco/SecaoMedidasEco';
import SecaoRitmoCamaras from './sections_eco/SecaoRitmoCamaras';
import SecaoEspessura from './sections_eco/SecaoEspessura';
import SecaoValvaMitral from './sections_eco/SecaoValvaMitral';
import SecaoValvaTricuspide from './sections_eco/SecaoValvaTricuspide';
import SecaoValvaPulmonar from './sections_eco/SecaoValvaPulmonar';
import SecaoFuncaoVentricular from './sections_eco/SecaoFuncaoVentricular';
import SecaoAortaVenaCava from './sections_eco/SecaoAortaVenaCava';
import SecaoPericardio from './sections_eco/SecaoPericardio';
import SecaoStrain from './sections_eco/SecaoStrain'; // <--- IMPORT NOVO

const FormEcocardiograma = ({ onUpdate }) => {
  
  // --- ESTADO COMPLETO (AUDITADO) ---
  const initialState = {
      subtipo: 'ECO_TRANSTORACICO',
      
      // TÉCNICA
      peso: '', altura: '', sc: '', citarTecnica: true, tecnicaQualidade: 'boa', localExame: 'nao_citar', posicaoPaciente: 'nao_citar',

      // MEDIDAS
      raizAorta: '', aortaAsc: '', arcoAorta: '', atrioEsq: '', volAe: '', 
      ventriculoDir: '', volAd: '', volDiastVd: '', volSistVd: '',
      siv: '', ppve: '', ddve: '', dsve: '', 
      volDiast: '', volSist: '', // <--- Volumes VE
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

      // VALVA MITRAL (Tudo mapeado)
      mitralAspecto: 'normal', mitralEspessura: 'normal', 
      mitralMobilidade: 'normal', mitralAbertura: 'normal', // <--- Faltava no texto
      mitralCorda: 'normal', mitralAnel: 'normal', 
      mitralRefluxo: 'ausente', mitralEstenose: 'ausente', mitralArea: '',
      
      // VALVA TRICÚSPIDE (Tudo mapeado)
      triAspecto: 'normal', triEspessura: 'normal', 
      triMobilidade: 'normal', triAbertura: 'normal', // <--- Faltava no texto
      triCorda: 'normal', 
      triRefluxo: 'ausente', triEstenose: 'nao_citar', triSeveraArea: '', 
      
      // PULMONAR
      artPulmonar: 'normal', sinaisHipertensao: false, ausenciaSinaisHipertensao: false, 
      checkPsap: false, psap: '', checkPmap: false, pmap: '',
      pulEstenose: 'ausente', pulPicoVel: '', pulPicoGrad: '', pulAspecto: 'normal', pulRefluxo: 'ausente',

      // VASOS E PERICÁRDIO
      aortaEstrutura: 'normal', aortaEctasiaRaiz: false, aortaEctasiaAsc: false, aortaEctasiaArco: false, 
      aortaObsNaoVis: false, aortaPlacas: false, aortaAteromatose: false, aortaDisseccao: false, 
      veiaCava: 'nao_citar',
      
      pericardioDerra: 'sem_derrame', periLoculado: false, periCircunferencial: false, periHomogeneo: false, periHeterogeneo: false, periRepercussao: 'nao_citar',
  };

  const [data, setData] = useState(initialState);
  const dadosRef = useRef(initialState);

  // --- AUTOMAÇÃO MATEMÁTICA ---
  useEffect(() => {
    let updates = {};
    let houveMudanca = false;
    const safeFloat = (v) => { const f = parseFloat(v); return isNaN(f) ? 0 : f; };

    // SC (Du Bois)
    if (data.peso && data.altura) {
        const p = safeFloat(data.peso); const a = safeFloat(data.altura);
        if (p > 0 && a > 0) {
            const sc = 0.007184 * Math.pow(p, 0.425) * Math.pow(a, 0.725);
            const novoSc = sc.toFixed(4);
            if (data.sc !== novoSc) { updates.sc = novoSc; houveMudanca = true; }
        }
    }
    // FE, Massa, RWT
    if (data.ddve && data.dsve && data.siv && data.ppve) {
        const d = safeFloat(data.ddve); const s = safeFloat(data.dsve); const siv = safeFloat(data.siv); const pp = safeFloat(data.ppve);
        if (d > 0 && s > 0 && d > s) {
            const fe = ((Math.pow(d, 3) - Math.pow(s, 3)) / Math.pow(d, 3)) * 100;
            const enc = ((d - s) / d) * 100;
            const rwt = (2 * pp) / d;
            
            const d_cm = d/10; const siv_cm = siv/10; const pp_cm = pp/10;
            const massa = 0.8 * (1.04 * (Math.pow(d_cm + siv_cm + pp_cm, 3) - Math.pow(d_cm, 3))) + 0.6;

            if (data.resFe !== fe.toFixed(1).replace('.', ',')) { updates.resFe = fe.toFixed(1).replace('.', ','); houveMudanca = true; }
            if (data.resEncurtamento !== enc.toFixed(1).replace('.', ',')) { updates.resEncurtamento = enc.toFixed(1).replace('.', ','); houveMudanca = true; }
            if (data.resRwt !== rwt.toFixed(2).replace('.', ',')) { updates.resRwt = rwt.toFixed(2).replace('.', ','); houveMudanca = true; }
            if (data.resMassaVE !== massa.toFixed(0)) { updates.resMassaVE = massa.toFixed(0); houveMudanca = true; }
            
            if (data.sc && safeFloat(data.sc) > 0) {
                const im = massa / safeFloat(data.sc);
                if (data.resImVE !== im.toFixed(2).replace('.', ',')) { updates.resImVE = im.toFixed(2).replace('.', ','); houveMudanca = true; }
            }
        }
    }
    if (houveMudanca) setData(prev => ({ ...prev, ...updates }));
  }, [data.peso, data.altura, data.ddve, data.dsve, data.siv, data.ppve, data.sc, data.resFe]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // --- GERAÇÃO DE TEXTO E DADOS ESTRUTURADOS ---
  useEffect(() => {
    dadosRef.current = data; 
    const mapTitulos = {
        'ECO_TRANSTORACICO': 'ECOCARDIOGRAMA TRANSTORÁCICO',
        'ECO_DOPPLER': 'ECOCARDIOGRAMA TRANSTORÁCICO COM DOPPLER COLORIDO',
        'ECO_STRAIN': 'ECOCARDIOGRAMA COM ANÁLISE DE DEFORMAÇÃO (STRAIN)',
    };

    // 1. LÓGICA DA TABELA DE MEDIDAS (Igual ao print Turing)
    const tabelaMedidas = [
        { estrutura: 'Raiz aórtica', medida: data.raizAorta ? `${data.raizAorta} mm` : '-', ref: '21-37 mm' },
        { estrutura: 'Átrio esquerdo (AE)', medida: data.atrioEsq ? `${data.atrioEsq} mm` : '-', ref: '25-40 mm' },
        { estrutura: 'Volume indexado do AE', medida: data.volAe ? `${data.volAe} ml/m²` : '-', ref: '16-34 ml/m²' },
        { estrutura: 'VD (paraesternal eixo longo)', medida: data.ventriculoDir ? `${data.ventriculoDir} mm` : '-', ref: '<42 mm' },
        { estrutura: 'Septo ventricular (diástole)', medida: data.siv ? `${data.siv} mm` : '-', ref: 'F<10 mm; M<11 mm' },
        { estrutura: 'Parede posterior do VE (diástole)', medida: data.ppve ? `${data.ppve} mm` : '-', ref: 'F<10 mm; M<11 mm' },
        { estrutura: 'Diâmetro diastólico do VE', medida: data.ddve ? `${data.ddve} mm` : '-', ref: '36-52 mm' },
        { estrutura: 'Diâmetro sistólico do VE', medida: data.dsve ? `${data.dsve} mm` : '-', ref: '26-34 mm' },
        { estrutura: 'Fração de encurtamento', medida: data.resEncurtamento ? `${data.resEncurtamento}%` : '-', ref: '28-44%' },
        { estrutura: `Fração de Ejeção (${data.metodoFe})`, medida: data.resFe ? `${data.resFe}%` : '-', ref: '>55%' },
        { estrutura: 'Índice de massa VE', medida: data.resImVE ? `${data.resImVE} g/m²` : '-', ref: 'F<96; M<116' },
        { estrutura: 'Espessura relativa de parede (RWT)', medida: data.resRwt || '-', ref: '<0,42' },
    ];

    // 2. LÓGICA DE COMENTÁRIOS (Texto descritivo)
    let comentarios = [];
    
    // Ritmo
    comentarios.push(`Ritmo cardíaco ${data.ritmo.toLowerCase()}.`);
    
    // Câmaras
    if(data.camaras === 'Normal') comentarios.push('Tamanho normal das câmaras cardíacas.');
    else comentarios.push(`Alteração das câmaras: ${data.camIndVe !== 'normal' ? 'VE aumentado. ' : ''}${data.camIndAe !== 'normal' ? 'AE aumentado.' : ''}`);

    // VE (Espessura e Função)
    comentarios.push(data.espessuraVe === 'normal' ? 'Espessura miocárdica normal do ventrículo esquerdo.' : `Hipertrofia do ventrículo esquerdo (${data.espessuraVeTipo}).`);
    
    if(data.sistolicoGlobal === 'normal' && !data.sistolicoReduzidoVe) comentarios.push('Desempenho sistólico biventricular preservado.');
    else comentarios.push(`Função sistólica do VE: ${data.sistolicoReduzidoVe ? `Reduzida (${data.sistolicoReduzidoVeGrau})` : 'Preservada'}.`);
    
    comentarios.push(`Índices de função diastólica ${data.diastolica === 'normal' ? 'normais' : `alterados (${data.diastolica.replace(/_/g, ' ')})`}.`);

    // Valvas (Resumo inteligente)
    const valvaAortica = [];
    if(data.aortaEstrutura !== 'normal') valvaAortica.push(`estrutura alterada (${data.aortaEstrutura})`);
    if(data.aortaPlacas) valvaAortica.push('placas de ateroma');
    // Obs: Adicione lógica específica para estenose aórtica se tiver o campo no formulário, senão usamos genérico
    comentarios.push(`Valva aórtica: ${valvaAortica.length > 0 ? valvaAortica.join(', ') : 'Morfologia e dinâmica normais'}.`);

    const mitralResumo = [];
    if(data.mitralEstenose !== 'ausente') mitralResumo.push(`estenose ${data.mitralEstenose}`);
    if(data.mitralRefluxo !== 'ausente') mitralResumo.push(`insuficiência ${data.mitralRefluxo}`);
    comentarios.push(`Valva mitral: ${mitralResumo.length > 0 ? mitralResumo.join(', ') : 'Morfologia e dinâmica normais'}.`);

    const tricuspideResumo = [];
    if(data.triRefluxo !== 'ausente') tricuspideResumo.push(`insuficiência ${data.triRefluxo}`);
    comentarios.push(`Valva tricúspide: ${tricuspideResumo.length > 0 ? tricuspideResumo.join(', ') : 'Morfologia e dinâmica normais'}.`);

    // Aorta e Cava
    if(data.raizAorta) comentarios.push(`Raiz da aorta medindo ${data.raizAorta} mm.`);
    if(data.veiaCava.includes('normal')) comentarios.push('Veia cava inferior com calibre normal e variação respiratória preservada.');

    // Pericardio
    if(data.pericardioDerra === 'sem_derrame') comentarios.push('Ausência de derrame pericárdico.');
    else comentarios.push(`Derrame pericárdico ${data.pericardioDerra.replace('_', ' ')}.`);


    // 3. LÓGICA DE CONCLUSÃO AUTOMÁTICA
    let conclusao = [];
    
    // Ritmo
    if(data.ritmo !== 'Sinusal') conclusao.push(`Ritmo ${data.ritmo}.`);
    
    // Função VE
    if(data.sistolicoReduzidoVe) conclusao.push(`Disfunção sistólica do VE de grau ${data.sistolicoReduzidoVeGrau}.`);
    if(data.diastolica !== 'normal') conclusao.push(`Disfunção diastólica do VE (${data.diastolica.replace(/_/g, ' ')}).`);
    
    // Hipertrofia
    if(data.espessuraVe !== 'normal') conclusao.push(`Hipertrofia ventricular esquerda ${data.espessuraVeTipo}.`);

    // Valvas (Só cita na conclusão se tiver problema)
    if(data.mitralEstenose !== 'ausente') conclusao.push(`Estenose mitral ${data.mitralEstenose}.`);
    if(data.mitralRefluxo !== 'ausente' && data.mitralRefluxo !== 'discreto') conclusao.push(`Insuficiência mitral ${data.mitralRefluxo}.`);
    
    if(data.triEstenose === 'severa') conclusao.push(`Estenose tricúspide severa.`);
    if(data.triRefluxo !== 'ausente' && data.triRefluxo !== 'discreto') conclusao.push(`Insuficiência tricúspide ${data.triRefluxo}.`);

    // Hipertensão Pulmonar
    if(data.sinaisHipertensao) conclusao.push('Sinais ecocardiográficos de hipertensão pulmonar.');

    // Normalidade
    if(conclusao.length === 0) conclusao.push('Exame ecocardiográfico dentro dos limites da normalidade.');


    // Monta o texto de "preview" para a tela (apenas visualização)
    // O PDF usará os dados estruturados, não esse texto cru.
    let textoPreview = "=== TABELA DE MEDIDAS (Ver PDF) ===\n";
    tabelaMedidas.forEach(m => textoPreview += `${m.estrutura}: ${m.medida}\n`);
    textoPreview += "\n=== COMENTÁRIOS ===\n" + comentarios.join('\n');
    textoPreview += "\n\n=== CONCLUSÃO ===\n" + conclusao.join('\n');

    onUpdate({ 
        texto: textoPreview, 
        dadosEstruturados: { ...data, tabelaMedidas, listaComentarios: comentarios, listaConclusao: conclusao }, 
        tituloExame: mapTitulos[data.subtipo] 
    });
  }, [data, onUpdate]);

  return (
    <div className="laudo-container">
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px', paddingBottom:'10px', borderBottom:'1px solid #ccc' }}>
             <FaHeartbeat size={20} color="#1565C0" />
             <span style={{fontWeight:'bold', color:'#333'}}>CONFIGURAÇÃO DO EXAME:</span>
             <select name="subtipo" value={data.subtipo} onChange={handleChange} className="laudo-select" style={{flex:1, fontWeight:'bold', fontSize:'14px', border:'1px solid #1565C0', color:'#1565C0'}}>
                 <option value="ECO_TRANSTORACICO">Ecocardiograma Transtorácico</option>
                 <option value="ECO_DOPPLER">Ecocardiograma Transtorácico com Doppler Colorido</option>
                 <option value="ECO_STRAIN">Eco com Strain</option>
             </select>
        </div>

        <div style={{display:'flex', gap:'10px', alignItems:'flex-start'}}>
            <div style={{flex: '1', minWidth: '400px'}}>
                <SecaoTecnicaEco data={data} handleChange={handleChange} />
                <SecaoMedidasEco data={data} handleChange={handleChange} />
                <SecaoRitmoCamaras data={data} handleChange={handleChange} />
                <SecaoEspessura data={data} handleChange={handleChange} />
                <SecaoFuncaoVentricular data={data} handleChange={handleChange} />
            </div>
            <div style={{flex: '1', minWidth: '400px'}}>
                {/* Lógica de Renderização: Se for Strain, mostra seção extra */}
                {data.subtipo === 'ECO_STRAIN' && <SecaoStrain data={data} handleChange={handleChange} />}
                
                <SecaoValvaMitral data={data} handleChange={handleChange} />
                <SecaoValvaTricuspide data={data} handleChange={handleChange} />
                <SecaoValvaPulmonar data={data} handleChange={handleChange} />
                <SecaoAortaVenaCava data={data} handleChange={handleChange} />
                <SecaoPericardio data={data} handleChange={handleChange} />
            </div>
        </div>
    </div>
  );
};

export default FormEcocardiograma;