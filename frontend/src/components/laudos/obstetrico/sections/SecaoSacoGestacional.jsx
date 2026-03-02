import React from 'react';
import { GiEmbryo } from 'react-icons/gi'; 
import { FaRulerCombined, FaExclamationTriangle, FaHeartbeat } from 'react-icons/fa';

const SecaoSacoGestacional = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-blue">
            <GiEmbryo size={14} style={{marginRight:'5px'}}/> 
            Saco Gestacional e Cavidade Uterina
        </div>
        
        <div className="laudo-section-body">
            
            {/* CHECKBOX PRINCIPAL: Ativa a seção no texto */}
            <div style={{background:'#F5F5F5', padding:'8px', borderRadius:'4px', marginBottom:'10px', border:'1px solid #eee'}}>
                <label className="laudo-checkbox-label" style={{fontWeight:'bold', color:'#1565C0', fontSize:'12px'}}>
                    <input type="checkbox" name="citarSg" checked={data.citarSg} onChange={handleChange} />
                    VISUALIZADO SACO GESTACIONAL (Marque para incluir no laudo)
                </label>
            </div>

            {/* SÓ MOSTRA SE O CHECKBOX ESTIVER MARCADO */}
            {data.citarSg && (
                <div className="animate-fade-in">
                    
                    {/* BLOCO 1: LOCALIZAÇÃO E TROFOBLASTO */}
                    <div className="laudo-grid-2" style={{alignItems:'start', marginBottom:'15px'}}>
                        
                        <div className="laudo-col">
                            <span className="label-pequeno">Localização:</span>
                            <select name="sgLocalizacao" value={data.sgLocalizacao} onChange={handleChange} className="laudo-select full-width">
                                <option value="">Selecione...</option>
                                <option value="fúndica">Fúndica</option>
                                <option value="corporal anterior">Corporal Anterior</option>
                                <option value="corporal posterior">Corporal Posterior</option>
                                <option value="segmento inferior">Segmento Inferior</option>
                            </select>

                            <div style={{marginTop:'10px'}}>
                                <span className="label-pequeno" style={{fontWeight:'bold'}}>Trofoblasto (Inserção):</span>
                                <select name="trofoblasto" value={data.trofoblasto} onChange={handleChange} className="laudo-select full-width">
                                    <option value="">Selecione...</option> {/* CORREÇÃO: Default vazio */}
                                    <option value="normal">Normal / Envolvente</option>
                                    <option value="anterior">Anterior</option>
                                    <option value="posterior">Posterior</option>
                                    <option value="fúndica">Fúndica</option>
                                </select>
                            </div>
                        </div>

                        {/* BLOCO: BIOMETRIA SG */}
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

                                <div style={{marginTop:'8px', paddingTop:'8px', borderTop:'1px solid #BBDEFB', display:'flex', flexDirection:'column', gap:'3px', fontSize:'11px'}}>
                                    <span>DMSG: <strong>{data.resDmsg || '--'} mm</strong></span>
                                    {/* CORREÇÃO: MOSTRAR IG VISUALMENTE TAMBÉM */}
                                    <span style={{color:'#2E7D32'}}>IG (DMSG): <strong>{data.resIgSg || '--'}</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr style={{margin: '10px 0', border: 0, borderTop: '1px solid #eee'}}/>

                    {/* BLOCO 2: CONTEÚDO DO SACO GESTACIONAL (DESACOPLADO) */}
                    <div style={{marginBottom:'15px', background:'#f9f9f9', padding:'10px', borderRadius:'6px', border:'1px solid #e0e0e0'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                            <span style={{fontWeight:'bold', color:'#333', fontSize:'13px'}}>Conteúdo do Saco Gestacional:</span>
                            
                            {/* Checkbox Rápido para Anembrionada */}
                            <label className="laudo-checkbox-label" style={{color:'#D32F2F', fontSize:'11px', background:'#FFEBEE', padding:'4px 8px', borderRadius:'4px'}}>
                                <input type="checkbox" name="sgGestacaoAnembrionada" checked={data.sgGestacaoAnembrionada} onChange={handleChange} />
                                Gestação Anembrionada (Vazio)
                            </label>
                        </div>

                        {/* Oculta os detalhes se for anembrionada */}
                        {!data.sgGestacaoAnembrionada && (
                            <div className="laudo-grid-2">
                                
                                {/* LADO A: VESÍCULA VITELINA */}
                                <div style={{padding:'8px', background:'#FFF8E1', borderRadius:'4px', borderLeft:'3px solid #FFC107'}}>
                                    <div className="laudo-row" style={{marginBottom:'8px'}}>
                                        <span className="label-pequeno" style={{fontWeight:'bold'}}>Vesícula Vitelina:</span>
                                        <select name="vvStatus" value={data.vvStatus} onChange={handleChange} className="laudo-select" style={{width:'120px'}}>
                                            <option value="">Selecione...</option>
                                            <option value="presente">Visualizada</option>
                                            <option value="ausente">Não visualizada</option>
                                        </select>
                                    </div>

                                    {data.vvStatus === 'presente' && (
                                        <div className="laudo-col animate-fade-in" style={{gap:'5px', marginTop:'5px'}}>
                                            <div className="laudo-row">
                                                <span className="label-pequeno">Medida:</span>
                                                <input type="number" name="vvMedida" value={data.vvMedida} onChange={handleChange} className="laudo-input" style={{width:'60px'}} placeholder="mm"/> mm
                                            </div>
                                            <div className="laudo-row">
                                                <span className="label-pequeno">Aspecto:</span>
                                                <select name="vvAspecto" value={data.vvAspecto} onChange={handleChange} className="laudo-select full-width">
                                                    <option value="habitual">Habitual</option>
                                                    <option value="irregular">Irregular</option>
                                                    <option value="hidrópica">Hidrópica / Aumentada</option>
                                                    <option value="ecogênica">Ecogênica</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* LADO B: EMBRIÃO */}
                                <div style={{padding:'8px', background:'#E8F5E9', borderRadius:'4px', borderLeft:'3px solid #4CAF50'}}>
                                    <div className="laudo-row" style={{marginBottom:'8px'}}>
                                        <span className="label-pequeno" style={{fontWeight:'bold'}}>Embrião:</span>
                                        <select name="embriaoStatus" value={data.embriaoStatus} onChange={handleChange} className="laudo-select" style={{width:'120px'}}>
                                            <option value="">Selecione...</option>
                                            <option value="presente">Visualizado</option>
                                            <option value="ausente">Não visualizado</option>
                                        </select>
                                    </div>

                                    {data.embriaoStatus === 'presente' && (
                                        <div className="laudo-col animate-fade-in" style={{gap:'5px', marginTop:'5px'}}>
                                            <div className="laudo-row">
                                                <FaHeartbeat color="#C62828"/>
                                                <span className="label-pequeno">BCF:</span>
                                                <input type="number" name="bcf" value={data.bcf} onChange={handleChange} className="laudo-input" style={{width:'60px'}} placeholder="bpm"/>
                                            </div>
                                            <div className="laudo-row">
                                                <span className="label-pequeno">CCN:</span>
                                                <input type="number" name="ccn" value={data.ccn} onChange={handleChange} className="laudo-input" style={{width:'60px'}} placeholder="mm"/>
                                                {data.resIgCcn && <span style={{fontSize:'10px', color:'#2E7D32', marginLeft:'5px'}}>({data.resIgCcn})</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* LADO C: CAVIDADE AMNIÓTICA (NOVO) */}
                            <div style={{marginTop:'10px', padding:'8px', background:'#E3F2FD', borderRadius:'4px', borderLeft:'3px solid #2196F3'}}>
                                <div className="laudo-row" style={{marginBottom:'8px'}}>
                                    <span className="label-pequeno" style={{fontWeight:'bold'}}>Cavidade Amniótica:</span>
                                    <select name="caStatus" value={data.caStatus} onChange={handleChange} className="laudo-select" style={{width:'150px'}}>
                                        <option value="">Selecione...</option>
                                        <option value="presente">Visualizada</option>
                                        <option value="ausente">Não visualizada</option>
                                    </select>
                                </div>

                                {data.caStatus === 'presente' && (
                                    <div className="laudo-col animate-fade-in" style={{gap:'5px', marginTop:'5px'}}>
                                        <div className="laudo-row">
                                            <span className="label-pequeno">Medida (Opcional):</span>
                                            <input type="number" name="caMedida" value={data.caMedida} onChange={handleChange} className="laudo-input" style={{width:'60px'}} placeholder="mm"/> mm
                                        </div>
                                    </div>
                                )}
                            </div>

                            </div>
                        )}
                    </div>

                    <hr style={{margin: '10px 0', border: 0, borderTop: '1px solid #eee'}}/>

                    {/* BLOCO 3: PATOLOGIAS */}
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
            )}
        </div>
    </div>
  );
};

export default SecaoSacoGestacional;