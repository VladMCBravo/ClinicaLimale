// src/pages/LaudosPage.jsx
import React, { useState, useCallback } from 'react';
import { FaPrint, FaSave, FaFileAlt, FaSearch, FaSpinner, FaCamera, FaTrash } from 'react-icons/fa';
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
  
  const [textoFinal, setTextoFinal] = useState('');
  const [dadosEstruturados, setDadosEstruturados] = useState({});
  const [tituloExame, setTituloExame] = useState('');
  const [saving, setSaving] = useState(false);
  const [imagens, setImagens] = useState([]);

  const handleFormUpdate = useCallback((dados) => {
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
      if (!paciente) return alert("Selecione um paciente!");
      setSaving(true);
      try {
          await apiClient.post('/laudos/', {
              paciente: paciente.id,
              titulo_exame: tituloExame,
              dados_estruturados: dadosEstruturados,
              texto_laudo: textoFinal,
              imagens_anexas: imagens, 
              status: "FINALIZADO"
          });
          alert("Laudo salvo!");
      } catch (e) { alert("Erro ao salvar."); } finally { setSaving(false); }
  };

  // --- FUNÇÃO DE IMPRESSÃO INTELIGENTE ---
  const handlePrint = () => {
      const pageMargins = [60, 128, 60, 60]; 
      let conteudoLaudo = [];

      // --- HELPERS PARA GERAR TABELAS E LISTAS ---
      const criarTabela = (dadosTabela, titulo = 'Medidas e cálculos:') => {
          if (!dadosTabela || dadosTabela.length === 0) return null;
          
          const bodyTable = [
              [
                  { text: 'Estrutura', bold: true, fillColor: '#f0f0f0', style: 'tableHeader' }, 
                  { text: 'Medida', bold: true, fillColor: '#f0f0f0', style: 'tableHeader' }, 
                  // Se tiver referência (Eco), adiciona coluna, senão (Obstétrico) mantém 2
                  ...(dadosTabela[0].ref ? [{ text: 'Referência', bold: true, fillColor: '#f0f0f0', style: 'tableHeader' }] : [])
              ]
          ];

          dadosTabela.forEach(item => {
              const row = [
                  { text: item.estrutura, fontSize: 10 },
                  { text: item.medida, fontSize: 10 }
              ];
              if (item.ref) row.push({ text: item.ref, fontSize: 10, color: '#555' });
              bodyTable.push(row);
          });

          return [
              { text: titulo, style: 'subheader', margin: [0, 5, 0, 2] },
              {
                  table: {
                      widths: item.ref ? ['*', 'auto', 'auto'] : ['*', 'auto'],
                      body: bodyTable
                  },
                  layout: 'lightHorizontalLines',
                  margin: [0, 0, 0, 10]
              }
          ];
      };

      const criarListaComentarios = (lista, titulo = 'Relatório:') => {
          if (!lista || lista.length === 0) return null;
          return [
              { text: titulo, style: 'subheader', margin: [0, 5, 0, 2] },
              ...lista.map(c => ({ text: c, fontSize: 11, margin: [0, 1, 0, 1], alignment: 'justify' }))
          ];
      };

      const criarConclusao = (lista) => {
          if (!lista || lista.length === 0) return null;
          return [
              { text: 'CONCLUSÃO:', style: 'header', fontSize: 12, margin: [0, 15, 0, 5] },
              ...lista.map(c => ({ text: c, bold: true, fontSize: 11, margin: [0, 1, 0, 1] }))
          ];
      };

      // --- LÓGICA DE DECISÃO POR TIPO DE EXAME ---

      // 1. ECOCARDIOGRAMA (Estrutura Simples)
      if (dadosEstruturados.tabelaMedidas) {
          const tab = criarTabela(dadosEstruturados.tabelaMedidas);
          const com = criarListaComentarios(dadosEstruturados.listaComentarios, 'Comentários:');
          const con = criarConclusao(dadosEstruturados.listaConclusao);
          if (tab) conteudoLaudo.push(tab);
          if (com) conteudoLaudo.push(com);
          if (con) conteudoLaudo.push(con);
      } 
      // 2. OBSTÉTRICO (Pode ser Gemelar)
      else if (dadosEstruturados.feto1) {
          
          // DUM e Info Geral (Se disponível no nível superior)
          if (textoFinal.includes("DUM:")) {
              // Extrai a linha da DUM do texto cru para exibir no topo
              const dumLine = textoFinal.split('\n').find(l => l.includes("DUM:"));
              if(dumLine) conteudoLaudo.push({ text: dumLine, fontSize: 11, bold: true, margin: [0, 0, 0, 10] });
          }

          // FETO 1
          if (dadosEstruturados.isGemelar) conteudoLaudo.push({ text: 'FETO 1', style: 'header', color: '#2E7D32', margin: [0, 10, 0, 5] });
          
          const f1 = dadosEstruturados.feto1;
          const tab1 = criarTabela(f1.tabelaBiometria, 'Biometria Fetal:');
          const com1 = criarListaComentarios(f1.listaComentarios);
          const con1 = criarConclusao(f1.listaConclusao); // Obstétrico pode ter conclusão por feto ou geral

          if (tab1) conteudoLaudo.push(tab1);
          if (com1) conteudoLaudo.push(com1);
          
          // FETO 2 (Se Gemelar)
          if (dadosEstruturados.isGemelar && dadosEstruturados.feto2) {
              conteudoLaudo.push({ text: 'FETO 2', style: 'header', color: '#2E7D32', margin: [0, 20, 0, 5] }); // Mais margem antes do feto 2
              const f2 = dadosEstruturados.feto2;
              const tab2 = criarTabela(f2.tabelaBiometria, 'Biometria Fetal:');
              const com2 = criarListaComentarios(f2.listaComentarios);
              
              if (tab2) conteudoLaudo.push(tab2);
              if (com2) conteudoLaudo.push(com2);
          }

          // CONCLUSÃO GERAL (Normalmente a conclusão obstétrica é única no final)
          if (con1 && !dadosEstruturados.isGemelar) conteudoLaudo.push(con1);
          if (dadosEstruturados.isGemelar) {
               // Se for gemelar, pegamos a conclusão do feto 1 + feto 2 ou uma geral se você implementou assim. 
               // No código anterior, cada feto tinha sua lista. Vamos imprimir ambas se existirem.
               if(con1) conteudoLaudo.push([{ text: 'CONCLUSÃO (Feto 1):', bold:true, margin:[0,10,0,0] }, ...con1.slice(1)]);
               if(dadosEstruturados.feto2?.listaConclusao) {
                   const con2 = criarConclusao(dadosEstruturados.feto2.listaConclusao);
                   conteudoLaudo.push([{ text: 'CONCLUSÃO (Feto 2):', bold:true, margin:[0,5,0,0] }, ...con2.slice(1)]);
               }
          }

      } 
      // 3. OUTROS (Texto Corrido - Fallback)
      else {
          conteudoLaudo.push({ text: textoFinal, fontSize: 12, lineHeight: 1.3, alignment: 'justify', margin: [0, 0, 0, 20] });
      }

      // --- IMAGENS (Grade 2 Colunas) ---
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

      // --- DEFINIÇÃO DO PDF ---
      const docDefinition = {
          pageSize: 'A4', 
          pageMargins: pageMargins,
          content: [
              // Cabeçalho Paciente
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

              // Título do Exame
              { text: tituloExame || 'RELATÓRIO MÉDICO', style: 'header', alignment: 'center', margin: [0, 0, 0, 15] },

              // Conteúdo Dinâmico
              ...conteudoLaudo,

              // Assinatura (Grudada no texto)
              {
                stack: [
                    { text: '_______________________________', alignment: 'center', margin: [0, 0, 0, 2] },
                    { text: 'Dr. Antonio José Orsi Falleiros', alignment: 'center', bold: true, fontSize: 11 }
                ],
                unbreakable: true, 
                margin: [0, 30, 0, 20], 
                alignment: 'center'
              },
              
              // Imagens
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