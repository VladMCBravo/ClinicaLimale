// src/pages/LaudosPage.jsx
import React, { useState, useCallback, useEffect } from 'react'; // 1. Adicionado useEffect
import { FaPrint, FaSave, FaFileAlt, FaSearch, FaSpinner, FaCamera, FaTrash, FaUserMd, FaEraser } from 'react-icons/fa'; // 2. Adicionado FaEraser
import apiClient from '../api/axiosConfig';

import '../components/laudos/Laudos.css'; 

// Importação dos Formulários
import FormObstetrico from '../components/laudos/obstetrico/FormObstetrico';
import FormTransvaginal from '../components/laudos/trasnvaginal/FormTransvaginal';
import FormEcocardiograma from '../components/laudos/ecocardiograma/FormEcocardiograma';
import FormDopplerCarotidas from '../components/laudos/carotidas/FormDopplerCarotidas';

// Importação do Gerador de PDF Compartilhado
import { gerarPDFLaudo } from '../utils/laudoPdfGenerator';

const theme = { primary: '#1C2E4A', secondary: '#C5A47E', accent: '#2E7D32', bg: '#F4F6F8', surface: '#FFFFFF', border: '#E0E0E0' };

const styles = {
  container: { display: 'flex', background: theme.bg, height: '100vh', overflow: 'hidden', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '11px', color: '#333' },
  leftCol: { flex: 2, minWidth: '800px', height: '100%', overflowY: 'auto', padding: '10px', borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff' },
  rightCol: { flex: 1, minWidth: '400px', height: '100%', padding: '10px', display: 'flex', flexDirection: 'column', overflowY: 'auto', background: theme.bg },
  card: { background: '#fff', borderRadius: '4px', border: `1px solid ${theme.border}`, padding: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  header: { fontSize: '12px', fontWeight: 'bold', color: theme.primary, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  inputControl: { width: '100%', padding: '4px 8px', fontSize: '11px', borderRadius: '2px', border: '1px solid #aaa', height: '24px', fontWeight: 'bold', color: theme.primary, outline: 'none' },
  // --- MUDANÇA AQUI: Botões menores ---
  button: { 
      background: theme.accent, 
      color: 'white', 
      border: 'none', 
      padding: '4px 8px', // Padding reduzido
      borderRadius: '3px', 
      cursor: 'pointer', 
      fontWeight: 'bold', 
      fontSize: '9px', // Fonte reduzida
      display: 'flex', 
      alignItems: 'center', 
      gap: '4px' // Espaço entre ícone e texto reduzido
  },
  imagePreviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px', marginTop: '10px', padding: '5px', background: '#eee', borderRadius: '4px' },
  thumbContainer: { position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: '3px', border: '1px solid #ccc' }
};

// 3. Declarando a constante STORAGE_KEY fora do componente
const STORAGE_KEY = 'laudos_rascunho_auto_save';

const LaudosPage = () => {
    // --- ESTADOS INICIAIS (Lazy Initialization) ---
  // Tenta ler do LocalStorage ao iniciar, se não existir, usa o padrão.
  
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
  // --- EFEITO: SALVAR AUTOMATICAMENTE NO LOCALSTORAGE ---
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
            console.error("Erro ao salvar rascunho (provavelmente limite de cota de imagens):", e);
            // Fallback: Tenta salvar sem as imagens se falhar por tamanho
            const dadosSemImagens = { ...dadosParaSalvar, imagens: [] };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dadosSemImagens));
        }
    }, 1000); // Debounce de 1 segundo para não salvar a cada tecla digitada

    return () => clearTimeout(timeoutId);
  }, [tipoExame, paciente, medicoNome, medicoCrm, textoFinal, dadosEstruturados, tituloExame, imagens]);

  // --- FUNÇÃO LIMPAR TUDO ---
  const handleLimpar = () => {
    if (window.confirm("Tem certeza que deseja limpar todo o formulário? O rascunho será perdido.")) {
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
              
              // 1. Envia o tipo selecionado no dropdown
              tipo_exame: tipoExame, 
              
              // 2. Envia o título gerado pelo formulário (com fallback)
              titulo: tituloExame || `Laudo de ${tipoExame}`, 
              
              dados_estruturados: dadosEstruturados,
              texto_laudo: textoFinal,
              imagens_anexas: imagens,
              medico_responsavel: medicoNome,
              crm_medico: medicoCrm, 
              status: "FINALIZADO"
          };
          
          await apiClient.post('/prontuario/laudos/', payload);
          
          alert("Laudo salvo com sucesso!");
          
      } catch (e) { 
          console.error("Erro ao salvar laudo:", e);
          const msgErro = e.response?.data 
            ? JSON.stringify(e.response.data, null, 2) 
            : e.message;
          alert(`Erro ao salvar: ${msgErro}`);
      } finally { 
          setSaving(false); 
      }
  };

  // --- FUNÇÃO DE IMPRESSÃO ---
  const handlePrint = () => {
      gerarPDFLaudo({
          pacienteNome: paciente?.nome_completo,
          medicoNome: medicoNome,
          medicoCrm: medicoCrm,
          tituloExame: tituloExame,
          textoLaudo: textoFinal,
          dadosEstruturados: dadosEstruturados,
          imagensBase64: imagens 
      });
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
            {tipoExame === 'OBSTETRICO' && <FormObstetrico onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            {tipoExame === 'TRANSVAGINAL' && <FormTransvaginal onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            {tipoExame === 'ECOCARDIOGRAMA' && <FormEcocardiograma onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            {tipoExame === 'DOPPLER_CAROTIDAS' && <FormDopplerCarotidas onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
        </div>
      </div>

      {/* Direita */}
      <div style={styles.rightCol}>
         <div style={{...styles.card, height: '100%', display: 'flex', flexDirection: 'column', padding: '0'}}> 
             {/* --- MUDANÇA AQUI: Header da direita com botões menores --- */}
             <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderBottom: `1px solid ${theme.border}`, background: '#f8f9fa'}}>
                 <span style={{fontWeight: 'bold', color: theme.primary, fontSize: '13px', whiteSpace: 'nowrap'}}>LAUDO FINAL</span>
                 
                 {/* Container dos botões com flex-shrink para não esmagar o título */}
                 <div style={{display: 'flex', gap: '6px', flexShrink: 0}}>
                     <input type="file" id="img-upload" multiple accept="image/*" onChange={handleImageUpload} style={{display: 'none'}} />
                     <label htmlFor="img-upload" style={{...styles.button, background: '#FF9800', margin: 0}}><FaCamera size={10}/> FOTOS</label>
                     
                     <button onClick={handleLimpar} style={{...styles.button, background: '#D32F2F'}} title="Limpar formulário">
                        <FaEraser size={10}/> LIMPAR
                     </button>
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