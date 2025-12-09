import React, { useState, useCallback, useEffect } from 'react';
import { FaPrint, FaSave, FaFileAlt, FaSearch, FaSpinner, FaCamera, FaEraser, FaUserMd, FaFileSignature } from 'react-icons/fa';
import apiClient from '../api/axiosConfig';

import '../components/laudos/Laudos.css'; 

// Importação dos Formulários
import FormObstetrico from '../components/laudos/obstetrico/FormObstetrico';
import FormTransvaginal from '../components/laudos/trasnvaginal/FormTransvaginal';
import FormEcocardiograma from '../components/laudos/ecocardiograma/FormEcocardiograma';
import FormDopplerCarotidas from '../components/laudos/carotidas/FormDopplerCarotidas';

import { gerarPDFLaudo } from '../utils/laudoPdfGenerator';

// --- CONFIGURAÇÕES VISUAIS (Fora do componente para não recriar a cada render) ---
const theme = { primary: '#1C2E4A', secondary: '#C5A47E', accent: '#2E7D32', bg: '#F4F6F8', surface: '#FFFFFF', border: '#E0E0E0' };

const styles = {
  container: { 
      display: 'flex', 
      background: theme.bg, 
      height: '100vh', 
      overflow: 'hidden', 
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", 
      fontSize: '10px', 
      color: '#333' 
  },
  leftCol: { 
      flex: 2, 
      minWidth: '680px', 
      height: '100%', 
      overflowY: 'auto', 
      padding: '5px', 
      borderRight: `1px solid ${theme.border}`, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '5px', 
      background: '#fff' 
  },
  rightCol: { 
      flex: 1, 
      minWidth: '350px', 
      height: '100%', 
      padding: '5px', 
      display: 'flex', 
      flexDirection: 'column', 
      overflowY: 'auto', 
      background: theme.bg 
  },
  card: { 
      background: '#fff', 
      borderRadius: '4px', 
      border: `1px solid ${theme.border}`, 
      padding: '6px', 
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)' 
  },
  header: { 
      fontSize: '11px', 
      fontWeight: 'bold', 
      color: theme.primary, 
      marginBottom: '4px', 
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
      height: '22px', 
      fontWeight: 'bold', 
      color: theme.primary, 
      outline: 'none' 
  },
  button: { 
      background: theme.accent, 
      color: 'white', 
      border: 'none', 
      padding: '0 8px', // Ajustado para centralizar verticalmente melhor com flex
      borderRadius: '3px', 
      cursor: 'pointer', 
      fontWeight: 'bold', 
      fontSize: '9px', 
      display: 'inline-flex', // Garante comportamento flex inline
      alignItems: 'center',   // Centraliza ícone e texto verticalmente
      justifyContent: 'center',
      gap: '4px',
      height: '22px',
      boxSizing: 'border-box', // Importante para que padding não aumente o tamanho total
      lineHeight: '1',         // Remove espaçamento extra de fonte
      textTransform: 'uppercase'
  },
  imagePreviewGrid: { 
      display: 'grid', 
      gridTemplateColumns: 'repeat(4, 1fr)', 
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

  // Estados principais
  const [tipoExame, setTipoExame] = useState(() => getInitialState('tipoExame', 'OBSTETRICO'));
  const [paciente, setPaciente] = useState(() => getInitialState('paciente', null));
  
  // Busca Paciente
  const [termoBusca, setTermoBusca] = useState('');
  const [pacientesEncontrados, setPacientesEncontrados] = useState([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  
  // Médico e Busca de Médico (NOVA LÓGICA)
  const [medicoNome, setMedicoNome] = useState(() => getInitialState('medicoNome', ''));
  const [medicoCrm, setMedicoCrm] = useState(() => getInitialState('medicoCrm', ''));
  const [todosMedicos, setTodosMedicos] = useState([]); // Lista completa carregada da API
  const [medicosFiltrados, setMedicosFiltrados] = useState([]); // Lista exibida no dropdown
  const [mostrarListaMedicos, setMostrarListaMedicos] = useState(false);

  // Conteúdo do Laudo
  const [textoFinal, setTextoFinal] = useState(() => getInitialState('textoFinal', ''));
  const [dadosEstruturados, setDadosEstruturados] = useState(() => getInitialState('dadosEstruturados', {}));
  const [tituloExame, setTituloExame] = useState(() => getInitialState('tituloExame', ''));
  const [imagens, setImagens] = useState(() => getInitialState('imagens', []));
  const [saving, setSaving] = useState(false);

  // Carregar médicos ao iniciar
  useEffect(() => {
    const carregarMedicos = async () => {
        try {
            const res = await apiClient.get('/usuarios/?cargo=medico');
            const lista = res.data.results || res.data;
            // Ordenar por nome
            lista.sort((a, b) => (a.first_name || a.username).localeCompare(b.first_name || b.username));
            setTodosMedicos(lista);
        } catch (e) {
            console.error("Erro ao carregar lista de médicos", e);
        }
    };
    carregarMedicos();
  }, []);

  // Lógica de filtro para o campo Médico
  const handleInputMedicoChange = (texto) => {
      setMedicoNome(texto);
      if (texto.length > 0) {
          const termo = texto.toLowerCase();
          const filtrados = todosMedicos.filter(m => {
              const nomeCompleto = m.first_name ? `${m.first_name} ${m.last_name}` : m.username;
              return nomeCompleto.toLowerCase().includes(termo);
          });
          setMedicosFiltrados(filtrados);
          setMostrarListaMedicos(true);
      } else {
          setMostrarListaMedicos(false);
      }
  };

  const selecionarMedico = (medico) => {
      const nomeCompleto = medico.first_name ? `${medico.first_name} ${medico.last_name}` : medico.username;
      setMedicoNome(nomeCompleto);
      setMedicoCrm(medico.crm || '');
      setMostrarListaMedicos(false);
  };

  // Auto-Save Effect
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

  // Callback que recebe dados do filho (FormObstetrico) e atualiza o pai
  const handleFormUpdate = useCallback((dados) => {
      if (dados.texto) setTextoFinal(dados.texto);
      if (dados.dadosEstruturados) setDadosEstruturados(dados.dadosEstruturados);
      if (dados.tituloExame) setTituloExame(dados.tituloExame);
  }, []);

  const buscarPacientes = async (termo) => {
      if (termo.length < 3) { setPacientesEncontrados([]); return; }
      setLoadingBusca(true);
      try {
          const res = await apiClient.get('/pacientes/', { params: { search: termo } });
          const dados = Array.isArray(res.data) ? res.data : res.data.results || [];
          
          // CORREÇÃO: Ordenação Alfabética no Frontend
          dados.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
          
          setPacientesEncontrados(dados);
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
      if (!paciente) return alert("Erro: Selecione um paciente antes de salvar.");
      if (!paciente.id) return alert("Erro: ID do paciente inválido.");
      if (!medicoNome) return alert("Erro: Preencha o nome do médico.");

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
          console.error("Erro ao salvar laudo:", e);
          const msgErro = e.response?.data 
            ? JSON.stringify(e.response.data, null, 2) 
            : e.message;
          alert(`Erro ao salvar: ${msgErro}`);
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

  // --- NOVA FUNÇÃO: IMPRIMIR TERMO ---
  const handleImprimirTermo = () => {
      if (!medicoNome) {
          alert("Por favor, preencha o nome do Médico.");
          return;
      }

      const nomePaciente = paciente?.nome_completo || "__________________________________________________________";
      const cpfPaciente = paciente?.cpf || "________________________";
      const rgPaciente = paciente?.rg || "___________________________"; // Assumindo que o objeto paciente tenha RG
      
      const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
      const hoje = new Date();
      const dataExtenso = `${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;

      const termoWindow = window.open('', '', 'width=800,height=600');
      termoWindow.document.write(`
        <html>
        <head>
            <title>Termo de Consentimento</title>
            <style>
                body { font-family: 'Arial', sans-serif; font-size: 12pt; margin: 0; padding: 0; color: #000; }
                @page { size: A4; margin: 2cm; }
                .content { padding-top: 4.5cm; /* ESPAÇO DO CABEÇALHO SOLICITADO */ }
                h2 { text-align: center; font-size: 14pt; margin-bottom: 30px; text-transform: uppercase; }
                p, li { line-height: 1.5; text-align: justify; margin-bottom: 12px; }
                ul { list-style-type: disc; margin-left: 20px; }
                .check-group { margin: 15px 0; }
                .assinaturas { margin-top: 50px; display: flex; flex-direction: column; gap: 40px; }
                .assinatura-box { width: 100%; }
                .linha { border-top: 1px solid #000; width: 60%; margin-bottom: 5px; }
            </style>
        </head>
        <body>
            <div class="content">
                <h2>TERMO DE CONSENTIMENTO PARA USO DE IMAGEM</h2>
                
                <p>
                    Eu, <strong>${nomePaciente}</strong>, portador(a) do CPF nº <strong>${cpfPaciente}</strong>, 
                    RG nº <strong>${rgPaciente}</strong>, autorizo de forma livre, informada e inequívoca o uso da minha imagem 
                    (fotografias, vídeos ou registros audiovisuais), captada durante ou após meu atendimento/tratamento realizado 
                    com o(a) Dr(a). <strong>${medicoNome}</strong> (CRM: ${medicoCrm}).
                </p>

                <p>Autorizo que minha imagem seja utilizada com a finalidade de:</p>
                <div class="check-group">
                    (x) Divulgação científica (congressos, artigos, aulas, etc.)<br/>
                    (x) Divulgação institucional (site, redes sociais e materiais informativos da clínica)<br/>
                    (x) Antes e depois para fins ilustrativos e educativos
                </div>

                <p>Declaro que:</p>
                <ul>
                    <li>A utilização da imagem se dará exclusivamente para os fins acima indicados, sem caráter pejorativo ou difamatório.</li>
                    <li>Estou ciente de que minha imagem poderá ser visualizada por terceiros, inclusive em meios digitais e redes sociais, e compreendo que, uma vez publicada, a clínica não tem controle total sobre a circulação do conteúdo.</li>
                    <li>Estou ciente de que posso, a qualquer momento, solicitar a revogação deste consentimento, por escrito, conforme previsto na Lei nº 13.709/2018 (LGPD).</li>
                    <li>Não haverá qualquer tipo de compensação financeira pelo uso da imagem.</li>
                    <li>Estou ciente de que a utilização de minha imagem em conteúdos ilustrativos e educativos não representa garantia de resultados semelhantes para outros pacientes, respeitando-se as individualidades de cada caso.</li>
                </ul>

                <p>Declaro, por fim, que todas as minhas dúvidas foram esclarecidas e que firmo este termo por minha livre vontade.</p>
                
                <p style="text-align: right; margin-top: 40px;">
                    Diadema, ${dataExtenso}.
                </p>

                <div class="assinaturas">
                    <div class="assinatura-box">
                        <div class="linha"></div>
                        Assinatura do(a) paciente
                    </div>
                    
                    <div class="assinatura-box">
                        <div class="linha"></div>
                        Assinatura do profissional responsável: <strong>${medicoNome}</strong>
                    </div>
                </div>
            </div>
            <script>
                window.onload = function() { window.print(); window.close(); }
            </script>
        </body>
        </html>
      `);
      termoWindow.document.close();
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
                <div style={{display:'flex', gap:'5px', position: 'relative'}}>
                    {/* Campo de Busca de Médico unificado (Estilo Paciente) */}
                    <div style={{flex: 2, position: 'relative'}}>
                        <input 
                            placeholder="Digite o nome do médico..."
                            value={medicoNome}
                            onChange={(e) => handleInputMedicoChange(e.target.value)}
                            onFocus={() => { if(medicoNome) setMostrarListaMedicos(true); }}
                            onBlur={() => setTimeout(() => setMostrarListaMedicos(false), 200)} // Delay para permitir o clique
                            style={{...styles.inputControl}}
                        />
                        {mostrarListaMedicos && medicosFiltrados.length > 0 && (
                            <div style={styles.dropdownList}>
                                {medicosFiltrados.map(med => (
                                    <div 
                                        key={med.id} 
                                        onClick={() => selecionarMedico(med)} 
                                        style={styles.dropdownItem}
                                    >
                                        {med.first_name ? `${med.first_name} ${med.last_name}` : med.username}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

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
                 
                 {/* Container dos botões */}
                 <div style={{display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center'}}>
                     <input type="file" id="img-upload" multiple accept="image/*" onChange={handleImageUpload} style={{display: 'none'}} />
                     
                     {/* Botão FOTOS corrigido */}
                     <label htmlFor="img-upload" style={{...styles.button, background: '#FF9800'}}>
                        <FaCamera size={10}/> FOTOS
                     </label>

                     {/* Botão TERMO (NOVO) */}
                     <button onClick={handleImprimirTermo} style={{...styles.button, background: '#607D8B'}} title="Imprimir Termo de Consentimento">
                        <FaFileSignature size={10}/> TERMO
                     </button>
                     
                     <button onClick={handleLimpar} style={{...styles.button, background: '#D32F2F'}} title="Limpar formulário">
                        <FaEraser size={10}/> LIMPAR
                     </button>

                     <button onClick={handleSave} disabled={saving} style={{...styles.button, background: saving ? '#ccc' : theme.accent}}>
                        {saving ? <FaSpinner className="spin" size={10}/> : <FaSave size={10}/>} SALVAR
                     </button>
                     <button onClick={handlePrint} style={{...styles.button, background: theme.primary}}>
                        <FaPrint size={10}/> IMPRIMIR
                     </button>
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