import React from 'react';

const SecaoRegiaoAnexial = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
      <h4>Fundo de Saco e Região Anexial</h4>
      
      <div className="laudo-row">
          <label>Líquido Livre (Douglas):
              <select name="liquidoLivre" value={data.liquidoLivre} onChange={handleChange} className="laudo-select">
                  <option value="ausente">Ausente</option>
                  <option value="pequena">Pequena quantidade</option>
                  <option value="moderada">Moderada quantidade</option>
                  <option value="grande">Grande quantidade</option>
              </select>
          </label>
      </div>

      <div className="laudo-row">
          <label className="laudo-checkbox-label">
              <input type="checkbox" name="hidrossalpinge" checked={data.hidrossalpinge} onChange={handleChange} />
              Hidrossalpinge Visibilizada?
          </label>
          
          <label className="laudo-checkbox-label">
              <input type="checkbox" name="massasAnexiais" checked={data.massasAnexiais} onChange={handleChange} />
              Massa anexial complexa?
          </label>
      </div>
    </div>
  );
};

export default SecaoRegiaoAnexial;