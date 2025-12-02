// src/pages/LaudosPage.jsx
import React, { useState, useCallback } from 'react';
import { FaPrint, FaSave, FaFileAlt, FaSearch, FaSpinner, FaCamera, FaTrash } from 'react-icons/fa'; // Adicionado FaCamera e FaTrash
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import apiClient from '../api/axiosConfig';

import '../components/laudos/Laudos.css'; 

import FormObstetrico from '../components/laudos/obstetrico/FormObstetrico';
import FormTransvaginal from '../components/laudos/trasnvaginal/FormTransvaginal';
import FormEcocardiograma from '../components/laudos/ecocardiograma/FormEcocardiograma';
import FormDopplerCarotidas from '../components/laudos/carotidas/FormDopplerCarotidas';

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

const theme = { primary: '#1C2E4A', secondary: '#C5A47E', accent: '#2E7D32', bg: '#F4F6F8', surface: '#FFFFFF', border: '#E0E0E0' };

const styles = {
  container: { 
    display: 'flex', 
    background: theme.bg, 
    height: '100vh',        
    overflow: 'hidden',     
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", 
    fontSize: '11px', 
    color: '#333'
  },
  leftCol: { 
    flex: 2,                
    minWidth: '800px',      
    height: '100%',         
    overflowY: 'auto',      
    padding: '10px', 
    borderRight: `1px solid ${theme.border}`, 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '10px', 
    background: '#fff'      
  },
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
    padding: '10px', 
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)' 
  },
  header: { 
    fontSize: '12px', 
    fontWeight: 'bold', 
    color: theme.primary, 
    marginBottom: '8px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  inputControl: {
    width: '100%',
    padding: '4px 8px', 
    fontSize: '11px',   
    borderRadius: '2px',
    border: '1px solid #aaa',
    height: '24px',     
    fontWeight: 'bold',
    color: theme.primary,
    outline: 'none'
  },
  button: { 
    background: theme.accent, 
    color: 'white', 
    border: 'none', 
    padding: '6px 12px', 
    borderRadius: '3px', 
    cursor: 'pointer', 
    fontWeight: 'bold', 
    fontSize: '11px',
    display: 'flex', 
    alignItems: 'center', 
    gap: '5px' 
  },
  // Estilo para a grade de preview de imagens
  imagePreviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '5px',
    marginTop: '10px',
    padding: '5px',
    background: '#eee',
    borderRadius: '4px'
  },
  thumbContainer: {
    position: 'relative',
    aspectRatio: '1',
    overflow: 'hidden',
    borderRadius: '3px',
    border: '1px solid #ccc'
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

  // NOVO: Estado para armazenar as imagens em Base64
  const [imagens, setImagens] = useState([]);

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

  // NOVO: Função para ler arquivos do computador e converter para Base64
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const promises = files.map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    });

    Promise.all(promises).then(base64Images => {
        setImagens(prev => [...prev, ...base64Images]);
    }).catch(err => console.error("Erro ao ler imagens", err));
  };

  const removeImage = (index) => {
    setImagens(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
      if (!paciente) return alert("Selecione um paciente!");
      setSaving(true);
      try {
          // NOTA: Você precisará ajustar seu backend para aceitar um array de imagens (base64 ou multipart)
          await apiClient.post('/laudos/', {
              paciente: paciente.id,
              titulo_exame: tituloExame,
              dados_estruturados: dadosEstruturados,
              texto_laudo: textoFinal,
              imagens_anexas: imagens, // Envia as imagens
              status: "FINALIZADO"
          });
          alert("Laudo salvo!");
      } catch (e) { alert("Erro ao salvar."); } finally { setSaving(false); }
  };

  const handlePrint = () => {
      // 1. Configuração do Papel Timbrado
      // Margens: [Esquerda, Topo, Direita, Base]
      // Topo 128pt = ~4.5cm para pular o logo
      const pageMargins = [60, 128, 60, 60]; 
      
      // 2. Preparar Grade de Imagens (2 Colunas)
      const imagesContent = [];
      if (imagens.length > 0) {
        // Título da seção de fotos com menos margem superior
        imagesContent.push({ text: 'DOCUMENTAÇÃO FOTOGRÁFICA', style: 'subheader', margin: [0, 10, 0, 5] });
        
        for (let i = 0; i < imagens.length; i += 2) {
            const row = {
                columns: [
                    // Ajustei a largura para 225 e margens menores para caber melhor
                    { image: imagens[i], width: 225, margin: [0, 2, 0, 10] }, 
                    imagens[i + 1] ? { image: imagens[i + 1], width: 225, margin: [0, 2, 0, 10] } : null 
                ],
                columnGap: 10
            };
            imagesContent.push(row);
        }
      }

      const docDefinition = {
          pageSize: 'A4', 
          pageMargins: pageMargins,
          content: [
              // --- CABEÇALHO DO PACIENTE ---
              {
                columns: [
                    { width: 'auto', text: 'PACIENTE: ', bold: true, fontSize: 11 },
                    { width: '*', text: paciente ? paciente.nome_completo.toUpperCase() : '___', bold: false, fontSize: 11 }
                ],
                margin: [0, 0, 0, 3]
              },
              {
                columns: [
                    { width: 'auto', text: 'DATA: ', bold: true, fontSize: 11 },
                    { width: '*', text: new Date().toLocaleDateString('pt-BR'), bold: false, fontSize: 11 }
                ],
                margin: [0, 0, 0, 20] // Reduzi margem inferior
              },

              // --- TÍTULO DO EXAME ---
              { text: tituloExame || 'RELATÓRIO MÉDICO', style: 'header', alignment: 'center', margin: [0, 0, 0, 10] },

              // --- CORPO DO TEXTO ---
              { text: textoFinal, fontSize: 12, lineHeight: 1.3, alignment: 'justify', margin: [0, 0, 0, 20] },

              // --- ASSINATURA (CORRIGIDO) ---
              // Usamos 'stack' com 'unbreakable: true'. 
              // Isso garante que linha e nome fiquem juntos, mas só pula página se não couber na atual.
              {
                stack: [
                    { text: '_______________________________', alignment: 'center', margin: [0, 0, 0, 2] },
                    { text: 'Dr. Antonio José Orsi Falleiros', alignment: 'center', bold: true, fontSize: 11 }
                ],
                unbreakable: true, 
                margin: [0, 20, 0, 20], // Espaço antes e depois da assinatura
                alignment: 'center'
              },
              
              // --- IMAGENS ---
              ...imagesContent
          ],
          styles: {
            header: { fontSize: 14, bold: true },
            subheader: { fontSize: 12, bold: true, decoration: 'underline' }
          }
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
                style={styles.inputControl} 
            >
                <option value="ECOCARDIOGRAMA">Ecocardiograma (Adulto)</option>
                <option value="OBSTETRICO">Ultrassom Obstétrico / Morfológico</option>
                <option value="TRANSVAGINAL">Ultrassom Transvaginal / Pélvico</option>
                <option value="ABDOME">Ultrassom Abdome Total (Em Breve)</option>
                <option value="DOPPLER_CAROTIDAS">Doppler de Carótidas e Vertebrais</option> 
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
                        style={styles.inputControl} 
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
        <div className="laudo-container"> 
            {tipoExame === 'OBSTETRICO' && <FormObstetrico onUpdate={handleFormUpdate} />}
            {tipoExame === 'TRANSVAGINAL' && <FormTransvaginal onUpdate={handleFormUpdate} />}
            {tipoExame === 'ECOCARDIOGRAMA' && <FormEcocardiograma onUpdate={handleFormUpdate} />}
            {tipoExame === 'DOPPLER_CAROTIDAS' && <FormDopplerCarotidas onUpdate={handleFormUpdate} />}
        </div>

      </div>

      {/* COLUNA DIREITA */}
      <div style={styles.rightCol}>
         <div style={{...styles.card, height: '100%', display: 'flex', flexDirection: 'column', padding: '0'}}> 
             {/* Header do Laudo */}
             <div style={{display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: `1px solid ${theme.border}`, background: '#f8f9fa'}}>
                 <span style={{fontWeight: 'bold', color: theme.primary, fontSize: '13px'}}>LAUDO FINAL</span>
                 <div style={{display: 'flex', gap: '8px'}}>
                     {/* INPUT DE ARQUIVO INVISÍVEL */}
                     <input 
                        type="file" 
                        id="img-upload" 
                        multiple 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        style={{display: 'none'}} 
                     />
                     <label htmlFor="img-upload" style={{...styles.button, background: '#FF9800', margin: 0}}>
                        <FaCamera/> FOTOS
                     </label>

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
                     fontFamily: 'Times New Roman, serif', 
                     fontSize: '13px', 
                     lineHeight: '1.4', 
                     color: '#000',
                     background: '#fff'
                 }}
             />

             {/* PREVIEW DAS IMAGENS (NOVO) */}
             {imagens.length > 0 && (
                 <div style={{padding: '10px', borderTop: `1px solid ${theme.border}`, background: '#f1f1f1'}}>
                     <span style={{fontSize: '10px', fontWeight: 'bold', color: '#666'}}>IMAGENS ANEXADAS ({imagens.length})</span>
                     <div style={styles.imagePreviewGrid}>
                        {imagens.map((img, idx) => (
                            <div key={idx} style={styles.thumbContainer}>
                                <img src={img} alt={`img-${idx}`} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                                <button 
                                    onClick={() => removeImage(idx)}
                                    style={{position: 'absolute', top: 0, right: 0, background: 'rgba(255,0,0,0.7)', color: 'white', border: 'none', cursor: 'pointer', padding: '2px 4px'}}
                                >
                                    <FaTrash size={10} />
                                </button>
                            </div>
                        ))}
                     </div>
                 </div>
             )}

         </div>
      </div>

    </div>
  );
};

export default LaudosPage;