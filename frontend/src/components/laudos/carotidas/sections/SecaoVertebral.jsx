import React from 'react';

const SecaoVertebral = ({ data, handleChange }) => {
  
  const RenderVertebral = ({ label, prefix }) => (
    <div style={{ flex: 1, border: '1px solid #ddd', padding: '5px', borderRadius: '4px' }}>
        <div style={{ background: '#C62828', color: 'white', padding: '2px 5px', fontSize: '11px', fontWeight: 'bold', marginBottom: '5px' }}>
            {label}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
            <label style={{ fontSize: '10px' }}>
                VPS (cm/s):
                <input type="number" name={`${prefix}Vps`} value={data[`${prefix}Vps`]} onChange={handleChange} style={{width: '100%', border: '1px solid #ccc'}} />
            </label>
            <label style={{ fontSize: '10px' }}>
                VDF (cm/s):
                <input type="number" name={`${prefix}Vdf`} value={data[`${prefix}Vdf`]} onChange={handleChange} style={{width: '100%', border: '1px solid #ccc'}} />
            </label>
        </div>
        <div style={{ marginTop: '5px' }}>
             <select name={`${prefix}Fluxo`} value={data[`${prefix}Fluxo`]} onChange={handleChange} style={{width: '100%', fontSize: '11px', marginBottom: '3px'}}>
                 <option value="anterógrado">Fluxo Anterógrado</option>
                 <option value="retrogrado">Fluxo Retrógrado (Roubo)</option>
             </select>
             <select name={`${prefix}Calibre`} value={data[`${prefix}Calibre`]} onChange={handleChange} style={{width: '100%', fontSize: '11px'}}>
                 <option value="normal">Calibre Normal</option>
                 <option value="reduzido">Hipoplásica</option>
                 <option value="aumentado">Aumentado</option>
             </select>
        </div>
    </div>
  );

  return (
    <div style={{ marginBottom: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
        <h4 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#555' }}>ARTÉRIAS VERTEBRAIS</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
            <RenderVertebral label="A. Vertebral Direita" prefix="vertDir" />
            <RenderVertebral label="A. Vertebral Esquerda" prefix="vertEsq" />
        </div>
    </div>
  );
};

export default SecaoVertebral;