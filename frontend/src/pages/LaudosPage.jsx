// src/pages/LaudosPage.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FaSave, FaFileAlt, FaSpinner, FaEraser, FaUserMd, FaFileSignature, FaUserInjured, FaNotesMedical, FaIdCard, FaTimes, FaCalendarAlt } from 'react-icons/fa';
import { FaWhatsapp, FaEnvelope, FaCheckCircle } from 'react-icons/fa';
import apiClient from '../api/axiosConfig';
// Imports Material UI
import { 
  Menu, 
  MenuItem, 
  Modal, 
  Box, 
  Typography, 
  Grid, 
  Button, 
  Dialog,
  DialogActions,
  Stack,      
  Tooltip,    
  IconButton, 
  Divider     
} from '@mui/material';
import '../components/laudos/Laudos.css';

// Importação dos Formulários
import FormObstetrico from '../components/laudos/obstetrico/FormObstetrico';
import FormAbdome from '../components/laudos/abdome/FormAbdome'; // Ajuste o caminho da pasta
import FormTransvaginal from '../components/laudos/trasnvaginal/FormTransvaginal';
import FormEcocardiograma from '../components/laudos/ecocardiograma/FormEcocardiograma';
import FormDopplerCarotidas from '../components/laudos/carotidas/FormDopplerCarotidas';
import FormEletrocardiograma from '../components/laudos/eletrocardiograma/FormEletrocardiograma';
import AtestadoModal from '../components/laudos/AtestadoModal'; // Vamos criar este arquivo abaixo
import LaudosPreviewModal from '../components/laudos/LaudosPreviewModal'; // Novo Modal
import ImagensNuvemModal from '../components/laudos/ImagensNuvemModal'; // <--- ADICIONE ISSO

import { gerarPDFLaudo } from '../utils/laudoPdfGenerator';

// --- TEMA E ESTILOS ---
const theme = { primary: '#1C2E4A', secondary: '#C5A47E', accent: '#2E7D32', bg: '#F0F2F5', border: '#D1D5DB' };

// src/pages/LaudosPage.jsx

const styles = {
  container: { 
      flex: 1, // Usa o espaço dado pelo MainLayout
      display: 'flex', 
      background: theme.bg, 
      minHeight: 0, // Impede vazamento vertical
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
      minHeight: 0 // Impede vazamento vertical
  },
  formScrollArea: {
      flex: 1,
      overflowY: 'auto', // A rolagem correta
      padding: '10px'
  },
  rightCol: { 
      flex: 1, 
      minWidth: '400px',
      display: 'flex', 
      flexDirection: 'column', 
      background: theme.bg,
      minHeight: 0 // Impede vazamento vertical
  },
  
  // --- BARRA SUPERIOR (Toolbar) AJUSTADA ---
  toolbar: {
      background: '#fff',
      borderBottom: `1px solid ${theme.border}`,
      padding: '8px 12px',
      display: 'grid',
      gridTemplateColumns: 'minmax(220px, 3.5fr) minmax(130px, 1.5fr) minmax(180px, 2.5fr) 100px',
      gap: '8px', 
      alignItems: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
      flexShrink: 0, // Impede que o cabeçalho seja esmagado
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
      padding: '0 8px',
      color: '#666',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRight: '1px solid #e0e0e0',
      height: '100%',
      fontSize: '12px' 
  },
  inputCompact: {
      border: 'none',
      background: 'transparent',
      width: '100%',
      height: '100%',
      padding: '0 6px', 
      fontSize: '11px', 
      fontWeight: '600',
      color: '#2C3E50',
      outline: 'none',
      textOverflow: 'ellipsis' 
  },
  dropdownList: {
      position: 'absolute',
      top: '32px', 
      left: 0,
      right: 0,
      background: 'white',
      border: '1px solid #ccc', 
      borderRadius: '0 0 4px 4px',
      zIndex: 100, 
      maxHeight: '180px',
      overflowY: 'auto',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
  },
  dropdownItem: {
      padding: '8px 10px',
      cursor: 'pointer',
      borderBottom: '1px solid #eee',
      fontSize: '11px',
      color: '#333'
  }
};

const STORAGE_KEY = 'laudos_rascunho_auto_save';
const maskCRM = (value) => {
  return value
    .replace(/\D/g, '') 
    .replace(/(\d{5})(\d)/, '$1-$2') 
    .replace(/(-\d{2})\d+?$/, '$1'); 
};

