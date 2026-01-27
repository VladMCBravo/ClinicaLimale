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
                <div className="laudo-row" style={{marginBottom: '10px'}}>
                    <div style={{flex: 1}}>
                        <label className="laudo-checkbox-label" style={{fontWeight:'bold', marginBottom:'5px'}}>
                            <input type="checkbox" name="citarUteroMedidas" checked={data.citarUteroMedidas} onChange={handleChange} />
                            citar medidas:
                        </label>
                        <div className="laudo-row">
                             <input type="number" name="ut1" value={data.ut1} onChange={handleChange} className="laudo-input" style={{width:'45px'}} disabled={!data.citarUteroMedidas}/> x
                             <input type="number" name="ut2" value={data.ut2} onChange={handleChange} className="laudo-input" style={{width:'45px'}} disabled={!data.citarUteroMedidas}/> x
                             <input type="number" name="ut3" value={data.ut3} onChange={handleChange} className="laudo-input" style={{width:'45px'}} disabled={!data.citarUteroMedidas}/> mm
                        </div>
                    </div>
                    {/* Aviso visual igual ao print */}
                    <div style={{flex: 1, background: '#f5f5f5', padding: '5px', border: '1px solid #ddd', fontSize: '10px', color: '#666'}}>
                        Obs: os itens referentes ao COLO UTERINO estão em uma caixa separada, abaixo desta.
                    </div>
                </div>

                {/* Mioma / Nódulo */}
                <div>
                     <div className="laudo-row">
                        <label className="laudo-checkbox-label">
                            <input type="checkbox" name="citarNodulo" checked={data.citarNodulo} onChange={handleChange} />
                            nódulo miometrial medindo
                        </label>
                        <input type="number" name="nod1" value={data.nod1} onChange={handleChange} disabled={!data.citarNodulo} className="laudo-input" style={{width:'40px', margin:'0 5px'}} /> x
                        <input type="number" name="nod2" value={data.nod2} onChange={handleChange} disabled={!data.citarNodulo} className="laudo-input" style={{width:'40px', margin:'0 5px'}} /> mm,
                        <select name="nodTipo" value={data.nodTipo} onChange={handleChange} disabled={!data.citarNodulo} className="laudo-select" style={{marginLeft:'5px'}}>
                             <option>subseroso</option><option>intramural</option><option>submucoso</option>
                        </select>
                     </div>
                     <div className="laudo-row" style={{marginTop:'5px', paddingLeft:'20px'}}>
                        <span style={{color: '#999'}}>em localização</span>
                        <select name="nodLocal" value={data.nodLocal} onChange={handleChange} disabled={!data.citarNodulo} className="laudo-select">
                             <option>fúndica</option><option>corporal anterior</option><option>corporal posterior</option><option>lateral direita</option><option>lateral esquerda</option>
                        </select>
                     </div>
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