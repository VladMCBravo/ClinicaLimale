import React from 'react';

const SecaoConclusao = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-green">Conclusão</div>
        <div className="laudo-section-body">
            <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
                <input type="checkbox" name="conclusaoNormal" checked={data.conclusaoNormal} onChange={handleChange} /> 
                Concluir DESENVOLVIMENTO como NORMAL
            </label>
            <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
                <input type="checkbox" /> 
                Concluir MORFOLOGIA como NORMAL
            </label>
            {data.usarDoppler && (
                <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
                    <input type="checkbox" /> 
                    Concluir DOPPLER como NORMAL
                </label>
            )}
            <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
                <input type="checkbox" /> 
                Concluir TRANSLUCÊNCIA NUCAL como NORMAL
            </label>
            
            <div style={{marginTop: '10px'}}>
                <span style={{fontWeight:'bold'}}>Observações adicionais:</span>
                <textarea 
                    name="obsAdicionais" 
                    value={data.obsAdicionais} 
                    onChange={handleChange}
                    className="laudo-input"
                    style={{width:'100%', height:'60px', marginTop:'5px', fontFamily:'Arial'}} 
                />
            </div>
        </div>
    </div>
  );
};

export default SecaoConclusao;