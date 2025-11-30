import React from 'react';

const SecaoCarotidaInterna = ({ data, handleChange }) => {
  
  // Componente interno para renderizar UM lado (evita repetição de código dentro do arquivo)
  const RenderLado = ({ lado, label, prefix, color }) => (
    <div style={{ flex: 1, border: `1px solid ${color}`, borderRadius: '4px', padding: '5px', background: '#fff' }}>
        {/* Cabeçalho Vermelho Estilo Turing */}
        <div style={{ background: color, color: 'white', padding: '4px 8px', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', borderRadius: '2px' }}>
            {label}
        </div>

        {/* Velocidades */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', display: 'flex', flexDirection: 'column' }}>
                VPS (cm/s)
                <input 
                    type="number" 
                    name={`${prefix}Vps`} 
                    value={data[`${prefix}Vps`]} 
                    onChange={handleChange} 
                    style={{ width: '60px', padding: '2px' }} 
                />
            </label>
            <label style={{ fontSize: '11px', display: 'flex', flexDirection: 'column' }}>
                VDF (cm/s)
                <input 
                    type="number" 
                    name={`${prefix}Vdf`} 
                    value={data[`${prefix}Vdf`]} 
                    onChange={handleChange} 
                    style={{ width: '60px', padding: '2px' }} 
                />
            </label>
        </div>

        {/* Checkbox Tortuosidade */}
        <div style={{ marginBottom: '5px' }}>
            <label style={{ fontSize: '11px', cursor: 'pointer' }}>
                <input type="checkbox" name={`${prefix}Tortuosidade`} checked={data[`${prefix}Tortuosidade`]} onChange={handleChange} />
                {' '}Trajeto Tortuoso
            </label>
        </div>

        {/* Placas (Checkboxes) */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
            <label style={{ fontSize: '11px', cursor: 'pointer', color: '#2E7D32', fontWeight: 'bold' }}>
                <input type="checkbox" name={`${prefix}SemPlacas`} checked={data[`${prefix}SemPlacas`]} onChange={handleChange} />
                {' '}Sem Placas
            </label>
            <label style={{ fontSize: '11px', cursor: 'pointer' }}>
                <input type="checkbox" name={`${prefix}PlacasMinimas`} checked={data[`${prefix}PlacasMinimas`]} onChange={handleChange} />
                {' '}Placas Mínimas
            </label>
        </div>

        {/* Detalhes da Placa (Desabilitado se Sem Placas) */}
        <div style={{ padding: '5px', background: '#f5f5f5', borderRadius: '4px', opacity: data[`${prefix}SemPlacas`] ? 0.5 : 1, pointerEvents: data[`${prefix}SemPlacas`] ? 'none' : 'auto' }}>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                <input type="checkbox" checked={!data[`${prefix}SemPlacas`] && !data[`${prefix}PlacasMinimas`]} readOnly />
                <span style={{fontSize:'11px'}}>Placa:</span>
                <select name={`${prefix}PlacaTipo`} value={data[`${prefix}PlacaTipo`]} onChange={handleChange} style={{fontSize:'10px', width: '100%'}}>
                    <option value="calcificada">Calcificada</option>
                    <option value="mole">Mole (Hipoecogênica)</option>
                    <option value="mista">Mista</option>
                    <option value="ulcerada">Ulcerada</option>
                </select>
            </div>
            
            <div style={{ display: 'flex', gap: '5px' }}>
                <select name={`${prefix}PlacaLocal`} value={data[`${prefix}PlacaLocal`]} onChange={handleChange} style={{fontSize:'10px', flex:1}}>
                    <option value="parede_posterior">Parede Posterior</option>
                    <option value="parede_anterior">Parede Anterior</option>
                    <option value="lateral">Lateral</option>
                    <option value="medial">Medial</option>
                    <option value="circunferencial">Circunferencial</option>
                </select>
            </div>
        </div>

        {/* Botão Tabela Estenose (Visual apenas, lógica pode ser adicionada depois) */}
        <div style={{ marginTop: '10px', textAlign: 'right' }}>
            <button style={{ background: '#D32F2F', color: 'white', border: 'none', fontSize: '10px', padding: '4px 8px', borderRadius: '2px', cursor: 'pointer' }}>
                TABELA ESTENOSE
            </button>
        </div>
    </div>
  );

  return (
    <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#555', textTransform: 'uppercase' }}>Artéria Carótida Interna</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
            <RenderLado lado="DIREITO" label="A. Carótida Interna Direita" prefix="aciDir" color="#C62828" />
            <RenderLado lado="ESQUERDO" label="A. Carótida Interna Esquerda" prefix="aciEsq" color="#C62828" />
        </div>
    </div>
  );
};

export default SecaoCarotidaInterna;