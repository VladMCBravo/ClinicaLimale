import React from 'react';

const SecaoConclusao = ({ data, handleChange }) => {
  return (
    <div className="laudo-section" style={{marginBottom: '50px'}}> {/* Margem extra p/ fim da página */}
        <div className="header-base header-red">Conclusão e Diagnóstico</div>
        
        <div className="laudo-section-body">
            
            {/* LINHA PESO */}
            <div className="laudo-row" style={{marginBottom: '10px'}}>
                <span style={{fontWeight:'bold'}}>Peso Estimado (g):</span>
                <input type="number" name="pesoEstimado" value={data.pesoEstimado} onChange={handleChange} className="laudo-input" style={{width:'70px', marginRight:'15px'}} />
                
                {/* NOVOS CAMPOS P10 / P90 */}
                <span className="label-pequeno">P10:</span>
                <input type="number" name="pesoP10" value={data.pesoP10} onChange={handleChange} className="laudo-input-small" style={{width:'50px'}} />
                
                <span className="label-pequeno" style={{marginLeft:'5px'}}>P90:</span>
                <input type="number" name="pesoP90" value={data.pesoP90} onChange={handleChange} className="laudo-input-small" style={{width:'50px'}} />

                <span style={{marginLeft:'15px'}}>Percentil:</span>
                <input type="text" name="percentil" value={data.percentil} onChange={handleChange} className="laudo-input" style={{width:'50px'}} />
            </div>

            {/* SEXO */}
            <div className="laudo-row" style={{marginBottom: '10px'}}>
                <span style={{fontWeight:'bold'}}>Sexo Fetal:</span>
                <select name="sexoFetal" value={data.sexoFetal} onChange={handleChange} className="laudo-select">
                    <option value="NAO_CITAR">Não citar</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMININO">Feminino</option>
                    <option value="NAO_VISUALIZADO">Não visualizado</option>
                </select>
            </div>

            {/* TEXTAREA OBS EXTRAS */}
            <div style={{marginTop: '10px'}}>
                <span style={{fontWeight:'bold', fontSize:'12px'}}>Observações Adicionais:</span>
                <textarea 
                    name="obsAdicionais" 
                    value={data.obsAdicionais} 
                    onChange={handleChange} 
                    className="laudo-textarea"
                    rows="3"
                />
            </div>

        </div>
    </div>
  );
};

export default SecaoConclusao;