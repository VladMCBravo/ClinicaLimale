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

  // --- GERAÇÃO DE TEXTO AUDITADA ---
  useEffect(() => {
    dadosRef.current = data; 
    const mapTitulos = {
        'ECO_TRANSTORACICO': 'ECOCARDIOGRAMA TRANSTORÁCICO',
        'ECO_DOPPLER': 'ECOCARDIOGRAMA TRANSTORÁCICO COM DOPPLER COLORIDO',
        'ECO_STRAIN': 'ECOCARDIOGRAMA COM ANÁLISE DE DEFORMAÇÃO (STRAIN)',
    };
    let t = `${mapTitulos[data.subtipo] || 'ECOCARDIOGRAMA'}\n\n`;

    // 1. TÉCNICA / BIOMETRIA
    if (data.citarTecnica) {
        if(data.tecnicaQualidade === 'boa') t += `Exame realizado com boa qualidade técnica (janela acústica adequada). `;
        else t += `Exame realizado com janela acústica limitada. `;
        if(data.localExame !== 'nao_citar') t += `Local: ${data.localExame.replace('_', ' ')}. `;
        if(data.posicaoPaciente !== 'nao_citar') t += `Posição: ${data.posicaoPaciente.replace('_', ' ')}. `;
        t += `\n`;
    }
    if (data.peso || data.altura || data.sc) {
        const bio = [];
        if(data.peso) bio.push(`Peso: ${data.peso} kg`);
        if(data.altura) bio.push(`Altura: ${data.altura} cm`);
        if(data.sc) bio.push(`SC: ${data.sc} m²`);
        t += `Dados Biométricos: ${bio.join(' | ')}.\n`;
    }
    t += `Ritmo: ${data.ritmo}.\n\n`;
    
    // 2. AORTA E ÁTRIO ESQUERDO
    t += `Aorta: `;
    if (data.aortaEstrutura === 'ectasia') {
        const locs = [];
        if(data.aortaEctasiaRaiz) locs.push('raiz');
        if(data.aortaEctasiaAsc) locs.push('ascendente');
        if(data.aortaEctasiaArco) locs.push('arco');
        t += `Ectasia de ${locs.join(', ')}. `;
    } else {
        t += `Diâmetro normal. `;
    }
    if(data.aortaPlacas) t += `Placas de ateroma no arco. `;
    if(data.aortaDisseccao) t += `Sinais de dissecção. `;
    
    // Medidas Aorta
    const medidasAo = [];
    if(data.raizAorta) medidasAo.push(`Raiz: ${data.raizAorta}mm`);
    if(data.aortaAsc) medidasAo.push(`Asc: ${data.aortaAsc}mm`);
    if(data.arcoAorta) medidasAo.push(`Arco: ${data.arcoAorta}mm`);
    if(medidasAo.length > 0) t += `(${medidasAo.join(', ')}).`;
    t += `\n`;
    
    // Medidas AE
    t += `Átrio Esquerdo: ${data.atrioEsq ? `${data.atrioEsq} mm` : 'Não aferido'}. `;
    if(data.volAe) t += `Volume AE: ${data.volAe} ml/m². `;
    t += `\n`;

    // 3. VENTRÍCULO ESQUERDO
    t += `Ventrículo Esquerdo: `;
    if(data.camaras === 'Normal') t += `Dimensões preservadas. `;
    else if(data.camIndVe !== 'normal') t += `Aumento ${data.camIndVe}. `;
    
    if(data.espessuraVe === 'normal') t += `Espessura parietal normal. `;
    else t += `${data.espessuraVe.replace(/_/g, ' ')}. `;
    if(data.septoSigmoide) t += `(Septo sigmoide: ${data.septoSigmoide} mm). `;
    
    t += `\n(DDVE: ${data.ddve} mm | DSVE: ${data.dsve} mm | Septo: ${data.siv} mm | Parede Post: ${data.ppve} mm).\n`;
    
    // --- CORREÇÃO: ADICIONADO VOLUMES VE NO TEXTO ---
    if(data.volDiast || data.volSist) {
        t += `Volumes: Diastólico ${data.volDiast || '--'} ml, Sistólico ${data.volSist || '--'} ml. `;
    }
    if(data.resMassaVE) t += `Massa VE: ${data.resMassaVE} g. Índice: ${data.resImVE} g/m². RWT: ${data.resRwt}.\n`;

    // 4. FUNÇÃO
    t += `Função Sistólica VE: `;
    if(data.sistolicoGlobal === 'normal' || (!data.sistolicoReduzidoVe)) t += `Preservada. `;
    else t += `Reduzida (${data.sistolicoReduzidoVeGrau}). `;
    if(data.resFe) t += `Fração de Ejeção (${data.metodoFe}): ${data.resFe}%. `;
    if(data.contratilidadeAlterada) t += `Alteração da contratilidade segmentar presente. `;
    if(data.movAnomaloSepto) t += `Movimento anômalo do septo interventricular. `;
    
    t += `\n`;
    t += `Função Diastólica: ${data.diastolica.replace(/_/g, ' ')}.\n`;

    // 5. VENTRÍCULO DIREITO
    t += `Ventrículo Direito: ${data.camIndVd === 'normal' ? 'Dimensões normais' : `Aumento ${data.camIndVd}`}. `;
    if(data.ventriculoDir) t += `(Diâmetro: ${data.ventriculoDir} mm). `;
    if(data.espessuraVd !== 'nao_citar') t += `Espessura parietal ${data.espessuraVd === 'normal' ? 'normal' : 'aumentada'}. `;
    if(data.sistolicoReduzidoVd) t += `Função sistólica reduzida (${data.sistolicoReduzidoVdGrau}). `;
    else t += `Função sistólica preservada. `;
    
    // Volumes VD se houver
    if(data.volAd || data.volDiastVd) {
        const volsVd = [];
        if(data.volAd) volsVd.push(`Vol AD: ${data.volAd} ml/m²`);
        if(data.volDiastVd) volsVd.push(`VDF VD: ${data.volDiastVd} ml`);
        t += `(${volsVd.join(', ')}).`;
    }
    t += `\n`;

    // 6. VALVAS (AUDITORIA COMPLETA)
    t += `\n--- ANÁLISE VALVAR ---\n`;
    
    // MITRAL
    t += `Mitral: `;
    const mitralDesc = [];
    if(data.mitralAspecto !== 'normal') mitralDesc.push(`Aspecto ${data.mitralAspecto.replace(/_/g, ' ')}`);
    if(data.mitralEspessura !== 'normal') mitralDesc.push(`Espessura ${data.mitralEspessura.replace(/_/g, ' ')}`);
    // CORREÇÃO: MOBILIDADE E ABERTURA
    if(data.mitralMobilidade !== 'normal') mitralDesc.push(`Mobilidade ${data.mitralMobilidade.replace(/_/g, ' ')}`);
    if(data.mitralAbertura !== 'normal') mitralDesc.push(`Abertura ${data.mitralAbertura.replace(/_/g, ' ')}`);
    
    if(data.mitralCorda !== 'normal') mitralDesc.push(`Corda tendínea ${data.mitralCorda.replace(/_/g, ' ')}`);
    if(data.mitralAnel !== 'normal') mitralDesc.push(`Anel ${data.mitralAnel.replace(/_/g, ' ')}`);
    
    if(mitralDesc.length > 0) t += mitralDesc.join(', ') + '. ';
    else t += `Aspecto anatômico e mobilidade preservados. `;

    if(data.mitralRefluxo !== 'ausente') t += `Refluxo ${data.mitralRefluxo.replace(/_/g, '/')}. `;
    if(data.mitralEstenose !== 'ausente') t += `Estenose ${data.mitralEstenose} (Área: ${data.mitralArea || '--'}). `;
    t += `\n`;

    // TRICÚSPIDE
    t += `Tricúspide: `;
    const triDesc = [];
    if(data.triAspecto !== 'normal') triDesc.push(`Aspecto ${data.triAspecto.replace(/_/g, ' ')}`);
    if(data.triEspessura !== 'normal') triDesc.push(`Espessura ${data.triEspessura.replace(/_/g, ' ')}`);
    // CORREÇÃO: MOBILIDADE E ABERTURA
    if(data.triMobilidade !== 'normal') triDesc.push(`Mobilidade ${data.triMobilidade.replace(/_/g, ' ')}`);
    if(data.triAbertura !== 'normal') triDesc.push(`Abertura ${data.triAbertura.replace(/_/g, ' ')}`);
    
    if(data.triCorda !== 'normal') triDesc.push(`Corda tendínea ${data.triCorda.replace(/_/g, ' ')}`);
    
    if(triDesc.length > 0) t += triDesc.join(', ') + '. ';
    else t += `Aspecto anatômico e mobilidade preservados. `;

    if(data.triRefluxo !== 'ausente') t += `Refluxo ${data.triRefluxo.replace(/_/g, '/')}. `;
    if(data.checkPsap && data.psap) t += `PSAP estimada: ${data.psap} mmHg. `;
    if(data.triEstenose === 'severa') t += `Estenose severa (Área: ${data.triSeveraArea}). `;
    t += `\n`;

    // PULMONAR
    t += `Pulmonar: `;
    const pulDesc = [];
    if(data.pulAspecto !== 'normal') pulDesc.push(`Aspecto ${data.pulAspecto.replace(/_/g, ' ')}`);
    if(pulDesc.length > 0) t += pulDesc.join(', ') + '. ';
    else t += `Aspecto normal. `;

    if(data.pulRefluxo !== 'ausente') t += `Refluxo ${data.pulRefluxo}. `;
    if(data.pulEstenose !== 'ausente') t += `Estenose ${data.pulEstenose} (Pico: ${data.pulPicoVel}m/s, Grad: ${data.pulPicoGrad}mmHg). `;
    if(data.artPulmonar !== 'normal') t += `Tronco da Artéria Pulmonar: ${data.artPulmonar}. `;
    if(data.sinaisHipertensao) t += `Presença de sinais indiretos de hipertensão pulmonar. `;
    if(data.ausenciaSinaisHipertensao) t += `Ausência de sinais indiretos de hipertensão pulmonar. `;
    
    t += `\n`;

    // 7. PERICÁRDIO E CAVA
    if(data.pericardioDerra !== 'sem_derrame') {
        t += `Pericárdio: Derrame ${data.pericardioDerra.replace('_', ' ')}. `;
        const periDesc = [];
        if(data.periLoculado) periDesc.push('Loculado');
        if(data.periCircunferencial) periDesc.push('Circunferencial');
        if(data.periHomogeneo) periDesc.push('Conteúdo homogêneo');
        if(data.periHeterogeneo) periDesc.push('Conteúdo heterogêneo');
        if(periDesc.length > 0) t += `(${periDesc.join(', ')}). `;
        if(data.periRepercussao === 'com_repercussao') t += `Com repercussão hemodinâmica.`;
        t += `\n`;
    }
    if(data.veiaCava !== 'nao_citar') {
        const cavaMap = {
            'normal_maior': 'Veia Cava Inferior com calibre normal e colapso inspiratório > 50%.',
            'normal_menor': 'Veia Cava Inferior com calibre normal e colapso inspiratório < 50%.',
            'aum_maior': 'Veia Cava Inferior dilatada com colapso inspiratório > 50%.',
            'aum_menor': 'Veia Cava Inferior dilatada com colapso inspiratório < 50% (pletora).'
        };
        t += `${cavaMap[data.veiaCava]}\n`;
    }

    t += `\nCONCLUSÃO:\n`;
    const isNormal = data.camaras === 'Normal' && data.sistolicoGlobal === 'normal' && data.mitralRefluxo === 'ausente' && data.triRefluxo === 'ausente' && data.pericardioDerra === 'sem_derrame';
    if (isNormal) {
        t += `Exame ecocardiográfico dentro dos limites da normalidade.\n`;
    }

    onUpdate({ texto: t, dadosEstruturados: data, tituloExame: mapTitulos[data.subtipo] });
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