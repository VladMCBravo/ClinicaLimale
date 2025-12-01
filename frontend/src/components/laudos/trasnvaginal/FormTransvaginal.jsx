// src/components/laudos/trasnvaginal/FormTransvaginal.jsx
import React, { useState, useEffect } from 'react';
import { FaFemale } from 'react-icons/fa';
import '../Laudos.css';

import SecaoUteroTuring from './sections/SecaoUteroTuring';
import SecaoOvariosTuring from './sections/SecaoOvariosTuring';

const FormTransvaginal = ({ onUpdate }) => {
  
  const initialState = {
      subtipo: 'PELVE_TRANSVAGINAL',

      // --- COLUNA ESQUERDA (ÚTERO) ---
      statusHormonal: 'menopausada', // ou 'idade_fertil'
      dum: '', dataExame: new Date().toISOString().split('T')[0],
      
      // Biometria Útero
      posicaoUtero: 'anteversoflexão',
      ut1: '80', ut2: '40', ut3: '40', resVolUtero: '',
      uteroHomogeneo: true, citarRelacaoCorpoColo: false, relacaoCorpoColo: '1,50',
      
      // Doppler Uterinas
      incluirDopplerUt: false,
      utDirIR: '0,90', utDirIP: '1,50',
      utEsqIR: '0,90', utEsqIP: '1,50',

      // Endométrio / Cavidade
      citarEspessuraEndometrio: true, espessuraEndometrio: '4,0', aspectoEndometrio: 'não citar o aspecto',
      endometrioNaoIdentificado: false, endometrioHeterogeneo: false, areasCisticas: false,
      laminaLiquida: false,
      
      // Pólipos / DIU / Colo
      polipoEndometrial: false, polipoEndoLocal: 'fúndico', polipoEndoD1: '4', polipoEndoD2: '4',
      polipoEndocervical: false, polipoCervixD1: '4', polipoCervixD2: '4',
      cervicite: false,
      diuBemPosicionado: false,
      diuDeslocado: false, diuDistFundo: '2', diuDistSerosa: '10',
      cistoRetencao: false, cistoRetencaoD1: '7',

      // Miométrio
      miometrioHeterogeneo: false,
      adenomiose: false,
      
      // Nódulos (Miomas) - Sistema de Slots (igual Turing)
      nod1: false, nod1d1: '10', nod1d2: '10', nod1Tipo: 'subseroso', nod1Loc: 'fúndica',
      nod2: false, nod2d1: '10', nod2d2: '10', nod2Tipo: 'subseroso', nod2Loc: 'fúndica',
      nod3: false, nod3d1: '10', nod3d2: '10', nod3Tipo: 'subseroso', nod3Loc: 'fúndica',
      nodMultiplos: false, nodMultD1: '10', nodMultD2: '10', nodMultTipo: 'subseroso', nodMultLoc: 'fúndica',

      // Cirurgias
      histerectomiaParcial: false, cotoD1:'40', cotoD2:'40', cotoD3:'40',
      histerectomiaTotal: false,

      // --- COLUNA DIREITA (OVÁRIOS) ---
      incluirDopplerOvario: false,
      ovDirIR: '0,90', ovDirIP: '1,50', ovEsqIR: '0,90', ovEsqIP: '1,50',

      // Ovário Direito
      od1: '20', od2: '20', od3: '20', resVolOd: '',
      odNormal: true, odMultifolicular: false, odNaoCaracterizado: false, odPolicistico: false,
      odCisto1: false, odC1d1: '10', odC1d2: '10', odC1Tipo: 'cisto simples', odC1Doppler: 'não citar', odC1Orads: '',
      odCisto2: false, odC2d1: '10', odC2d2: '10', odC2Tipo: 'cisto simples', odC2Doppler: 'não citar', odC2Orads: '',

      // Ovário Esquerdo
      oe1: '20', oe2: '20', oe3: '20', resVolOe: '',
      oeNormal: true, oeMultifolicular: false, oeNaoCaracterizado: false, oePolicistico: false,
      oeCisto1: false, oeC1d1: '10', oeC1d2: '10', oeC1Tipo: 'cisto simples', oeC1Doppler: 'não citar', oeC1Orads: '',
      oeCisto2: false, oeC2d1: '10', oeC2d2: '10', oeC2Tipo: 'cisto simples', oeC2Doppler: 'não citar', oeC2Orads: '',

      // Anexos Extras
      cistoParaovariano: false, cistoParaD1:'20', cistoParaD2:'20', cistoParaD3:'20', cistoParaOrads:'',
      cistoInclusao: false, cistoIncD1:'20', cistoIncD2:'20', cistoIncD3:'20', cistoIncOrads:'',
      
      hidrossalpingeDir: false, hidroDirD1:'30', hidroDirD2:'20', hidroDirD3:'20', hidroDirOrads:'',
      hidrossalpingeEsq: false, hidroEsqD1:'30', hidroEsqD2:'20', hidroEsqD3:'20', hidroEsqOrads:'',

      liquidoLivre: 'ausente', liquidoLivreQtd: 'pequena quantidade',

      obsGerais: ''
  };

  const [data, setData] = useState(initialState);

  // --- CÁLCULO DE VOLUMES ---
  useEffect(() => {
    const calc = (d1, d2, d3) => {
        const v = parseFloat(d1) * parseFloat(d2) * parseFloat(d3) * 0.523 / 1000; // assumindo entrada em mm para result em cm3, ou ajuste conforme unidade
        // O Turing usa mm na entrada. Entao (mm * mm * mm * 0.523) / 1000 = cm3
        return isNaN(v) ? '' : v.toFixed(1).replace('.', ',');
    };
    
    // Obs: Se a entrada for em mm, a formula é essa. Se for cm, tira o /1000. 
    // No print Turing mostra "80 x 40 x 40 mm". Então dividimos por 1000.
    
    let updates = {};
    updates.resVolUtero = calc(data.ut1, data.ut2, data.ut3);
    updates.resVolOd = calc(data.od1, data.od2, data.od3);
    updates.resVolOe = calc(data.oe1, data.oe2, data.oe3);
    
    setData(prev => ({ ...prev, ...updates }));
  }, [data.ut1, data.ut2, data.ut3, data.od1, data.od2, data.od3, data.oe1, data.oe2, data.oe3]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Logica exclusiva de radio/check (ex: se normal, desmarca patologia)
    // Simplificado para o exemplo:
    setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // --- GERAÇÃO DE TEXTO (LAUDO) ---
  useEffect(() => {
    let t = `ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL\n\n`;

    // 1. ÚTERO
    if (data.histerectomiaTotal) {
        t += `Paciente histerectomizada. Ausência de útero.\n`;
    } else if (data.histerectomiaParcial) {
        t += `Status pós-histerectomia parcial (colo remanescente). `;
        t += `Cúpula vaginal/colo medindo: ${data.cotoD1}x${data.cotoD2}x${data.cotoD3} mm.\n`;
    } else {
        t += `Útero em ${data.posicaoUtero}. `;
        t += `Dimensões: ${data.ut1} x ${data.ut2} x ${data.ut3} mm. Volume: ${data.resVolUtero} cm³. `;
        
        if (data.uteroHomogeneo) t += `Ecotextura miometrial homogênea. `;
        if (data.citarRelacaoCorpoColo) t += `Relação corpo/colo: ${data.relacaoCorpoColo}. `;
        
        // Miométrio Patológico
        if (data.miometrioHeterogeneo) t += `Miométrio heterogêneo sem nódulos delimitados. `;
        if (data.adenomiose) t += `Sinais de adenomiose (indefinição da zona juncional e diminutas imagens císticas). `;
        
        // Nódulos
        const nods = [];
        if (data.nod1) nods.push(`Nódulo 1: ${data.nod1Tipo} em parede ${data.nod1Loc}, medindo ${data.nod1d1}x${data.nod1d2} mm`);
        if (data.nod2) nods.push(`Nódulo 2: ${data.nod2Tipo} em parede ${data.nod2Loc}, medindo ${data.nod2d1}x${data.nod2d2} mm`);
        if (data.nodMultiplos) nods.push(`Múltiplos nódulos, o maior ${data.nodMultTipo} em ${data.nodMultLoc} (${data.nodMultD1}x${data.nodMultD2} mm)`);
        
        if (nods.length > 0) t += `\nNódulos miometriais: ${nods.join('. ')}. `;

        t += `\n`;

        // Doppler Uterinas
        if (data.incluirDopplerUt) {
            t += `Doppler das artérias uterinas: Direita (IR: ${data.utDirIR}, IP: ${data.utDirIP}). Esquerda (IR: ${data.utEsqIR}, IP: ${data.utEsqIP}).\n`;
        }
        
        // Endométrio
        t += `Eco endometrial `;
        if(data.aspectoEndometrio !== 'não citar o aspecto') t += `${data.aspectoEndometrio}, `;
        if(data.citarEspessuraEndometrio) t += `com espessura de ${data.espessuraEndometrio} mm. `;
        
        if(data.laminaLiquida) t += `Presença de lâmina líquida na cavidade. `;
        if(data.polipoEndometrial) t += `Imagem sugestiva de pólipo endometrial ${data.polipoEndoLocal} (${data.polipoEndoD1}x${data.polipoEndoD2} mm). `;
        
        // DIU
        if(data.diuBemPosicionado) t += `DIU visibilizado na cavidade uterina, bem posicionado. `;
        if(data.diuDeslocado) t += `DIU distando ${data.diuDistFundo} mm do fundo e ${data.diuDistSerosa} mm da serosa. `;
        
        t += `\n`;
    }

    // 2. OVÁRIOS
    const printOvario = (lado, prefix, vol) => {
        let txt = `Ovário ${lado}: `;
        if (data[`${prefix}NaoCaracterizado`]) return txt + `Não visibilizado/caracterizado.\n`;
        
        txt += `Medindo ${data[`${prefix}1`]}x${data[`${prefix}2`]}x${data[`${prefix}3`]} mm (Vol: ${vol} cm³). `;
        if (data[`${prefix}Normal`]) txt += `Aspecto ecográfico habitual. `;
        if (data[`${prefix}Multifolicular`]) txt += `Padrão multifolicular. `;
        if (data[`${prefix}Policistico`]) txt += `Padrão policístico (SOP). `;

        const cysts = [];
        if (data[`${prefix}Cisto1`]) cysts.push(`Cisto 1: ${data[`${prefix}C1Tipo`]} de ${data[`${prefix}C1d1`]}x${data[`${prefix}C1d2`]} mm`);
        if (data[`${prefix}Cisto2`]) cysts.push(`Cisto 2: ${data[`${prefix}C2Tipo`]} de ${data[`${prefix}C2d1`]}x${data[`${prefix}C2d2`]} mm`);
        
        if (cysts.length > 0) txt += `\n   ${cysts.join('. ')}.`;
        return txt + `\n`;
    };

    t += `\n`;
    t += printOvario('Direito', 'od', data.resVolOd);
    t += printOvario('Esquerdo', 'oe', data.resVolOe);

    if (data.incluirDopplerOvario) {
        t += `Doppler Ovariano: Direita (IR: ${data.ovDirIR}) | Esquerda (IR: ${data.ovEsqIR}).\n`;
    }

    // 3. ANEXOS / EXTRA
    if (data.cistoParaovariano) t += `Cisto paraovariano medindo ${data.cistoParaD1}x${data.cistoParaD2}x${data.cistoParaD3} mm.\n`;
    if (data.hidrossalpingeDir) t += `Hidrossalpinge à Direita (${data.hidroDirD1}x${data.hidroDirD2} mm).\n`;
    if (data.hidrossalpingeEsq) t += `Hidrossalpinge à Esquerda (${data.hidroEsqD1}x${data.hidroEsqD2} mm).\n`;

    if (data.liquidoLivre !== 'ausente') {
        t += `Líquido livre: ${data.liquidoLivre} (${data.liquidoLivreQtd}).\n`;
    }

    t += `\nCONCLUSÃO:\n`;
    if (!data.miometrioHeterogeneo && !data.nod1 && !data.cistoParaovariano && !data.hidrossalpingeDir) {
        t += `Exame ecográfico pélvico dentro dos limites da normalidade.\n`;
    }
    if(data.obsGerais) t += `OBS: ${data.obsGerais}`;

    onUpdate({ texto: t, dadosEstruturados: data, tituloExame: 'ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL' });
  }, [data, onUpdate]);

  return (
    <div className="laudo-container" style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px', paddingBottom:'10px', borderBottom:'1px solid #ccc', marginBottom:'10px'}}>
             <FaFemale size={20} color="#E91E63" />
             <span style={{fontWeight:'bold', color:'#333'}}>SUBTIPO DE EXAME:</span>
             <select className="laudo-select" style={{flex:1}}>
                 <option>US de Pelve Feminina Transvaginal</option>
             </select>
        </div>

        {/* LAYOUT DUAS COLUNAS TIPO TURING */}
        <div style={{display: 'flex', gap: '15px', overflowY: 'auto'}}>
            
            {/* COLUNA ESQUERDA: ÚTERO */}
            <div style={{flex: 1, minWidth: '350px'}}>
                <SecaoUteroTuring data={data} handleChange={handleChange} />
            </div>

            {/* COLUNA DIREITA: OVÁRIOS */}
            <div style={{flex: 1, minWidth: '350px'}}>
                <SecaoOvariosTuring data={data} handleChange={handleChange} />
            </div>

        </div>
        
        {/* Campo de Obs Gerais fora das colunas */}
        <div style={{marginTop: '10px', borderTop: '1px solid #ddd', paddingTop: '10px'}}>
            <textarea 
                className="laudo-textarea" 
                name="obsGerais" 
                value={data.obsGerais} 
                onChange={handleChange} 
                placeholder="Observações adicionais..."
                style={{height: '60px'}}
            />
        </div>
    </div>
  );
};

export default FormTransvaginal;