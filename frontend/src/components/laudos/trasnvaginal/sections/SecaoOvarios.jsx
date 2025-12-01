import React from 'react';

const SecaoOvarios = ({ data, handleChange }) => {
  
  const renderOvario = (lado, prefix, vol) => (
    <div style={{flex: 1, border: '1px solid #ddd', padding: '5px', borderRadius: '4px', background: '#fafafa'}}>
        <div style={{fontWeight: 'bold', marginBottom: '5px', borderBottom: '1px solid #ccc'}}>OVÁRIO {lado.toUpperCase()}</div>
        
        <label className="laudo-checkbox-label">
            <input type="checkbox" name={`${prefix}Visibilizado`} checked={data[`${prefix}Visibilizado`]} onChange={handleChange} />
            Visibilizado
        </label>

        {data[`${prefix}Visibilizado`] && (
            <>
                <div style={{display:'flex', alignItems:'center', gap:'2px', marginTop:'5px'}}>
                    <input type="number" name={`${prefix}1`} value={data[`${prefix}1`]} onChange={handleChange} className="laudo-input-small" placeholder="L"/> x
                    <input type="number" name={`${prefix}2`} value={data[`${prefix}2`]} onChange={handleChange} className="laudo-input-small" placeholder="AP"/> x
                    <input type="number" name={`${prefix}3`} value={data[`${prefix}3`]} onChange={handleChange} className="laudo-input-small" placeholder="T"/>
                </div>
                <div style={{fontSize:'11px', color:'#666', marginTop:'2px'}}>Vol: <b>{vol}</b> cm³</div>

                <div style={{marginTop:'8px'}}>
                    <label style={{display:'block', fontSize:'11px'}}>Aspecto:</label>
                    <select name={`${prefix}Aspecto`} value={data[`${prefix}Aspecto`]} onChange={handleChange} className="laudo-select" style={{width:'100%'}}>
                        <option value="normal">Normal / Folicular</option>
                        <option value="policistico">Micropolicístico (SOP)</option>
                        <option value="cisto_simples">Cisto Simples</option>
                        <option value="cisto_hemorragico">Cisto Hemorrágico</option>
                        <option value="teratoma">Sugg. Teratoma</option>
                        <option value="endometrioma">Sugg. Endometrioma</option>
                    </select>
                </div>

                {(data[`${prefix}Aspecto`].includes('cisto') || data[`${prefix}Aspecto`] === 'teratoma' || data[`${prefix}Aspecto`] === 'endometrioma') && (
                     <div style={{marginTop:'5px', background:'#fff', padding:'3px', border:'1px dashed #ccc'}}>
                         <label style={{fontSize:'10px'}}>Diâmetro Cisto (mm):</label>
                         <input type="number" name={`${prefix}CistoMedida`} value={data[`${prefix}CistoMedida`]} onChange={handleChange} className="laudo-input-small" style={{width:'100%'}}/>
                     </div>
                )}
            </>
        )}
    </div>
  );

  return (
    <div className="laudo-section">
      <h4>Ovários e Anexos</h4>
      <div style={{display:'flex', gap:'10px'}}>
          {renderOvario('Direito', 'od', data.resVolOd)}
          {renderOvario('Esquerdo', 'oe', data.resVolOe)}
      </div>
    </div>
  );
};

export default SecaoOvarios;