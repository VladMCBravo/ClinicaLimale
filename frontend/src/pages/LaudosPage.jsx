import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FaPrint, FaSave, FaFileAlt, FaSpinner, FaEraser, FaUserMd, FaFileSignature, FaUserInjured, FaNotesMedical, FaIdCard, FaTimes, FaCamera } from 'react-icons/fa';
import { FaWhatsapp, FaEnvelope, FaCheckCircle, FaCopy, FaExternalLinkAlt } from 'react-icons/fa';
import apiClient from '../api/axiosConfig';
// 1. Adicione imports novos
import { 
  Menu, 
  MenuItem, 
  Modal, 
  Box, 
  Typography, 
  Grid, 
  Button, // Importando Button diretamente (sem alias MuiButton)
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions 
} from '@mui/material';
import { FaCloudDownloadAlt } from 'react-icons/fa';
import '../components/laudos/Laudos.css';

// Importação dos Formulários
import FormObstetrico from '../components/laudos/obstetrico/FormObstetrico';
import FormTransvaginal from '../components/laudos/trasnvaginal/FormTransvaginal';
import FormEcocardiograma from '../components/laudos/ecocardiograma/FormEcocardiograma';
import FormDopplerCarotidas from '../components/laudos/carotidas/FormDopplerCarotidas';

import { gerarPDFLaudo } from '../utils/laudoPdfGenerator';

// --- TEMA E ESTILOS ---
const theme = { primary: '#1C2E4A', secondary: '#C5A47E', accent: '#2E7D32', bg: '#F0F2F5', border: '#D1D5DB' };

