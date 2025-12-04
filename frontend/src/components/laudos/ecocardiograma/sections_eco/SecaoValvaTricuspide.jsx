import React from 'react';

// Reutilizamos o RadioGroup
const RadioGroup = ({ title, name, options, currentValue, onChange }) => (
    <div style={{marginBottom:'8px', border:'1px solid #eee', padding:'4px', borderRadius:'3px'}}>
        <div style={{fontSize:'10px', fontWeight:'bold', color:'#333', marginBottom:'3px', borderBottom:'1px solid #f0f0f0'}}>{title}</div>
        <div style={{display:'flex', flexDirection:'column', gap:'1px'}}>
            {options.map((opt) => (
                <label key={opt.val} className="laudo-checkbox-label" style={{fontSize:'10px'}}>
                    <input type="radio" name={name} value={opt.val} checked={currentValue === opt.val} onChange={onChange} />
                    {opt.label}
                </label>
            ))}
        </div>
    </div>
);

const SecaoValvaTricuspide = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-purple">VALVA TRICÚSPIDE</div>
        <div className="laudo-section-body">
            
            <div className="laudo-grid-2">
                {/* COLUNA 1 */}
                <div>
                    <RadioGroup 
                        title="aspecto" name="triAspecto" currentValue={data.triAspecto} onChange={handleChange}
                        options={[
                            {val: 'normal', label: 'normal'},
                            {val: 'ebstein', label: 'anomalia de Ebstein'},
                            {val: 'vegetacoes', label: 'vegetações'},
                        ]}
                    />
                    <RadioGroup 
                        title="espessura" name="triEspessura" currentValue={data.triEspessura} onChange={handleChange}
                        options={[
                            {val: 'normal', label: 'normal'},
                            {val: 'espessamento', label: 'espessamento'},
                            {val: 'espessamento_discreto', label: 'espessamento discreto'},
                            {val: 'fibrocalcificacao', label: 'fibrocalcificação'},
                            {val: 'calcificacao', label: 'calcificação'},
                        ]}
                    />
                    <RadioGroup 
                        title="abertura" name="triAbertura" currentValue={data.triAbertura} onChange={handleChange}
                        options={[
                            {val: 'normal', label: 'normal'},
                            {val: 'discretamente_reduzida', label: 'discretamente reduzida'},
                            {val: 'reduzida', label: 'reduzida'},
                        ]}
                    />
                     <RadioGroup 
                        title="mobilidade das cúspides" name="triMobilidade" currentValue={data.triMobilidade} onChange={handleChange}
                        options={[
                            {val: 'normal', label: 'normal'},
                            {val: 'reduzida', label: 'reduzida'},
                            {val: 'prolapso_ant', label: 'prolapso anterior'},
                            {val: 'prolapso_septal', label: 'prolapso septal'},
                            {val: 'falha_coaptacao', label: 'falha de coaptação'},
                        ]}
                    />
                </div>

                {/* COLUNA 2 */}
                <div>
                    <RadioGroup 
                        title="corda tendínea" name="triCorda" currentValue={data.triCorda} onChange={handleChange}
                        options={[
                            {val: 'normal', label: 'normal'},
                            {val: 'espessamento', label: 'espessamento'},
                            {val: 'calcificacao', label: 'com pontos de cálcio'},
                            {val: 'rotura', label: 'rotura de cordoalha'},
                        ]}
                    />
                    <RadioGroup 
                        title="refluxo" name="triRefluxo" currentValue={data.triRefluxo} onChange={handleChange}
                        options={[
                            {val: 'ausente', label: 'ausente'},
                            {val: 'discreto', label: 'discreto'},
                            {val: 'moderado', label: 'moderado'},
                            {val: 'moderado_importante', label: 'moderado/importante'},
                            {val: 'importante', label: 'importante'},
                            {val: 'massivo', label: 'massivo'},
                            {val: 'torrencial', label: 'torrencial'},
                            {val: 'excentrico', label: '(jato excêntrico)'},
                        ]}
                    />
                    
                    {/* Estenose Tricúspide */}
                    <div style={{marginBottom:'8px', border:'1px solid #eee', padding:'4px', borderRadius:'3px'}}>
                        <div style={{fontSize:'10px', fontWeight:'bold', color:'#333', marginBottom:'3px'}}>estenose</div>
                        <label className="laudo-checkbox-label"><input type="radio" name="triEstenose" value="nao_citar" checked={data.triEstenose==='nao_citar'} onChange={handleChange}/> não citar</label>
                        
                        <div className="laudo-row" style={{marginTop:'2px'}}>
                            <input type="radio" name="triEstenose" value="severa" checked={data.triEstenose==='severa'} onChange={handleChange}/> 
                            <span style={{fontSize:'10px', width:'35px'}}>severa</span>
                            <input 
                                name="triSeveraArea" value={data.triSeveraArea} onChange={handleChange} 
                                disabled={data.triEstenose!=='severa'}
                                className="laudo-input" style={{width:'30px'}}
                            />
                            <span style={{fontSize:'9px', color:'#999'}}>&le; 1,0 cm²</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};

export default SecaoValvaTricuspide;