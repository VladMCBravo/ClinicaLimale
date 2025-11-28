// src/pages/LaudosPage.jsx
import React, { useState, useEffect } from 'react';
import { FaPrint, FaCalculator, FaSave, FaFileAlt, FaSearch, FaStethoscope, FaSpinner } from 'react-icons/fa';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import apiClient from '../api/axiosConfig'; // <--- AQUI ESTÁ A CORREÇÃO: Usando seu cliente padrão

// Configuração do PDFMake
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

// --- TEMA LIMALÉ ---
const theme = {
  primary: '#1C2E4A',
  secondary: '#C5A47E',
  accent: '#2E7D32',
  bg: '#F4F6F8',
  surface: '#FFFFFF',
  border: '#E0E0E0'
};

// --- ESTILOS ---
const styles = {
  container: { padding: '20px', display: 'flex', gap: '20px', background: theme.bg, minHeight: '100vh', fontFamily: 'Arial, sans-serif' },
  leftCol: { flex: 1, maxWidth: '650px', overflowY: 'auto', maxHeight: 'calc(100vh - 40px)', paddingRight: '5px' },
  rightCol: { flex: 1, display: 'flex', flexDirection: 'column' },
  section: { border: `1px solid ${theme.border}`, borderRadius: '8px', marginBottom: '15px', background: theme.surface, boxShadow: '0 2px 5px rgba(0,0,0,0.03)' },
  header: { background: theme.primary, color: 'white', padding: '12px 15px', fontSize: '14px', fontWeight: 'bold', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  body: { padding: '20px', display: 'grid', gap: '15px' },
  row: { display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' },
  label: { fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '10px', border: `1px solid ${theme.border}`, borderRadius: '6px', fontSize: '14px', width: '100%', outlineColor: theme.secondary },
  checkboxLabel: { fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#444', padding: '5px 0' },
  button: { background: theme.accent, color: 'white', border: 'none', padding: '12px 25px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  searchBox: { position: 'relative', marginBottom: '0' }
};

const LaudosPage = () => {
  // --- ESTADOS ---
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [pacientesEncontrados, setPacientesEncontrados] = useState([]);
  
  // Estado do Formulário
  const [formData, setFormData] = useState({
    pacienteId: null,      
    pacienteNome: '',      
    medico: 'Dr. Antonio José Orsi Falleiros', // Pode vir do useAuth() futuramente
    dataExame: new Date().toISOString().split('T')[0],
    
    // Dados Clínicos
    dum: '', igDum: '', dpp: '',
    dbp: '', cc: '', ca: '', femur: '', pesoFetal: '', ila: '',
    
    // Morfologia
    cranioNormal: true, faceNormal: true, coracaoNormal: true, colunaNormal: true,
    estomagoNormal: true, rinsNormais: true, bexigaNormal: true, membrosNormais: true,
    
    // Placenta
    placentaPosicao: 'Corporal Posterior', placentaGrau: '0', placentaEspessura: '',
    situacao: 'Longitudinal', apresentacao: 'Cefálica', dorso: 'Esquerda'
  });

  const [textoGerado, setTextoGerado] = useState('');

  // --- 1. BUSCA DE PACIENTES (USANDO apiClient) ---
  useEffect(() => {
    const buscarPacientes = async () => {
        if (termoBusca.length < 3) {
            setPacientesEncontrados([]);
            return;
        }

        setLoading(true);
        try {
            // AQUI ESTÁ A MUDANÇA: Usamos apiClient direto
            // Ele já coloca a BaseURL e o Token sozinho
            const response = await apiClient.get('/pacientes/', {
                params: { search: termoBusca }
            });
            
            // O Axios já devolve o JSON em response.data
            const data = response.data;
            setPacientesEncontrados(Array.isArray(data) ? data : data.results || []);
            
        } catch (error) {
            console.error("Erro ao buscar pacientes:", error);
        } finally {
            setLoading(false);
        }
    };

    const timeoutId = setTimeout(() => buscarPacientes(), 500); 
    return () => clearTimeout(timeoutId);
  }, [termoBusca]);

  const selecionarPaciente = (paciente) => {
      setFormData(prev => ({
          ...prev,
          pacienteId: paciente.id,
          // Garante compatibilidade com o serializer do Paciente
          pacienteNome: paciente.nome_completo || paciente.nome 
      }));
      setTermoBusca('');
      setPacientesEncontrados([]);
  };

  // --- 2. LÓGICA CLÍNICA (Cálculos) ---
  useEffect(() => {
    if (formData.dum) {
      const dumDate = new Date(formData.dum);
      const today = new Date();
      const diffTime = Math.abs(today - dumDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const semanas = Math.floor(diffDays / 7);
      const dias = diffDays % 7;
      
      const dppDate = new Date(dumDate);
      dppDate.setDate(dumDate.getDate() + 280);

      setFormData(prev => ({ 
          ...prev, 
          igDum: `${semanas} semanas e ${dias} dias`, 
          dpp: dppDate.toLocaleDateString('pt-BR') 
      }));
    }
  }, [formData.dum]);

  useEffect(() => {
    const { ca, femur } = formData;
    if (ca && femur) {
        const peso = (parseInt(ca) * 4) + (parseInt(femur) * 10) + 150; 
        if (!isNaN(peso)) setFormData(prev => ({ ...prev, pesoFetal: peso.toFixed(0) }));
    }
  }, [formData.ca, formData.femur]);

  // --- 3. GERADOR DE TEXTO ---
  useEffect(() => {
    let t = `ULTRASSONOGRAFIA OBSTÉTRICA\n\n`;
    t += `DUM: ${formData.dum ? new Date(formData.dum).toLocaleDateString('pt-BR') : 'Não informada'}.\n`;
    if (formData.igDum) t += `Idade Gestacional: ${formData.igDum}. DPP: ${formData.dpp}.\n\n`;
    
    t += `Feto único, situação ${formData.situacao.toLowerCase()}, apresentação ${formData.apresentacao.toLowerCase()}, com dorso à ${formData.dorso.toLowerCase()}.\n`;
    t += `Batimentos cardíacos fetais presentes e rítmicos. Movimentação fetal ativa.\n\n`;

    let morf = [];
    if(formData.cranioNormal) morf.push("Crânio e encéfalo");
    if(formData.faceNormal) morf.push("Face");
    if(formData.coracaoNormal) morf.push("Coração (4 câmaras)");
    if(formData.colunaNormal) morf.push("Coluna vertebral");
    if(formData.estomagoNormal) morf.push("Estômago");
    if(formData.rinsNormais) morf.push("Rins");
    if(formData.bexigaNormal) morf.push("Bexiga");
    if(formData.membrosNormais) morf.push("Membros");
    
    if(morf.length > 0) t += `Análise Morfológica: Visualizados com aspecto ecográfico habitual: ${morf.join(', ')}.\n\n`;

    t += `Biometria Fetal:\n`;
    t += `DBP: ${formData.dbp||'--'} mm | CC: ${formData.cc||'--'} mm | CA: ${formData.ca||'--'} mm | Fêmur: ${formData.femur||'--'} mm.\n`;
    if(formData.pesoFetal) t += `Peso Fetal Estimado: ${formData.pesoFetal} g (+/- 10%).\n\n`;

    t += `Placenta de inserção ${formData.placentaPosicao.toLowerCase()}, grau ${formData.placentaGrau} (Grannum).`;
    if(formData.placentaEspessura) t += ` Espessura: ${formData.placentaEspessura} mm.`;
    t += `\nLíquido amniótico em quantidade normal${formData.ila ? ` (ILA: ${formData.ila} cm)` : ''}.\n\n`;
    
    t += `CONCLUSÃO:\n`;
    t += `- Gestação tópica compatível com a idade gestacional calculada.\n`;
    t += `- Avaliação morfológica básica sem anormalidades evidentes no presente estudo.`;
    
    setTextoGerado(t);
  }, [formData]);

  // --- 4. SALVAR NO BACKEND (USANDO apiClient) ---
  const handleSave = async () => {
    if (!formData.pacienteId) {
        alert("Erro: Selecione um paciente antes de salvar.");
        return;
    }

    setSaving(true);
    
    const payload = {
        paciente: formData.pacienteId,
        titulo_exame: "Ultrassonografia Obstétrica",
        dados_estruturados: formData,
        texto_laudo: textoGerado,
        status: "FINALIZADO"
    };

    try {
        // AQUI ESTÁ A MUDANÇA: apiClient.post direto
        await apiClient.post('/laudos/', payload);
        alert("Laudo salvo com sucesso no prontuário!");
    } catch (error) {
        console.error("Erro ao salvar laudo:", error);
        alert("Erro ao salvar. Verifique se o backend está online.");
    } finally {
        setSaving(false);
    }
  };

  const handlePrint = () => {
    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [60, 135, 60, 60], 
        content: [
            {
                columns: [
                    { width: 'auto', text: 'PACIENTE: ', bold: true, fontSize: 11, color: theme.primary },
                    { width: '*', text: formData.pacienteNome.toUpperCase(), fontSize: 11 }
                ], margin: [0, 0, 0, 3]
            },
            {
                columns: [
                    { width: 'auto', text: 'DATA: ', bold: true, fontSize: 11, color: theme.primary },
                    { width: '*', text: new Date(formData.dataExame).toLocaleDateString('pt-BR'), fontSize: 11 }
                ], margin: [0, 0, 0, 25]
            },
            { text: textoGerado, fontSize: 12, lineHeight: 1.3, alignment: 'justify' },
            { text: '_______________________________', alignment: 'center', margin: [0, 60, 0, 5] },
            { text: formData.medico, alignment: 'center', bold: true, fontSize: 11 }
        ],
        defaultStyle: { font: 'Roboto' }
    };
    pdfMake.createPdf(docDefinition).open();
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <div style={styles.container}>
      
      {/* --- COLUNA ESQUERDA: INPUTS --- */}
      <div style={styles.leftCol}>
        
        {/* BUSCA DE PACIENTE */}
        <div style={styles.section}>
             <div style={styles.header}>
                 <span>1. Selecionar Paciente</span>
                 <FaSearch />
             </div>
             <div style={{padding: '15px'}}>
                 {formData.pacienteNome ? (
                     <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#e8f5e9', padding: '10px', borderRadius: '4px', border: '1px solid #c8e6c9'}}>
                         <span style={{fontWeight: 'bold', color: '#2e7d32'}}>{formData.pacienteNome}</span>
                         <button onClick={() => setFormData(prev => ({...prev, pacienteNome: '', pacienteId: null}))} style={{border: 'none', background: 'transparent', color: '#d32f2f', cursor: 'pointer', fontWeight: 'bold'}}>Trocar</button>
                     </div>
                 ) : (
                     <div style={styles.searchBox}>
                         <input 
                            placeholder="Busque por Nome..." 
                            value={termoBusca}
                            onChange={e => setTermoBusca(e.target.value)}
                            style={{...styles.input, paddingLeft: '35px'}}
                         />
                         <FaSearch style={{position: 'absolute', left: '10px', top: '10px', color: '#aaa'}} />
                         {loading && <FaSpinner className="spin" style={{position: 'absolute', right: '10px', top: '10px', color: theme.primary}} />}
                         
                         {pacientesEncontrados.length > 0 && (
                             <div style={{position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ccc', borderRadius: '4px', zIndex: 100, boxShadow: '0 4px 10px rgba(0,0,0,0.1)'}}>
                                 {pacientesEncontrados.map(p => (
                                     <div 
                                        key={p.id} 
                                        onClick={() => selecionarPaciente(p)}
                                        style={{padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee'}}
                                        onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                                        onMouseLeave={(e) => e.target.style.background = 'white'}
                                     >
                                         <strong>{p.nome_completo || p.nome}</strong>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </div>
                 )}
             </div>
        </div>

        {/* DADOS CLÍNICOS */}
        <div style={styles.section}>
          <div style={styles.header}><span>Biometria & Datas</span><FaCalculator/></div>
          <div style={styles.body}>
            <div style={styles.row}>
                <div style={{flex: 1}}><div style={styles.label}>DUM</div><input type="date" name="dum" value={formData.dum} onChange={handleChange} style={styles.input} /></div>
                <div style={{flex: 1}}><div style={styles.label}>IG (Auto)</div><input value={formData.igDum} readOnly style={{...styles.input, background: '#eee'}} /></div>
            </div>
            <div style={{...styles.row, marginTop: '10px'}}>
                <div style={{flex: 1}}><div style={styles.label}>DBP</div><input name="dbp" value={formData.dbp} onChange={handleChange} style={styles.input} /></div>
                <div style={{flex: 1}}><div style={styles.label}>Fêmur</div><input name="femur" value={formData.femur} onChange={handleChange} style={styles.input} /></div>
                <div style={{flex: 1}}><div style={styles.label}>Peso (g)</div><input name="pesoFetal" value={formData.pesoFetal} style={{...styles.input, fontWeight: 'bold', color: theme.primary}} /></div>
            </div>
          </div>
        </div>

        <div style={styles.section}>
           <div style={styles.header}><span>Morfologia (Normalidade)</span><FaStethoscope/></div>
           <div style={styles.body}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr'}}>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="cranioNormal" checked={formData.cranioNormal} onChange={handleChange}/> Crânio/Encéfalo</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="faceNormal" checked={formData.faceNormal} onChange={handleChange}/> Face</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="coracaoNormal" checked={formData.coracaoNormal} onChange={handleChange}/> Coração</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="colunaNormal" checked={formData.colunaNormal} onChange={handleChange}/> Coluna</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="estomagoNormal" checked={formData.estomagoNormal} onChange={handleChange}/> Estômago</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="rinsNormais" checked={formData.rinsNormais} onChange={handleChange}/> Rins</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="bexigaNormal" checked={formData.bexigaNormal} onChange={handleChange}/> Bexiga</label>
                  <label style={styles.checkboxLabel}><input type="checkbox" name="membrosNormais" checked={formData.membrosNormais} onChange={handleChange}/> Membros</label>
              </div>
           </div>
        </div>
      </div>

      {/* --- COLUNA DIREITA --- */}
      <div style={styles.rightCol}>
        <div style={styles.section}>
            <div style={{...styles.header, background: '#fff', color: theme.primary, borderBottom: `2px solid ${theme.secondary}`}}>
                <span style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <FaFileAlt size={20} /> LAUDO FINAL
                </span>
                <div style={{display: 'flex', gap: '10px'}}>
                    <button onClick={handleSave} disabled={saving} style={{...styles.button, background: saving ? '#ccc' : theme.primary}}>
                        {saving ? <FaSpinner className="spin"/> : <FaSave />} 
                        {saving ? 'SALVANDO...' : 'SALVAR'}
                    </button>
                    <button onClick={handlePrint} style={styles.button}>
                        <FaPrint /> IMPRIMIR
                    </button>
                </div>
            </div>
            
            <textarea 
                value={textoGerado}
                onChange={(e) => setTextoGerado(e.target.value)}
                style={{
                    width: '100%', height: 'calc(100vh - 180px)', padding: '30px',
                    border: 'none', resize: 'none', outline: 'none',
                    fontFamily: 'Times New Roman, serif', fontSize: '16px', lineHeight: '1.5',
                    color: '#000'
                }}
            />
        </div>
      </div>

    </div>
  );
};

export default LaudosPage;