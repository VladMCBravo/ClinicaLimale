// src/components/laudos/FormEcocardiograma.jsx
import React, { useState, useEffect } from 'react';
import { FaHeartbeat, FaRulerCombined, FaCalculator, FaExpand } from 'react-icons/fa';

// Estilos densos (Desktop-like)
const styles = {
  section: { border: '1px solid #999', borderRadius: '4px', marginBottom: '8px', background: '#F9F9F9', overflow: 'hidden' },
  header: { background: '#2E7D32', color: 'white', padding: '4px 8px', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
  body: { padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'nowrap' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' },
  grid4: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' },
  label: { fontWeight: 'bold', fontSize: '11px', marginBottom: '2px', whiteSpace: 'nowrap', color: '#333' },
  input: { padding: '2px 5px', border: '1px solid #AAA', borderRadius: '2px', fontSize: '11px', height: '22px', width: '100%' },
  readOnly: { background: '#E0E0E0', fontWeight: 'bold', color: '#000' },
  groupTitle: { fontSize: '11px', fontWeight: 'bold', color: '#2E7D32', borderBottom: '1px solid #ccc', marginBottom: '5px', marginTop: '5px' },
  radioGroup: { display: 'flex', gap: '10px', fontSize: '11px' }
};

const FormEcocardiograma = ({ onUpdate }) => {
  const [sections, setSections] = useState({ medidas: true, valvas: true, conclusao: true });
  const toggle = (s) => setSections(p => ({ ...p, [s]: !p[s] }));

  const [data, setData] = useState({
    tipoExame: 'ECO_TRANSTORACICO_DOPPLER', // ou 'ECO_TRANSTORACICO'
    
    // DADOS BIOMÉTRICOS
    peso: '', altura: '', sc: '', // Superfície Corpórea
    ritmo: 'Sinusal', fc: '',

    // MEDIDAS (Modo M / 2D)
    aorta: '', ae: '', 
    ddve: '', dsve: '', // Diâmetros Diastólico e Sistólico do VE
    siv: '', ppve: '',  // Septo e Parede Posterior
    ddvd: '', // Diâmetro do VD

    // CÁLCULOS (Automáticos)
    feTeich: '', // Fração Ejeção
    encurtamento: '', // Delta D%
    massaVE: '', imVE: '', // Índice de Massa
    relAeAo: '', // Relação AE/Aorta

    // FUNÇÃO SISTÓLICA / DIASTÓLICA
    funcaoVE: 'Preservada',
    contratilidade: 'Normal', // ou 'Hipocinesia difusa', etc.
    funcaoDiastolica: 'Normal', // ou 'Disfunção Grau 1'

    // VALVAS (Checkboxes simplificados para o exemplo, pode expandir)
    mitral: 'Normal', mitralRefluxo: 'Ausente',
    aortica: 'Normal', aorticaRefluxo: 'Ausente',
    tricuspide: 'Normal', tricuspideRefluxo: 'Ausente', psap: '', // Pressão Sistólica Artéria Pulmonar
    pulmonar: 'Normal', pulmonarRefluxo: 'Ausente',

    // PERICÁRDIO / AORTA
    pericardio: 'Normal',
    aortaAsc: '', arcoAortico: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // --- O CÉREBRO MATEMÁTICO ---
  useEffect(() => {
    let updates = {};

    // 1. Superfície Corpórea (Du Bois): 0.007184 * peso^0.425 * altura^0.725
    if (data.peso && data.altura) {
        const p = parseFloat(data.peso);
        const a = parseFloat(data.altura); // em cm
        const sc = 0.007184 * Math.pow(p, 0.425) * Math.pow(a, 0.725);
        updates.sc = sc.toFixed(2);
    }

    // 2. Fração de Ejeção (Teichholz): ((DDVE³ - DSVE³) / DDVE³) * 100
    //    Encurtamento: ((DDVE - DSVE) / DDVE) * 100
    if (data.ddve && data.dsve) {
        const d = parseFloat(data.ddve); // mm
        const s = parseFloat(data.dsve); // mm
        if (d > s && d > 0) {
            const fe = ((Math.pow(d, 3) - Math.pow(s, 3)) / Math.pow(d, 3)) * 100;
            const enc = ((d - s) / d) * 100;
            updates.feTeich = fe.toFixed(0);
            updates.encurtamento = enc.toFixed(0);
        }
    }

    // 3. Massa do VE (ASE): 0.8 * (1.04 * ((DDVE + SIV + PPVE)³ - DDVE³) + 0.6
    if (data.ddve && data.siv && data.ppve) {
        const d = parseFloat(data.ddve) / 10; // converter para cm
        const siv = parseFloat(data.siv) / 10;
        const pp = parseFloat(data.ppve) / 10;
        const massa = 0.8 * (1.04 * (Math.pow(d + siv + pp, 3) - Math.pow(d, 3))) + 0.6;
        updates.massaVE = massa.toFixed(0);
        
        // Índice de Massa (Massa / SC)
        if (updates.sc || data.sc) {
            const scVal = parseFloat(updates.sc || data.sc);
            if(scVal > 0) updates.imVE = (massa / scVal).toFixed(0);
        }
    }

    // 4. Relação AE/Aorta
    if (data.ae && data.aorta) {
        const ae = parseFloat(data.ae);
        const ao = parseFloat(data.aorta);
        if(ao > 0) updates.relAeAo = (ae / ao).toFixed(2);
    }

    // Atualiza estado apenas se houve mudança nos cálculos
    if (Object.keys(updates).length > 0) {
        // Verifica se os valores são diferentes para evitar loop infinito
        const hasChanges = Object.keys(updates).some(k => updates[k] !== data[k]);
        if(hasChanges) setData(prev => ({ ...prev, ...updates }));
    }

    // --- GERADOR DE TEXTO ---
    let t = `ECOCARDIOGRAMA TRANSTORÁCICO${data.tipoExame.includes('DOPPLER') ? ' COM DOPPLER COLORIDO' : ''}\n\n`;
    
    t += `DADOS DO PACIENTE: Peso: ${data.peso||'--'} kg. Altura: ${data.altura||'--'} cm. SC: ${data.sc||'--'} m².\n`;
    t += `Ritmo: ${data.ritmo}. FC: ${data.fc||'--'} bpm.\n\n`;

    t += `MEDIDAS E CÁLCULOS (VE):\n`;
    t += `Aorta: ${data.aorta||'-'} mm. Átrio Esquerdo: ${data.ae||'-'} mm (Rel AE/Ao: ${data.relAeAo||'-'}).\n`;
    t += `VE Diástole: ${data.ddve||'-'} mm. VE Sístole: ${data.dsve||'-'} mm.\n`;
    t += `Septo IV: ${data.siv||'-'} mm. Parede Posterior: ${data.ppve||'-'} mm.\n`;
    t += `Massa VE: ${data.massaVE||'-'} g. Índice de Massa: ${data.imVE||'-'} g/m².\n`;
    t += `Fração de Ejeção (Teichholz): ${data.feTeich||'-'} %. Encurtamento: ${data.encurtamento||'-'} %.\n\n`;

    t += `ANÁLISE FUNCIONAL:\n`;
    t += `Ventrículo Esquerdo: Dimensões ${data.ddve > 58 ? 'aumentadas' : 'normais'}. Função sistólica ${data.funcaoVE.toLowerCase()}. ${data.contratilidade}.\n`;
    t += `Função Diastólica: ${data.funcaoDiastolica}.\n`;
    t += `Ventrículo Direito: Dimensões e função preservadas.\n\n`;

    t += `VALVAS E FLUXOS:\n`;
    t += `Mitral: ${data.mitral}. ${data.mitralRefluxo !== 'Ausente' ? `Refluxo ${data.mitralRefluxo.toLowerCase()}.` : ''}\n`;
    t += `Aórtica: ${data.aortica}. ${data.aorticaRefluxo !== 'Ausente' ? `Refluxo ${data.aorticaRefluxo.toLowerCase()}.` : ''}\n`;
    t += `Tricúspide: ${data.tricuspide}. ${data.psap ? `PSAP estimada em ${data.psap} mmHg.` : ''}\n`;
    
    t += `\nCONCLUSÃO:\n`;
    t += `- Exame ecocardiográfico dentro dos limites da normalidade (se valores normais).\n`; // Lógica de conclusão pode ser melhorada depois

    onUpdate({ texto: t, dadosEstruturados: data, tituloExame: t.split('\n')[0] });

  }, [data, onUpdate]); // Dependências

  // Handlers de input com parse para evitar NaN nos cálculos
  const handleNum = (e) => {
      const { name, value } = e.target;
      // Permite apenas números e ponto
      if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
          setData(prev => ({...prev, [name]: value}));
      }
  };

  return (
    <div style={styles.container}>
      {/* 1. CONFIGURAÇÃO DO EXAME */}
      <div style={{marginBottom: '10px'}}>
          <label style={styles.label}>Tipo de Exame</label>
          <select name="tipoExame" value={data.tipoExame} onChange={handleChange} style={{...styles.input, height: '28px', fontWeight: 'bold'}}>
              <option value="ECO_TRANSTORACICO_DOPPLER">Ecocardiograma Transtorácico com Doppler Colorido</option>
              <option value="ECO_TRANSTORACICO">Ecocardiograma Transtorácico (Simples)</option>
          </select>
      </div>

      {/* 2. DADOS BIOMÉTRICOS (Para cálculo de SC) */}
      <div style={styles.section}>
          <div style={styles.header}>Dados do Paciente (Cálculo de SC)</div>
          <div style={styles.body}>
              <div style={styles.grid4}>
                  <div><span style={styles.label}>Peso (kg)</span><input name="peso" value={data.peso} onChange={handleNum} style={styles.input} /></div>
                  <div><span style={styles.label}>Altura (cm)</span><input name="altura" value={data.altura} onChange={handleNum} style={styles.input} /></div>
                  <div><span style={styles.label}>SC (m²)</span><input value={data.sc} readOnly style={{...styles.input, ...styles.readOnly}} /></div>
                  <div><span style={styles.label}>FC (bpm)</span><input name="fc" value={data.fc} onChange={handleNum} style={styles.input} /></div>
              </div>
          </div>
      </div>

      {/* 3. MEDIDAS E CÁLCULOS (O Coração do Sistema) */}
      <div style={styles.section}>
          <div style={styles.header} onClick={() => toggle('medidas')}>
              <span><FaCalculator/> Medidas e Cálculos (VE/AE/Ao)</span> <FaExpand/>
          </div>
          {sections.medidas && (
              <div style={styles.body}>
                  <div style={styles.grid3}>
                      {/* Coluna 1: Diâmetros Básicos */}
                      <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                          <div style={styles.groupTitle}>Diâmetros (mm)</div>
                          <div style={styles.row}><span style={{...styles.label, width:'40px'}}>Aorta</span><input name="aorta" value={data.aorta} onChange={handleNum} style={styles.input} /></div>
                          <div style={styles.row}><span style={{...styles.label, width:'40px'}}>AE</span><input name="ae" value={data.ae} onChange={handleNum} style={styles.input} /></div>
                          <div style={styles.row}><span style={{...styles.label, width:'40px'}}>DDVD</span><input name="ddvd" value={data.ddvd} onChange={handleNum} style={styles.input} /></div>
                      </div>

                      {/* Coluna 2: Ventrículo Esquerdo */}
                      <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                          <div style={styles.groupTitle}>Ventrículo Esq. (mm)</div>
                          <div style={styles.row}><span style={{...styles.label, width:'60px'}}>Diástole</span><input name="ddve" value={data.ddve} onChange={handleNum} style={styles.input} /></div>
                          <div style={styles.row}><span style={{...styles.label, width:'60px'}}>Sístole</span><input name="dsve" value={data.dsve} onChange={handleNum} style={styles.input} /></div>
                          <div style={styles.row}><span style={{...styles.label, width:'60px'}}>Septo</span><input name="siv" value={data.siv} onChange={handleNum} style={styles.input} /></div>
                          <div style={styles.row}><span style={{...styles.label, width:'60px'}}>Parede P.</span><input name="ppve" value={data.ppve} onChange={handleNum} style={styles.input} /></div>
                      </div>

                      {/* Coluna 3: Resultados Automáticos */}
                      <div style={{display:'flex', flexDirection:'column', gap:'5px', background:'#E8F5E9', padding:'5px', borderRadius:'4px', border:'1px solid #C8E6C9'}}>
                          <div style={{...styles.groupTitle, color:'#1B5E20', borderBottom:'1px solid #A5D6A7'}}>Resultados Auto</div>
                          <div style={styles.row}><span style={styles.label}>FE (Teich) %</span><input value={data.feTeich} readOnly style={{...styles.input, fontWeight:'bold'}} /></div>
                          <div style={styles.row}><span style={styles.label}>Massa (g)</span><input value={data.massaVE} readOnly style={styles.input} /></div>
                          <div style={styles.row}><span style={styles.label}>Índice (g/m²)</span><input value={data.imVE} readOnly style={styles.input} /></div>
                          <div style={styles.row}><span style={styles.label}>Encurt. (%)</span><input value={data.encurtamento} readOnly style={styles.input} /></div>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* 4. VALVAS (Layout em Grade) */}
      <div style={styles.section}>
          <div style={styles.header} onClick={() => toggle('valvas')}>
              <span><FaHeartbeat/> Valvas Cardíacas</span> <FaExpand/>
          </div>
          {sections.valvas && (
              <div style={styles.body}>
                  <div style={styles.grid2}>
                      {/* Mitral */}
                      <div style={{border:'1px solid #eee', padding:'5px'}}>
                          <div style={styles.groupTitle}>Mitral</div>
                          <div style={{marginBottom:'5px'}}>
                              <span style={styles.label}>Morfologia</span>
                              <select name="mitral" value={data.mitral} onChange={handleChange} style={styles.input}>
                                  <option>Normal</option><option>Espessada</option><option>Calcificada</option><option>Prolapso</option>
                              </select>
                          </div>
                          <div>
                              <span style={styles.label}>Refluxo (Ao Doppler)</span>
                              <select name="mitralRefluxo" value={data.mitralRefluxo} onChange={handleChange} style={styles.input}>
                                  <option>Ausente</option><option>Discreto</option><option>Moderado</option><option>Importante</option>
                              </select>
                          </div>
                      </div>

                      {/* Aórtica */}
                      <div style={{border:'1px solid #eee', padding:'5px'}}>
                          <div style={styles.groupTitle}>Aórtica</div>
                          <div style={{marginBottom:'5px'}}>
                              <span style={styles.label}>Morfologia</span>
                              <select name="aortica" value={data.aortica} onChange={handleChange} style={styles.input}>
                                  <option>Normal</option><option>Espessada</option><option>Calcificada</option><option>Bicúspide</option>
                              </select>
                          </div>
                          <div>
                              <span style={styles.label}>Refluxo</span>
                              <select name="aorticaRefluxo" value={data.aorticaRefluxo} onChange={handleChange} style={styles.input}>
                                  <option>Ausente</option><option>Discreto</option><option>Moderado</option><option>Importante</option>
                              </select>
                          </div>
                      </div>

                      {/* Tricúspide */}
                      <div style={{border:'1px solid #eee', padding:'5px'}}>
                          <div style={styles.groupTitle}>Tricúspide</div>
                          <div style={styles.row}>
                              <div style={{flex:1}}>
                                <span style={styles.label}>Refluxo</span>
                                <select name="tricuspideRefluxo" value={data.tricuspideRefluxo} onChange={handleChange} style={styles.input}>
                                    <option>Ausente</option><option>Discreto</option><option>Moderado</option>
                                </select>
                              </div>
                              <div style={{width:'60px'}}>
                                  <span style={styles.label}>PSAP</span>
                                  <input name="psap" value={data.psap} onChange={handleNum} style={styles.input} placeholder="mmHg"/>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default FormEcocardiograma;