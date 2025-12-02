import React, { useState, useEffect } from 'react';
import { FaFemale, FaTable, FaTimes } from 'react-icons/fa';
import '../Laudos.css'; // Importa o padrão global

import SecaoUteroTuring from './sections/SecaoUteroTuring';
import SecaoOvariosTuring from './sections/SecaoOvariosTuring';

const FormTransvaginal = ({ onUpdate }) => {
  
  const initialState = {
      subtipo: 'PELVE_TRANSVAGINAL',

      // --- STATUS HORMONAL ---
      statusHormonal: 'menopausada', 
      
      // --- ÚTERO ---
      incluirDum: false, dum: '', dataExame: new Date().toISOString().split('T')[0],
      gesta: '0', para: '0',

      posicaoUtero: 'anteversoflexão',
      ut1: '80', ut2: '40', ut3: '40', resVolUtero: '',
      
      incluirDopplerUt: false,
      utDirIR: '0,90', utDirIP: '1,50', utEsqIR: '0,90', utEsqIP: '1,50',

      uteroHomogeneo: true, citarRelacaoCorpoColo: false, relacaoCorpoColo: '1,50',

      citarEspessuraEndometrio: true, espessuraEndometrio: '4,0', aspectoEndometrio: 'não citar o aspecto',
      endometrioNaoIdentificado: false, endometrioHeterogeneo: false, areasCisticas: false,
      laminaLiquida: false,
      
      polipoEndometrial: false, polipoEndoLocal: 'fúndico', polipoEndoD1: '4', polipoEndoD2: '4',
      polipoEndocervical: false, polipoCervixD1: '4', polipoCervixD2: '4',
      cervicite: false, 
      
      diuBemPosicionado: false,
      diuDeslocado: false, diuDistFundo: '2', diuDistSerosa: '10',
      cistoRetencao: false, cistoRetencaoTipo: 'anecogênico', cistoRetencaoD1: '7',

      miometrioHeterogeneo: false, adenomiose: false,
      
      // Nódulos (Slots 1 a 4)
      citarNodulos: false,
      nod1: true, nod1d1: '10', nod1d2: '10', nod1Tipo: 'subseroso', nod1Loc: 'fúndica',
      nod2: false, nod2d1: '10', nod2d2: '10', nod2Tipo: 'subseroso', nod2Loc: 'fúndica',
      nod3: false, nod3d1: '10', nod3d2: '10', nod3Tipo: 'subseroso', nod3Loc: 'fúndica',
      nod4: false, nod4d1: '10', nod4d2: '10', nod4Tipo: 'subseroso', nod4Loc: 'fúndica',
      nodMultiplos: false, nodMultD1: '10', nodMultD2: '10', nodMultTipo: 'subseroso', nodMultLoc: 'fúndica',

      histerectomiaParcial: false, cotoD1:'40', cotoD2:'40', cotoD3:'40',
      histerectomiaTotal: false,

      // --- OVÁRIOS ---
      oradsFinal: 'não citar',
      incluirDopplerOvario: false,
      ovDirIR: '0,90', ovDirIP: '1,50', ovEsqIR: '0,90', ovEsqIP: '1,50',

      // Ovário Direito
      od1: '20', od2: '20', od3: '20', resVolOd: '',
      odNormal: true, odMultifolicular: false, odNaoCaracterizado: false, odPolicistico: false,
      odCisto1: false, odC1d1: '10', odC1d2: '10', odC1Tipo: 'cisto simples', odC1Doppler: 'não citar', odC1CitarIR: false, odC1IR: '0,60', odC1Orads: '',
      odCisto2: false, odC2d1: '10', odC2d2: '10', odC2Tipo: 'cisto simples', odC2Doppler: 'não citar', odC2CitarIR: false, odC2IR: '0,60', odC2Orads: '',

      // Ovário Esquerdo
      oe1: '20', oe2: '20', oe3: '20', resVolOe: '',
      oeNormal: true, oeMultifolicular: false, oeNaoCaracterizado: false, oePolicistico: false,
      oeCisto1: false, oeC1d1: '10', oeC1d2: '10', oeC1Tipo: 'cisto simples', oeC1Doppler: 'não citar', oeC1CitarIR: false, oeC1IR: '0,60', oeC1Orads: '',
      oeCisto2: false, oeC2d1: '10', oeC2d2: '10', oeC2Tipo: 'cisto simples', oeC2Doppler: 'não citar', oeC2CitarIR: false, oeC2IR: '0,60', oeC2Orads: '',

      // Anexos Extras
      cistoParaovariano: false, cistoParaLoc:'presente junto ao ovário', cistoParaD1:'20', cistoParaD2:'20', cistoParaD3:'20', cistoParaOrads:'',
      cistoInclusao: false, cistoIncLoc:'presente na região anexial', cistoIncD1:'20', cistoIncD2:'20', cistoIncD3:'20', cistoIncOrads:'',
      
      hidrossalpingeDir: false, hidroDirD1:'30', hidroDirD2:'20', hidroDirD3:'20', hidroDirOrads:'',
      hidrossalpingeEsq: false, hidroEsqD1:'30', hidroEsqD2:'20', hidroEsqD3:'20', hidroEsqOrads:'',

      liquidoLivreLocal: 'ausente', liquidoLivreQtd: 'pequena quantidade',
      obsGerais: '',

      // --- ENDOMETRIOSE DETALHADA ---
      endoOvariosFixos: false,
      
      // Espessamento
      endoEspessamento: false, endoEspessamentoLoc: 'retrocervical', 
      endoEspD1:'20', endoEspD2:'20', endoEspD3:'20', endoEspExtensao:'a parede anterior do reto',

      // Formações Nodulares (3 Slots)
      endoNod1: false, endoNod1Loc: 'retrocervical', endoNod1D1:'20', endoNod1D2:'20', endoNod1D3:'20', endoNod1Inv: 'não citar invasão muscular',
      endoNod2: false, endoNod2Loc: 'retrocervical', endoNod2D1:'20', endoNod2D2:'20', endoNod2D3:'20', endoNod2Inv: 'não citar invasão muscular',
      endoNod3: false, endoNod3Loc: 'retrocervical', endoNod3D1:'20', endoNod3D2:'20', endoNod3D3:'20', endoNod3Inv: 'não citar invasão muscular',

      // Placas Intestinais (3 Slots)
      endoPlaca1: false, endoPlaca1Loc: 'retosigmoide', endoPlaca1D1:'20', endoPlaca1D2:'20', endoPlaca1D3:'20', endoPlaca1Camada: 'serosa', endoPlaca1Circ:'30', endoPlaca1Dist:'20',
      endoPlaca2: false, endoPlaca2Loc: 'retosigmoide', endoPlaca2D1:'20', endoPlaca2D2:'20', endoPlaca2D3:'20', endoPlaca2Camada: 'serosa', endoPlaca2Circ:'30', endoPlaca2Dist:'20',
      endoPlaca3: false, endoPlaca3Loc: 'retosigmoide', endoPlaca3D1:'20', endoPlaca3D2:'20', endoPlaca3D3:'20', endoPlaca3Camada: 'serosa', endoPlaca3Circ:'30', endoPlaca3Dist:'20',

      endoNormais: false,
  };

  const [data, setData] = useState(initialState);
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newData = { ...data, [name]: type === 'checkbox' ? checked : value };

    // Resets
    if (name === 'uteroHomogeneo' && checked) {
        newData.miometrioHeterogeneo = false; newData.adenomiose = false; newData.citarNodulos = false; newData.nodMultiplos = false;
    }
    if (name === 'odNormal' && checked) {
        newData.odMultifolicular = false; newData.odPolicistico = false; newData.odNaoCaracterizado = false; newData.odCisto1 = false; newData.odCisto2 = false;
    }
    if (name === 'oeNormal' && checked) {
        newData.oeMultifolicular = false; newData.oePolicistico = false; newData.oeNaoCaracterizado = false; newData.oeCisto1 = false; newData.oeCisto2 = false;
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
            
            if (data.miometrioHeterogeneo) t += `Miométrio heterogêneo. `;
            if (data.adenomiose) t += `Sinais sugestivos de adenomiose. `;
            
            const nods = [];
            if (data.citarNodulos) {
                [1,2,3,4].forEach(i => {
                    if(data[`nod${i}`]) nods.push(`Nódulo (${i}): ${data[`nod${i}Tipo`]}, ${data[`nod${i}Loc`]}, medindo ${data[`nod${i}d1`]}x${data[`nod${i}d2`]} mm`);
                });
            }
            if (data.nodMultiplos) nods.push(`Múltiplos nódulos, maior ${data.nodMultTipo} em ${data.nodMultLoc} (${data.nodMultD1}x${data.nodMultD2} mm)`);
            if (nods.length > 0) t += `\nNódulos: ${nods.join('. ')}. `;
        }
        t += `\n`;

        t += `Eco endometrial `;
        if(data.aspectoEndometrio !== 'não citar o aspecto') t += `${data.aspectoEndometrio}, `;
        if(data.citarEspessuraEndometrio) t += `espessura: ${data.espessuraEndometrio} mm. `;
        if(data.endometrioHeterogeneo) t += `Endométrio heterogêneo. `;
        if(data.polipoEndometrial) t += `Pólipo endometrial ${data.polipoEndoLocal} (${data.polipoEndoD1}x${data.polipoEndoD2} mm). `;
        if(data.diuBemPosicionado) t += `DIU bem posicionado. `;
        if(data.diuDeslocado) t += `DIU deslocado. `;
        t += `\n`;
    }

    // 2. OVÁRIOS
    const printOvario = (lado, prefix, vol) => {
        let txt = `Ovário ${lado}: `;
        if (data[`${prefix}NaoCaracterizado`]) return txt + `Não visibilizado.\n`;
        txt += `Medindo ${data[`${prefix}1`]}x${data[`${prefix}2`]}x${data[`${prefix}3`]} mm (Vol: ${vol} cm³). `;
        if (data[`${prefix}Normal`]) txt += `Aspecto normal. `;
        
        const cysts = [];
        [1, 2].forEach(num => {
            if (data[`${prefix}Cisto${num}`]) {
                let cTxt = `Cisto ${num}: ${data[`${prefix}C${num}Tipo`]} (${data[`${prefix}C${num}d1`]}x${data[`${prefix}C${num}d2`]} mm)`;
                if(data[`${prefix}C${num}Orads`]) cTxt += ` (O-RADS ${data[`${prefix}C${num}Orads`]})`;
                cysts.push(cTxt);
            }
        });
        if (cysts.length > 0) txt += `\n   ${cysts.join('. ')}.`;
        return txt + `\n`;
    };
    t += `\n`;
    t += printOvario('Direito', 'od', data.resVolOd);
    t += printOvario('Esquerdo', 'oe', data.resVolOe);

    if (data.liquidoLivreLocal !== 'ausente') t += `Líquido livre: ${data.liquidoLivreQtd} ${data.liquidoLivreLocal}.\n`;

    // 3. ENDOMETRIOSE
    const temEndo = data.endoOvariosFixos || data.endoEspessamento || data.endoNod1 || data.endoNod2 || data.endoNod3 || data.endoPlaca1 || data.endoPlaca2 || data.endoPlaca3 || data.endoNormais;
    if (temEndo) {
        t += `\nMAPEAMENTO DE ENDOMETRIOSE PROFUNDA:\n`;
        if (data.endoOvariosFixos) t += `- Ovários medianizados e fixos (sinal do "beijo" positivo).\n`;
        if (data.endoEspessamento) t += `- Espessamento na região ${data.endoEspessamentoLoc}, medindo ${data.endoEspD1}x${data.endoEspD2}x${data.endoEspD3} mm, estendendo-se para ${data.endoEspExtensao}.\n`;
        
        [1, 2, 3].forEach(i => {
            if (data[`endoNod${i}`]) {
                t += `- Nódulo hipoecogênico sólido na região ${data[`endoNod${i}Loc`]}, medindo ${data[`endoNod${i}D1`]}x${data[`endoNod${i}D2`]}x${data[`endoNod${i}D3`]} mm`;
                if(data[`endoNod${i}Inv`] !== 'não citar invasão muscular') t += ` (${data[`endoNod${i}Inv`]})`;
                t += `.\n`;
            }
        });

        [1, 2, 3].forEach(i => {
            if (data[`endoPlaca${i}`]) {
                t += `- Placa hipoecogênica na parede do ${data[`endoPlaca${i}Loc`]}, medindo ${data[`endoPlaca${i}D1`]}x${data[`endoPlaca${i}D2`]}x${data[`endoPlaca${i}D3`]} mm. `;
                t += `Acomete a ${data[`endoPlaca${i}Camada`]}, envolvendo ${data[`endoPlaca${i}Circ`]}% da circunferência, a ${data[`endoPlaca${i}Dist`]} mm da borda anal.\n`;
            }
        });

        if (data.endoNormais) t += `- Demais estruturas avaliadas com aspecto normal (recesso vesicouterino, septo retovaginal, região retrocervical, ligamentos uterossacros e alças intestinais).\n`;
    }

    t += `\nCONCLUSÃO:\n`;
    if(data.oradsFinal !== 'não citar') t += `Classificação O-RADS Global: ${data.oradsFinal}.\n`;
    if(data.obsGerais) t += `OBS: ${data.obsGerais}`;

    onUpdate({ texto: t, dadosEstruturados: data, tituloExame: 'ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL' });
  }, [data, onUpdate]);

  // Estilo para tabela O-RADS (Corrigido para usar padrão onde possível, mas cores especificas ficam aqui)
  const thStyle = { padding: '5px', border: '1px solid #ccc', textAlign: 'center', fontSize: '11px', background: '#e0e0e0', fontWeight: 'bold' };
  const tdStyle = { padding: '5px', border: '1px solid #ccc', fontSize: '11px' };

  return (
    <div className="laudo-container" style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'5px', padding:'5px', borderBottom:'1px solid #ddd'}}>
             <FaFemale size={18} color="#4A3B80" />
             <div className="laudo-row" style={{flex:1}}>
                 <select className="laudo-select" style={{fontWeight:'bold', width:'100%'}}>
                     <option>US de Pelve Feminina Transvaginal</option>
                 </select>
             </div>
        </div>

        <div style={{display: 'flex', gap: '10px', overflowY: 'auto', flex: 1, padding:'2px'}}>
            <div style={{flex: 1, minWidth: '380px', display:'flex', flexDirection:'column'}}>
                <SecaoUteroTuring data={data} handleChange={handleChange} setShowModalFigo={setShowModalFigo} />
            </div>
            <div style={{flex: 1, minWidth: '380px', display:'flex', flexDirection:'column'}}>
                <SecaoOvariosTuring data={data} handleChange={handleChange} setShowModalOrads={setShowModalOrads} />
            </div>
        </div>

        {/* MODAL FIGO */}
        {showModalFigo && (
            <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000}} onClick={() => setShowModalFigo(false)}>
                <div style={{background:'white', padding:'20px', borderRadius:'8px', maxWidth:'600px', maxHeight:'90vh', overflowY:'auto'}} onClick={e => e.stopPropagation()}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                        <h4 style={{margin:0, color:'#1565C0'}}>CLASSIFICAÇÃO DE LEIOMIOMAS DA FIGO</h4>
                        <button onClick={() => setShowModalFigo(false)} style={{border:'none', background:'transparent', cursor:'pointer'}}><FaTimes/></button>
                    </div>
                    <table style={{width:'100%', borderCollapse:'collapse', border:'1px solid #ccc'}}>
                        <tbody>
                            <tr><td style={tdStyle}><b>0</b></td><td style={tdStyle}>Intracavitário pediculado</td></tr>
                            <tr><td style={tdStyle}><b>1</b></td><td style={tdStyle}>Submucoso &lt;50% intramural</td></tr>
                            <tr><td style={tdStyle}><b>2</b></td><td style={tdStyle}>Submucoso &ge; 50% intramural</td></tr>
                            <tr><td style={tdStyle}><b>3</b></td><td style={tdStyle}>Intramural que tangencia o endométrio</td></tr>
                            <tr><td style={tdStyle}><b>4</b></td><td style={tdStyle}>Intramural</td></tr>
                            <tr><td style={tdStyle}><b>5</b></td><td style={tdStyle}>Subseroso &ge; 50% intramural</td></tr>
                            <tr><td style={tdStyle}><b>6</b></td><td style={tdStyle}>Subseroso &lt; 50% intramural</td></tr>
                            <tr><td style={tdStyle}><b>7</b></td><td style={tdStyle}>Subseroso pediculado</td></tr>
                            <tr><td style={tdStyle}><b>2-5</b></td><td style={tdStyle}>Híbrido (submucoso + subseroso)</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        
        {/* MODAL O-RADS */}
        {showModalOrads && (
            <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000}} onClick={() => setShowModalOrads(false)}>
                <div style={{background:'white', padding:'20px', borderRadius:'8px', maxWidth:'800px', maxHeight:'90vh', overflowY:'auto'}} onClick={e => e.stopPropagation()}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                        <h4 style={{margin:0, color:'#1565C0'}}>CATEGORIA O-RADS E RISCO</h4>
                        <button onClick={() => setShowModalOrads(false)} style={{border:'none', background:'transparent', cursor:'pointer'}}><FaTimes/></button>
                    </div>
                    
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:'10px'}}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Cat.</th>
                                <th style={thStyle}>Risco</th>
                                <th style={thStyle}>Descritores</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{background:'#CFD8DC'}}>
                                <td style={{...tdStyle, textAlign:'center', fontWeight:'bold'}}>0</td>
                                <td style={tdStyle}>Avaliação incompleta</td>
                                <td style={tdStyle}>Dados insuficientes ou fatores técnicos.</td>
                            </tr>
                            <tr style={{background:'#E3F2FD'}}>
                                <td style={{...tdStyle, textAlign:'center', fontWeight:'bold'}}>1</td>
                                <td style={tdStyle}>Ovário Normal</td>
                                <td style={tdStyle}>Folículo (&le; 3 cm) ou corpo lúteo (&le; 3 cm).</td>
                            </tr>
                            <tr style={{background:'#C8E6C9'}}>
                                <td style={{...tdStyle, textAlign:'center', fontWeight:'bold'}}>2</td>
                                <td style={tdStyle}>Quase certamente benigno (&lt;1%)</td>
                                <td style={tdStyle}>Cisto simples &lt; 10 cm. Cisto unilocular &lt; 10 cm. Dermoide/Endometrioma &lt; 10 cm.</td>
                            </tr>
                            <tr style={{background:'#FFF9C4'}}>
                                <td style={{...tdStyle, textAlign:'center', fontWeight:'bold'}}>3</td>
                                <td style={tdStyle}>Baixo risco (1 - &lt;10%)</td>
                                <td style={tdStyle}>Cisto unilocular &ge; 10 cm. Lesão sólida score cor 1.</td>
                            </tr>
                            <tr style={{background:'#FFCCBC'}}>
                                <td style={{...tdStyle, textAlign:'center', fontWeight:'bold'}}>4</td>
                                <td style={tdStyle}>Risco intermediário (10 - &lt;50%)</td>
                                <td style={tdStyle}>Cisto multilocular &ge; 10 cm. Lesão sólida score cor 2-3.</td>
                            </tr>
                            <tr style={{background:'#FFCDD2'}}>
                                <td style={{...tdStyle, textAlign:'center', fontWeight:'bold', color:'#B71C1C'}}>5</td>
                                <td style={{...tdStyle, color:'#B71C1C', fontWeight:'bold'}}>Alto risco (&ge;50%)</td>
                                <td style={tdStyle}>Lesão sólida score 4. Ascite. Nódulos peritoneais.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
  );
};

export default FormTransvaginal;