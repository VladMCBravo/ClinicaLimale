// src/components/laudos/FormObstetrico.jsx
import React, { useState, useEffect } from 'react';
// Combinei os icones em uma linha só para ficar mais limpo
import { FaCalculator, FaCheck, FaRulerCombined, FaHeartbeat, FaBaby, FaChartLine } from 'react-icons/fa';
import GraficosObstetricos from './GraficosObstetricos'; 

// --- ESTILOS DENSOS (PRODUTIVIDADE MÉDICA) ---
const styles = {
  container: { fontFamily: 'Segoe UI, Arial, sans-serif', fontSize: '12px', color: '#333' },
  section: { border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', background: '#fff', overflow: 'hidden' },
  header: { 
    background: '#2E7D32', // Verde médico
    color: 'white', padding: '5px 10px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  body: { padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' },
  group: { display: 'flex', flexDirection: 'column', gap: '2px' },
  label: { fontWeight: '600', fontSize: '11px', color: '#555' },
  input: { 
    padding: '4px', border: '1px solid #aaa', borderRadius: '3px', fontSize: '12px', 
    width: '100%', boxSizing: 'border-box', minWidth: '60px'
  },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px' },
  divider: { height: '1px', background: '#eee', margin: '5px 0' },
  calcResult: { fontWeight: 'bold', color: '#1976D2', fontSize: '12px' },
  alert: { color: '#D32F2F', fontWeight: 'bold' }
};

const FormObstetrico = ({ onUpdate }) => {
  // --- ESTADO 1: CONTROLE VISUAL ---
  // ADICIONADO: Faltava esta linha no seu código anterior
  const [mostrarGraficos, setMostrarGraficos] = useState(false);

  // --- ESTADO 2: DADOS DO LAUDO ---
  const [data, setData] = useState({
    // GERAL
    subtipo: 'OBSTETRICO_2_3_TRI', 
    gemelar: false, 
    
    // DATAÇÃO
    dum: '', usarDum: true,
    igBiometriaDias: 0, 
    
    // BIOMETRIA FETAL (Inputs em mm)
    dbp: '', dof: '', cc: '', ca: '', femur: '', umero: '',
    
    // ÍNDICES 
    indiceCefalico: '', relacaoCcCa: '', relacaoFlAc: '', relacaoFlBpd: '',
    
    // PESO 
    pesoEstimado: '', percentil: '',

    // VITALIDADE
    bcf: '140', ritmo: 'Rítmico', movFetal: true, tonus: 'Normal',

    // MORFOLOGIA 
    morfCranio: true, morfFace: true, morfColuna: true, morfCoracao: true,
    morfTorax: true, morfEstomago: true, morfRins: true, morfBexiga: true,
    morfParedeAbd: true, morfMembros: true, morfGenitalia: true,
    sexo: 'MASCULINO', 

    // ANEXOS
    placentaPosicao: 'Corporal Posterior', placentaGrau: '1', placentaEspessura: '',
    liquido: 'Volume Normal', ila: '', maiorBolso: '',
    cordao: '3 Vasos',

    // DOPPLER
    usarDoppler: false,
    utDirIP: '', utDirIR: '', utDirIncisura: false,
    utEsqIP: '', utEsqIR: '', utEsqIncisura: false,
    umbIP: '', umbIR: '', umbSD: '',
    acmIP: '', acmIR: '', acmPVS: '',
    dvIP: '', dvOndaA: 'Positiva',

    // CONCLUSÃO
    conclusaoNormal: false,
    conclusaoMorfologiaNormal: false,
    conclusaoDopplerNormal: false,
    obsAdicionais: ''
  });

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Helper para pegar a IG numérica para o gráfico
  const getIgNumerica = () => {
    if (!data.dum && !data.igBiometriaDias) return null;
    let diasTotais = 0;

    if (data.usarDum && data.dum) {
        const dumDate = new Date(data.dum + 'T12:00:00');
        const diff = new Date() - dumDate;
        diasTotais = Math.ceil(diff / (1000 * 60 * 60 * 24));
    } else {
         // Placeholder: idealmente viria de um cálculo da média biométrica
         diasTotais = 20 * 7; 
    }
    // Retorna a IG em semanas (ex: 20.5)
    return (diasTotais / 7).toFixed(1); 
  };

  // --- CÁLCULOS AUTOMÁTICOS ---
  useEffect(() => {
    let updates = {};

    // 1. Cálculos de Índices
    const dbp = parseFloat(data.dbp);
    const dof = parseFloat(data.dof);
    const cc = parseFloat(data.cc);
    const ca = parseFloat(data.ca);
    const fl = parseFloat(data.femur);

    if (dbp && dof) updates.indiceCefalico = ((dbp / dof) * 100).toFixed(1);
    if (cc && ca) updates.relacaoCcCa = (cc / ca).toFixed(2);
    if (fl && ca) updates.relacaoFlAc = ((fl / ca) * 100).toFixed(1);

    // 2. Datação (IG e DPP)
    let igTexto = "";
    let dppTexto = "";
    
    if (data.usarDum && data.dum) {
        const dumDate = new Date(data.dum + 'T12:00:00'); 
        const hoje = new Date();
        const diffTime = Math.abs(hoje - dumDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        const semanas = Math.floor(diffDays / 7);
        const dias = diffDays % 7;
        
        const dppDate = new Date(dumDate);
        dppDate.setDate(dumDate.getDate() + 280); 
        
        igTexto = `${semanas} semanas e ${dias} dias`;
        dppTexto = dppDate.toLocaleDateString('pt-BR');
    } else if (data.igBiometriaDias > 0) {
        igTexto = "Compatível com biometria atual";
    }

    // 3. GERAR O LAUDO (TEXTO)
    let t = "";
    const title = data.subtipo === 'MORFOLOGICO' ? 'ULTRASSONOGRAFIA MORFOLÓGICA FETAL' : 'ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLER';
    t += `${title}\n\n`;

    t += `DUM: ${data.dum ? new Date(data.dum+'T12:00:00').toLocaleDateString('pt-BR') : 'Não referida'}. \n`;
    t += `IDADE GESTACIONAL: ${igTexto}. \n`;
    if (dppTexto) t += `DPP (Crono): ${dppTexto}. \n\n`;

    t += `SITUAÇÃO/APRESENTAÇÃO:\nFeto único, em situação longitudinal, apresentação cefálica.\n\n`;

    t += `VITALIDADE FETAL:\n`;
    t += `Batimentos cardiofetais presentes e rítmicos (${data.bcf} bpm). Movimentação fetal ativa. Tônus preservado.\n\n`;

    t += `BIOMETRIA FETAL:\n`;
    t += `DBP: ${data.dbp||'--'} mm | DOF: ${data.dof||'--'} mm | CC: ${data.cc||'--'} mm\n`;
    t += `CA: ${data.ca||'--'} mm | Fêmur: ${data.femur||'--'} mm | Úmero: ${data.umero||'--'} mm\n`;
    if (data.pesoEstimado) t += `Peso Fetal Estimado: ${data.pesoEstimado} g.\n`;
    
    t += `Índices: I.Cefálico: ${updates.indiceCefalico || data.indiceCefalico || '--'}% (N: 70-86) | CC/CA: ${updates.relacaoCcCa || data.relacaoCcCa || '--'} | FL/AC: ${updates.relacaoFlAc || data.relacaoFlAc || '--'}%\n\n`;

    t += `ANATOMIA FETAL:\n`;
    const anatomia = [];
    if (data.morfCranio) anatomia.push("Calota craniana íntegra, cavum do septo pelúcido e ventrículos laterais normais");
    if (data.morfFace) anatomia.push("Face (perfil, órbitas e lábios) sem alterações evidentes");
    if (data.morfColuna) anatomia.push("Coluna vertebral alinhada (cortes sagitais e transversais)");
    if (data.morfCoracao) anatomia.push("Coração com 4 câmaras e vias de saída visibilizadas");
    if (data.morfEstomago) anatomia.push("Estômago e alças intestinais com aspecto habitual");
    if (data.morfRins) anatomia.push("Rins e bexiga tópicos e normais");
    if (data.morfParedeAbd) anatomia.push("Parede abdominal íntegra (inserção do cordão normal)");
    if (data.morfMembros) anatomia.push("Membros superiores e inferiores com segmentos presentes");
    
    t += anatomia.join(". \n") + ".\n";
    t += `Genitália externa compatível com sexo ${data.sexo}.\n\n`;

    t += `PLACENTA E LÍQUIDO:\n`;
    t += `Placenta: ${data.placentaPosicao}, grau ${data.placentaGrau} (Grannum). Espessura: ${data.placentaEspessura||'--'} mm.\n`;
    t += `Líquido Amniótico: ${data.liquido}. ${data.ila ? `ILA: ${data.ila} cm` : ''}.\n`;
    t += `Cordão Umbilical: ${data.cordao}.\n\n`;

    if (data.usarDoppler) {
        t += `ESTUDO DOPPLERFLUXOMÉTRICO:\n`;
        t += `Artérias Uterinas: Espectro de baixa resistência. \n`;
        t += `   - Direita: IP ${data.utDirIP||'--'} | IR ${data.utDirIR||'--'} ${data.utDirIncisura ? '(Com Incisura)' : ''}\n`;
        t += `   - Esquerda: IP ${data.utEsqIP||'--'} | IR ${data.utEsqIR||'--'} ${data.utEsqIncisura ? '(Com Incisura)' : ''}\n`;
        t += `Artéria Umbilical: IP ${data.umbIP||'--'} | IR ${data.umbIR||'--'} (Diástole presente e positiva).\n`;
        t += `Artéria Cerebral Média: IP ${data.acmIP||'--'} | PVS ${data.acmPVS||'--'} cm/s.\n`;
        if (data.dvIP) t += `Ducto Venoso: IP ${data.dvIP} | Onda A: ${data.dvOndaA}.\n`;
        t += `\n`;
    }

    t += `CONCLUSÃO:\n`;
    if (data.conclusaoNormal) t += `- Gestação tópica, feto único, vivo.\n- Biometria compatível com a idade gestacional.\n`;
    if (data.conclusaoMorfologiaNormal) t += `- Estudo morfológico fetal sem alterações evidentes ao método.\n`;
    if (data.conclusaoDopplerNormal && data.usarDoppler) t += `- Hemodinâmica materno-fetal conservada.\n`;
    
    if (data.obsAdicionais) t += `\nOBS: ${data.obsAdicionais}`;

    // Enviar para o Pai
    onUpdate({
        texto: t,
        dadosEstruturados: { ...data, ...updates },
        tituloExame: title
    });

  }, [data, onUpdate]);

  // --- RENDERIZADORES ---

  const SecaoDatacao = () => (
      <div style={styles.section}>
          <div style={styles.header}><span><FaBaby /> Datação e Biometria</span> </div>
          <div style={styles.body}>
              <div style={styles.row}>
                  <div style={styles.group}>
                      <label style={styles.checkboxLabel}>
                          <input type="checkbox" checked={data.usarDum} onChange={(e) => setData(p => ({...p, usarDum: e.target.checked}))} />
                          Usar DUM
                      </label>
                      <input type="date" name="dum" value={data.dum} onChange={handleChange} disabled={!data.usarDum} style={styles.input} />
                  </div>
                  <div style={styles.group}>
                      <label style={styles.label}>Subtipo Exame</label>
                      <select name="subtipo" value={data.subtipo} onChange={handleChange} style={styles.input}>
                          <option value="OBSTETRICO_2_3_TRI">Obstétrico (2º/3º Tri)</option>
                          <option value="MORFOLOGICO">Morfológico</option>
                      </select>
                  </div>
              </div>
              <div style={styles.divider} />
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'10px'}}>
                  <div style={styles.group}><label style={styles.label}>DBP (mm)</label><input name="dbp" value={data.dbp} onChange={handleChange} style={styles.input}/></div>
                  <div style={styles.group}><label style={styles.label}>DOF (mm)</label><input name="dof" value={data.dof} onChange={handleChange} style={styles.input}/></div>
                  <div style={styles.group}><label style={styles.label}>CC (mm)</label><input name="cc" value={data.cc} onChange={handleChange} style={styles.input}/></div>
                  <div style={styles.group}><label style={styles.label}>CA (mm)</label><input name="ca" value={data.ca} onChange={handleChange} style={styles.input}/></div>
                  <div style={styles.group}><label style={styles.label}>Fêmur (mm)</label><input name="femur" value={data.femur} onChange={handleChange} style={styles.input}/></div>
                  <div style={styles.group}><label style={styles.label}>Úmero (mm)</label><input name="umero" value={data.umero} onChange={handleChange} style={styles.input}/></div>
                  
                  <div style={styles.group}><label style={{...styles.label, color:'#1976D2'}}>I. Cefálico</label>
                      <div style={styles.calcResult}>
                          {(data.dbp && data.dof) ? ((data.dbp/data.dof)*100).toFixed(1) : '--'}
                      </div>
                  </div>
                  <div style={styles.group}><label style={{...styles.label, color:'#1976D2'}}>Peso (g)</label>
                      <input name="pesoEstimado" value={data.pesoEstimado} onChange={handleChange} placeholder="Calc. ou Digite" style={{...styles.input, borderColor:'#1976D2'}}/>
                  </div>
              </div>
          </div>
      </div>
  );

  const SecaoMorfologia = () => (
      <div style={styles.section}>
          <div style={styles.header}><span><FaCheck /> Morfologia Fetal (Checklist)</span></div>
          <div style={styles.body}>
              <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px'}}>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="morfCranio" checked={data.morfCranio} onChange={handleChange}/> Crânio/Encéfalo</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="morfFace" checked={data.morfFace} onChange={handleChange}/> Face/Lábios</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="morfColuna" checked={data.morfColuna} onChange={handleChange}/> Coluna Vertebral</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="morfCoracao" checked={data.morfCoracao} onChange={handleChange}/> Coração (4C/Vias)</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="morfTorax" checked={data.morfTorax} onChange={handleChange}/> Tórax/Pulmões</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="morfEstomago" checked={data.morfEstomago} onChange={handleChange}/> Estômago/Intest.</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="morfRins" checked={data.morfRins} onChange={handleChange}/> Rins/Bexiga</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="morfParedeAbd" checked={data.morfParedeAbd} onChange={handleChange}/> Parede Abdominal</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="morfMembros" checked={data.morfMembros} onChange={handleChange}/> Membros Sup/Inf</label>
              </div>
              <div style={styles.divider} />
              <div style={styles.row}>
                  <div style={styles.group}>
                      <label style={styles.label}>Sexo Fetal</label>
                      <select name="sexo" value={data.sexo} onChange={handleChange} style={{...styles.input, fontWeight:'bold'}}>
                          <option>MASCULINO</option>
                          <option>FEMININO</option>
                          <option>NÃO VISUALIZADO</option>
                      </select>
                  </div>
                  <div style={styles.group}>
                       <label style={styles.label}>Genitália Externa</label>
                       <label style={styles.checkboxLabel}><input type="checkbox" name="morfGenitalia" checked={data.morfGenitalia} onChange={handleChange}/> Fenotipicamente normal</label>
                  </div>
              </div>
          </div>
      </div>
  );

  const SecaoAnexos = () => (
      <div style={styles.section}>
          <div style={styles.header}>Placenta e Líquido</div>
          <div style={styles.body}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                  <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                      <label style={styles.label}>Placenta</label>
                      <select name="placentaPosicao" value={data.placentaPosicao} onChange={handleChange} style={styles.input}>
                          <option>Corporal Anterior</option><option>Corporal Posterior</option><option>Fúndica</option><option>Prévia Marginal</option><option>Prévia Total</option>
                      </select>
                      <div style={{display:'flex', gap:'5px'}}>
                          <select name="placentaGrau" value={data.placentaGrau} onChange={handleChange} style={styles.input}>
                              <option value="0">Grau 0</option><option value="1">Grau I</option><option value="2">Grau II</option><option value="3">Grau III</option>
                          </select>
                          <input name="placentaEspessura" placeholder="Espessura (mm)" value={data.placentaEspessura} onChange={handleChange} style={styles.input} />
                      </div>
                  </div>
                  <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                      <label style={styles.label}>Líquido Amniótico</label>
                      <select name="liquido" value={data.liquido} onChange={handleChange} style={styles.input}>
                          <option>Volume Normal</option><option>Oligoâmnio</option><option>Polidrâmnio</option>
                      </select>
                      <div style={{display:'flex', gap:'5px'}}>
                          <input name="ila" placeholder="ILA (cm)" value={data.ila} onChange={handleChange} style={styles.input} />
                          <input name="maiorBolso" placeholder="Maior Bolso" value={data.maiorBolso} onChange={handleChange} style={styles.input} />
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );

  const SecaoDoppler = () => (
      <div style={styles.section}>
          <div style={{...styles.header, background: data.usarDoppler ? '#1565C0' : '#757575'}}>
              <label style={{display:'flex', alignItems:'center', gap:'5px', cursor:'pointer', width:'100%'}}>
                  <input type="checkbox" checked={data.usarDoppler} onChange={(e) => setData(p => ({...p, usarDoppler: e.target.checked}))} />
                  DOPPLERFLUXOMETRIA
              </label>
          </div>
          {data.usarDoppler && (
              <div style={styles.body}>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                      {/* Uterinas */}
                      <div style={{border:'1px solid #eee', padding:'5px', borderRadius:'4px'}}>
                          <label style={styles.label}>Art. Uterina DIREITA</label>
                          <div style={{display:'flex', gap:'5px', marginTop:'3px'}}>
                              <input name="utDirIP" placeholder="IP" value={data.utDirIP} onChange={handleChange} style={styles.input} />
                              <input name="utDirIR" placeholder="IR" value={data.utDirIR} onChange={handleChange} style={styles.input} />
                          </div>
                          <label style={{...styles.checkboxLabel, marginTop:'5px'}}><input type="checkbox" name="utDirIncisura" checked={data.utDirIncisura} onChange={handleChange}/> Com Incisura (Notch)</label>
                      </div>
                      <div style={{border:'1px solid #eee', padding:'5px', borderRadius:'4px'}}>
                          <label style={styles.label}>Art. Uterina ESQUERDA</label>
                          <div style={{display:'flex', gap:'5px', marginTop:'3px'}}>
                              <input name="utEsqIP" placeholder="IP" value={data.utEsqIP} onChange={handleChange} style={styles.input} />
                              <input name="utEsqIR" placeholder="IR" value={data.utEsqIR} onChange={handleChange} style={styles.input} />
                          </div>
                          <label style={{...styles.checkboxLabel, marginTop:'5px'}}><input type="checkbox" name="utEsqIncisura" checked={data.utEsqIncisura} onChange={handleChange}/> Com Incisura (Notch)</label>
                      </div>
                      
                      {/* Fetais */}
                      <div style={{border:'1px solid #eee', padding:'5px', borderRadius:'4px'}}>
                          <label style={styles.label}>Art. Umbilical</label>
                          <div style={{display:'flex', gap:'5px', marginTop:'3px'}}>
                              <input name="umbIP" placeholder="IP" value={data.umbIP} onChange={handleChange} style={styles.input} />
                              <input name="umbIR" placeholder="IR" value={data.umbIR} onChange={handleChange} style={styles.input} />
                          </div>
                      </div>
                      <div style={{border:'1px solid #eee', padding:'5px', borderRadius:'4px'}}>
                          <label style={styles.label}>Art. Cerebral Média</label>
                          <div style={{display:'flex', gap:'5px', marginTop:'3px'}}>
                              <input name="acmIP" placeholder="IP" value={data.acmIP} onChange={handleChange} style={styles.input} />
                              <input name="acmPVS" placeholder="PVS (cm/s)" value={data.acmPVS} onChange={handleChange} style={styles.input} />
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );

  const SecaoConclusao = () => (
      <div style={{...styles.section, borderColor: '#2E7D32'}}>
          <div style={styles.body}>
              <label style={styles.label}>Conclusão Automática</label>
              <div style={styles.group}>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="conclusaoNormal" checked={data.conclusaoNormal} onChange={handleChange}/> Concluir: Gestação Tópica / Biometria Normal</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="conclusaoMorfologiaNormal" checked={data.conclusaoMorfologiaNormal} onChange={handleChange}/> Concluir: Morfologia Normal</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="conclusaoDopplerNormal" checked={data.conclusaoDopplerNormal} onChange={handleChange} disabled={!data.usarDoppler}/> Concluir: Doppler Normal</label>
              </div>
              <div style={{marginTop:'10px'}}>
                  <label style={styles.label}>Observações Adicionais (opcional)</label>
                  <textarea name="obsAdicionais" value={data.obsAdicionais} onChange={handleChange} style={{...styles.input, height:'50px'}} placeholder="Ex: Dificuldade técnica devido a panículo adiposo..." />
              </div>
          </div>
      </div>
  );

  return (
    <div style={styles.container}>
      <SecaoDatacao />
      
      {/* BOTÃO TOGGLE GRAFICOS */}
      <div style={{ margin: '10px 0' }}>
          <button 
              onClick={() => setMostrarGraficos(!mostrarGraficos)}
              style={{
                  background: '#fff', border: '1px solid #1976D2', color: '#1976D2', 
                  padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', 
                  display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold'
              }}
          >
              <FaChartLine /> {mostrarGraficos ? 'Ocultar Gráficos' : 'Visualizar Curvas de Crescimento'}
          </button>

          {mostrarGraficos && (
              <GraficosObstetricos 
                  igSemanas={getIgNumerica()} 
                  peso={data.pesoEstimado} 
                  femur={data.femur} 
              />
          )}
      </div>

      <SecaoAnexos />
      <SecaoMorfologia />
      <SecaoDoppler />
      <SecaoConclusao />
    </div>
  );
};

export default FormObstetrico;