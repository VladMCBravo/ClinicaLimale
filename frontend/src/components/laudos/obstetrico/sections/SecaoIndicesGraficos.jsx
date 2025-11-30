import React from 'react';
import { FaLightbulb, FaChartArea } from 'react-icons/fa';

const GraphItem = ({ label, name, checked, onChange }) => (
    <div className="laudo-row" style={{marginBottom: '8px'}}>
        <div style={{width:'50px', textAlign:'right', fontWeight:'bold', fontSize:'11px'}}>{label}</div>
        <div style={{width:'25px', height:'20px', background:'#eee', border:'1px solid #ccc', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'2px'}}>
            <FaChartArea color="#999" size={12}/>
        </div>
        <label className="laudo-checkbox-label">
            <input type="checkbox" name={name} checked={checked} onChange={onChange} />
            inserir curva no laudo
        </label>
    </div>
);

const SecaoIndicesGraficos = ({ data, handleChange }) => {
  // REMOVIDO useMemo. Agora usamos data.res... calculados no Pai.

  return (
    <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
        {/* ÍNDICES */}
        <div className="laudo-section">
            <div className="header-base header-purple">Índices</div>
            <div className="laudo-section-body">
                <div style={{marginBottom: '10px'}}>
                    <label className="laudo-checkbox-label" style={{fontWeight:'bold'}}>
                        <input type="checkbox" name="citarValoresNormais" checked={data.citarValoresNormais} onChange={handleChange} />
                        citar no laudo os valores normais após cada índice
                    </label>
                </div>
                <div className="laudo-grid-2">
                    <div className="laudo-col">
                        <div className="laudo-row" style={{justifyContent:'space-between'}}>
                            <label className="laudo-checkbox-label"><input type="checkbox" name="checkIndiceCefalico" checked={data.checkIndiceCefalico} onChange={handleChange} /> Índice cefálico</label>
                            <span style={{color:'#1565C0', fontWeight:'bold'}}>{data.resIc}</span>
                        </div>
                        <div className="laudo-row" style={{justifyContent:'space-between'}}>
                            <label className="laudo-checkbox-label"><input type="checkbox" name="checkRelacaoCcCa" checked={data.checkRelacaoCcCa} onChange={handleChange} /> Relação CC/CA</label>
                            <span style={{color:'#000', fontWeight:'bold'}}>{data.resCcCa}</span>
                        </div>
                        <div className="laudo-row" style={{justifyContent:'space-between'}}>
                            <label className="laudo-checkbox-label"><input type="checkbox" name="checkRelacaoCfCa" checked={data.checkRelacaoCfCa} onChange={handleChange} /> Relação CF/CA</label>
                            <span style={{color:'#1565C0', fontWeight:'bold'}}>{data.resCfCa}</span>
                        </div>
                    </div>
                    <div className="laudo-col">
                        <div className="laudo-row" style={{justifyContent:'space-between'}}>
                            <label className="laudo-checkbox-label"><input type="checkbox" name="checkRelacaoCfDbp" checked={data.checkRelacaoCfDbp} onChange={handleChange} /> Relação CF/DBP</label>
                            <span style={{color:'#1565C0', fontWeight:'bold'}}>{data.resCfDbp}</span>
                        </div>
                        <div className="laudo-row" style={{justifyContent:'space-between'}}>
                            <label className="laudo-checkbox-label"><input type="checkbox" name="checkRelacaoCfCc" checked={data.checkRelacaoCfCc} onChange={handleChange} /> Relação CF/CC</label>
                            <span style={{color:'#000', fontWeight:'bold'}}>{data.resCfCc}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* PESO */}
        <div className="laudo-section">
            <div className="header-base header-purple" style={{justifyContent:'space-between'}}>
                Peso fetal <FaLightbulb color="#FFEB3B" />
            </div>
            <div className="laudo-section-body">
                <div className="laudo-row">
                    <input type="checkbox" name="checkPeso" checked={data.checkPeso} onChange={handleChange} />
                    <span style={{fontWeight:'bold'}}>Peso estimado em</span>
                    <input type="number" name="pesoEstimado" value={data.pesoEstimado} onChange={handleChange} className="laudo-input" style={{width: '60px'}} />
                    <span style={{fontWeight:'bold'}}>g</span>
                </div>
            </div>
        </div>

        {/* GRÁFICOS */}
        <div className="laudo-section">
            <div className="header-base header-purple">Gráficos (curvas)</div>
            <div className="laudo-section-body">
                <div className="laudo-grid-2">
                    <div>
                        <GraphItem label="Peso" name="checkGraficoPeso" checked={data.checkGraficoPeso} onChange={handleChange} />
                        <GraphItem label="DBP" name="checkGraficoDbp" checked={data.checkGraficoDbp} onChange={handleChange} />
                        <GraphItem label="Fêmur" name="checkGraficoFemur" checked={data.checkGraficoFemur} onChange={handleChange} />
                        <GraphItem label="Úmero" name="checkGraficoUmero" checked={data.checkGraficoUmero} onChange={handleChange} />
                        <GraphItem label="CA" name="checkGraficoCa" checked={data.checkGraficoCa} onChange={handleChange} />
                        <GraphItem label="CC" name="checkGraficoCc" checked={data.checkGraficoCc} onChange={handleChange} />
                    </div>
                    <div style={{fontSize: '10px', color: '#777', lineHeight: '1.4', paddingLeft: '10px', borderLeft: '1px solid #eee'}}>
                        <p style={{marginBottom: '8px'}}>É possível inserir até 6 gráficos no laudo simultaneamente.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SecaoIndicesGraficos;