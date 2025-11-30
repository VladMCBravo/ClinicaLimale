import React from 'react';

const styles = {
    section: { border: '1px solid #ccc', borderRadius: '4px', marginBottom: '5px', background: '#fff' },
    header: { background: '#2E7D32', color: 'white', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold' },
    row: { padding: '5px', display: 'flex', gap: '10px', alignItems: 'center' },
    select: { border: '1px solid #aaa', borderRadius: '2px', fontSize: '11px', padding: '2px' }
};

const SecaoColoDados = ({ data, handleChange }) => {
  return (
    <>
        {/* Colo Uterino */}
        <div style={styles.section}>
            <div style={styles.header}>Colo uterino</div>
            <div style={{padding:'5px', display:'flex', flexDirection:'column', gap:'5px'}}>
                <label><input type="checkbox" name="citarColoNormal" checked={data.citarColoNormal} onChange={handleChange} /> citar colo de aspecto normal (fechado)</label>
                <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                    <label><input type="checkbox" name="citarComprimentoColo" checked={data.citarComprimentoColo} onChange={handleChange} /> citar comprimento do colo:</label>
                    <input name="medidaColo" value={data.medidaColo} onChange={handleChange} style={{width:'50px'}} /> mm
                </div>
            </div>
        </div>

        {/* Dados Iniciais */}
        <div style={styles.section}>
            <div style={styles.header}>Dados iniciais</div>
            <div style={{padding:'5px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px'}}>
                <div>
                    <span style={{fontSize:'10px', fontWeight:'bold'}}>situação</span>
                    <select name="situacao" value={data.situacao} onChange={handleChange} style={{...styles.select, width:'100%'}}>
                        <option>longitudinal</option><option>transversa</option><option>oblíqua</option>
                    </select>
                </div>
                <div>
                    <span style={{fontSize:'10px', fontWeight:'bold'}}>apresentação</span>
                    <select name="apresentacao" value={data.apresentacao} onChange={handleChange} style={{...styles.select, width:'100%'}}>
                        <option>cefálica</option><option>pélvica</option><option>córmica</option>
                    </select>
                </div>
                <div>
                    <span style={{fontSize:'10px', fontWeight:'bold'}}>dorso</span>
                    <select name="dorso" value={data.dorso} onChange={handleChange} style={{...styles.select, width:'100%'}}>
                        <option>à esquerda</option><option>à direita</option><option>anterior</option><option>posterior</option>
                    </select>
                </div>
            </div>
        </div>
    </>
  );
};

export default SecaoColoDados;