// src/components/laudos/trasnvaginal/sections/SecaoOvariosTuring.jsx
import React, { useState } from 'react';
import { FaTable } from 'react-icons/fa';

const SecaoOvariosTuring = ({ data, handleChange, setShowModalOrads }) => {
  const [expandEndo, setExpandEndo] = useState(false);

  // Lista de Cistos conforme Vídeo
  const tiposCisto = [
      "cisto simples", "corpo lúteo", "cisto unilocular", 
      "cisto unilocular com componente sólido", "cisto hemorrágico", 
      "endometrioma", "cisto dermoide", "cisto bilocular", 
      "cisto multilocular", "cisto multilocular com componente sólido", 
      "nódulo sólido irregular (sem atenuação acústica)"
  ];
  
  // Lista de Doppler conforme Vídeo
  const opcoesDoppler = [
      "não citar", "avascular", "fluxo indefinível", 
      "fluxo periférico escasso (score de cor 2)", 
      "fluxo moderado (score de cor 3)", 
      "fluxo intenso (score de cor 4)", 
      "fluxo periférico escasso", "fluxo central"
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
                    <select name={`${prefix}C${num}Doppler`} value={data[`${prefix}C${num}Doppler`]} onChange={handleChange} className="laudo-select-small" style={{width:'120px'}}>
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
          <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
              <button onClick={() => setShowModalOrads(true)} className="laudo-btn-small" style={{display:'flex', gap:'5px', alignItems:'center'}}><FaTable/> Tabela O-RADS</button>
              <select name="oradsFinal" value={data.oradsFinal} onChange={handleChange} className="laudo-select-small" style={{background:'white'}}>
                  <option value="não citar">O-RADS final: não citar</option>
                  <option value="O-RADS 1">O-RADS 1</option>
                  <option value="O-RADS 2">O-RADS 2</option>
                  <option value="O-RADS 3">O-RADS 3</option>
              </select>
          </div>
      </div>

      <div className="laudo-row" style={{background:'#eceff1', padding:'5px', marginBottom:'10px'}}>
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
                      <option value="à direita">à direita</option>
                      <option value="à esquerda">à esquerda</option>
                  </select>
                  medindo <input name="cistoIncD1" value={data.cistoIncD1} onChange={handleChange} className="laudo-input-tiny"/> x <input name="cistoIncD2" value={data.cistoIncD2} onChange={handleChange} className="laudo-input-tiny"/> mm
              </div>
          )}
      </div>

      <div className="laudo-header-sub">Hidrossalpinge?</div>
      <div className="laudo-row"><label><input type="checkbox" name="hidrossalpingeDir" checked={data.hidrossalpingeDir} onChange={handleChange} /> presente à DIREITA, medindo <input name="hidroDirD1" value={data.hidroDirD1} className="laudo-input-tiny"/> mm</label></div>
      <div className="laudo-row"><label><input type="checkbox" name="hidrossalpingeEsq" checked={data.hidrossalpingeEsq} onChange={handleChange} /> presente à ESQUERDA, medindo <input name="hidroEsqD1" value={data.hidroEsqD1} className="laudo-input-tiny"/> mm</label></div>

      <div 
        className="laudo-header-dark" 
        style={{marginTop:'10px', background:'#78909c', cursor:'pointer', display:'flex', justifyContent:'space-between'}}
        onClick={() => setExpandEndo(!expandEndo)}
      >
          <span>Pesquisa de ENDOMETRIOSE (clique para expandir)</span>
          <span>{expandEndo ? '▲' : '▼'}</span>
      </div>
      {expandEndo && (
          <div className="laudo-group-box">
             <div className="laudo-row"><label><input type="checkbox" name="endoToro" checked={data.endoToro} onChange={handleChange} /> Tórus uterino espessado</label></div>
             <div className="laudo-row"><label><input type="checkbox" name="endoLigS" checked={data.endoLigS} onChange={handleChange} /> Ligamentos uterossacros espessados</label></div>
             <div className="laudo-row"><label><input type="checkbox" name="endoReto" checked={data.endoReto} onChange={handleChange} /> Nódulo retossigmoide</label></div>
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