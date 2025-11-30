import React, { useMemo } from 'react';
import { FaLightbulb, FaChartArea } from 'react-icons/fa';

const styles = {
    wrapper: { display: 'flex', flexDirection: 'column', gap: '5px' },
    section: { border: '1px solid #ccc', borderRadius: '4px', background: '#fff', overflow: 'hidden' },
    header: { background: '#4A3B80', color: 'white', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' },
    body: { padding: '10px', fontSize: '11px', color: '#333' },
    
    // Grid de Índices
    indicesGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
    indiceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
    valueBlue: { color: '#1565C0', fontWeight: 'bold', marginLeft: '5px' },
    valueBlack: { color: '#000', fontWeight: 'bold', marginLeft: '5px' },
    
    // Gráficos
    graphRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
    thumb: { width: '25px', height: '20px', background: '#eee', border: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' },
    
    // Texto Lateral
    infoText: { fontSize: '10px', color: '#777', lineHeight: '1.4', paddingLeft: '10px', borderLeft: '1px solid #eee' }
};

const SecaoIndicesGraficos = ({ data, handleChange }) => {

  // Cálculos em Tempo Real para exibição (Display)
  const calculos = useMemo(() => {
      const dbp = parseFloat(data.dbp);
      const dof = parseFloat(data.dof);
      const cc = parseFloat(data.cc);
      const ca = parseFloat(data.ca);
      const fl = parseFloat(data.femur);
      
      const safeCalc = (val) => isFinite(val) && !isNaN(val) ? val.toFixed(2).replace('.', ',') : '';

      return {
          ic: (dbp && dof) ? safeCalc((dbp/dof)*100) : '',
          ccCa: (cc && ca) ? safeCalc(cc/ca) : '',
          cfCa: (fl && ca) ? safeCalc((fl/ca)*100) : '',
          cfDbp: (fl && dbp) ? safeCalc((fl/dbp)*100) : '',
          cfCc: (fl && cc) ? safeCalc((fl/cc)*100) : ''
      };
  }, [data.dbp, data.dof, data.cc, data.ca, data.femur]);

  return (
    <div style={styles.wrapper}>
        
        {/* --- 1. ÍNDICES --- */}
        <div style={styles.section}>
            <div style={styles.header}>Índices</div>
            <div style={styles.body}>
                <div style={{marginBottom: '10px'}}>
                    <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer', fontWeight:'bold'}}>
                        <input type="checkbox" name="citarValoresNormais" checked={data.citarValoresNormais} onChange={handleChange} />
                        citar no laudo os valores normais após cada índice
                    </label>
                </div>
                
                <div style={styles.indicesGrid}>
                    {/* Coluna Esquerda */}
                    <div>
                        <div style={styles.indiceRow}>
                            <label style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                <input type="checkbox" name="checkIndiceCefalico" checked={data.checkIndiceCefalico} onChange={handleChange} /> Índice cefálico
                            </label>
                            <span style={styles.valueBlue}>{calculos.ic}</span>
                        </div>
                        <div style={styles.indiceRow}>
                            <label style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                <input type="checkbox" name="checkRelacaoCcCa" checked={data.checkRelacaoCcCa} onChange={handleChange} /> Relação CC/CA
                            </label>
                            <span style={styles.valueBlack}>{calculos.ccCa}</span>
                        </div>
                        <div style={styles.indiceRow}>
                            <label style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                <input type="checkbox" name="checkRelacaoCfCa" checked={data.checkRelacaoCfCa} onChange={handleChange} /> Relação CF/CA
                            </label>
                            <span style={styles.valueBlue}>{calculos.cfCa}</span>
                        </div>
                    </div>

                    {/* Coluna Direita */}
                    <div>
                        <div style={styles.indiceRow}>
                            <label style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                <input type="checkbox" name="checkRelacaoCfDbp" checked={data.checkRelacaoCfDbp} onChange={handleChange} /> Relação CF/DBP
                            </label>
                            <span style={styles.valueBlue}>{calculos.cfDbp}</span>
                        </div>
                        <div style={styles.indiceRow}>
                            <label style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                <input type="checkbox" name="checkRelacaoCfCc" checked={data.checkRelacaoCfCc} onChange={handleChange} /> Relação CF/CC
                            </label>
                            <span style={styles.valueBlack}>{calculos.cfCc}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- 2. PESO FETAL --- */}
        <div style={styles.section}>
            <div style={styles.header}>
                Peso fetal <FaLightbulb color="#FFEB3B" style={{marginLeft: 'auto'}} />
            </div>
            <div style={styles.body}>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <input type="checkbox" name="checkPeso" checked={data.checkPeso} onChange={handleChange} />
                    <span style={{fontWeight:'bold'}}>Peso estimado em</span>
                    <input 
                        type="number" 
                        name="pesoEstimado" 
                        value={data.pesoEstimado} 
                        onChange={handleChange} 
                        style={{width: '60px', padding: '3px', border: '1px solid #ccc'}} 
                    />
                    <span style={{fontWeight:'bold'}}>g</span>
                </div>
            </div>
        </div>

        {/* --- 3. GRÁFICOS (CURVAS) --- */}
        <div style={styles.section}>
            <div style={styles.header}>Gráficos (curvas)</div>
            <div style={styles.body}>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr'}}>
                    
                    {/* Lista de Gráficos */}
                    <div>
                        <GraphItem label="Peso" name="checkGraficoPeso" checked={data.checkGraficoPeso} onChange={handleChange} />
                        <GraphItem label="DBP" name="checkGraficoDbp" checked={data.checkGraficoDbp} onChange={handleChange} />
                        <GraphItem label="Fêmur" name="checkGraficoFemur" checked={data.checkGraficoFemur} onChange={handleChange} />
                        <GraphItem label="Úmero" name="checkGraficoUmero" checked={data.checkGraficoUmero} onChange={handleChange} />
                        <GraphItem label="CA" name="checkGraficoCa" checked={data.checkGraficoCa} onChange={handleChange} />
                        <GraphItem label="CC" name="checkGraficoCc" checked={data.checkGraficoCc} onChange={handleChange} />
                    </div>

                    {/* Texto Informativo à Direita */}
                    <div style={styles.infoText}>
                        <p style={{marginBottom: '8px'}}>É possível inserir até 6 gráficos no laudo simultaneamente.</p>
                        <p style={{marginBottom: '8px'}}>Para escolher quais gráficos devem estar assinalados por padrão ao iniciar um novo laudo, acesse a janela de configurações do US Obstétrico.</p>
                        <p>Para escolher se os gráficos devem ser impressos com fundo branco ou colorido, acesse a janela de configurações.</p>
                    </div>
                </div>
            </div>
        </div>

    </div>
  );
};

// Componente visual para linha do gráfico com ícone
const GraphItem = ({ label, name, checked, onChange }) => (
    <div style={styles.graphRow}>
        <div style={{width:'50px', textAlign:'right', fontWeight:'bold', fontSize:'11px'}}>{label}</div>
        <div style={styles.thumb}><FaChartArea color="#999" size={12}/></div>
        <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer'}}>
            <input type="checkbox" name={name} checked={checked} onChange={onChange} />
            inserir curva no laudo
        </label>
    </div>
);

export default SecaoIndicesGraficos;