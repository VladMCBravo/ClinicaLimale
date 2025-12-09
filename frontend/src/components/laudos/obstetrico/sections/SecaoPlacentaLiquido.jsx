import React from 'react';

const SecaoPlacentaLiquido = ({ data, handleChange, qtdFetos }) => {

  // Se houver mais de 1 feto, usamos MBV (Maior Bolsão Vertical)
  // Se for único, usamos ILA (Índice de Líquido Amniótico)
  const isMultipla = qtdFetos > 1;

  return (
    <div className="laudo-section">
        <div className="header-base header-blue">Placenta e Líquido Amniótico</div>
        <div className="laudo-section-body">
            
            {/* 1. PLACENTA */}
            <div style={{marginBottom: '15px'}}>
                <div style={{fontWeight: 'bold', color: '#444', marginBottom: '5px', fontSize:'13px'}}>
                    Placenta
                </div>
                <div className="laudo-grid-3">
                    <div>
                        <span className="label-pequeno">Inserção</span>
                        <select name="placentaLocalizacao" value={data.placentaLocalizacao} onChange={handleChange} className="laudo-select full-width">
                            <option value="corporal anterior">Corporal Anterior</option>
                            <option value="corporal posterior">Corporal Posterior</option>
                            <option value="corporal">Corporal (Sem especificar)</option>
                            <option value="fúndica">Fúndica</option>
                            <option value="prévia marginal">Prévia Marginal</option>
                            <option value="prévia total">Prévia Total</option>
                            <option value="lateral direita">Lateral Direita</option>
                            <option value="lateral esquerda">Lateral Esquerda</option>
                        </select>
                    </div>
                    <div>
                        <span className="label-pequeno">Grau (Grannum)</span>
                        <select name="placentaGrau" value={data.placentaGrau} onChange={handleChange} className="laudo-select full-width">
                            <option value="0">Grau 0</option>
                            <option value="I">Grau I</option>
                            <option value="II">Grau II</option>
                            <option value="III">Grau III</option>
                        </select>
                    </div>
                    <div>
                        <span className="label-pequeno">Espessura (mm)</span>
                        <input 
                            type="number" 
                            name="placentaEspessura" 
                            value={data.placentaEspessura} 
                            onChange={handleChange} 
                            className="laudo-input full-width" 
                            placeholder="mm" 
                        />
                    </div>
                </div>
            </div>

            <hr style={{margin: '10px 0', border: 0, borderTop: '1px solid #eee'}}/>

            {/* 2. LÍQUIDO AMNIÓTICO */}
            <div>
                <div style={{fontWeight: 'bold', color: '#444', marginBottom: '5px', fontSize:'13px'}}>
                    Líquido Amniótico
                </div>
                
                <div className="laudo-row">
                    {/* Classificação Qualitativa */}
                    <select name="liquidoAmniotico" value={data.liquidoAmniotico} onChange={handleChange} className="laudo-select" style={{width: '140px'}}>
                        <option value="Normal">Normal</option>
                        <option value="Aumentado">Aumentado</option>
                        <option value="Reduzido">Reduzido</option>
                        <option value="Oligoâmnio">Oligoâmnio</option>
                        <option value="Polidrâmnio">Polidrâmnio</option>
                    </select>
                    
                    {/* Lógica Condicional: ILA vs MBV */}
                    {isMultipla ? (
                        // MODO GÊMEOS: MBV
                        <div style={{display:'flex', alignItems:'center', background:'#E3F2FD', padding:'2px 8px', borderRadius:'4px', marginLeft:'10px'}}>
                            <span style={{fontWeight:'bold', color:'#0D47A1', marginRight:'5px'}}>MBV (Maior Bolsão):</span>
                            <input 
                                type="number" 
                                name="mbv" 
                                value={data.mbv} 
                                onChange={handleChange} 
                                className="laudo-input" 
                                style={{width: '60px'}} 
                                placeholder="mm"
                            />
                            <span style={{marginLeft:'3px', fontSize:'11px'}}>mm</span>
                        </div>
                    ) : (
                        // MODO ÚNICO: ILA
                        <>
                            <span style={{marginLeft: '15px', fontWeight:'bold'}}>ILA:</span>
                            <input 
                                type="number" 
                                name="ila" 
                                value={data.ila} 
                                onChange={handleChange} 
                                className="laudo-input" 
                                style={{width: '50px'}} 
                                placeholder="mm"
                            />
                            <span>mm</span>

                            <span style={{marginLeft: '15px', color: '#666', fontSize: '12px'}}>Ref:</span>
                            <input type="number" name="ilaRefMin" value={data.ilaRefMin} onChange={handleChange} className="laudo-input-small" placeholder="80" />
                            <span>-</span>
                            <input type="number" name="ilaRefMax" value={data.ilaRefMax} onChange={handleChange} className="laudo-input-small" placeholder="180" />
                        </>
                    )}
                </div>
            </div>

        </div>
    </div>
  );
};

export default SecaoPlacentaLiquido;