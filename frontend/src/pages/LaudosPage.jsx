// src/pages/LaudosPage.jsx
import React, { useState, useCallback } from 'react';
import { FaPrint, FaSave, FaFileAlt, FaSearch, FaSpinner } from 'react-icons/fa';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import apiClient from '../api/axiosConfig';

// 1. IMPORTANTE: Importar o CSS global dos laudos para aplicar a fonte
import '../components/laudos/Laudos.css'; 

// Importe suas máscaras aqui
import FormObstetrico from '../components/laudos/obstetrico/FormObstetrico';
import FormTransvaginal from '../components/laudos/trasnvaginal/FormTransvaginal';
import FormEcocardiograma from '../components/laudos/ecocardiograma/FormEcocardiograma';

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

const theme = { primary: '#1C2E4A', secondary: '#C5A47E', accent: '#2E7D32', bg: '#F4F6F8', surface: '#FFFFFF', border: '#E0E0E0' };

const styles = {
  // 1. CONTAINER: Aplica a fonte padrão (Segoe UI) e tamanho base (11px) em tudo
  container: { 
    display: 'flex', 
    background: theme.bg, 
    height: '100vh',        
    overflow: 'hidden',     
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", // Fonte do Laudos.css
    fontSize: '11px', // Tamanho padrão compacto
    color: '#333'
  },

  // 2. COLUNA ESQUERDA
  leftCol: { 
    flex: 2,                
    minWidth: '800px',      
    height: '100%',         
    overflowY: 'auto',      
    padding: '10px', // Padding reduzido
    borderRight: `1px solid ${theme.border}`, 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '10px', // Gap reduzido
    background: '#fff'      
  },

  // 3. COLUNA DIREITA
  rightCol: { 
    flex: 1,                
    minWidth: '400px',      
    height: '100%',         
    padding: '10px',
    display: 'flex', 
    flexDirection: 'column',
    overflowY: 'auto',
    background: theme.bg    
  },

  card: { 
    background: '#fff', 
    borderRadius: '4px', 
    border: `1px solid ${theme.border}`, 
    padding: '10px', // Padding interno dos cards reduzido
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)' 
  },
  
  header: { 
    fontSize: '12px', // Reduzido de 16px para 12px (Título dos Cards)
    fontWeight: 'bold', 
    color: theme.primary, 
    marginBottom: '8px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  
  // Inputs e Selects da Barra Lateral (Padronizados com os formulários)
  inputControl: {
    width: '100%',
    padding: '4px 8px', // Padding compacto
    fontSize: '11px',   // Fonte igual ao laudo
    borderRadius: '2px',
    border: '1px solid #aaa',
    height: '24px',     // Altura controlada
    fontWeight: 'bold',
    color: theme.primary,
    outline: 'none'
  },

  button: { 
    background: theme.accent, 
    color: 'white', 
    border: 'none', 
    padding: '6px 12px', // Botão mais compacto
    borderRadius: '3px', 
    cursor: 'pointer', 
    fontWeight: 'bold', 
    fontSize: '11px',
    display: 'flex', 
    alignItems: 'center', 
    gap: '5px' 
  }
};