const styles = {
  container: { 
      display: 'flex', 
      background: theme.bg, 
      height: '100vh', 
      overflow: 'hidden', 
      fontFamily: "'Segoe UI', Roboto, sans-serif", 
      fontSize: '11px', 
      color: '#333' 
  },
  leftCol: { 
      flex: 2, 
      minWidth: '700px', 
      height: '100%', 
      overflowY: 'auto', 
      padding: '10px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '10px',
      background: '#fff',
      borderRight: '1px solid #ddd'
  },
  rightCol: { 
      flex: 1, 
      minWidth: '400px', 
      height: '100%', 
      padding: '10px', 
      display: 'flex', 
      flexDirection: 'column', 
      background: theme.bg 
  },
  // Card Genérico mais limpo
  card: { 
      background: '#fff', 
      borderRadius: '6px', 
      border: `1px solid ${theme.border}`, 
      padding: '10px', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
      marginBottom: '5px'
  },
  // Labels modernos
  label: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555',
      marginBottom: '4px',
      textTransform: 'uppercase'
  },
  // Inputs Padronizados para não vazarem
  input: { 
      width: '100%', 
      padding: '6px 8px', 
      fontSize: '12px', 
      borderRadius: '4px', 
      border: '1px solid #ccc', 
      height: '30px', 
      color: '#333', 
      outline: 'none',
      boxSizing: 'border-box', // O Segredo para não vazar
      transition: 'border 0.2s'
  },
  // Dropdown de sugestões
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
  const [anchorElCamera, setAnchorElCamera] = useState(null); // Para o menu popup
  const [modalNuvemOpen, setModalNuvemOpen] = useState(false);
  const [examesNuvem, setExamesNuvem] = useState([]); // Lista de exames do paciente
  const [loadingNuvem, setLoadingNuvem] = useState(false);
  
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
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [dadosAcesso, setDadosAcesso] = useState(null); // Armazena login/senha retornados
  const [modalSucessoOpen, setModalSucessoOpen] = useState(false);
  const [credenciais, setCredenciais] = useState(null);

  // Ref para debounce da busca de paciente
  const searchTimeoutRef = useRef(null);

  // --- 1. CARREGA LISTA DE MÉDICOS (COM LOGS) ---
  useEffect(() => {
    const carregarMedicos = async () => {
        console.log(">>> [DEBUG] Iniciando busca de médicos na API...");
        try {
            // Note a duplicação proposital: /usuarios/usuarios/
            const res = await apiClient.get('/usuarios/usuarios/?cargo=medico');
            console.log(">>> [DEBUG] Resposta API Médicos:", res); // Mostra status e headers
            console.log(">>> [DEBUG] Dados brutos (res.data):", res.data); // Mostra o array de médicos

            let listaRaw = [];
            if (Array.isArray(res.data)) listaRaw = res.data;
            else if (res.data && Array.isArray(res.data.results)) listaRaw = res.data.results;
            
            console.log(">>> [DEBUG] Lista processada (Array):", listaRaw);

            const listaOrdenada = listaRaw.sort((a, b) => {
                const nomeA = a.first_name || a.username || "";
                const nomeB = b.first_name || b.username || "";
                return nomeA.localeCompare(nomeB);
            });
            
            console.log(">>> [DEBUG] Lista final ordenada (Estado):", listaOrdenada);
            setTodosMedicos(listaOrdenada);
            setMedicosFiltrados(listaOrdenada); 
        } catch (e) { 
            console.error(">>> [DEBUG] ERRO CRÍTICO AO BUSCAR MÉDICOS:", e); 
        }
    };
    carregarMedicos();
  }, []);

  // --- LÓGICA DE FILTRO DE MÉDICO (COM LOGS) ---
  const handleInputMedicoChange = (texto) => {
      console.log(">>> [DEBUG] Digitando médico:", texto);
      setMedicoNome(texto);
      setMostrarListaMedicos(true);
      
      if (!texto) {
          console.log(">>> [DEBUG] Texto vazio, mostrando todos:", todosMedicos);
          setMedicosFiltrados(todosMedicos);
          return;
      }

      const termo = texto.toLowerCase();
      const filtrados = todosMedicos.filter(m => {
          const nomeCompleto = m.first_name ? `${m.first_name} ${m.last_name}` : m.username;
          const crm = m.crm || '';
          return nomeCompleto.toLowerCase().includes(termo) || crm.includes(termo);
      });
      
      console.log(">>> [DEBUG] Médicos filtrados:", filtrados);
      setMedicosFiltrados(filtrados);
  };

  const selecionarMedico = (medico) => {
      console.log(">>> [DEBUG] Médico selecionado:", medico);
      const nomeCompleto = medico.first_name ? `${medico.first_name} ${medico.last_name}` : medico.username;
      setMedicoNome(nomeCompleto);
      setMedicoCrm(medico.crm || ''); 
      setMostrarListaMedicos(false);
  };

  // --- LÓGICA DE BUSCA DE PACIENTE (API COM DEBOUNCE) ---
  const handleBuscaPacienteChange = (e) => {
      const termo = e.target.value;
      setTermoBusca(termo);

      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

      if (termo.length < 3) {
          setPacientesEncontrados([]);
          return;
      }

      setLoadingBusca(true);
      // Aguarda 500ms antes de chamar a API para não sobrecarregar e dar tempo de digitar
      searchTimeoutRef.current = setTimeout(async () => {
          try {
              const res = await apiClient.get('/pacientes/', { params: { search: termo } });
              const dados = Array.isArray(res.data) ? res.data : res.data.results || [];
              
              // Ordena alfabeticamente para facilitar a busca visual
              dados.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
              
              setPacientesEncontrados(dados);
          } catch (e) { console.error(e); } 
          finally { setLoadingBusca(false); }
      }, 500);
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

  // 3. Funções de Manipulação

const handleCameraClick = (event) => {
    setAnchorElCamera(event.currentTarget); // Abre o menu
};

const handleMenuClose = () => {
    setAnchorElCamera(null);
};

const handleOpcaoComputador = () => {
    handleMenuClose();
    document.getElementById('img-upload').click(); // Dispara o input file original
};

const handleOpcaoNuvem = async () => {
    handleMenuClose();
    if (!paciente || !paciente.id) {
        alert("Selecione um paciente primeiro.");
        return;
    }
    setModalNuvemOpen(true);
    setLoadingNuvem(true);
    try {
        // Busca exames vinculados ao paciente atual
        const res = await apiClient.get(`/exames/exames-paciente/?paciente_id=${paciente.id}`);
        setExamesNuvem(res.data);
    } catch (e) {
        console.error("Erro ao buscar exames", e);
    } finally {
        setLoadingNuvem(false);
    }
};

// Função para converter URL do Supabase em Base64 para o seu PDF funcionar
const adicionarImagemDaNuvem = async (url) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagens(prev => [...prev, reader.result]); // Adiciona ao estado existente
        };
        reader.readAsDataURL(blob);
    } catch (e) {
        console.error("Erro ao converter imagem", e);
        alert("Erro ao baixar imagem da nuvem (CORS ou permissão).");
    }
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
          
          const response = await apiClient.post('/prontuario/laudos/', payload);

        // Verifica se o backend retornou as credenciais (que fizemos no Passo 1)
        if (response.data && response.data.credenciais) {
            setCredenciais(response.data.credenciais);
        } else {
            // Fallback caso não tenha encontrado exame vinculado
            setCredenciais({ codigo: 'Consulte a recepção', senha: '---', link: 'limale.com.br' });
        }

        // Abre o modal de sucesso/envio
        setModalSucessoOpen(true);

    } catch (e) { 
        console.error("Erro ao salvar laudo:", e);
        alert("Erro ao salvar o laudo. Verifique os dados.");
    } finally { 
        setSaving(false); 
    }
};

  // --- TEXTO CRIATIVO ---
