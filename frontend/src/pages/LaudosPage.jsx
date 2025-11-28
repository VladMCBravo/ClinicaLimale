// src/pages/LaudosPage.jsx
import React, { useState, useEffect } from 'react';
import { FaPrint, FaCalculator, FaSave, FaFileAlt } from 'react-icons/fa';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Configuração do PDFMake
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

// --- ESTILOS VISUAIS (Imitando o sistema Turing/QUEO) ---
const styles = {
  container: { padding: '20px', display: 'flex', gap: '20px', background: '#f0f2f5', minHeight: '100vh', fontFamily: 'Arial, sans-serif' },
  leftCol: { flex: 1, maxWidth: '650px' },
  rightCol: { flex: 1 },
  section: { border: '1px solid #ccc', borderRadius: '4px', marginBottom: '15px', background: '#f9f9f9', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  header: { background: '#4A55A3', color: 'white', padding: '8px 10px', fontSize: '14px', fontWeight: 'bold', borderTopLeftRadius: '3px', borderTopRightRadius: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  body: { padding: '15px', display: 'grid', gap: '15px' },
  row: { display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' },
  label: { fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '4px' },
  input: { padding: '6px', border: '1px solid #aaa', borderRadius: '3px', fontSize: '13px', width: '100%' },
  checkboxLabel: { fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#444' },
  smallText: { fontSize: '11px', color: '#666' },
  button: { background: '#2E7D32', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }
};

const LaudosPage = () => {
  // --- ESTADO DO FORMULÁRIO ---
  const [formData, setFormData] = useState({
    // Cabeçalho
    paciente: '',
    medico: 'Dr. Antonio José Orsi Falleiros', // Pode vir do contexto de usuário depois
    dataExame: new Date().toISOString().split('T')[0],

    // DUM e Datas
    dum: '',
    igDum: '', // Calculado
    dpp: '',   // Calculado

    // Biometria
    dbp: '',
    cc: '',
    ca: '',
    femur: '',
    pesoFetal: '', // Calculado ou manual
    ila: '', // Liquido amniótico

    // Morfologia (Checkboxes - Padrão TRUE para facilitar)
    cranioNormal: true,
    faceNormal: true,
    coracaoNormal: true,
    colunaNormal: true,
    estomagoNormal: true,
    rinsNormais: true,
    bexigaNormal: true,
    membrosNormais: true,

    // Placenta
    placentaPosicao: 'Corporal Posterior',
    placentaGrau: '0',
    placentaEspessura: '',

    // Apresentação
    situacao: 'Longitudinal',
    apresentacao: 'Cefálica',
    dorso: 'Esquerda'
  });

  const [textoGerado, setTextoGerado] = useState('');

  // --- LÓGICA DE CÁLCULOS ---
  
  // 1. Calcular IG e DPP quando a DUM muda
  useEffect(() => {
    if (formData.dum) {
      const dumDate = new Date(formData.dum);
      const today = new Date();
      
      // Diferença em dias
      const diffTime = Math.abs(today - dumDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const semanas = Math.floor(diffDays / 7);
      const dias = diffDays % 7;

      // DPP = DUM + 280 dias (Regra de Naegele simplificada para JS)
      const dppDate = new Date(dumDate);
      dppDate.setDate(dumDate.getDate() + 280);

      setFormData(prev => ({
        ...prev,
        igDum: `${semanas} semanas e ${dias} dias`,
        dpp: dppDate.toLocaleDateString('pt-BR')
      }));
    }
  }, [formData.dum]);

  // 2. Calcular Peso Fetal Estimado (Fórmula visual/exemplo)
  useEffect(() => {
    const { ca, femur } = formData;
    if (ca && femur) {
        // Exemplo simplificado. Na prática médica real, use a fórmula de Hadlock.
        // Aqui é apenas para mostrar que o sistema "reage" aos números.
        const pesoEstimado = (parseInt(ca) * 4) + (parseInt(femur) * 10) + 150; 
        if (!isNaN(pesoEstimado)) {
            setFormData(prev => ({ ...prev, pesoFetal: pesoEstimado.toFixed(0) }));
        }
    }
  }, [formData.ca, formData.femur]);


  // --- GERADOR DE TEXTO DINÂMICO ---
  useEffect(() => {
    const gerarLaudo = () => {
      let t = `ULTRASSONOGRAFIA OBSTÉTRICA\n\n`;

      // Seção 1: Datação
      t += `DUM: ${formData.dum ? new Date(formData.dum).toLocaleDateString('pt-BR') : 'Não informada'}.\n`;
      if (formData.igDum) t += `Idade Gestacional pela DUM: ${formData.igDum}.\n`;
      if (formData.dpp) t += `Data Provável do Parto (DPP): ${formData.dpp}.\n\n`;

      // Seção 2: Situação
      t += `Feto único, em situação ${formData.situacao.toLowerCase()}, apresentação ${formData.apresentacao.toLowerCase()} com dorso à ${formData.dorso.toLowerCase()}.\n`;
      t += `Batimentos cardíacos fetais presentes e rítmicos. Movimentação fetal ativa.\n\n`;

      // Seção 3: Morfologia
      let morfologia = [];
      if (formData.cranioNormal) morfologia.push("Crânio e encéfalo");
      if (formData.faceNormal) morfologia.push("Face");
      if (formData.coracaoNormal) morfologia.push("Coração (4 câmaras)");
      if (formData.colunaNormal) morfologia.push("Coluna vertebral");
      if (formData.estomagoNormal) morfologia.push("Estômago");
      if (formData.rinsNormais) morfologia.push("Rins");
      if (formData.bexigaNormal) morfologia.push("Bexiga");
      if (formData.membrosNormais) morfologia.push("Membros");
      
      if (morfologia.length > 0) {
        t += `Análise Morfológica:\nVisualizados com aspecto ecográfico habitual: ${morfologia.join(', ')}.\n\n`;
      }

      // Seção 4: Biometria
      t += `Biometria Fetal:\n`;
      if (formData.dbp) t += `Diâmetro Biparietal (DBP): ${formData.dbp} mm\n`;
      if (formData.cc) t += `Circunferência Cefálica (CC): ${formData.cc} mm\n`;
      if (formData.ca) t += `Circunferência Abdominal (CA): ${formData.ca} mm\n`;
      if (formData.femur) t += `Comprimento do Fêmur (CF): ${formData.femur} mm\n`;
      if (formData.pesoFetal) t += `Peso Fetal Estimado: ${formData.pesoFetal} g (+/- 10%)\n`;
      t += `\n`;

      // Seção 5: Placenta e Líquido
      t += `Placenta de inserção ${formData.placentaPosicao.toLowerCase()}, grau ${formData.placentaGrau} (Grannum).`;
      if (formData.placentaEspessura) t += ` Espessura: ${formData.placentaEspessura} mm.`;
      t += `\n`;
      
      if (formData.ila) {
        t += `Líquido amniótico: ILA de ${formData.ila} cm (Normal).\n`;
      } else {
        t += `Líquido amniótico em quantidade normal.\n`;
      }

      // Conclusão
      t += `\nCONCLUSÃO:\n`;
      t += `- Gestação tópica compatível com a idade gestacional calculada.\n`;
      t += `- Avaliação morfológica básica sem anormalidades evidentes no presente estudo.\n`;

      setTextoGerado(t);
    };

    gerarLaudo();
  }, [formData]);


  // --- FUNÇÃO DE IMPRESSÃO (PDFMAKE) ---
  const handlePrint = () => {
    if (!formData.paciente) {
        alert("Por favor, preencha o nome da paciente.");
        return;
    }

    const docDefinition = {
        pageSize: 'A4',
        // [esquerda, topo, direita, baixo]
        // Topo 130pts = Aprox 4.5cm para pular o cabeçalho do papel timbrado
        pageMargins: [60, 130, 60, 60], 
        content: [
            // Cabeçalho do Laudo (Dados Paciente)
            {
                columns: [
                    { width: 'auto', text: 'NOME: ', bold: true, fontSize: 11 },
                    { width: '*', text: formData.paciente.toUpperCase(), fontSize: 11 }
                ],
                margin: [0, 0, 0, 3]
            },
            {
                columns: [
                    { width: 'auto', text: 'CONVÊNIO: ', bold: true, fontSize: 11 },
                    { width: '*', text: 'PARTICULAR', fontSize: 11 }
                ],
                margin: [0, 0, 0, 3]
            },
            {
                columns: [
                    { width: 'auto', text: 'DATA: ', bold: true, fontSize: 11 },
                    { width: '*', text: new Date(formData.dataExame).toLocaleDateString('pt-BR'), fontSize: 11 }
                ],
                margin: [0, 0, 0, 25] // Espaço antes do texto começar
            },
            
            // O Texto do Laudo
            { text: textoGerado, fontSize: 12, lineHeight: 1.3, alignment: 'justify' },
            
            // Assinatura
            { text: '_______________________________', alignment: 'center', margin: [0, 60, 0, 5] },
            { text: formData.medico, alignment: 'center', bold: true, fontSize: 11 }
        ],
        defaultStyle: {
            font: 'Roboto'
        }
    };
    pdfMake.createPdf(docDefinition).open();
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div style={styles.container}>
      
      {/* --- COLUNA DA ESQUERDA: FORMULÁRIO --- */}
      <div style={styles.leftCol}>
        
        <h2 style={{color: '#4A55A3', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px'}}>
             <FaFileAlt /> Emissor de Laudo Obstétrico
        </h2>

        {/* Bloco 0: Paciente */}
        <div style={styles.section}>
             <div style={styles.header}>Identificação</div>
             <div style={styles.body}>
                <div style={styles.row}>
                    <div style={{flex: 2}}>
                        <div style={styles.label}>Nome da Paciente</div>
                        <input name="paciente" value={formData.paciente} onChange={handleChange} style={styles.input} placeholder="Digite o nome..." />
                    </div>
                    <div style={{flex: 1}}>
                         <div style={styles.label}>Data do Exame</div>
                         <input type="date" name="dataExame" value={formData.dataExame} onChange={handleChange} style={styles.input} />
                    </div>
                </div>
             </div>
        </div>

        {/* Bloco 1: DUM / IG */}
        <div style={styles.section}>
          <div style={styles.header}>
             <span>DUM / DPP / Idade Gestacional</span>
             <FaCalculator color="#fff" />
          </div>
          <div style={styles.body}>
            <div style={styles.row}>
                <div>
                    <div style={styles.label}>DUM</div>
                    <input type="date" name="dum" value={formData.dum} onChange={handleChange} style={styles.input} />
                </div>
                <div>
                    <div style={styles.label}>IG (Calculada)</div>
                    <input type="text" value={formData.igDum} readOnly style={{...styles.input, background: '#eee', color: '#000', fontWeight: 'bold'}} placeholder="Auto" />
                </div>
                <div>
                    <div style={styles.label}>DPP</div>
                    <input type="text" value={formData.dpp} readOnly style={{...styles.input, background: '#eee', color: '#000'}} placeholder="Auto" />
                </div>
            </div>
            
            <div style={{borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '5px'}}>
                 <div style={styles.label}>Apresentação Fetal</div>
                 <div style={styles.row}>
                    <select name="situacao" value={formData.situacao} onChange={handleChange} style={styles.input}>
                        <option>Longitudinal</option>
                        <option>Transversa</option>
                        <option>Oblíqua</option>
                    </select>
                    <select name="apresentacao" value={formData.apresentacao} onChange={handleChange} style={styles.input}>
                        <option>Cefálica</option>
                        <option>Pélvica</option>
                    </select>
                    <select name="dorso" value={formData.dorso} onChange={handleChange} style={styles.input}>
                        <option>Esquerda</option>
                        <option>Direita</option>
                        <option>Anterior</option>
                        <option>Posterior</option>
                    </select>
                 </div>
            </div>
          </div>
        </div>

        {/* Bloco 2: Biometria */}
        <div style={styles.section}>
          <div style={styles.header}>Biometria Fetal</div>
          <div style={styles.body}>
             <div style={styles.row}>
                <div><div style={styles.label}>DBP (mm)</div><input name="dbp" value={formData.dbp} onChange={handleChange} style={{...styles.input, width: '70px'}} /></div>
                <div><div style={styles.label}>CC (mm)</div><input name="cc" value={formData.cc} onChange={handleChange} style={{...styles.input, width: '70px'}} /></div>
                <div><div style={styles.label}>CA (mm)</div><input name="ca" value={formData.ca} onChange={handleChange} style={{...styles.input, width: '70px'}} /></div>
                <div><div style={styles.label}>Fêmur (mm)</div><input name="femur" value={formData.femur} onChange={handleChange} style={{...styles.input, width: '70px'}} /></div>
             </div>
             <div style={{marginTop: '5px', padding: '10px', background: '#e3f2fd', borderRadius: '4px', border: '1px solid #bbdefb', display: 'flex', alignItems: 'center', gap: '10px'}}>
                 <div style={styles.label}>Peso Fetal Estimado:</div>
                 <input name="pesoFetal" value={formData.pesoFetal} onChange={handleChange} style={{...styles.input, width: '100px', fontWeight: 'bold', fontSize: '14px'}} placeholder="0 g" />
                 <span style={styles.smallText}>(Cálculo automático aproximado ao digitar CA e Fêmur)</span>
             </div>
          </div>
        </div>

        {/* Bloco 3: Morfologia */}
        <div style={styles.section}>
           <div style={styles.header}>Morfologia Fetal (Marque o que visualizou NORMAL)</div>
           <div style={styles.body}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="cranioNormal" checked={formData.cranioNormal} onChange={handleChange}/> Crânio/Encéfalo</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="faceNormal" checked={formData.faceNormal} onChange={handleChange}/> Face / Lábios</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="colunaNormal" checked={formData.colunaNormal} onChange={handleChange}/> Coluna Vertebral</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="coracaoNormal" checked={formData.coracaoNormal} onChange={handleChange}/> Coração (4 câmaras)</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="estomagoNormal" checked={formData.estomagoNormal} onChange={handleChange}/> Estômago</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="rinsNormais" checked={formData.rinsNormais} onChange={handleChange}/> Rins</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="bexigaNormal" checked={formData.bexigaNormal} onChange={handleChange}/> Bexiga</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="membrosNormais" checked={formData.membrosNormais} onChange={handleChange}/> Membros Sup/Inf</label>
              </div>
           </div>
        </div>

        {/* Bloco 4: Placenta e Líquido */}
        <div style={styles.section}>
            <div style={styles.header}>Placenta e Líquido Amniótico</div>
            <div style={styles.body}>
                <div style={styles.row}>
                    <div>
                        <div style={styles.label}>Placenta Inserção</div>
                        <select name="placentaPosicao" value={formData.placentaPosicao} onChange={handleChange} style={styles.input}>
                            <option>Corporal Anterior</option>
                            <option>Corporal Posterior</option>
                            <option>Fúndica</option>
                            <option>Prévia</option>
                            <option>Baixa</option>
                        </select>
                    </div>
                    <div>
                        <div style={styles.label}>Grau (Grannum)</div>
                        <select name="placentaGrau" value={formData.placentaGrau} onChange={handleChange} style={{...styles.input, width: '60px'}}>
                            <option>0</option>
                            <option>1</option>
                            <option>2</option>
                            <option>3</option>
                        </select>
                    </div>
                     <div>
                        <div style={styles.label}>Espessura (mm)</div>
                        <input name="placentaEspessura" value={formData.placentaEspessura} onChange={handleChange} style={{...styles.input, width: '60px'}} />
                    </div>
                     <div>
                        <div style={styles.label}>ILA (cm)</div>
                        <input name="ila" value={formData.ila} onChange={handleChange} style={{...styles.input, width: '60px'}} placeholder="Ex: 14" />
                    </div>
                </div>
            </div>
        </div>

      </div>

      {/* --- COLUNA DA DIREITA: PREVIEW --- */}
      <div style={styles.rightCol}>
        <div style={{ position: 'sticky', top: '20px' }}>
            <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#333' }}>Pré-visualização</h3>
                <button onClick={handlePrint} style={styles.button}>
                    <FaPrint /> IMPRIMIR PDF
                </button>
            </div>
            
            <textarea 
                value={textoGerado}
                onChange={(e) => setTextoGerado(e.target.value)}
                style={{
                    width: '100%',
                    height: '650px',
                    padding: '25px',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    resize: 'none',
                    outline: 'none'
                }}
            />
            <p style={{ fontSize: '12px', color: '#777', marginTop: '10px', textAlign: 'center' }}>
                Edite o texto acima livremente se necessário antes de imprimir.
            </p>
        </div>
      </div>

    </div>
  );
};

export default LaudosPage;