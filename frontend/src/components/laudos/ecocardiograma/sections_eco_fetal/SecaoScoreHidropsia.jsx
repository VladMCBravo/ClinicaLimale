import React from 'react';
import { HUHTA_CATEGORIAS, calcularScoreHuhta } from '../logic/ecoFetalCalculations';

const SecaoScoreHidropsia = ({ data, handleChange }) => {
  const { total } = calcularScoreHuhta(data);

  return (
    <div className="laudo-section">
        <div className="header-base header-blue">Score de Hidropsia (Huhta)</div>
        <div className="laudo-section-body">
            <label className="laudo-checkbox-label" style={{fontWeight:'bold', marginBottom:'6px', display:'block'}}>
                <input type="checkbox" name="incluirHuhta" checked={!!data.incluirHuhta} onChange={handleChange} />
                {' '}Incluir o escore no laudo
            </label>

            {data.incluirHuhta && (
                <>
                    {HUHTA_CATEGORIAS.map((cat) => (
                        <div key={cat.key} style={{marginBottom:'8px'}}>
                            <label style={{fontSize:'10px', fontWeight:'bold', display:'block', marginBottom:'2px'}}>
                                {cat.label}
                            </label>
                            <select
                                name={cat.key} value={data[cat.key]} onChange={handleChange}
                                className="laudo-select" style={{width:'100%', fontSize:'11px'}}
                            >
                                {cat.opcoes.map((o) => (
                                    <option key={o.valor} value={o.valor}>
                                        {o.texto} ({o.valor} pts)
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}
                    <div style={{
                        background:'#E3F2FD', padding:'8px', borderRadius:'3px',
                        border:'1px solid #BBDEFB', textAlign:'center', fontWeight:'bold', color:'#1565C0'
                    }}>
                        Total: {total}/10
                    </div>
                </>
            )}
        </div>
    </div>
  );
};

export default SecaoScoreHidropsia;
