import React, { useState, useEffect } from 'react';
import { FaFemale, FaTable, FaImage } from 'react-icons/fa';
import '../Laudos.css';

import SecaoUteroTuring from './sections/SecaoUteroTuring';
import SecaoOvariosTuring from './sections/SecaoOvariosTuring';

const FormTransvaginal = ({ onUpdate }) => {
  
  const initialState = {
      subtipo: 'PELVE_TRANSVAGINAL',

      // --- COLUNA ESQUERDA (ÚTERO) ---
      statusHormonal: 'menopausada', 
      incluirDum: false, dum: '', dataExame: new Date().toISOString().split('T')[0],
      gesta: '0', para: '0',

      // Biometria
      posicaoUtero: 'anteversoflexão',
      ut1: '80', ut2: '40', ut3: '40', resVolUtero: '',
      
      // Doppler Uterinas
      incluirDopplerUt: false,
      utDirIR: '0,90', utDirIP: '1,50',
      utEsqIR: '0,90', utEsqIP: '1,50',

      // Características Gerais
      uteroHomogeneo: true, 
      citarRelacaoCorpoColo: false, relacaoCorpoColo: '1,50',

      // Endométrio / Colo
      citarEspessuraEndometrio: true, espessuraEndometrio: '4,0', aspectoEndometrio: 'não citar o aspecto',
      endometrioNaoIdentificado: false, endometrioHeterogeneo: false, areasCisticas: false,
      laminaLiquida: false,
      
      polipoEndometrial: false, polipoEndoLocal: 'fúndico', polipoEndoD1: '4', polipoEndoD2: '4',
      polipoEndocervical: false, polipoCervixD1: '4', polipoCervixD2: '4',
      cervicite: false, // Espessamento da endocérvice
      
      diuBemPosicionado: false,
      diuDeslocado: false, diuDistFundo: '2', diuDistSerosa: '10',
      
      cistoRetencao: false, cistoRetencaoTipo: 'anecogênico', cistoRetencaoD1: '7',

      // Miométrio
      miometrioHeterogeneo: false,
      adenomiose: false,
      
      // Nódulos (Slots 1 a 4)
      citarNodulos: false,
      nod1: true, nod1d1: '10', nod1d2: '10', nod1Tipo: 'subseroso', nod1Loc: 'fúndica',
      nod2: false, nod2d1: '10', nod2d2: '10', nod2Tipo: 'subseroso', nod2Loc: 'fúndica',
      nod3: false, nod3d1: '10', nod3d2: '10', nod3Tipo: 'subseroso', nod3Loc: 'fúndica',
      nod4: false, nod4d1: '10', nod4d2: '10', nod4Tipo: 'subseroso', nod4Loc: 'fúndica',
      
      nodMultiplos: false, nodMultD1: '10', nodMultD2: '10', nodMultTipo: 'subseroso', nodMultLoc: 'fúndica',

      // Cirurgias
      histerectomiaParcial: false, cotoD1:'40', cotoD2:'40', cotoD3:'40',
      histerectomiaTotal: false,

      // --- COLUNA DIREITA (OVÁRIOS) ---
      oradsFinal: 'não citar',
      incluirDopplerOvario: false,
      ovDirIR: '0,90', ovDirIP: '1,50', ovEsqIR: '0,90', ovEsqIP: '1,50',

      // Ovário Direito
      od1: '20', od2: '20', od3: '20', resVolOd: '',
      odNormal: true, odMultifolicular: false, odNaoCaracterizado: false, odPolicistico: false,
      
      odCisto1: false, odC1d1: '10', odC1d2: '10', odC1Tipo: 'cisto simples', 
      odC1Doppler: 'não citar', odC1CitarIR: false, odC1IR: '0,60', odC1Orads: '',
      
      odCisto2: false, odC2d1: '10', odC2d2: '10', odC2Tipo: 'cisto simples', 
      odC2Doppler: 'não citar', odC2CitarIR: false, odC2IR: '0,60', odC2Orads: '',

      // Ovário Esquerdo
      oe1: '20', oe2: '20', oe3: '20', resVolOe: '',
      oeNormal: true, oeMultifolicular: false, oeNaoCaracterizado: false, oePolicistico: false,
      
      oeCisto1: false, oeC1d1: '10', oeC1d2: '10', oeC1Tipo: 'cisto simples', 
      oeC1Doppler: 'não citar', oeC1CitarIR: false, oeC1IR: '0,60', oeC1Orads: '',
      
      oeCisto2: false, oeC2d1: '10', oeC2d2: '10', oeC2Tipo: 'cisto simples', 
      oeC2Doppler: 'não citar', oeC2CitarIR: false, oeC2IR: '0,60', oeC2Orads: '',

      // Anexos Extras
      cistoParaovariano: false, cistoParaLoc:'presente junto ao ovário', cistoParaD1:'20', cistoParaD2:'20', cistoParaD3:'20', cistoParaOrads:'',
      cistoInclusao: false, cistoIncLoc:'presente na região anexial', cistoIncD1:'20', cistoIncD2:'20', cistoIncD3:'20', cistoIncOrads:'',
      
      hidrossalpingeDir: false, hidroDirD1:'30', hidroDirD2:'20', hidroDirD3:'20', hidroDirOrads:'',
      hidrossalpingeEsq: false, hidroEsqD1:'30', hidroEsqD2:'20', hidroEsqD3:'20', hidroEsqOrads:'',

      // Endometriose (Seção Expansível)
      endometrioseExpandido: false,
      endoToro: false, endoLigS: false, endoVagina: false, endoReto: false,

      // Líquido Livre
      liquidoLivreLocal: 'ausente',
      liquidoLivreQtd: 'pequena quantidade',

      obsGerais: ''
  };

  const [data, setData] = useState(initialState);
  
  // Modais
  const [showModalFigo, setShowModalFigo] = useState(false);
  const [showModalOrads, setShowModalOrads] = useState(false);

  // --- CÁLCULO DE VOLUMES ---
  useEffect(() => {
    const calc = (d1, d2, d3) => {
        const v = (parseFloat(d1) * parseFloat(d2) * parseFloat(d3) * 0.523) / 1000;
        return isNaN(v) ? '' : v.toFixed(1).replace('.', ',');
    };
    let updates = {};
    const novoVolUt = calc(data.ut1, data.ut2, data.ut3);
    const novoVolOd = calc(data.od1, data.od2, data.od3);
    const novoVolOe = calc(data.oe1, data.oe2, data.oe3);
    
    if(novoVolUt !== data.resVolUtero) updates.resVolUtero = novoVolUt;
    if(novoVolOd !== data.resVolOd) updates.resVolOd = novoVolOd;
    if(novoVolOe !== data.resVolOe) updates.resVolOe = novoVolOe;

    if(Object.keys(updates).length > 0) setData(prev => ({ ...prev, ...updates }));
  }, [data.ut1, data.ut2, data.ut3, data.od1, data.od2, data.od3, data.oe1, data.oe2, data.oe3, data.resVolUtero, data.resVolOd, data.resVolOe]);

  // --- HANDLER ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newData = { ...data, [name]: type === 'checkbox' ? checked : value };

    // Lógica Útero Homogêneo
    if (name === 'uteroHomogeneo' && checked) {
        newData.miometrioHeterogeneo = false;
        newData.adenomiose = false;
        newData.citarNodulos = false;
        newData.nodMultiplos = false;
    }
    // Lógica Ovário Normal
    if (name === 'odNormal' && checked) {
        newData.odMultifolicular = false; newData.odPolicistico = false; newData.odNaoCaracterizado = false;
        newData.odCisto1 = false; newData.odCisto2 = false;
    }
    if (name === 'oeNormal' && checked) {
        newData.oeMultifolicular = false; newData.oePolicistico = false; newData.oeNaoCaracterizado = false;
        newData.oeCisto1 = false; newData.oeCisto2 = false;
    }

    setData(newData);
  };

  // --- GERAÇÃO DE TEXTO ---
  useEffect(() => {
    let t = `ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL\n\n`;

    // 1. ÚTERO
    if (data.histerectomiaTotal) {
        t += `Paciente histerectomizada. Ausência de útero.\n`;
    } else {
        if (data.histerectomiaParcial) {
            t += `Status pós-histerectomia parcial. Cúpula vaginal medindo: ${data.cotoD1}x${data.cotoD2}x${data.cotoD3} mm.\n`;
        } else {
            t += `Útero em ${data.posicaoUtero}. `;
            t += `Dimensões: ${data.ut1} x ${data.ut2} x ${data.ut3} mm. Volume: ${data.resVolUtero} cm³. `;
            
            if (data.uteroHomogeneo) t += `Ecotextura miometrial homogênea. `;
            if (data.citarRelacaoCorpoColo) t += `Relação corpo/colo: ${data.relacaoCorpoColo}. `;
            
            // Patologias Miométrio
            if (data.miometrioHeterogeneo) t += `Miométrio heterogêneo. `;
            if (data.adenomiose) t += `Sinais sugestivos de adenomiose (indefinição da zona juncional e diminutas imagens císticas). `;
            
            // Nódulos
            const nods = [];
            if (data.citarNodulos) {
                if (data.nod1) nods.push(`Nódulo (1): ${data.nod1Tipo}, ${data.nod1Loc}, medindo ${data.nod1d1}x${data.nod1d2} mm`);
                if (data.nod2) nods.push(`Nódulo (2): ${data.nod2Tipo}, ${data.nod2Loc}, medindo ${data.nod2d1}x${data.nod2d2} mm`);
                if (data.nod3) nods.push(`Nódulo (3): ${data.nod3Tipo}, ${data.nod3Loc}, medindo ${data.nod3d1}x${data.nod3d2} mm`);
                if (data.nod4) nods.push(`Nódulo (4): ${data.nod4Tipo}, ${data.nod4Loc}, medindo ${data.nod4d1}x${data.nod4d2} mm`);
            }
            if (data.nodMultiplos) nods.push(`Múltiplos nódulos miometriais, o maior ${data.nodMultTipo} em ${data.nodMultLoc} (${data.nodMultD1}x${data.nodMultD2} mm)`);
            
            if (nods.length > 0) t += `\nIdentificam-se imagens nodulares: ${nods.join('. ')}. `;
        }
        t += `\n`;

        // Endométrio
        t += `Eco endometrial `;
        if(data.aspectoEndometrio !== 'não citar o aspecto') t += `${data.aspectoEndometrio}, `;
        if(data.citarEspessuraEndometrio) t += `com espessura de ${data.espessuraEndometrio} mm. `;
        
        if(data.endometrioHeterogeneo) t += `Endométrio heterogêneo${data.areasCisticas ? ' com áreas císticas' : ''}. `;
        if(data.laminaLiquida) t += `Presença de lâmina líquida na cavidade. `;
        if(data.cervicite) t += `Espessamento da endocérvice (sugestivo de cervicite). `;
        if(data.cistoRetencao) t += `Cisto de retenção no colo (${data.cistoRetencaoTipo}), medindo ${data.cistoRetencaoD1} mm. `;

        if(data.polipoEndometrial) t += `Imagem sugestiva de pólipo endometrial ${data.polipoEndoLocal} (${data.polipoEndoD1}x${data.polipoEndoD2} mm). `;
        if(data.polipoEndocervical) t += `Imagem sugestiva de pólipo endocervical (${data.polipoCervixD1}x${data.polipoCervixD2} mm). `;
        
        // DIU
        if(data.diuBemPosicionado) t += `DIU visibilizado na cavidade uterina, bem posicionado. `;
        if(data.diuDeslocado) t += `DIU deslocado (distando ${data.diuDistFundo} mm do fundo e ${data.diuDistSerosa} mm da serosa). `;
        
        t += `\n`;
    }

    // 2. OVÁRIOS
    const printOvario = (lado, prefix, vol) => {
        let txt = `Ovário ${lado}: `;
        if (data[`${prefix}NaoCaracterizado`]) return txt + `Não visibilizado no presente exame.\n`;
        
        txt += `Medindo ${data[`${prefix}1`]}x${data[`${prefix}2`]}x${data[`${prefix}3`]} mm (Vol: ${vol} cm³). `;
        if (data[`${prefix}Normal`]) txt += `Aspecto ecográfico habitual. `;
        if (data[`${prefix}Multifolicular`]) txt += `Padrão multifolicular. `;
        if (data[`${prefix}Policistico`]) txt += `Padrão policístico (SOP). `;

        const cysts = [];
        [1, 2].forEach(num => {
            if (data[`${prefix}Cisto${num}`]) {
                let cTxt = `Cisto ${num}: ${data[`${prefix}C${num}Tipo`]} medindo ${data[`${prefix}C${num}d1`]}x${data[`${prefix}C${num}d2`]} mm`;
                if(data[`${prefix}C${num}Orads`]) cTxt += ` (O-RADS ${data[`${prefix}C${num}Orads`]})`;
                if(data[`${prefix}C${num}Doppler`] !== 'não citar') cTxt += ` - Doppler: ${data[`${prefix}C${num}Doppler`]}`;
                cysts.push(cTxt);
            }
        });
        
        if (cysts.length > 0) txt += `\n   ${cysts.join('. ')}.`;
        return txt + `\n`;
    };

    t += `\n`;
    t += printOvario('Direito', 'od', data.resVolOd);
    t += printOvario('Esquerdo', 'oe', data.resVolOe);

    // 3. ANEXOS / EXTRA
    if (data.cistoParaovariano) t += `Cisto paraovariano (${data.cistoParaLoc}) medindo ${data.cistoParaD1}x${data.cistoParaD2}x${data.cistoParaD3} mm.\n`;
    if (data.cistoInclusao) t += `Cisto de inclusão peritoneal (${data.cistoIncLoc}) medindo ${data.cistoIncD1}x${data.cistoIncD2}x${data.cistoIncD3} mm.\n`;
    
    if (data.hidrossalpingeDir) t += `Hidrossalpinge à Direita (${data.hidroDirD1}x${data.hidroDirD2} mm).\n`;
    if (data.hidrossalpingeEsq) t += `Hidrossalpinge à Esquerda (${data.hidroEsqD1}x${data.hidroEsqD2} mm).\n`;

    if (data.liquidoLivreLocal !== 'ausente') {
        t += `Líquido livre: Presença de ${data.liquidoLivreQtd} de líquido livre ${data.liquidoLivreLocal}.\n`;
    }

    if(data.endoToro || data.endoReto) t += `Pesquisa de Endometriose: Mapeamento positivo (detalhes no laudo completo).\n`;

    // Conclusão
    t += `\nCONCLUSÃO:\n`;
    if(data.oradsFinal !== 'não citar') t += `Classificação O-RADS Global: ${data.oradsFinal}.\n`;
    
    const isNormal = data.uteroHomogeneo && data.odNormal && data.oeNormal && data.liquidoLivreLocal === 'ausente';
    if (isNormal) t += `Exame ecográfico pélvico dentro dos limites da normalidade.\n`;
    
    if(data.obsGerais) t += `OBS: ${data.obsGerais}`;

    onUpdate({ texto: t, dadosEstruturados: data, tituloExame: 'ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL' });
  }, [data, onUpdate]);

  return (
    <div className="laudo-container" style={{display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'Segoe UI, sans-serif'}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'5px', borderBottom:'1px solid #ddd', background:'#f0f4c3', padding:'8px'}}>
             <FaFemale size={16} color="#558b2f" />
             <span style={{fontWeight:'bold', color:'#33691e', fontSize:'13px'}}>US de Pelve Feminina Transvaginal</span>
        </div>

        <div style={{display: 'flex', gap: '10px', overflowY: 'auto', flex: 1, padding:'5px'}}>
            
            {/* COLUNA ESQUERDA: ÚTERO */}
            <div style={{flex: 1, minWidth: '380px', display:'flex', flexDirection:'column', gap:'10px'}}>
                <SecaoUteroTuring 
                    data={data} 
                    handleChange={handleChange} 
                    setShowModalFigo={setShowModalFigo} 
                />
            </div>

            {/* COLUNA DIREITA: OVÁRIOS */}
            <div style={{flex: 1, minWidth: '380px', display:'flex', flexDirection:'column', gap:'10px'}}>
                <SecaoOvariosTuring 
                    data={data} 
                    handleChange={handleChange} 
                    setShowModalOrads={setShowModalOrads}
                />
            </div>

        </div>

        {/* MODAIS SIMULADOS */}
        {showModalFigo && (
            <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000}} onClick={() => setShowModalFigo(false)}>
                <div style={{background:'white', padding:'20px', borderRadius:'8px', maxWidth:'500px'}} onClick={e => e.stopPropagation()}>
                    <h4>Classificação FIGO (Miomas)</h4>
                    <p>0 - Pediculado Intracavitário<br/>1 - Submucoso &lt; 50% intramural<br/>2 - Submucoso &ge; 50% intramural<br/>3 - Contato com endométrio/intramural<br/>4 - Intramural<br/>5 - Subseroso &ge; 50% intramural<br/>6 - Subseroso &lt; 50% intramural<br/>7 - Subseroso pediculado</p>
                    <button onClick={() => setShowModalFigo(false)}>Fechar</button>
                </div>
            </div>
        )}
        
        {showModalOrads && (
            <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000}} onClick={() => setShowModalOrads(false)}>
                <div style={{background:'white', padding:'20px', borderRadius:'8px', maxWidth:'600px'}} onClick={e => e.stopPropagation()}>
                    <h4>Tabela O-RADS</h4>
                    <p>O-RADS 0: Avaliação incompleta<br/>O-RADS 1: Normal (Ovário fisiológico)<br/>O-RADS 2: Quase certamente benigno (&lt;1% risco)<br/>O-RADS 3: Baixo risco (1-10%)<br/>O-RADS 4: Risco intermediário (10-50%)<br/>O-RADS 5: Alto risco (&gt;50%)</p>
                    <button onClick={() => setShowModalOrads(false)}>Fechar</button>
                </div>
            </div>
        )}
    </div>
  );
};

export default FormTransvaginal;