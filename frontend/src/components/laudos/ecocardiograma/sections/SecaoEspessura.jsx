import React from 'react';

const RadioBlock = ({ label, name, value, checkedValue, onChange, children }) => (
    <div style={{marginBottom:'2px'}}>
        <label className="laudo-checkbox-label">
            <input type="radio" name={name} value={value} checked={checkedValue === value} onChange={onChange} />
            {label}
        </label>
        {children}
    </div>
);

const SecaoEspessura = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-blue">Espessura Miocárdica</div>
        <div className="laudo-section-body">
            
            {/* VENTRÍCULO ESQUERDO */}
            <div style={{fontWeight:'bold', fontSize:'11px', marginBottom:'4px'}}>Ventrículo esquerdo</div>
            
            <RadioBlock label="normal" name="espessuraVe" value="normal" checkedValue={data.espessuraVe} onChange={handleChange} />
            <RadioBlock label="VE com espessura miocárdica no limite da normalidade" name="espessuraVe" value="limite" checkedValue={data.espessuraVe} onChange={handleChange} />
            <RadioBlock label="Hipertrofia excêntrica do VE" name="espessuraVe" value="hipertrofia_excentrica" checkedValue={data.espessuraVe} onChange={handleChange} />
            <RadioBlock label="Hipertrofia concêntrica do VE" name="espessuraVe" value="hipertrofia_concentrica" checkedValue={data.espessuraVe} onChange={handleChange} />
            <RadioBlock label="Remodelamento concêntrico do VE" name="espessuraVe" value="remodelamento" checkedValue={data.espessuraVe} onChange={handleChange} />
            <RadioBlock label="Hipertrofia apical localizada do VE" name="espessuraVe" value="hipertrofia_apical" checkedValue={data.espessuraVe} onChange={handleChange} />
            
            <div className="laudo-row">
                 <input type="radio" name="espessuraVe" value="septo_sigmoide" checked={data.espessuraVe === 'septo_sigmoide'} onChange={handleChange} />
                 <span style={{fontSize:'11px', marginLeft:'5px'}}>Septo interventricular em sigmoide medindo</span>
                 <input 
                    type="number" name="septoSigmoide" value={data.septoSigmoide} onChange={handleChange} 
                    disabled={data.espessuraVe !== 'septo_sigmoide'}
                    className="laudo-input" style={{width:'40px', margin:'0 5px'}} 
                 />
                 <span style={{fontSize:'10px'}}>mm</span>
            </div>

            {/* VENTRÍCULO DIREITO */}
            <div style={{fontWeight:'bold', fontSize:'11px', marginTop:'10px', marginBottom:'4px'}}>Ventrículo direito</div>
            <RadioBlock label="não citar" name="espessuraVd" value="nao_citar" checkedValue={data.espessuraVd} onChange={handleChange} />
            <RadioBlock label="normal" name="espessuraVd" value="normal" checkedValue={data.espessuraVd} onChange={handleChange} />
            <RadioBlock label="VD com espessura miocárdica no limite da normalidade" name="espessuraVd" value="limite" checkedValue={data.espessuraVd} onChange={handleChange} />
            <RadioBlock label="Hipertrofia do ventrículo direito" name="espessuraVd" value="hipertrofia" checkedValue={data.espessuraVd} onChange={handleChange} />

        </div>
    </div>
  );
};

export default SecaoEspessura;