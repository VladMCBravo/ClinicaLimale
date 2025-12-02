// src/components/laudos/trasnvaginal/sections/SecaoOvariosTuring.jsx
import React, { useState } from 'react';
import { FaTable } from 'react-icons/fa';

const SecaoOvariosTuring = ({ data, handleChange, setShowModalOrads }) => {
  const [expandEndo, setExpandEndo] = useState(false);

  const tiposCisto = [
      "cisto simples", "corpo lúteo", "cisto unilocular", 
      "cisto unilocular com componente sólido", "cisto hemorrágico", 
      "endometrioma", "cisto dermoide", "cisto bilocular", 
      "cisto multilocular", 
      "nódulo sólido irregular"
  ];
  
  const opcoesDoppler = [
      "não citar", "avascular", "fluxo indefinível", 
      "fluxo periférico escasso (score 2)", "fluxo moderado (score 3)", 
      "fluxo intenso (score 4)"
  ];

  const renderOvario = (label, prefix) => (
    <div className="laudo-group-box" style={{marginBottom: '10px', border:'1px solid #e0e0e0'}}>
        <div style={{fontWeight:'bold', color: '#333', marginBottom:'5px', borderBottom:'1px solid #eee'}}>{label}</div>
        
        <div className="laudo-row">
            Mede: <input type="number" name={`${prefix}1`} value={data[`${prefix}1`]} onChange={handleChange} className="laudo-input-small" style={{color:'red'}}/> x
            <input type="number" name={`${prefix}2`} value={data[`${prefix}2`]} onChange={handleChange} className="laudo-input-small" style={{color:'red'}}/> x
            <input type="number" name={`${prefix}3`} value={data[`${prefix}3`]} onChange={handleChange} className="laudo-input-small" style={{color:'red'}}/> mm
        </div>

        <div className="laudo-row-wrap" style={{marginTop:'5px'}}>
            <label><input type="checkbox" name={`${prefix}Normal`} checked={data[`${prefix}Normal`]} onChange={handleChange} /> normal</label>
            <label><input type="checkbox" name={`${prefix}Multifolicular`} checked={data[`${prefix}Multifolicular`]} onChange={handleChange} /> padrão multifolicular</label>
            <label><input type="checkbox" name={`${prefix}NaoCaracterizado`} checked={data[`${prefix}NaoCaracterizado`]} onChange={handleChange} /> não caracterizado</label>
            <label><input type="checkbox" name={`${prefix}Policistico`} checked={data[`${prefix}Policistico`]} onChange={handleChange} /> padrão policístico</label>
        </div>

        {[1, 2].map(num => (
            <div key={num} style={{marginTop:'5px', padding:'4px', border:'1px dashed #ccc', background:'#fafafa'}}>
                <div className="laudo-row">
                    <input type="checkbox" name={`${prefix}Cisto${num}`} checked={data[`${prefix}Cisto${num}`]} onChange={handleChange} />
                    <span style={{fontWeight:'bold'}}>cisto {num} </span>
                    <input type="number" name={`${prefix}C${num}d1`} value={data[`${prefix}C${num}d1`]} onChange={handleChange} className="laudo-input-tiny"/> x
                    <input type="number" name={`${prefix}C${num}d2`} value={data[`${prefix}C${num}d2`]} onChange={handleChange} className="laudo-input-tiny"/> mm
                    <select name={`${prefix}C${num}Tipo`} value={data[`${prefix}C${num}Tipo`]} onChange={handleChange} className="laudo-select-small" style={{flex:1}}>
                        {tiposCisto.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="laudo-row" style={{opacity: data[`${prefix}Cisto${num}`] ? 1 : 0.5}}>
                    <span style={{fontSize:'10px'}}>Doppler:</span>
                    <select name={`${prefix}C${num}Doppler`} value={data[`${prefix}C${num}Doppler`]} onChange={handleChange} className="laudo-select-small" style={{width:'100px'}}>
                        {opcoesDoppler.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    
                    <span style={{fontSize:'10px', marginLeft:'5px', fontWeight:'bold'}}>O-RADS:</span>
                    <select name={`${prefix}C${num}Orads`} value={data[`${prefix}C${num}Orads`]} onChange={handleChange} className="laudo-select-small" style={{width:'40px'}}>
                        <option value=""></option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
                    </select>
                </div>
            </div>
        ))}
    </div>
  );

  return (
    <div className="laudo-section" style={{borderTop: '3px solid #5c6bc0'}}>
      <div className="laudo-header-dark" style={{background: '#5c6bc0', color:'white', padding:'4px 8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span>Ovários e regiões anexiais</span>
      </div>

      {/* STATUS HORMONAL E O-RADS HEADER (Conforme print 20.40.40) */}
      <div className="laudo-group-box" style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f5f5f5'}}>
          <div>
              <div style={{fontWeight:'bold', fontSize:'11px', color:'#333'}}>Status hormonal</div>
              <div style={{display:'flex', gap:'10px', marginTop:'2px'}}>
                  <label><input type="radio" name="statusHormonal" value="menopausada" checked={data.statusHormonal === 'menopausada'} onChange={handleChange} /> menopausada</label>
                  <label><input type="radio" name="statusHormonal" value="idade_fertil" checked={data.statusHormonal === 'idade_fertil'} onChange={handleChange} /> idade fértil</label>
              </div>
          </div>
          
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <button onClick={() => setShowModalOrads(true)} className="laudo-btn-small" style={{background:'#546E7A', color:'white', border:'none', padding:'5px 10px', borderRadius:'4px', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px'}}>
                  <FaTable/> Tabela O-RADS
              </button>
              <div>
                  <div style={{fontSize:'10px', fontWeight:'bold'}}>O-RADS final:</div>
                  <select name="oradsFinal" value={data.oradsFinal} onChange={handleChange} className="laudo-select-small" style={{background:'white', width:'80px'}}>
                      <option value="não citar">não citar</option>
                      <option value="O-RADS 1">1</option>
                      <option value="O-RADS 2">2</option>
                      <option value="O-RADS 3">3</option>
                      <option value="O-RADS 4">4</option>
                      <option value="O-RADS 5">5</option>
                  </select>
              </div>
          </div>
      </div>

      <div className="laudo-row" style={{background:'#eceff1', padding:'5px', marginBottom:'10px', marginTop:'10px'}}>
          <label style={{fontWeight:'bold', fontSize:'11px'}}><input type="checkbox" name="incluirDopplerOvario" checked={data.incluirDopplerOvario} onChange={handleChange} /> Incluir Doppler das artérias ovarianas</label>
          {data.incluirDopplerOvario && (
             <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', fontSize:'10px', marginTop:'2px'}}>
                 <div>I.R. à direita: <input name="ovDirIR" value={data.ovDirIR} onChange={handleChange} className="laudo-input-tiny"/> I.P.: <input name="ovDirIP" value={data.ovDirIP} onChange={handleChange} className="laudo-input-tiny"/></div>
                 <div>I.R. à esquerda: <input name="ovEsqIR" value={data.ovEsqIR} onChange={handleChange} className="laudo-input-tiny"/> I.P.: <input name="ovEsqIP" value={data.ovEsqIP} onChange={handleChange} className="laudo-input-tiny"/></div>
             </div>
          )}
      </div>

      {renderOvario('Ovário direito', 'od')}
      {renderOvario('Ovário esquerdo', 'oe')}

      {/* CISTOS EXTRAS */}
      <div className="laudo-header-sub">Outros cistos</div>
      <div className="laudo-group-box">
          <div className="laudo-row">
              <label style={{fontWeight:'bold'}}>Cisto paraovariano</label>
              <input type="checkbox" name="cistoParaovariano" checked={data.cistoParaovariano} onChange={handleChange} />
          </div>
          {data.cistoParaovariano && (
              <div className="laudo-row">
                  <select name="cistoParaLoc" value={data.cistoParaLoc} onChange={handleChange} className="laudo-select-small"><option>presente junto ao ovário</option></select>
                  medindo <input name="cistoParaD1" value={data.cistoParaD1} onChange={handleChange} className="laudo-input-tiny"/> x <input name="cistoParaD2" value={data.cistoParaD2} onChange={handleChange} className="laudo-input-tiny"/> mm
                  O-RADS <select name="cistoParaOrads" value={data.cistoParaOrads} onChange={handleChange} className="laudo-select-small" style={{width:'40px'}}><option></option><option>2</option></select>
              </div>
          )}
          
          <div className="laudo-row" style={{marginTop:'5px', paddingTop:'5px', borderTop:'1px solid #eee'}}>
              <label style={{fontWeight:'bold'}}>Cisto de inclusão peritoneal</label>
              <input type="checkbox" name="cistoInclusao" checked={data.cistoInclusao} onChange={handleChange} />
          </div>
          {data.cistoInclusao && (
              <div className="laudo-row">
                  <select name="cistoIncLoc" value={data.cistoIncLoc} onChange={handleChange} className="laudo-select-small">
                      <option value="presente na região anexial">presente na região anexial</option>
                  </select>
                  medindo <input name="cistoIncD1" value={data.cistoIncD1} onChange={handleChange} className="laudo-input-tiny"/> x <input name="cistoIncD2" value={data.cistoIncD2} onChange={handleChange} className="laudo-input-tiny"/> mm
              </div>
          )}
      </div>

      <div className="laudo-header-sub">Hidrossalpinge?</div>
      <div className="laudo-row"><label><input type="checkbox" name="hidrossalpingeDir" checked={data.hidrossalpingeDir} onChange={handleChange} /> presente à DIREITA, medindo <input name="hidroDirD1" value={data.hidroDirD1} className="laudo-input-tiny"/> mm</label></div>
      <div className="laudo-row"><label><input type="checkbox" name="hidrossalpingeEsq" checked={data.hidrossalpingeEsq} onChange={handleChange} /> presente à ESQUERDA, medindo <input name="hidroEsqD1" value={data.hidroEsqD1} className="laudo-input-tiny"/> mm</label></div>

      {/* PESQUISA DE ENDOMETRIOSE DETALHADA */}
      <div 
        className="laudo-header-dark" 
        style={{marginTop:'10px', background:'#546E7A', cursor:'pointer', display:'flex', justifyContent:'space-between', color:'white', padding:'5px'}}
        onClick={() => setExpandEndo(!expandEndo)}
      >
          <span>Pesquisa de ENDOMETRIOSE (clique para expandir)</span>
          <span>{expandEndo ? '▲' : '▼'}</span>
      </div>
      
      {expandEndo && (
          <div className="laudo-group-box" style={{background:'#fcfcfc', border:'1px solid #cfd8dc'}}>
             
             {/* Ovários Fixos */}
             <div className="laudo-row" style={{marginBottom:'10px'}}>
                 <label><input type="checkbox" name="endoOvariosFixos" checked={data.endoOvariosFixos} onChange={handleChange} /> Ovários medianizados e fixos</label>
             </div>

             {/* 1. ESPESSAMENTO */}
             <div style={{fontWeight:'bold', fontSize:'11px', marginBottom:'5px', color:'#333'}}>Espessamento</div>
             <div className="laudo-group-box" style={{background:'#fff', marginBottom:'10px'}}>
                 <div className="laudo-row">
                     <input type="checkbox" name="endoEspessamento" checked={data.endoEspessamento} onChange={handleChange} />
                     espessamento na região 
                     <select name="endoEspessamentoLoc" value={data.endoEspessamentoLoc} onChange={handleChange} className="laudo-select-small" style={{width:'100px'}}><option>retrocervical</option><option>paracervical</option></select>
                     medindo
                 </div>
                 <div className="laudo-row" style={{paddingLeft:'20px'}}>
                     <input name="endoEspD1" value={data.endoEspD1} onChange={handleChange} className="laudo-input-tiny"/> x <input name="endoEspD2" value={data.endoEspD2} onChange={handleChange} className="laudo-input-tiny"/> x <input name="endoEspD3" value={data.endoEspD3} onChange={handleChange} className="laudo-input-tiny"/> mm, estendendo-se
                 </div>
                 <div className="laudo-row" style={{paddingLeft:'20px'}}>
                     para <select name="endoEspExtensao" value={data.endoEspExtensao} onChange={handleChange} className="laudo-select-small"><option>a parede anterior do reto</option><option>o ligamento uterossacro</option></select>
                 </div>
             </div>

             {/* 2. FORMAÇÕES NODULARES (3 Slots) */}
             <div style={{fontWeight:'bold', fontSize:'11px', marginBottom:'5px', color:'#333'}}>Formações nodulares hipoecogênicas de aspecto sólido</div>
             {[1, 2, 3].map(i => (
                 <div key={i} className="laudo-group-box" style={{background:'#fff', marginBottom:'5px'}}>
                     <div className="laudo-row">
                         <input type="checkbox" name={`endoNod${i}`} checked={data[`endoNod${i}`]} onChange={handleChange} />
                         na região <select name={`endoNod${i}Loc`} value={data[`endoNod${i}Loc`]} onChange={handleChange} className="laudo-select-small" style={{flex:1}}><option>retrocervical</option><option>septovaginal</option><option>lig. uterossacro</option></select>
                     </div>
                     {data[`endoNod${i}`] && (
                        <>
                         <div className="laudo-row" style={{paddingLeft:'20px'}}>
                             medindo <input name={`endoNod${i}D1`} value={data[`endoNod${i}D1`]} onChange={handleChange} className="laudo-input-tiny"/> x <input name={`endoNod${i}D2`} value={data[`endoNod${i}D2`]} onChange={handleChange} className="laudo-input-tiny"/> x <input name={`endoNod${i}D3`} value={data[`endoNod${i}D3`]} onChange={handleChange} className="laudo-input-tiny"/> mm,
                         </div>
                         <div className="laudo-row" style={{paddingLeft:'20px'}}>
                             <select name={`endoNod${i}Inv`} value={data[`endoNod${i}Inv`]} onChange={handleChange} className="laudo-select-small"><option>não citar invasão muscular</option><option>com invasão muscular</option></select>
                         </div>
                        </>
                     )}
                 </div>
             ))}

             {/* 3. PLACAS EM PAREDES DE ALÇAS (3 Slots) */}
             <div style={{fontWeight:'bold', fontSize:'11px', marginBottom:'5px', marginTop:'10px', color:'#333'}}>Placas em paredes de alças intestinais</div>
             {[1, 2, 3].map(i => (
                 <div key={i} className="laudo-group-box" style={{background:'#fff', marginBottom:'5px'}}>
                     <div className="laudo-row">
                         <input type="checkbox" name={`endoPlaca${i}`} checked={data[`endoPlaca${i}`]} onChange={handleChange} />
                         placa hipoecogênica na parede do <select name={`endoPlaca${i}Loc`} value={data[`endoPlaca${i}Loc`]} onChange={handleChange} className="laudo-select-small"><option>retosigmoide</option><option>reto</option><option>sigmoide</option></select> medindo
                     </div>
                     {data[`endoPlaca${i}`] && (
                        <>
                         <div className="laudo-row" style={{paddingLeft:'20px'}}>
                             <input name={`endoPlaca${i}D1`} value={data[`endoPlaca${i}D1`]} onChange={handleChange} className="laudo-input-tiny"/> x <input name={`endoPlaca${i}D2`} value={data[`endoPlaca${i}D2`]} onChange={handleChange} className="laudo-input-tiny"/> x <input name={`endoPlaca${i}D3`} value={data[`endoPlaca${i}D3`]} onChange={handleChange} className="laudo-input-tiny"/> mm incluindo <select name={`endoPlaca${i}Camada`} value={data[`endoPlaca${i}Camada`]} onChange={handleChange} className="laudo-select-small"><option>serosa</option><option>muscular própria</option></select>
                         </div>
                         <div className="laudo-row" style={{paddingLeft:'20px'}}>
                             envolvendo <input type="number" name={`endoPlaca${i}Circ`} value={data[`endoPlaca${i}Circ`]} onChange={handleChange} className="laudo-input-tiny"/> % da circunferência, a <input type="number" name={`endoPlaca${i}Dist`} value={data[`endoPlaca${i}Dist`]} onChange={handleChange} className="laudo-input-tiny"/> mm da borda anal
                         </div>
                        </>
                     )}
                 </div>
             ))}

             {/* Checkbox Normais */}
             <div className="laudo-row" style={{marginTop:'10px', borderTop:'1px solid #eee', paddingTop:'5px'}}>
                 <label style={{display:'flex', alignItems:'start', gap:'5px', fontSize:'10px', color:'#555'}}>
                     <input type="checkbox" name="endoNormais" checked={data.endoNormais} onChange={handleChange} style={{marginTop:'2px'}}/> 
                     citar como NORMAIS as demais estruturas avaliadas com preparo intestinal (recesso vesicouterino, septo retovaginal, região retrocervical, ligamentos uterossacros e alças intestinais)
                 </label>
             </div>

          </div>
      )}

      <div className="laudo-header-dark" style={{marginTop:'10px', background:'#78909c'}}>Líquido livre</div>
      <div className="laudo-row" style={{background:'#e0e0e0', padding:'5px'}}>
          <select name="liquidoLivreLocal" value={data.liquidoLivreLocal} onChange={handleChange} className="laudo-select" style={{width:'50%', fontWeight:'bold'}}>
              <option value="ausente">ausente</option>
              <option value="na pelve">na pelve</option>
              <option value="no fundo de saco">no fundo de saco</option>
          </select>
          {data.liquidoLivreLocal !== 'ausente' && (
              <select name="liquidoLivreQtd" value={data.liquidoLivreQtd} onChange={handleChange} className="laudo-select" style={{width:'40%', marginLeft:'5px'}}>
                  <option value="pequena quantidade">pequena quantidade</option>
                  <option value="moderada quantidade">moderada quantidade</option>
                  <option value="grande quantidade">grande quantidade</option>
              </select>
          )}
      </div>

    </div>
  );
};

export default SecaoOvariosTuring;