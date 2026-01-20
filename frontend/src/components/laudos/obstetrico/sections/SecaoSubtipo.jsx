import React from 'react';

const SecaoSubtipo = ({ data, handleChange }) => {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
        <label className="label-pequeno" style={{fontWeight:'bold', color:'#4A3B80'}}>
            SUBTIPO DE EXAME:
        </label>
        <select 
            name="subtipo" 
            value={data.subtipo} 
            onChange={handleChange}
            className="laudo-select"
            style={{ 
                width: '100%', 
                height: '30px', 
                fontSize: '12px', 
                fontWeight: 'bold',
                border: '1px solid #4A3B80',
                color: '#4A3B80'
            }}
        >
            <option value="OBSTETRICO_INICIAL">Obstétrico Inicial</option>
            <option value="OBSTETRICO_1_TRI">Morfológico 1º Trimestre</option>
            <option value="OBSTETRICO_2_3_TRI">Obstétrico (2º/3º Tri)</option>
            <option value="OBSTETRICO_DOPPLER">Obstétrico com Doppler</option>
            <option value="OBSTETRICO_MORFOLOGICO">Morfológico 2º Trimestre</option>
            <option value="OBSTETRICO_3D">Obstétrico 3D / 4D</option>
        </select>
    </div>
  );
};

export default SecaoSubtipo;