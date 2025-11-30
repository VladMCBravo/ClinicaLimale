import React from 'react';

const styles = {
    section: { border: '1px solid #ccc', borderRadius: '4px', marginBottom: '5px', background: '#fff' },
    header: { background: '#2E7D32', color: 'white', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold' },
    body: { padding: '8px', fontSize: '11px' },
    checkboxRow: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', cursor: 'pointer', fontWeight: 'bold', color: '#333' }
};

const SecaoConclusao = ({ data, handleChange }) => {
  return (
    <div style={styles.section}>
        <div style={styles.header}>Conclusão</div>
        <div style={styles.body}>
            <label style={styles.checkboxRow}>
                <input type="checkbox" /> 
                Concluir DESENVOLVIMENTO como NORMAL
            </label>
            <label style={styles.checkboxRow}>
                <input type="checkbox" /> 
                Concluir MORFOLOGIA como NORMAL
            </label>
            {data.usarDoppler && (
                <label style={styles.checkboxRow}>
                    <input type="checkbox" /> 
                    Concluir DOPPLER como NORMAL
                </label>
            )}
            <label style={styles.checkboxRow}>
                <input type="checkbox" /> 
                Concluir TRANSLUCÊNCIA NUCAL como NORMAL
            </label>
            
            <div style={{marginTop: '10px'}}>
                <span style={{fontWeight:'bold'}}>Observações adicionais:</span>
                <textarea 
                    name="obsAdicionais" 
                    value={data.obsAdicionais} 
                    onChange={handleChange}
                    style={{width:'100%', height:'60px', marginTop:'5px', border:'1px solid #ccc', padding:'5px', fontFamily:'Arial'}} 
                />
            </div>
        </div>
    </div>
  );
};

export default SecaoConclusao;