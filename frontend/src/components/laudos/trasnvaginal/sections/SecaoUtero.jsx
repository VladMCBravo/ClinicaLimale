import React from 'react';

const SecaoUtero = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
      <div style={{display:'flex', justifyContent:'space-between'}}>
        <h4>Útero e Endométrio</h4>
        <label className="laudo-checkbox-label">
            <input type="checkbox" name="uteroAusente" checked={data.uteroAusente} onChange={handleChange} />
            Histerectomizada
        </label>
      </div>

      {!data.uteroAusente && (
        <>
            <div className="laudo-row">
                <label>Posição:
                    <select name="uteroPosicao" value={data.uteroPosicao} onChange={handleChange} className="laudo-select">
                        <option value="anteversoflexão">Anteversoflexão (AVF)</option>
                        <option value="retroversoflexão">Retroversoflexão (RVF)</option>
                        <option value="intermediário">Intermediário / Mediano</option>
                    </select>
                </label>
                
                <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                    <span>Dimensões (cm):</span>
                    <input type="number" name="ut1" value={data.ut1} onChange={handleChange} className="laudo-input-small" placeholder="Long"/> x
                    <input type="number" name="ut2" value={data.ut2} onChange={handleChange} className="laudo-input-small" placeholder="AP"/> x
                    <input type="number" name="ut3" value={data.ut3} onChange={handleChange} className="laudo-input-small" placeholder="Trans"/>
                    <span style={{fontWeight:'bold', marginLeft:'10px', background:'#eee', padding:'2px 5px'}}>
                        Vol: {data.resVolUtero} cm³
                    </span>
                </div>
            </div>

            <div className="laudo-row">
                <label>Miométrio:
                    <select name="miometrio" value={data.miometrio} onChange={handleChange} className="laudo-select">
                        <option value="homogêneo">Homogêneo</option>
                        <option value="heterogêneo">Heterogêneo (Inc. Miomatose)</option>
                        <option value="nodulos">Com Nódulos (Descrever)</option>
                    </select>
                </label>
                
                <label className="laudo-checkbox-label">
                    <input type="checkbox" name="citarNodulos" checked={data.citarNodulos} onChange={handleChange} />
                    Descrever Nódulo Princ.
                </label>
            </div>

            {data.citarNodulos && (
                <div className="laudo-group-box">
                    <div className="laudo-row">
                        <label>Tipo:
                            <select name="nod1_tipo" value={data.nod1_tipo} onChange={handleChange} className="laudo-select">
                                <option value="intramural">Intramural</option>
                                <option value="subseroso">Subseroso</option>
                                <option value="submucoso">Submucoso</option>
                            </select>
                        </label>
                        <label>Local:
                            <input type="text" name="nod1_loc" value={data.nod1_loc} onChange={handleChange} className="laudo-input" placeholder="Ex: corpórea anterior" />
                        </label>
                        <label>Medidas (mm):
                            <input type="number" name="nod1_d1" value={data.nod1_d1} onChange={handleChange} className="laudo-input-small" /> x 
                            <input type="number" name="nod1_d2" value={data.nod1_d2} onChange={handleChange} className="laudo-input-small" />
                        </label>
                    </div>
                </div>
            )}

            <hr />

            <div className="laudo-row">
                <label>Endométrio (mm):
                    <input type="number" name="endometrioEspessura" value={data.endometrioEspessura} onChange={handleChange} className="laudo-input-small" style={{width:'60px'}} />
                </label>
                <label>Aspecto:
                    <select name="endometrioAspecto" value={data.endometrioAspecto} onChange={handleChange} className="laudo-select">
                        <option value="ecogênico e homogêneo">Ecogênico/Homogêneo</option>
                        <option value="trilaminar">Trilaminar (1ª Fase)</option>
                        <option value="fino e linear">Fino/Linear (Atrófico)</option>
                        <option value="heterogêneo">Heterogêneo / Irregular</option>
                    </select>
                </label>
            </div>
             
             {/* Área do DIU */}
            <div className="laudo-row">
                <label>Cavidade:
                     <select name="cavidadeUterina" value={data.cavidadeUterina} onChange={handleChange} className="laudo-select">
                         <option value="virtual">Virtual</option>
                         <option value="DIU Cobre">Presença de DIU (Cobre/Prata)</option>
                         <option value="DIU Mirena">Presença de DIU (Mirena/Kyleena)</option>
                         <option value="colecao">Coleção Líquida</option>
                     </select>
                </label>
                
                {data.cavidadeUterina.includes('DIU') && (
                     <div style={{display:'flex', gap:'5px'}}>
                        <select name="diuPosicao" value={data.diuPosicao} onChange={handleChange} className="laudo-select">
                            <option value="bem posicionado">Bem posicionado</option>
                            <option value="baixo implantado">Baixo implantado</option>
                            <option value="deslocado">Deslocado</option>
                        </select>
                        <input type="number" name="diuDistanciaFundo" value={data.diuDistanciaFundo} onChange={handleChange} className="laudo-input-small" placeholder="Dist(mm)" />
                     </div>
                )}
            </div>

        </>
      )}
    </div>
  );
};

export default SecaoUtero;