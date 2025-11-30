import React from 'react';

const SecaoStrain = ({ data, handleChange }) => {
  return (
    <div className="laudo-section" style={{border: '2px solid #2E7D32'}}>
        <div className="header-base" style={{background: '#2E7D32', color: 'white'}}>
            Análise de Deformação (Strain)
        </div>
        <div className="laudo-section-body">
            <div className="laudo-row">
                <span style={{fontWeight:'bold', fontSize:'11px', width:'200px'}}>Strain Longitudinal Global (GLS):</span>
                <input 
                    type="number" 
                    name="strainGls" 
                    value={data.strainGls} 
                    onChange={handleChange} 
                    className="laudo-input" 
                    style={{width:'50px', marginRight:'5px'}} 
                    placeholder="-20"
                />
                <span style={{fontSize:'11px'}}>%</span>
            </div>
            
            <div style={{marginTop:'5px', fontSize:'10px', color:'#555'}}>
                Valor de referência habitual: &lt; -18% (em módulo &gt; 18%)
            </div>

            <div style={{marginTop:'10px', borderTop:'1px solid #eee', paddingTop:'5px'}}>
                <label className="laudo-checkbox-label" style={{display:'block'}}>
                    <input 
                        type="radio" 
                        name="strainConclusao" 
                        value="preservado" 
                        checked={data.strainConclusao === 'preservado'} 
                        onChange={handleChange} 
                    />
                    Deformação miocárdica global preservada.
                </label>
                <label className="laudo-checkbox-label" style={{display:'block'}}>
                    <input 
                        type="radio" 
                        name="strainConclusao" 
                        value="reduzido" 
                        checked={data.strainConclusao === 'reduzido'} 
                        onChange={handleChange} 
                    />
                    Deformação miocárdica global reduzida.
                </label>
            </div>
        </div>
    </div>
  );
};

export default SecaoStrain;