// src/pages/LaudosPage.jsx
import React, { useState, useCallback } from 'react';
import { FaPrint, FaSave, FaFileAlt, FaSearch, FaSpinner, FaCamera, FaTrash, FaUserMd } from 'react-icons/fa';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import apiClient from '../api/axiosConfig';

import '../components/laudos/Laudos.css'; 

// Importação dos Formulários
import FormObstetrico from '../components/laudos/obstetrico/FormObstetrico';
import FormTransvaginal from '../components/laudos/trasnvaginal/FormTransvaginal';
import FormEcocardiograma from '../components/laudos/ecocardiograma/FormEcocardiograma';
import FormDopplerCarotidas from '../components/laudos/carotidas/FormDopplerCarotidas';

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

const theme = { primary: '#1C2E4A', secondary: '#C5A47E', accent: '#2E7D32', bg: '#F4F6F8', surface: '#FFFFFF', border: '#E0E0E0' };

const styles = {
  container: { display: 'flex', background: theme.bg, height: '100vh', overflow: 'hidden', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '11px', color: '#333' },
  leftCol: { flex: 2, minWidth: '800px', height: '100%', overflowY: 'auto', padding: '10px', borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff' },
  rightCol: { flex: 1, minWidth: '400px', height: '100%', padding: '10px', display: 'flex', flexDirection: 'column', overflowY: 'auto', background: theme.bg },
  card: { background: '#fff', borderRadius: '4px', border: `1px solid ${theme.border}`, padding: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  header: { fontSize: '12px', fontWeight: 'bold', color: theme.primary, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  inputControl: { width: '100%', padding: '4px 8px', fontSize: '11px', borderRadius: '2px', border: '1px solid #aaa', height: '24px', fontWeight: 'bold', color: theme.primary, outline: 'none' },
  button: { background: theme.accent, color: 'white', border: 'none', padding: '6px 12px', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' },
  imagePreviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px', marginTop: '10px', padding: '5px', background: '#eee', borderRadius: '4px' },
  thumbContainer: { position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: '3px', border: '1px solid #ccc' }
};

const LaudosPage = () => {
  const [tipoExame, setTipoExame] = useState('OBSTETRICO'); 
  const [paciente, setPaciente] = useState(null);
  const [termoBusca, setTermoBusca] = useState('');
  const [pacientesEncontrados, setPacientesEncontrados] = useState([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  
  const [medicoNome, setMedicoNome] = useState('');
  const [medicoCrm, setMedicoCrm] = useState('');

  const [textoFinal, setTextoFinal] = useState('');
  const [dadosEstruturados, setDadosEstruturados] = useState({});
  const [tituloExame, setTituloExame] = useState('');
  const [saving, setSaving] = useState(false);
  const [imagens, setImagens] = useState([]);

  const handleFormUpdate = useCallback((dados) => {
      // Aqui garantimos que o texto editável seja a fonte da verdade para o estado
      setTextoFinal(dados.texto);
      setDadosEstruturados(dados.dadosEstruturados || {});
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

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const promises = files.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    }));
    Promise.all(promises).then(base64Images => setImagens(prev => [...prev, ...base64Images]))
          .catch(err => console.error("Erro ao ler imagens", err));
  };

  const removeImage = (index) => {
    setImagens(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
      // Validação mais robusta para evitar erro 500
      if (!paciente) return alert("Erro: Selecione um paciente antes de salvar.");
      if (!paciente.id) return alert("Erro: ID do paciente inválido.");
      if (!medicoNome) return alert("Erro: Preencha o nome do médico.");

      setSaving(true);
      try {
          const payload = {
              paciente: paciente.id,
              titulo_exame: tituloExame,
              dados_estruturados: dadosEstruturados,
              texto_laudo: textoFinal, // Salva o texto exatamente como está no textarea
              imagens_anexas: imagens,
              medico_responsavel: medicoNome,
              crm_medico: medicoCrm, 
              status: "FINALIZADO"
          };
          
          await apiClient.post('/laudos/', payload);
          alert("Laudo salvo com sucesso!");
      } catch (e) { 
          console.error("Erro ao salvar laudo:", e);
          alert(`Erro ao salvar: ${e.response?.data?.detail || e.message}`);
      } finally { setSaving(false); }
  };

  // --- FUNÇÃO DE IMPRESSÃO CORRIGIDA (Respeita o Texto Editável) ---
  const handlePrint = () => {
      const pageMargins = [60, 128, 60, 60]; 
      let conteudoLaudo = [];

      // HELPER: Criar Tabela de Biometria (Apenas isso será estruturado)
      const criarTabelaBiometria = (dadosTabela) => {
          if (!dadosTabela || dadosTabela.length === 0) return null;
          const bodyTable = [
              [
                  { text: 'Estrutura', bold: true, fillColor: '#f0f0f0', style: 'tableHeader' }, 
                  { text: 'Medida', bold: true, fillColor: '#f0f0f0', style: 'tableHeader' }
              ]
          ];
          dadosTabela.forEach(item => {
              bodyTable.push([
                  { text: item.estrutura, fontSize: 10 },
                  { text: item.medida, fontSize: 10 }
              ]);
          });
          return {
              table: { widths: ['*', 'auto'], body: bodyTable },
              layout: 'lightHorizontalLines',
              margin: [0, 5, 0, 15] // Margem abaixo da tabela
          };
      };

      // 1. INSERIR TABELAS DE BIOMETRIA (Se houver)
      if (dadosEstruturados.feto1 && dadosEstruturados.feto1.tabelaBiometria.length > 0) {
          if (dadosEstruturados.isGemelar) conteudoLaudo.push({ text: 'Biometria Feto 1:', bold: true, fontSize: 11 });
          const tab1 = criarTabelaBiometria(dadosEstruturados.feto1.tabelaBiometria);
          if (tab1) conteudoLaudo.push(tab1);
      }
      
      if (dadosEstruturados.isGemelar && dadosEstruturados.feto2 && dadosEstruturados.feto2.tabelaBiometria.length > 0) {
          conteudoLaudo.push({ text: 'Biometria Feto 2:', bold: true, fontSize: 11, margin: [0, 10, 0, 0] });
          const tab2 = criarTabelaBiometria(dadosEstruturados.feto2.tabelaBiometria);
          if (tab2) conteudoLaudo.push(tab2);
      }

      // 2. INSERIR O TEXTO DO LAUDO (Exatamente como editado pelo usuário)
      // Usamos white-space: pre-wrap behavior para manter parágrafos
      conteudoLaudo.push({ 
          text: textoFinal, 
          fontSize: 12, 
          lineHeight: 1.3, 
          alignment: 'justify', 
          margin: [0, 0, 0, 20] 
      });

      // --- IMAGENS ---
      const imagesContent = [];
      if (imagens.length > 0) {
        imagesContent.push({ text: 'DOCUMENTAÇÃO FOTOGRÁFICA', style: 'subheader', margin: [0, 10, 0, 5], pageBreak: 'before' });
        for (let i = 0; i < imagens.length; i += 2) {
            const row = {
                columns: [
                    { image: imagens[i], width: 225, margin: [0, 2, 0, 10] }, 
                    imagens[i + 1] ? { image: imagens[i + 1], width: 225, margin: [0, 2, 0, 10] } : null 
                ],
                columnGap: 10
            };
            imagesContent.push(row);
        }
      }

      // --- PDF DEFINITION ---
      const docDefinition = {
          pageSize: 'A4', 
          pageMargins: pageMargins,
          content: [
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
                margin: [0, 0, 0, 20]
              },
              { text: tituloExame || 'RELATÓRIO MÉDICO', style: 'header', alignment: 'center', margin: [0, 0, 0, 15] },
              
              ...conteudoLaudo,
              
              {
                stack: [
                    { text: '_______________________________', alignment: 'center', margin: [0, 0, 0, 2] },
                    { text: medicoNome || 'Médico Responsável', alignment: 'center', bold: true, fontSize: 11 },
                    { text: medicoCrm ? `CRM: ${medicoCrm}` : '', alignment: 'center', fontSize: 10 }
                ],
                unbreakable: true, 
                margin: [0, 30, 0, 20], 
                alignment: 'center'
              },
              ...imagesContent
          ],
          styles: {
            header: { fontSize: 14, bold: true },
            subheader: { fontSize: 12, bold: true, decoration: 'underline' },
            tableHeader: { fontSize: 10, bold: true, color: 'black' }
          }
      };
      
      pdfMake.createPdf(docDefinition).open();
  };

  return (
    <div style={styles.container}>
      {/* Esquerda */}
      <div style={styles.leftCol}>
        <div style={styles.card}>
            <div style={styles.header}><FaFileAlt /> Tipo de Laudo</div>
            <select value={tipoExame} onChange={(e) => setTipoExame(e.target.value)} style={styles.inputControl}>
                <option value="ECOCARDIOGRAMA">Ecocardiograma (Adulto)</option>
                <option value="OBSTETRICO">Ultrassom Obstétrico / Morfológico</option>
                <option value="TRANSVAGINAL">Ultrassom Transvaginal / Pélvico</option>
                <option value="ABDOME">Ultrassom Abdome Total (Em Breve)</option>
                <option value="DOPPLER_CAROTIDAS">Doppler de Carótidas e Vertebrais</option> 
            </select>
        </div>

        <div style={styles.card}>
            <div style={styles.header}><FaUserMd /> Médico Examinador</div>
            <div style={{display:'flex', gap:'10px'}}>
                <input 
                    placeholder="Nome do Médico"
                    value={medicoNome}
                    onChange={(e) => setMedicoNome(e.target.value)}
                    style={{...styles.inputControl, flex: 2}}
                />
                <input 
                    placeholder="CRM"
                    value={medicoCrm}
                    onChange={(e) => setMedicoCrm(e.target.value)}
                    style={{...styles.inputControl, flex: 1}}
                />
            </div>
        </div>

        <div style={styles.card}>
            <div style={styles.header}><FaSearch /> Paciente</div>
            {paciente ? (
                <div style={{background: '#e8f5e9', padding: '4px 8px', borderRadius: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #c8e6c9', height: '24px'}}>
                    <span style={{fontWeight: 'bold', color: '#2e7d32', fontSize: '11px'}}>{paciente.nome_completo}</span>
                    <button onClick={() => setPaciente(null)} style={{border: 'none', background: 'transparent', color: '#d32f2f', fontWeight: 'bold', cursor: 'pointer', fontSize:'10px'}}>X</button>
                </div>
            ) : (
                <div style={{position: 'relative'}}>
                    <input placeholder="Buscar paciente..." value={termoBusca} onChange={(e) => { setTermoBusca(e.target.value); buscarPacientes(e.target.value); }} style={styles.inputControl} />
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

        <div className="laudo-container"> 
            {tipoExame === 'OBSTETRICO' && <FormObstetrico onUpdate={handleFormUpdate} />}
            {tipoExame === 'TRANSVAGINAL' && <FormTransvaginal onUpdate={handleFormUpdate} />}
            {tipoExame === 'ECOCARDIOGRAMA' && <FormEcocardiograma onUpdate={handleFormUpdate} />}
            {tipoExame === 'DOPPLER_CAROTIDAS' && <FormDopplerCarotidas onUpdate={handleFormUpdate} />}
        </div>
      </div>

      {/* Direita */}
      <div style={styles.rightCol}>
         <div style={{...styles.card, height: '100%', display: 'flex', flexDirection: 'column', padding: '0'}}> 
             <div style={{display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: `1px solid ${theme.border}`, background: '#f8f9fa'}}>
                 <span style={{fontWeight: 'bold', color: theme.primary, fontSize: '13px'}}>LAUDO FINAL</span>
                 <div style={{display: 'flex', gap: '8px'}}>
                     <input type="file" id="img-upload" multiple accept="image/*" onChange={handleImageUpload} style={{display: 'none'}} />
                     <label htmlFor="img-upload" style={{...styles.button, background: '#FF9800', margin: 0}}><FaCamera/> FOTOS</label>
                     <button onClick={handleSave} disabled={saving} style={{...styles.button, background: saving ? '#ccc' : theme.accent}}>{saving ? <FaSpinner className="spin"/> : <FaSave/>} SALVAR</button>
                     <button onClick={handlePrint} style={{...styles.button, background: theme.primary}}><FaPrint/> IMPRIMIR</button>
                 </div>
             </div>
             
             <textarea 
                 value={textoFinal} 
                 onChange={(e) => setTextoFinal(e.target.value)}
                 style={{ flex: 1, border: 'none', padding: '15px', resize: 'none', outline: 'none', fontFamily: 'Times New Roman, serif', fontSize: '13px', lineHeight: '1.4', color: '#000', background: '#fff' }}
             />

             {imagens.length > 0 && (
                 <div style={{padding: '10px', borderTop: `1px solid ${theme.border}`, background: '#f1f1f1'}}>
                     <span style={{fontSize: '10px', fontWeight: 'bold', color: '#666'}}>IMAGENS ANEXADAS ({imagens.length})</span>
                     <div style={styles.imagePreviewGrid}>
                        {imagens.map((img, idx) => (
                            <div key={idx} style={styles.thumbContainer}>
                                <img src={img} alt={`img-${idx}`} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                                <button onClick={() => removeImage(idx)} style={{position: 'absolute', top: 0, right: 0, background: 'rgba(255,0,0,0.7)', color: 'white', border: 'none', cursor: 'pointer', padding: '2px 4px'}}><FaTrash size={10} /></button>
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