import React from 'react';

const SecaoConclusao = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        {/* TÍTULO VISUAL PARA APARECER NA TELA */}
        <div className="header-base header-purple">Conclusão</div>
        
        <div className="laudo-section-body">
            <div className="laudo-grid-2" style={{gap: '15px'}}>
                
                {/* Peso */}
                <div>
                    <span className="label-pequeno">Peso Estimado (g)</span>
                    <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <input 
                            type="number" 
                            name="pesoEstimado" 
                            value={data.pesoEstimado || ''} 
                            onChange={handleChange}
                            className="laudo-input" 
                            style={{width: '100%', fontWeight: 'bold'}}
                            placeholder="Ex: 1500"
                        />
                        <span style={{fontSize: '10px', color: '#666'}}>+/- 10%</span>
                    </div>
                </div>

                {/* Sexo */}
                <div>
                    <span className="label-pequeno">Sexo Fetal</span>
                    <select 
                        name="sexoFetal" 
                        value={data.sexoFetal || 'MASCULINO'} 
                        onChange={handleChange}
                        className="laudo-select full-width"
                        style={{fontWeight: 'bold'}}
                    >
                        <option value="MASCULINO">Masculino</option>
                        <option value="FEMININO">Feminino</option>
                        <option value="NAO_VISUALIZADO">Não Visualizado</option>
                        <option value="NAO_CITAR">Não Citar</option>
                    </select>
                </div>
            </div>

            {/* Percentil */}
            <div className="laudo-row" style={{marginTop: '10px'}}>
                <span className="label-pequeno" style={{width: 'auto', marginRight: '10px'}}>Percentil (opcional):</span>
                <input 
                    type="text" 
                    name="percentil" 
                    value={data.percentil || ''} 
                    onChange={handleChange}
                    className="laudo-input" 
                    style={{width: '80px'}}
                    placeholder="Ex: 50"
                />
            </div>

            {/* Obs Adicionais */}
            <div style={{marginTop: '15px'}}>
                <span className="label-pequeno">Observações Adicionais (sairão na conclusão):</span>
                <textarea 
                    name="obsAdicionais"
                    value={data.obsAdicionais || ''}
                    onChange={handleChange}
                    className="laudo-input"
                    style={{width: '100%', height: '60px', marginTop: '5px'}}
                    placeholder="Digite aqui observações extras..."
                />
            </div>
        </div>
    </div>
  );
};

export default SecaoConclusao;