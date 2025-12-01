// src/components/laudos/trasnvaginal/sections/SecaoOvariosTuring.jsx
import React from 'react';

const SecaoOvariosTuring = ({ data, handleChange }) => {

  const renderOvario = (label, prefix) => (
    <div className="laudo-group-box" style={{marginBottom: '15px'}}>
        <div style={{fontWeight:'bold', color: '#1565C0', marginBottom:'5px'}}>{label}</div>
        
        {/* Medidas */}
        <div className="laudo-row">
            Mede: <input type="number" name={`${prefix}1`} value={data[`${prefix}1`]} onChange={handleChange} className="laudo-input-small"/> x
            <input type="number" name={`${prefix}2`} value={data[`${prefix}2`]} onChange={handleChange} className="laudo-input-small"/> x
            <input type="number" name={`${prefix}3`} value={data[`${prefix}3`]} onChange={handleChange} className="laudo-input-small"/> mm
        </div>

        {/* Checkboxes Padrão */}
        <div className="laudo-row-wrap">
            <label><input type="checkbox" name={`${prefix}Normal`} checked={data[`${prefix}Normal`]} onChange={handleChange} /> normal</label>
            <label><input type="checkbox" name={`${prefix}Multifolicular`} checked={data[`${prefix}Multifolicular`]} onChange={handleChange} /> padrão multifolicular</label>
            <label><input type="checkbox" name={`${prefix}Policistico`} checked={data[`${prefix}Policistico`]} onChange={handleChange} /> padrão policístico</label>
            <label><input type="checkbox" name={`${prefix}NaoCaracterizado`} checked={data[`${prefix}NaoCaracterizado`]} onChange={handleChange} /> não caracterizado</label>
        </div>

        {/* Cistos Slots */}
        {[1, 2].map(num => (
            <div key={num} style={{marginTop:'5px', padding:'5px', border:'1px dashed #ccc', background:'#fff'}}>
                <div className="laudo-row">
                    <input type="checkbox" name={`${prefix}Cisto${num}`} checked={data[`${prefix}Cisto${num}`]} onChange={handleChange} />
                    <span>cisto {num} </span>
                    <input type="number" name={`${prefix}C${num}d1`} value={data[`${prefix}C${num}d1`]} onChange={handleChange} className="laudo-input-small"/> x
                    <input type="number" name={`${prefix}C${num}d2`} value={data[`${prefix}C${num}d2`]} onChange={handleChange} className="laudo-input-small"/> mm
                    <select name={`${prefix}C${num}Tipo`} value={data[`${prefix}C${num}Tipo`]} onChange={handleChange} className="laudo-select">
                        <option value="cisto simples">cisto simples</option>
                        <option value="cisto hemorrágico">cisto hemorrágico</option>
                        <option value="endometrioma">endometrioma</option>
                        <option value="teratoma">teratoma</option>
                    </select>
                </div>
                <div className="laudo-row">
                    <span style={{fontSize:'10px'}}>Doppler:</span>
                    <select name={`${prefix}C${num}Doppler`} value={data[`${prefix}C${num}Doppler`]} onChange={handleChange} className="laudo-select-small">
                        <option>não citar</option><option>avascular</option><option>vascularização periférica</option>
                    </select>
                    <span style={{fontSize:'10px', marginLeft:'5px'}}>O-RADS:</span>
                    <select name={`${prefix}C${num}Orads`} value={data[`${prefix}C${num}Orads`]} onChange={handleChange} className="laudo-select-small" style={{width:'50px'}}>
                        <option value=""></option><option value="1">1</option><option value="2">2</option><option value="3">3</option>
                    </select>
                </div>
            </div>
        ))}
    </div>
  );

  return (
    <div className="laudo-section">
      <div className="laudo-header-dark">Ovários e regiões anexiais</div>

      {/* DOPPLER GLOBAL OVARIO */}
      <div className="laudo-group-box" style={{background:'#f0f4f8'}}>
          <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
              <input type="checkbox" name="incluirDopplerOvario" checked={data.incluirDopplerOvario} onChange={handleChange} />
              Incluir Doppler das artérias ovarianas
          </label>
          {data.incluirDopplerOvario && (
              <div style={{marginTop:'5px'}}>
                   <div className="laudo-row">DIR: IR <input type="text" name="ovDirIR" value={data.ovDirIR} onChange={handleChange} className="laudo-input-small"/> IP <input type="text" name="ovDirIP" value={data.ovDirIP} onChange={handleChange} className="laudo-input-small"/></div>
                   <div className="laudo-row">ESQ: IR <input type="text" name="ovEsqIR" value={data.ovEsqIR} onChange={handleChange} className="laudo-input-small"/> IP <input type="text" name="ovEsqIP" value={data.ovEsqIP} onChange={handleChange} className="laudo-input-small"/></div>
              </div>
          )}
      </div>

      {renderOvario('Ovário direito', 'od')}
      {renderOvario('Ovário esquerdo', 'oe')}

      {/* EXTRAS */}
      <div className="laudo-header-sub">Outros achados</div>
      
      <div className="laudo-row">
          <input type="checkbox" name="cistoParaovariano" checked={data.cistoParaovariano} onChange={handleChange} />
          Cisto paraovariano
          {data.cistoParaovariano && <input type="number" name="cistoParaD1" value={data.cistoParaD1} className="laudo-input-small"/>}
      </div>

      <div className="laudo-header-sub" style={{marginTop:'10px'}}>Hidrossalpinge?</div>
      <div className="laudo-row">
          <input type="checkbox" name="hidrossalpingeDir" checked={data.hidrossalpingeDir} onChange={handleChange} />
          à DIREITA <input type="number" name="hidroDirD1" value={data.hidroDirD1} className="laudo-input-small"/> mm
      </div>
      <div className="laudo-row">
          <input type="checkbox" name="hidrossalpingeEsq" checked={data.hidrossalpingeEsq} onChange={handleChange} />
          à ESQUERDA <input type="number" name="hidroEsqD1" value={data.hidroEsqD1} className="laudo-input-small"/> mm
      </div>

      <div className="laudo-header-dark" style={{marginTop:'20px'}}>Líquido livre</div>
      <div className="laudo-row">
          <select name="liquidoLivre" value={data.liquidoLivre} onChange={handleChange} className="laudo-select" style={{width:'50%'}}>
              <option value="ausente">ausente</option>
              <option value="na pelve">na pelve</option>
              <option value="no fundo de saco">no fundo de saco</option>
          </select>
          {data.liquidoLivre !== 'ausente' && (
              <select name="liquidoLivreQtd" value={data.liquidoLivreQtd} onChange={handleChange} className="laudo-select" style={{width:'40%'}}>
                  <option value="pequena quantidade">pequena quantidade</option>
                  <option value="moderada quantidade">moderada quantidade</option>
              </select>
          )}
      </div>

    </div>
  );
};

export default SecaoOvariosTuring;