const LaudosPage = () => {
  const [tipoExame, setTipoExame] = useState('OBSTETRICO'); 
  const [paciente, setPaciente] = useState(null);
  const [termoBusca, setTermoBusca] = useState('');
  const [pacientesEncontrados, setPacientesEncontrados] = useState([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [textoFinal, setTextoFinal] = useState('');
  const [dadosEstruturados, setDadosEstruturados] = useState({});
  const [tituloExame, setTituloExame] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFormUpdate = useCallback((dados) => {
      setTextoFinal(dados.texto);
      setDadosEstruturados(dados.dadosEstruturados);
      setTituloExame(dados.tituloExame);
  }, []);

  const buscarPacientes = async (termo) => {
      if (termo.length < 3) { setPacientesEncontrados([]); return; }
      setLoadingBusca(true);
      try {
          const res = await apiClient.get('/pacientes/', { params: { search: termo } });
          setPacientesEncontrados(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (e) { console.error(e); } finally { setLoadingBusca(false); }
  };

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
      
      {/* COLUNA ESQUERDA */}
      <div style={styles.leftCol}>
        
        {/* CARD TIPO DE LAUDO */}
        <div style={styles.card}>
            <div style={styles.header}><FaFileAlt /> Tipo de Laudo</div>
            <select 
                value={tipoExame} 
                onChange={(e) => setTipoExame(e.target.value)}
                style={styles.inputControl} // Aplicado estilo compacto
            >
                <option value="ECOCARDIOGRAMA">Ecocardiograma (Adulto)</option>
                <option value="OBSTETRICO">Ultrassom Obstétrico / Morfológico</option>
                <option value="TRANSVAGINAL">Ultrassom Transvaginal / Pélvico</option>
                <option value="ABDOME">Ultrassom Abdome Total (Em Breve)</option>
            </select>
        </div>

        {/* CARD PACIENTE */}
        <div style={styles.card}>
            <div style={styles.header}><FaSearch /> Paciente</div>
            {paciente ? (
                <div style={{background: '#e8f5e9', padding: '4px 8px', borderRadius: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #c8e6c9', height: '24px'}}>
                    <span style={{fontWeight: 'bold', color: '#2e7d32', fontSize: '11px'}}>{paciente.nome_completo}</span>
                    <button onClick={() => setPaciente(null)} style={{border: 'none', background: 'transparent', color: '#d32f2f', fontWeight: 'bold', cursor: 'pointer', fontSize:'10px'}}>X</button>
                </div>
            ) : (
                <div style={{position: 'relative'}}>
                    <input 
                        placeholder="Buscar paciente..." 
                        value={termoBusca}
                        onChange={(e) => { setTermoBusca(e.target.value); buscarPacientes(e.target.value); }}
                        style={styles.inputControl} // Aplicado estilo compacto
                    />
                    {pacientesEncontrados.length > 0 && (
                        <div style={{position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ccc', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'}}>
                            {pacientesEncontrados.map(p => (
                                <div key={p.id} onClick={() => { setPaciente(p); setTermoBusca(''); setPacientesEncontrados([]); }} style={{padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '11px'}}>
                                    {p.nome_completo || p.nome}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* MÁSCARAS */}
        <div className="laudo-container"> {/* Garante que o CSS global se aplique aqui dentro */}
            {tipoExame === 'OBSTETRICO' && <FormObstetrico onUpdate={handleFormUpdate} />}
            {tipoExame === 'TRANSVAGINAL' && <FormTransvaginal onUpdate={handleFormUpdate} />}
            {tipoExame === 'ECOCARDIOGRAMA' && <FormEcocardiograma onUpdate={handleFormUpdate} />}
        </div>

      </div>

      {/* COLUNA DIREITA */}
      <div style={styles.rightCol}>
         <div style={{...styles.card, height: '100%', display: 'flex', flexDirection: 'column', padding: '0'}}> 
             {/* Header do Laudo */}
             <div style={{display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: `1px solid ${theme.border}`, background: '#f8f9fa'}}>
                 <span style={{fontWeight: 'bold', color: theme.primary, fontSize: '13px'}}>LAUDO FINAL</span>
                 <div style={{display: 'flex', gap: '8px'}}>
                     <button onClick={handleSave} disabled={saving} style={{...styles.button, background: saving ? '#ccc' : theme.accent}}>
                         {saving ? <FaSpinner className="spin"/> : <FaSave/>} SALVAR
                     </button>
                     <button onClick={handlePrint} style={{...styles.button, background: theme.primary}}>
                         <FaPrint/> IMPRIMIR
                     </button>
                 </div>
             </div>
             
             {/* Área de Texto */}
             <textarea 
                 value={textoFinal} 
                 onChange={(e) => setTextoFinal(e.target.value)}
                 style={{
                     flex: 1, 
                     border: 'none', 
                     padding: '15px',
                     resize: 'none', 
                     outline: 'none', 
                     fontFamily: 'Times New Roman, serif', // Mantém Times para simular impressão
                     fontSize: '13px', // Levemente maior que a UI para leitura, mas compacto
                     lineHeight: '1.4', 
                     color: '#000',
                     background: '#fff'
                 }}
             />
         </div>
      </div>

    </div>
  );
};

export default LaudosPage;