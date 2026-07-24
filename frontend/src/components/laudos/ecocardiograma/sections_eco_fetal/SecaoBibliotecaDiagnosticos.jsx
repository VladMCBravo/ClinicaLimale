import React from 'react';
import { listarDiagnosticosPorGrupo } from '../logic/ecoFetalDiagnosticos';

const DropdownDiagnosticos = ({ value, onChange, style }) => {
  const grupos = listarDiagnosticosPorGrupo();
  return (
    <select value={value} onChange={onChange} className="laudo-select" style={style}>
        {Object.entries(grupos).map(([grupo, itens]) => (
            <optgroup key={grupo} label={grupo}>
                {itens.map((it) => (
                    <option key={it.key} value={it.key}>{it.label}</option>
                ))}
            </optgroup>
        ))}
    </select>
  );
};

const SecaoBibliotecaDiagnosticos = ({ data, handleChange, selecionarDiagnostico }) => {
  const gemelar = Number(data.qtdFetos) > 1;

  return (
    <div className="laudo-section">
        <div className="header-base header-blue">Biblioteca de Diagnósticos</div>
        <div className="laudo-section-body">
            <div style={{fontSize:'11px', marginBottom:'5px'}}>
                Selecione o diagnóstico para pré-preencher a descrição, conclusão e comentários.
                Todo o texto continua editável nos campos abaixo.
            </div>
            <DropdownDiagnosticos
                value={data.diagnostico}
                onChange={(e) => selecionarDiagnostico(e.target.value)}
                style={{width:'100%', fontWeight:'bold', border:'1px solid #1565C0', color:'#1565C0', padding:'6px'}}
            />

            {/* GEMELAR */}
            <div style={{marginTop:'10px', paddingTop:'8px', borderTop:'1px dashed #ddd'}}>
                <span style={{fontSize:'11px', fontWeight:'bold', marginRight:'8px'}}>Nº de fetos:</span>
                <label className="laudo-checkbox-label" style={{marginRight:'12px'}}>
                    <input type="radio" name="qtdFetos" value={1}
                        checked={Number(data.qtdFetos) === 1} onChange={handleChange} /> 1 (único)
                </label>
                <label className="laudo-checkbox-label">
                    <input type="radio" name="qtdFetos" value={2}
                        checked={Number(data.qtdFetos) === 2} onChange={handleChange} /> 2 (gemelar)
                </label>
            </div>

            {gemelar && (
                <div style={{marginTop:'8px', background:'#F9F9F9', padding:'8px', border:'1px solid #eee'}}>
                    <span style={{fontSize:'11px', fontWeight:'bold', display:'block', marginBottom:'4px'}}>
                        Feto II — diagnóstico
                    </span>
                    <DropdownDiagnosticos
                        value={data.feto2Diagnostico}
                        onChange={(e) => handleChange({ target: { name: 'feto2Diagnostico', value: e.target.value } })}
                        style={{width:'100%', padding:'4px'}}
                    />
                    <span style={{fontSize:'11px', fontWeight:'bold', display:'block', margin:'8px 0 4px'}}>
                        Feto II — comentários adicionais
                    </span>
                    <textarea
                        name="feto2Comentarios" value={data.feto2Comentarios} onChange={handleChange}
                        className="laudo-input" rows={2} style={{width:'100%', resize:'vertical'}}
                    />
                </div>
            )}
        </div>
    </div>
  );
};

export default SecaoBibliotecaDiagnosticos;
