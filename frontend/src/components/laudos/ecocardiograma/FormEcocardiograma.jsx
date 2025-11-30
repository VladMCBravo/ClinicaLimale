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
import SecaoValvaPulmonar from './sections_eco/SecaoValvaPulmonar'; // (Agora contém Artéria + Valva)
import SecaoFuncaoVentricular from './sections_eco/SecaoFuncaoVentricular';
import SecaoAortaVenaCava from './sections_eco/SecaoAortaVenaCava';
import SecaoPericardio from './sections_eco/SecaoPericardio'; // NOVO

const FormEcocardiograma = ({ onUpdate }) => {
  
  const initialState = {
      subtipo: 'ECO_TRANSTORACICO',
      // ... (Dados anteriores mantidos) ...
      peso: '', altura: '', sc: '', citarTecnica: true, tecnicaQualidade: 'boa', localExame: 'nao_citar', posicaoPaciente: 'nao_citar',
      raizAorta: '', aortaAsc: '', arcoAorta: '', atrioEsq: '', volAe: '', ventriculoDir: '', volAd: '', volDiastVd: '', volSistVd: '',
      siv: '', ppve: '', ddve: '', dsve: '', volDiast: '', volSist: '', metodoFe: 'Teichholz',
      resFe: '', resEncurtamento: '', resMassaVE: '', resImVE: '', resRwt: '', ritmo: 'Regular',
      camaras: 'Normal', camIndAd: 'normal', camIndAe: 'normal', camIndVd: 'normal', camIndVe: 'normal', camDeformidade: false,
      espessuraVe: 'normal', espessuraVeTipo: 'concentrica', septoSigmoide: '', espessuraVd: 'nao_citar',
      sistolicoGlobal: 'normal', sistolicoReduzidoVe: false, sistolicoReduzidoVeGrau: 'discreto', sistolicoReduzidoVd: false, sistolicoReduzidoVdGrau: 'discreto', contratilidadeAlterada: false, movAnomaloSepto: false, diastolica: 'normal',
      mitralAspecto: 'normal', mitralEspessura: 'normal', mitralMobilidade: 'normal', mitralAbertura: 'normal', mitralCorda: 'normal', mitralAnel: 'normal', mitralRefluxo: 'ausente', mitralEstenose: 'ausente', mitralArea: '',
      triAspecto: 'normal', triEspessura: 'normal', triCorda: 'normal', triRefluxo: 'ausente', triEstenose: 'nao_citar', triSeveraArea: '', triAbertura: 'normal', triMobilidade: 'normal',
      aortaEstrutura: 'normal', aortaEctasiaRaiz: false, aortaEctasiaAsc: false, aortaEctasiaArco: false, aortaObsNaoVis: false, aortaPlacas: false, aortaAteromatose: false, aortaDisseccao: false, veiaCava: 'nao_citar',
      pulEstenose: 'ausente', pulPicoVel: '', pulPicoGrad: '', pulAspecto: 'normal', pulRefluxo: 'ausente',

      // --- NOVOS ESTADOS (Print Atual) ---
      
      // ARTÉRIA PULMONAR
      artPulmonar: 'normal', // normal, ectasia, dificil
      sinaisHipertensao: false, ausenciaSinaisHipertensao: false,
      checkPsap: false, psap: '', 
      checkPmap: false, pmap: '',

      // PERICÁRDIO
      pericardioDerra: 'sem_derrame',
      periLoculado: false, periCircunferencial: false, periHomogeneo: false, periHeterogeneo: false,
      periRepercussao: 'nao_citar',
  };

  const [data, setData] = useState(initialState);
  const dadosRef = useRef(initialState);

  // --- AUTOMAÇÃO MATEMÁTICA ---
  useEffect(() => {
    let updates = {};
    let houveMudanca = false;

    const safeFloat = (v) => { const f = parseFloat(v); return isNaN(f) ? 0 : f; };

    // 1. SC (Du Bois)
    if (data.peso && data.altura) {
        const p = safeFloat(data.peso);
        const a = safeFloat(data.altura);
        if (p > 0 && a > 0) {
            const sc = 0.007184 * Math.pow(p, 0.425) * Math.pow(a, 0.725);
            const novoSc = sc.toFixed(4);
            if (data.sc !== novoSc) { updates.sc = novoSc; houveMudanca = true; }
        }
    }

    // 2. FE, Massa, RWT
    if (data.ddve && data.dsve && data.siv && data.ppve) {
        const d = safeFloat(data.ddve);
        const s = safeFloat(data.dsve);
        const siv = safeFloat(data.siv);
        const pp = safeFloat(data.ppve);

        if (d > 0 && s > 0 && d > s) {
            // FE Teichholz
            const fe = ((Math.pow(d, 3) - Math.pow(s, 3)) / Math.pow(d, 3)) * 100;
            const enc = ((d - s) / d) * 100;
            const novaFe = fe.toFixed(1).replace('.', ',');
            const novoEnc = enc.toFixed(1).replace('.', ',');
            
            if (data.resFe !== novaFe) { updates.resFe = novaFe; houveMudanca = true; }
            if (data.resEncurtamento !== novoEnc) { updates.resEncurtamento = novoEnc; houveMudanca = true; }

            // RWT (Espessura Relativa da Parede) = (2 * PP) / DDVE
            const rwt = (2 * pp) / d;
            const novoRwt = rwt.toFixed(2).replace('.', ',');
            if (data.resRwt !== novoRwt) { updates.resRwt = novoRwt; houveMudanca = true; }

            // Massa VE (ASE) -> converter para cm
            const d_cm = d/10; const siv_cm = siv/10; const pp_cm = pp/10;
            const massa = 0.8 * (1.04 * (Math.pow(d_cm + siv_cm + pp_cm, 3) - Math.pow(d_cm, 3))) + 0.6;
            const novaMassa = massa.toFixed(0);
            if (data.resMassaVE !== novaMassa) { updates.resMassaVE = novaMassa; houveMudanca = true; }

            // Índice de Massa
            if (data.sc && safeFloat(data.sc) > 0) {
                const im = massa / safeFloat(data.sc);
                const novoIm = im.toFixed(2).replace('.', ',');
                if (data.resImVE !== novoIm) { updates.resImVE = novoIm; houveMudanca = true; }
            }
        }
    }

    if (houveMudanca) {
        setData(prev => ({ ...prev, ...updates }));
    }

  }, [data.peso, data.altura, data.ddve, data.dsve, data.siv, data.ppve, data.sc, data.resFe]);

  // --- HANDLER GENÉRICO ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // --- GERAÇÃO DE TEXTO ---
  useEffect(() => {
    dadosRef.current = data; 
    let t = `ECOCARDIOGRAMA TRANSTORÁCICO\n\n`;

    // 1. Dados Iniciais
    t += `Ritmo: ${data.ritmo}.\n`;
    
    // 2. Artéria Pulmonar
    if (data.artPulmonar === 'normal') t += `Artéria Pulmonar: Calibre preservado.\n`;
    else if (data.artPulmonar === 'ectasia') t += `Artéria Pulmonar: Ectasia do tronco.\n`;
    
    if (data.checkPsap && data.psap) t += `Pressão Sistólica da Artéria Pulmonar (PSAP) estimada em ${data.psap} mmHg.\n`;
    if (data.sinaisHipertensao) t += `Presença de sinais indiretos de hipertensão pulmonar.\n`;

    // 3. Pericárdio
    if (data.pericardioDerra === 'sem_derrame') {
        t += `Pericárdio: Aspecto normal, sem derrame.\n`;
    } else {
        const tipoDerrame = data.pericardioDerra.replace('_', '/');
        t += `Pericárdio: Presença de derrame pericárdico ${tipoDerrame}.\n`;
        
        const caracs = [];
        if(data.periLoculado) caracs.push('loculado');
        if(data.periCircunferencial) caracs.push('circunferencial');
        if(data.periHomogeneo) caracs.push('conteúdo homogêneo');
        if(data.periHeterogeneo) caracs.push('conteúdo heterogêneo');
        if(caracs.length > 0) t += `Características: ${caracs.join(', ')}.\n`;

        if(data.periRepercussao === 'com_repercussao') t += `Com sinais de repercussão hemodinâmica.\n`;
    }

    // 2. Função Sistólica
    t += `\nFUNÇÃO SISTÓLICA:\n`;
    if (data.sistolicoGlobal === 'normal') {
        t += `Desempenho sistólico biventricular preservado.\n`;
    } else {
        if (data.sistolicoReduzidoVe) t += `VE: Desempenho sistólico reduzido em grau ${data.sistolicoReduzidoVeGrau}.\n`;
        if (data.sistolicoReduzidoVd) t += `VD: Desempenho sistólico reduzido em grau ${data.sistolicoReduzidoVdGrau}.\n`;
    }
    if (data.contratilidadeAlterada) t += `Alteração da contratilidade segmentar do VE presente.\n`;
    if (data.movAnomaloSepto) t += `Movimento anômalo do septo interventricular.\n`;
    
    // FE (Cálculo)
    if (data.resFe) t += `Fração de Ejeção (${data.metodoFe}): ${data.resFe} %. (Ref: >55%).\n`;

    // 3. Função Diastólica
    t += `\nFUNÇÃO DIASTÓLICA:\n`;
    const mapDiast = {
        'normal': 'Índices de função diastólica normais.',
        'grau_I': 'Disfunção diastólica grau I (Alteração do relaxamento).',
        'grau_II': 'Disfunção diastólica grau II (Pseudonormal).',
        'grau_III': 'Disfunção diastólica grau III (Restritivo reversível).',
        'grau_IV': 'Disfunção diastólica grau IV (Restritivo fixo).',
        'indeterminada': 'Função diastólica indeterminada.',
        'pressao_aum': 'Sinais de aumento das pressões de enchimento do VE.'
    };
    t += `${mapDiast[data.diastolica]}\n`;

    // 4. Valvas (Mitral, Tricúspide, Pulmonar)
    t += `\nVALVAS:\n`;
    t += `Mitral: ${data.mitralRefluxo}.\n`; // Resumido
    t += `Tricúspide: ${data.triRefluxo}.\n`; // Resumido
    t += `Pulmonar: Aspecto ${data.pulAspecto}. Refluxo ${data.pulRefluxo}.`;
    if(data.pulEstenose !== 'ausente') t += ` Estenose ${data.pulEstenose} (Grad: ${data.pulPicoGrad} mmHg).`;
    t += `\n`;

    // 5. Aorta e Cava
    if (data.aortaEstrutura === 'ectasia') {
        const locs = [];
        if(data.aortaEctasiaRaiz) locs.push('Raiz');
        if(data.aortaEctasiaAsc) locs.push('Ascendente');
        if(data.aortaEctasiaArco) locs.push('Arco');
        t += `Aorta: Ectasia de ${locs.join(', ')}.\n`;
    }
    if (data.veiaCava !== 'nao_citar') {
        t += `Veia Cava Inferior: ${data.veiaCava.includes('normal') ? 'Calibre normal' : 'Calibre aumentado'} (${data.veiaCava.includes('maior') ? '>50%' : '<50%'} variação resp.).\n`;
    }

    t += `\nCONCLUSÃO:\n`;
    if (data.pericardioDerra === 'sem_derrame' && data.artPulmonar === 'normal') {
        t += `Exame dentro dos limites da normalidade.\n`;
    }

    onUpdate({ texto: t, dadosEstruturados: data, tituloExame: 'ECOCARDIOGRAMA' });
  }, [data, onUpdate]);

  return (
    <div className="laudo-container">
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px', paddingBottom:'10px', borderBottom:'1px solid #ccc' }}>
             <FaHeartbeat size={20} color="#1565C0" />
             <span style={{fontWeight:'bold', color:'#333'}}>CONFIGURAÇÃO DO EXAME</span>
        </div>

        <div style={{display:'flex', gap:'10px', alignItems:'flex-start'}}>
            {/* COLUNA ESQUERDA */}
            <div style={{flex: '1', minWidth: '350px'}}>
                <SecaoTecnicaEco data={data} handleChange={handleChange} />
                <SecaoMedidasEco data={data} handleChange={handleChange} />
                <SecaoRitmoCamaras data={data} handleChange={handleChange} />
                <SecaoEspessura data={data} handleChange={handleChange} />
                <SecaoFuncaoVentricular data={data} handleChange={handleChange} />
            </div>

            {/* COLUNA DIREITA */}
            <div style={{flex: '1', minWidth: '350px'}}>
                {/* Valvas Mitral, Tricúspide, Pulmonar (Atualizada com Artéria) */}
                <SecaoValvaMitral data={data} handleChange={handleChange} />
                <SecaoValvaTricuspide data={data} handleChange={handleChange} />
                <SecaoValvaPulmonar data={data} handleChange={handleChange} />
                
                {/* Vasos e Pericárdio */}
                <SecaoAortaVenaCava data={data} handleChange={handleChange} />
                <SecaoPericardio data={data} handleChange={handleChange} />
            </div>
        </div>
    </div>
  );
};

export default FormEcocardiograma;