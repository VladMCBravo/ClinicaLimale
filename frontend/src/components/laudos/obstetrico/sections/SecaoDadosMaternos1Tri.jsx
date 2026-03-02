import React from 'react';

const SubHeader = ({ children }) => (
    <div style={{
        fontSize: '11px', fontWeight: 'bold', color: '#2C3E50', 
        borderBottom: '1px solid #eee', paddingBottom: '4px', marginBottom: '8px',
        textTransform: 'uppercase'
    }}>
        {children}
    </div>
);

const SecaoDadosMaternos1Tri = ({ data, handleChange }) => {
  return (
    <>       
        {/* CAIXA 1: ÚTERO */}
        <div className="laudo-section">
            <div className="header-base header-purple">Útero</div>
            <div className="laudo-section-body">
                <div className="laudo-row" style={{marginBottom: '10px', alignItems: 'flex-start'}}>
                    
                    {/* Bloco de Medidas do Útero */}
                    <div style={{flex: 1, background: '#f9f9f9', padding: '10px', borderRadius: '4px', border: '1px solid #eee'}}>
                        <div className="laudo-row" style={{justifyContent: 'space-between', marginBottom: '8px'}}>
                            <label className="laudo-checkbox-label" style={{fontWeight:'bold', color: '#303F9F'}}>
                                <input type="checkbox" name="citarUteroMedidas" checked={data.citarUteroMedidas} onChange={handleChange} />
                                Descrever Medidas do Útero
                            </label>
                            
                            {/* Nova opção de Posição do Útero */}
                            <div className="laudo-row" style={{fontSize: '11px'}}>
                                <span style={{marginRight: '5px'}}>Posição:</span>
                                <select name="posicaoUtero" value={data.posicaoUtero || 'AVF'} onChange={handleChange} disabled={!data.citarUteroMedidas} className="laudo-select" style={{width: '60px'}}>
                                    <option value="AVF">AVF</option>
                                    <option value="RVF">RVF</option>
                                    <option value="médio-vertido">Médio-vertido</option>
                                </select>
                            </div>
                        </div>

                        <div className="laudo-row">
                             <input type="number" placeholder="L" name="ut1" value={data.ut1} onChange={handleChange} className="laudo-input" style={{width:'45px'}} disabled={!data.citarUteroMedidas}/> x
                             <input type="number" placeholder="AP" name="ut2" value={data.ut2} onChange={handleChange} className="laudo-input" style={{width:'45px'}} disabled={!data.citarUteroMedidas}/> x
                             <input type="number" placeholder="T" name="ut3" value={data.ut3} onChange={handleChange} className="laudo-input" style={{width:'45px'}} disabled={!data.citarUteroMedidas}/> mm
                        </div>
                        
                        {/* NOVO: Exibição do Volume Uterino */}
                        {data.utVol && data.citarUteroMedidas && (
                            <div className="animate-fade-in" style={{marginTop: '5px', fontSize: '11px', color: '#1565C0', fontWeight: 'bold'}}>
                                Volume Uterino: {data.utVol} cm³
                            </div>
                        )}
                    </div>

                    {/* Aviso visual das caixas */}
                    <div style={{flex: 1, marginLeft: '10px', background: '#FFF3E0', padding: '8px', borderRadius: '4px', border: '1px solid #FFE0B2', fontSize: '11px', color: '#E65100'}}>
                        <strong>Aviso:</strong> Os itens referentes ao COLO UTERINO estão na caixa separada abaixo desta.
                    </div>
                </div>

                {/* Mioma / Nódulo (Melhorado visualmente) */}
                <div style={{paddingTop: '10px', borderTop: '1px dashed #ccc'}}>
                     <div className="laudo-row">
                        <label className="laudo-checkbox-label">
                            <input type="checkbox" name="citarNodulo" checked={data.citarNodulo} onChange={handleChange} />
                            Presença de nódulo miometrial
                        </label>
                     </div>
                     
                     {/* Campos do Mioma só aparecem se marcar o checkbox */}
                     {data.citarNodulo && (
                         <div className="laudo-row animate-fade-in" style={{marginTop:'8px', paddingLeft:'22px', gap: '5px', flexWrap: 'wrap'}}>
                            <span style={{color: '#666', fontSize: '11px'}}>Medindo:</span>
                            <input type="number" name="nod1" value={data.nod1} onChange={handleChange} className="laudo-input" style={{width:'45px'}} /> x
                            <input type="number" name="nod2" value={data.nod2} onChange={handleChange} className="laudo-input" style={{width:'45px'}} /> mm
                            
                            <span style={{color: '#666', fontSize: '11px', marginLeft: '5px'}}>Tipo:</span>
                            <select name="nodTipo" value={data.nodTipo} onChange={handleChange} className="laudo-select">
                                 <option value="subseroso">Subseroso</option>
                                 <option value="intramural">Intramural</option>
                                 <option value="submucoso">Submucoso</option>
                            </select>

                            <span style={{color: '#666', fontSize: '11px', marginLeft: '5px'}}>Parede:</span>
                            <select name="nodLocal" value={data.nodLocal} onChange={handleChange} className="laudo-select">
                                 <option value="fúndica">Fúndica</option>
                                 <option value="corporal anterior">Corporal Anterior</option>
                                 <option value="corporal posterior">Corporal Posterior</option>
                                 <option value="lateral direita">Lateral Direita</option>
                                 <option value="lateral esquerda">Lateral Esquerda</option>
                            </select>
                         </div>
                     )}
                </div>
            </div>
        </div>

        {/* CAIXA 2: COLO UTERINO (Versão Simplificada 1º TRI) */}
        <div className="laudo-section">
            <div className="header-base header-purple">Colo uterino</div>
            <div className="laudo-section-body">
                <label className="laudo-checkbox-label" style={{fontWeight:'bold', marginBottom:'5px'}}>
                    <input type="checkbox" name="citarColo1Tri" checked={data.citarColo1Tri} onChange={handleChange} />
                    citar colo de aspecto normal (fechado)
                </label>
                <div className="laudo-row">
                    <label className="laudo-checkbox-label">
                        <input type="checkbox" name="citarCompColo1Tri" checked={data.citarCompColo1Tri} onChange={handleChange} />
                        citar comprimento do colo:
                    </label>
                    <input type="number" name="medidaColo1Tri" value={data.medidaColo1Tri} onChange={handleChange} disabled={!data.citarCompColo1Tri} className="laudo-input" style={{width:'50px'}} /> mm
                </div>
            </div>
        </div>

        {/* CAIXA 3: ANEXOS (OVÁRIOS) */}
        <div className="laudo-section">
            <div className="header-base header-purple">
                Avaliação dos Anexos (Ovários)
            </div>
            <div className="laudo-section-body">
                
                {/* Checkbox Principal */}
                <div className="laudo-row" style={{marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px'}}>
                    <label className="laudo-checkbox-label" style={{fontWeight: 'bold'}}>
                        <input type="checkbox" name="citarAnexos" checked={data.citarAnexos} onChange={handleChange} />
                        Descrever medidas dos ovários no laudo
                    </label>
                    
                    <span style={{marginLeft: 'auto', fontSize: '11px', fontWeight: 'bold', color: '#555'}}>
                        Corpo Lúteo em:
                        <select name="corpoLuteo" value={data.corpoLuteo} onChange={handleChange} className="laudo-select" style={{marginLeft:'5px'}}>
                            <option value="">Selecione...</option>
                            <option value="direito">Ovário Direito</option>
                            <option value="esquerdo">Ovário Esquerdo</option>
                            <option value="nao_visualizado">Não visualizado</option>
                        </select>
                    </span>
                </div>

                {/* GRID DE 2 COLUNAS: OD e OE */}
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                    
                    {/* COLUNA ESQUERDA: OVÁRIO DIREITO */}
                    <div style={{background: '#f9f9f9', padding: '8px', borderRadius: '4px', border: '1px solid #eee'}}>
                        <div style={{fontWeight: 'bold', color: '#303F9F', marginBottom: '5px', fontSize: '11px'}}>
                            OVÁRIO DIREITO (OD)
                        </div>
                        
                        <label className="laudo-checkbox-label" style={{marginBottom: '5px'}}>
                            <input type="checkbox" name="odVisualizado" checked={data.odVisualizado} onChange={handleChange} disabled={!data.citarAnexos} />
                            Visualizado
                        </label>

                        <div className="laudo-row" style={{marginTop: '5px'}}>
                            <input type="number" placeholder="L" name="od1" value={data.od1} onChange={handleChange} disabled={!data.odVisualizado} className="laudo-input" style={{width:'40px'}} /> x
                            <input type="number" placeholder="AP" name="od2" value={data.od2} onChange={handleChange} disabled={!data.odVisualizado} className="laudo-input" style={{width:'40px'}} /> x
                            <input type="number" placeholder="T" name="od3" value={data.od3} onChange={handleChange} disabled={!data.odVisualizado} className="laudo-input" style={{width:'40px'}} /> mm
                        </div>
                        
                        {data.odVol && (
                            <div style={{marginTop: '4px', fontSize: '11px', color: '#1565C0', fontWeight: 'bold'}}>
                                Vol: {data.odVol} cm³
                            </div>
                        )}

                        <div style={{marginTop: '8px'}}>
                            <span style={{fontSize: '10px', color: '#666'}}>Aspecto:</span>
                            <select name="odAspecto" value={data.odAspecto} onChange={handleChange} disabled={!data.odVisualizado} className="laudo-select full-width">
                                <option value="normal">Normal / Homogêneo</option>
                                <option value="folicular">Aspecto Folicular</option>
                                <option value="micropolicistico">Micropolicístico</option>
                                <option value="cisto">Presença de Cisto</option>
                            </select>
                        </div>
                    </div>

                    {/* COLUNA DIREITA: OVÁRIO ESQUERDO */}
                    <div style={{background: '#f9f9f9', padding: '8px', borderRadius: '4px', border: '1px solid #eee'}}>
                        <div style={{fontWeight: 'bold', color: '#303F9F', marginBottom: '5px', fontSize: '11px'}}>
                            OVÁRIO ESQUERDO (OE)
                        </div>
                        
                        <label className="laudo-checkbox-label" style={{marginBottom: '5px'}}>
                            <input type="checkbox" name="oeVisualizado" checked={data.oeVisualizado} onChange={handleChange} disabled={!data.citarAnexos} />
                            Visualizado
                        </label>

                        <div className="laudo-row" style={{marginTop: '5px'}}>
                            <input type="number" placeholder="L" name="oe1" value={data.oe1} onChange={handleChange} disabled={!data.oeVisualizado} className="laudo-input" style={{width:'40px'}} /> x
                            <input type="number" placeholder="AP" name="oe2" value={data.oe2} onChange={handleChange} disabled={!data.oeVisualizado} className="laudo-input" style={{width:'40px'}} /> x
                            <input type="number" placeholder="T" name="oe3" value={data.oe3} onChange={handleChange} disabled={!data.oeVisualizado} className="laudo-input" style={{width:'40px'}} /> mm
                        </div>
                        
                        {data.oeVol && (
                            <div style={{marginTop: '4px', fontSize: '11px', color: '#1565C0', fontWeight: 'bold'}}>
                                Vol: {data.oeVol} cm³
                            </div>
                        )}

                        <div style={{marginTop: '8px'}}>
                            <span style={{fontSize: '10px', color: '#666'}}>Aspecto:</span>
                            <select name="oeAspecto" value={data.oeAspecto} onChange={handleChange} disabled={!data.oeVisualizado} className="laudo-select full-width">
                                <option value="normal">Normal / Homogêneo</option>
                                <option value="folicular">Aspecto Folicular</option>
                                <option value="micropolicistico">Micropolicístico</option>
                                <option value="cisto">Presença de Cisto</option>
                            </select>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </>
  );
};

export default SecaoDadosMaternos1Tri;