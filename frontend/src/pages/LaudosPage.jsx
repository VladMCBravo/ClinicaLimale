// src/pages/LaudosPage.jsx
import React, { useState, useCallback } from 'react';
import { FaPrint, FaSave, FaFileAlt, FaSearch, FaSpinner } from 'react-icons/fa';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import apiClient from '../api/axiosConfig';

// Importe suas máscaras aqui
import FormObstetrico from '../components/laudos/FormObstetrico';
// import FormTransvaginal from '../components/laudos/FormTransvaginal'; // Futuro

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

const theme = { primary: '#1C2E4A', secondary: '#C5A47E', accent: '#2E7D32', bg: '#F4F6F8', surface: '#FFFFFF', border: '#E0E0E0' };

const styles = {
  container: { padding: '20px', display: 'flex', gap: '20px', background: theme.bg, minHeight: '100vh', fontFamily: 'Arial, sans-serif' },
  leftCol: { flex: 1, maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '15px' },
  rightCol: { flex: 1, display: 'flex', flexDirection: 'column' },
  card: { background: '#fff', borderRadius: '8px', border: `1px solid ${theme.border}`, padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  header: { fontSize: '16px', fontWeight: 'bold', color: theme.primary, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' },
  button: { background: theme.accent, color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }
};

const LaudosPage = () => {
  // --- ESTADO GERAL (Container) ---
  const [tipoExame, setTipoExame] = useState('OBSTETRICO'); // O seletor de "Máscaras"
  
  const [paciente, setPaciente] = useState(null);
  const [termoBusca, setTermoBusca] = useState('');
  const [pacientesEncontrados, setPacientesEncontrados] = useState([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  
  // Estado do Laudo Final (Recebido dos filhos)
  const [textoFinal, setTextoFinal] = useState('');
  const [dadosEstruturados, setDadosEstruturados] = useState({});
  const [tituloExame, setTituloExame] = useState('');
  const [saving, setSaving] = useState(false);

  // --- CALLBACK QUE RECEBE DADOS DOS FILHOS (MÁSCARAS) ---
  // Essa função é passada para <FormObstetrico />
  const handleFormUpdate = useCallback((dados) => {
      setTextoFinal(dados.texto);
      setDadosEstruturados(dados.dadosEstruturados);
      setTituloExame(dados.tituloExame);
  }, []);

  // --- BUSCA DE PACIENTE ---
  const buscarPacientes = async (termo) => {
      if (termo.length < 3) { setPacientesEncontrados([]); return; }
      setLoadingBusca(true);
      try {
          const res = await apiClient.get('/pacientes/', { params: { search: termo } });
          setPacientesEncontrados(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (e) { console.error(e); } finally { setLoadingBusca(false); }
  };

  // --- SALVAR ---
  const handleSave = async () => {
      if (!paciente) return alert("Selecione um paciente!");
      setSaving(true);
      try {
          await apiClient.post('/laudos/', {
              paciente: paciente.id,
              titulo_exame: tituloExame,
              dados_estruturados: dadosEstruturados,
              texto_laudo: textoFinal,
              status: "FINALIZADO"
          });
          alert("Laudo salvo!");
      } catch (e) { alert("Erro ao salvar."); } finally { setSaving(false); }
  };

  // --- IMPRIMIR ---
  const handlePrint = () => {
      const docDefinition = {
          pageSize: 'A4', pageMargins: [60, 135, 60, 60],
          content: [
              { text: [`PACIENTE: `, { text: paciente ? paciente.nome_completo.toUpperCase() : '___', bold: false }], bold: true, fontSize: 11, margin: [0, 0, 0, 3] },
              { text: [`DATA: `, { text: new Date().toLocaleDateString('pt-BR'), bold: false }], bold: true, fontSize: 11, margin: [0, 0, 0, 25] },
              { text: textoFinal, fontSize: 12, lineHeight: 1.3, alignment: 'justify' },
              { text: '_______________________________', alignment: 'center', margin: [0, 60, 0, 5] },
              { text: 'Dr. Antonio José Orsi Falleiros', alignment: 'center', bold: true, fontSize: 11 }
          ]
      };
      pdfMake.createPdf(docDefinition).open();
  };

  return (
    <div style={styles.container}>
      
      {/* COLUNA ESQUERDA: SELETORES E MÁSCARAS */}
      <div style={styles.leftCol}>
        
        {/* 1. SELETOR DE MÁSCARA (A "Ideia do Turing") */}
        <div style={styles.card}>
            <div style={styles.header}><FaFileAlt /> Tipo de Laudo</div>
            <select 
                value={tipoExame} 
                onChange={(e) => setTipoExame(e.target.value)}
                style={{width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold', color: theme.primary}}
            >
                <option value="OBSTETRICO">Ultrassom Obstétrico / Morfológico</option>
                <option value="TRANSVAGINAL">Ultrassom Transvaginal (Em Breve)</option>
                <option value="ABDOME">Ultrassom Abdome Total (Em Breve)</option>
            </select>
        </div>

        {/* 2. SELETOR DE PACIENTE */}
        <div style={styles.card}>
            <div style={styles.header}><FaSearch /> Paciente</div>
            {paciente ? (
                <div style={{background: '#e8f5e9', padding: '10px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #c8e6c9'}}>
                    <span style={{fontWeight: 'bold', color: '#2e7d32'}}>{paciente.nome_completo}</span>
                    <button onClick={() => setPaciente(null)} style={{border: 'none', background: 'transparent', color: '#d32f2f', fontWeight: 'bold', cursor: 'pointer'}}>X</button>
                </div>
            ) : (
                <div style={{position: 'relative'}}>
                    <input 
                        placeholder="Buscar paciente..." 
                        value={termoBusca}
                        onChange={(e) => { setTermoBusca(e.target.value); buscarPacientes(e.target.value); }}
                        style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}
                    />
                    {pacientesEncontrados.length > 0 && (
                        <div style={{position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ccc', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'}}>
                            {pacientesEncontrados.map(p => (
                                <div key={p.id} onClick={() => { setPaciente(p); setTermoBusca(''); setPacientesEncontrados([]); }} style={{padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee'}}>
                                    {p.nome_completo || p.nome}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* 3. A MÁSCARA DINÂMICA (AQUI ENTRA O COMPONENTE ESPECÍFICO) */}
        {tipoExame === 'OBSTETRICO' && <FormObstetrico onUpdate={handleFormUpdate} />}
        
        {tipoExame === 'TRANSVAGINAL' && (
            <div style={{padding: '20px', textAlign: 'center', color: '#888'}}>
                Máscara Transvaginal em desenvolvimento...
            </div>
        )}

      </div>

      {/* COLUNA DIREITA: PREVIEW E AÇÕES */}
      <div style={styles.rightCol}>
         <div style={{...styles.card, height: '100%', display: 'flex', flexDirection: 'column'}}>
             <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: `2px solid ${theme.secondary}`, paddingBottom: '10px'}}>
                 <span style={{fontWeight: 'bold', color: theme.primary, fontSize: '18px'}}>Laudo Final</span>
                 <div style={{display: 'flex', gap: '10px'}}>
                     <button onClick={handleSave} disabled={saving} style={{...styles.button, background: saving ? '#ccc' : theme.accent}}>
                         {saving ? <FaSpinner className="spin"/> : <FaSave/>} SALVAR
                     </button>
                     <button onClick={handlePrint} style={{...styles.button, background: theme.primary}}>
                         <FaPrint/> IMPRIMIR
                     </button>
                 </div>
             </div>
             <textarea 
                 value={textoFinal} 
                 onChange={(e) => setTextoFinal(e.target.value)}
                 style={{flex: 1, border: 'none', resize: 'none', outline: 'none', fontFamily: 'Times New Roman', fontSize: '16px', lineHeight: '1.5', color: '#000'}}
             />
         </div>
      </div>

    </div>
  );
};

export default LaudosPage;