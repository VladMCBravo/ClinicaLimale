// src/components/laudos/FormObstetrico.jsx
import React, { useState, useEffect } from 'react';
import { FaChartLine, FaCheckSquare, FaSquare, FaCalculator } from 'react-icons/fa';

// --- ESTILOS "DESKTOP LIKE" (Denso e Compacto) ---
const styles = {
  container: { fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', fontSize: '11px', color: '#333' },
  section: { border: '1px solid #999', borderRadius: '4px', marginBottom: '8px', background: '#F9F9F9', overflow: 'hidden' },
  header: { 
    background: '#4A55A3', // Azul Turing
    color: 'white', padding: '4px 8px', fontSize: '12px', fontWeight: 'bold', 
    borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
  },
  body: { padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'nowrap' },
  col: { display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 },
  label: { fontWeight: 'bold', marginBottom: '2px', whiteSpace: 'nowrap' },
  input: { 
    padding: '3px 5px', border: '1px solid #AAA', borderRadius: '2px', fontSize: '11px', 
    height: '22px', width: '100%', boxSizing: 'border-box'
  },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', userSelect: 'none' },
  smallInput: { width: '50px', textAlign: 'center' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' },
  grid4: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '5px' },
  graphBox: { border: '1px solid #ccc', background: '#FFF', padding: '5px', display: 'flex', alignItems: 'center', gap: '5px' }
};

const FormObstetrico = ({ onUpdate }) => {
  // --- ESTADO GIGANTE (Cobre todos os campos dos prints) ---
  const [data, setData] = useState({
    // CONTROLE GERAL
    subtipo: 'OBSTETRICO_2_3_TRI', // Opções: 'OBSTETRICO_1_TRI', 'OBSTETRICO_2_3_TRI', 'MORFOLOGICO'
    gemelar: false,

    // DUM / DATAÇÃO
    dum: '', 
    usarDum: true,
    igDum: '', dpp: '',
    
    // 1º TRIMESTRE (Campos Específicos)
    sacoGestacional: true, sgMedida: '', sgLocal: 'Fúndica',
    ccn: '', tn: '', ossoNasal: 'Presente', 
    ductoVenoso: 'Onda A Positiva', tricuspide: 'Normal',
    riscoTrissomia: false, riscoBasal: '1/1000', riscoCorrigido: '',

    // 2º/3º TRIMESTRE (Biometria)
    dbp: '', dof: '', cc: '', ca: '', femur: '', umero: '',
    // Checkboxes "Incluir no cálculo"
    incDbp: true, incDof: true, incCc: true, incCa: true, incFemur: true, incUmero: true,
    
    // BIOMETRIA AVANÇADA (Morfologia)
    cerebelo: '', cisternaMagna: '', ventriculoLat: '', pregaNucal: '',
    ulna: '', tibia: '', fibula: '', radio: '', pe: '',
    
    // PESO E CURVAS
    pesoFetal: '', percentil: '',
    graficoPeso: true, graficoDbp: false, graficoFemur: false, graficoCa: false,

    // VITALIDADE
    bcf: '140', movFetal: true, degluticao: false,

    // MORFOLOGIA (Checklist)
    cranioNormal: true, cerebroNormal: true, faceNormal: true,
    colunaNormal: true, coracaoNormal: true, toraxNormal: true,
    estomagoNormal: true, rinsNormais: true, bexigaNormal: true,
    paredeAbdNormal: true, membrosNormais: true, genitaliaNormal: true, 
    sexoFetal: 'MASCULINO',

    // PLACENTA E LÍQUIDO
    placentaPosicao: 'Corporal Posterior', placentaGrau: '0', placentaEspessura: '',
    liquido: 'Volume Normal', ila: '', mbv: '',

    // DOPPLER
    usarDoppler: false,
    utDirIR: '', utDirIP: '', utDirInc: false,
    utEsqIR: '', utEsqIP: '', utEsqInc: false,
    umbIR: '', umbIP: '', umbSD: '',
    acmIR: '', acmIP: '', acmPVS: '',
    dvIP: '', dvOndaA: 'Positiva',

    // DADOS INICIAIS
    situacao: 'Longitudinal', apresentacao: 'Cefálica', dorso: 'Esquerda'
  });

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // --- CÁLCULOS E GERAÇÃO DE TEXTO ---
  useEffect(() => {
    // 1. Cálculos IG/DPP/Peso
    let igTexto = data.igDum;
    let dppTexto = data.dpp;
    let pesoCalc = data.pesoFetal;

    if (data.dum) {
        const dumDate = new Date(data.dum);
        const diffDays = Math.ceil(Math.abs(new Date() - dumDate) / (1000 * 60 * 60 * 24));
        const dppDate = new Date(dumDate);
        dppDate.setDate(dumDate.getDate() + 280);
        igTexto = `${Math.floor(diffDays / 7)} semanas e ${diffDays % 7} dias`;
        dppTexto = dppDate.toLocaleDateString('pt-BR');
    }

    // Peso Hadlock (Simplificado para visualização)
    if ((data.subtipo === 'OBSTETRICO_2_3_TRI' || data.subtipo === 'MORFOLOGICO') && data.ca && data.femur && !data.pesoFetal) {
        const p = (parseInt(data.ca) * 4.2) + (parseInt(data.femur) * 8.5) + 100;
        if (!isNaN(p)) pesoCalc = p.toFixed(0);
    }

    // 2. Geração do Texto do Laudo
    let t = '';
    
    // Título
    if (data.subtipo === 'OBSTETRICO_1_TRI') t += `ULTRASSONOGRAFIA OBSTÉTRICA DE 1º TRIMESTRE\n\n`;
    else if (data.subtipo === 'MORFOLOGICO') t += `ULTRASSONOGRAFIA MORFOLÓGICA FETAL (2º/3º TRI)\n\n`;
    else t += `ULTRASSONOGRAFIA OBSTÉTRICA (2º/3º TRI)\n\n`;

    // Datação
    if (data.usarDum) {
        t += `DUM: ${data.dum ? new Date(data.dum).toLocaleDateString('pt-BR') : 'Referida'}. IG (DUM): ${igTexto}. DPP: ${dppTexto}.\n`;
    } else {
        t += `Idade Gestacional definida pela biometria fetal atual.\n`;
    }

    // 1º Trimestre Específico
    if (data.subtipo === 'OBSTETRICO_1_TRI') {
        t += `\nSACO GESTACIONAL: Tópico, contornos regulares, ${data.sgLocal.toLowerCase()}.\n`;
        t += `EMBRIÃO: Visualizado. CCN: ${data.ccn || '--'} mm.\n`;
        t += `VITALIDADE: BCF presentes e rítmicos (${data.bcf} bpm).\n`;
        t += `MARCADORES CROMOSSÔMICOS:\n`;
        t += `- Translucência Nucal (TN): ${data.tn || '--'} mm.\n`;
        t += `- Osso Nasal: ${data.ossoNasal}.\n`;
        t += `- Ducto Venoso: ${data.ductoVenoso}.\n`;
        if (data.riscoTrissomia) {
            t += `\nRisco corrigido para Trissomia 21: ${data.riscoCorrigido || 'Calculado'}.\n`;
        }
    } 
    // 2º/3º Trimestre Específico
    else {
        t += `\nSITUAÇÃO: Feto único, ${data.situacao.toLowerCase()}, ${data.apresentacao.toLowerCase()}, dorso à ${data.dorso.toLowerCase()}.\n`;
        t += `VITALIDADE: BCF ${data.bcf} bpm, rítmicos. Movimentação ativa.\n`;
        
        t += `\nBIOMETRIA FETAL:\n`;
        t += `DBP: ${data.dbp||'-'} mm | CC: ${data.cc||'-'} mm | CA: ${data.ca||'-'} mm | Fêmur: ${data.femur||'-'} mm\n`;
        if(pesoCalc) t += `Peso Fetal Estimado: ${pesoCalc} g.\n`;

        t += `\nMORFOLOGIA:\n`;
        let morf = [];
        if(data.cranioNormal) morf.push("Crânio/Encéfalo");
        if(data.faceNormal) morf.push("Face");
        if(data.colunaNormal) morf.push("Coluna");
        if(data.coracaoNormal) morf.push("Coração");
        if(data.estomagoNormal) morf.push("Estômago");
        if(data.rinsNormais) morf.push("Rins");
        if(data.bexigaNormal) morf.push("Bexiga");
        if(data.membrosNormais) morf.push("Membros");
        if (morf.length > 0) t += `Visualizados com aspecto habitual: ${morf.join(', ')}.\n`;

        t += `\nANEXOS:\n`;
        t += `Placenta ${data.placentaPosicao.toLowerCase()}, grau ${data.placentaGrau}. Espessura: ${data.placentaEspessura||'-'} mm.\n`;
        t += `Líquido amniótico: ${data.liquido}. ${data.ila ? `ILA: ${data.ila} cm.` : ''}\n`;
    }

    // Doppler (Comum a todos se ativado)
    if (data.usarDoppler) {
        t += `\nDOPPLERFLUXOMETRIA:\n`;
        t += `Artérias Uterinas: IR Dir ${data.utDirIR||'-'} | IR Esq ${data.utEsqIR||'-'}.\n`;
        t += `Artéria Umbilical: IR ${data.umbIR||'-'} | IP ${data.umbIP||'-'}.\n`;
        t += `Artéria Cerebral Média: IR ${data.acmIR||'-'} | PVS ${data.acmPVS||'-'} cm/s.\n`;
    }

    t += `\nCONCLUSÃO:\n`;
    t += `- Gestação tópica compatível com a idade gestacional.\n`;
    t += `- Exame dentro dos padrões da normalidade para a idade gestacional.\n`;

    // Atualiza o Pai
    onUpdate({ texto: t, dadosEstruturados: { ...data, pesoFetal: pesoCalc }, tituloExame: t.split('\n')[0] });

  }, [data, onUpdate]);

  // --- RENDERIZADORES DE SEÇÃO ---

  const SubtipoSelector = () => (
    <div style={{marginBottom: '10px'}}>
        <label style={styles.label}>Subtipo de Exame</label>
        <select name="subtipo" value={data.subtipo} onChange={handleChange} style={{...styles.input, height: '30px', fontSize: '13px', fontWeight: 'bold'}}>
            <option value="OBSTETRICO_1_TRI">US Obstétrico 1º Trimestre</option>
            <option value="OBSTETRICO_2_3_TRI">US Obstétrico 2º e 3º Trimestres</option>
            <option value="MORFOLOGICO">US Obstétrico Morfológico</option>
        </select>
    </div>
  );

  const DumSection = () => (
    <div style={styles.section}>
        <div style={styles.header}>DUM / DPP / Idade Gestacional</div>
        <div style={styles.body}>
            <div style={styles.row}>
                <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                    <input type="radio" name="usarDum" checked={data.usarDum === true} onChange={() => setData(p => ({...p, usarDum: true}))} /> 
                    <span>Usar a D.U.M.</span>
                </div>
                <input type="date" name="dum" value={data.dum} onChange={handleChange} style={styles.input} disabled={!data.usarDum} />
                <span style={{color: '#666'}}>IG: {data.igDum || '--'}</span>
            </div>
            <div style={styles.row}>
                <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                    <input type="radio" name="usarDum" checked={data.usarDum === false} onChange={() => setData(p => ({...p, usarDum: false}))} /> 
                    <span>D.U.M. Desconhecida</span>
                </div>
            </div>
        </div>
    </div>
  );

  const Biometria1Tri = () => (
    <div style={styles.section}>
        <div style={styles.header}>Biometria / Embrião</div>
        <div style={styles.body}>
            <div style={styles.grid2}>
                <div>
                    <label style={styles.label}>CCN (mm)</label>
                    <input name="ccn" value={data.ccn} onChange={handleChange} style={styles.input} />
                </div>
                <div>
                    <label style={styles.label}>BCF (bpm)</label>
                    <input name="bcf" value={data.bcf} onChange={handleChange} style={styles.input} />
                </div>
            </div>
            <div style={{marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '5px'}}>
                <label style={styles.label}>Marcadores (11-14 sem)</label>
                <div style={styles.grid2}>
                    <div>
                        <span style={styles.label}>Translucência Nucal</span>
                        <input name="tn" value={data.tn} onChange={handleChange} style={styles.input} placeholder="mm" />
                    </div>
                    <div>
                        <span style={styles.label}>Osso Nasal</span>
                        <select name="ossoNasal" value={data.ossoNasal} onChange={handleChange} style={styles.input}>
                            <option>Presente</option><option>Ausente</option><option>Hipoplásico</option>
                        </select>
                    </div>
                    <div>
                        <span style={styles.label}>Ducto Venoso</span>
                        <select name="ductoVenoso" value={data.ductoVenoso} onChange={handleChange} style={styles.input}>
                            <option>Onda A Positiva</option><option>Onda A Reversa</option>
                        </select>
                    </div>
                    <div>
                        <span style={styles.label}>Tricúspide</span>
                        <select name="tricuspide" value={data.tricuspide} onChange={handleChange} style={styles.input}>
                            <option>Normal</option><option>Regurgitação</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );

  const Biometria2Tri = () => (
    <div style={styles.section}>
        <div style={styles.header}>Biometria Fetal</div>
        <div style={styles.body}>
            {/* Lista Principal com Checkboxes "Incluir no cálculo" */}
            <div style={{display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '8px', alignItems: 'center'}}>
                {/* DBP */}
                <input type="checkbox" checked={data.incDbp} onChange={(e) => setData({...data, incDbp: e.target.checked})} />
                <label>DBP</label>
                <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
                    <input name="dbp" value={data.dbp} onChange={handleChange} style={styles.smallInput} /> <span>mm</span>
                </div>

                {/* CC */}
                <input type="checkbox" checked={data.incCc} onChange={(e) => setData({...data, incCc: e.target.checked})} />
                <label>CC</label>
                <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
                    <input name="cc" value={data.cc} onChange={handleChange} style={styles.smallInput} /> <span>mm</span>
                </div>

                {/* CA */}
                <input type="checkbox" checked={data.incCa} onChange={(e) => setData({...data, incCa: e.target.checked})} />
                <label>CA</label>
                <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
                    <input name="ca" value={data.ca} onChange={handleChange} style={styles.smallInput} /> <span>mm</span>
                </div>

                {/* Fêmur */}
                <input type="checkbox" checked={data.incFemur} onChange={(e) => setData({...data, incFemur: e.target.checked})} />
                <label>Fêmur</label>
                <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
                    <input name="femur" value={data.femur} onChange={handleChange} style={styles.smallInput} /> <span>mm</span>
                </div>
            </div>

            {/* Campos Secundários (Sem checkbox de IG, mas comuns) */}
            <div style={{marginTop: '10px', ...styles.grid2}}>
                <div><span style={styles.label}>Cerebelo</span><input name="cerebelo" value={data.cerebelo} onChange={handleChange} style={styles.input} /></div>
                <div><span style={styles.label}>C. Magna</span><input name="cisternaMagna" value={data.cisternaMagna} onChange={handleChange} style={styles.input} /></div>
                <div><span style={styles.label}>Ventrículo</span><input name="ventriculoLat" value={data.ventriculoLat} onChange={handleChange} style={styles.input} /></div>
                <div><span style={styles.label}>Prega Nucal</span><input name="pregaNucal" value={data.pregaNucal} onChange={handleChange} style={styles.input} /></div>
            </div>
        </div>
    </div>
  );

  const PesoGraficos = () => (
      <div style={styles.section}>
          <div style={styles.header}>Peso Fetal & Gráficos</div>
          <div style={styles.body}>
              <div style={{display:'flex', alignItems:'center', gap:'10px', background:'#E3F2FD', padding:'5px', borderRadius:'4px'}}>
                  <input type="checkbox" checked={true} readOnly />
                  <span style={styles.label}>Peso estimado em:</span>
                  <input name="pesoFetal" value={data.pesoFetal} onChange={handleChange} style={{...styles.input, width:'60px', fontWeight:'bold'}} />
                  <span>g</span>
              </div>
              
              <div style={{marginTop: '5px'}}>
                  <label style={styles.label}>Gráficos (Curvas)</label>
                  <div style={styles.grid2}>
                      <div style={styles.graphBox}><FaChartLine color="#666"/> <label style={styles.checkboxRow}><input type="checkbox" checked={data.graficoPeso} onChange={(e)=>setData({...data, graficoPeso: e.target.checked})}/> Peso</label></div>
                      <div style={styles.graphBox}><FaChartLine color="#666"/> <label style={styles.checkboxRow}><input type="checkbox" checked={data.graficoFemur} onChange={(e)=>setData({...data, graficoFemur: e.target.checked})}/> Fêmur</label></div>
                      <div style={styles.graphBox}><FaChartLine color="#666"/> <label style={styles.checkboxRow}><input type="checkbox" checked={data.graficoDbp} onChange={(e)=>setData({...data, graficoDbp: e.target.checked})}/> DBP</label></div>
                      <div style={styles.graphBox}><FaChartLine color="#666"/> <label style={styles.checkboxRow}><input type="checkbox" checked={data.graficoCa} onChange={(e)=>setData({...data, graficoCa: e.target.checked})}/> CA</label></div>
                  </div>
              </div>
          </div>
      </div>
  );

  const Morfologia = () => (
      <div style={styles.section}>
          <div style={styles.header}>Morfologia Fetal</div>
          <div style={styles.body}>
              <div style={styles.grid2}>
                  <label style={styles.checkboxRow}><input type="checkbox" name="cranioNormal" checked={data.cranioNormal} onChange={handleChange}/> Crânio</label>
                  <label style={styles.checkboxRow}><input type="checkbox" name="faceNormal" checked={data.faceNormal} onChange={handleChange}/> Face</label>
                  <label style={styles.checkboxRow}><input type="checkbox" name="colunaNormal" checked={data.colunaNormal} onChange={handleChange}/> Coluna</label>
                  <label style={styles.checkboxRow}><input type="checkbox" name="coracaoNormal" checked={data.coracaoNormal} onChange={handleChange}/> Coração</label>
                  <label style={styles.checkboxRow}><input type="checkbox" name="estomagoNormal" checked={data.estomagoNormal} onChange={handleChange}/> Estômago</label>
                  <label style={styles.checkboxRow}><input type="checkbox" name="rinsNormais" checked={data.rinsNormais} onChange={handleChange}/> Rins</label>
                  <label style={styles.checkboxRow}><input type="checkbox" name="bexigaNormal" checked={data.bexigaNormal} onChange={handleChange}/> Bexiga</label>
                  <label style={styles.checkboxRow}><input type="checkbox" name="membrosNormais" checked={data.membrosNormais} onChange={handleChange}/> Membros</label>
              </div>
              <div style={{borderTop:'1px solid #eee', paddingTop:'5px'}}>
                  <span style={styles.label}>Sexo Fetal</span>
                  <select name="sexoFetal" value={data.sexoFetal} onChange={handleChange} style={styles.input}>
                      <option>MASCULINO</option>
                      <option>FEMININO</option>
                      <option>NÃO VISUALIZADO</option>
                  </select>
              </div>
          </div>
      </div>
  );

  const PlacentaLiquido = () => (
      <div style={styles.section}>
          <div style={styles.header}>Placenta e Líquido</div>
          <div style={styles.body}>
              <div style={styles.row}>
                  <div style={{flex:1}}>
                      <span style={styles.label}>Inserção</span>
                      <select name="placentaPosicao" value={data.placentaPosicao} onChange={handleChange} style={styles.input}>
                          <option>Corporal Posterior</option><option>Corporal Anterior</option><option>Fúndica</option><option>Prévia</option>
                      </select>
                  </div>
                  <div style={{width:'60px'}}>
                      <span style={styles.label}>Espess.</span>
                      <input name="placentaEspessura" value={data.placentaEspessura} onChange={handleChange} style={styles.input} />
                  </div>
              </div>
              <div style={styles.row}>
                  <div style={{flex:1}}>
                      <span style={styles.label}>Grau</span>
                      <select name="placentaGrau" value={data.placentaGrau} onChange={handleChange} style={styles.input}>
                          <option>0</option><option>1</option><option>2</option><option>3</option>
                      </select>
                  </div>
              </div>
              <div style={{borderTop:'1px solid #eee', paddingTop:'5px'}}>
                  <span style={styles.label}>Líquido Amniótico</span>
                  <div style={styles.row}>
                      <select name="liquido" value={data.liquido} onChange={handleChange} style={styles.input}>
                          <option>Volume Normal</option><option>Oligoâmnio</option><option>Polidrâmnio</option>
                      </select>
                      <input name="ila" placeholder="ILA" value={data.ila} onChange={handleChange} style={{...styles.input, width:'50px'}} />
                  </div>
              </div>
          </div>
      </div>
  );

  const DopplerSection = () => (
      <div style={styles.section}>
          <div style={{...styles.header, background: data.usarDoppler ? '#4A55A3' : '#777'}}>
              <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer'}}>
                  <input type="checkbox" checked={data.usarDoppler} onChange={(e) => setData({...data, usarDoppler: e.target.checked})} />
                  Incluir Doppler
              </label>
          </div>
          {data.usarDoppler && (
              <div style={styles.body}>
                  {/* Uterinas */}
                  <div style={{borderBottom:'1px solid #eee', paddingBottom:'5px'}}>
                      <span style={styles.label}>Art. Uterinas</span>
                      <div style={styles.grid2}>
                          <div>
                              <span style={{fontSize:'10px'}}>Direita (IR)</span>
                              <input name="utDirIR" value={data.utDirIR} onChange={handleChange} style={styles.input} />
                          </div>
                          <div>
                              <span style={{fontSize:'10px'}}>Esquerda (IR)</span>
                              <input name="utEsqIR" value={data.utEsqIR} onChange={handleChange} style={styles.input} />
                          </div>
                      </div>
                  </div>
                  
                  {/* Umbilical e ACM */}
                  <div style={styles.grid2}>
                      <div>
                          <span style={styles.label}>Umbilical</span>
                          <input name="umbIR" placeholder="IR" value={data.umbIR} onChange={handleChange} style={styles.input} />
                          <input name="umbIP" placeholder="IP" value={data.umbIP} onChange={handleChange} style={{...styles.input, marginTop:'2px'}} />
                      </div>
                      <div>
                          <span style={styles.label}>Cerebral Média</span>
                          <input name="acmIR" placeholder="IR" value={data.acmIR} onChange={handleChange} style={styles.input} />
                          <input name="acmPVS" placeholder="PVS" value={data.acmPVS} onChange={handleChange} style={{...styles.input, marginTop:'2px'}} />
                      </div>
                  </div>
              </div>
          )}
      </div>
  );

  return (
    <div style={styles.container}>
      <SubtipoSelector />
      <DumSection />
      
      {/* Lógica de Exibição baseada no Subtipo */}
      {data.subtipo === 'OBSTETRICO_1_TRI' ? (
          <>
            <Biometria1Tri />
            {/* 1º Tri geralmente não tem Peso/Morfologia detalhada/Doppler completo */}
          </>
      ) : (
          <>
            <div style={styles.grid2}>
                <div><Biometria2Tri /></div>
                <div><PesoGraficos /></div>
            </div>
            <div style={styles.grid2}>
                <div><Morfologia /></div>
                <div>
                    <PlacentaLiquido />
                    <DopplerSection />
                </div>
            </div>
          </>
      )}
    </div>
  );
};

export default FormObstetrico;