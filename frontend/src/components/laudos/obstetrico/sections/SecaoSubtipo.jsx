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
                <option value="OBSTETRICO_MORFOLOGICO">US Obstétrico Morfológico 2º e 3º trimestres</option>
                <option value="OBSTETRICO_1_TRI">US Obstétrico 1º trimestre</option>
                <option value="OBSTETRICO_2_3_TRI">US Obstétrico 2º e 3º trimestres</option>
            </select>
        </div>
    </div>
  );
};

export default SecaoSubtipo;