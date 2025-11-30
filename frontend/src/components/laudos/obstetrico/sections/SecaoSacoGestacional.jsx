import React from 'react';

const SecaoSacoGestacional = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-blue">Saco gestacional / cavidade uterina</div>
        <div className="laudo-section-body">
            
            {/* Linha Principal */}
            <div className="laudo-row">
                <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
                    <input type="checkbox" name="citarSg" checked={data.citarSg} onChange={handleChange} />
                    citar o SG
                </label>
                
                <div className="laudo-row" style={{marginLeft: '20px'}}>
                    <span>em localização</span>
                    <select name="sgLocalizacao" value={data.sgLocalizacao} onChange={handleChange} className="laudo-select">
                        <option>fúndica</option>
                        <option>corporal anterior</option>
                        <option>corporal posterior</option>
                        <option>segmento inferior</option>
                    </select>
                </div>
            </div>

            {/* Medidas */}
            <div style={{paddingLeft: '30px', marginTop: '5px', marginBottom: '10px'}}>
                <div className="laudo-row">
                    <span>medindo</span>
                    <input type="number" name="sg1" value={data.sg1} onChange={handleChange} className="laudo-input" style={{width:'50px'}} /> x
                    <input type="number" name="sg2" value={data.sg2} onChange={handleChange} className="laudo-input" style={{width:'50px'}} /> x
                    <input type="number" name="sg3" value={data.sg3} onChange={handleChange} className="laudo-input" style={{width:'50px'}} /> mm
                </div>
                
                <div className="laudo-row" style={{marginTop:'5px', fontWeight:'bold', color:'#1565C0'}}>
                    {/* Estes valores (resDmsg e resIgSg) virão calculados do Pai */}
                    <span style={{marginRight:'20px'}}>DMSG: {data.resDmsg || '--'} mm</span>
                    <span>I.G.: {data.resIgSg || '--'}</span>
                </div>
            </div>

            <div className="laudo-row" style={{marginBottom: '10px'}}>
                <span style={{fontWeight:'bold'}}>Trofoblasto: inserção</span>
                <select name="trofoblasto" value={data.trofoblasto} onChange={handleChange} className="laudo-select">
                    <option>não citar</option>
                    <option>anterior</option>
                    <option>posterior</option>
                    <option>fúndica</option>
                    <option>lateral direita</option>
                    <option>lateral esquerda</option>
                    <option>envolvente</option>
                </select>
            </div>

            {/* Checkboxes inferiores */}
            <div className="laudo-col" style={{gap: '5px'}}>
                <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
                    <input type="checkbox" name="sgSemDescolamento" checked={data.sgSemDescolamento} onChange={handleChange} />
                    sem sinais de descolamento ovular
                </label>

                <div className="laudo-row">
                     <label className="laudo-checkbox-label">
                        <input type="checkbox" name="sgComDescolamento" checked={data.sgComDescolamento} onChange={handleChange} />
                        área de descolamento medindo
                    </label>
                    <input type="number" name="desc1" value={data.desc1} onChange={handleChange} className="laudo-input" style={{width:'40px'}} disabled={!data.sgComDescolamento}/> x
                    <input type="number" name="desc2" value={data.desc2} onChange={handleChange} className="laudo-input" style={{width:'40px'}} disabled={!data.sgComDescolamento}/> x
                    <input type="number" name="desc3" value={data.desc3} onChange={handleChange} className="laudo-input" style={{width:'40px'}} disabled={!data.sgComDescolamento}/> mm
                </div>

                <label className="laudo-checkbox-label">
                    <input type="checkbox" name="sgAbortoIncompleto" checked={data.sgAbortoIncompleto} onChange={handleChange} />
                    ABORTAMENTO INCOMPLETO: cavidade uterina preenchida por restos ovulares
                </label>
            </div>

        </div>
    </div>
  );
};

export default SecaoSacoGestacional;