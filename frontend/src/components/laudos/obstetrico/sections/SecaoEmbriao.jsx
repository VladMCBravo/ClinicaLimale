import React from 'react';
import { FaHeartbeat, FaRulerHorizontal, FaEye, FaChild, FaNotesMedical, FaTable } from 'react-icons/fa';
import { GiEmbryo } from 'react-icons/gi';

const SecaoEmbriao = ({ data, handleChange }) => {
  return (
    <div className="laudo-section" style={{borderLeft: '4px solid #1E88E5'}}>
        <div className="header-base header-blue">
            <GiEmbryo size={16} style={{marginRight:'5px'}}/> Rastreamento de 1º Trimestre (11 - 14 semanas)
        </div>
        
        <div className="laudo-section-body">
            
            {/* LINHA DE CHECKBOX PRINCIPAL */}
            <div style={{marginBottom: '10px', paddingBottom:'5px', borderBottom:'1px dashed #ddd'}}>
                <label className="laudo-checkbox-label" style={{fontWeight:'bold', color: '#D32F2F'}}>
                    <input type="checkbox" name="embriaoNaoVisualizado" checked={data.embriaoNaoVisualizado} onChange={handleChange} />
                    Embrião não visualizado no momento
                </label>
            </div>

            <div style={{ opacity: data.embriaoNaoVisualizado ? 0.5 : 1, pointerEvents: data.embriaoNaoVisualizado ? 'none' : 'auto' }}>
                
                {/* BLOCO 1: BIOMETRIA BÁSICA (CCN) */}
                <div style={{background:'#E3F2FD', padding:'10px', borderRadius:'4px', marginBottom:'10px'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <FaRulerHorizontal color="#1565C0"/>
                        <span style={{fontWeight:'bold', color:'#1565C0', fontSize:'11px'}}>CCN (Comprimento Cabeça-Nádegas):</span>
                        <input 
                            type="number" 
                            name="ccn" 
                            value={data.ccn} 
                            onChange={handleChange} 
                            className="laudo-input" 
                            style={{width:'60px', fontWeight:'bold', fontSize:'12px'}}
                            placeholder="mm"
                        />
                        <span style={{fontSize:'10px'}}>mm</span>
                    </div>
                </div>

                {/* BLOCO 2: MARCADORES (TN, OSSO NASAL, ETC) */}
                <div className="laudo-grid-2" style={{alignItems:'start', gap:'15px', marginBottom:'15px'}}>
                    
                    {/* ESQUERDA: MARCADORES PRINCIPAIS */}
                    <div className="laudo-col">
                        <div style={{fontWeight:'bold', fontSize:'11px', marginBottom:'5px', color:'#333', display:'flex', alignItems:'center', gap:'5px'}}>
                            <FaEye/> MARCADORES GENÉTICOS
                        </div>
                        
                        {/* Translucência Nucal */}
                        <div className="laudo-row" style={{justifyContent:'space-between', marginBottom:'5px', background:'#f9f9f9', padding:'5px', borderRadius:'4px'}}>
                            <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
                                <input type="checkbox" name="citarTn" checked={data.citarTn} onChange={handleChange} />
                                Translucência Nucal (TN):
                            </label>
                            <div>
                                <input type="number" step="0.1" name="tnMedida" value={data.tnMedida} onChange={handleChange} disabled={!data.citarTn} className="laudo-input" style={{width:'50px', textAlign:'center', fontWeight:'bold'}} /> mm
                            </div>
                        </div>

                        {/* Osso Nasal */}
                        <div className="laudo-row" style={{justifyContent:'space-between', marginBottom:'5px', background:'#f9f9f9', padding:'5px', borderRadius:'4px'}}>
                            <span style={{fontSize:'11px', fontWeight:'bold'}}>Osso Nasal:</span>
                            <select name="morf1OssoNasal" value={data.morf1OssoNasal} onChange={handleChange} className="laudo-select" style={{width:'120px'}}>
                                <option value="">Selecione...</option>
                                <option value="presente">Presente</option>
                                <option value="ausente">Ausente</option>
                                <option value="hipoplásico">Hipoplásico</option>
                                <option value="não visualizado">Não visualizado</option>
                            </select>
                        </div>

                        {/* Translucência Intracraniana */}
                        <div className="laudo-row" style={{marginBottom:'5px'}}>
                             <label className="laudo-checkbox-label">
                                <input type="checkbox" name="morf1Cerebro" checked={data.morf1Cerebro} onChange={handleChange} />
                                Translucência Intracraniana (Visível)
                            </label>
                        </div>
                    </div>

                    {/* DIREITA: DICA SOBRE DUCTO VENOSO */}
                    <div className="laudo-col" style={{background:'#FFF3E0', padding:'10px', borderRadius:'4px', border:'1px solid #FFE0B2'}}>
                        <div style={{fontSize:'10px', color:'#E65100', marginBottom:'5px', fontWeight:'bold'}}>
                            <FaNotesMedical/> SOBRE O DUCTO VENOSO
                        </div>
                        <p style={{fontSize:'10px', color:'#555', lineHeight:'1.2'}}>
                            Para preencher o Ducto Venoso (Onda A), acesse a aba/seção <strong>"Doppler"</strong> mais abaixo. Os dados preenchidos lá aparecerão automaticamente no rastreamento.
                        </p>
                    </div>
                </div>

                {/* BLOCO 3: TABELA DE RISCOS (FMF) */}
                <div style={{marginTop:'10px', border:'1px solid #ddd', borderRadius:'4px', overflow:'hidden'}}>
                    <div style={{background:'#eee', padding:'5px 10px', fontSize:'11px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'5px', color:'#333'}}>
                        <FaTable/> CÁLCULO DE RISCO (Fetal Medicine Foundation)
                    </div>
                    
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:'11px'}}>
                        <thead>
                            <tr style={{background:'#f5f5f5', borderBottom:'1px solid #ddd'}}>
                                <th style={{padding:'5px', textAlign:'left'}}>Trissomia</th>
                                <th style={{padding:'5px', textAlign:'center'}}>Risco Basal (Idade)</th>
                                <th style={{padding:'5px', textAlign:'center'}}>Risco Corrigido (Exame)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* T21 */}
                            <tr style={{borderBottom:'1px solid #eee'}}>
                                <td style={{padding:'5px', fontWeight:'bold', color:'#1565C0'}}>T21 (Down)</td>
                                <td style={{padding:'5px', textAlign:'center'}}>
                                    1 / <input type="text" name="riscoT21Basal" value={data.riscoT21Basal} onChange={handleChange} className="laudo-input" style={{width:'50px'}} placeholder="---"/>
                                </td>
                                <td style={{padding:'5px', textAlign:'center'}}>
                                    1 / <input type="text" name="riscoT21Corrigido" value={data.riscoT21Corrigido} onChange={handleChange} className="laudo-input" style={{width:'50px', fontWeight:'bold'}} placeholder="---"/>
                                </td>
                            </tr>
                            {/* T18 */}
                            <tr style={{borderBottom:'1px solid #eee'}}>
                                <td style={{padding:'5px', fontWeight:'bold', color:'#455A64'}}>T18 (Edwards)</td>
                                <td style={{padding:'5px', textAlign:'center'}}>
                                    1 / <input type="text" name="riscoT18Basal" value={data.riscoT18Basal} onChange={handleChange} className="laudo-input" style={{width:'50px'}} placeholder="---"/>
                                </td>
                                <td style={{padding:'5px', textAlign:'center'}}>
                                    1 / <input type="text" name="riscoT18Corrigido" value={data.riscoT18Corrigido} onChange={handleChange} className="laudo-input" style={{width:'50px'}} placeholder="---"/>
                                </td>
                            </tr>
                            {/* T13 */}
                            <tr>
                                <td style={{padding:'5px', fontWeight:'bold', color:'#455A64'}}>T13 (Patau)</td>
                                <td style={{padding:'5px', textAlign:'center'}}>
                                    1 / <input type="text" name="riscoT13Basal" value={data.riscoT13Basal} onChange={handleChange} className="laudo-input" style={{width:'50px'}} placeholder="---"/>
                                </td>
                                <td style={{padding:'5px', textAlign:'center'}}>
                                    1 / <input type="text" name="riscoT13Corrigido" value={data.riscoT13Corrigido} onChange={handleChange} className="laudo-input" style={{width:'50px'}} placeholder="---"/>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    </div>
  );
};

export default SecaoEmbriao;