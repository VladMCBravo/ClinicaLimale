// src/components/laudos/FormObstetrico.jsx
import React, { useState, useEffect } from 'react';
import { FaCalculator, FaBaby, FaStethoscope } from 'react-icons/fa';

// Estilos locais para o formulário
const styles = {
  section: { border: '1px solid #E0E0E0', borderRadius: '8px', marginBottom: '15px', background: '#FFFFFF', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' },
  header: { background: '#1C2E4A', color: 'white', padding: '10px 15px', fontSize: '13px', fontWeight: 'bold', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' },
  body: { padding: '15px', display: 'grid', gap: '15px' },
  row: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
  label: { fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '4px', display: 'block' },
  input: { padding: '8px', border: '1px solid #CCC', borderRadius: '4px', fontSize: '13px', width: '100%' },
  checkboxLabel: { fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#444' },
  subHeader: { fontSize: '13px', color: '#C5A47E', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px', marginTop: '5px', width: '100%' }
};

const FormObstetrico = ({ onUpdate }) => {
  // Estado Local da Máscara Obstétrica
  const [data, setData] = useState({
    subtipo: 'OBSTETRICO_2TRI', // Padrão
    dum: '', igDum: '', dpp: '',
    ccn: '', tn: '', ossoNasal: 'Presente', ductoVenoso: 'Normal',
    dbp: '', cc: '', ca: '', femur: '', pesoFetal: '', ila: '', bcf: '140',
    cranioNormal: true, faceNormal: true, coracaoNormal: true, colunaNormal: true,
    estomagoNormal: true, rinsNormais: true, bexigaNormal: true, membrosNormais: true,
    placentaPosicao: 'Corporal Posterior', placentaGrau: '0', placentaEspessura: '',
    situacao: 'Longitudinal', apresentacao: 'Cefálica', dorso: 'Esquerda'
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // --- LÓGICA DE CÁLCULOS E GERAÇÃO DE TEXTO ---
  useEffect(() => {
    // 1. Cálculos (IG, DPP, Peso)
    let newIg = data.igDum;
    let newDpp = data.dpp;
    let newPeso = data.pesoFetal;

    if (data.dum) {
        const dumDate = new Date(data.dum);
        const diffDays = Math.ceil(Math.abs(new Date() - dumDate) / (1000 * 60 * 60 * 24));
        const dppDate = new Date(dumDate);
        dppDate.setDate(dumDate.getDate() + 280);
        newIg = `${Math.floor(diffDays / 7)}s ${diffDays % 7}d`;
        newDpp = dppDate.toLocaleDateString('pt-BR');
    }

    if (data.subtipo !== 'OBSTETRICO_1TRI' && data.ca && data.femur) {
        const p = (parseInt(data.ca) * 4) + (parseInt(data.femur) * 10) + 150;
        if (!isNaN(p)) newPeso = p.toFixed(0);
    }

    // 2. Geração do Texto
    let t = '';
    if (data.subtipo === 'OBSTETRICO_1TRI') t += `ULTRASSONOGRAFIA OBSTÉTRICA DE 1º TRIMESTRE\n\n`;
    else t += `ULTRASSONOGRAFIA OBSTÉTRICA\n\n`;

    t += `DUM: ${data.dum ? new Date(data.dum).toLocaleDateString('pt-BR') : 'Não informada'}.\n`;
    if (newIg) t += `Idade Gestacional (DUM): ${newIg}. DPP: ${newDpp}.\n\n`;

    if (data.subtipo === 'OBSTETRICO_1TRI') {
        t += `Saco gestacional tópico. Embrião visualizado, BCF presentes (${data.bcf} bpm).\n`;
        t += `CCN: ${data.ccn || '--'} mm. TN: ${data.tn || '--'} mm.\n`;
        t += `Osso Nasal: ${data.ossoNasal}. Ducto Venoso: ${data.ductoVenoso}.\n\n`;
    } else {
        t += `Feto único, ${data.situacao.toLowerCase()}, ${data.apresentacao.toLowerCase()}, dorso à ${data.dorso.toLowerCase()}.\n`;
        t += `BCF presentes (${data.bcf} bpm) e rítmicos.\n\n`;
        
        let morf = [];
        if(data.cranioNormal) morf.push("Crânio"); if(data.faceNormal) morf.push("Face");
        if(data.coracaoNormal) morf.push("Coração"); if(data.colunaNormal) morf.push("Coluna");
        if(data.estomagoNormal) morf.push("Estômago"); if(data.rinsNormais) morf.push("Rins");
        if(data.bexigaNormal) morf.push("Bexiga"); if(data.membrosNormais) morf.push("Membros");
        if(morf.length > 0) t += `Análise Morfológica: Visualizados sem alterações: ${morf.join(', ')}.\n\n`;

        t += `Biometria: DBP: ${data.dbp||'--'}mm | CC: ${data.cc||'--'}mm | CA: ${data.ca||'--'}mm | Fêmur: ${data.femur||'--'}mm.\n`;
        if(newPeso) t += `Peso Estimado: ${newPeso} g.\n\n`;

        t += `Placenta ${data.placentaPosicao.toLowerCase()}, grau ${data.placentaGrau}. Líquido amniótico normal.\n\n`;
    }

    t += `CONCLUSÃO:\n- Gestação tópica compatível com a idade gestacional.`;

    // 3. Envia para o Pai (LaudosPage)
    onUpdate({
        texto: t,
        dadosEstruturados: { ...data, igDum: newIg, dpp: newDpp, pesoFetal: newPeso },
        tituloExame: data.subtipo === 'OBSTETRICO_1TRI' ? 'USG Obstétrico 1º Tri' : 'USG Obstétrico'
    });

  }, [data, onUpdate]);

  // --- RENDERIZAÇÃO DA MÁSCARA ---
  return (
    <>
      {/* Subtipo Selector */}
      <div style={{marginBottom: '15px'}}>
          <select name="subtipo" value={data.subtipo} onChange={handleChange} style={{...styles.input, padding: '10px', fontSize: '14px', fontWeight: 'bold'}}>
              <option value="OBSTETRICO_2TRI">Obstétrico 2º/3º Trimestre (Padrão)</option>
              <option value="OBSTETRICO_1TRI">Obstétrico 1º Trimestre (TN/CCN)</option>
              <option value="MORFOLOGICO">Morfológico Detalhado</option>
          </select>
      </div>

      <div style={styles.section}>
        <div style={styles.header}><FaCalculator/> <span>Datação & Vitalidade</span></div>
        <div style={styles.body}>
            <div style={styles.row}>
                <div style={{flex: 1}}><span style={styles.label}>DUM</span><input type="date" name="dum" value={data.dum} onChange={handleChange} style={styles.input} /></div>
                <div style={{flex: 1}}><span style={styles.label}>BCF (bpm)</span><input name="bcf" value={data.bcf} onChange={handleChange} style={styles.input} /></div>
            </div>
        </div>
      </div>

      {data.subtipo === 'OBSTETRICO_1TRI' ? (
         <div style={styles.section}>
            <div style={styles.header}><FaBaby/> <span>Biometria 1º Tri</span></div>
            <div style={styles.body}>
                <div style={styles.row}>
                    <div style={{flex:1}}><span style={styles.label}>CCN (mm)</span><input name="ccn" value={data.ccn} onChange={handleChange} style={styles.input} /></div>
                    <div style={{flex:1}}><span style={styles.label}>TN (mm)</span><input name="tn" value={data.tn} onChange={handleChange} style={styles.input} /></div>
                </div>
            </div>
         </div>
      ) : (
         <>
            <div style={styles.section}>
                <div style={styles.header}><FaBaby/> <span>Biometria Fetal</span></div>
                <div style={styles.body}>
                    <div style={styles.row}>
                        <div style={{flex:1}}><span style={styles.label}>DBP</span><input name="dbp" value={data.dbp} onChange={handleChange} style={styles.input} /></div>
                        <div style={{flex:1}}><span style={styles.label}>CC</span><input name="cc" value={data.cc} onChange={handleChange} style={styles.input} /></div>
                        <div style={{flex:1}}><span style={styles.label}>CA</span><input name="ca" value={data.ca} onChange={handleChange} style={styles.input} /></div>
                        <div style={{flex:1}}><span style={styles.label}>Fêmur</span><input name="femur" value={data.femur} onChange={handleChange} style={styles.input} /></div>
                    </div>
                </div>
            </div>

            <div style={styles.section}>
                <div style={styles.header}><FaStethoscope/> <span>Anatomia & Placenta</span></div>
                <div style={styles.body}>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                        <label style={styles.checkboxLabel}><input type="checkbox" name="cranioNormal" checked={data.cranioNormal} onChange={handleChange}/> Crânio</label>
                        <label style={styles.checkboxLabel}><input type="checkbox" name="coracaoNormal" checked={data.coracaoNormal} onChange={handleChange}/> Coração</label>
                        <label style={styles.checkboxLabel}><input type="checkbox" name="colunaNormal" checked={data.colunaNormal} onChange={handleChange}/> Coluna</label>
                        <label style={styles.checkboxLabel}><input type="checkbox" name="rinsNormais" checked={data.rinsNormais} onChange={handleChange}/> Rins</label>
                    </div>
                    <div style={styles.subHeader}>Placenta</div>
                    <div style={styles.row}>
                        <select name="placentaPosicao" value={data.placentaPosicao} onChange={handleChange} style={styles.input}>
                            <option>Corporal Anterior</option><option>Corporal Posterior</option><option>Fúndica</option><option>Prévia</option>
                        </select>
                        <select name="placentaGrau" value={data.placentaGrau} onChange={handleChange} style={{...styles.input, width: '60px'}}>
                            <option>0</option><option>1</option><option>2</option><option>3</option>
                        </select>
                    </div>
                </div>
            </div>
         </>
      )}
    </>
  );
};

export default FormObstetrico;