import React, { useState } from 'react';
import { PADROES, getPadrao, calcularCrescimento, medianaEsperada } from '../../../utils/growth/growthFacade';

/**
 * Calculadora de percentil/escore-Z de crescimento — componente COMPARTILHADO
 * (OMS / INTERGROWTH fetal / INTERGROWTH prematuro). Autossuficiente.
 *
 * Props:
 *  - padraoInicial: id do padrão pré-selecionado (default 'ig_fetal')
 *  - idadeFixa: se informado, trava o campo de idade (ex.: IG já preenchida no laudo)
 *  - onInserir(texto): se fornecido, exibe botão "Inserir no laudo"
 */
const CalculadoraCrescimento = ({ padraoInicial = 'ig_fetal', idadeFixa = null, onInserir = null }) => {
    const [padraoId, setPadraoId] = useState(padraoInicial);
    const padrao = getPadrao(padraoId);
    const [sexo, setSexo] = useState('M');
    const [idade, setIdade] = useState(idadeFixa != null ? String(idadeFixa) : '');
    const [medida, setMedida] = useState(padrao.medidas[0].id);
    const [valor, setValor] = useState('');

    const trocarPadrao = (id) => {
        setPadraoId(id);
        const p = getPadrao(id);
        setMedida(p.medidas[0].id);
    };

    const medidaMeta = padrao.medidas.find((m) => m.id === medida) || padrao.medidas[0];
    const idadeUsada = idadeFixa != null ? idadeFixa : idade;

    let resultado = null;
    if (idadeUsada !== '' && valor !== '') {
        resultado = calcularCrescimento(padraoId, { sexo, idade: idadeUsada, medida, valor });
    }
    const mediana = (idadeUsada !== '')
        ? medianaEsperada(padraoId, { idade: idadeUsada, medida, sexo })
        : null;

    const fmtZ = (z) => (z >= 0 ? '+' : '') + z.toFixed(2).replace('.', ',');
    const corPercentil = (p) => (p < 3 || p > 97) ? '#C62828' : (p < 10 || p > 90) ? '#EF6C00' : '#2E7D32';

    const textoParaLaudo = () => {
        if (!resultado) return '';
        const p = padrao.medidas.find((m) => m.id === medida);
        return `${p.label}: ${valor} ${medidaMeta.unidade} (percentil ${resultado.percentil}, Escore-Z ${fmtZ(resultado.z)})`;
    };

    return (
        <div className="laudo-section">
            <div className="header-base header-blue">Calculadora de Percentil / Escore-Z</div>
            <div className="laudo-section-body">
                <div style={{ marginBottom: '6px' }}>
                    <select value={padraoId} onChange={(e) => trocarPadrao(e.target.value)}
                        className="laudo-select" style={{ width: '100%', fontSize: '12px' }}>
                        {PADROES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                </div>

                <div className="laudo-row" style={{ gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {padrao.needsSex && (
                        <div className="laudo-row">
                            <span style={{ fontSize: '11px' }}>Sexo</span>
                            <label className="laudo-checkbox-label" style={{ marginLeft: '4px' }}>
                                <input type="radio" name="calcSexo" checked={sexo === 'M'} onChange={() => setSexo('M')} /> M
                            </label>
                            <label className="laudo-checkbox-label">
                                <input type="radio" name="calcSexo" checked={sexo === 'F'} onChange={() => setSexo('F')} /> F
                            </label>
                        </div>
                    )}
                    <div className="laudo-row">
                        <span style={{ fontSize: '11px' }}>{padrao.ageLabel}</span>
                        <input type="number" value={idadeUsada} disabled={idadeFixa != null}
                            onChange={(e) => setIdade(e.target.value)}
                            className="laudo-input" style={{ width: '70px', marginLeft: '4px' }} />
                    </div>
                </div>

                <div className="laudo-row" style={{ gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <select value={medida} onChange={(e) => setMedida(e.target.value)}
                        className="laudo-select" style={{ flex: 1, minWidth: '160px', fontSize: '12px' }}>
                        {padrao.medidas.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                    <div className="laudo-row">
                        <input type="number" value={valor} onChange={(e) => setValor(e.target.value)}
                            placeholder="valor" className="laudo-input" style={{ width: '80px', textAlign: 'right' }} />
                        <span style={{ fontSize: '11px', marginLeft: '4px' }}>{medidaMeta.unidade}</span>
                    </div>
                </div>

                {/* RESULTADO */}
                <div style={{ background: '#E3F2FD', padding: '8px', borderRadius: '4px', border: '1px solid #BBDEFB' }}>
                    {resultado ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '9px', color: '#555' }}>PERCENTIL</div>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: corPercentil(resultado.percentil) }}>
                                        {resultado.percentil}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '9px', color: '#555' }}>ESCORE-Z</div>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1565C0' }}>
                                        {fmtZ(resultado.z)}
                                    </div>
                                </div>
                                {mediana != null && (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '9px', color: '#555' }}>MEDIANA (p50)</div>
                                        <div style={{ fontSize: '14px', color: '#333' }}>{mediana} {medidaMeta.unidade}</div>
                                    </div>
                                )}
                            </div>
                            {onInserir && (
                                <button type="button" onClick={() => onInserir(textoParaLaudo())}
                                    style={{ marginTop: '8px', width: '100%', padding: '5px', fontSize: '11px', cursor: 'pointer', background: '#1565C0', color: '#fff', border: 'none', borderRadius: '3px' }}>
                                    Inserir no laudo
                                </button>
                            )}
                        </>
                    ) : (
                        <div style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>
                            Preencha idade e valor para calcular. Fora da faixa etária válida do padrão, o cálculo não é exibido.
                        </div>
                    )}
                </div>
                <div style={{ fontSize: '9px', color: '#999', marginTop: '4px', fontStyle: 'italic' }}>
                    {resultado ? resultado.source : 'Padrões: OMS 2006 e INTERGROWTH-21st.'}
                </div>
            </div>
        </div>
    );
};

export default CalculadoraCrescimento;
