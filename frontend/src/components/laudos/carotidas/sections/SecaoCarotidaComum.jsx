import React from 'react';

const SecaoCarotidaComum = ({ data, handleChange }) => {

  const RenderLado = ({ label, prefix, color }) => (
    <div style={{ flex: 1, border: `1px solid ${color}`, borderRadius: '4px', padding: '5px', background: '#fff' }}>
        <div style={{ background: color, color: 'white', padding: '4px 8px', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', borderRadius: '2px' }}>
            {label}
        </div>

        {/* Velocidades */}
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

        {/* Espessura Médio-Intimal */}
        <div style={{ marginBottom: '8px', padding: '4px', background: '#e3f2fd', borderRadius: '4px' }}>
             <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#1565C0' }}>
                Espessura Médio-Intimal (mm):
                <input type="number" name={`${prefix}Espessura`} value={data[`${prefix}Espessura`]} onChange={handleChange} style={{ width: '100%', marginTop: '2px' }} />
            </label>
        </div>

        {/* Placas Checkboxes */}
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
        <h4 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#555', textTransform: 'uppercase' }}>Artéria Carótida Comum</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
            <RenderLado label="ACC Direita" prefix="accDir" color="#1976D2" />
            <RenderLado label="ACC Esquerda" prefix="accEsq" color="#1976D2" />
        </div>
    </div>
  );
};

export default SecaoCarotidaComum;