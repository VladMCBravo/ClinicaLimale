// src/pages/LaudosPage.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  FaSave, FaFileAlt, FaSpinner, FaEraser, FaUserMd, FaUserInjured, 
  FaNotesMedical, FaIdCard, FaTimes, FaCheckCircle, FaWhatsapp, 
  FaEnvelope, FaExclamationTriangle, FaCalendarAlt, FaStethoscope, FaClock
} from 'react-icons/fa';
import apiClient from '../api/axiosConfig';
// Imports Material UI
import { 
  Box, Typography, Grid, Button, Dialog, DialogActions, 
  Stack, Tooltip, IconButton, Divider, Card, CardActionArea, CardContent, Chip 
} from '@mui/material';
import '../components/laudos/Laudos.css';

// Serviços e Utils
import { agendamentoService } from '../services/agendamentoService';
import { formatarHoraTZ } from '../utils/format';
import { calcularStatusSemaforo } from '../utils/semaforoAgendamento';

// Importação dos Formulários
import FormObstetrico from '../components/laudos/obstetrico/FormObstetrico';
import FormAbdome from '../components/laudos/abdome/FormAbdome'; 
import FormTransvaginal from '../components/laudos/trasnvaginal/FormTransvaginal';
import FormEcocardiograma from '../components/laudos/ecocardiograma/FormEcocardiograma';
import FormDopplerCarotidas from '../components/laudos/carotidas/FormDopplerCarotidas';
import FormEletrocardiograma from '../components/laudos/eletrocardiograma/FormEletrocardiograma';
import AtestadoModal from '../components/laudos/AtestadoModal'; 
import TermoConsentimentoModal from '../components/laudos/TermoConsentimentoModal'; 
import LaudosPreviewModal from '../components/laudos/LaudosPreviewModal'; 
import ImagensNuvemModal from '../components/laudos/ImagensNuvemModal'; 

// --- TEMA E ESTILOS ---
const theme = { primary: '#1C2E4A', secondary: '#C5A47E', accent: '#2E7D32', bg: '#F0F2F5', border: '#D1D5DB' };

const styles = {
  container: { 
      flex: 1, 
      display: 'flex', 
      background: theme.bg, 
      minHeight: 0, 
      overflow: 'hidden', 
      fontFamily: "'Segoe UI', Roboto, sans-serif", 
      fontSize: '11px', 
      color: '#333' 
  },
  leftCol: { 
      flex: 2, 
      minWidth: '700px', 
      display: 'flex', 
      flexDirection: 'column', 
      background: '#fff',
      borderRight: '1px solid #ddd',
      minHeight: 0 
  },
  formScrollArea: {
      flex: 1,
      overflowY: 'auto', 
      padding: '10px'
  },
  rightCol: { 
      flex: 1, 
      minWidth: '400px',
      display: 'flex', 
      flexDirection: 'column', 
      background: theme.bg,
      minHeight: 0 
  },
  toolbar: {
      background: '#fff',
      borderBottom: `1px solid ${theme.border}`,
      padding: '8px 12px',
      display: 'grid',
      gridTemplateColumns: 'minmax(220px, 3.5fr) minmax(130px, 1.5fr) minmax(180px, 2.5fr) 100px',
      gap: '8px', 
      alignItems: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
      flexShrink: 0, 
      zIndex: 20 
  },
  inputGroup: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      height: '30px', 
      background: '#F0F2F5',
      borderRadius: '4px',
      border: '1px solid #ced4da',
  },
  inputIcon: {
      padding: '0 8px', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #e0e0e0', height: '100%', fontSize: '12px' 
  },
  inputCompact: {
      border: 'none', background: 'transparent', width: '100%', height: '100%', padding: '0 6px', fontSize: '11px', fontWeight: '600', color: '#2C3E50', outline: 'none', textOverflow: 'ellipsis' 
  },
  dropdownList: {
      position: 'absolute', top: '32px', left: 0, right: 0, background: 'white', border: '1px solid #ccc', borderRadius: '0 0 4px 4px', zIndex: 100, maxHeight: '180px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  dropdownItem: {
      padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '11px', color: '#333'
  }
};

const STORAGE_KEY = 'laudos_rascunho_auto_save';
const maskCRM = (value) => {
  return value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1'); 
};

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

// ============================================================================
// FUNÇÃO MÁGICA DE MATCH DE EXAMES (Híbrida: Categoria + Palavras-Chave)
// ============================================================================
const descobrirTipoExame = (ag) => {
    const desc = (ag.procedimento_descricao || ag.especialidade_nome || ag.procedimento || '').toLowerCase();
    const cat = (ag.categoria || '').toUpperCase(); 

    // 1. Tenta pela Categoria definida no ProcedimentosView
    if (cat === 'MED_FETAL') return 'OBSTETRICO';
    if (cat === 'ECOCARDIOGRAMA') return 'ECOCARDIOGRAMA';
    
    // 2. Fallback: Palavras-chave na descrição
    if (desc.includes('obst') || desc.includes('morfol') || desc.includes('fetal') || desc.includes('transluc')) return 'OBSTETRICO';
    if (desc.includes('transvaginal') || desc.includes('endovaginal') || desc.includes('tv')) return 'TRANSVAGINAL';
    if (desc.includes('eco') && !desc.includes('doppler')) return 'ECOCARDIOGRAMA'; 
    if (desc.includes('eletro') || desc.includes('ecg') || desc.includes('cardio')) return 'ELETROCARDIOGRAMA';
    if (desc.includes('carotida') || desc.includes('vertebrais')) return 'DOPPLER_CAROTIDAS';
    if (desc.includes('doppler') && desc.includes('obst')) return 'OBSTETRICO'; 
    
    // Default (US_GERAL, MUSCULO, OUTROS)
    return 'ABDOME';
};


