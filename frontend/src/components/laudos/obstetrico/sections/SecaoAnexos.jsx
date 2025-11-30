import React from 'react';
// CSS importado no Pai

const SecaoAnexos = ({ data, handleChange }) => {
  return (
    <>
        {/* CORDÃO UMBILICAL */}
        <div className="laudo-section">
            <div className="header-base header-green">Cordão umbilical</div>
            <div className="laudo-section-body">
                <div className="laudo-row" style={{justifyContent: 'space-between'}}>
                    <label className="laudo-checkbox-label">
                        <input type="checkbox" name="cordaoNormal" checked={data.cordaoNormal} onChange={handleChange} /> 
                        citar cordão normal (c/2 artérias e 1 veia)
                    </label>
                    <div className="laudo-row">
                        <span>Circular:</span>
                        <select name="cordaoCircular" value={data.cordaoCircular} onChange={handleChange} className="laudo-select">
                            <option>não citar</option>
                            <option>ausente</option>
                            <option>cervical (1 volta)</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        {/* PLACENTA */}
        <div className="laudo-section">
            <div className="header-base header-green">Placenta</div>
            <div className="laudo-section-body">
                <div className="laudo-row">
                    <span>inserção</span>
                    <select name="placentaInsercao" value={data.placentaInsercao} onChange={handleChange} className="laudo-select">
                        <option>Corporal Posterior</option><option>Corporal Anterior</option><option>Fúndica</option><option>Prévia</option>
                    </select>
                    <span>aspecto</span>
                    <select name="placentaAspecto" value={data.placentaAspecto} onChange={handleChange} className="laudo-select">
                        <option>Normal</option><option>Heterogêneo</option>
                    </select>
                </div>
                <div className="laudo-row">
                     <label className="laudo-checkbox-label">
                        <input type="checkbox" checked={!!data.placentaEspessura} readOnly /> 
                        citar espessura:
                     </label>
                     <input name="placentaEspessura" value={data.placentaEspessura} onChange={handleChange} className="laudo-input laudo-input-small" /> 
                     <span>mm</span>
                </div>
            </div>
        </div>

        {/* LÍQUIDO AMNIÓTICO */}
        <div className="laudo-section">
            <div className="header-base header-green">Líquido amniótico</div>
            <div className="laudo-section-body">
                <div className="laudo-grid-2">
                    <div className="laudo-col">
                        <label className="laudo-checkbox-label">
                            <input type="radio" name="liquidoVolume" value="Normal" checked={data.liquidoVolume === 'Normal'} onChange={handleChange}/> 
                            volume normal
                        </label>
                        <label className="laudo-checkbox-label">
                            <input type="radio" name="liquidoVolume" value="Reduzido" checked={data.liquidoVolume === 'Reduzido'} onChange={handleChange}/> 
                            volume reduzido
                        </label>
                        <label className="laudo-checkbox-label">
                            <input type="radio" name="liquidoVolume" value="Aumentado" checked={data.liquidoVolume === 'Aumentado'} onChange={handleChange}/> 
                            volume aumentado
                        </label>
                    </div>
                    <div className="laudo-col">
                        <div className="laudo-row">
                             <input type="checkbox" checked={!!data.ila} readOnly/> 
                             <span>citar ILA = </span>
                             <input name="ila" value={data.ila} onChange={handleChange} className="laudo-input laudo-input-small" /> 
                             <span>cm</span>
                        </div>
                        <div className="laudo-row">
                             <input type="checkbox" checked={!!data.maiorBolso} readOnly/> 
                             <span>MBV = </span>
                             <input name="maiorBolso" value={data.maiorBolso} onChange={handleChange} className="laudo-input laudo-input-small" /> 
                             <span>cm</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </>
  );
};

export default SecaoAnexos;