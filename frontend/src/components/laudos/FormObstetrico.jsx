// src/components/laudos/FormObstetrico.jsx
import React, { useState, useEffect } from 'react';
import { FaCalculator, FaBaby, FaStethoscope, FaWaveSquare, FaExpand, FaHeartbeat } from 'react-icons/fa';

// Estilos
const styles = {
  section: { border: '1px solid #E0E0E0', borderRadius: '8px', marginBottom: '15px', background: '#FFFFFF', boxShadow: '0 2px 5px rgba(0,0,0,0.03)', overflow: 'hidden' },
  header: { background: '#1C2E4A', color: 'white', padding: '10px 15px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', justifyContent: 'space-between' },
  body: { padding: '15px', display: 'grid', gap: '15px' },
  row: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' },
  group: { border: '1px solid #eee', padding: '10px', borderRadius: '6px', flex: 1, minWidth: '200px' },
  groupTitle: { fontSize: '11px', fontWeight: 'bold', color: '#1C2E4A', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '4px', textTransform: 'uppercase' },
  label: { fontSize: '11px', fontWeight: 'bold', color: '#555', marginBottom: '2px', display: 'block' },
  input: { padding: '6px', border: '1px solid #CCC', borderRadius: '4px', fontSize: '13px', width: '100%' },
  inputSmall: { padding: '6px', border: '1px solid #CCC', borderRadius: '4px', fontSize: '13px', width: '60px', textAlign: 'center' },
  checkboxLabel: { fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#333' },
  toggleIcon: { fontSize: '12px', opacity: 0.8 }
};

const FormObstetrico = ({ onUpdate }) => {
  // Estado Expandido (Controle de visualização)
  const [sections, setSections] = useState({ biometria: true, morfologia: true, doppler: false, placenta: true });
  const toggle = (sec) => setSections(p => ({ ...p, [sec]: !p[sec] }));

  const [data, setData] = useState({
    subtipo: 'OBSTETRICO_2TRI',
    
    // DATAÇÃO
    dum: '', igDum: '', dpp: '',
    
    // VITALIDADE
    bcf: '140', movFetal: true, degluticao: false,
    
    // BIOMETRIA BÁSICA
    dbp: '', cc: '', ca: '', femur: '', pesoFetal: '',
    
    // BIOMETRIA ESTENDIDA (Baseada nos prints)
    cerebelo: '', cisternaMagna: '', ventriculoLat: '',
    ossoNasal: '', pregaNucal: '', 
    umero: '', ulna: '', tibia: '', fibula: '', pe: '',
    
    // MORFOLOGIA (Checklist completo do Turing)
    cranioNormal: true, faceNormal: true, cerebroNormal: true,
    colunaNormal: true, toraxNormal: true, coracaoNormal: true,
    estomagoNormal: true, rinsNormais: true, bexigaNormal: true,
    paredeAbdNormal: true, genitaliaNormal: true, membrosNormais: true,
    vasosBaseNormal: false, // Menos comum citar se não for morfológico
    
    // PLACENTA / LÍQUIDO / COLO
    placentaPosicao: 'Corporal Posterior', placentaGrau: '0', placentaEspessura: '',
    ila: '', mbv: '',
    coloUterino: '', coloAspecto: 'Fechado',
    
    // DOPPLER (Novos campos baseados nos prints)
    usarDoppler: false,
    // Art. Uterinas
    utDirIP: '', utDirIR: '', utDirInc: false, // Incisura
    utEsqIP: '', utEsqIR: '', utEsqInc: false,
    // Art. Umbilical
    umbIP: '', umbIR: '', umbSD: '',
    // Cerebral Média
    acmIP: '', acmIR: '', acmPVS: '',
    // Ducto Venoso
    dvIP: '', dvOndaA: 'Positiva',

    situacao: 'Longitudinal', apresentacao: 'Cefálica', dorso: 'Esquerda'
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // --- LÓGICA INTELIGENTE ---
  useEffect(() => {
    // 1. Cálculos Básicos
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

    if (data.ca && data.femur && !data.pesoFetal) { // Calcula só se não tiver digitado manual
        const p = (parseInt(data.ca) * 4) + (parseInt(data.femur) * 10) + 150;
        if (!isNaN(p)) newPeso = p.toFixed(0);
    } else {
        newPeso = data.pesoFetal;
    }

    // 2. Montagem do Texto (Laudo Rico)
    let t = `ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLERFLUXOMETRIA\n\n`;
    if (!data.usarDoppler) t = `ULTRASSONOGRAFIA OBSTÉTRICA\n\n`;

    t += `DUM: ${data.dum ? new Date(data.dum).toLocaleDateString('pt-BR') : 'Não informada'}.\n`;
    if (newIg) t += `Idade Gestacional (DUM): ${newIg}. DPP: ${newDpp}.\n\n`;

    t += `ANÁLISE INICIAL:\n`;
    t += `Feto único, situação ${data.situacao.toLowerCase()}, apresentação ${data.apresentacao.toLowerCase()}, dorso à ${data.dorso.toLowerCase()}.\n`;
    t += `Vitalidade preservada: BCF ${data.bcf} bpm, rítmicos. Movimentação fetal ativa${data.degluticao ? ' e deglutição presente' : ''}.\n\n`;

    t += `BIOMETRIA FETAL:\n`;
    t += `DBP: ${data.dbp||'-'} mm | CC: ${data.cc||'-'} mm | CA: ${data.ca||'-'} mm | Fêmur: ${data.femur||'-'} mm.\n`;
    
    // Biometria Avançada (Só exibe se preenchido)
    let bioExt = [];
    if(data.cerebelo) bioExt.push(`Cerebelo: ${data.cerebelo} mm`);
    if(data.cisternaMagna) bioExt.push(`Cist. Magna: ${data.cisternaMagna} mm`);
    if(data.ventriculoLat) bioExt.push(`Ventrículo Lat: ${data.ventriculoLat} mm`);
    if(data.ossoNasal) bioExt.push(`Osso Nasal: ${data.ossoNasal} mm`);
    if(data.pregaNucal) bioExt.push(`Prega Nucal: ${data.pregaNucal} mm`);
    if(bioExt.length > 0) t += `${bioExt.join(' | ')}.\n`;
    
    if(newPeso) t += `Peso Fetal Estimado: ${newPeso} g.\n\n`;

    t += `MORFOLOGIA FETAL:\n`;
    let normais = [];
    if(data.cranioNormal) normais.push("Crânio"); if(data.faceNormal) normais.push("Face");
    if(data.cerebroNormal) normais.push("Encéfalo"); if(data.colunaNormal) normais.push("Coluna");
    if(data.coracaoNormal) normais.push("Coração"); if(data.toraxNormal) normais.push("Tórax");
    if(data.estomagoNormal) normais.push("Estômago"); if(data.rinsNormais) normais.push("Rins");
    if(data.bexigaNormal) normais.push("Bexiga"); if(data.paredeAbdNormal) normais.push("Parede Abd.");
    if(data.membrosNormais) normais.push("Membros"); if(data.genitaliaNormal) normais.push("Genitália Externa");
    t += `Estruturas visualizadas com aspecto ecográfico habitual: ${normais.join(', ')}.\n\n`;

    t += `PLACENTA E LÍQUIDO:\n`;
    t += `Placenta ${data.placentaPosicao.toLowerCase()}, grau ${data.placentaGrau} (Grannum).`;
    if(data.placentaEspessura) t += ` Espessura: ${data.placentaEspessura} mm.`;
    t += `\nLíquido amniótico normais (ILA/MBV preservados).\n`;
    if(data.coloUterino) t += `Colo uterino medindo ${data.coloUterino} mm, aspecto ${data.coloAspecto.toLowerCase()}.\n`;

    if(data.usarDoppler) {
        t += `\nESTUDO DOPPLER:\n`;
        t += `Artérias Uterinas: Fluxo preservado. `;
        if(data.utDirIR) t += `IR Dir: ${data.utDirIR}. `;
        if(data.utEsqIR) t += `IR Esq: ${data.utEsqIR}. `;
        if(data.utDirInc || data.utEsqInc) t += `(Presença de incisura protodiastólica).`;
        t += `\nArtéria Umbilical: Baixa resistência (IR: ${data.umbIR || '-'}). Diástole positiva.\n`;
        t += `Artéria Cerebral Média: Fluxo de alta resistência habitual (IR: ${data.acmIR || '-'}).\n`;
        if(data.dvIP) t += `Ducto Venoso: Onda A ${data.dvOndaA.toLowerCase()} (IP: ${data.dvIP}).\n`;
    }

    t += `\nCONCLUSÃO:\n`;
    t += `- Gestação tópica com crescimento e vitalidade preservados.\n`;
    t += `- Morfologia básica sem anormalidades evidentes.\n`;
    if(data.usarDoppler) t += `- Dopplerfluxometria materno-fetal dentro dos padrões normais.\n`;

    onUpdate({ texto: t, dadosEstruturados: data, tituloExame: data.usarDoppler ? 'USG Obstétrico com Doppler' : 'USG Obstétrico' });
  }, [data, onUpdate]);

  return (
    <>
      <div style={{marginBottom:'10px'}}>
          <select name="subtipo" value={data.subtipo} onChange={handleChange} style={{...styles.input, fontWeight:'bold'}}>
              <option value="OBSTETRICO_2TRI">Obstétrico Completo (2º/3º Tri)</option>
              {/* Adicionar 1º Tri aqui depois se quiser */}
          </select>
      </div>

      {/* 1. DATAÇÃO E VITALIDADE */}
      <div style={styles.section}>
        <div style={styles.header} onClick={() => toggle('vitalidade')}>
            <span style={{display:'flex', gap:'8px', alignItems:'center'}}><FaHeartbeat/> Datação & Vitalidade</span>
            <FaExpand style={styles.toggleIcon}/>
        </div>
        <div style={styles.body}>
            <div style={styles.row}>
                <div style={{flex:1}}><span style={styles.label}>DUM</span><input type="date" name="dum" value={data.dum} onChange={handleChange} style={styles.input} /></div>
                <div style={{width:'80px'}}><span style={styles.label}>BCF (bpm)</span><input name="bcf" value={data.bcf} onChange={handleChange} style={styles.input} /></div>
                <div style={{flex:1, display:'flex', gap:'15px', alignItems:'center', paddingTop:'15px'}}>
                    <label style={styles.checkboxLabel}><input type="checkbox" name="movFetal" checked={data.movFetal} onChange={handleChange}/> Mov. Fetal</label>
                    <label style={styles.checkboxLabel}><input type="checkbox" name="degluticao" checked={data.degluticao} onChange={handleChange}/> Deglutição</label>
                </div>
            </div>
        </div>
      </div>

      {/* 2. BIOMETRIA COMPLETA */}
      <div style={styles.section}>
        <div style={styles.header} onClick={() => toggle('biometria')}>
            <span style={{display:'flex', gap:'8px', alignItems:'center'}}><FaBaby/> Biometria Fetal</span>
            <FaExpand style={styles.toggleIcon}/>
        </div>
        {sections.biometria && (
            <div style={styles.body}>
                <div style={styles.group}>
                    <div style={styles.groupTitle}>Básica</div>
                    <div style={styles.row}>
                        <div style={{flex:1}}><span style={styles.label}>DBP</span><input name="dbp" value={data.dbp} onChange={handleChange} style={styles.input} /></div>
                        <div style={{flex:1}}><span style={styles.label}>CC</span><input name="cc" value={data.cc} onChange={handleChange} style={styles.input} /></div>
                        <div style={{flex:1}}><span style={styles.label}>CA</span><input name="ca" value={data.ca} onChange={handleChange} style={styles.input} /></div>
                        <div style={{flex:1}}><span style={styles.label}>Fêmur</span><input name="femur" value={data.femur} onChange={handleChange} style={styles.input} /></div>
                        <div style={{flex:1}}><span style={{...styles.label, color:'#2E7D32'}}>Peso (g)</span><input name="pesoFetal" value={data.pesoFetal} onChange={handleChange} style={{...styles.input, fontWeight:'bold'}} /></div>
                    </div>
                </div>
                
                <div style={styles.group}>
                    <div style={styles.groupTitle}>Neuro / Face</div>
                    <div style={styles.row}>
                        <div style={{width:'60px'}}><span style={styles.label}>Cerebelo</span><input name="cerebelo" value={data.cerebelo} onChange={handleChange} style={styles.input} /></div>
                        <div style={{width:'60px'}}><span style={styles.label}>C.Magna</span><input name="cisternaMagna" value={data.cisternaMagna} onChange={handleChange} style={styles.input} /></div>
                        <div style={{width:'60px'}}><span style={styles.label}>Ventr.Lat</span><input name="ventriculoLat" value={data.ventriculoLat} onChange={handleChange} style={styles.input} /></div>
                        <div style={{width:'60px'}}><span style={styles.label}>O. Nasal</span><input name="ossoNasal" value={data.ossoNasal} onChange={handleChange} style={styles.input} /></div>
                        <div style={{width:'60px'}}><span style={styles.label}>P. Nucal</span><input name="pregaNucal" value={data.pregaNucal} onChange={handleChange} style={styles.input} /></div>
                    </div>
                </div>

                <div style={styles.group}>
                    <div style={styles.groupTitle}>Ossos Longos (Opcional)</div>
                    <div style={styles.row}>
                        <input name="umero" placeholder="Úmero" value={data.umero} onChange={handleChange} style={styles.inputSmall} />
                        <input name="ulna" placeholder="Ulna" value={data.ulna} onChange={handleChange} style={styles.inputSmall} />
                        <input name="tibia" placeholder="Tíbia" value={data.tibia} onChange={handleChange} style={styles.inputSmall} />
                        <input name="fibula" placeholder="Fíbula" value={data.fibula} onChange={handleChange} style={styles.inputSmall} />
                        <input name="pe" placeholder="Pé" value={data.pe} onChange={handleChange} style={styles.inputSmall} />
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* 3. MORFOLOGIA (CHECKLIST) */}
      <div style={styles.section}>
        <div style={styles.header} onClick={() => toggle('morfologia')}>
            <span style={{display:'flex', gap:'8px', alignItems:'center'}}><FaStethoscope/> Morfologia (Check se Normal)</span>
            <FaExpand style={styles.toggleIcon}/>
        </div>
        {sections.morfologia && (
            <div style={styles.body}>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px'}}>
                    <label style={styles.checkboxLabel}><input type="checkbox" name="cranioNormal" checked={data.cranioNormal} onChange={handleChange}/> Crânio</label>
                    <label style={styles.checkboxLabel}><input type="checkbox" name="cerebroNormal" checked={data.cerebroNormal} onChange={handleChange}/> Encéfalo</label>
                    <label style={styles.checkboxLabel}><input type="checkbox" name="faceNormal" checked={data.faceNormal} onChange={handleChange}/> Face/Lábios</label>
                    <label style={styles.checkboxLabel}><input type="checkbox" name="colunaNormal" checked={data.colunaNormal} onChange={handleChange}/> Coluna</label>
                    <label style={styles.checkboxLabel}><input type="checkbox" name="coracaoNormal" checked={data.coracaoNormal} onChange={handleChange}/> Coração (4C)</label>
                    <label style={styles.checkboxLabel}><input type="checkbox" name="vasosBaseNormal" checked={data.vasosBaseNormal} onChange={handleChange}/> Vasos da Base</label>
                    <label style={styles.checkboxLabel}><input type="checkbox" name="toraxNormal" checked={data.toraxNormal} onChange={handleChange}/> Tórax/Pulmões</label>
                    <label style={styles.checkboxLabel}><input type="checkbox" name="estomagoNormal" checked={data.estomagoNormal} onChange={handleChange}/> Estômago</label>
                    <label style={styles.checkboxLabel}><input type="checkbox" name="rinsNormais" checked={data.rinsNormais} onChange={handleChange}/> Rins</label>
                    <label style={styles.checkboxLabel}><input type="checkbox" name="bexigaNormal" checked={data.bexigaNormal} onChange={handleChange}/> Bexiga</label>
                    <label style={styles.checkboxLabel}><input type="checkbox" name="paredeAbdNormal" checked={data.paredeAbdNormal} onChange={handleChange}/> Parede Abd.</label>
                    <label style={styles.checkboxLabel}><input type="checkbox" name="genitaliaNormal" checked={data.genitaliaNormal} onChange={handleChange}/> Genitália Ext.</label>
                    <label style={styles.checkboxLabel}><input type="checkbox" name="membrosNormais" checked={data.membrosNormais} onChange={handleChange}/> Membros</label>
                </div>
            </div>
        )}
      </div>

      {/* 4. PLACENTA / LIQUIDO / COLO */}
      <div style={styles.section}>
         <div style={styles.header} onClick={() => toggle('placenta')}>
             <span>Placenta, Líquido & Colo</span>
             <FaExpand style={styles.toggleIcon}/>
         </div>
         {sections.placenta && (
             <div style={styles.body}>
                 <div style={styles.row}>
                     <div style={{flex:1}}>
                         <span style={styles.label}>Posição</span>
                         <select name="placentaPosicao" value={data.placentaPosicao} onChange={handleChange} style={styles.input}>
                             <option>Corporal Anterior</option><option>Corporal Posterior</option><option>Fúndica</option><option>Prévia</option>
                         </select>
                     </div>
                     <div style={{width:'60px'}}><span style={styles.label}>Grau</span><select name="placentaGrau" value={data.placentaGrau} onChange={handleChange} style={styles.input}><option>0</option><option>1</option><option>2</option><option>3</option></select></div>
                     <div style={{width:'60px'}}><span style={styles.label}>Espess.</span><input name="placentaEspessura" value={data.placentaEspessura} onChange={handleChange} style={styles.input} /></div>
                 </div>
                 <div style={{borderTop:'1px solid #eee', paddingTop:'8px', marginTop:'8px'}}>
                     <div style={styles.row}>
                         <div style={{flex:1}}><span style={styles.label}>ILA (cm)</span><input name="ila" value={data.ila} onChange={handleChange} style={styles.input} /></div>
                         <div style={{flex:1}}><span style={styles.label}>Colo (mm)</span><input name="coloUterino" value={data.coloUterino} onChange={handleChange} style={styles.input} /></div>
                     </div>
                 </div>
             </div>
         )}
      </div>

      {/* 5. DOPPLER COMPLETO (Baseado no Print) */}
      <div style={styles.section}>
        <div style={{...styles.header, background: data.usarDoppler ? '#1C2E4A' : '#777'}}>
            <label style={{...styles.checkboxLabel, color: 'white', fontWeight: 'bold'}}>
                <input type="checkbox" name="usarDoppler" checked={data.usarDoppler} onChange={handleChange}/> 
                <FaWaveSquare/> INCLUIR DOPPLERFLUXOMETRIA
            </label>
            <FaExpand style={{...styles.toggleIcon, cursor:'pointer'}} onClick={() => toggle('doppler')}/>
        </div>
        
        {data.usarDoppler && (
            <div style={styles.body}>
                {/* Artérias Uterinas */}
                <div style={styles.group}>
                    <div style={styles.groupTitle}>Artérias Uterinas</div>
                    <div style={styles.row}>
                        <div style={{flex:1}}>
                            <span style={styles.label}>Direita (IR)</span>
                            <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                <input name="utDirIR" value={data.utDirIR} onChange={handleChange} style={styles.input} placeholder="0.00" />
                                <label style={{fontSize:'10px'}}><input type="checkbox" name="utDirInc" checked={data.utDirInc} onChange={handleChange}/> Incisura</label>
                            </div>
                        </div>
                        <div style={{flex:1}}>
                            <span style={styles.label}>Esquerda (IR)</span>
                            <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                <input name="utEsqIR" value={data.utEsqIR} onChange={handleChange} style={styles.input} placeholder="0.00" />
                                <label style={{fontSize:'10px'}}><input type="checkbox" name="utEsqInc" checked={data.utEsqInc} onChange={handleChange}/> Incisura</label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Umbilical e Cerebral */}
                <div style={styles.row}>
                    <div style={styles.group}>
                        <div style={styles.groupTitle}>Art. Umbilical</div>
                        <div style={styles.row}>
                            <div style={{flex:1}}><span style={styles.label}>IR</span><input name="umbIR" value={data.umbIR} onChange={handleChange} style={styles.input} /></div>
                            <div style={{flex:1}}><span style={styles.label}>IP</span><input name="umbIP" value={data.umbIP} onChange={handleChange} style={styles.input} /></div>
                        </div>
                    </div>
                    <div style={styles.group}>
                        <div style={styles.groupTitle}>Art. Cerebral Média</div>
                        <div style={styles.row}>
                            <div style={{flex:1}}><span style={styles.label}>IR</span><input name="acmIR" value={data.acmIR} onChange={handleChange} style={styles.input} /></div>
                            <div style={{flex:1}}><span style={styles.label}>PVS</span><input name="acmPVS" value={data.acmPVS} onChange={handleChange} style={styles.input} /></div>
                        </div>
                    </div>
                </div>

                {/* Ducto Venoso */}
                <div style={styles.group}>
                    <div style={styles.groupTitle}>Ducto Venoso</div>
                    <div style={styles.row}>
                        <div style={{flex:1}}><span style={styles.label}>IP</span><input name="dvIP" value={data.dvIP} onChange={handleChange} style={styles.input} /></div>
                        <div style={{flex:1}}>
                            <span style={styles.label}>Onda A</span>
                            <select name="dvOndaA" value={data.dvOndaA} onChange={handleChange} style={styles.input}>
                                <option>Positiva</option>
                                <option>Zero</option>
                                <option>Reversa</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </>
  );
};

export default FormObstetrico;