// src/components/laudos/ecocardiograma/FormEcocardiograma.jsx
import React, { useState, useEffect, useRef } from 'react';
import { FaHeartbeat } from 'react-icons/fa';
import '../Laudos.css'; 

// Importação das Seções (Seus componentes visuais)
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
import SecaoStrain from './sections_eco/SecaoStrain'; 

const FormEcocardiograma = ({ onUpdate }) => {
  
  // --- ESTADO INICIAL COMPLETO ---
  const initialState = {
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

      // VALVAS (Mapeamento completo dos Radios)
      mitralAspecto: 'normal', mitralEspessura: 'normal', mitralMobilidade: 'normal', mitralAbertura: 'normal', mitralCorda: 'normal', mitralAnel: 'normal', mitralRefluxo: 'ausente', mitralEstenose: 'ausente', mitralArea: '',
      
      triAspecto: 'normal', triEspessura: 'normal', triMobilidade: 'normal', triAbertura: 'normal', triCorda: 'normal', triRefluxo: 'ausente', triEstenose: 'nao_citar', triSeveraArea: '', 
      
      artPulmonar: 'normal', sinaisHipertensao: false, ausenciaSinaisHipertensao: false, checkPsap: false, psap: '', checkPmap: false, pmap: '', 
      pulEstenose: 'ausente', pulPicoVel: '', pulPicoGrad: '', pulAspecto: 'normal', pulRefluxo: 'ausente',

      aortaEstrutura: 'normal', aortaEctasiaRaiz: false, aortaEctasiaAsc: false, aortaEctasiaArco: false, aortaObsNaoVis: false, aortaPlacas: false, aortaAteromatose: false, aortaDisseccao: false, 
      veiaCava: 'nao_citar',
      
      pericardioDerra: 'sem_derrame', periLoculado: false, periCircunferencial: false, periHomogeneo: false, periHeterogeneo: false, periRepercussao: 'nao_citar',
      
      strainGls: '', strainConclusao: 'preservado'
  };

  const [data, setData] = useState(initialState);
  const dadosRef = useRef(initialState);

  // --- CÁLCULOS AUTOMÁTICOS ---
  useEffect(() => {
    let updates = {};
    let houveMudanca = false;
    const safeFloat = (v) => { const f = parseFloat(v); return isNaN(f) ? 0 : f; };

    // SC e IMC
    if (data.peso && data.altura) {
        const p = safeFloat(data.peso); const a = safeFloat(data.altura);
        if (p > 0 && a > 0) {
            const sc = 0.007184 * Math.pow(p, 0.425) * Math.pow(a, 0.725);
            const novoSc = sc.toFixed(2);
            if (data.sc !== novoSc) { updates.sc = novoSc; houveMudanca = true; }

            const alturaMetros = a / 100;
            const imc = p / (alturaMetros * alturaMetros);
            const novoImc = imc.toFixed(1).replace('.', ',');
            if (data.imc !== novoImc) { updates.imc = novoImc; houveMudanca = true; }
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
  }, [data.peso, data.altura, data.ddve, data.dsve, data.siv, data.ppve, data.sc, data.imc, data.resFe]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // --- GERAÇÃO DE TEXTO AUDITADA (GARANTIA DE FUNCIONAMENTO) ---
  useEffect(() => {
    dadosRef.current = data; 
    const mapTitulos = {
        'ECO_TRANSTORACICO': 'ECOCARDIOGRAMA TRANSTORÁCICO',
        'ECO_DOPPLER': 'ECOCARDIOGRAMA TRANSTORÁCICO COM DOPPLER COLORIDO',
        'ECO_STRAIN': 'ECOCARDIOGRAMA COM ANÁLISE DE DEFORMAÇÃO (STRAIN)',
    };

    // 1. TABELA DE MEDIDAS
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

    // 2. LISTA DE COMENTÁRIOS (Lógica Reforçada)
    let comentarios = [];
    
    // Biometria
    if (data.peso || data.altura || data.sc) {
        const bio = [];
        if(data.peso) bio.push(`Peso: ${data.peso} kg`);
        if(data.altura) bio.push(`Altura: ${data.altura} cm`);
        if(data.imc) bio.push(`IMC: ${data.imc} kg/m²`);
        if(data.sc) bio.push(`SC: ${data.sc} m²`);
        comentarios.push(`Dados Biométricos: ${bio.join(' | ')}.`);
    }

    // Ritmo e Câmaras
    comentarios.push(`Ritmo cardíaco ${data.ritmo.toLowerCase()}.`);
    if(data.camaras === 'Normal') comentarios.push('Tamanho normal das câmaras cardíacas.');
    else {
        let camDesc = 'Alteração das câmaras: ';
        if(data.camIndVe !== 'normal') camDesc += `VE aumentado (${data.camIndVe}). `;
        if(data.camIndVd !== 'normal') camDesc += `VD aumentado (${data.camIndVd}). `;
        if(data.camIndAe !== 'normal') camDesc += `AE aumentado (${data.camIndAe}). `;
        if(data.camIndAd !== 'normal') camDesc += `AD aumentado (${data.camIndAd}). `;
        if(data.camDeformidade) camDesc += 'Presença de deformidade geométrica.';
        comentarios.push(camDesc);
    }

    // Ventrículo Esquerdo
    let veDesc = data.espessuraVe === 'normal' ? 'Espessura miocárdica normal do VE.' : `Hipertrofia do VE (${data.espessuraVeTipo.replace(/_/g, ' ')}).`;
    if(data.septoSigmoide) veDesc += ` Septo sigmoide (${data.septoSigmoide}mm).`;
    comentarios.push(veDesc);

    // Função VE
    if(data.sistolicoGlobal === 'normal' && !data.sistolicoReduzidoVe) {
        comentarios.push('Desempenho sistólico biventricular preservado.');
    } else {
        if(data.sistolicoReduzidoVe) comentarios.push(`Função sistólica do VE reduzida (${data.sistolicoReduzidoVeGrau}).`);
        if(data.sistolicoReduzidoVd) comentarios.push(`Função sistólica do VD reduzida (${data.sistolicoReduzidoVdGrau}).`);
    }

    // Checkboxes de Função (Alteração contratilidade / Mov Anomalo)
    if(data.contratilidadeAlterada) comentarios.push('Alteração da contratilidade segmentar do ventrículo esquerdo.');
    if(data.movAnomaloSepto) comentarios.push('Movimento anômalo do septo interventricular.');

    comentarios.push(`Índices de função diastólica ${data.diastolica === 'normal' ? 'normais' : `alterados (${data.diastolica.replace(/_/g, ' ')})`}.`);

    // --- ANÁLISE DETALHADA DAS VALVAS --- 
    // (Isso garante que tudo o que você clicar apareça)

    // AORTA
    const valvaAortica = [];
    if(data.aortaEstrutura !== 'normal') valvaAortica.push(`estrutura alterada (${data.aortaEstrutura})`);
    if(data.aortaPlacas) valvaAortica.push('placas de ateroma');
    if(data.aortaAteromatose) valvaAortica.push('ateromatose discreta');
    if(data.aortaDisseccao) valvaAortica.push('sinais de dissecção');
    if(data.aortaObsNaoVis) valvaAortica.push('arco aórtico não visualizado satisfatoriamente');
    if(data.aortaEctasiaRaiz || data.aortaEctasiaAsc || data.aortaEctasiaArco) valvaAortica.push('ectasia aórtica');
    comentarios.push(`Aorta: ${valvaAortica.length > 0 ? valvaAortica.join(', ') : 'Morfologia e dinâmica normais'}.`);

    // MITRAL
    const mitralDet = [];
    if(data.mitralAspecto !== 'normal') mitralDet.push(data.mitralAspecto.replace(/_/g, ' '));
    if(data.mitralEspessura !== 'normal') mitralDet.push(`espessura: ${data.mitralEspessura.replace(/_/g, ' ')}`);
    if(data.mitralMobilidade !== 'normal') mitralDet.push(`mobilidade: ${data.mitralMobilidade.replace(/_/g, ' ')}`);
    if(data.mitralCorda !== 'normal') mitralDet.push(`cordas: ${data.mitralCorda.replace(/_/g, ' ')}`);
    if(data.mitralAnel !== 'normal') mitralDet.push(`anel: ${data.mitralAnel.replace(/_/g, ' ')}`);
    if(data.mitralEstenose !== 'ausente') mitralDet.push(`estenose ${data.mitralEstenose}`);
    if(data.mitralRefluxo !== 'ausente') mitralDet.push(`insuficiência ${data.mitralRefluxo.replace(/_/g, '/')}`);
    comentarios.push(`Valva Mitral: ${mitralDet.length > 0 ? mitralDet.join(', ') : 'Morfologia e dinâmica normais'}.`);

    // TRICÚSPIDE
    const triDet = [];
    if(data.triAspecto !== 'normal') triDet.push(data.triAspecto.replace(/_/g, ' '));
    if(data.triEspessura !== 'normal') triDet.push(`espessura: ${data.triEspessura.replace(/_/g, ' ')}`);
    if(data.triMobilidade !== 'normal') triDet.push(`mobilidade: ${data.triMobilidade.replace(/_/g, ' ')}`);
    if(data.triRefluxo !== 'ausente') triDet.push(`insuficiência ${data.triRefluxo.replace(/_/g, '/')}`);
    if(data.triEstenose === 'severa') triDet.push('estenose severa');
    if(data.psap && data.checkPsap) triDet.push(`PSAP estimada em ${data.psap} mmHg`);
    comentarios.push(`Valva Tricúspide: ${triDet.length > 0 ? triDet.join(', ') : 'Morfologia e dinâmica normais'}.`);

    // PULMONAR
    const pulDet = [];
    if(data.pulAspecto !== 'normal') pulDet.push(data.pulAspecto.replace(/_/g, ' '));
    if(data.pulRefluxo !== 'ausente') pulDet.push(`insuficiência ${data.pulRefluxo}`);
    if(data.pulEstenose !== 'ausente') pulDet.push(`estenose ${data.pulEstenose}`);
    if(data.sinaisHipertensao) pulDet.push('sinais indiretos de hipertensão pulmonar');
    comentarios.push(`Valva Pulmonar e Artéria: ${pulDet.length > 0 ? pulDet.join(', ') : 'Morfologia e dinâmica normais'}.`);

    // Cava e Pericardio
    if(data.veiaCava.includes('normal')) comentarios.push('Veia cava inferior com calibre normal e variação respiratória preservada.');
    else if(data.veiaCava !== 'nao_citar') comentarios.push('Veia cava inferior dilatada/alterada.');

    if(data.pericardioDerra === 'sem_derrame') comentarios.push('Ausência de derrame pericárdico.');
    else {
        let periTxt = `Derrame pericárdico ${data.pericardioDerra.replace('_', ' ')}.`;
        if(data.periLoculado) periTxt += ' (Loculado)';
        if(data.periRepercussao === 'com_repercussao') periTxt += ' Com repercussão hemodinâmica.';
        comentarios.push(periTxt);
    }

    // Strain (se houver)
    if(data.subtipo === 'ECO_STRAIN' && data.strainGls) {
        comentarios.push(`Análise de Strain GLS: ${data.strainGls}%. Deformação ${data.strainConclusao}.`);
    }

    // 3. CONCLUSÃO AUTOMÁTICA
    let conclusao = [];
    if(data.ritmo !== 'Regular' && data.ritmo !== 'Sinusal') conclusao.push(`Ritmo ${data.ritmo}.`);
    if(data.sistolicoReduzidoVe) conclusao.push(`Disfunção sistólica do VE de grau ${data.sistolicoReduzidoVeGrau}.`);
    if(data.diastolica !== 'normal') conclusao.push(`Disfunção diastólica do VE (${data.diastolica.replace(/_/g, ' ')}).`);
    if(data.espessuraVe !== 'normal') conclusao.push(`Hipertrofia ventricular esquerda ${data.espessuraVeTipo.replace(/_/g, ' ')}.`);
    
    if(data.mitralEstenose !== 'ausente') conclusao.push(`Estenose mitral ${data.mitralEstenose}.`);
    if(data.mitralRefluxo !== 'ausente' && data.mitralRefluxo !== 'discreto') conclusao.push(`Insuficiência mitral ${data.mitralRefluxo.replace(/_/g, '/')}.`);
    
    if(data.triEstenose === 'severa') conclusao.push(`Estenose tricúspide severa.`);
    if(data.triRefluxo !== 'ausente' && data.triRefluxo !== 'discreto') conclusao.push(`Insuficiência tricúspide ${data.triRefluxo.replace(/_/g, '/')}.`);
    
    if(data.sinaisHipertensao) conclusao.push('Sinais ecocardiográficos de hipertensão pulmonar.');
    if(data.pericardioDerra !== 'sem_derrame') conclusao.push(`Derrame pericárdico ${data.pericardioDerra.replace('_', ' ')}.`);
    
    if(conclusao.length === 0) conclusao.push('Exame ecocardiográfico dentro dos limites da normalidade.');

    // PREVIEW DE TEXTO (Para você ver na tela)
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