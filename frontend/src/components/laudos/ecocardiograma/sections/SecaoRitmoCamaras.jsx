import React from 'react';

const RadioItem = ({ label, name, value, checkedValue, onChange, style={} }) => (
    <label className="laudo-checkbox-label" style={{display:'block', marginBottom:'2px', ...style}}>
        <input type="radio" name={name} value={value} checked={checkedValue === value} onChange={onChange} />
        {label}
    </label>
);

const CamaraRow = ({ label, name, value, onChange, disabled }) => (
    <div style={{display:'flex', alignItems:'center', marginTop:'4px', opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto'}}>
        <span style={{width:'110px', fontSize:'10px', fontWeight:'bold', color:'#555'}}>{label}</span>
        <div style={{display:'flex', gap:'8px'}}>
            {['normal', 'discreto', 'moderado', 'importante'].map(opt => (
                <label key={opt} style={{fontSize:'9px', display:'flex', alignItems:'center', cursor:'pointer'}}>
                    <input 
                        type="radio" 
                        name={name} 
                        value={opt} 
                        checked={value === opt} 
                        onChange={onChange}
                        style={{marginRight:'2px'}}
                    />
                    {opt === 'normal' ? 'normal' : `aumento ${opt}`}
                </label>
            ))}
        </div>
    </div>
);

const SecaoRitmoCamaras = ({ data, handleChange }) => {
  const isIndividual = data.camaras === 'Individual';

  return (
    <>
        <div className="laudo-section">
            <div className="header-base header-blue">Ritmo Cardíaco</div>
            <div className="laudo-section-body">
                <RadioItem label="Regular" name="ritmo" value="Regular" checkedValue={data.ritmo} onChange={handleChange} />
                <RadioItem label="Regular com raras extrassístoles" name="ritmo" value="Regular com raras extrassístoles" checkedValue={data.ritmo} onChange={handleChange} />
                <RadioItem label="Irregular" name="ritmo" value="Irregular" checkedValue={data.ritmo} onChange={handleChange} />
                <RadioItem label="Fibrilação atrial" name="ritmo" value="Fibrilação atrial" checkedValue={data.ritmo} onChange={handleChange} />
            </div>
        </div>

        <div className="laudo-section">
            <div className="header-base header-blue">Tamanho das Câmaras Cardíacas</div>
            <div className="laudo-section-body">
                <RadioItem label="tamanho normal de todas as câmaras cardíacas" name="camaras" value="Normal" checkedValue={data.camaras} onChange={handleChange} style={{fontWeight:'bold', color:'#1565C0'}} />
                
                <div className="laudo-row">
                    <input type="radio" name="camaras" value="AumentoGlobal" checked={data.camaras === 'AumentoGlobal'} onChange={handleChange} />
                    <span style={{fontSize:'11px', marginLeft:'5px'}}>aumento global das câmaras cardíacas</span>
                </div>

                <div className="laudo-row" style={{marginBottom:'5px'}}>
                    <input type="radio" name="camaras" value="Individual" checked={data.camaras === 'Individual'} onChange={handleChange} />
                    <span style={{fontSize:'11px', marginLeft:'5px'}}>descrever aumentos individualmente</span>
                </div>

                {/* Bloco Individual */}
                <div style={{borderTop:'1px solid #eee', paddingTop:'5px', paddingLeft:'5px'}}>
                    <CamaraRow label="Átrio Direito" name="camIndAd" value={data.camIndAd} onChange={handleChange} disabled={!isIndividual} />
                    <CamaraRow label="Átrio Esquerdo" name="camIndAe" value={data.camIndAe} onChange={handleChange} disabled={!isIndividual} />
                    <CamaraRow label="Ventrículo Direito" name="camIndVd" value={data.camIndVd} onChange={handleChange} disabled={!isIndividual} />
                    <CamaraRow label="Ventrículo Esquerdo" name="camIndVe" value={data.camIndVe} onChange={handleChange} disabled={!isIndividual} />
                    
                    <div style={{marginTop:'5px', opacity: isIndividual ? 1 : 0.5}}>
                        <label className="laudo-checkbox-label">
                            <input type="checkbox" name="camDeformidade" checked={data.camDeformidade} onChange={handleChange} disabled={!isIndividual} />
                            com deformidade geométrica
                        </label>
                    </div>
                </div>
            </div>
        </div>
    </>
  );
};

export default SecaoRitmoCamaras;