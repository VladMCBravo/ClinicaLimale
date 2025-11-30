import React from 'react';

const styles = {
    section: { border: '1px solid #ccc', borderRadius: '4px', marginBottom: '5px', background: '#fff' },
    // O cabeçalho muda de cor se estiver ativo ou não
    body: { padding: '8px', fontSize: '11px', color: '#555' },
    row: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '4px' },
    col: { flex: 1 },
    inputTiny: { width: '35px', textAlign: 'center', border: '1px solid #ccc', borderRadius: '2px', marginLeft: '3px' },
    subTitle: { fontWeight: 'bold', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '5px' }
};

const DopplerGroup = ({ title, active, children }) => (
    <div style={{marginBottom: '10px', opacity: active ? 1 : 0.6}}>
        <div style={styles.subTitle}>
            <input type="checkbox" checked={active} readOnly /> {title}
        </div>
        <div style={{paddingLeft: '15px'}}>{children}</div>
    </div>
);

const SecaoDoppler = ({ data, handleChange }) => {
  const headerColor = data.usarDoppler ? '#2E7D32' : '#757575'; // Verde se ativo, Cinza se inativo

  return (
    <div style={styles.section}>
        <div style={{ background: headerColor, color: 'white', padding: '4px 8px', fontSize: '11px', fontWeight: 'bold' }}>
            <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer', width:'100%'}}>
                <input type="checkbox" checked={data.usarDoppler} onChange={(e) => handleChange({target: {name: 'usarDoppler', value: e.target.checked}})} />
                DOPPLER (Incluir Doppler)
            </label>
        </div>

        {data.usarDoppler && (
            <div style={styles.body}>
                <div style={{display:'flex', gap:'20px'}}>
                    {/* Coluna Esquerda: Uterinas */}
                    <div style={styles.col}>
                        <DopplerGroup title="Artéria uterina DIR" active={true}>
                            <div style={styles.row}>
                                <span>S/D</span> <input name="utDirSD" value={data.utDirSD} onChange={handleChange} style={styles.inputTiny}/>
                                <span>I.R.</span> <input name="utDirIR" value={data.utDirIR} onChange={handleChange} style={styles.inputTiny}/>
                                <span>I.P.</span> <input name="utDirIP" value={data.utDirIP} onChange={handleChange} style={styles.inputTiny}/>
                            </div>
                            <label style={{cursor:'pointer'}}><input type="checkbox" name="utDirInc" checked={data.utDirInc} onChange={handleChange}/> incisura protodiastólica presente</label>
                        </DopplerGroup>

                        <DopplerGroup title="Artérias umbilicais" active={true}>
                             <div style={styles.row}>
                                <span>S/D</span> <input name="umbSD" value={data.umbSD} onChange={handleChange} style={styles.inputTiny}/>
                                <span>I.R.</span> <input name="umbIR" value={data.umbIR} onChange={handleChange} style={styles.inputTiny}/>
                                <span>I.P.</span> <input name="umbIP" value={data.umbIP} onChange={handleChange} style={styles.inputTiny}/>
                            </div>
                            <label><input type="checkbox" checked disabled/> traçado normal</label>
                            <label><input type="checkbox" disabled/> diástole 'zero'</label>
                        </DopplerGroup>
                    </div>

                    {/* Coluna Direita: Uterina ESQ / ACM / DV */}
                    <div style={styles.col}>
                         <DopplerGroup title="Artéria uterina ESQ" active={true}>
                            <div style={styles.row}>
                                <span>S/D</span> <input name="utEsqSD" value={data.utEsqSD} onChange={handleChange} style={styles.inputTiny}/>
                                <span>I.R.</span> <input name="utEsqIR" value={data.utEsqIR} onChange={handleChange} style={styles.inputTiny}/>
                                <span>I.P.</span> <input name="utEsqIP" value={data.utEsqIP} onChange={handleChange} style={styles.inputTiny}/>
                            </div>
                            <label style={{cursor:'pointer'}}><input type="checkbox" name="utEsqInc" checked={data.utEsqInc} onChange={handleChange}/> incisura protodiastólica presente</label>
                        </DopplerGroup>

                        <DopplerGroup title="Artéria cerebral média" active={true}>
                            <div style={styles.row}>
                                <span>PVS</span> <input name="acmPVS" value={data.acmPVS} onChange={handleChange} style={styles.inputTiny}/> cm/s
                            </div>
                            <div style={styles.row}>
                                <span>S/D</span> <input name="acmSD" value={data.acmSD} onChange={handleChange} style={styles.inputTiny}/>
                                <span>I.R.</span> <input name="acmIR" value={data.acmIR} onChange={handleChange} style={styles.inputTiny}/>
                                <span>I.P.</span> <input name="acmIP" value={data.acmIP} onChange={handleChange} style={styles.inputTiny}/>
                            </div>
                        </DopplerGroup>

                        <div style={{marginTop:'5px', borderTop:'1px solid #eee', paddingTop:'5px'}}>
                            <span style={{fontWeight:'bold'}}>Ducto Venoso</span>
                            <div style={styles.row}>
                                <span>I.P.</span> <input name="ductoVenosoIP" value={data.ductoVenosoIP} onChange={handleChange} style={styles.inputTiny}/>
                                <select name="ductoVenosoOndaA" value={data.ductoVenosoOndaA} onChange={handleChange} style={{marginLeft:'5px', fontSize:'10px'}}>
                                    <option>Positiva</option><option>Zero</option><option>Reversa</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Caixa de Aviso do Print */}
                <div style={{background:'#F5F5F5', padding:'5px', fontSize:'9px', textAlign:'center', marginTop:'5px', color:'#777'}}>
                    A avaliação dos parâmetros do Doppler é muitas vezes subjetiva e consiste em ato exclusivamente médico.
                </div>
            </div>
        )}
    </div>
  );
};

export default SecaoDoppler;