const getInitialState = (key, fallback) => {
    try {
        // MUDANÇA: troque localStorage por sessionStorage
        const saved = sessionStorage.getItem(STORAGE_KEY); 
        if (saved) {
            const parsed = JSON.parse(saved);
            return parsed[key] !== undefined ? parsed[key] : fallback;
        }
    } catch (e) { console.error("Erro ao ler rascunho", e); }
    return fallback;
};

  // ==========================================================
  // AQUI COMEÇA A DECLARAÇÃO DA PÁGINA (QUE ESTAVA FALTANDO)
  // ==========================================================
  const LaudosPage = () => {
  // Estados principais
  const [tipoExame, setTipoExame] = useState(() => getInitialState('tipoExame', 'OBSTETRICO'));
  const [paciente, setPaciente] = useState(() => getInitialState('paciente', null));
  const hojeISO = new Date().toISOString().split('T')[0];

  // Busca Paciente
  const [termoBusca, setTermoBusca] = useState('');
  const [pacientesEncontrados, setPacientesEncontrados] = useState([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  
  // Médico
  const [medicoNome, setMedicoNome] = useState(() => getInitialState('medicoNome', ''));
  const [medicoCrm, setMedicoCrm] = useState(() => getInitialState('medicoCrm', ''));
  const [medicoEspecialidades, setMedicoEspecialidades] = useState(() => getInitialState('medicoEspecialidades', [])); // <--- ADICIONAR ESTA LINHA
  const [todosMedicos, setTodosMedicos] = useState([]);
  const [medicosFiltrados, setMedicosFiltrados] = useState([]); 
  const [mostrarListaMedicos, setMostrarListaMedicos] = useState(false);
  const [usuarioTemCertificado, setUsuarioTemCertificado] = useState(false);
  
  // Conteúdo do Laudo
  const [textoFinal, setTextoFinal] = useState(() => getInitialState('textoFinal', ''));
  const [dadosEstruturados, setDadosEstruturados] = useState(() => getInitialState('dadosEstruturados', {}));
  const [tituloExame, setTituloExame] = useState(() => getInitialState('tituloExame', ''));
  const [imagens, setImagens] = useState(() => getInitialState('imagens', []));
  
  // Estados de Controle
  const [saving, setSaving] = useState(false);
  const [dadosAcesso, setDadosAcesso] = useState(null); 
  const [modalSucessoOpen, setModalSucessoOpen] = useState(false);
  const [credenciais, setCredenciais] = useState(null);
  const [laudoId, setLaudoId] = useState(() => getInitialState('laudoId', null)); 
  const [modalAtestadoOpen, setModalAtestadoOpen] = useState(false);
  const [modalRevisaoOpen, setModalRevisaoOpen] = useState(false); // NOVO: Controle do Modal de Revisão
  const [modalNuvemOpen, setModalNuvemOpen] = useState(false); // <--- ADICIONE ISSO
  const [isPolling, setIsPolling] = useState(false);

  const searchTimeoutRef = useRef(null);

  // --- FUNÇÃO AUXILIAR (Coloque logo abaixo dos seus states) ---
  const calcularIdade = (dataNascimento) => {
      if (!dataNascimento) return '';
      const nascimento = new Date(dataNascimento);
      const hoje = new Date();
      let idade = hoje.getFullYear() - nascimento.getFullYear();
      const m = hoje.getMonth() - nascimento.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
          idade--;
      }
      return `${idade} anos`;
  };

  // --- 1. CARREGAMENTOS INICIAIS ---
  useEffect(() => {
    const carregarMedicos = async () => {
        try {
            const res = await apiClient.get('/usuarios/usuarios/?cargo=medico&apenas_ativos=true');
            let listaRaw = [];
            if (Array.isArray(res.data)) listaRaw = res.data;
            else if (res.data && Array.isArray(res.data.results)) listaRaw = res.data.results;
            
            const listaOrdenada = listaRaw.sort((a, b) => {
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
        } catch (e) {
            console.error("Erro ao verificar certificado", e);
        }
    };
    checarUsuario();
  }, []);

  // --- 2. LÓGICA DE FILTROS E BUSCAS ---
  const handleInputMedicoChange = (texto) => {
      setMedicoNome(texto);
      setMostrarListaMedicos(true);
      if (!texto) {
          setMedicosFiltrados(todosMedicos);
          return;
      }
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

      if (termo.length < 3) {
          setPacientesEncontrados([]);
          return;
      }
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

    // --- CORREÇÃO DO AUTO-SAVE (sessionStorage) ---
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

  // --- 3. MANIPULADORES DO FORMULÁRIO ---
  const handleLimpar = () => {
    if (window.confirm("Limpar formulário? Rascunho será perdido.")) {
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
    }
  };

  const handleFormUpdate = useCallback((dados) => {
      if (dados.texto) setTextoFinal(dados.texto);
      if (dados.dadosEstruturados) {
          // 👇 Agora ele junta os dados novos com os dados que já existiam!
          setDadosEstruturados(prev => ({ ...prev, ...dados.dadosEstruturados }));
      }
      if (dados.tituloExame) setTituloExame(dados.tituloExame);
  }, []);

  // Função para redimensionar e comprimir imagens Base64
// MUDANÇA: Aumentamos a resolução para 1200 e qualidade para 0.85
const otimizarImagemParaPDF = (base64Str, maxWidth = 1200, qualidade = 0.85) => {
    return new Promise((resolve, reject) => {
        // Se já não for uma imagem válida, devolve como está para não quebrar
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

            // Só redimensiona se a imagem for muito grande
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            
            // Ativa a suavização nativa para imagens médicas ficarem melhores ao dar zoom
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Fundo branco caso a imagem original tenha transparência (ex: PNG)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            
            ctx.drawImage(img, 0, 0, width, height);

            // Exporta FORÇANDO formato JPEG na qualidade ajustada
            const base64Otimizado = canvas.toDataURL('image/jpeg', qualidade);
            resolve(base64Otimizado);
        };
        
        img.onerror = (err) => reject(err);
    });
};

  // --- 4. FUNÇÃO MASTER: SALVAR E FINALIZAR ---
  const handleFinalizacaoAssincrona = async (textoCorrigido, imagensFinais, dataExameSelecionada) => {
    // 🛑 1. TRAVA DEFINITIVA ANTI-CLIQUE DUPLO
    if (isPolling) return;
    
    if (!paciente || !paciente.id) return alert("Selecione um paciente.");
    if (!medicoNome) return alert("Preencha o nome do médico.");

    const confirmacao = window.confirm(
        "Atenção: Após finalizado, este laudo será processado e assinado digitalmente.\n\n" +
        "Se houver erros e você precisar corrigir algo depois, o laudo atual será CANCELADO no prontuário e substituído por um novo laudo oficial para o paciente.\n\n" +
        "Deseja gerar o laudo definitivo agora?"
    );
    if (!confirmacao) return;

    setModalRevisaoOpen(false);
    setIsPolling(true); // Bloqueia a tela com o loader do Polling

    try {
        // 1. Otimização das imagens (Em fila, para não estourar a RAM do Chrome)
        const imagensOtimizadas = [];
        for (let img of imagensFinais) {
            imagensOtimizadas.push(await otimizarImagemParaPDF(img));
        }
        setTextoFinal(textoCorrigido);
        setImagens(imagensOtimizadas);

        // ===============================================================
        // 🚀 TRANSIÇÃO: O FRONTEND NÃO GERA MAIS O PDF!
        // Removemos o gerarPDFLaudo(). O Backend fará o trabalho pesado.
        // ===============================================================

        // 3. Prepara o envio APENAS com os textos e imagens
        const formData = new FormData();
        formData.append('paciente', paciente.id);
        formData.append('data_exame', dataExameSelecionada); 
        formData.append('tipo_exame', tipoExame);
        formData.append('titulo', tituloExame || `Laudo de ${tipoExame}`);
        formData.append('texto_laudo', textoCorrigido);
        formData.append('medico_responsavel', medicoNome);
        formData.append('crm_medico', medicoCrm);
        formData.append('dados_estruturados', JSON.stringify(dadosEstruturados));
        formData.append('imagens_anexas', JSON.stringify(imagensOtimizadas));
        
        // A ausência do formData.append('arquivo_pdf', ...) acionará o gerador do Django!

        // 4. Envia para a NOVA ROTA ASSÍNCRONA
        let response = await apiClient.post('/prontuario/laudos-async/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        const laudoProcessandoId = response.data.id;
        setLaudoId(laudoProcessandoId);

        // 5. O POLLING (Pergunta ao servidor se o PDF e as senhas já estão prontos)
        const checkStatus = async () => {
            try {
                const res = await apiClient.get(`/prontuario/laudos/${laudoProcessandoId}/status/`);
                const statusAtual = res.data.status;

                if (statusAtual === 'FINALIZADO') {
                    setIsPolling(false);

                    // Alimenta os dados exatos para o WhatsApp e E-mail funcionarem
                    if (res.data.credenciais) setCredenciais(res.data.credenciais);

                    // Força o download do PDF final GERADO PELO BACKEND
                    if (res.data.arquivo_url) {
                        const baseUrl = apiClient.defaults.baseURL.replace('/api', '').replace(/\/$/, '');
                        const urlCompleta = res.data.arquivo_url.startsWith('/') ? `${baseUrl}${res.data.arquivo_url}` : res.data.arquivo_url;
                        
                        try {
                            const fetchResponse = await fetch(urlCompleta);
                            const blobFinal = await fetchResponse.blob();
                            const blobUrl = URL.createObjectURL(blobFinal);
                            
                            // Abre na aba
                            window.open(blobUrl, '_blank');
                            
                            // Força download
                            const a = document.createElement('a');
                            a.style.display = 'none';
                            a.href = blobUrl;
                            a.download = `Laudo_${paciente.nome_completo.replace(/\s+/g, '_')}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
                        } catch (err) {
                            // Fallback caso dê erro de rede
                            window.open(urlCompleta, '_blank');
                        }
                    }

                    // Abre a tela de botões do WhatsApp
                    setModalSucessoOpen(true);
                } else if (statusAtual === 'ERRO') {
                    setIsPolling(false);
                    alert(
                        "⚠️ Falha na Assinatura Digital!\n\n" +
                        "Ocorreu um erro de comunicação ao aplicar o seu certificado no PDF. O laudo NÃO foi finalizado e continua como rascunho.\n\n" +
                        "Por favor, verifique sua conexão e clique em 'Finalizar' novamente."
                    );
                } else {
                    // Se estiver 'PROCESSANDO', checa novamente em 3 segundos
                    setTimeout(checkStatus, 3000);
                }
            } catch(e) {
                 console.error("Erro no polling", e);
                 setTimeout(checkStatus, 3000); // Ignora oscilações de rede e continua tentando
            }
        };

        // Dispara a primeira checagem
        setTimeout(checkStatus, 3000);

    } catch (e) {
        console.error("Erro no envio:", e);
        setIsPolling(false);
        alert("Erro ao enviar o laudo para processamento.");
    }
  };

  // Função Auxiliar para impressão simples (botão handlePrint antigo, usado nos modais de envio)
  const handlePrint = (usarTimbre = true) => {
      gerarPDFLaudo({
          pacienteNome: paciente?.nome_completo,
          medicoNome, medicoCrm, tituloExame, textoLaudo: textoFinal,
          medicoEspecialidades, 
          dadosEstruturados, imagensBase64: imagens,
          comTimbre: usarTimbre, usaAssinaturaDigital: usuarioTemCertificado 
      });
  };

  // --- 5. COMPARTILHAMENTO ---
  const getMensagemCompartilhamento = (canal) => {
      const cod = credenciais?.codigo || "---";
      const pass = credenciais?.senha || "---";
      const link = credenciais?.link || "https://clinica-limale.vercel.app/resultados";
      const nomePct = paciente?.nome_completo?.split(' ')[0] || "Paciente";
      const exameTitulo = tituloExame || tipoExame || "Exame";

      if (canal === 'whatsapp') {
          return `Olá, *${nomePct}*! \n\nSeu laudo de *${exameTitulo}* está pronto.\n\nAcesse o resultado e imagens no link:\n${link}\n\n*DADOS DE ACESSO:*\nUsuário: *${cod}*\nSenha: *${pass}*\n\nBaixe o PDF em anexo.\nAtt, Clínica Limalé`;
      }
      if (canal === 'email') {
          return `Olá, ${nomePct}!\n\nSeu laudo de ${exameTitulo} está pronto.\n\nAcesse o resultado e imagens clicando no link abaixo:\n${link}\n\nDADOS DE ACESSO:\nUsuário: ${cod}\nSenha: ${pass}\n\nBaixe o PDF em anexo.\nAtt, Clínica Limalé`;
      }
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

  const handleImportarDaNuvem = (novasImagensBase64) => {
      setImagens(prev => [...prev, ...novasImagensBase64]);
      // Não fecha o modal de revisão, apenas atualiza as imagens nele
  };

  return (
    <div style={styles.container}>
      
      {/* ================= COLUNA ESQUERDA (WRAPPER) ================= */}
      {/* Você tinha esquecido de abrir esta div, que segura o Toolbar e o Form juntos */}
      <div style={styles.leftCol}>
        
        {/* 1. BARRA DE FERRAMENTAS (HEADER) */}
        <div style={styles.toolbar}>

            {/* A. PACIENTE */}
            <div style={{position: 'relative'}}> 
                <div style={styles.inputGroup}>
                    <div style={styles.inputIcon} title="Paciente">
                        <FaUserInjured size={14} />
                    </div>
                    <input 
                        style={styles.inputCompact}
                        placeholder="Buscar Paciente..."
                        value={paciente ? `${paciente.id}_${paciente.nome_completo}` : termoBusca}
                        onChange={(e) => { 
                            if (paciente) setPaciente(null); 
                            handleBuscaPacienteChange(e); 
                        }}
                    />
                    <div style={{position:'absolute', right:'8px', cursor:'pointer'}}>
                        {loadingBusca ? <FaSpinner className="spin" color="#999"/> : 
                        (paciente || termoBusca.length > 0) ? 
                            <FaTimes color="#C62828" onClick={() => { 
                                setPaciente(null); 
                                setTermoBusca(''); 
                                setPacientesEncontrados([]); 
                                setMedicoEspecialidades([]);
                                setLaudoId(null); 
                                setCredenciais(null); // <-- Faltou
                                setTextoFinal(''); 
                                setDadosEstruturados({}); 
                                setImagens([]);       // <-- Faltou
                                setTituloExame('');   // <-- Faltou
                                
                                sessionStorage.removeItem('laudos_rascunho_auto_save'); 
                            }}/> 
                            : null}
                    </div>
                </div>
                {/* LISTA SUSPENSA COM O ID EM DESTAQUE */}
                {!paciente && pacientesEncontrados.length > 0 && (
                    <div style={styles.dropdownList}>
                        {pacientesEncontrados.map(p => (
                            <div key={p.id} style={styles.dropdownItem} onClick={async () => {
                                // 1. Limpeza Profunda do Estado
                                setLaudoId(null);
                                setCredenciais(null);
                                setTextoFinal('');
                                setDadosEstruturados({});
                                setImagens([]);
                                setTituloExame('');
                                
                                // 2. Limpeza do Cache/Rascunho
                                sessionStorage.removeItem('laudos_rascunho_auto_save');

                                // 3. Define o novo paciente
                                // Verificação à prova de balas para o Sexo/Gênero
                                const rawSexo = p.sexo || p.genero || '';
                                const cleanSexo = rawSexo.toUpperCase();
                                let sexoMapeado = '';

                                if (cleanSexo === 'M' || cleanSexo === 'MASCULINO') {
                                    sexoMapeado = 'Masculino';
                                } else if (cleanSexo === 'F' || cleanSexo === 'FEMININO') {
                                    sexoMapeado = 'Feminino';
                                }

                                // Injeta a Data de Nascimento crua e o Sexo!
                                setDadosEstruturados({
                                    dataNascimento: p.data_nascimento || '',
                                    sexo: sexoMapeado
                                });

                                setPaciente(p); 
                                setTermoBusca(''); 
                                setPacientesEncontrados([]);

                                // 4. Busca credenciais do novo paciente
                                try {
                                    const res = await apiClient.get(`/prontuario/credenciais-ativas/?paciente_id=${p.id}`);
                                    if (res.data?.codigo) setCredenciais(res.data); else setCredenciais(null);
                                } catch (e) { console.log("Sem credencial."); }
                            }}>
                                <span style={{fontWeight:'bold', display:'flex', alignItems: 'center', gap: '8px'}}>
                                    <span style={{
                                        background: '#1C2E4A', 
                                        color: '#FFF', 
                                        padding: '2px 6px', 
                                        borderRadius: '4px', 
                                        fontSize: '10px'
                                    }}>
                                        ID: {p.id}
                                    </span>
                                    {p.nome_completo}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* B. TIPO DE EXAME */}
            <div style={styles.inputGroup}>
                <div style={styles.inputIcon} title="Tipo de Exame">
                    <FaNotesMedical size={14} />
                </div>
                <select 
                    value={tipoExame} 
                    onChange={(e) => setTipoExame(e.target.value)} 
                    style={{...styles.inputCompact, cursor: 'pointer'}}
                >
                    <option value="OBSTETRICO">Medicina Fetal</option>
                    <option value="TRANSVAGINAL">Transvaginal</option>
                    <option value="ECOCARDIOGRAMA">Ecocardiograma</option>
                    <option value="ABDOME">US Geral</option>
                    <option value="DOPPLER_CAROTIDAS">Carótidas</option>
                    <option value="ELETROCARDIOGRAMA">Eletrocardiograma</option> 
                </select>
            </div>

            {/* C. MÉDICO */}
            <div style={{position: 'relative'}}>
                <div style={styles.inputGroup}>
                    <div style={styles.inputIcon} title="Médico Responsável">
                        <FaUserMd size={14} />
                    </div>
                    <input 
                        style={styles.inputCompact}
                        placeholder="Médico..."
                        value={medicoNome} 
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

            {/* D. CRM */}
            <div style={styles.inputGroup}>
                <div style={styles.inputIcon} title="CRM">
                    <FaIdCard size={14} />
                </div>
                <input 
                    style={{...styles.inputCompact, textAlign: 'center'}}
                    placeholder="CRM"
                    value={medicoCrm}
                    onChange={(e) => setMedicoCrm(maskCRM(e.target.value))}
                />
            </div>
        </div>

        {/* 2. ÁREA DO FORMULÁRIO DINÂMICO */}
        <div style={styles.formScrollArea}> 
            {tipoExame === 'OBSTETRICO' && (
                <FormObstetrico 
                    key={`${paciente?.id || 'novo'}-${tipoExame}`} 
                    onUpdate={handleFormUpdate} 
                    initialValues={dadosEstruturados} 
                />
            )}

            {tipoExame === 'ABDOME' && (
    <FormAbdome 
        key={`${paciente?.id || 'novo'}-${tipoExame}`} 
        onUpdate={handleFormUpdate} 
        initialValues={dadosEstruturados} 
    />
)}
            
            {tipoExame === 'TRANSVAGINAL' && (
                <FormTransvaginal 
                    key={`${paciente?.id || 'novo'}-${tipoExame}`} 
                    onUpdate={handleFormUpdate} 
                    initialValues={dadosEstruturados} 
                />
            )}
            
            {tipoExame === 'ECOCARDIOGRAMA' && (
                <FormEcocardiograma 
                    key={`${paciente?.id || 'novo'}-${tipoExame}`} 
                    onUpdate={handleFormUpdate} 
                    initialValues={dadosEstruturados} 
                />
            )}
            
            {tipoExame === 'DOPPLER_CAROTIDAS' && (
                <FormDopplerCarotidas 
                    key={`${paciente?.id || 'novo'}-${tipoExame}`} 
                    onUpdate={handleFormUpdate} 
                    initialValues={dadosEstruturados} 
                />
            )}
            {tipoExame === 'ELETROCARDIOGRAMA' && (
                <FormEletrocardiograma 
                    key={`${paciente?.id || 'novo'}-${tipoExame}`} 
                    onUpdate={handleFormUpdate} 
                    initialValues={dadosEstruturados} 
                />
            )}
        </div>

      </div> 
      {/* ^^^ AQUI FECHA O LEFTCOL QUE FALTAVA */}

      {/* ================= COLUNA DIREITA (PREVIEW E AÇÕES) ================= */}
      <div style={styles.rightCol}>
         {/* TROCADO height: '100%' por flex: 1 e minHeight: 0 */}
         <div style={{ flex: 1, minHeight: 0, background: '#fff', borderRadius: '6px', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}> 
             
             {/* BARRA DE AÇÕES */}
             <Box sx={{ px: 1.5, background: '#fff', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '45px', flexShrink: 0, zIndex: 10 }}>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                     <FaFileAlt color="#1C2E4A" size={12} />
                     <Typography variant="caption" sx={{ fontWeight: 800, color: '#1C2E4A', fontSize: '11px' }}>
                         PRÉVIA
                     </Typography>
                 </Box>
                 <Stack direction="row" spacing={0.5} alignItems="center">
                     <Tooltip title="Limpar">
                        <IconButton onClick={handleLimpar} size="small" sx={{ color: '#EF5350', padding: '4px' }}>
                            <FaEraser size={12} />
                        </IconButton>
                     </Tooltip>
                     <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto', mx: 0.5 }} />
                    <Button size="small" onClick={handleImprimirTermo} sx={{ color: '#546E7A', textTransform: 'none', fontSize: '10px', fontWeight: 600, minWidth: 'auto', padding: '4px 8px' }}>
                        Termo
                    </Button>
                    <Button 
                        size="small" 
                        onClick={() => {
                            if (!paciente || !medicoNome) {
                                alert("Selecione um Paciente e identifique o Médico antes de gerar o documento.");
                                return;
                            }
                            setModalAtestadoOpen(true);
                        }} 
                        sx={{ color: '#00897B', textTransform: 'none', fontSize: '10px', fontWeight: 600, minWidth: 'auto', padding: '4px 8px' }}
                    >
                        Atestado / Declaração
                    </Button>
                    {/* O antigo botão "Declaração" foi deletado daqui */}
                    <Button 
                        variant="contained" 
                        size="small" 
                        onClick={() => {
                            if (!textoFinal || textoFinal.trim() === '') {
                                alert("⚠️ O texto do laudo está vazio!\nPor favor, preencha as medidas e certifique-se de que o texto apareceu na tela de Prévia antes de finalizar.");
                                return; 
                            }
                            setModalRevisaoOpen(true);
                        }} 
                        endIcon={<FaSave size={12}/>} 
                        sx={{ 
                            background: '#1C2E4A', 
                            textTransform: 'none', 
                            fontWeight: 'bold', 
                            fontSize: '11px', 
                            padding: '4px 12px', 
                            minWidth: 'auto', 
                            marginLeft: '4px !important', 
                            '&:hover': { background: '#2C3E50' } 
                        }}
                    >
                        Finalizar
                    </Button>
                 </Stack>
             </Box>
             
             {/* TEXTAREA COM SCROLL PRÓPRIO ADICIONADO MIN-HEIGHT */}
             <div style={{flex: 1, minHeight: 0, padding: '0', overflow: 'hidden', background: '#EEEEEE', position: 'relative'}}>
                <textarea 
                    value={textoFinal} 
                    readOnly={true} 
                    style={{ width: '100%', height: '100%', border: 'none', padding: '25px', resize: 'none', outline: 'none', fontFamily: '"Times New Roman", serif', fontSize: '14px', lineHeight: '1.5', color: '#000', background: '#FAFAFA', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)', cursor: 'default', overflowY: 'auto' }}
                />
             </div>
         </div>
      </div>

      {/* --- MODAIS --- */}
      {/* ATUALIZE ESTE COMPONENTE: Adicione a prop onAbrirNuvem */}
      <LaudosPreviewModal 
          open={modalRevisaoOpen} 
          onClose={() => setModalRevisaoOpen(false)} 
          textoInicial={textoFinal} 
          imagensIniciais={imagens} 
          onFinalizar={handleFinalizacaoAssincrona}
          onAbrirNuvem={() => setModalNuvemOpen(true)} // <--- Conecta o botão azul
          nomePaciente={paciente?.nome_completo} // <--- CORRIGIDO
      />
      {/* ADICIONE ESTE COMPONENTE NOVO */}
      <ImagensNuvemModal
          open={modalNuvemOpen}
          onClose={() => setModalNuvemOpen(false)}
          paciente={paciente} // Passa o paciente selecionado para buscar as fotos certas
          onConfirmar={handleImportarDaNuvem}
      />
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

        {/* ADICIONE AQUI O MODAL DE ATESTADO */}
<AtestadoModal 
    open={modalAtestadoOpen} 
    onClose={() => setModalAtestadoOpen(false)} 
    paciente={paciente} 
    medicoNome={medicoNome} 
    medicoCrm={medicoCrm} 
    usaAssinaturaDigital={usuarioTemCertificado}
/>

    </div>
  );
};

export default LaudosPage;