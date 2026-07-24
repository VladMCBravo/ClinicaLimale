import React from 'react';
import { ECO_FETAL_DIAGNOSTICOS } from '../logic/ecoFetalDiagnosticos';

const CAMPOS = [
    { name: 'situs', label: 'Situs e posição' },
    { name: 'drenagemVenosa', label: 'Drenagem venosa' },
    { name: 'conexaoAV', label: 'Conexão atrioventricular' },
    { name: 'conexaoVA', label: 'Conexão ventriculoarterial' },
    { name: 'forameOval', label: 'Forame oval / septo interatrial' },
    { name: 'septoIV', label: 'Septo interventricular / CIV' },
    { name: 'valvas', label: 'Valvas' },
    { name: 'camaras', label: 'Câmaras cardíacas' },
    { name: 'tresVasos', label: 'Corte dos 3 vasos / grandes vasos' },
    { name: 'arcos', label: 'Arco aórtico e ductal' },
    { name: 'funcaoVentricular', label: 'Função ventricular' },
];

const LinhaSegmento = ({ label, name, value, onChange }) => (
    <div style={{marginBottom:'8px'}}>
        <label style={{fontSize:'10px', fontWeight:'bold', color:'#37474F', display:'block', marginBottom:'2px'}}>
            {label}
        </label>
        <textarea
            name={name} value={value || ''} onChange={onChange}
            className="laudo-input" rows={2}
            style={{width:'100%', resize:'vertical', fontSize:'11px', lineHeight:'1.3'}}
        />
    </div>
);

const SecaoSegmentarFetal = ({ data, handleChange }) => {
  const def = ECO_FETAL_DIAGNOSTICOS[data.diagnostico] || {};

  // Diagnósticos minimalistas (óbito) ou de descrição custom (união cardíaca)
  // não usam a análise segmentar campo a campo.
  if (def.ocultarSegmentar || def.descricaoCustom) {
    return (
      <div className="laudo-section">
          <div className="header-base header-blue">Descrição</div>
          <div className="laudo-section-body">
              <div style={{fontSize:'11px', color:'#666', fontStyle:'italic'}}>
                  Este diagnóstico usa uma descrição própria (sem análise segmentar campo a campo).
                  O texto será gerado a partir do preset; ajuste na conclusão/comentários abaixo se necessário.
              </div>
          </div>
      </div>
    );
  }

  return (
    <div className="laudo-section">
        <div className="header-base header-blue">Análise Segmentar (Descrição)</div>
        <div className="laudo-section-body">
            {CAMPOS.map((c) => (
                <LinhaSegmento
                    key={c.name} label={c.label} name={c.name}
                    value={data[c.name]} onChange={handleChange}
                />
            ))}
        </div>
    </div>
  );
};

export default SecaoSegmentarFetal;
