import React from 'react';

const SecaoConclusaoCongenito = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-green">Conclusão e Comentários</div>
        <div className="laudo-section-body">
            <label style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Conclusão</label>
            <textarea name="conclusao" value={data.conclusao} onChange={handleChange} className="laudo-input" rows={4}
                style={{ width: '100%', resize: 'vertical', fontSize: '11px', fontWeight: 'bold' }} />
            <label style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', margin: '8px 0 2px' }}>Comentários</label>
            <textarea name="comentarios" value={data.comentarios} onChange={handleChange} className="laudo-input" rows={3}
                style={{ width: '100%', resize: 'vertical', fontSize: '11px' }} />
        </div>
    </div>
  );
};

export default SecaoConclusaoCongenito;
