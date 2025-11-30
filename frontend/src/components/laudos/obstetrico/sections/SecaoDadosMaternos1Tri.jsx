import React from 'react';

const SecaoDadosMaternos1Tri = ({ data, handleChange }) => {
  return (
    <>
        {/* CAIXA 1: VIA DE AVALIAÇÃO */}
        <div className="laudo-section">
            <div className="header-base header-purple">Via de avaliação</div>
            <div className="laudo-section-body">
                <div className="laudo-row">
                    <span>exame realizado por via:</span>
                    <select name="viaExame" value={data.viaExame} onChange={handleChange} className="laudo-select" style={{marginLeft:'10px'}}>
                        <option>não citar</option>
                        <option>transvaginal</option>
                        <option>abdominal</option>
                        <option>transvaginal e abdominal</option>
                    </select>
                </div>
            </div>
        </div>

        {/* CAIXA 2: ÚTERO */}
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

        {/* CAIXA 3: COLO UTERINO (Versão Simplificada 1º TRI) */}
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

        {/* CAIXA 4: ANEXOS */}
        <div className="laudo-section">
            <div className="header-base header-purple">Anexos</div>
            <div className="laudo-section-body">
                <div className="laudo-row">
                    <span style={{fontWeight:'bold'}}>corpo lúteo gestacional no ovário:</span>
                    <select name="corpoLuteo" value={data.corpoLuteo} onChange={handleChange} className="laudo-select" style={{marginLeft:'5px'}}>
                        <option>não citar</option>
                        <option>direito</option>
                        <option>esquerdo</option>
                    </select>
                </div>

                <div className="laudo-row" style={{marginTop:'5px', paddingLeft: '20px'}}>
                     <label className="laudo-checkbox-label" style={{marginRight: '15px'}}>
                        <input type="checkbox" name="citarMedidasAnexo" checked={data.citarMedidasAnexo} onChange={handleChange} />
                        citar medidas:
                     </label>
                     <label className="laudo-checkbox-label" style={{color:'#888'}}>
                        <input type="checkbox" name="calcVolAnexo" checked={data.calcVolAnexo} onChange={handleChange} disabled={!data.citarMedidasAnexo} />
                        calcular volume
                     </label>
                </div>

                <div className="laudo-row" style={{marginTop:'5px', paddingLeft: '20px'}}>
                     <input type="number" name="anx1" value={data.anx1} onChange={handleChange} disabled={!data.citarMedidasAnexo} className="laudo-input" style={{width:'45px'}} /> x
                     <input type="number" name="anx2" value={data.anx2} onChange={handleChange} disabled={!data.citarMedidasAnexo} className="laudo-input" style={{width:'45px'}} /> x
                     <input type="number" name="anx3" value={data.anx3} onChange={handleChange} disabled={!data.citarMedidasAnexo} className="laudo-input" style={{width:'45px'}} /> mm
                     
                     {data.calcVolAnexo && data.resVolAnexo && (
                         <span style={{fontWeight:'bold', color:'#1565C0', marginLeft:'15px'}}>
                             Vol: {data.resVolAnexo} cm³
                         </span>
                     )}
                </div>
            </div>
        </div>
    </>
  );
};

export default SecaoDadosMaternos1Tri;