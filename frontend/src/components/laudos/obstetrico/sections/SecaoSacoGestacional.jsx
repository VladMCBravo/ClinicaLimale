import React from 'react';
import { GiEmbryo } from 'react-icons/gi'; // Ícone para SG
import { FaRulerCombined, FaExclamationTriangle } from 'react-icons/fa';

const SecaoSacoGestacional = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-blue">
            <GiEmbryo size={14} style={{marginRight:'5px'}}/> 
            Saco Gestacional e Cavidade Uterina
        </div>
        
        <div className="laudo-section-body">
            
            {/* BLOCO 1: LOCALIZAÇÃO E MEDIDAS */}
            <div className="laudo-grid-2" style={{alignItems:'start'}}>
                
                {/* Coluna Esquerda: Checkbox e Localização */}
                <div className="laudo-col">
                    <div style={{background:'#F5F5F5', padding:'8px', borderRadius:'4px', border:'1px solid #eee'}}>
                        <label className="laudo-checkbox-label" style={{fontWeight:'bold', color:'#1565C0', marginBottom:'5px'}}>
                            <input type="checkbox" name="citarSg" checked={data.citarSg} onChange={handleChange} />
                            Citar Saco Gestacional
                        </label>
                        
                        <div style={{display:'flex', alignItems:'center', gap:'8px', marginTop:'5px'}}>
                            <span className="label-pequeno">Localização:</span>
                            <select name="sgLocalizacao" value={data.sgLocalizacao} onChange={handleChange} className="laudo-select" style={{flex:1}}>
                                <option value="">Selecione...</option>
                                <option value="fúndica">fúndica</option>
                                <option value="corporal anterior">corporal anterior</option>
                                <option value="corporal posterior">corporal posterior</option>
                                <option value="segmento inferior">segmento inferior</option>
                            </select>
                        </div>
                    </div>

                    <div style={{marginTop:'10px'}}>
                        <span className="label-pequeno" style={{fontWeight:'bold'}}>Trofoblasto (Inserção):</span>
                        <select name="trofoblasto" value={data.trofoblasto} onChange={handleChange} className="laudo-select full-width">
                            <option value="normal">Normal / Envolvente</option>
                            <option value="anterior">Anterior</option>
                            <option value="posterior">Posterior</option>
                            <option value="fúndica">Fúndica</option>
                        </select>
                    </div>
                </div>

                {/* Coluna Direita: Medidas e Cálculos */}
                <div className="laudo-col">
                    <div style={{background:'#E3F2FD', padding:'8px', borderRadius:'4px', border:'1px solid #BBDEFB'}}>
                        <div style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px', color:'#0D47A1', fontWeight:'bold', fontSize:'11px'}}>
                            <FaRulerCombined /> Biometria do SG (3 eixos)
                        </div>
                        
                        <div className="laudo-row" style={{justifyContent:'space-between'}}>
                            <input type="number" name="sg1" value={data.sg1} onChange={handleChange} className="laudo-input" style={{width:'45px', textAlign:'center'}} placeholder="L1"/> x
                            <input type="number" name="sg2" value={data.sg2} onChange={handleChange} className="laudo-input" style={{width:'45px', textAlign:'center'}} placeholder="L2"/> x
                            <input type="number" name="sg3" value={data.sg3} onChange={handleChange} className="laudo-input" style={{width:'45px', textAlign:'center'}} placeholder="L3"/> mm
                        </div>

                        <div style={{marginTop:'8px', paddingTop:'8px', borderTop:'1px solid #BBDEFB', display:'flex', justifyContent:'space-between', fontSize:'11px'}}>
                            <span>DMSG: <strong>{data.resDmsg || '--'} mm</strong></span>
                            <span style={{color:'#2E7D32'}}>IG Estimada: <strong>{data.resIgSg || '--'}</strong></span>
                        </div>
                    </div>
                </div>
            </div>

            <hr style={{margin: '5px 0', border: 0, borderTop: '1px solid #eee'}}/>

            {/* BLOCO 2: PATOLOGIAS (Descolamento / Aborto) */}
            <div className="laudo-col" style={{gap: '8px'}}>
                
                {/* Descolamento */}
                <div className="laudo-row" style={{background: data.sgComDescolamento ? '#FFF3E0' : 'transparent', padding:'4px', borderRadius:'4px', transition:'0.3s'}}>
                    <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                        <label className="laudo-checkbox-label">
                            <input type="checkbox" name="sgSemDescolamento" checked={data.sgSemDescolamento} onChange={(e) => {
                                handleChange({target: {name: 'sgSemDescolamento', value: e.target.checked, type:'checkbox', checked: e.target.checked}});
                                if(e.target.checked) handleChange({target: {name: 'sgComDescolamento', value: false, type:'checkbox', checked: false}});
                            }} />
                            Sem sinais de descolamento
                        </label>
                        
                        <div className="laudo-row">
                             <label className="laudo-checkbox-label" style={{color: data.sgComDescolamento ? '#E65100' : '#444', fontWeight: data.sgComDescolamento ? 'bold' : 'normal'}}>
                                <input type="checkbox" name="sgComDescolamento" checked={data.sgComDescolamento} onChange={(e) => {
                                    handleChange({target: {name: 'sgComDescolamento', value: e.target.checked, type:'checkbox', checked: e.target.checked}});
                                    if(e.target.checked) handleChange({target: {name: 'sgSemDescolamento', value: false, type:'checkbox', checked: false}});
                                }} />
                                Hematoma / Descolamento medindo:
                            </label>
                            
                            {data.sgComDescolamento && (
                                <div className="laudo-row animate-fade-in">
                                    <input type="number" name="desc1" value={data.desc1} onChange={handleChange} className="laudo-input" style={{width:'40px'}}/> x
                                    <input type="number" name="desc2" value={data.desc2} onChange={handleChange} className="laudo-input" style={{width:'40px'}}/> mm
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Aborto Incompleto */}
                <div style={{borderTop:'1px dashed #ccc', paddingTop:'5px'}}>
                    <label className="laudo-checkbox-label" style={{color: '#D32F2F'}}>
                        <FaExclamationTriangle size={12} style={{marginRight:'5px'}} />
                        <input type="checkbox" name="sgAbortoIncompleto" checked={data.sgAbortoIncompleto} onChange={handleChange} />
                        <strong>ABORTAMENTO INCOMPLETO:</strong> Cavidade preenchida por restos ovulares
                    </label>
                </div>
            </div>

        </div>
    </div>
  );
};

export default SecaoSacoGestacional;