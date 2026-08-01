// src/pages/LaudosPageV2.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  FaSave, FaFileAlt, FaSpinner, FaEraser, FaUserMd, FaFileSignature, 
  FaUserInjured, FaNotesMedical, FaIdCard, FaTimes, FaWhatsapp, 
  FaEnvelope, FaCheckCircle 
} from 'react-icons/fa';
import apiClient from '../api/axiosConfig';
import { 
  Box, Typography, Grid, Button, Dialog, DialogActions, Stack, 
  Tooltip, IconButton, Divider 
} from '@mui/material';
import '../components/laudos/Laudos.css';
import '../atendimento.css';

// A EXPORTAÇÃO EXATA
import { gerarConteudoParaEditor } from '../utils/htmlParser';

import FormObstetrico from '../components/laudos/obstetrico/FormObstetrico';
import FormAbdome from '../components/laudos/abdome/FormAbdome'; 
import FormTransvaginal from '../components/laudos/trasnvaginal/FormTransvaginal';
import FormEcocardiograma from '../components/laudos/ecocardiograma/FormEcocardiograma';
import FormDopplerCarotidas from '../components/laudos/carotidas/FormDopplerCarotidas';
import FormEletrocardiograma from '../components/laudos/eletrocardiograma/FormEletrocardiograma';

import AtestadoModal from '../components/laudos/AtestadoModal';
import LaudosPreviewModalV2 from '../components/laudos/LaudosPreviewModalV2'; 
import ImagensNuvemModal from '../components/laudos/ImagensNuvemModal'; 

const theme = { primary: '#1C2E4A', secondary: '#C5A47E', accent: '#2E7D32', bg: '#F0F2F5', border: '#dee2e6' };

