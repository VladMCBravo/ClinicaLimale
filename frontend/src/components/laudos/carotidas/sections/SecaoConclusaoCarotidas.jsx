import React from 'react';

const SecaoConclusaoCarotidas = ({ data, handleChange }) => {
  return (
    <div style={{ marginTop: '20px', borderTop: '2px solid #333', paddingTop: '10px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#333' }}>CONCLUSÃO E OBSERVAÇÕES</h4>
        
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
            <input 
                type="checkbox" 
                name="conclusaoNormal" 
                checked={data.conclusaoNormal} 
                onChange={handleChange} 
            /> 
            {' '}Inserir Conclusão Padrão (Sem estenoses significativas)
        </label>

        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold' }}>Observações Adicionais:</label>
        <textarea 
            name="obsGerais" 
            value={data.obsGerais} 
            onChange={handleChange} 
            rows="3"
            style={{ width: '100%', fontSize: '12px', padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }} 
        />
    </div>
  );
};

export default SecaoConclusaoCarotidas;