const gerarTextoMensagem = (tipo) => {
    if (!dadosAcesso) return '';
    
    // Ajuste este link para o endereço real do seu portal de pacientes
    const linkPortal = "https://clinica-limale.vercel.app/resultados"; 
    const nomePct = paciente?.nome_completo?.split(' ')[0] || 'Paciente'; // Primeiro nome
    
    const textoBase = `Olá, *${nomePct}*! 🌟\n\n` +
        `Seu exame de *${tipoExame}* já está pronto e liberado.\n\n` +
        `Para acessar as imagens e o laudo completo com segurança, clique no link abaixo:\n` +
        `🔗 ${linkPortal}\n\n` +
        `🔑 *Código:* ${dadosAcesso.codigo}\n` +
        `🔒 *Senha:* ${dadosAcesso.senha}\n\n` +
        `Em anexo, enviamos também uma cópia em PDF para sua conveniência.\n` +
        `Atenciosamente,\n*Clínica Limale*`;

    return tipo === 'url' ? encodeURIComponent(textoBase) : textoBase;
};

// --- FUNÇÕES DE ENVIO ---
const handleShareWhatsApp = () => {
    const texto = gerarTextoMensagem('url');
    // Se tiver telefone no cadastro do paciente, usa ele. Senão, abre em branco para escolher.
    const telefone = paciente?.telefone ? `55${paciente.telefone.replace(/\D/g, '')}` : ''; 
    
    // Primeiro gera o PDF para o usuário ter o arquivo em mãos (download)
    handlePrint(); 
    
    // Abre o WhatsApp
    window.open(`https://wa.me/${telefone}?text=${texto}`, '_blank');
};

const handleShareEmail = () => {
    const texto = gerarTextoMensagem('text'); // Sem encode para email body
    const email = paciente?.email || '';
    const assunto = `Seu exame de ${tipoExame} está pronto - Clínica Limale`;
    
    handlePrint(); // Baixa o PDF
    
    window.open(`mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(texto)}`);
};

  const handlePrint = (usarTimbre = true) => {
      gerarPDFLaudo({
          pacienteNome: paciente?.nome_completo,
          medicoNome, 
          medicoCrm, 
          tituloExame, 
          textoLaudo: textoFinal, 
          dadosEstruturados, 
          imagensBase64: imagens,
          comTimbre: usarTimbre // <--- Passa o parâmetro para o gerador
      });
  };

  // --- FUNÇÕES DE COMPARTILHAMENTO ---
const getMensagemCompartilhamento = (canal) => {
    const cod = credenciais?.codigo || "---";
    const pass = credenciais?.senha || "---";
    const link = credenciais?.link || "https://clinica-limale.vercel.app/resultados";
    const nomePct = paciente?.nome_completo?.split(' ')[0] || "Paciente";
    
    // Título do exame simplificado para evitar caracteres especiais
    const exameTitulo = tituloExame || tipoExame || "Exame";

    if (canal === 'whatsapp') {
        // Use crase (`) para template string
        return `Ola, *${nomePct}*! \n\n` +
               `Seu laudo de *${exameTitulo}* esta pronto.\n\n` +
               `Acesse o resultado e imagens no link:\n` +
               `${link}\n\n` +
               `*DADOS DE ACESSO:*\n` +
               `Usuario: *${cod}*\n` +
               `Senha: *${pass}*\n\n` +
               `Baixe o PDF em anexo.\n` +
               `Att, Clinica Limale`;
    }

    if (canal === 'email') {
        return `Ola, ${nomePct}!\n\n` +
               `Seu laudo de ${exameTitulo} esta pronto.\n\n` +
               `Acesse o resultado e imagens no link:\n` +
               `${link}\n\n` +
               `DADOS DE ACESSO:\n` +
               `Usuario: ${cod}\n` +
               `Senha: ${pass}\n\n` +
               `Baixe o PDF em anexo.\n` +
               `Att, Clinica Limale`;
    }
};

