import React from 'react';

// Helper para criar os blocos de opções
const RadioGroup = ({ title, name, options, currentValue, onChange }) => (
    <div style={{marginBottom:'8px', border:'1px solid #eee', padding:'4px', borderRadius:'3px'}}>
        <div style={{fontSize:'10px', fontWeight:'bold', color:'#333', marginBottom:'3px', borderBottom:'1px solid #f0f0f0'}}>{title}</div>
        <div style={{display:'flex', flexDirection:'column', gap:'1px'}}>
            {options.map((opt) => (
                <label key={opt.val} className="laudo-checkbox-label" style={{fontSize:'10px'}}>
                    <input 
                        type="radio" 
                        name={name} 
                        value={opt.val} 
                        checked={currentValue === opt.val} 
                        onChange={onChange} 
                    />
                    {opt.label}
                </label>
            ))}
        </div>
    </div>
);

const SecaoValvaMitral = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-purple">VALVA MITRAL</div>
        <div className="laudo-section-body">
            
            <div className="laudo-grid-2">
                {/* COLUNA 1 */}
                <div>
                    <RadioGroup 
                        title="aspecto" name="mitralAspecto" currentValue={data.mitralAspecto} onChange={handleChange}
                        options={[
                            {val: 'normal', label: 'normal'},
                            {val: 'fusao', label: 'fusão comissural'},
                            {val: 'vegetacoes', label: 'vegetações'},
                        ]}
                    />
                    <RadioGroup 
                        title="espessura" name="mitralEspessura" currentValue={data.mitralEspessura} onChange={handleChange}
                        options={[
                            {val: 'normal', label: 'normal'},
                            {val: 'espessamento', label: 'espessamento'},
                            {val: 'espessamento_discreto', label: 'espessamento discreto'},
                            {val: 'espessamento_moderado', label: 'espessamento moderado'},
                            {val: 'espessamento_importante', label: 'espessamento importante'},
                            {val: 'fibrocalcificacao', label: 'fibrocalcificação'},
                            {val: 'calcificacao_moderada', label: 'calcificação moderada'},
                        ]}
                    />
                     <RadioGroup 
                        title="mobilidade das cúspides" name="mitralMobilidade" currentValue={data.mitralMobilidade} onChange={handleChange}
                        options={[
                            {val: 'normal', label: 'normal'},
                            {val: 'reduzida', label: 'reduzida'},
                            {val: 'prolapso_ant', label: 'prolapso anterior'},
                            {val: 'prolapso_post', label: 'prolapso posterior'},
                            {val: 'flail_ant', label: 'flail anterior'},
                            {val: 'falha_coaptacao', label: 'falha de coaptação'},
                        ]}
                    />
                     <RadioGroup 
                        title="abertura" name="mitralAbertura" currentValue={data.mitralAbertura} onChange={handleChange}
                        options={[
                            {val: 'normal', label: 'normal'},
                            {val: 'reduzida_disc', label: 'discretamente reduzida'},
                            {val: 'reduzida', label: 'reduzida'},
                            {val: 'cupula', label: 'cúspide anterior com abertura em cúpula'},
                        ]}
                    />
                </div>

                {/* COLUNA 2 */}
                <div>
                    <RadioGroup 
                        title="corda tendínea" name="mitralCorda" currentValue={data.mitralCorda} onChange={handleChange}
                        options={[
                            {val: 'normal', label: 'normal'},
                            {val: 'espessamento', label: 'espessamento'},
                            {val: 'calcificacao', label: 'com pontos de cálcio'},
                            {val: 'rotura_primaria', label: 'rotura de corda primária'},
                            {val: 'rotura_secundaria', label: 'rotura de corda secundária'},
                        ]}
                    />
                    <RadioGroup 
                        title="anel mitral" name="mitralAnel" currentValue={data.mitralAnel} onChange={handleChange}
                        options={[
                            {val: 'normal', label: 'normal'},
                            {val: 'calc_discreta', label: 'calcificação discreta'},
                            {val: 'calc_moderada', label: 'calcificação moderada'},
                            {val: 'calc_importante', label: 'calcificação importante'},
                        ]}
                    />
                    <RadioGroup 
                        title="refluxo" name="mitralRefluxo" currentValue={data.mitralRefluxo} onChange={handleChange}
                        options={[
                            {val: 'ausente', label: 'ausente'},
                            {val: 'discreto', label: 'discreto'},
                            {val: 'discreto_moderado', label: 'discreto/moderado'},
                            {val: 'moderado', label: 'moderado'},
                            {val: 'importante', label: 'importante'},
                            {val: 'excentrico', label: '(jato excêntrico)'},
                        ]}
                    />
                    
                    {/* Estenose com Inputs */}
                    <div style={{marginBottom:'8px', border:'1px solid #eee', padding:'4px', borderRadius:'3px'}}>
                        <div style={{fontSize:'10px', fontWeight:'bold', color:'#333', marginBottom:'3px'}}>estenose</div>
                        <label className="laudo-checkbox-label" style={{display:'block'}}><input type="radio" name="mitralEstenose" value="ausente" checked={data.mitralEstenose==='ausente'} onChange={handleChange}/> ausente</label>
                        
                        <div className="laudo-row">
                            <input type="radio" name="mitralEstenose" value="leve" checked={data.mitralEstenose==='leve'} onChange={handleChange}/> 
                            <span style={{fontSize:'10px', width:'30px'}}>leve</span>
                            <input name="mitralArea" value={data.mitralArea} onChange={handleChange} disabled={data.mitralEstenose!=='leve'} className="laudo-input" style={{width:'30px'}}/>
                            <span style={{fontSize:'9px', color:'#999'}}>&gt;1,5 cm²</span>
                        </div>
                        <div className="laudo-row">
                            <input type="radio" name="mitralEstenose" value="moderada" checked={data.mitralEstenose==='moderada'} onChange={handleChange}/> 
                            <span style={{fontSize:'10px', width:'30px'}}>mod.</span>
                            <input className="laudo-input" disabled style={{width:'30px', background:'#eee'}}/>
                            <span style={{fontSize:'9px', color:'#999'}}>1,0 a 1,5</span>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    </div>
  );
};

export default SecaoValvaMitral;