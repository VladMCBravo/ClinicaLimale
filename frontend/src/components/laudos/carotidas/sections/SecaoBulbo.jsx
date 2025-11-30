import React from 'react';

const SecaoBulbo = ({ data, handleChange }) => {

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
            <label style={{ fontSize: '11px', display: 'flex', flexDirection: 'column' }}>
                VDF (cm/s)
                <input type="number" name={`${prefix}Vdf`} value={data[`${prefix}Vdf`]} onChange={handleChange} style={{ width: '60px' }} />
            </label>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
            <label style={{ fontSize: '11px', cursor: 'pointer', color: '#2E7D32', fontWeight: 'bold' }}>
                <input type="checkbox" name={`${prefix}SemPlacas`} checked={data[`${prefix}SemPlacas`]} onChange={handleChange} /> Sem Placas
            </label>
            <label style={{ fontSize: '11px', cursor: 'pointer' }}>
                <input type="checkbox" name={`${prefix}PlacasMinimas`} checked={data[`${prefix}PlacasMinimas`]} onChange={handleChange} /> Placas Mín.
            </label>
        </div>
    </div>
  );

  return (
    <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#555', textTransform: 'uppercase' }}>Bulbo Carotídeo</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
            <RenderLado label="Bulbo Direito" prefix="bulbDir" color="#E64A19" />
            <RenderLado label="Bulbo Esquerdo" prefix="bulbEsq" color="#E64A19" />
        </div>
    </div>
  );
};

export default SecaoBulbo;