import React from 'react';
import { FaHeartbeat, FaRulerHorizontal, FaEye, FaChild } from 'react-icons/fa';
import { GiEmbryo } from 'react-icons/gi';

const SecaoEmbriao = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-blue">
            <GiEmbryo size={16} style={{marginRight:'5px'}}/> Embrião e Morfologia (1º Tri)
        </div>
        
        <div className="laudo-section-body">
            
            {/* LINHA DE CHECKBOX PRINCIPAL */}
            <div style={{marginBottom: '5px', paddingBottom:'5px', borderBottom:'1px dashed #ddd'}}>
                <label className="laudo-checkbox-label" style={{fontWeight:'bold', color: '#D32F2F'}}>
                    <input type="checkbox" name="embriaoNaoVisualizado" checked={data.embriaoNaoVisualizado} onChange={handleChange} />
                    Embrião não visualizado no momento
                </label>
            </div>

            <div style={{ opacity: data.embriaoNaoVisualizado ? 0.5 : 1, pointerEvents: data.embriaoNaoVisualizado ? 'none' : 'auto' }}>
                
                {/* BLOCO 1: BIOMETRIA BÁSICA */}
                <div className="laudo-grid-2" style={{alignItems:'start', gap:'20px'}}>
                    
                    {/* Coluna Esquerda: Medidas */}
                    <div className="laudo-col" style={{background:'#E3F2FD', padding:'8px', borderRadius:'4px', border:'1px solid #BBDEFB'}}>
                        <div className="laudo-row" style={{justifyContent:'space-between'}}>
                            <span style={{fontWeight:'bold', color:'#0D47A1', display:'flex', alignItems:'center', gap:'5px'}}>
                                <FaRulerHorizontal/> CCN:
                            </span>
                            <div>
                                <input type="number" name="ccn" value={data.ccn} onChange={handleChange} className="laudo-input" style={{width:'50px', textAlign:'center', fontWeight:'bold'}} /> 
                                <span style={{fontSize:'10px', marginLeft:'2px'}}>mm</span>
                            </div>
                        </div>
                        <div style={{marginTop:'5px', fontSize:'11px', textAlign:'right', color:'#1565C0'}}>
                            IG Estimada: <strong>{data.resIgCcn || '--'}</strong>
                        </div>
                    </div>

                    {/* Coluna Direita: Vitalidade */}
                    <div className="laudo-col" style={{background:'#E8F5E9', padding:'8px', borderRadius:'4px', border:'1px solid #C8E6C9'}}>
                        <div className="laudo-row" style={{justifyContent:'space-between'}}>
                            <span style={{fontWeight:'bold', color:'#2E7D32', display:'flex', alignItems:'center', gap:'5px'}}>
                                <FaHeartbeat/> BCF:
                            </span>
                            <div>
                                <input type="number" name="bcf" value={data.bcf} onChange={handleChange} className="laudo-input" style={{width:'50px', textAlign:'center', fontWeight:'bold', color:'#2E7D32'}} /> 
                                <span style={{fontSize:'10px', marginLeft:'2px'}}>bpm</span>
                            </div>
                        </div>
                        <div style={{marginTop:'5px'}}>
                            <label className="laudo-checkbox-label" style={{fontSize:'10px', color:'#D32F2F'}}>
                                <input type="checkbox" name="bcfIndetectavel" checked={data.bcfIndetectavel} onChange={handleChange} />
                                Ausente / Indetectável
                            </label>
                        </div>
                    </div>
                </div>

                {/* BLOCO 2: MORFOLOGIA E TN */}
                <div className="laudo-grid-2" style={{marginTop:'10px', gap:'20px'}}>
                    
                    {/* Morfologia Checkbox Grid */}
                    <div style={{background:'#F9F9F9', padding:'8px', borderRadius:'4px', border:'1px solid #eee'}}>
                        <div style={{fontSize:'11px', fontWeight:'bold', color:'#555', marginBottom:'5px', display:'flex', alignItems:'center', gap:'5px'}}>
                            <FaChild /> Anatomia
                        </div>
                        <div className="laudo-grid-2" style={{gap:'10px'}}>
                            <div className="laudo-col" style={{gap:'2px'}}>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="morf1Cerebro" checked={data.morf1Cerebro} onChange={handleChange} /> Cérebro</label>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="morf1Estomago" checked={data.morf1Estomago} onChange={handleChange} /> Estômago</label>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="morf1Cordao" checked={data.morf1Cordao} onChange={handleChange} /> Cordão</label>
                            </div>
                            <div className="laudo-col" style={{gap:'2px'}}>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="morf1Membros" checked={data.morf1Membros} onChange={handleChange} /> Membros</label>
                                <label className="laudo-checkbox-label"><input type="checkbox" name="morf1Globos" checked={data.morf1Globos} onChange={handleChange} /> Olhos</label>
                                <div style={{display:'flex', alignItems:'center', gap:'5px', marginTop:'2px'}}>
                                    <span style={{fontSize:'10px'}}>Osso Nasal:</span>
                                    <select name="morf1OssoNasal" value={data.morf1OssoNasal} onChange={handleChange} className="laudo-select" style={{height:'20px', fontSize:'10px', padding:'0 2px'}}>
                                        <option>presente</option>
                                        <option>ausente</option>
                                        <option>hipoplásico</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Translucência Nucal */}
                    <div style={{background:'#FFF3E0', padding:'8px', borderRadius:'4px', border:'1px solid #FFE0B2'}}>
                        <div className="laudo-row" style={{marginBottom:'5px'}}>
                             <label className="laudo-checkbox-label" style={{fontWeight:'bold', color:'#E65100'}}>
                                <input type="checkbox" name="citarTn" checked={data.citarTn} onChange={handleChange} />
                                Translucência Nucal:
                            </label>
                            <input type="number" step="0.1" name="tnMedida" value={data.tnMedida} onChange={handleChange} disabled={!data.citarTn} className="laudo-input" style={{width:'50px', textAlign:'center'}} /> mm
                        </div>
                        
                        <div style={{paddingLeft:'5px', display:'flex', flexDirection:'column', gap:'3px', opacity: data.citarTn ? 1 : 0.5}}>
                            <label className="laudo-checkbox-label">
                                <input type="checkbox" name="tnRisco" checked={data.tnRisco} onChange={handleChange} disabled={!data.citarTn} />
                                Calcular Risco T21
                            </label>
                            {data.tnRisco && (
                                <div className="laudo-grid-2" style={{gap:'5px'}}>
                                    <input type="number" name="riscoBasal" value={data.riscoBasal} onChange={handleChange} className="laudo-input" placeholder="Basal (1/xxxx)" style={{fontSize:'10px'}}/>
                                    <input type="number" name="riscoCorrigido" value={data.riscoCorrigido} onChange={handleChange} className="laudo-input" placeholder="Corrigido" style={{fontSize:'10px'}}/>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
};

export default SecaoEmbriao;