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
      // Validações básicas
      if (!paciente) return alert("Erro: Selecione um paciente antes de salvar.");
      if (!paciente.id) return alert("Erro: ID do paciente inválido.");
      if (!medicoNome) return alert("Erro: Preencha o nome do médico.");

      setSaving(true);
      try {
          const payload = {
              paciente: paciente.id,
              
              // --- CORREÇÃO AQUI ---
              // O Django espera 'tipo_exame' e 'titulo' separadamente.
              
              // 1. Envia o tipo selecionado no dropdown (ex: 'DOPPLER_CAROTIDAS')
              tipo_exame: tipoExame, 
              
              // 2. Envia o título gerado pelo formulário (ex: 'DOPPLER DE CARÓTIDAS...')
              // Adicionamos um fallback caso o título esteja vazio
              titulo: tituloExame || `Laudo de ${tipoExame}`, 
              
              dados_estruturados: dadosEstruturados,
              texto_laudo: textoFinal,
              imagens_anexas: imagens,
              medico_responsavel: medicoNome,
              crm_medico: medicoCrm, 
              status: "FINALIZADO"
          };
          
          // Envia para a rota correta que criamos
          await apiClient.post('/prontuario/laudos/', payload);
          
          alert("Laudo salvo com sucesso!");
          
          // Opcional: Limpar imagens ou redirecionar após salvar
          // setImagens([]); 
      } catch (e) { 
          console.error("Erro ao salvar laudo:", e);
          // Mostra o erro detalhado do backend se houver
          const msgErro = e.response?.data 
            ? JSON.stringify(e.response.data, null, 2) 
            : e.message;
          alert(`Erro ao salvar: ${msgErro}`);
      } finally { 
          setSaving(false); 
      }
  };

  // --- FUNÇÃO DE IMPRESSÃO CORRIGIDA (Respeita o Texto Editável) ---
  const handlePrint = () => {
      const pageMargins = [40, 128, 40, 60]; 
      
      const content = [];

      // 1. HELPER: Tabela de Biometria (Estilo Clean)
      const criarTabelaBiometria = (dadosTabela, titulo) => {
          if (!dadosTabela || dadosTabela.length === 0) return null;
          
          const bodyTable = [
              [
                  { text: 'ESTRUTURA', style: 'tableHeader', fillColor: '#F5F5F5', border: [false, false, false, true] }, 
                  { text: 'MEDIDA', style: 'tableHeader', fillColor: '#F5F5F5', border: [false, false, false, true] }
              ]
          ];
          
          dadosTabela.forEach((item, index) => {
              bodyTable.push([
                  { text: item.estrutura, fontSize: 9, color: '#333', border: [false, false, false, true], margin: [0, 2] },
                  { text: item.medida, fontSize: 9, bold: true, alignment: 'right', border: [false, false, false, true], margin: [0, 2] }
              ]);
          });

          return {
              stack: [
                  { text: titulo, style: 'sectionHeader', margin: [0, 10, 0, 5] },
                  {
                      table: {
                          widths: ['*', 100], // Coluna de medida com largura fixa
                          body: bodyTable
                      },
                      layout: {
                          hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0 : 0.5,
                          vLineWidth: () => 0,
                          hLineColor: () => '#E0E0E0'
                      }
                  }
              ],
              unbreakable: true // Tenta não quebrar a tabela no meio
          };
      };

      // 2. CORPO DO LAUDO (TEXTO DESCRIITIVO)
      // Quebra o texto por linhas para criar parágrafos reais com espaçamento
      const processarTexto = (textoRaw) => {
          if (!textoRaw) return [];
          // Remove a palavra "CONCLUSÃO:" se ela vier automática no texto para tratarmos separado, 
          // ou mantém se você preferir que o médico controle tudo. 
          // Vamos manter a estrutura mas dar espaçamento nos parágrafos.
          return textoRaw.split('\n').map(line => {
              if (line.trim() === '') return { text: '', margin: [0, 2] }; // Espaço pequeno entre linhas vazias
              
              // Se a linha for um Título de seção (ex: "--- FETO 1 ---" ou "CONCLUSÃO:")
              if (line.includes('---') || line.toUpperCase().includes('CONCLUSÃO:')) {
                  return { text: line, style: 'sectionHeader', margin: [0, 10, 0, 2] };
              }
              
              // Parágrafo normal
              return { 
                  text: line, 
                  fontSize: 10, // Fonte padrão moderna
                  alignment: 'justify', 
                  lineHeight: 1.3,
                  margin: [0, 0, 0, 6] // Espaço abaixo de cada parágrafo
              };
          });
      };

      // --- MONTAGEM DO PDF ---

      // A. Título do Exame
      content.push({ 
          text: tituloExame || 'RELATÓRIO DE ULTRASSONOGRAFIA', 
          style: 'mainHeader', 
          alignment: 'center',
          margin: [0, 0, 0, 20] 
      });

      // B. Texto do Laudo (Primeiro!)
      content.push(...processarTexto(textoFinal));

      // C. Tabelas de Biometria (Por último, como anexo técnico)
      // Linha separadora elegante
      content.push({ canvas: [{ type: 'line', x1: 0, y1: 15, x2: 515, y2: 15, lineWidth: 0.5, lineColor: '#ccc' }], margin: [0, 10, 0, 10] });
      
      if (dadosEstruturados.feto1?.tabelaBiometria?.length > 0) {
          const titulo = dadosEstruturados.isGemelar ? 'BIOMETRIA FETAL - FETO 1' : 'TABELA BIOMÉTRICA';
          content.push(criarTabelaBiometria(dadosEstruturados.feto1.tabelaBiometria, titulo));
      }
      
      if (dadosEstruturados.isGemelar && dadosEstruturados.feto2?.tabelaBiometria?.length > 0) {
          content.push(criarTabelaBiometria(dadosEstruturados.feto2.tabelaBiometria, 'BIOMETRIA FETAL - FETO 2'));
      }

      // D. Imagens
      if (imagens.length > 0) {
        content.push({ text: 'DOCUMENTAÇÃO FOTOGRÁFICA', style: 'sectionHeader', margin: [0, 20, 0, 10], pageBreak: 'before' });
        for (let i = 0; i < imagens.length; i += 2) {
            const row = {
                columns: [
                    { image: imagens[i], width: 230, height: 160, fit: [230, 160], margin: [0, 5], alignment: 'center' }, 
                    imagens[i + 1] ? { image: imagens[i + 1], width: 230, height: 160, fit: [230, 160], margin: [0, 5], alignment: 'center' } : null 
                ],
                columnGap: 10,
                margin: [0, 5]
            };
            content.push(row);
        }
      }

      // --- DEFINIÇÃO DO DOCUMENTO ---
      const docDefinition = {
          pageSize: 'A4', 
          pageMargins: pageMargins,
          content: [
              // Cabeçalho Simples (Paciente e Data)
              {
                columns: [
                    { 
                        stack: [
                            { text: 'PACIENTE', fontSize: 8, color: '#666', bold: true },
                            { text: paciente ? paciente.nome_completo.toUpperCase() : '___', fontSize: 11, bold: true }
                        ],
                        width: '*' 
                    },
                    { 
                        stack: [
                            { text: 'DATA DO EXAME', fontSize: 8, color: '#666', bold: true, alignment: 'right' },
                            { text: new Date().toLocaleDateString('pt-BR'), fontSize: 11, alignment: 'right' }
                        ],
                        width: 100 
                    }
                ],
                margin: [0, 0, 0, 25] // Espaço após cabeçalho
              },
              
              ...content, // Conteúdo gerado acima

              // Assinatura
              {
                stack: [
                    { text: '_______________________________', alignment: 'center', color: '#999' },
                    { text: medicoNome || 'Médico Examinador', alignment: 'center', bold: true, fontSize: 10, margin: [0, 2] },
                    { text: medicoCrm ? `CRM: ${medicoCrm}` : '', alignment: 'center', fontSize: 9, color: '#555' }
                ],
                unbreakable: true, 
                margin: [0, 40, 0, 10], 
                alignment: 'center'
              },
          ],
          styles: {
            mainHeader: { fontSize: 14, bold: true, color: '#1C2E4A' },
            sectionHeader: { fontSize: 11, bold: true, color: '#2E7D32', uppercase: true }, // Verde escuro elegante
            tableHeader: { fontSize: 9, bold: true, color: '#555' }
          },
          defaultStyle: {
              font: 'Roboto' // Fonte padrão do pdfMake, limpa e sem serifa
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