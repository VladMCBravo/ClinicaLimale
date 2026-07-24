import React from 'react';
import { listarDiagnosticosCongenitoPorGrupo } from '../logic/ecoCongenitoDiagnosticos';

const CAMPOS = [
    { name: 'situs', label: 'Situs e posição' },
    { name: 'conexoesVenosasSistemicas', label: 'Conexões venosas sistêmicas / VCI' },
    { name: 'conexoesVenosasPulmonares', label: 'Conexões venosas pulmonares' },
    { name: 'conexaoAV', label: 'Conexão atrioventricular' },
    { name: 'conexaoVA', label: 'Conexão ventrículo-arterial / via de saída' },
    { name: 'septoInteratrial', label: 'Septo interatrial / CIA / forame oval' },
    { name: 'septoInterventricular', label: 'Septo interventricular / CIV' },
    { name: 'valvasAV', label: 'Valvas atrioventriculares' },
    { name: 'atrios', label: 'Átrios' },
    { name: 'ventriculoDireito', label: 'Ventrículo direito (função/TAPSE/FAC/strain)' },
    { name: 'ventriculoEsquerdo', label: 'Ventrículo esquerdo (função)' },
    { name: 'valvasSemilunares', label: 'Valvas semilunares (aórtica/pulmonar/truncal)' },
    { name: 'arteriasPulmonares', label: 'Artérias pulmonares (com Escore-Z)' },
    { name: 'arcoAortico', label: 'Arco aórtico / istmo (com Escore-Z)' },
    { name: 'canalArterial', label: 'Canal arterial' },
    { name: 'coronarias', label: 'Coronárias' },
    { name: 'pericardio', label: 'Pericárdio' },
    { name: 'achadosCirurgicos', label: 'Achados cirúrgicos / próteses (Glenn, Fontan, Sano, patch...)' },
];

const LinhaSegmento = ({ label, name, value, onChange }) => (
    <div style={{ marginBottom: '8px' }}>
        <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#37474F', display: 'block', marginBottom: '2px' }}>{label}</label>
        <textarea name={name} value={value || ''} onChange={onChange} className="laudo-input" rows={2}
            style={{ width: '100%', resize: 'vertical', fontSize: '11px', lineHeight: '1.3' }} />
    </div>
);

const SecaoSegmentarCongenito = ({ data, handleChange, selecionarDiagnostico }) => {
  const grupos = listarDiagnosticosCongenitoPorGrupo();
  return (
    <div className="laudo-section">
        <div className="header-base header-blue">Análise Segmentar (Descrição)</div>
        <div className="laudo-section-body">
            <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>Biblioteca de diagnósticos (pré-preenche a descrição)</span>
                <select value={data.diagnostico} onChange={(e) => selecionarDiagnostico(e.target.value)}
                    className="laudo-select" style={{ width: '100%', fontWeight: 'bold', border: '1px solid #1565C0', color: '#1565C0', padding: '5px' }}>
                    {Object.entries(grupos).map(([grupo, itens]) => (
                        <optgroup key={grupo} label={grupo}>
                            {itens.map((it) => <option key={it.key} value={it.key}>{it.label}</option>)}
                        </optgroup>
                    ))}
                </select>
            </div>
            {CAMPOS.map((c) => (
                <LinhaSegmento key={c.name} label={c.label} name={c.name} value={data[c.name]} onChange={handleChange} />
            ))}
        </div>
    </div>
  );
};

export default SecaoSegmentarCongenito;
