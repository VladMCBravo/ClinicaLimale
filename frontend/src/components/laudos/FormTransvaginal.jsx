// src/components/laudos/FormTransvaginal.jsx
import React, { useState, useEffect } from 'react';
import { FaRulerCombined, FaVenus, FaWaveSquare } from 'react-icons/fa';

// Estilos (Reaproveitados para manter consistência)
const styles = {
  section: { border: '1px solid #E0E0E0', borderRadius: '8px', marginBottom: '15px', background: '#FFFFFF', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' },
  header: { background: '#7B1FA2', color: 'white', padding: '10px 15px', fontSize: '13px', fontWeight: 'bold', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }, // Roxo para diferenciar do Obstétrico
  body: { padding: '15px', display: 'grid', gap: '15px' },
  row: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
  label: { fontSize: '11px', fontWeight: 'bold', color: '#555', marginBottom: '4px', display: 'block', textTransform: 'uppercase' },
  input: { padding: '8px', border: '1px solid #CCC', borderRadius: '4px', fontSize: '13px', width: '100%' },
  checkboxLabel: { fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#444' },
  readOnly: { background: '#F5F5F5', color: '#333', fontWeight: 'bold', border: '1px solid #DDD' }
};

const FormTransvaginal = ({ onUpdate }) => {
  const [data, setData] = useState({
    // ÚTERO
    uteroPosicao: 'Anteversoflexão',
    uteroTextura: 'Homogênea',
    uteroL: '', uteroAP: '', uteroT: '', uteroVol: '',
    endometrio: '', endometrioAspecto: 'Ecogênico',
    
    // OVÁRIO DIREITO (OD)
    odVisualizado: true,
    odL: '', odAP: '', odT: '', odVol: '',
    odAspecto: 'Aspecto habitual',
    
    // OVÁRIO ESQUERDO (OE)
    oeVisualizado: true,
    oeL: '', oeAP: '', oeT: '', oeVol: '',
    oeAspecto: 'Aspecto habitual',
    
    // FUNDO DE SACO
    fundoSaco: 'Livre', // ou 'Líquido', 'Aderências'
    
    // DOPPLER (Opcional)
    usarDoppler: false,
    irUterinaD: '', irUterinaE: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // --- CÁLCULOS E TEXTO ---
  useEffect(() => {
    // 1. Cálculos de Volume (Elipsoide: A x B x C x 0.523)
    const calcVol = (l, ap, t) => {
        if(l && ap && t) return (l * ap * t * 0.523 / 1000).toFixed(1);
        return '';
    };

    const volUtero = calcVol(data.uteroL, data.uteroAP, data.uteroT);
    const volOD = calcVol(data.odL, data.odAP, data.odT);
    const volOE = calcVol(data.oeL, data.oeAP, data.oeT);

    // 2. Montagem do Texto
    let t = `ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL\n\n`;
    
    // Útero
    t += `ÚTERO:\n`;
    t += `Em ${data.uteroPosicao.toLowerCase()}, com contornos regulares e ecotextura ${data.uteroTextura.toLowerCase()}.\n`;
    t += `Medidas: ${data.uteroL || '-'} x ${data.uteroAP || '-'} x ${data.uteroT || '-'} mm. Volume: ${volUtero || '-'} cm³ (VN: 25-90 cm³).\n`;
    t += `Eco endometrial ${data.endometrioAspecto.toLowerCase()}, centrado, medindo ${data.endometrio || '-'} mm de espessura.\n\n`;

    // Ovários
    t += `ANEXOS:\n`;
    if (data.odVisualizado) {
        t += `Ovário Direito: ${data.odAspecto}. Medidas: ${data.odL} x ${data.odAP} x ${data.odT} mm. Vol: ${volOD} cm³.\n`;
    } else {
        t += `Ovário Direito: Não visualizado (interposição gasosa/cirurgia prévia).\n`;
    }

    if (data.oeVisualizado) {
        t += `Ovário Esquerdo: ${data.oeAspecto}. Medidas: ${data.oeL} x ${data.oeAP} x ${data.oeT} mm. Vol: ${volOE} cm³.\n`;
    } else {
        t += `Ovário Esquerdo: Não visualizado.\n`;
    }
    
    t += `\nFundo de Saco Posterior (Douglas): ${data.fundoSaco}.\n`;

    // Doppler (Se ativado)
    if (data.usarDoppler) {
        t += `\nDOPPLERFLUXOMETRIA:\n`;
        t += `Artérias Uterinas com fluxo preservado. `;
        if (data.irUterinaD) t += `IR Dir: ${data.irUterinaD}. `;
        if (data.irUterinaE) t += `IR Esq: ${data.irUterinaE}.`;
        t += `\n`;
    }

    // Conclusão
    t += `\nCONCLUSÃO:\n`;
    if (data.uteroTextura === 'Homogênea' && (!data.endometrio || data.endometrio < 12)) {
        t += `- Exame ecográfico pélvico dentro dos padrões de normalidade.`;
    } else {
        t += `- A critério clínico.`;
    }

    // Enviar para o Pai
    onUpdate({
        texto: t,
        dadosEstruturados: { ...data, uteroVol: volUtero, odVol: volOD, oeVol: volOE },
        tituloExame: 'USG Transvaginal'
    });

  }, [data, onUpdate]);

  return (
    <>
      {/* SEÇÃO ÚTERO */}
      <div style={styles.section}>
        <div style={styles.header}><FaVenus/> <span>Útero & Endométrio</span></div>
        <div style={styles.body}>
            <div style={styles.row}>
                <div style={{flex: 1}}>
                    <span style={styles.label}>Posição</span>
                    <select name="uteroPosicao" value={data.uteroPosicao} onChange={handleChange} style={styles.input}>
                        <option>Anteversoflexão</option>
                        <option>Retroversoflexão</option>
                        <option>Medioversão</option>
                    </select>
                </div>
                <div style={{flex: 1}}>
                    <span style={styles.label}>Textura</span>
                    <select name="uteroTextura" value={data.uteroTextura} onChange={handleChange} style={styles.input}>
                        <option>Homogênea</option>
                        <option>Heterogênea (Miomatose?)</option>
                        <option>Heterogênea (Adenomiose?)</option>
                    </select>
                </div>
            </div>
            
            <div style={{borderTop: '1px solid #eee', paddingTop: '10px'}}>
                <span style={styles.label}>Medidas (Long x AP x Transv) mm</span>
                <div style={styles.row}>
                    <input name="uteroL" placeholder="L" value={data.uteroL} onChange={handleChange} style={{...styles.input, flex: 1}} />
                    <input name="uteroAP" placeholder="AP" value={data.uteroAP} onChange={handleChange} style={{...styles.input, flex: 1}} />
                    <input name="uteroT" placeholder="T" value={data.uteroT} onChange={handleChange} style={{...styles.input, flex: 1}} />
                    <input value={data.uteroVol ? `${data.uteroVol} cm³` : ''} readOnly style={{...styles.input, ...styles.readOnly, flex: 1, textAlign: 'center'}} placeholder="Vol. Auto" />
                </div>
            </div>

            <div style={styles.row}>
                <div style={{flex: 1}}>
                    <span style={styles.label}>Endométrio (mm)</span>
                    <input name="endometrio" value={data.endometrio} onChange={handleChange} style={styles.input} />
                </div>
                <div style={{flex: 1}}>
                    <span style={styles.label}>Aspecto Endométrio</span>
                    <select name="endometrioAspecto" value={data.endometrioAspecto} onChange={handleChange} style={styles.input}>
                        <option>Ecogênico</option>
                        <option>Trilaminar</option>
                        <option>Fino/Linear</option>
                        <option>Espessado/Heterogêneo</option>
                    </select>
                </div>
            </div>
        </div>
      </div>

      {/* SEÇÃO OVÁRIOS */}
      <div style={styles.section}>
        <div style={styles.header}><FaRulerCombined/> <span>Ovários</span></div>
        <div style={styles.body}>
            {/* Ovário Direito */}
            <div style={{marginBottom: '10px'}}>
                <label style={styles.checkboxLabel}>
                    <input type="checkbox" name="odVisualizado" checked={data.odVisualizado} onChange={handleChange}/> 
                    <strong style={{color: '#7B1FA2'}}>Ovário Direito</strong>
                </label>
                {data.odVisualizado && (
                    <div style={styles.row}>
                        <input name="odL" placeholder="L" value={data.odL} onChange={handleChange} style={{...styles.input, width: '50px'}} />
                        <input name="odAP" placeholder="AP" value={data.odAP} onChange={handleChange} style={{...styles.input, width: '50px'}} />
                        <input name="odT" placeholder="T" value={data.odT} onChange={handleChange} style={{...styles.input, width: '50px'}} />
                        <select name="odAspecto" value={data.odAspecto} onChange={handleChange} style={{...styles.input, flex: 1}}>
                            <option>Aspecto habitual</option>
                            <option>Micropolicístico</option>
                            <option>Cisto simples</option>
                            <option>Folicular</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Ovário Esquerdo */}
            <div>
                <label style={styles.checkboxLabel}>
                    <input type="checkbox" name="oeVisualizado" checked={data.oeVisualizado} onChange={handleChange}/> 
                    <strong style={{color: '#7B1FA2'}}>Ovário Esquerdo</strong>
                </label>
                {data.oeVisualizado && (
                    <div style={styles.row}>
                        <input name="oeL" placeholder="L" value={data.oeL} onChange={handleChange} style={{...styles.input, width: '50px'}} />
                        <input name="oeAP" placeholder="AP" value={data.oeAP} onChange={handleChange} style={{...styles.input, width: '50px'}} />
                        <input name="oeT" placeholder="T" value={data.oeT} onChange={handleChange} style={{...styles.input, width: '50px'}} />
                        <select name="oeAspecto" value={data.oeAspecto} onChange={handleChange} style={{...styles.input, flex: 1}}>
                            <option>Aspecto habitual</option>
                            <option>Micropolicístico</option>
                            <option>Cisto simples</option>
                            <option>Folicular</option>
                        </select>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* SEÇÃO DOPPLER */}
      <div style={styles.section}>
        <div style={styles.header}>
            <label style={{...styles.checkboxLabel, color: 'white'}}>
                <input type="checkbox" name="usarDoppler" checked={data.usarDoppler} onChange={handleChange}/> 
                <FaWaveSquare/> <span>Incluir Doppler</span>
            </label>
        </div>
        {data.usarDoppler && (
            <div style={styles.body}>
                <div style={styles.row}>
                    <div style={{flex: 1}}><span style={styles.label}>IR Art. Uterina Dir</span><input name="irUterinaD" value={data.irUterinaD} onChange={handleChange} style={styles.input} /></div>
                    <div style={{flex: 1}}><span style={styles.label}>IR Art. Uterina Esq</span><input name="irUterinaE" value={data.irUterinaE} onChange={handleChange} style={styles.input} /></div>
                </div>
            </div>
        )}
      </div>
    </>
  );
};

export default FormTransvaginal;