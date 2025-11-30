import React, { useState, useEffect, useRef } from 'react';
import { FaHeartbeat } from 'react-icons/fa';
import '../Laudos.css'; 

// Importação das Seções (Certifique-se que a pasta sections_eco existe!)
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
  
  const initialState = {
      subtipo: 'ECO_TRANSTORACICO', // Opção padrão
      
      // --- DADOS TÉCNICOS E PACIENTE ---
      peso: '', altura: '', sc: '', 
      citarTecnica: true, tecnicaQualidade: 'boa', localExame: 'nao_citar', posicaoPaciente: 'nao_citar',

      // --- MEDIDAS E CÁLCULOS ---
      raizAorta: '', aortaAsc: '', arcoAorta: '', 
      atrioEsq: '', volAe: '', 
      ventriculoDir: '', volAd: '', volDiastVd: '', volSistVd: '',
      siv: '', ppve: '', ddve: '', dsve: '', 
      volDiast: '', volSist: '', metodoFe: 'Teichholz',
      
      // Resultados calculados automaticamente
      resFe: '', resEncurtamento: '', resMassaVE: '', resImVE: '', resRwt: '', 
      
      // --- ESTRUTURAL / FUNCIONAL ---
      ritmo: 'Regular',
      
      // Câmaras
      camaras: 'Normal', camIndAd: 'normal', camIndAe: 'normal', camIndVd: 'normal', camIndVe: 'normal', camDeformidade: false,
      
      // Espessura
      espessuraVe: 'normal', espessuraVeTipo: 'concentrica', septoSigmoide: '', espessuraVd: 'nao_citar',
      
      // Função Ventricular
      sistolicoGlobal: 'normal', 
      sistolicoReduzidoVe: false, sistolicoReduzidoVeGrau: 'discreto', 
      sistolicoReduzidoVd: false, sistolicoReduzidoVdGrau: 'discreto', 
      contratilidadeAlterada: false, movAnomaloSepto: false, 
      diastolica: 'normal',

      // --- VALVAS ---
      mitralAspecto: 'normal', mitralEspessura: 'normal', mitralMobilidade: 'normal', mitralAbertura: 'normal', mitralCorda: 'normal', mitralAnel: 'normal', mitralRefluxo: 'ausente', mitralEstenose: 'ausente', mitralArea: '',
      
      triAspecto: 'normal', triEspessura: 'normal', triCorda: 'normal', triRefluxo: 'ausente', triEstenose: 'nao_citar', triSeveraArea: '', triAbertura: 'normal', triMobilidade: 'normal',
      
      // Pulmonar e Artéria
      artPulmonar: 'normal', sinaisHipertensao: false, ausenciaSinaisHipertensao: false, checkPsap: false, psap: '', checkPmap: false, pmap: '',
      pulEstenose: 'ausente', pulPicoVel: '', pulPicoGrad: '', pulAspecto: 'normal', pulRefluxo: 'ausente',

      // --- VASOS E PERICÁRDIO ---
      aortaEstrutura: 'normal', aortaEctasiaRaiz: false, aortaEctasiaAsc: false, aortaEctasiaArco: false, aortaObsNaoVis: false, aortaPlacas: false, aortaAteromatose: false, aortaDisseccao: false, 
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

            // RWT
            const rwt = (2 * pp) / d;
            const novoRwt = rwt.toFixed(2).replace('.', ',');
            if (data.resRwt !== novoRwt) { updates.resRwt = novoRwt; houveMudanca = true; }

            // Massa VE
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

    if (houveMudanca) setData(prev => ({ ...prev, ...updates }));
  }, [data.peso, data.altura, data.ddve, data.dsve, data.siv, data.ppve, data.sc, data.resFe]);

  // Handler Genérico
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // --- GERAÇÃO DE TEXTO DO LAUDO ---
  useEffect(() => {
    dadosRef.current = data; 
    
    // Mapeamento de Títulos
    const mapTitulos = {
        'ECO_TRANSTORACICO': 'ECOCARDIOGRAMA TRANSTORÁCICO',
        'ECO_DOPPLER': 'ECOCARDIOGRAMA TRANSTORÁCICO COM DOPPLER COLORIDO',
        'ECO_STRAIN': 'ECOCARDIOGRAMA COM ANÁLISE DE DEFORMAÇÃO (STRAIN)',
    };
    
    let t = `${mapTitulos[data.subtipo] || 'ECOCARDIOGRAMA'}\n\n`;

    // 1. Dados Iniciais
    t += `Ritmo: ${data.ritmo}.\n`;
    if (data.sc) t += `SC: ${data.sc} m².\n`;

    // 2. Câmaras e Medidas
    if (data.camaras === 'Normal') {
        t += `Dimensões das câmaras cardíacas dentro da normalidade.\n`;
    } else if (data.camaras === 'Individual') {
        const aums = [];
        if(data.camIndAd !== 'normal') aums.push(`AD: ${data.camIndAd}`);
        if(data.camIndAe !== 'normal') aums.push(`AE: ${data.camIndAe}`);
        if(data.camIndVd !== 'normal') aums.push(`VD: ${data.camIndVd}`);
        if(data.camIndVe !== 'normal') aums.push(`VE: ${data.camIndVe}`);
        if(aums.length > 0) t += `Aumento de câmaras: ${aums.join(', ')}.\n`;
    }
    
    if (data.espessuraVe === 'normal') t += `Espessura miocárdica do VE normal.\n`;
    else t += `Espessura VE: ${data.espessuraVe}.\n`;

    // 3. Função Sistólica e Diastólica
    t += `\nFUNÇÃO VENTRICULAR:\n`;
    if (data.sistolicoGlobal === 'normal') t += `Função sistólica biventricular preservada.\n`;
    else t += `Função sistólica reduzida (ver detalhes).\n`;
    
    if (data.resFe) t += `Fração de Ejeção (${data.metodoFe}): ${data.resFe} %. (Ref: >55%).\n`;
    
    const mapDiast = {
        'normal': 'Função diastólica normal.',
        'grau_I': 'Disfunção diastólica grau I.',
        'grau_II': 'Disfunção diastólica grau II.',
        'grau_III': 'Disfunção diastólica grau III.',
        'grau_IV': 'Disfunção diastólica grau IV.',
        'indeterminada': 'Indeterminada.',
        'pressao_aum': 'Pressões de enchimento aumentadas.'
    };
    t += `${mapDiast[data.diastolica]}\n`;

    // 4. Valvas (Resumo)
    t += `\nANÁLISE VALVAR:\n`;
    if (data.mitralRefluxo !== 'ausente') t += `Mitral: Refluxo ${data.mitralRefluxo}.\n`;
    if (data.triRefluxo !== 'ausente') t += `Tricúspide: Refluxo ${data.triRefluxo}.\n`;
    if (data.pulRefluxo !== 'ausente') t += `Pulmonar: Refluxo ${data.pulRefluxo}.\n`;
    
    // 5. Pericárdio e Aorta
    if (data.pericardioDerra !== 'sem_derrame') t += `Pericárdio: Presença de derrame.\n`;
    if (data.aortaEstrutura !== 'normal') t += `Aorta: Alteração estrutural (ectasia).\n`;
    if (data.checkPsap && data.psap) t += `PSAP estimada: ${data.psap} mmHg.\n`;

    t += `\nCONCLUSÃO:\n`;
    // Lógica simples de conclusão normal
    const isNormal = data.camaras === 'Normal' && 
                     data.sistolicoGlobal === 'normal' && 
                     data.diastolica === 'normal' && 
                     data.mitralRefluxo === 'ausente' && 
                     data.triRefluxo === 'ausente' &&
                     data.pericardioDerra === 'sem_derrame';
                     
    if (isNormal) {
        t += `Exame ecocardiográfico dentro dos limites da normalidade.\n`;
    }

    onUpdate({ texto: t, dadosEstruturados: data, tituloExame: mapTitulos[data.subtipo] });
  }, [data, onUpdate]);

  return (
    <div className="laudo-container">
        {/* HEADER: SELETOR DE SUBTIPO (DOPPLER vs TRANSTORACICO) */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px', paddingBottom:'10px', borderBottom:'1px solid #ccc' }}>
             <FaHeartbeat size={20} color="#1565C0" />
             <span style={{fontWeight:'bold', color:'#333'}}>CONFIGURAÇÃO DO EXAME:</span>
             <select 
                name="subtipo" 
                value={data.subtipo} 
                onChange={handleChange}
                className="laudo-select"
                style={{flex:1, fontWeight:'bold', fontSize:'14px', border:'1px solid #1565C0', color:'#1565C0'}}
             >
                 <option value="ECO_TRANSTORACICO">Ecocardiograma Transtorácico</option>
                 <option value="ECO_DOPPLER">Ecocardiograma Transtorácico com Doppler Colorido</option>
                 <option value="ECO_STRAIN">Eco com Strain</option>
             </select>
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