const handleEnviarWhatsApp = () => {
    const texto = getMensagemCompartilhamento('whatsapp');
    
    // CORREÇÃO AQUI:
    // O seu backend (models.py) chama o campo de 'telefone_celular'.
    // Adicionei uma verificação de segurança para tentar os dois nomes.
    const telefoneRaw = paciente?.telefone_celular || paciente?.telefone || ""; 
    
    // Remove tudo que não for número
    const apenasNumeros = telefoneRaw.replace(/\D/g, "");
    
    let urlWhats = "";

    if (apenasNumeros.length >= 10) {
        // Se tem número válido, monta o link direto com 55 + DDD + Numero
        const numeroFinal = `55${apenasNumeros}`;
        urlWhats = `https://wa.me/${numeroFinal}?text=${encodeURIComponent(texto)}`;
    } else {
        // Se NÃO tem número, avisa e abre apenas para escolher o contato
        alert("Atenção: Este paciente não possui celular cadastrado. Você terá que escolher o contato.");
        urlWhats = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    }

    // Abre o WhatsApp
    window.open(urlWhats, '_blank');

    // Baixa o PDF APÓS abrir o whats, COM TIMBRE (DIGITAL)
    setTimeout(() => {
        handlePrint(true); // <--- AQUI: Passamos TRUE para sair com logo
    }, 2000);
};

