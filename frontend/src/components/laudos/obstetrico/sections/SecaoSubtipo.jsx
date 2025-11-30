import React from 'react';

const SecaoSubtipo = ({ data, handleChange }) => {
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '4px', marginBottom: '5px', padding: '5px', background: '#fff' }}>
        <div style={{ background: '#4A3B80', color: 'white', padding: '2px 5px', fontSize: '11px', fontWeight: 'bold', marginBottom: '5px', borderRadius: '2px' }}>
            Subtipo de Exame
        </div>
        <select 
            name="subtipo" 
            value={data.subtipo} 
            onChange={handleChange}
            style={{ width: '100%', padding: '4px', fontSize: '12px', border: '1px solid #A9A9A9', borderRadius: '2px', backgroundColor: '#EDF4FC' }}
        >
            <option value="OBSTETRICO_MORFOLOGICO">US Obstétrico Morfológico 2º e 3º trimestres</option>
            <option value="OBSTETRICO_1_TRI">US Obstétrico 1º trimestre</option>
            <option value="OBSTETRICO_2_3_TRI">US Obstétrico 2º e 3º trimestres</option>
        </select>
    </div>
  );
};

export default SecaoSubtipo;