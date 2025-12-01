import React from 'react';

const SecaoTecnicaBexiga = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
      <h4>Técnica e Bexiga</h4>
      
      <div className="laudo-row">
        <label>Limitações:
            <select name="limitacao" value={data.limitacao} onChange={handleChange} className="laudo-select">
                <option value="nenhuma">Nenhuma</option>
                <option value="meteorismo_intestinal">Meteorismo Intestinal</option>
                <option value="biotipo_obesidade">Biotipo (Obesidade)</option>
                <option value="dor_intensa">Dor intensa à manobra</option>
            </select>
        </label>
        
        <label>Bexiga:
            <select name="bexiga" value={data.bexiga} onChange={handleChange} className="laudo-select">
                <option value="vazia">Vazia (Padrão Transvaginal)</option>
                <option value="normal">Normal/Repleta</option>
                <option value="replecao_insuficiente">Repleção Insuficiente</option>
            </select>
        </label>
      </div>

      <div className="laudo-row">
          <label className="laudo-checkbox-label">
              <input type="checkbox" name="calcResiduo" checked={data.calcResiduo} onChange={handleChange} />
              Calcular Resíduo Pós-Miccional?
          </label>
      </div>

      {data.calcResiduo && (
          <div className="laudo-group-box">
              <div className="laudo-row">
                  <span>Vol. Pré (mm):</span>
                  <input type="number" name="volPre1" placeholder="D1" value={data.volPre1} onChange={handleChange} className="laudo-input-small"/> x
                  <input type="number" name="volPre2" placeholder="D2" value={data.volPre2} onChange={handleChange} className="laudo-input-small"/> x
                  <input type="number" name="volPre3" placeholder="D3" value={data.volPre3} onChange={handleChange} className="laudo-input-small"/>
                  <span style={{fontWeight:'bold', color: '#1565C0'}}> = {data.resVolPre || 0} ml</span>
              </div>
              <div className="laudo-row">
                  <span>Vol. Pós (mm):</span>
                  <input type="number" name="volPos1" placeholder="D1" value={data.volPos1} onChange={handleChange} className="laudo-input-small"/> x
                  <input type="number" name="volPos2" placeholder="D2" value={data.volPos2} onChange={handleChange} className="laudo-input-small"/> x
                  <input type="number" name="volPos3" placeholder="D3" value={data.volPos3} onChange={handleChange} className="laudo-input-small"/>
                  <span style={{fontWeight:'bold', color: '#C62828'}}> = {data.resVolPos || 0} ml</span>
              </div>
          </div>
      )}
    </div>
  );
};

export default SecaoTecnicaBexiga;