const handleEnviarEmail = () => {
    // 1. Prepara o texto (usando a versão 'email' para evitar caracteres estranhos)
    const texto = getMensagemCompartilhamento('email'); 
    const email = paciente?.email || "";
    const assunto = `Resultado de Exame - Clínica Limale`;

    // 2. Abre o cliente de e-mail PRIMEIRO
    // (Isso evita que o navegador bloqueie o popup se o download começar antes)
    window.open(`mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(texto)}`, '_blank');

    // 3. Baixa o PDF COM TIMBRE (Digital) após 1.5 segundos
    setTimeout(() => {
        handlePrint(true); // <--- TRUE para gerar com logo/rodapé
    }, 1500);
};

  // --- NOVA FUNÇÃO: Botão para imprimir fotos ---
  const handlePrintImages = () => {
      gerarPDFLaudo({
          pacienteNome: paciente?.nome_completo,
          medicoNome, medicoCrm, tituloExame, textoLaudo: textoFinal, dadosEstruturados, imagensBase64: imagens 
      });
  };

  // --- FUNÇÃO: IMPRIMIR TERMO (AJUSTADA PARA 1 PÁGINA) ---
  const handleImprimirTermo = () => {
      if (!medicoNome) return alert("Por favor, preencha o nome do Médico.");

      const nomePaciente = paciente?.nome_completo || "__________________________________________________________";
      const cpfPaciente = paciente?.cpf || "________________________";
      const rgPaciente = paciente?.rg || "___________________________";
      
      const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
      const hoje = new Date();
      const dataExtenso = `${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;

      const termoWindow = window.open('', '', 'width=800,height=600');
      termoWindow.document.write(`
        <html>
        <head>
            <title>Termo de Consentimento</title>
            <style>
                /* Fonte reduzida para 10pt e espaçamento ajustado para caber em 1 página */
                body { font-family: 'Arial', sans-serif; font-size: 10pt; margin: 0; padding: 0; color: #000; }
                @page { size: A4; margin: 1.5cm 2cm; }
                .content { padding-top: 4.5cm; /* Mantendo o espaço do cabeçalho solicitado */ }
                h2 { text-align: center; font-size: 12pt; margin-bottom: 20px; text-transform: uppercase; font-weight: bold; }
                p, li { line-height: 1.3; text-align: justify; margin-bottom: 8px; }
                ul { list-style-type: disc; margin-left: 20px; margin-bottom: 10px; }
                .check-group { margin: 10px 0; line-height: 1.4; }
                .assinaturas { margin-top: 30px; display: flex; flex-direction: column; gap: 30px; }
                .assinatura-box { width: 100%; }
                .linha { border-top: 1px solid #000; width: 60%; margin-bottom: 4px; }
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
                
                <p style="text-align: right; margin-top: 20px;">
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
      
      {/* ================= COLUNA ESQUERDA (INPUTS) ================= */}
      <div style={styles.leftCol}>
        
        {/* CARD DE IDENTIFICAÇÃO */}
        <div style={styles.card}>
            
            {/* LINHA 1: PACIENTE */}
            <div style={{marginBottom: '10px'}}>
                <div style={styles.label}><FaUserInjured color="#1C2E4A"/> PACIENTE</div>
                {paciente ? (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: '#E8F5E9', border: '1px solid #2E7D32', borderRadius: '4px',
                        padding: '0 10px', height: '30px'
                    }}>
                        <span style={{fontWeight: 'bold', color: '#1B5E20', fontSize: '13px'}}>
                            {paciente.nome_completo}
                        </span>
                        <button 
                            onClick={() => { setPaciente(null); setTermoBusca(''); setPacientesEncontrados([]); }}
                            style={{background:'none', border:'none', color:'#C62828', cursor:'pointer', display:'flex', alignItems:'center'}}
                            title="Remover paciente"
                        >
                            <FaTimes />
                        </button>
                    </div>
                ) : (
                    <div style={{position: 'relative'}}>
                        <div style={{position:'relative'}}>
                            <input 
                                placeholder="Digite 3 letras para buscar..." 
                                value={termoBusca} 
                                onChange={handleBuscaPacienteChange} 
                                style={styles.input} 
                            />
                            {loadingBusca && (
                                <span style={{position:'absolute', right:'10px', top:'7px', color:'#999'}}>
                                    <FaSpinner className="spin"/>
                                </span>
                            )}
                        </div>
                        
                        {/* LISTA DE SUGESTÕES */}
                        {pacientesEncontrados.length > 0 && (
                            <div style={styles.dropdownList}>
                                {pacientesEncontrados.map(p => (
                                    <div 
                                        key={p.id} 
                                        onClick={() => { setPaciente(p); setPacientesEncontrados([]); }} 
                                        style={styles.dropdownItem}
                                        className="hover:bg-gray-100" 
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                    >
                                        <span style={{fontWeight:'bold'}}>{p.nome_completo}</span>
                                        <span style={{color:'#777', fontSize:'10px'}}>CPF: {p.cpf || '---'}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* LINHA 2: TIPO, MÉDICO E CRM */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr 100px', gap: '10px'}}>
                
                {/* TIPO DE EXAME */}
                <div>
                    <div style={styles.label}><FaNotesMedical color="#1C2E4A"/> TIPO DE EXAME</div>
                    <select 
                        value={tipoExame} 
                        onChange={(e) => setTipoExame(e.target.value)} 
                        style={{...styles.input, fontWeight:'bold', color:'#1C2E4A'}}
                    >
                        <option value="OBSTETRICO">Obstétrico</option>
                        <option value="TRANSVAGINAL">Transvaginal</option>
                        <option value="ECOCARDIOGRAMA">Ecocardiograma</option>
                        <option value="ABDOME">Abdome Total</option>
                        <option value="DOPPLER_CAROTIDAS">Doppler Carótidas</option> 
                    </select>
                </div>

                {/* MÉDICO */}
                <div style={{position: 'relative'}}>
                    <div style={styles.label}><FaUserMd color="#1C2E4A"/> MÉDICO RESPONSÁVEL</div>
                    <input 
                        placeholder="Busque o médico..."
                        value={medicoNome}
                        onChange={(e) => handleInputMedicoChange(e.target.value)}
                        onFocus={() => { 
                            setMostrarListaMedicos(true); 
                            if(!medicoNome) setMedicosFiltrados(todosMedicos);
                        }}
                        onBlur={() => setTimeout(() => setMostrarListaMedicos(false), 200)}
                        style={styles.input}
                    />
                    
                    {mostrarListaMedicos && medicosFiltrados.length > 0 && (
                        <div style={styles.dropdownList}>
                            {medicosFiltrados.map(med => (
                                <div 
                                    key={med.id} 
                                    onClick={() => selecionarMedico(med)} 
                                    style={styles.dropdownItem}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                >
                                    <span>{med.first_name ? `${med.first_name} ${med.last_name}` : med.username}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* CRM */}
                <div>
                    <div style={styles.label}><FaIdCard color="#1C2E4A"/> CRM</div>
                    <input 
                        placeholder="00000"
                        value={medicoCrm}
                        onChange={(e) => setMedicoCrm(e.target.value)}
                        style={{...styles.input, textAlign:'center', background: '#f9f9f9'}}
                    />
                </div>
            </div>
        </div>

        {/* ÁREA DO FORMULÁRIO DINÂMICO */}
        <div style={{flex: 1, overflowY: 'auto', paddingRight: '5px'}}> 
            {tipoExame === 'OBSTETRICO' && <FormObstetrico onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            {tipoExame === 'TRANSVAGINAL' && <FormTransvaginal onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            {tipoExame === 'ECOCARDIOGRAMA' && <FormEcocardiograma onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            {tipoExame === 'DOPPLER_CAROTIDAS' && <FormDopplerCarotidas onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
        </div>
      </div>

      {/* ================= COLUNA DIREITA (PREVIEW) ================= */}
      <div style={styles.rightCol}>
         <div style={{ background: '#fff', borderRadius: '6px', border: `1px solid ${theme.border}`, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}> 
             
             {/* BARRA DE AÇÕES */}
             <div style={{ padding: '8px 12px', background: '#fff', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', zIndex: 10 }}>
                 <div style={{fontWeight: 'bold', color: '#1C2E4A', fontSize: '12px', display:'flex', alignItems:'center', gap:'6px'}}>
                     <FaFileAlt /> PRÉVIA
                 </div>
                 
                 {/* CONTAINER DOS BOTÕES */}
                 <div style={{display: 'flex', gap: '6px', alignItems: 'center'}}>
                     
                     {/* INPUT INVISÍVEL */}
                     <input 
                        type="file" 
                        id="img-upload" 
                        multiple 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        style={{display: 'none'}} 
                     />
                     
                     {/* BOTÃO CÂMERA */}
                     <button 
                       onClick={handleCameraClick}
                       title="Anexar Fotos" 
                       style={{
                           background: '#FF9800', color: 'white', border: 'none', 
                           padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center'
                       }}
                    >
                       <FaCamera />
                    </button>
                    
                    {/* Menu de Escolha Câmera */}
                    <Menu
                      anchorEl={anchorElCamera}
                      open={Boolean(anchorElCamera)}
                      onClose={handleMenuClose}
                    >
                      <MenuItem onClick={handleOpcaoComputador}>Do Computador</MenuItem>
                      <MenuItem onClick={handleOpcaoNuvem}> <FaCloudDownloadAlt style={{marginRight: 5}}/> Exames Salvos (Nuvem)</MenuItem>
                    </Menu>

                     <button onClick={handleLimpar} title="Limpar" style={{background: '#EF5350', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer'}}><FaEraser /></button>
                     <button onClick={handleImprimirTermo} title="Termo" style={{background: '#78909C', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer'}}><FaFileSignature /></button>
                                                                                   
                     <button onClick={handleSave} title="Salvar" style={{background: '#66BB6A', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer'}}>{saving ? <FaSpinner className="spin"/> : <FaSave />}</button>
                     <button 
    onClick={() => handlePrint(false)} 
    title="Imprimir (Sem Timbre/Logo)" 
    style={{background: '#42A5F5', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer'}}
>
    <FaPrint />
</button>
                 </div>
             </div>
             
             {/* TEXTAREA (FOLHA DE PAPEL) */}
             <div style={{flex: 1, padding: '15px', overflowY: 'auto', background: '#EEEEEE'}}>
                 <textarea 
                     value={textoFinal} 
                     onChange={(e) => setTextoFinal(e.target.value)}
                     style={{ width: '100%', height: '100%', border: 'none', padding: '25px', resize: 'none', outline: 'none', fontFamily: '"Times New Roman", serif', fontSize: '14px', lineHeight: '1.5', color: '#000', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                 />
             </div>

             {/* IMAGENS (PREVIEW NO RODAPÉ) */}
             {imagens.length > 0 && (
                 <div style={{padding: '8px', borderTop: `1px solid ${theme.border}`, background: '#f9f9f9', maxHeight: '120px', overflowY: 'auto'}}>
                     <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px'}}>
                        {imagens.map((img, idx) => (
                            <div key={idx} style={{position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: '4px', border: '1px solid #ddd'}}>
                                <img src={img} alt="thumb" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                                <button onClick={() => removeImage(idx)} style={{position: 'absolute', top: 0, right: 0, background: 'rgba(200,0,0,0.8)', color: 'white', border: 'none', cursor: 'pointer', padding: '2px 5px', fontSize: '10px'}}>X</button>
                            </div>
                        ))}
                     </div>
                 </div>
             )}
         </div>
      </div>

      {/* --- MODAIS DE SISTEMA --- */}

      {/* 1. Modal de Galeria da Nuvem */}
      <Dialog open={modalNuvemOpen} onClose={() => setModalNuvemOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Exames Anteriores de {paciente?.nome_completo}</DialogTitle>
            <DialogContent>
                {loadingNuvem ? <p>Carregando...</p> : (
                    examesNuvem.length === 0 ? <p>Nenhum exame encontrado para este paciente.</p> : (
                        <div>
                            {examesNuvem.map(exame => (
                                <div key={exame.id} style={{marginBottom: '20px', border: '1px solid #eee', padding: '10px'}}>
                                    <Typography variant="subtitle2" style={{background: '#f5f5f5', padding: '5px'}}>
                                        Data: {exame.data_exame}
                                    </Typography>
                                    <div style={{display: 'flex', gap: '10px', overflowX: 'auto', padding: '10px 0'}}>
                                        {exame.arquivos.map(arq => (
                                            <div key={arq.id} style={{minWidth: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                                                {arq.tipo === 'VIDEO' ? (
                                                    <div style={{width: 100, height: 100, background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>VIDEO</div>
                                                ) : (
                                                    <img src={arq.arquivo} alt="Exame" style={{width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px'}} />
                                                )}
                                                <Button size="small" onClick={() => adicionarImagemDaNuvem(arq.arquivo)}>
                                                    Inserir
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setModalNuvemOpen(false)}>Fechar</Button>
            </DialogActions>
      </Dialog>

      {/* 2. Modal de Sucesso e Envio (CORRIGIDO E UNIFICADO) */}
      <Dialog 
        open={modalSucessoOpen} 
        onClose={() => setModalSucessoOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <div style={{padding: '30px', textAlign: 'center'}}>
            <FaCheckCircle size={60} color="#4CAF50" style={{marginBottom: 15}} />

            <Typography variant="h5" style={{fontWeight: 'bold', color: '#2C3E50', marginBottom: 10}}>
                Laudo Salvo com Sucesso!
            </Typography>

            <Typography variant="body1" style={{color: '#555', marginBottom: 30}}>
                O exame foi registrado no prontuário. Como deseja notificar o paciente?
            </Typography>

            {/* CARD DE CREDENCIAIS */}
            <div style={{
                background: '#F0F4F8', border: '1px dashed #B0BEC5', borderRadius: 8,
                padding: '15px', marginBottom: 30, textAlign: 'left'
            }}>
                <Typography variant="subtitle2" style={{color: '#1C2E4A', fontWeight: 'bold', marginBottom: 5}}>
                    DADOS DE ACESSO GERADOS:
                </Typography>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '14px'}}>
                    <span>Usuário: <strong>{credenciais?.codigo || '---'}</strong></span>
                    <span>Senha: <strong>{credenciais?.senha || '---'}</strong></span>
                </div>
            </div>

            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <Button 
                        fullWidth 
                        variant="contained" 
                        onClick={handleEnviarWhatsApp}
                        style={{background: '#25D366', height: '50px', fontSize: '12px', display: 'flex', gap: '8px'}}
                    >
                        <FaWhatsapp size={20} /> Enviar WhatsApp
                    </Button>
                    <Typography variant="caption" style={{display:'block', marginTop:5, color: '#999'}}>
                        * O PDF será baixado para você arrastar
                    </Typography>
                </Grid>
                <Grid item xs={6}>
                    <Button 
                        fullWidth 
                        variant="contained" 
                        onClick={handleEnviarEmail}
                        style={{background: '#1C2E4A', height: '50px', fontSize: '12px', display: 'flex', gap: '8px'}}
                    >
                        <FaEnvelope size={20} /> Enviar E-mail
                    </Button>
                </Grid>
            </Grid>
        </div>
        <DialogActions>
            <Button onClick={() => setModalSucessoOpen(false)} style={{color: '#888'}}>
                Fechar Janela
            </Button>
        </DialogActions>
      </Dialog>

    </div>
  );
};

export default LaudosPage;