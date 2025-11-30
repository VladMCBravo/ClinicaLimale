import React from 'react';

const styles = {
    section: { border: '1px solid #ccc', borderRadius: '4px', marginBottom: '5px', background: '#fff', overflow: 'hidden' },
    header: { background: '#2E7D32', color: 'white', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold' },
    body: { padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' },
    input: { border: '1px solid #aaa', borderRadius: '2px', padding: '2px 5px', fontSize: '11px' }
};

const SecaoDatacao = ({ data, handleChange }) => {
  return (
    <div style={styles.section}>
        <div style={styles.header}>DUM / DPP / Idade gestacional</div>
        <div style={styles.body}>
            {/* Bloco DUM */}
            <div style={{background: '#F5F5F5', padding: '8px', border: '1px solid #ddd'}}>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                     <label><input type="radio" checked={data.usarDum} onChange={() => handleChange({target: {name: 'usarDum', value: true}})} /> <span style={{fontWeight:'bold'}}>Usar a D.U.M.</span></label>
                     <input type="date" name="dum" value={data.dum} onChange={handleChange} disabled={!data.usarDum} style={styles.input} />
                </div>
                <div style={{marginLeft:'20px', marginTop:'5px', display:'flex', gap:'15px'}}>
                    <label><input type="radio" checked={data.dumDesconhecida} onChange={() => handleChange({target: {name: 'dumDesconhecida', value: true}})} /> D.U.M. desconhecida</label>
                    <label><input type="checkbox" /> exibir a data</label>
                </div>
                <div style={{marginTop:'5px'}}>
                    <label><input type="radio" checked={data.naoUsarDum} onChange={() => handleChange({target: {name: 'naoUsarDum', value: true}})} /> NÃO usar a D.U.M.</label>
                </div>
            </div>
            
            {/* Bloco IG Anterior */}
            <div style={{border: '1px solid #ddd', padding: '5px'}}>
                <label><input type="checkbox" name="usarIgAnterior" checked={data.usarIgAnterior} onChange={handleChange} /> referir Idade Gestacional com base em US anterior</label>
                <div style={{display:'flex', gap:'5px', marginTop:'5px', alignItems:'center'}}>
                    <span>Data:</span> <input type="date" name="dataExameAnterior" value={data.dataExameAnterior} onChange={handleChange} style={styles.input}/>
                    <span>IG:</span> <input name="igAnteriorSemanas" style={{...styles.input, width:'30px'}}/> s <input name="igAnteriorDias" style={{...styles.input, width:'30px'}}/> d
                </div>
            </div>
        </div>
    </div>
  );
};

export default SecaoDatacao;