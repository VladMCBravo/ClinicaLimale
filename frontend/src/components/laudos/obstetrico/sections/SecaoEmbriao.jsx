import React from 'react';

const SecaoEmbriao = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-blue">Embrião</div>
        <div className="laudo-section-body">
            
            <div style={{marginBottom: '10px'}}>
                <label className="laudo-checkbox-label" style={{fontWeight:'bold', color: '#D32F2F'}}>
                    <input type="checkbox" name="embriaoNaoVisualizado" checked={data.embriaoNaoVisualizado} onChange={handleChange} />
                    não identificado no presente exame
                </label>
            </div>

            {/* Se não visualizado, desabilita ou esconde o resto. Aqui vou manter visível mas opaco se marcado */}
            <div style={{ opacity: data.embriaoNaoVisualizado ? 0.5 : 1, pointerEvents: data.embriaoNaoVisualizado ? 'none' : 'auto' }}>
                
                {/* CCN e BCF */}
                <div className="laudo-row" style={{marginBottom: '5px'}}>
                    <span style={{fontWeight:'bold'}}>Comprimento cabeça-nádegas (CCN):</span>
                    <input type="number" name="ccn" value={data.ccn} onChange={handleChange} className="laudo-input" style={{width:'60px'}} /> mm
                    <span style={{fontWeight:'bold', marginLeft:'15px', color:'#1565C0'}}>I.G.: {data.resIgCcn || '--'}</span>
                </div>

                <div className="laudo-row" style={{marginBottom: '5px'}}>
                    <span>BCF presentes com frequência de</span>
                    <input type="number" name="bcf" value={data.bcf} onChange={handleChange} className="laudo-input" style={{width:'50px'}} /> bpm
                    <label className="laudo-checkbox-label" style={{marginLeft:'10px'}}>
                        <input type="checkbox" name="bcfIndetectavel" checked={data.bcfIndetectavel} onChange={handleChange} />
                        BCF indetectável
                    </label>
                </div>

                <div className="laudo-row" style={{marginBottom: '10px'}}>
                    <label className="laudo-checkbox-label">
                        <input type="checkbox" name="movFetal" checked={data.movFetal} onChange={handleChange} />
                        movimentação ativa
                    </label>
                    <label className="laudo-checkbox-label" style={{marginLeft:'20px'}}>
                        <input type="checkbox" name="citarVv" checked={data.citarVv} onChange={handleChange} />
                        citar vesícula vitelina normal
                    </label>
                    <input type="number" name="vvDiametro" value={data.vvDiametro} onChange={handleChange} disabled={!data.citarVv} className="laudo-input" style={{width:'40px', marginLeft:'5px'}} /> mm
                </div>

                {/* Morfologia 1º Tri (Box interno) */}
                <fieldset style={{border:'1px solid #ddd', padding:'5px', marginBottom:'10px', background:'#f9f9f9'}}>
                    <legend style={{fontSize:'11px', fontWeight:'bold', color:'#555'}}>Morfologia</legend>
                    <div className="laudo-grid-2">
                        <div className="laudo-col">
                            <label className="laudo-checkbox-label"><input type="checkbox" name="morf1Cerebro" checked={data.morf1Cerebro} onChange={handleChange} /> citar cérebro normal</label>
                            <label className="laudo-checkbox-label"><input type="checkbox" name="morf1Estomago" checked={data.morf1Estomago} onChange={handleChange} /> citar estômago normal</label>
                            <label className="laudo-checkbox-label"><input type="checkbox" name="morf1Cordao" checked={data.morf1Cordao} onChange={handleChange} /> citar inserção normal do cordão</label>
                        </div>
                        <div className="laudo-col">
                            <label className="laudo-checkbox-label"><input type="checkbox" name="morf1Membros" checked={data.morf1Membros} onChange={handleChange} /> citar membros normais</label>
                            <label className="laudo-checkbox-label"><input type="checkbox" name="morf1Globos" checked={data.morf1Globos} onChange={handleChange} /> citar globos oculares normais</label>
                            <div className="laudo-row" style={{marginTop:'3px'}}>
                                <span>Osso nasal:</span>
                                <select name="morf1OssoNasal" value={data.morf1OssoNasal} onChange={handleChange} className="laudo-select" style={{padding:'0'}}>
                                    <option>não citar</option>
                                    <option>presente</option>
                                    <option>ausente</option>
                                    <option>hipoplásico</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </fieldset>

                {/* Translucência Nucal (Box interno) */}
                <fieldset style={{border:'1px solid #ddd', padding:'5px', background:'#fff'}}>
                    <legend style={{fontSize:'11px', fontWeight:'bold', color:'#555'}}>TN</legend>
                    <div className="laudo-row">
                         <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
                            <input type="checkbox" name="citarTn" checked={data.citarTn} onChange={handleChange} />
                            citar translucência nucal:
                        </label>
                        <input type="number" step="0.1" name="tnMedida" value={data.tnMedida} onChange={handleChange} disabled={!data.citarTn} className="laudo-input" style={{width:'50px'}} /> mm
                    </div>
                    
                    <div style={{paddingLeft:'20px', display:'flex', flexDirection:'column', gap:'5px', marginTop:'5px'}}>
                        <label className="laudo-checkbox-label">
                            <input type="checkbox" name="tnObs" checked={data.tnObs} onChange={handleChange} disabled={!data.citarTn} />
                            incluir observação no final do laudo
                        </label>
                        
                        <label className="laudo-checkbox-label">
                            <input type="checkbox" name="tnRisco" checked={data.tnRisco} onChange={handleChange} disabled={!data.citarTn} />
                            citar risco para trissomia do 21:
                        </label>
                        
                        <div style={{paddingLeft: '20px', opacity: data.tnRisco ? 1 : 0.5}}>
                            <div className="laudo-row">
                                <span style={{fontSize:'11px'}}>risco basal para idade materna: 1/</span>
                                <input type="number" name="riscoBasal" value={data.riscoBasal} onChange={handleChange} className="laudo-input laudo-input-small"/>
                            </div>
                            <div className="laudo-row">
                                <span style={{fontSize:'11px'}}>risco corrigido pela TN: 1/</span>
                                <input type="number" name="riscoCorrigido" value={data.riscoCorrigido} onChange={handleChange} className="laudo-input laudo-input-small"/>
                            </div>
                        </div>
                    </div>
                </fieldset>

            </div>
        </div>
    </div>
  );
};

export default SecaoEmbriao;