import React from 'react';

const styles = {
    section: { border: '1px solid #ccc', borderRadius: '4px', marginBottom: '5px', background: '#fff' },
    header: { background: '#2E7D32', color: 'white', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold' },
    body: { padding: '5px', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px' },
    row: { display: 'flex', gap: '10px', alignItems: 'center' },
    select: { border: '1px solid #aaa', borderRadius: '2px', padding: '1px' },
    inputSmall: { width: '40px', border: '1px solid #aaa', borderRadius: '2px', textAlign: 'center' }
};

const SecaoAnexos = ({ data, handleChange }) => {
  return (
    <>
        <div style={styles.section}>
            <div style={styles.header}>Cordão umbilical</div>
            <div style={styles.body}>
                <div style={styles.row}>
                    <label style={{display:'flex', alignItems:'center', gap:'4px'}}>
                        <input type="checkbox" name="cordaoNormal" checked={data.cordaoNormal} onChange={handleChange} /> 
                        citar cordão normal (c/2 artérias e 1 veia)
                    </label>
                    <div style={{marginLeft:'auto'}}>
                        Circular: 
                        <select name="cordaoCircular" value={data.cordaoCircular} onChange={handleChange} style={styles.select}>
                            <option>não citar</option>
                            <option>ausente</option>
                            <option>cervical (1 volta)</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <div style={styles.section}>
            <div style={styles.header}>Placenta</div>
            <div style={styles.body}>
                <div style={styles.row}>
                    <span>inserção</span>
                    <select name="placentaInsercao" value={data.placentaInsercao} onChange={handleChange} style={styles.select}>
                        <option>Corporal Posterior</option><option>Corporal Anterior</option><option>Fúndica</option><option>Prévia</option>
                    </select>
                    <span>aspecto</span>
                    <select name="placentaAspecto" value={data.placentaAspecto} onChange={handleChange} style={styles.select}>
                        <option>Normal</option><option>Heterogêneo</option>
                    </select>
                </div>
                <div style={styles.row}>
                     <label style={{display:'flex', alignItems:'center', gap:'4px'}}>
                        <input type="checkbox" checked={!!data.placentaEspessura} readOnly /> 
                        citar espessura:
                     </label>
                     <input name="placentaEspessura" value={data.placentaEspessura} onChange={handleChange} style={styles.inputSmall} /> mm
                </div>
            </div>
        </div>

        <div style={styles.section}>
            <div style={styles.header}>Líquido amniótico</div>
            <div style={styles.body}>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px'}}>
                    <div style={{display:'flex', flexDirection:'column', gap:'2px'}}>
                        <label><input type="radio" name="liquidoVolume" value="Normal" checked={data.liquidoVolume === 'Normal'} onChange={handleChange}/> volume normal</label>
                        <label><input type="radio" name="liquidoVolume" value="Reduzido" checked={data.liquidoVolume === 'Reduzido'} onChange={handleChange}/> volume reduzido</label>
                        <label><input type="radio" name="liquidoVolume" value="Aumentado" checked={data.liquidoVolume === 'Aumentado'} onChange={handleChange}/> volume aumentado</label>
                    </div>
                    <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                        <div style={styles.row}>
                             <input type="checkbox" checked={!!data.ila} readOnly/> 
                             <span>citar ILA = </span>
                             <input name="ila" value={data.ila} onChange={handleChange} style={styles.inputSmall} /> cm
                        </div>
                        <div style={styles.row}>
                             <input type="checkbox" checked={!!data.maiorBolso} readOnly/> 
                             <span>MBV = </span>
                             <input name="maiorBolso" value={data.maiorBolso} onChange={handleChange} style={styles.inputSmall} /> cm
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </>
  );
};

export default SecaoAnexos;