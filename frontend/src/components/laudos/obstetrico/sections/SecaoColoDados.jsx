import React from 'react';

const SecaoColoDados = ({ data, handleChange }) => {
  return (
    <>
        {/* Colo Uterino */}
        <div className="laudo-section">
            <div className="header-base header-green">Colo uterino</div>
            <div className="laudo-section-body">
                <div className="laudo-col">
                    <label className="laudo-checkbox-label">
                        <input type="checkbox" name="citarColoNormal" checked={data.citarColoNormal} onChange={handleChange} /> 
                        citar colo de aspecto normal (fechado)
                    </label>
                    <div className="laudo-row">
                        <label className="laudo-checkbox-label">
                            <input type="checkbox" name="citarComprimentoColo" checked={data.citarComprimentoColo} onChange={handleChange} /> 
                            citar comprimento do colo:
                        </label>
                        <input name="medidaColo" value={data.medidaColo} onChange={handleChange} className="laudo-input laudo-input-small" style={{width: '60px'}} /> 
                        <span>mm</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Dados Iniciais */}
        <div className="laudo-section">
            <div className="header-base header-green">Dados iniciais</div>
            <div className="laudo-section-body">
                <div className="laudo-grid-3">
                    <div className="laudo-col">
                        <span style={{fontWeight:'bold'}}>situação</span>
                        <select name="situacao" value={data.situacao} onChange={handleChange} className="laudo-select" style={{width:'100%'}}>
                            <option>longitudinal</option><option>transversa</option><option>oblíqua</option>
                        </select>
                    </div>
                    <div className="laudo-col">
                        <span style={{fontWeight:'bold'}}>apresentação</span>
                        <select name="apresentacao" value={data.apresentacao} onChange={handleChange} className="laudo-select" style={{width:'100%'}}>
                            <option>cefálica</option><option>pélvica</option><option>córmica</option>
                        </select>
                    </div>
                    <div className="laudo-col">
                        <span style={{fontWeight:'bold'}}>dorso</span>
                        <select name="dorso" value={data.dorso} onChange={handleChange} className="laudo-select" style={{width:'100%'}}>
                            <option>à esquerda</option><option>à direita</option><option>anterior</option><option>posterior</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    </>
  );
};

export default SecaoColoDados;