const LaudosPage = () => {
  // Controle de Visualização
  const [telaAtual, setTelaAtual] = useState('CARDS'); // 'CARDS' ou 'FORM'

  // Estados dos Agendamentos do Dia
  const [pacientesDia, setPacientesDia] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [now, setNow] = useState(new Date());

  // Ticker: Atualiza o estado "now" a cada 30 segundos
  useEffect(() => {
      const interval = setInterval(() => setNow(new Date()), 30000);
      return () => clearInterval(interval);
  }, []);

  // Estados principais
  const [tipoExame, setTipoExame] = useState(() => getInitialState('tipoExame', 'OBSTETRICO'));
  const [paciente, setPaciente] = useState(() => getInitialState('paciente', null));
  const hojeISO = new Date().toISOString().split('T')[0];

  // Busca Paciente Manual
  const [termoBusca, setTermoBusca] = useState('');
  const [pacientesEncontrados, setPacientesEncontrados] = useState([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  
  // Médico
  const [medicoNome, setMedicoNome] = useState(() => getInitialState('medicoNome', ''));
  const [medicoCrm, setMedicoCrm] = useState(() => getInitialState('medicoCrm', ''));
  const [medicoEspecialidades, setMedicoEspecialidades] = useState(() => getInitialState('medicoEspecialidades', [])); 
  const [todosMedicos, setTodosMedicos] = useState([]);
  const [medicosFiltrados, setMedicosFiltrados] = useState([]); 
  const [mostrarListaMedicos, setMostrarListaMedicos] = useState(false);
  const [usuarioTemCertificado, setUsuarioTemCertificado] = useState(false);
  const [medicoLogadoObj, setMedicoLogadoObj] = useState(null); // Guarda os dados do médico logado para auto-fill
  
  // Conteúdo do Laudo
  const [textoFinal, setTextoFinal] = useState(() => getInitialState('textoFinal', ''));
  const [dadosEstruturados, setDadosEstruturados] = useState(() => getInitialState('dadosEstruturados', {}));
  const [tituloExame, setTituloExame] = useState(() => getInitialState('tituloExame', ''));
  const [imagens, setImagens] = useState(() => getInitialState('imagens', []));
  
  // Estados de Controle
  const [credenciais, setCredenciais] = useState(null);
  const [laudoId, setLaudoId] = useState(() => getInitialState('laudoId', null)); 
  const [modalSucessoOpen, setModalSucessoOpen] = useState(false);
  const [modalAtestadoOpen, setModalAtestadoOpen] = useState(false);
  const [modalTermoOpen, setModalTermoOpen] = useState(false);
  const [modalRevisaoOpen, setModalRevisaoOpen] = useState(false); 
  const [modalNuvemOpen, setModalNuvemOpen] = useState(false); 
  const [isPolling, setIsPolling] = useState(false);

  // IA
  const [discrepanciasDetectadas, setDiscrepanciasDetectadas] = useState([]);
  const [modalAuditoriaOpen, setModalAuditoriaOpen] = useState(false);
  const [tempSubmissionData, setTempSubmissionData] = useState(null);

  const searchTimeoutRef = useRef(null);

  // --- 1. CARREGAMENTOS INICIAIS ---
  useEffect(() => {
    const carregarMedicos = async () => {
        try {
            const res = await apiClient.get('/usuarios/usuarios/?cargo=medico&apenas_ativos=true');
            let listaRaw = Array.isArray(res.data) ? res.data : res.data.results || [];
            const listaAtivos = listaRaw.filter(medico => medico.is_active !== false && medico.is_active !== 0);
            const listaOrdenada = listaAtivos.sort((a, b) => {
                const nomeA = a.first_name || a.username || "";
                const nomeB = b.first_name || b.username || "";
                return nomeA.localeCompare(nomeB);
            });
            setTodosMedicos(listaOrdenada);
            setMedicosFiltrados(listaOrdenada); 
        } catch (e) { 
            console.error("Erro ao buscar médicos:", e); 
        }
    };
    carregarMedicos();

    const checarUsuario = async () => {
        try {
            const res = await apiClient.get('/usuarios/me/'); 
            if (res.data.tem_certificado_valido) { 
                setUsuarioTemCertificado(true);
            }
            if (res.data.cargo === 'medico') {
                setMedicoLogadoObj(res.data);
            }
        } catch (e) {
            console.error("Erro ao verificar certificado", e);
        }
    };
    checarUsuario();

    // Se já houver um paciente salvo na sessão, vai direto para a tela de edição
    const rascunho = sessionStorage.getItem(STORAGE_KEY);
    if (rascunho) {
        const parsed = JSON.parse(rascunho);
        if (parsed.paciente) setTelaAtual('FORM');
    }
  }, []);

  // Busca os agendamentos de hoje para renderizar os cards
  const fetchAgendamentosCards = useCallback(async () => {
    setLoadingCards(true);
    try {
        const dataHoje = new Date();
        const response = await agendamentoService.getAgendamentosHoje(null, dataHoje);
        
        const agrupadosMap = new Map();
        response.data.forEach(ag => {
            const chave = `${ag.paciente_id || ag.paciente}_${ag.data_hora_inicio}`;
            const procAtual = ag.procedimento_descricao || ag.especialidade_nome || ag.procedimento || 'Consulta';
            
            if (agrupadosMap.has(chave)) {
                const existente = agrupadosMap.get(chave);
                existente.procedimento_descricao += ` + ${procAtual}`;
            } else {
                const novo = { ...ag };
                novo.procedimento_descricao = procAtual;
                agrupadosMap.set(chave, novo);
            }
        });

        const dadosOrdenados = Array.from(agrupadosMap.values()).sort((a, b) => 
            new Date(a.data_hora_inicio) - new Date(b.data_hora_inicio)
        );
        setPacientesDia(dadosOrdenados);
    } catch (error) {
        console.error("Erro ao buscar agendamentos do dia:", error);
    } finally {
        setLoadingCards(false);
    }
  }, []);

  useEffect(() => { 
      if (telaAtual === 'CARDS') {
          fetchAgendamentosCards(); 
      }
  }, [telaAtual, fetchAgendamentosCards]);

  // Trava o scroll do documento
  useEffect(() => {
      const htmlEl = document.documentElement;
      const bodyEl = document.body;
      const prev = {
          htmlOverflow: htmlEl.style.overflow, bodyOverflow: bodyEl.style.overflow,
          htmlHeight: htmlEl.style.height, bodyHeight: bodyEl.style.height,
      };
      htmlEl.style.overflow = 'hidden'; bodyEl.style.overflow = 'hidden';
      htmlEl.style.height = '100%'; bodyEl.style.height = '100%';
      return () => {
          htmlEl.style.overflow = prev.htmlOverflow; bodyEl.style.overflow = prev.bodyOverflow;
          htmlEl.style.height = prev.htmlHeight; bodyEl.style.height = prev.bodyHeight;
      };
  }, []);

  // --- 2. PREENCHIMENTO AUTOMÁTICO (Clique no Card) ---
  const handleCardClick = async (ag) => {
    setLoadingBusca(true);
    try {
        // 1. Busca os dados completos do Paciente (Para injetar Idade/Sexo nos forms)
        const idPaciente = ag.paciente_id || ag.paciente;
        const res = await apiClient.get(`/pacientes/${idPaciente}/`);
        const pacienteCompleto = res.data;

        // Normalização de Sexo
        const rawSexo = pacienteCompleto.genero || pacienteCompleto.sexo || '';
        const cleanSexo = rawSexo.toString().trim().toUpperCase();
        let sexoMapeado = 'Masculino'; 
        if (cleanSexo === 'F' || cleanSexo === 'FEMININO') sexoMapeado = 'Feminino';
        else if (cleanSexo === 'O' || cleanSexo === 'OUTRO') sexoMapeado = 'Outro';
        else if (cleanSexo === 'M' || cleanSexo === 'MASCULINO') sexoMapeado = 'Masculino';
        else sexoMapeado = rawSexo;

        // 2. Preenche o Médico (Prefere o do agendamento, senão o logado)
        let nomeMedico = ag.medico_nome || ag.medico_nome_com_prefixo || '';
        let crm = '';
        if (!nomeMedico && medicoLogadoObj) {
            nomeMedico = medicoLogadoObj.first_name ? `${medicoLogadoObj.first_name} ${medicoLogadoObj.last_name}` : medicoLogadoObj.username;
            crm = medicoLogadoObj.crm || '';
        }

        // 3. Descobre o tipo de exame inteligentemente
        const tipoMatch = descobrirTipoExame(ag);

        // 4. Aplica os Estados e vira a tela
        setPaciente(pacienteCompleto);
        setDadosEstruturados(prev => ({
            ...prev,
            dataNascimento: pacienteCompleto.data_nascimento || '',
            sexo: sexoMapeado
        }));
        setMedicoNome(nomeMedico);
        if (crm) setMedicoCrm(crm);
        setTipoExame(tipoMatch);
        
        // Puxa título padrão baseado na descrição do exame
        setTituloExame(ag.procedimento_descricao || '');

        setTelaAtual('FORM'); // <-- Muda a tela!

        // Busca credenciais se já existirem
        try {
            const resCred = await apiClient.get(`/prontuario/credenciais-ativas/?paciente_id=${idPaciente}`);
            if (resCred.data?.codigo) setCredenciais(resCred.data); else setCredenciais(null);
        } catch (e) {}

    } catch (error) {
        alert("Erro ao puxar dados completos do paciente. Tente buscar manualmente.");
        console.error(error);
    } finally {
        setLoadingBusca(false);
    }
  };


  // --- 3. LÓGICA DE FILTROS E BUSCAS ---
  const handleInputMedicoChange = (texto) => {
      setMedicoNome(texto);
      setMostrarListaMedicos(true);
      if (!texto) { setMedicosFiltrados(todosMedicos); return; }
      const termo = texto.toLowerCase();
      const filtrados = todosMedicos.filter(m => {
          const nomeCompleto = m.first_name ? `${m.first_name} ${m.last_name}` : m.username;
          const crm = m.crm || '';
          return nomeCompleto.toLowerCase().includes(termo) || crm.includes(termo);
      });
      setMedicosFiltrados(filtrados);
  };

  const selecionarMedico = (medico) => {
      const nomeCompleto = medico.first_name ? `${medico.first_name} ${medico.last_name}` : medico.username;
      setMedicoNome(nomeCompleto);
      setMedicoCrm(medico.crm || ''); 
      setMedicoEspecialidades(medico.medico_especialidades || []);
      setMostrarListaMedicos(false);
  };

  const handleBuscaPacienteChange = (e) => {
      const termo = e.target.value;
      setTermoBusca(termo);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (termo.length < 3) { setPacientesEncontrados([]); return; }
      
      setLoadingBusca(true);
      searchTimeoutRef.current = setTimeout(async () => {
          try {
              const res = await apiClient.get('/pacientes/', { params: { search: termo } });
              const dados = Array.isArray(res.data) ? res.data : res.data.results || [];
              dados.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
              setPacientesEncontrados(dados);
          } catch (e) { console.error(e); } 
          finally { setLoadingBusca(false); }
      }, 300);
  };

  useEffect(() => {
      const dadosParaSalvar = {
          laudoId, tipoExame, paciente, medicoNome, medicoCrm, medicoEspecialidades, textoFinal, dadosEstruturados, tituloExame, imagens 
      };
      const timeoutId = setTimeout(() => {
          try {
              sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dadosParaSalvar));
          } catch (e) {
              const dadosSemImagens = { ...dadosParaSalvar, imagens: [] };
              sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dadosSemImagens));
          }
      }, 1000);
      return () => clearTimeout(timeoutId);
  }, [laudoId, tipoExame, paciente, medicoNome, medicoCrm, medicoEspecialidades, textoFinal, dadosEstruturados, tituloExame, imagens]);

  // --- 4. MANIPULADORES DO FORMULÁRIO ---
  const handleLimpar = () => {
    if (window.confirm("Limpar formulário e retornar aos cards? O rascunho será perdido.")) {
        sessionStorage.removeItem(STORAGE_KEY);
        setLaudoId(null);
        setCredenciais(null);
        setTipoExame('OBSTETRICO');
        setPaciente(null);
        setMedicoNome('');
        setMedicoCrm('');
        setMedicoEspecialidades([]);
        setTextoFinal('');
        setDadosEstruturados({});
        setTituloExame('');
        setImagens([]);
        setTermoBusca('');
        setPacientesEncontrados([]);
        
        // VOLTA PARA A TELA INICIAL
        setTelaAtual('CARDS');
    }
  };

  const handleFormUpdate = useCallback((dados) => {
      if (dados.texto) setTextoFinal(dados.texto);
      if (dados.dadosEstruturados) setDadosEstruturados(prev => ({ ...prev, ...dados.dadosEstruturados }));
      if (dados.tituloExame) setTituloExame(dados.tituloExame);
  }, []);

  const otimizarImagemParaPDF = (base64Str, maxWidth = 1200, qualidade = 0.85) => {
    return new Promise((resolve, reject) => {
        if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) {
            resolve(base64Str);
            return;
        }
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
            ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', qualidade));
        };
        img.onerror = (err) => reject(err);
    });
  };

  // --- 5. FUNÇÃO MASTER: SALVAR E FINALIZAR ---
  const handleFinalizacaoAssincrona = async (textoCorrigido, imagensFinais, dataExameSelecionada, senhaAutorizacao, ignorarAuditoria = false) => {
    if (isPolling) return;
    if (!paciente || !paciente.id) return alert("Selecione um paciente.");
    if (!medicoNome) return alert("Preencha o nome do médico.");

    if (!ignorarAuditoria) {
        const confirmacao = window.confirm(
            "Atenção: Após finalizado, este laudo será processado e assinado digitalmente.\n\n" +
            "Se houver erros e você precisar corrigir algo depois, o laudo atual será CANCELADO no prontuário e substituído por um novo laudo oficial para o paciente.\n\n" +
            "Deseja gerar o laudo definitivo agora?"
        );
        if (!confirmacao) return;
    }

    setModalRevisaoOpen(false);
    setIsPolling(true); 
    setTempSubmissionData({ textoCorrigido, imagensFinais, dataExameSelecionada, senhaAutorizacao });

    try {
        const imagensOtimizadas = [];
        for (let img of imagensFinais) imagensOtimizadas.push(await otimizarImagemParaPDF(img));
        
        setTextoFinal(textoCorrigido);
        setImagens(imagensOtimizadas);

        const dadosParaEnvio = { ...dadosEstruturados, ignorar_auditoria_ia: ignorarAuditoria };

        const formData = new FormData();
        formData.append('paciente', paciente.id);
        formData.append('data_exame', dataExameSelecionada); 
        formData.append('tipo_exame', tipoExame);
        formData.append('titulo', tituloExame || `Laudo de ${tipoExame}`);
        formData.append('texto_laudo', textoCorrigido);
        formData.append('medico_responsavel', medicoNome);
        formData.append('crm_medico', medicoCrm);
        formData.append('senha_medico', senhaAutorizacao); 
        formData.append('dados_estruturados', JSON.stringify(dadosParaEnvio));
        formData.append('imagens_anexas', JSON.stringify(imagensOtimizadas));
        
        let response = await apiClient.post('/prontuario/laudos-async/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        const laudoProcessandoId = response.data.id;
        setLaudoId(laudoProcessandoId);

        const checkStatus = async () => {
            try {
                const res = await apiClient.get(`/prontuario/laudos/${laudoProcessandoId}/status/`);
                const statusAtual = res.data.status;

                if (statusAtual === 'FINALIZADO') {
                    setIsPolling(false);
                    if (res.data.credenciais) setCredenciais(res.data.credenciais);

                    if (res.data.arquivo_url) {
                        const baseUrl = apiClient.defaults.baseURL.replace('/api', '').replace(/\/$/, '');
                        const urlCompleta = res.data.arquivo_url.startsWith('/') ? `${baseUrl}${res.data.arquivo_url}` : res.data.arquivo_url;
                        try {
                            const fetchResponse = await fetch(urlCompleta);
                            const blobFinal = await fetchResponse.blob();
                            const blobUrl = URL.createObjectURL(blobFinal);
                            window.open(blobUrl, '_blank');
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
                        } catch (err) { window.open(urlCompleta, '_blank'); }
                    }
                    
                    // Limpa o cache após sucesso e exibe modal
                    sessionStorage.removeItem(STORAGE_KEY);
                    setModalSucessoOpen(true);

                } else if (statusAtual === 'REVISAO_SUGERIDA') {
                    setIsPolling(false); 
                    setDiscrepanciasDetectadas(res.data.discrepancias || []);
                    setModalAuditoriaOpen(true);
                } else if (statusAtual === 'ERRO') {
                    setIsPolling(false);
                    alert("⚠️ Falha na Assinatura Digital!\nOcorreu um erro de comunicação ao aplicar o seu certificado no PDF. O laudo NÃO foi finalizado e continua como rascunho.");
                } else {
                    setTimeout(checkStatus, 3000);
                }
            } catch(e) {
                setTimeout(checkStatus, 3000); 
            }
        };

        setTimeout(checkStatus, 3000);

    } catch (e) {
        setIsPolling(false);
        const mensagemErro = e.response?.data?.detail || (Array.isArray(e.response?.data) ? e.response.data[0] : null) || "Erro ao enviar o laudo para processamento.";
        alert(`⚠️ Atenção: ${mensagemErro}`);
    }
  };

  const getMensagemCompartilhamento = (canal) => {
      const cod = credenciais?.codigo || "---";
      const pass = credenciais?.senha || "---";
      const link = credenciais?.link || "https://clinica-limale.vercel.app/resultados";
      const nomePct = paciente?.nome_completo?.split(' ')[0] || "Paciente";
      const exameTitulo = tituloExame || tipoExame || "Exame";

      if (canal === 'whatsapp') return `Olá, *${nomePct}*! \n\nSeu laudo de *${exameTitulo}* está pronto.\n\nAcesse o resultado e imagens no link:\n${link}\n\n*DADOS DE ACESSO:*\nUsuário: *${cod}*\nSenha: *${pass}*\n\nBaixe o PDF em anexo.\nAtt, Clínica Limalé`;
      if (canal === 'email') return `Olá, ${nomePct}!\n\nSeu laudo de ${exameTitulo} está pronto.\n\nAcesse o resultado e imagens clicando no link abaixo:\n${link}\n\nDADOS DE ACESSO:\nUsuário: ${cod}\nSenha: ${pass}\n\nBaixe o PDF em anexo.\nAtt, Clínica Limalé`;
  };

  const handleEnviarWhatsApp = () => {
      const telefoneRaw = paciente?.telefone_celular || paciente?.telefone || ""; 
      const apenasNumeros = telefoneRaw.replace(/\D/g, "");
      let urlWhats = apenasNumeros.length >= 10 ? `https://wa.me/55${apenasNumeros}?text=${encodeURIComponent(getMensagemCompartilhamento('whatsapp'))}` : `https://wa.me/?text=${encodeURIComponent(getMensagemCompartilhamento('whatsapp'))}`;
      window.open(urlWhats, '_blank');
  };

  const handleEnviarEmail = () => {
      window.open(`mailto:${paciente?.email || ""}?subject=${encodeURIComponent('Resultado de Exame - Clínica Limalé')}&body=${encodeURIComponent(getMensagemCompartilhamento('email'))}`, '_blank');
  };

  // --- RENDERIZAÇÃO ---
  return (
    <div style={styles.container}>
      
      {/* ================= COLUNA ESQUERDA ================= */}
      <div style={styles.leftCol}>
        
        {/* TELA DE SELEÇÃO: CARDS DE AGENDAMENTO */}
        {telaAtual === 'CARDS' ? (
          <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto', background: '#F9FAFB' }}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#1C2E4A' }}>
                      Pacientes do Dia
                  </Typography>
                  <Button 
                      variant="outlined" 
                      onClick={() => setTelaAtual('FORM')}
                      sx={{ textTransform: 'none', fontWeight: 'bold' }}
                  >
                      Laudo Avulso (Sem Agendamento)
                  </Button>
              </Box>

              {loadingCards ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><FaSpinner className="spin" size={30} /></Box>
              ) : pacientesDia.length === 0 ? (
                  <Typography variant="body1" sx={{ color: '#666', textAlign: 'center', mt: 5 }}>
                      Nenhum paciente agendado para hoje.
                  </Typography>
              ) : (
                  <Grid container spacing={2}>
                      {pacientesDia.map(ag => {
                          const semaforo = calcularStatusSemaforo(ag, now);
                          const isCancelado = ag.status === 'Cancelado' || ag.status === 'Não Compareceu';
                          
                          return (
                              <Grid item xs={12} sm={6} md={4} key={ag.id}>
                                  <Card 
                                    elevation={0}
                                    sx={{ 
                                        borderRadius: 2, 
                                        border: `1px solid ${semaforo.cor.border}`,
                                        borderLeft: `5px solid ${semaforo.cor.indicator}`,
                                        background: semaforo.cor.bg,
                                        opacity: isCancelado ? 0.6 : 1,
                                        transition: 'all 0.2s ease',
                                        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
                                    }}
                                  >
                                      <CardActionArea onClick={() => handleCardClick(ag)} sx={{ p: 2, height: '100%' }}>
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                              <Typography variant="h6" sx={{ fontWeight: 800, color: semaforo.cor.text, fontSize: '1.1rem' }}>
                                                  {formatarHoraTZ(ag.data_hora_inicio)}
                                              </Typography>
                                              
                                              {semaforo.timer && (
                                                  <Chip 
                                                      icon={<FaClock size={10} color={semaforo.cor.text} />} 
                                                      label={semaforo.timer} 
                                                      size="small" 
                                                      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 'bold', bgcolor: 'rgba(255,255,255,0.6)', color: semaforo.cor.text }} 
                                                  />
                                              )}
                                          </Box>
                                          
                                          <Typography noWrap variant="subtitle1" sx={{ fontWeight: 700, color: semaforo.cor.text, mb: 0.5 }}>
                                              {ag.paciente_nome}
                                          </Typography>
                                          
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                              <FaStethoscope size={12} color={semaforo.cor.indicator} />
                                              <Typography noWrap variant="body2" sx={{ color: semaforo.cor.text, opacity: 0.9, fontSize: '0.85rem' }}>
                                                  {ag.procedimento_descricao || ag.especialidade_nome || 'Consulta'}
                                              </Typography>
                                          </Box>

                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                                              <Typography variant="caption" sx={{ fontWeight: 'bold', color: semaforo.cor.text, opacity: 0.8 }}>
                                                  {semaforo.label}
                                              </Typography>
                                              {ag.medico_nome && (
                                                  <Typography variant="caption" sx={{ color: semaforo.cor.text, opacity: 0.7 }}>
                                                      Dr(a) {ag.medico_nome.split(' ')[0]}
                                                  </Typography>
                                              )}
                                          </Box>
                                      </CardActionArea>
                                  </Card>
                              </Grid>
                          );
                      })}
                  </Grid>
              )}
          </Box>
        ) : (
          /* TELA DO FORMULÁRIO (ANTIGO LAUDOS) */
          <>
            <div style={styles.toolbar}>
                <div style={{position: 'relative'}}> 
                    <div style={styles.inputGroup}>
                        <div style={styles.inputIcon} title="Paciente"><FaUserInjured size={14} /></div>
                        <input 
                            style={styles.inputCompact} placeholder="Buscar Paciente..."
                            value={paciente ? `${paciente.id}_${paciente.nome_completo}` : termoBusca}
                            onChange={(e) => { 
                                if (paciente) { setPaciente(null); setTermoBusca(''); setPacientesEncontrados([]); } 
                                else { handleBuscaPacienteChange(e); }
                            }}
                        />
                        <div style={{position:'absolute', right:'8px', cursor:'pointer'}}>
                            {loadingBusca ? <FaSpinner className="spin" color="#999"/> : 
                            (paciente || termoBusca.length > 0) ? 
                                <FaTimes color="#C62828" onClick={() => { 
                                    setPaciente(null); setTermoBusca(''); setPacientesEncontrados([]); setMedicoEspecialidades([]);
                                    setLaudoId(null); setCredenciais(null); setTextoFinal(''); setDadosEstruturados({}); 
                                    setImagens([]); setTituloExame(''); sessionStorage.removeItem(STORAGE_KEY); 
                                }}/> 
                                : null}
                        </div>
                    </div>
                    {!paciente && pacientesEncontrados.length > 0 && (
                        <div style={styles.dropdownList}>
                            {pacientesEncontrados.map(p => (
                                <div key={p.id} style={styles.dropdownItem} onClick={async () => {
                                    setLaudoId(null); setCredenciais(null); setTextoFinal(''); setDadosEstruturados({});
                                    setImagens([]); setTituloExame(''); sessionStorage.removeItem(STORAGE_KEY);

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
                                    } catch (e) { }
                                }}>
                                    <span style={{fontWeight:'bold', display:'flex', alignItems: 'center', gap: '8px'}}>
                                        <span style={{background: '#1C2E4A', color: '#FFF', padding: '2px 6px', borderRadius: '4px', fontSize: '10px'}}>ID: {p.id}</span>
                                        {p.nome_completo}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={styles.inputGroup}>
                    <div style={styles.inputIcon} title="Tipo de Exame"><FaNotesMedical size={14} /></div>
                    <select value={tipoExame} onChange={(e) => setTipoExame(e.target.value)} style={{...styles.inputCompact, cursor: 'pointer'}}>
                        <option value="OBSTETRICO">Medicina Fetal</option>
                        <option value="TRANSVAGINAL">Transvaginal</option>
                        <option value="ECOCARDIOGRAMA">Ecocardiograma</option>
                        <option value="ABDOME">US Geral</option>
                        <option value="DOPPLER_CAROTIDAS">Carótidas</option>
                        <option value="ELETROCARDIOGRAMA">Eletrocardiograma</option> 
                    </select>
                </div>

                <div style={{position: 'relative'}}>
                    <div style={styles.inputGroup}>
                        <div style={styles.inputIcon} title="Médico Responsável"><FaUserMd size={14} /></div>
                        <input 
                            style={styles.inputCompact} placeholder="Médico..." value={medicoNome} 
                            onChange={(e) => handleInputMedicoChange(e.target.value)} 
                            onFocus={() => { setMostrarListaMedicos(true); if(!medicoNome) setMedicosFiltrados(todosMedicos); }} 
                            onBlur={() => setTimeout(() => setMostrarListaMedicos(false), 200)}
                        />
                    </div>
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

                <div style={styles.inputGroup}>
                    <div style={styles.inputIcon} title="CRM"><FaIdCard size={14} /></div>
                    <input style={{...styles.inputCompact, textAlign: 'center'}} placeholder="CRM" value={medicoCrm} onChange={(e) => setMedicoCrm(maskCRM(e.target.value))} />
                </div>
            </div>

            <div style={styles.formScrollArea}> 
                {tipoExame === 'OBSTETRICO' && <FormObstetrico key={`${paciente?.id || 'novo'}-${dadosEstruturados?.sexo || ''}-${tipoExame}`} onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
                {tipoExame === 'ABDOME' && <FormAbdome key={`${paciente?.id || 'novo'}-${dadosEstruturados?.sexo || ''}-${tipoExame}`} onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
                {tipoExame === 'TRANSVAGINAL' && <FormTransvaginal key={`${paciente?.id || 'novo'}-${tipoExame}`} onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
                {tipoExame === 'ECOCARDIOGRAMA' && <FormEcocardiograma key={`${paciente?.id || 'novo'}-${tipoExame}`} onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
                {tipoExame === 'DOPPLER_CAROTIDAS' && <FormDopplerCarotidas key={`${paciente?.id || 'novo'}-${tipoExame}`} onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
                {tipoExame === 'ELETROCARDIOGRAMA' && <FormEletrocardiograma key={`${paciente?.id || 'novo'}-${tipoExame}`} onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            </div>
          </>
        )}
      </div> 

      {/* ================= COLUNA DIREITA (PREVIEW E AÇÕES) ================= */}
      <div style={styles.rightCol}>
         <div style={{ flex: 1, minHeight: 0, background: '#fff', borderRadius: '6px', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}> 
             
             <Box sx={{ px: 1.5, background: '#fff', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '45px', flexShrink: 0, zIndex: 10 }}>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                     <FaFileAlt color="#1C2E4A" size={12} />
                     <Typography variant="caption" sx={{ fontWeight: 800, color: '#1C2E4A', fontSize: '11px' }}>PRÉVIA</Typography>
                 </Box>
                 <Stack direction="row" spacing={0.5} alignItems="center">
                     <Tooltip title="Limpar e Voltar aos Cards">
                        <IconButton onClick={handleLimpar} size="small" sx={{ color: '#EF5350', padding: '4px' }}>
                            <FaEraser size={12} />
                        </IconButton>
                     </Tooltip>
                     <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto', mx: 0.5 }} />
                    <Button 
                        size="small" onClick={() => { if (!medicoNome) return alert("Por favor, preencha o nome do Médico."); setModalTermoOpen(true); }} 
                        sx={{ color: '#546E7A', textTransform: 'none', fontSize: '10px', fontWeight: 600, minWidth: 'auto', padding: '4px 8px' }}
                    >Termo</Button>
                    <Button 
                        size="small" onClick={() => { if (!paciente || !medicoNome) { alert("Selecione um Paciente e identifique o Médico antes de gerar o documento."); return; } setModalAtestadoOpen(true); }} 
                        sx={{ color: '#00897B', textTransform: 'none', fontSize: '10px', fontWeight: 600, minWidth: 'auto', padding: '4px 8px' }}
                    >Atestado / Declaração</Button>
                    <Button 
                        variant="contained" size="small" onClick={() => {
                            if (!textoFinal || textoFinal.trim() === '') { alert("⚠️ O texto do laudo está vazio!\nPor favor, preencha as medidas e certifique-se de que o texto apareceu na tela de Prévia antes de finalizar."); return; }
                            setModalRevisaoOpen(true);
                        }} 
                        endIcon={<FaSave size={12}/>} 
                        sx={{ background: '#1C2E4A', textTransform: 'none', fontWeight: 'bold', fontSize: '11px', padding: '4px 12px', minWidth: 'auto', marginLeft: '4px !important', '&:hover': { background: '#2C3E50' } }}
                    >Finalizar</Button>
                 </Stack>
             </Box>
             
             <div style={{flex: 1, minHeight: 0, padding: '0', overflow: 'hidden', background: '#EEEEEE', position: 'relative'}}>
                <textarea 
                    value={textoFinal} readOnly={true} 
                    style={{ width: '100%', height: '100%', border: 'none', padding: '25px', resize: 'none', outline: 'none', fontFamily: '"Times New Roman", serif', fontSize: '14px', lineHeight: '1.5', color: '#000', background: '#FAFAFA', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)', cursor: 'default', overflowY: 'auto' }}
                />
             </div>
         </div>
      </div>

      {/* --- MODAIS --- */}
      <LaudosPreviewModal 
          open={modalRevisaoOpen} onClose={() => setModalRevisaoOpen(false)} 
          textoInicial={textoFinal} imagensIniciais={imagens} 
          onFinalizar={handleFinalizacaoAssincrona}
          onAbrirNuvem={() => setModalNuvemOpen(true)}
          nomePaciente={paciente?.nome_completo} 
      />
      <ImagensNuvemModal open={modalNuvemOpen} onClose={() => setModalNuvemOpen(false)} paciente={paciente} onConfirmar={(novas) => setImagens(prev => [...prev, ...novas])} />
      
      <Dialog open={modalSucessoOpen} onClose={() => { setModalSucessoOpen(false); setTelaAtual('CARDS'); /* Retorna aos cards após fechar o modal */ }} maxWidth="sm" fullWidth>
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
        <DialogActions><Button onClick={() => { setModalSucessoOpen(false); setTelaAtual('CARDS'); }} style={{color: '#888'}}>Voltar à Tela Inicial</Button></DialogActions>
      </Dialog>
      
      <Dialog open={isPolling} disableEscapeKeyDown>
        <div style={{padding: '40px', textAlign: 'center', minWidth: '300px'}}>
            <FaSpinner className="spin" size={40} color="#1C2E4A" style={{marginBottom: '20px'}}/>
            <Typography variant="h6" style={{fontWeight: 'bold', color: '#1C2E4A'}}>Processando Laudo...</Typography>
            <Typography variant="body2" color="textSecondary" style={{marginTop: '10px'}}>Gerando PDF e aplicando assinatura digital.<br/>Isso pode levar alguns segundos.</Typography>
        </div>
      </Dialog>

      <Dialog open={modalAuditoriaOpen} onClose={() => {}} maxWidth="sm" fullWidth>
        <div style={{ padding: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <FaExclamationTriangle size={24} color="#d32f2f" />
                <Typography variant="h6" style={{ color: '#b71c1c', fontWeight: 'bold', margin: 0 }}>Revisão Sugerida</Typography>
            </div>
            <Typography variant="body2" style={{ marginBottom: '20px', color: '#555', fontSize: '14px' }}>O Assistente de Qualidade encontrou possíveis inconsistências lógicas no seu laudo. Verifique os pontos abaixo antes de emitir o documento final:</Typography>
            <div style={{ maxHeight: '250px', overflowY: 'auto', background: '#fff3f3', padding: '15px', borderRadius: '8px', border: '1px solid #ffcdd2', marginBottom: '25px' }}>
                {discrepanciasDetectadas.map((disc, idx) => (
                    <div key={idx} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: idx !== discrepanciasDetectadas.length - 1 ? '1px dashed #ef9a9a' : 'none' }}>
                        <span style={{ fontWeight: 'bold', color: '#b71c1c', display: 'block', fontSize: '12px', marginBottom: '2px' }}>{disc.campo.toUpperCase()}:</span>
                        <span style={{ color: '#333', fontSize: '13px' }}>{disc.aviso}</span>
                    </div>
                ))}
            </div>
            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <Button fullWidth variant="outlined" onClick={() => { setModalAuditoriaOpen(false); setModalRevisaoOpen(true); }} style={{ borderColor: '#1C2E4A', color: '#1C2E4A', fontWeight: 'bold', height: '45px' }}>Voltar e Corrigir</Button>
                </Grid>
                <Grid item xs={6}>
                    <Button fullWidth variant="contained" onClick={() => { setModalAuditoriaOpen(false); if (tempSubmissionData) { handleFinalizacaoAssincrona(tempSubmissionData.textoCorrigido, tempSubmissionData.imagensFinais, tempSubmissionData.dataExameSelecionada, tempSubmissionData.senhaAutorizacao, true); } }} style={{ background: '#b71c1c', fontWeight: 'bold', height: '45px' }}>Ignorar e Assinar</Button>
                </Grid>
            </Grid>
        </div>
      </Dialog>
      
      <AtestadoModal open={modalAtestadoOpen} onClose={() => setModalAtestadoOpen(false)} paciente={paciente} medicoNome={medicoNome} medicoCrm={medicoCrm} usaAssinaturaDigital={usuarioTemCertificado} />
      <TermoConsentimentoModal open={modalTermoOpen} onClose={() => setModalTermoOpen(false)} paciente={paciente} medicoNome={medicoNome} medicoCrm={medicoCrm} />
    </div>
  );
};

export default LaudosPage;