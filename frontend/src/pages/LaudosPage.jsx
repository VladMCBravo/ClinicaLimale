// src/pages/LaudosPage.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { FaPrint, FaSave, FaFileAlt, FaSearch, FaSpinner, FaCamera, FaTrash, FaUserMd, FaEraser } from 'react-icons/fa';
import apiClient from '../api/axiosConfig';

import '../components/laudos/Laudos.css'; 

// Importação dos Formulários
import FormObstetrico from '../components/laudos/obstetrico/FormObstetrico';
import FormTransvaginal from '../components/laudos/trasnvaginal/FormTransvaginal';
import FormEcocardiograma from '../components/laudos/ecocardiograma/FormEcocardiograma';
import FormDopplerCarotidas from '../components/laudos/carotidas/FormDopplerCarotidas';

import { gerarPDFLaudo } from '../utils/laudoPdfGenerator';

const theme = { primary: '#1C2E4A', secondary: '#C5A47E', accent: '#2E7D32', bg: '#F4F6F8', surface: '#FFFFFF', border: '#E0E0E0' };

// --- ESTILOS COMPACTOS ---
const styles = {
  container: { 
      display: 'flex', 
      background: theme.bg, 
      height: '100vh', 
      overflow: 'hidden', 
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", 
      fontSize: '10px', // Reduzido geral
      color: '#333' 
  },
  leftCol: { 
      flex: 2, 
      minWidth: '680px', // Reduzido de 800px para caber melhor
      height: '100%', 
      overflowY: 'auto', 
      padding: '5px', // Reduzido de 10px
      borderRight: `1px solid ${theme.border}`, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '5px', // Reduzido gap entre cards
      background: '#fff' 
  },
  rightCol: { 
      flex: 1, 
      minWidth: '350px', // Reduzido de 400px
      height: '100%', 
      padding: '5px', // Reduzido
      display: 'flex', 
      flexDirection: 'column', 
      overflowY: 'auto', 
      background: theme.bg 
  },
  card: { 
      background: '#fff', 
      borderRadius: '4px', 
      border: `1px solid ${theme.border}`, 
      padding: '6px', // Reduzido de 10px
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)' 
  },
  header: { 
      fontSize: '11px', 
      fontWeight: 'bold', 
      color: theme.primary, 
      marginBottom: '4px', // Reduzido
      display: 'flex', 
      alignItems: 'center', 
      gap: '5px', 
      textTransform: 'uppercase', 
      letterSpacing: '0.5px' 
  },
  inputControl: { 
      width: '100%', 
      padding: '2px 6px', 
      fontSize: '11px', 
      borderRadius: '2px', 
      border: '1px solid #aaa', 
      height: '22px', // Altura reduzida
      fontWeight: 'bold', 
      color: theme.primary, 
      outline: 'none' 
  },
  button: { 
      background: theme.accent, 
      color: 'white', 
      border: 'none', 
      padding: '2px 8px', // Padding ultra compacto
      borderRadius: '3px', 
      cursor: 'pointer', 
      fontWeight: 'bold', 
      fontSize: '9px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '4px',
      height: '22px' // Altura forçada para alinhar
  },
  imagePreviewGrid: { 
      display: 'grid', 
      gridTemplateColumns: 'repeat(4, 1fr)', // Cabe mais imagens (4 colunas)
      gap: '4px', 
      marginTop: '5px', 
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

const STORAGE_KEY = 'laudos_rascunho_auto_save';

const LaudosPage = () => {
  const getInitialState = (key, fallback) => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return parsed[key] !== undefined ? parsed[key] : fallback;
        }
    } catch (e) {
        console.error("Erro ao ler rascunho", e);
    }
    return fallback;
  };

  const [tipoExame, setTipoExame] = useState(() => getInitialState('tipoExame', 'OBSTETRICO'));
  const [paciente, setPaciente] = useState(() => getInitialState('paciente', null));
  const [termoBusca, setTermoBusca] = useState('');
  const [pacientesEncontrados, setPacientesEncontrados] = useState([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  
  const [medicoNome, setMedicoNome] = useState(() => getInitialState('medicoNome', ''));
  const [medicoCrm, setMedicoCrm] = useState(() => getInitialState('medicoCrm', ''));

  const [textoFinal, setTextoFinal] = useState(() => getInitialState('textoFinal', ''));
  const [dadosEstruturados, setDadosEstruturados] = useState(() => getInitialState('dadosEstruturados', {}));
  const [tituloExame, setTituloExame] = useState(() => getInitialState('tituloExame', ''));
  const [imagens, setImagens] = useState(() => getInitialState('imagens', []));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dadosParaSalvar = {
        tipoExame,
        paciente,
        medicoNome,
        medicoCrm,
        textoFinal,
        dadosEstruturados,
        tituloExame,
        imagens
    };
    
    const timeoutId = setTimeout(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dadosParaSalvar));
        } catch (e) {
            console.error("Erro storage quota", e);
            const dadosSemImagens = { ...dadosParaSalvar, imagens: [] };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dadosSemImagens));
        }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [tipoExame, paciente, medicoNome, medicoCrm, textoFinal, dadosEstruturados, tituloExame, imagens]);

  const handleLimpar = () => {
    if (window.confirm("Limpar formulário? Rascunho será perdido.")) {
        localStorage.removeItem(STORAGE_KEY);
        setTipoExame('OBSTETRICO');
        setPaciente(null);
        setMedicoNome('');
        setMedicoCrm('');
        setTextoFinal('');
        setDadosEstruturados({});
        setTituloExame('');
        setImagens([]);
        setTermoBusca('');
        setPacientesEncontrados([]);
    }
  };

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
          .catch(err => console.error("Erro img", err));
  };

  const removeImage = (index) => {
    setImagens(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
      if (!paciente || !paciente.id) return alert("Selecione um paciente.");
      if (!medicoNome) return alert("Preencha o médico.");

      setSaving(true);
      try {
          const payload = {
              paciente: paciente.id,
              tipo_exame: tipoExame, 
              titulo: tituloExame || `Laudo de ${tipoExame}`, 
              dados_estruturados: dadosEstruturados,
              texto_laudo: textoFinal,
              imagens_anexas: imagens,
              medico_responsavel: medicoNome,
              crm_medico: medicoCrm, 
              status: "FINALIZADO"
          };
          
          await apiClient.post('/prontuario/laudos/', payload);
          alert("Laudo salvo!");
          
      } catch (e) { 
          alert(`Erro: ${e.message}`);
      } finally { 
          setSaving(false); 
      }
  };

  const handlePrint = () => {
      gerarPDFLaudo({
          pacienteNome: paciente?.nome_completo,
          medicoNome, medicoCrm, tituloExame, textoLaudo: textoFinal, dadosEstruturados, imagensBase64: imagens 
      });
  };

  return (
    <div style={styles.container}>
      {/* Esquerda: Formulários e Controles */}
      <div style={styles.leftCol}>
        
        {/* Linha Superior Compacta: Tipo + Médico */}
        <div style={{display: 'flex', gap: '5px'}}>
            <div style={{...styles.card, flex: 1}}>
                <div style={styles.header}><FaFileAlt /> Tipo</div>
                <select value={tipoExame} onChange={(e) => setTipoExame(e.target.value)} style={styles.inputControl}>
                    <option value="ECOCARDIOGRAMA">Ecocardiograma</option>
                    <option value="OBSTETRICO">Obstétrico</option>
                    <option value="TRANSVAGINAL">Transvaginal</option>
                    <option value="ABDOME">Abdome Total</option>
                    <option value="DOPPLER_CAROTIDAS">Doppler Carótidas</option> 
                </select>
            </div>

            <div style={{...styles.card, flex: 2}}>
                <div style={styles.header}><FaUserMd /> Médico</div>
                <div style={{display:'flex', gap:'5px'}}>
                    <input 
                        placeholder="Nome Médico"
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
        </div>

        {/* Busca de Paciente */}
        <div style={styles.card}>
            <div style={styles.header}><FaSearch /> Paciente</div>
            {paciente ? (
                <div style={{background: '#e8f5e9', padding: '0 6px', borderRadius: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #c8e6c9', height: '22px'}}>
                    <span style={{fontWeight: 'bold', color: '#2e7d32', fontSize: '11px'}}>{paciente.nome_completo}</span>
                    <button onClick={() => setPaciente(null)} style={{border: 'none', background: 'transparent', color: '#d32f2f', fontWeight: 'bold', cursor: 'pointer', fontSize:'10px'}}>X</button>
                </div>
            ) : (
                <div style={{position: 'relative'}}>
                    <input placeholder="Digite 3 letras..." value={termoBusca} onChange={(e) => { setTermoBusca(e.target.value); buscarPacientes(e.target.value); }} style={styles.inputControl} />
                    {pacientesEncontrados.length > 0 && (
                        <div style={{position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ccc', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'}}>
                            {pacientesEncontrados.map(p => (
                                <div key={p.id} onClick={() => { setPaciente(p); setTermoBusca(''); setPacientesEncontrados([]); }} style={{padding: '4px 8px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '10px'}}>
                                    {p.nome_completo}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Área do Formulário Dinâmico */}
        <div className="laudo-container" style={{flex: 1, overflowY: 'auto'}}> 
            {tipoExame === 'OBSTETRICO' && <FormObstetrico onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            {tipoExame === 'TRANSVAGINAL' && <FormTransvaginal onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            {tipoExame === 'ECOCARDIOGRAMA' && <FormEcocardiograma onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            {tipoExame === 'DOPPLER_CAROTIDAS' && <FormDopplerCarotidas onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
        </div>
      </div>

      {/* Direita: Resultado e Ações */}
      <div style={styles.rightCol}>
         <div style={{...styles.card, height: '100%', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden'}}> 
             
             {/* Header Super Compacto */}
             <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px', borderBottom: `1px solid ${theme.border}`, background: '#f8f9fa'}}>
                 <span style={{fontWeight: 'bold', color: theme.primary, fontSize: '11px'}}>LAUDO FINAL</span>
                 
                 <div style={{display: 'flex', gap: '4px'}}>
                     <input type="file" id="img-upload" multiple accept="image/*" onChange={handleImageUpload} style={{display: 'none'}} />
                     <label htmlFor="img-upload" style={{...styles.button, background: '#FF9800', margin: 0}}><FaCamera size={9}/> FOTOS</label>
                     
                     <button onClick={handleLimpar} style={{...styles.button, background: '#D32F2F'}} title="Limpar">
                        <FaEraser size={9}/>
                     </button>
                     <button onClick={handleSave} disabled={saving} style={{...styles.button, background: saving ? '#ccc' : theme.accent}}>{saving ? <FaSpinner className="spin"/> : <FaSave/>} SALVAR</button>
                     <button onClick={handlePrint} style={{...styles.button, background: theme.primary}}><FaPrint/> PDF</button>
                 </div>
             </div>
             
             <textarea 
                 value={textoFinal} 
                 onChange={(e) => setTextoFinal(e.target.value)}
                 style={{ flex: 1, border: 'none', padding: '8px', resize: 'none', outline: 'none', fontFamily: 'Times New Roman, serif', fontSize: '12px', lineHeight: '1.3', color: '#000', background: '#fff' }}
             />

             {imagens.length > 0 && (
                 <div style={{padding: '5px', borderTop: `1px solid ${theme.border}`, background: '#f1f1f1', maxHeight: '120px', overflowY: 'auto'}}>
                     <span style={{fontSize: '9px', fontWeight: 'bold', color: '#666'}}>IMAGENS ({imagens.length})</span>
                     <div style={styles.imagePreviewGrid}>
                        {imagens.map((img, idx) => (
                            <div key={idx} style={styles.thumbContainer}>
                                <img src={img} alt="thumb" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                                <button onClick={() => removeImage(idx)} style={{position: 'absolute', top: 0, right: 0, background: 'rgba(200,0,0,0.8)', color: 'white', border: 'none', cursor: 'pointer', padding: '0px 3px', fontSize: '8px'}}>X</button>
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