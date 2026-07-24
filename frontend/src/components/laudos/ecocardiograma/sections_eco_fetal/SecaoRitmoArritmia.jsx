import React from 'react';
import { ECO_FETAL_DIAGNOSTICOS } from '../logic/ecoFetalDiagnosticos';

const OPCOES = [
    { valor: 'regular', label: 'Regular' },
    { valor: 'extrassistoles_atriais', label: 'Extrassístoles atriais' },
    { valor: 'extrassistoles_trigeminadas', label: 'Extrassístoles trigeminadas' },
    { valor: 'bloqueio_parcial', label: 'Bloqueio parcial' },
    { valor: 'bavt', label: 'BAVT (bloqueio total)' },
    { valor: 'outro', label: 'Outro (texto livre)' },
];

const SecaoRitmoArritmia = ({ data, handleChange }) => {
  const def = ECO_FETAL_DIAGNOSTICOS[data.diagnostico] || {};
  if (def.ocultarSegmentar) return null;

  return (
    <div className="laudo-section">
        <div className="header-base header-blue">Ritmo</div>
        <div className="laudo-section-body">
            <div className="laudo-row" style={{flexWrap:'wrap', gap:'10px'}}>
                {OPCOES.map((o) => (
                    <label key={o.valor} className="laudo-checkbox-label">
                        <input type="radio" name="ritmo" value={o.valor}
                            checked={data.ritmo === o.valor} onChange={handleChange} /> {o.label}
                    </label>
                ))}
            </div>
            {data.ritmo === 'outro' && (
                <textarea
                    name="ritmoTextoLivre" value={data.ritmoTextoLivre} onChange={handleChange}
                    className="laudo-input" rows={2}
                    placeholder="Descreva o ritmo/arritmia."
                    style={{width:'100%', marginTop:'6px', resize:'vertical'}}
                />
            )}
        </div>
    </div>
  );
};

export default SecaoRitmoArritmia;