const styles = {
    dropdownList: {
        position: 'absolute', top: '34px', left: 0, right: 0, background: 'white',
        border: '1px solid #ced4da', borderRadius: '0 0 4px 4px', zIndex: 100, 
        maxHeight: '180px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    },
    dropdownItem: {
        padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #eee', 
        fontSize: '12px', color: '#495057'
    }
};

const STORAGE_KEY = 'laudos_rascunho_auto_save_v2'; 
const maskCRM = (value) => value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1'); 

const getInitialState = (key, fallback) => {
    try {
        const saved = sessionStorage.getItem(STORAGE_KEY); 
        if (saved) {
            const parsed = JSON.parse(saved);
            return parsed[key] !== undefined ? parsed[key] : fallback;
        }
    } catch (e) { console.error("Erro ao ler rascunho", e); }
    return fallback;
};

const LaudosPageV2 = () => {
  const [tipoExame, setTipoExame] = useState(() => getInitialState('tipoExame', 'OBSTETRICO'));
  const [paciente, setPaciente] = useState(() => getInitialState('paciente', null));
  const [termoBusca, setTermoBusca] = useState('');
  const [pacientesEncontrados, setPacientesEncontrados] = useState([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  
  const [medicoNome, setMedicoNome] = useState(() => getInitialState('medicoNome', ''));
  const [medicoCrm, setMedicoCrm] = useState(() => getInitialState('medicoCrm', ''));
  const [medicoEspecialidades, setMedicoEspecialidades] = useState(() => getInitialState('medicoEspecialidades', []));
  const [todosMedicos, setTodosMedicos] = useState([]);
  const [medicosFiltrados, setMedicosFiltrados] = useState([]); 
  const [mostrarListaMedicos, setMostrarListaMedicos] = useState(false);
  const [usuarioTemCertificado, setUsuarioTemCertificado] = useState(false);
  
  const [textoFinal, setTextoFinal] = useState(() => getInitialState('textoFinal', ''));
  const [dadosEstruturados, setDadosEstruturados] = useState(() => getInitialState('dadosEstruturados', {}));
  const [tituloExame, setTituloExame] = useState(() => getInitialState('tituloExame', ''));
  const [imagens, setImagens] = useState(() => getInitialState('imagens', []));
  
  const [modalSucessoOpen, setModalSucessoOpen] = useState(false);
  const [credenciais, setCredenciais] = useState(null);
  const [laudoId, setLaudoId] = useState(() => getInitialState('laudoId', null)); 
  const [modalAtestadoOpen, setModalAtestadoOpen] = useState(false);
  const [modalRevisaoOpen, setModalRevisaoOpen] = useState(false); 
  const [modalNuvemOpen, setModalNuvemOpen] = useState(false); 
  const [isPolling, setIsPolling] = useState(false);

  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    const carregarMedicos = async () => {
        try {
            const res = await apiClient.get('/usuarios/usuarios/?cargo=medico&apenas_ativos=true');
            let listaRaw = Array.isArray(res.data) ? res.data : (res.data.results || []);
            const listaOrdenada = listaRaw.sort((a, b) => (a.first_name || a.username || "").localeCompare(b.first_name || b.username || ""));
            setTodosMedicos(listaOrdenada);
            setMedicosFiltrados(listaOrdenada); 
        } catch (e) { console.error("Erro ao buscar médicos:", e); }
    };
    carregarMedicos();

    const checarUsuario = async () => {
        try {
            const res = await apiClient.get('/usuarios/me/'); 
            if (res.data.tem_certificado_valido) setUsuarioTemCertificado(true);
        } catch (e) { console.error("Erro ao verificar certificado", e); }
    };
    checarUsuario();
  }, []);

  const handleInputMedicoChange = (texto) => {
      setMedicoNome(texto);
      setMostrarListaMedicos(true);
      if (!texto) return setMedicosFiltrados(todosMedicos);
      const termo = texto.toLowerCase();
      setMedicosFiltrados(todosMedicos.filter(m => {
          const nomeCompleto = m.first_name ? `${m.first_name} ${m.last_name}` : m.username;
          return nomeCompleto.toLowerCase().includes(termo) || (m.crm || '').includes(termo);
      }));
  };

  const selecionarMedico = (medico) => {
      setMedicoNome(medico.first_name ? `${medico.first_name} ${medico.last_name}` : medico.username);
      setMedicoCrm(medico.crm || ''); 
      setMedicoEspecialidades(medico.medico_especialidades || []);
      setMostrarListaMedicos(false);
  };

  const handleBuscaPacienteChange = (e) => {
      const termo = e.target.value;
      setTermoBusca(termo);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (termo.length < 3) return setPacientesEncontrados([]);
      setLoadingBusca(true);
      searchTimeoutRef.current = setTimeout(async () => {
          try {
              const res = await apiClient.get('/pacientes/', { params: { search: termo } });
              setPacientesEncontrados(Array.isArray(res.data) ? res.data : res.data.results || []);
          } catch (e) { console.error(e); } finally { setLoadingBusca(false); }
      }, 300);
  };

  useEffect(() => {
      const dados = { laudoId, tipoExame, paciente, medicoNome, medicoCrm, medicoEspecialidades, textoFinal, dadosEstruturados, tituloExame, imagens };
      const timeoutId = setTimeout(() => {
          try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dados)); } 
          catch (e) { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...dados, imagens: [] })); }
      }, 1000);
      return () => clearTimeout(timeoutId);
  }, [laudoId, tipoExame, paciente, medicoNome, medicoCrm, medicoEspecialidades, textoFinal, dadosEstruturados, tituloExame, imagens]);

  const handleLimpar = () => {
    if (window.confirm("Limpar formulário? Rascunho será perdido.")) {
        sessionStorage.removeItem(STORAGE_KEY);
        setLaudoId(null); setCredenciais(null); setTipoExame('OBSTETRICO'); setPaciente(null);
        setMedicoNome(''); setMedicoCrm(''); setMedicoEspecialidades([]); setTextoFinal('');
        setDadosEstruturados({}); setTituloExame(''); setImagens([]); setTermoBusca(''); setPacientesEncontrados([]);
    }
  };

  const handleFormUpdate = useCallback((dados) => {
      if (dados.texto !== undefined) setTextoFinal(dados.texto);
      if (dados.dadosEstruturados) setDadosEstruturados(prev => ({ ...prev, ...dados.dadosEstruturados }));
      if (dados.tituloExame !== undefined) setTituloExame(dados.tituloExame);
  }, []);

  const otimizarImagemParaPDF = (base64Str, maxWidth = 1200, qualidade = 0.85) => {
    return new Promise((resolve, reject) => {
        if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) return resolve(base64Str);
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let [width, height] = [img.width, img.height];
            if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
            ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', qualidade));
        };
        img.onerror = reject;
    });
  };

  const getMensagemCompartilhamento = (canal) => {
      const cod = credenciais?.codigo || "---";
      const pass = credenciais?.senha || "---";
      const link = credenciais?.link || "https://clinica-limale.vercel.app/resultados";
      const nomePct = paciente?.nome_completo?.split(' ')[0] || "Paciente";
      const exameTitulo = tituloExame || tipoExame || "Exame";

      if (canal === 'whatsapp') {
          return `Olá, *${nomePct}*! \n\nSeu laudo de *${exameTitulo}* está pronto.\n\nAcesse o resultado e imagens no link:\n${link}\n\n*DADOS DE ACESSO:*\nUsuário: *${cod}*\nSenha: *${pass}*\n\nBaixe o PDF em anexo.\nAtt, Clínica Limalé`;
      }
      return `Olá, ${nomePct}!\n\nSeu laudo de ${exameTitulo} está pronto.\n\nAcesse o resultado e imagens clicando no link abaixo:\n${link}\n\nDADOS DE ACESSO:\nUsuário: ${cod}\nSenha: ${pass}\n\nBaixe o PDF em anexo.\nAtt, Clínica Limalé`;
  };

  const handleEnviarWhatsApp = () => {
      const texto = getMensagemCompartilhamento('whatsapp');
      const telefoneRaw = paciente?.telefone_celular || paciente?.telefone || ""; 
      const apenasNumeros = telefoneRaw.replace(/\D/g, "");
      let urlWhats = apenasNumeros.length >= 10 
        ? `https://wa.me/55${apenasNumeros}?text=${encodeURIComponent(texto)}`
        : `https://wa.me/?text=${encodeURIComponent(texto)}`;
      window.open(urlWhats, '_blank');
  };

  const handleEnviarEmail = () => {
      const texto = getMensagemCompartilhamento('email'); 
      const email = paciente?.email || "";
      const assunto = `Resultado de Exame - Clínica Limalé`;
      window.open(`mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(texto)}`, '_blank');
  };

  const handleImprimirTermo = () => {
      if (!medicoNome) return alert("Por favor, preencha o nome do Médico.");
      const nomePaciente = paciente?.nome_completo || "__________________________________________________________";
      const cpfPaciente = paciente?.cpf || "________________________";
      const rgPaciente = paciente?.rg || "___________________________";
      const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
      const hoje = new Date();
      const dataExtenso = `${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;

      const termoWindow = window.open('', '', 'width=800,height=600');
      termoWindow.document.write(`<html><head><title>Termo de Consentimento</title><style>body { font-family: 'Arial', sans-serif; font-size: 10pt; margin: 0; padding: 0; } @page { size: A4; margin: 1.5cm 2cm; } .content { padding-top: 4.5cm; } h2 { text-align: center; font-size: 12pt; margin-bottom: 20px; font-weight: bold; } p, li { line-height: 1.3; text-align: justify; margin-bottom: 8px; } ul { margin-left: 20px; margin-bottom: 10px; } .check-group { margin: 10px 0; } .assinaturas { margin-top: 30px; display: flex; flex-direction: column; gap: 30px; } .assinatura-box { width: 100%; } .linha { border-top: 1px solid #000; width: 60%; margin-bottom: 4px; }</style></head><body><div class="content"><h2>TERMO DE CONSENTIMENTO PARA USO DE IMAGEM</h2><p>Eu, <strong>${nomePaciente}</strong>, portador(a) do CPF nº <strong>${cpfPaciente}</strong>, RG nº <strong>${rgPaciente}</strong>, autorizo de forma livre, informada e inequívoca o uso da minha imagem, captada durante ou após meu atendimento realizado com o(a) Dr(a). <strong>${medicoNome}</strong> (CRM: ${medicoCrm}).</p><p>Autorizo que minha imagem seja utilizada para:</p><div class="check-group">(x) Divulgação científica<br/>(x) Divulgação institucional<br/>(x) Antes e depois ilustrativos</div><p>Declaro estar ciente que a utilização se dará para fins indicados, sem caráter pejorativo, e que posso revogar este consentimento a qualquer momento.</p><p style="text-align: right; margin-top: 20px;">Diadema, ${dataExtenso}.</p><div class="assinaturas"><div class="assinatura-box"><div class="linha"></div>Assinatura do(a) paciente</div><div class="assinatura-box"><div class="linha"></div>Assinatura do profissional: <strong>${medicoNome}</strong></div></div></div><script>window.onload = function() { window.print(); window.close(); }</script></body></html>`);
      termoWindow.document.close();
  };

  const handleFinalizacaoAssincrona = async (htmlDoEditor, imagensFinais, dataExameSelecionada) => {
    if (isPolling) return;
    if (!paciente || !paciente.id) return alert("Selecione um paciente.");
    if (!medicoNome) return alert("Preencha o nome do médico.");

    const confirmacao = window.confirm("Atenção: Deseja gerar o laudo definitivo agora?");
    if (!confirmacao) return;

    setModalRevisaoOpen(false);
    setIsPolling(true);

    try {
        const imagensOtimizadas = await Promise.all(imagensFinais.map(img => otimizarImagemParaPDF(img)));
        setTextoFinal(htmlDoEditor); 
        setImagens(imagensOtimizadas);

        const formData = new FormData();
        formData.append('paciente', paciente.id);
        formData.append('data_exame', dataExameSelecionada); 
        formData.append('tipo_exame', tipoExame);
        formData.append('titulo', tituloExame || `Laudo de ${tipoExame}`);
        formData.append('texto_laudo', htmlDoEditor); 
        formData.append('medico_responsavel', medicoNome);
        formData.append('crm_medico', medicoCrm);
        formData.append('dados_estruturados', JSON.stringify(dadosEstruturados));
        formData.append('imagens_anexas', JSON.stringify(imagensOtimizadas));
        formData.append('versao_laudo', 'v2');
        
        let response = await apiClient.post('/prontuario/laudos-async/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        const laudoProcessandoId = response.data.id;
        setLaudoId(laudoProcessandoId);

        const checkStatus = async () => {
            try {
                const res = await apiClient.get(`/prontuario/laudos/${laudoProcessandoId}/status/`);
                if (res.data.status === 'FINALIZADO') {
                    setIsPolling(false);
                    if (res.data.credenciais) setCredenciais(res.data.credenciais);
                    if (res.data.arquivo_url) {
                        const baseUrl = apiClient.defaults.baseURL.replace('/api', '').replace(/\/$/, '');
                        const urlCompleta = res.data.arquivo_url.startsWith('/') ? `${baseUrl}${res.data.arquivo_url}` : res.data.arquivo_url;
                        window.open(urlCompleta, '_blank');
                    }
                    setModalSucessoOpen(true);
                } else if (res.data.status === 'ERRO') {
                    setIsPolling(false);
                    alert("⚠️ Falha na Assinatura Digital!");
                } else {
                    setTimeout(checkStatus, 3000);
                }
            } catch(e) { setTimeout(checkStatus, 3000); }
        };
        setTimeout(checkStatus, 3000);

    } catch (e) {
        setIsPolling(false);
        alert("Erro ao enviar o laudo para processamento.");
    }
  };

  const handleImportarDaNuvem = (novasImagensBase64) => setImagens(prev => [...prev, ...novasImagensBase64]);

  const htmlPronto = gerarConteudoParaEditor({
      paciente, dadosEstruturados, tituloExame, tipoExame, textoLaudo: textoFinal, dataExame: ''
  });

  return (
    <div className="tasy-workspace" style={{ flex: 1, display: 'flex', background: theme.bg, minHeight: 0, overflow: 'hidden', fontFamily: "'Segoe UI', Roboto, sans-serif", fontSize: '11px', color: '#333' }}>
      
      {/* COLUNA ESQUERDA */}
      <div className="tasy-flat-panel" style={{ flex: 2, minWidth: '700px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #dee2e6', minHeight: 0 }}>
        
        {/* BARRA DE FERRAMENTAS */}
        <div style={{ background: '#f8f9fa', borderBottom: `1px solid ${theme.border}`, padding: '10px 16px', display: 'grid', gridTemplateColumns: 'minmax(220px, 3.5fr) minmax(130px, 1.5fr) minmax(180px, 2.5fr) 100px', gap: '12px', alignItems: 'center', flexShrink: 0, zIndex: 20 }}>
            {/* PACIENTE */}
            <div className="tasy-compact-input" style={{position: 'relative', background: '#fff', border: '1px solid #ced4da', borderRadius: '3px', display: 'flex', alignItems: 'center', height: '32px'}}> 
                <div style={{ padding: '0 10px', color: '#6c757d' }}><FaUserInjured size={13} /></div>
                <input 
                    style={{ border: 'none', width: '100%', height: '100%', outline: 'none', fontSize: '12px', color: '#495057' }}
                    placeholder="Buscar Paciente..."
                    value={paciente ? `${paciente.id}_${paciente.nome_completo}` : termoBusca}
                    onChange={(e) => { if (paciente) setPaciente(null); handleBuscaPacienteChange(e); }}
                />
                <div style={{position:'absolute', right:'8px', cursor:'pointer', display: 'flex', alignItems: 'center'}}>
                    {loadingBusca ? <FaSpinner className="spin" color="#999"/> : 
                    (paciente || termoBusca.length > 0) ? 
                        <FaTimes color="#d32f2f" onClick={() => { 
                            setPaciente(null); setTermoBusca(''); setPacientesEncontrados([]); 
                            setMedicoEspecialidades([]); setLaudoId(null); setCredenciais(null); 
                            setTextoFinal(''); setDadosEstruturados({}); setImagens([]); setTituloExame(''); 
                            sessionStorage.removeItem(STORAGE_KEY); 
                        }}/> 
                        : null}
                </div>

                {!paciente && pacientesEncontrados.length > 0 && (
                    <div style={styles.dropdownList}>
                        {pacientesEncontrados.map(p => (
                            <div key={p.id} style={styles.dropdownItem} onClick={async () => {
                                setLaudoId(null); setCredenciais(null); setTextoFinal('');
                                setDadosEstruturados({}); setImagens([]); setTituloExame('');
                                sessionStorage.removeItem(STORAGE_KEY);

                                const rawSexo = p.genero || p.sexo || '';
                                const cleanSexo = rawSexo.toString().trim().toUpperCase();
                                let sexoMapeado = 'Masculino';
                                if (cleanSexo === 'F' || cleanSexo === 'FEMININO') sexoMapeado = 'Feminino';
                                else if (cleanSexo === 'O' || cleanSexo === 'OUTRO') sexoMapeado = 'Outro';
                                else if (cleanSexo === 'M' || cleanSexo === 'MASCULINO') sexoMapeado = 'Masculino';
                                else sexoMapeado = rawSexo;

                                setPaciente(p);
                                setDadosEstruturados(prev => ({ ...prev, dataNascimento: p.data_nascimento || '', sexo: sexoMapeado }));
                                setTermoBusca(''); setPacientesEncontrados([]);

                                try {
                                    const res = await apiClient.get(`/prontuario/credenciais-ativas/?paciente_id=${p.id}`);
                                    if (res.data?.codigo) setCredenciais(res.data); else setCredenciais(null);
                                } catch (e) { console.log("Sem credencial."); }
                            }}>
                                <span style={{fontWeight:'bold', display:'flex', alignItems: 'center', gap: '8px'}}>
                                    <span style={{ background: '#1864ab', color: '#FFF', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                                        ID: {p.id}
                                    </span>
                                    {p.nome_completo}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* TIPO DE EXAME */}
            <div className="tasy-compact-input" style={{background: '#fff', border: '1px solid #ced4da', borderRadius: '3px', display: 'flex', alignItems: 'center', height: '32px'}}>
                <div style={{ padding: '0 10px', color: '#6c757d' }}><FaNotesMedical size={13} /></div>
                <select value={tipoExame} onChange={(e) => setTipoExame(e.target.value)} style={{ border: 'none', width: '100%', height: '100%', outline: 'none', fontSize: '12px', color: '#495057', background: 'transparent' }}>
                    <option value="OBSTETRICO">Medicina Fetal</option>
                    <option value="TRANSVAGINAL">Transvaginal</option>
                    <option value="ECOCARDIOGRAMA">Ecocardiograma</option>
                    <option value="ABDOME">US Geral</option>
                    <option value="DOPPLER_CAROTIDAS">Carótidas</option>
                    <option value="ELETROCARDIOGRAMA">Eletrocardiograma</option> 
                </select>
            </div>

            {/* MÉDICO */}
            <div className="tasy-compact-input" style={{position: 'relative', background: '#fff', border: '1px solid #ced4da', borderRadius: '3px', display: 'flex', alignItems: 'center', height: '32px'}}>
                <div style={{ padding: '0 10px', color: '#6c757d' }}><FaUserMd size={13} /></div>
                <input 
                    style={{ border: 'none', width: '100%', height: '100%', outline: 'none', fontSize: '12px', color: '#495057' }} 
                    placeholder="Médico..." 
                    value={medicoNome} 
                    onChange={(e) => handleInputMedicoChange(e.target.value)} 
                    onFocus={() => { setMostrarListaMedicos(true); if(!medicoNome) setMedicosFiltrados(todosMedicos); }} 
                    onBlur={() => setTimeout(() => setMostrarListaMedicos(false), 200)}
                />
                {mostrarListaMedicos && medicosFiltrados.length > 0 && (
                    <div style={styles.dropdownList}>
                        {medicosFiltrados.map(med => (
                            <div key={med.id} onClick={() => selecionarMedico(med)} style={styles.dropdownItem}>
                                <span>{med.first_name ? `${med.first_name} ${med.last_name}` : med.username}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* CRM */}
            <div className="tasy-compact-input" style={{background: '#fff', border: '1px solid #ced4da', borderRadius: '3px', display: 'flex', alignItems: 'center', height: '32px'}}>
                <input style={{ border: 'none', width: '100%', height: '100%', outline: 'none', fontSize: '12px', textAlign: 'center', color: '#495057' }} placeholder="CRM" value={medicoCrm} onChange={(e) => setMedicoCrm(maskCRM(e.target.value))} />
            </div>
        </div>

        {/* ÁREA DO FORMULÁRIO DINÂMICO */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#ffffff' }}> 
            <div className="tasy-section-header">Preenchimento Clínico</div>
            {tipoExame === 'OBSTETRICO' && <FormObstetrico key={`${paciente?.id || 'novo'}-${dadosEstruturados?.sexo || ''}-${tipoExame}`} onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            {tipoExame === 'ABDOME' && <FormAbdome key={`${paciente?.id || 'novo'}-${dadosEstruturados?.sexo || ''}-${tipoExame}`} onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            {tipoExame === 'TRANSVAGINAL' && <FormTransvaginal key={`${paciente?.id || 'novo'}-${tipoExame}`} onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            {tipoExame === 'ECOCARDIOGRAMA' && <FormEcocardiograma key={`${paciente?.id || 'novo'}-${tipoExame}`} onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            {tipoExame === 'DOPPLER_CAROTIDAS' && <FormDopplerCarotidas key={`${paciente?.id || 'novo'}-${tipoExame}`} onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            {tipoExame === 'ELETROCARDIOGRAMA' && <FormEletrocardiograma key={`${paciente?.id || 'novo'}-${tipoExame}`} onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
        </div>
      </div> 

      {/* COLUNA DIREITA (PREVIEW RÁPIDO VIA DIV PURE - ULTRA RESPOSITIVO) */}
      <div style={{ flex: 1, minWidth: '400px', display: 'flex', flexDirection: 'column', background: theme.bg, minHeight: 0, paddingLeft: '8px' }}>
         <div className="tasy-flat-panel" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}> 
             
             {/* BARRA DE AÇÕES */}
             <Box sx={{ px: 2, background: '#f8f9fa', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '45px', flexShrink: 0 }}>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                     <FaFileSignature color="#495057" size={14} />
                     <Typography variant="caption" sx={{ fontWeight: 600, color: '#495057', fontSize: '12px', textTransform: 'uppercase' }}>Pré-visualização</Typography>
                 </Box>
                 <Stack direction="row" spacing={1} alignItems="center">
                     <Tooltip title="Limpar"><IconButton onClick={handleLimpar} size="small" sx={{ color: '#fa5252' }}><FaEraser size={14} /></IconButton></Tooltip>
                     <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />
                     
                     <Button size="small" onClick={handleImprimirTermo} sx={{ color: '#495057', textTransform: 'none', fontSize: '11px', fontWeight: 600, minWidth: 'auto' }}>
                         Termo
                     </Button>
                     <Button 
                         size="small" 
                         onClick={() => {
                             if (!paciente || !medicoNome) return alert("Selecione um Paciente e identifique o Médico antes de gerar o documento.");
                             setModalAtestadoOpen(true);
                         }} 
                         sx={{ color: '#0b7285', textTransform: 'none', fontSize: '11px', fontWeight: 600, minWidth: 'auto' }}
                     >
                         Atestado
                     </Button>

                    <Button 
                        variant="contained" size="small" 
                        onClick={() => {
                            if (!textoFinal) return alert("Preencha as medidas para gerar o laudo.");
                            setModalRevisaoOpen(true);
                        }} 
                        sx={{ background: '#1864ab', textTransform: 'none', fontWeight: '600', fontSize: '11px', ml: 1, boxShadow: 'none', '&:hover': { background: '#1971c2', boxShadow: 'none' } }}
                    >
                        Abrir Editor Visual
                    </Button>
                 </Stack>
             </Box>
             
             {/* PRÉVIA MINIATURA NATIVA (SEM IFRAME) */}
             <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', background: '#e9ecef', padding: '20px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box 
                    className="laudo-preview-container"
                    sx={{ 
                        width: '100%', 
                        maxWidth: '500px', // Limita a largura máxima da prévia
                        aspectRatio: '210 / 297', // Mantém a proporção exata de uma folha A4
                        backgroundColor: '#ffffff',
                        backgroundImage: "url('/Receituario_v2.jpg')", 
                        backgroundSize: 'cover', // Faz o fundo cobrir a div proporcionalmente
                        backgroundPosition: 'center top',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
                        border: '1px solid #d1d5db',
                        position: 'relative',
                        // O padding é baseado em porcentagem para acompanhar o tamanho da div
                        paddingTop: '20%', 
                        paddingBottom: '15%',
                        paddingLeft: '7%',
                        paddingRight: '7%',
                        boxSizing: 'border-box',
                        overflow: 'hidden', // Evita que o texto vaze se for muito longo
                        '& p, & div, & h3, & h4, & span, & td': {
                            // Diminui a fonte geral na prévia para simular a miniatura
                            fontSize: '0.65rem !important',
                            lineHeight: '1.2 !important',
                        },
                        '& table': {
                            marginBottom: '6px !important'
                        },
                        '& h3': {
                            marginBottom: '10px !important'
                        },
                        '& h4': {
                            marginTop: '8px !important',
                            marginBottom: '2px !important'
                        },
                        '& #header_content_v2': {
                            // Ajuste do cabeçalho flutuante para a miniatura
                            width: '40% !important',
                            marginTop: '-15% !important',
                            fontSize: '0.6rem !important'
                        }
                    }}
                >
                    <div 
                        dangerouslySetInnerHTML={{ __html: htmlPronto }} 
                        style={{ width: '100%', height: '100%' }}
                    />
                </Box>
             </div>
         </div>
      </div>

      {/* MODAIS */}
      <LaudosPreviewModalV2 
          open={modalRevisaoOpen} 
          onClose={() => setModalRevisaoOpen(false)} 
          htmlInicial={htmlPronto} 
          imagensIniciais={imagens} 
          onFinalizar={handleFinalizacaoAssincrona}
          onAbrirNuvem={() => setModalNuvemOpen(true)}
          nomePaciente={paciente?.nome_completo}
          onSalvarRascunho={(htmlEditado) => {
              setTextoFinal(htmlEditado);
              setModalRevisaoOpen(false);
          }}
      />
      <ImagensNuvemModal open={modalNuvemOpen} onClose={() => setModalNuvemOpen(false)} paciente={paciente} onConfirmar={handleImportarDaNuvem} />
      <AtestadoModal open={modalAtestadoOpen} onClose={() => setModalAtestadoOpen(false)} paciente={paciente} medicoNome={medicoNome} medicoCrm={medicoCrm} usaAssinaturaDigital={usuarioTemCertificado} />

      {/* SUCESSO E POLLING */}
      <Dialog open={modalSucessoOpen} onClose={() => setModalSucessoOpen(false)} maxWidth="sm" fullWidth>
        <div style={{padding: '30px', textAlign: 'center'}}>
            <FaCheckCircle size={60} color="#4CAF50" style={{marginBottom: 15}} />
            <Typography variant="h5" style={{fontWeight: 'bold', color: '#2C3E50', marginBottom: 10}}>Laudo Salvo com Sucesso!</Typography>
            <Typography variant="body1" style={{color: '#555', marginBottom: 30}}>O exame foi registrado no prontuário.</Typography>
            <div style={{background: '#F0F4F8', border: '1px dashed #B0BEC5', borderRadius: 8, padding: '15px', marginBottom: 30, textAlign: 'left'}}>
                <Typography variant="subtitle2" style={{color: '#1C2E4A', fontWeight: 'bold', marginBottom: 5}}>DADOS DE ACESSO GERADOS:</Typography>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '14px'}}>
                    <span>Usuário: <strong>{credenciais?.codigo || '---'}</strong></span>
                    <span>Senha: <strong>{credenciais?.senha || '---'}</strong></span>
                </div>
            </div>
            <Grid container spacing={2}>
                <Grid item xs={6}><Button fullWidth variant="contained" onClick={handleEnviarWhatsApp} style={{background: '#25D366', height: '50px', fontSize: '12px', display: 'flex', gap: '8px'}}><FaWhatsapp size={20} /> Enviar WhatsApp</Button></Grid>
                <Grid item xs={6}><Button fullWidth variant="contained" onClick={handleEnviarEmail} style={{background: '#1C2E4A', height: '50px', fontSize: '12px', display: 'flex', gap: '8px'}}><FaEnvelope size={20} /> Enviar E-mail</Button></Grid>
            </Grid>
        </div>
        <DialogActions><Button onClick={() => setModalSucessoOpen(false)} style={{color: '#888'}}>Fechar Janela</Button></DialogActions>
      </Dialog>

      <Dialog open={isPolling} disableEscapeKeyDown>
        <div style={{padding: '40px', textAlign: 'center', minWidth: '300px'}}>
            <FaSpinner className="spin" size={40} color="#1C2E4A" style={{marginBottom: '20px'}}/>
            <Typography variant="h6" style={{fontWeight: 'bold', color: '#1C2E4A'}}>Processando Laudo...</Typography>
            <Typography variant="body2" color="textSecondary" style={{marginTop: '10px'}}>
                Gerando PDF e aplicando assinatura digital.<br/>Isso pode levar alguns segundos.
            </Typography>
        </div>
      </Dialog>

    </div>
  );
};

export default LaudosPageV2;