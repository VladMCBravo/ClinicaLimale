import React from 'react';
// O CSS ../Laudos.css já é importado no componente Pai (FormObstetrico)

const SecaoSubtipo = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-purple">
            Subtipo de Exame
        </div>
        <div className="laudo-section-body">
            <select 
                name="subtipo" 
                value={data.subtipo} 
                onChange={handleChange}
                className="laudo-select"
                style={{ width: '100%', fontSize: '12px', padding: '4px' }}
            >
                <option value="OBSTETRICO_INICIAL">Obstétrico Inicial (Transvaginal)</option>
    <option value="OBSTETRICO_1_TRI">Morfológico 1º Trimestre</option>
    <option value="OBSTETRICO_2_3_TRI">Obstétrico (2º/3º Tri)</option>
    <option value="OBSTETRICO_DOPPLER">Obstétrico com Doppler</option>
    <option value="OBSTETRICO_MORFOLOGICO">Morfológico 2º Trimestre</option>
    <option value="OBSTETRICO_3D">Obstétrico 3D / 4D</option> {/* <--- NOVO */}
            </select>
        </div>
    </div>
  );
};

export default SecaoSubtipo;