import React from 'react';

const SecaoContextoCongenito = ({ data, handleChange }) => {
  return (
    <div className="laudo-section">
        <div className="header-base header-blue">Contexto do Exame</div>
        <div className="laudo-section-body">
            <div style={{ marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Tipo de exame</span>
                <select name="tipoExame" value={data.tipoExame} onChange={handleChange} className="laudo-select" style={{ width: '100%', fontSize: '12px' }}>
                    <option value="transtoracico">Transtorácico</option>
                    <option value="transtoracico_uti">Transtorácico à beira do leito (UTI)</option>
                    <option value="intraop_tee">Intraoperatório transesofágico</option>
                </select>
            </div>

            <div style={{ marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Momento</span>
                <div className="laudo-row" style={{ flexWrap: 'wrap', gap: '8px' }}>
                    {[['diagnostico', 'Diagnóstico'], ['pre_op', 'Pré-operatório'], ['pos_op', 'Pós-operatório'], ['intra_op', 'Intraoperatório']].map(([v, l]) => (
                        <label key={v} className="laudo-checkbox-label">
                            <input type="radio" name="momento" value={v} checked={data.momento === v} onChange={handleChange} /> {l}
                        </label>
                    ))}
                </div>
            </div>

            {data.momento === 'pos_op' && (
                <div className="laudo-row" style={{ gap: '10px', marginBottom: '6px' }}>
                    <div className="laudo-row">
                        <span style={{ fontSize: '11px' }}>Dia PO</span>
                        <input name="diaPO" type="number" value={data.diaPO} onChange={handleChange} className="laudo-input" style={{ width: '55px', marginLeft: '4px' }} />
                    </div>
                    <div className="laudo-row">
                        <span style={{ fontSize: '11px' }}>Data cirurgia</span>
                        <input name="dataCirurgia" type="text" value={data.dataCirurgia} onChange={handleChange} placeholder="dd/mm/aaaa" className="laudo-input" style={{ width: '100px', marginLeft: '4px' }} />
                    </div>
                </div>
            )}

            <div style={{ marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Diagnóstico de base</span>
                <input name="diagnosticoBase" type="text" value={data.diagnosticoBase} onChange={handleChange} className="laudo-input" style={{ width: '100%' }} placeholder="ex.: DSAVT balanceado + PCA" />
            </div>

            {/* BIOMETRIA / BSA */}
            <div className="laudo-row" style={{ gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <div className="laudo-row">
                    <span style={{ fontSize: '11px' }}>Peso</span>
                    <input name="peso" type="number" value={data.peso} onChange={handleChange} className="laudo-input" style={{ width: '55px', marginLeft: '4px' }} />
                    <span style={{ fontSize: '11px', marginLeft: '2px' }}>kg</span>
                </div>
                <div className="laudo-row">
                    <span style={{ fontSize: '11px' }}>Altura</span>
                    <input name="altura" type="number" value={data.altura} onChange={handleChange} className="laudo-input" style={{ width: '55px', marginLeft: '4px' }} />
                    <span style={{ fontSize: '11px', marginLeft: '2px' }}>cm</span>
                </div>
                <div className="laudo-row">
                    <span style={{ fontSize: '11px' }}>SC (BSA)</span>
                    <input value={data.sc} readOnly className="laudo-input" style={{ width: '55px', marginLeft: '4px', background: '#f0f0f0', fontWeight: 'bold' }} />
                    <span style={{ fontSize: '11px', marginLeft: '2px' }}>m²</span>
                </div>
            </div>

            <div>
                <span style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Condições do exame / observações</span>
                <textarea name="condicoesExame" value={data.condicoesExame} onChange={handleChange} className="laudo-input" rows={2} style={{ width: '100%', resize: 'vertical', fontSize: '11px' }} placeholder="ex.: sob sedação, em uso de milrinona; dificuldade técnica por curativos." />
            </div>
        </div>
    </div>
  );
};

export default SecaoContextoCongenito;
