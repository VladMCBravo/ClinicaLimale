import React from 'react';

const SecaoPlacentaLiquido = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-blue">Placenta e Líquido</div>
        <div className="laudo-section-body">
            
            {/* PLACENTA */}
            <div style={{marginBottom: '15px'}}>
                <div style={{fontWeight: 'bold', color: '#444', marginBottom: '5px'}}>Placenta</div>
                <div className="laudo-grid-3">
                    <div>
                        <span className="label-pequeno">Inserção</span>
                        <select name="placentaLocalizacao" value={data.placentaLocalizacao} onChange={handleChange} className="laudo-select full-width">
                            <option>corporal</option>
                            <option>corporal anterior</option>
                            <option>corporal posterior</option>
                            <option>fúndica</option>
                            <option>prévia marginal</option>
                            <option>prévia total</option>
                        </select>
                    </div>
                    <div>
                        <span className="label-pequeno">Grau (Grannum)</span>
                        <select name="placentaGrau" value={data.placentaGrau} onChange={handleChange} className="laudo-select full-width">
                            <option>0</option>
                            <option>I</option>
                            <option>II</option>
                            <option>III</option>
                        </select>
                    </div>
                    <div>
                        <span className="label-pequeno">Espessura (mm)</span>
                        <input type="number" name="placentaEspessura" value={data.placentaEspessura} onChange={handleChange} className="laudo-input full-width" placeholder="mm" />
                    </div>
                </div>
            </div>

            <hr style={{margin: '10px 0', border: 0, borderTop: '1px solid #eee'}}/>

            {/* LÍQUIDO */}
            <div>
                <div style={{fontWeight: 'bold', color: '#444', marginBottom: '5px'}}>Líquido Amniótico</div>
                <div className="laudo-row">
                    <select name="liquidoAmniotico" value={data.liquidoAmniotico} onChange={handleChange} className="laudo-select" style={{width: '120px'}}>
                        <option>Normal</option>
                        <option>Aumentado</option>
                        <option>Reduzido</option>
                        <option>Oligoâmnio</option>
                        <option>Polidrâmnio</option>
                    </select>
                    
                    <span style={{marginLeft: '10px'}}>ILA:</span>
                    <input type="number" name="ila" value={data.ila} onChange={handleChange} className="laudo-input" style={{width: '50px'}} />
                    <span>mm</span>

                    <span style={{marginLeft: '15px', color: '#666', fontSize: '12px'}}>Ref:</span>
                    <input type="number" name="ilaRefMin" value={data.ilaRefMin} onChange={handleChange} className="laudo-input-small" placeholder="min" />
                    <span>-</span>
                    <input type="number" name="ilaRefMax" value={data.ilaRefMax} onChange={handleChange} className="laudo-input-small" placeholder="max" />
                </div>
            </div>

        </div>
    </div>
  );
};

export default SecaoPlacentaLiquido;