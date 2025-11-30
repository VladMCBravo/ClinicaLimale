import React from 'react';

const SecaoCarotidaExterna = ({ data, handleChange }) => {

  const RenderLado = ({ label, prefix, color }) => (
    <div style={{ flex: 1, border: `1px solid ${color}`, borderRadius: '4px', padding: '5px', background: '#fff' }}>
        <div style={{ background: color, color: 'white', padding: '4px 8px', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', borderRadius: '2px' }}>
            {label}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', display: 'flex', flexDirection: 'column' }}>
                VPS (cm/s)
                <input type="number" name={`${prefix}Vps`} value={data[`${prefix}Vps`]} onChange={handleChange} style={{ width: '60px' }} />
            </label>
             {/* ACE raramente mede VDF em rotina básica, mas mantive para padronização */}
            <label style={{ fontSize: '11px', display: 'flex', flexDirection: 'column' }}>
                VDF (cm/s)
                <input type="number" name={`${prefix}Vdf`} value={data[`${prefix}Vdf`]} onChange={handleChange} style={{ width: '60px' }} />
            </label>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
            <label style={{ fontSize: '11px', cursor: 'pointer', color: '#2E7D32', fontWeight: 'bold' }}>
                <input type="checkbox" name={`${prefix}SemPlacas`} checked={data[`${prefix}SemPlacas`]} onChange={handleChange} /> Sem Placas
            </label>
        </div>
    </div>
  );

  return (
    <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#555', textTransform: 'uppercase' }}>Artéria Carótida Externa</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
            <RenderLado label="ACE Direita" prefix="aceDir" color="#7B1FA2" />
            <RenderLado label="ACE Esquerda" prefix="aceEsq" color="#7B1FA2" />
        </div>
    </div>
  );
};

export default SecaoCarotidaExterna;