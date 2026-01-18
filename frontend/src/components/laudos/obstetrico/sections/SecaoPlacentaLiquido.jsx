import React from 'react';
import { FaCommentMedical } from 'react-icons/fa';

const SecaoPlacentaLiquido = ({ data, handleChange, qtdFetos }) => {

  const isMultipla = qtdFetos > 1;

  return (
    <div>   
            {/* 1. PLACENTA */}
            <div style={{marginBottom: '10px'}}>
                <div style={{fontWeight: 'bold', color: '#444', marginBottom: '5px', fontSize:'13px'}}>
                    Placenta
                </div>
                <div className="laudo-grid-3">
                    <div>
                        <span className="label-pequeno">Inserção</span>
                        <select name="placentaLocalizacao" value={data.placentaLocalizacao} onChange={handleChange} className="laudo-select full-width">
    <option value="">Selecione...</option> {/* ADICIONADO */}
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
    <option value="">Selecione...</option> {/* ADICIONADO */}
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
            <div style={{marginBottom: '10px'}}>
                <div style={{fontWeight: 'bold', color: '#444', marginBottom: '5px', fontSize:'13px'}}>
                    Líquido Amniótico
                </div>
                
                <div className="laudo-row">
                    <select name="liquidoAmniotico" value={data.liquidoAmniotico} onChange={handleChange} className="laudo-select" style={{width: '140px'}}>
    <option value="">Selecione...</option> {/* ADICIONADO */}
    <option value="Normal">Normal</option>
    <option value="Aumentado">Aumentado</option>
                        <option value="Reduzido">Reduzido</option>
                        <option value="Oligoâmnio">Oligoâmnio</option>
                        <option value="Polidrâmnio">Polidrâmnio</option>
                    </select>
                    
                    {isMultipla ? (
                        <div style={{display:'flex', alignItems:'center', background:'#E3F2FD', padding:'2px 8px', borderRadius:'4px', marginLeft:'10px'}}>
                            <span style={{fontWeight:'bold', color:'#0D47A1', marginRight:'5px'}}>MBV:</span>
                            <input type="number" name="mbv" value={data.mbv} onChange={handleChange} className="laudo-input" style={{width: '60px'}} placeholder="mm"/>
                            <span style={{marginLeft:'3px', fontSize:'11px'}}>mm</span>
                        </div>
                    ) : (
                        <>
                            <span style={{marginLeft: '15px', fontWeight:'bold'}}>ILA:</span>
                            <input type="number" name="ila" value={data.ila} onChange={handleChange} className="laudo-input" style={{width: '50px'}} placeholder="mm"/>
                            <span>mm</span>
                            <span style={{marginLeft: '15px', color: '#666', fontSize: '12px'}}>Ref:</span>
                            <input type="number" name="ilaRefMin" value={data.ilaRefMin} onChange={handleChange} className="laudo-input-small" placeholder="80" />
                            <span>-</span>
                            <input type="number" name="ilaRefMax" value={data.ilaRefMax} onChange={handleChange} className="laudo-input-small" placeholder="180" />
                        </>
                    )}
                </div>
            </div>

            <hr style={{margin: '10px 0', border: 0, borderTop: '1px solid #eee'}}/>

            {/* 3. CORDÃO UMBILICAL (Resgatado do SecaoAnexos) */}
            <div>
                <div style={{fontWeight: 'bold', color: '#444', marginBottom: '5px', fontSize:'13px'}}>
                    Cordão Umbilical
                </div>
                <div className="laudo-row" style={{justifyContent: 'space-between'}}>
                    <label className="laudo-checkbox-label">
                        <input type="checkbox" name="cordaoNormal" checked={data.cordaoNormal} onChange={handleChange} /> 
                        citar 3 vasos (2 artérias e 1 veia)
                    </label>
                    <div className="laudo-row">
                        <span>Circular cervical:</span>
                        <select name="cordaoCircular" value={data.cordaoCircular} onChange={handleChange} className="laudo-select">
    <option value="">Selecione...</option> {/* ADICIONADO */}
    <option value="ausente">Ausente (Negativo)</option>
    <option value="1 volta">Presente (1 volta)</option>
    <option value="2 voltas">Presente (2 voltas)</option>
</select>
                    </div>
                </div>
            </div>
        {/* CAMPO DE OBSERVAÇÃO PADRONIZADO (Inserir antes de fechar a laudo-section) */}
                     <div style={{
                         borderTop: '1px solid #eee', 
                         padding: '10px 12px', // Espaçamento interno para não colar na borda
                         background: '#FAFAFA', 
                         borderBottomLeftRadius: '4px',
                         borderBottomRightRadius: '4px'
                     }}>
                        <div style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px'}}>
                            <FaCommentMedical color="#555"/>
                            <span style={{fontWeight:'bold', fontSize:'11px', color:'#333'}}>Nota Médica (Morfologia):</span>
                        </div>
                        <textarea 
                            name="obsPlacenta" 
                            value={data.obsPlacenta || ''} 
                            onChange={handleChange} 
                            className="laudo-textarea"
                            rows="2"
                            style={{
                                width:'100%', 
                                fontSize:'11px', 
                                border:'1px solid #ccc', 
                                borderRadius: '4px', // Bordas arredondadas no campo
                                padding: '8px', // Espaço interno do texto
                                boxSizing: 'border-box' // Garante que não vaze a largura
                            }}
                            placeholder="Digite aqui observações específicas sobre a placenta e líquido..."
                        />
                    </div>
    </div>
  );
};

export default SecaoPlacentaLiquido;