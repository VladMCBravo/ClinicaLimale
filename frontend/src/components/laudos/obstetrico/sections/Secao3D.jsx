import React from 'react';

const Secao3D = ({ data, handleChange }) => {
  return (
    <div className="laudo-section" style={{ borderLeft: '4px solid #FBC02D' }}>
        <div className="header-base" style={{ background: '#FFF9C4', color: '#F57F17' }}>
            <label className="laudo-checkbox-label" style={{ width: '100%', fontWeight: 'bold' }}>
                <input 
                    type="checkbox" 
                    name="usar3D" 
                    checked={data.usar3D} 
                    onChange={handleChange} 
                />
                Incluir Descrição 3D / 4D
            </label>
        </div>

        {data.usar3D && (
            <div className="laudo-section-body">
                <div className="laudo-row">
                    <span style={{ fontWeight: 'bold' }}>Qualidade da imagem:</span>
                    <select name="qualidade3D" value={data.qualidade3D} onChange={handleChange} className="laudo-select">
                        <option value="ótima">Ótima</option>
                        <option value="boa">Boa</option>
                        <option value="regular">Regular</option>
                        <option value="prejudicada">Prejudicada (fatores maternos/fetais)</option>
                    </select>
                </div>

                <div className="laudo-row" style={{ marginTop: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>Face Fetal:</span>
                    <select name="face3D" value={data.face3D} onChange={handleChange} className="laudo-select">
                        <option value="visualizada">Visualizada com nitidez</option>
                        <option value="parcial">Visualizada parcialmente</option>
                        <option value="encoberta">Encoberta (placenta/membros)</option>
                    </select>
                </div>

                <div className="laudo-row" style={{ marginTop: '10px', gap: '20px' }}>
                    <label className="laudo-checkbox-label">
                        <input type="checkbox" name="mao3D" checked={data.mao3D} onChange={handleChange} />
                        Mãos identificadas
                    </label>
                    <label className="laudo-checkbox-label">
                        <input type="checkbox" name="pe3D" checked={data.pe3D} onChange={handleChange} />
                        Pés identificados
                    </label>
                </div>

                <div style={{ marginTop: '10px' }}>
                    <span style={{ fontSize: '12px' }}>Observações (ex: bocejo, mímica facial):</span>
                    <textarea 
                        name="obs3D" 
                        value={data.obs3D} 
                        onChange={handleChange} 
                        className="laudo-textarea" 
                        rows="2"
                        placeholder="Ex: Notada mímica facial preservada..."
                    />
                </div>
            </div>
        )}
    </div>
  );
};

export default Secao3D;