// src/pages/LaudosPageV2.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FaSave, FaFileAlt, FaSpinner, FaEraser, FaUserMd, FaFileSignature, FaUserInjured, FaNotesMedical, FaIdCard, FaTimes, FaCalendarAlt } from 'react-icons/fa';
import { FaWhatsapp, FaEnvelope, FaCheckCircle } from 'react-icons/fa';
import apiClient from '../api/axiosConfig';
import { 
  Box, Typography, Grid, Button, Dialog, DialogActions, Stack, Tooltip, IconButton, Divider 
} from '@mui/material';
import '../components/laudos/Laudos.css';
import '../atendimento.css'; // <-- SEU NOVO CSS PADRÃO TASY

// Formulários
import FormObstetrico from '../components/laudos/obstetrico/FormObstetrico';
import FormAbdome from '../components/laudos/abdome/FormAbdome'; 
import FormTransvaginal from '../components/laudos/trasnvaginal/FormTransvaginal';
import FormEcocardiograma from '../components/laudos/ecocardiograma/FormEcocardiograma';
import FormDopplerCarotidas from '../components/laudos/carotidas/FormDopplerCarotidas';
import FormEletrocardiograma from '../components/laudos/eletrocardiograma/FormEletrocardiograma';

// Modais (IMPORTANDO O V2 AQUI!)
import DeclaracaoModal from '../components/laudos/DeclaracaoModal';
import AtestadoModal from '../components/laudos/AtestadoModal'; 
import LaudosPreviewModalV2 from '../components/laudos/LaudosPreviewModalV2'; // <--- O NOVO MODAL WYSIWYG
import ImagensNuvemModal from '../components/laudos/ImagensNuvemModal'; 

const theme = { primary: '#1C2E4A', secondary: '#C5A47E', accent: '#2E7D32', bg: '#F0F2F5', border: '#dee2e6' };

const STORAGE_KEY = 'laudos_rascunho_auto_save_v2'; // Nome diferente para não conflitar com a V1

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
  // Estados principais
  const [tipoExame, setTipoExame] = useState(() => getInitialState('tipoExame', 'OBSTETRICO'));
  const [paciente, setPaciente] = useState(() => getInitialState('paciente', null));
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
  
  // Conteúdo do Laudo (Agora armazenará HTML, não texto puro)
  const [textoFinal, setTextoFinal] = useState(() => getInitialState('textoFinal', ''));
  const [dadosEstruturados, setDadosEstruturados] = useState(() => getInitialState('dadosEstruturados', {}));
  const [tituloExame, setTituloExame] = useState(() => getInitialState('tituloExame', ''));
  const [imagens, setImagens] = useState(() => getInitialState('imagens', []));
  
  // Estados de Controle
  const [modalSucessoOpen, setModalSucessoOpen] = useState(false);
  const [credenciais, setCredenciais] = useState(null);
  const [laudoId, setLaudoId] = useState(() => getInitialState('laudoId', null)); 
  const [modalDeclaracaoOpen, setModalDeclaracaoOpen] = useState(false);
  const [modalAtestadoOpen, setModalAtestadoOpen] = useState(false);
  const [modalRevisaoOpen, setModalRevisaoOpen] = useState(false); 
  const [modalNuvemOpen, setModalNuvemOpen] = useState(false); 
  const [isPolling, setIsPolling] = useState(false);

  const searchTimeoutRef = useRef(null);

  // --- CARREGAMENTOS INICIAIS ---
  useEffect(() => {
    const carregarMedicos = async () => {
        try {
            const res = await apiClient.get('/usuarios/usuarios/?cargo=medico');
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

  // --- LÓGICA DE FILTROS E BUSCAS ---
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

  // --- AUTO-SAVE ---
  useEffect(() => {
      const dados = { laudoId, tipoExame, paciente, medicoNome, medicoCrm, medicoEspecialidades, textoFinal, dadosEstruturados, tituloExame, imagens };
      const timeoutId = setTimeout(() => {
          try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dados)); } 
          catch (e) { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...dados, imagens: [] })); }
      }, 1000);
      return () => clearTimeout(timeoutId);
  }, [laudoId, tipoExame, paciente, medicoNome, medicoCrm, medicoEspecialidades, textoFinal, dadosEstruturados, tituloExame, imagens]);

  // --- MANIPULADORES DO FORMULÁRIO ---
  const handleLimpar = () => {
    if (window.confirm("Limpar formulário? Rascunho será perdido.")) {
        sessionStorage.removeItem(STORAGE_KEY);
        setLaudoId(null); setCredenciais(null); setTipoExame('OBSTETRICO'); setPaciente(null);
        setMedicoNome(''); setMedicoCrm(''); setMedicoEspecialidades([]); setTextoFinal('');
        setDadosEstruturados({}); setTituloExame(''); setImagens([]); setTermoBusca(''); setPacientesEncontrados([]);
    }
  };

  const handleFormUpdate = useCallback((dados) => {
      if (dados.texto) setTextoFinal(dados.texto);
      if (dados.dadosEstruturados) setDadosEstruturados(prev => ({ ...prev, ...dados.dadosEstruturados }));
      if (dados.tituloExame) setTituloExame(dados.tituloExame);
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

  // --- FINALIZAR LAUDO (Recebe HTML do modal V2) ---
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
        setTextoFinal(htmlDoEditor); // Salva o HTML final no estado
        setImagens(imagensOtimizadas);

        const formData = new FormData();
        formData.append('paciente', paciente.id);
        formData.append('data_exame', dataExameSelecionada); 
        formData.append('tipo_exame', tipoExame);
        formData.append('titulo', tituloExame || `Laudo de ${tipoExame}`);
        formData.append('texto_laudo', htmlDoEditor); // <-- AQUI ENVIAMOS O HTML
        formData.append('medico_responsavel', medicoNome);
        formData.append('crm_medico', medicoCrm);
        formData.append('dados_estruturados', JSON.stringify(dadosEstruturados));
        formData.append('imagens_anexas', JSON.stringify(imagensOtimizadas));
        
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

  return (
    <div className="tasy-workspace" style={{ flex: 1, display: 'flex', background: theme.bg, minHeight: 0, overflow: 'hidden', fontFamily: "'Segoe UI', Roboto, sans-serif", fontSize: '11px', color: '#333' }}>
      
      {/* COLUNA ESQUERDA (Tasy Flat Panel) */}
      <div className="tasy-flat-panel" style={{ flex: 2, minWidth: '700px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #dee2e6', minHeight: 0 }}>
        
        {/* BARRA DE FERRAMENTAS */}
        <div style={{ background: '#f8f9fa', borderBottom: `1px solid ${theme.border}`, padding: '10px 16px', display: 'grid', gridTemplateColumns: 'minmax(220px, 3.5fr) minmax(130px, 1.5fr) minmax(180px, 2.5fr) 100px', gap: '12px', alignItems: 'center', flexShrink: 0, zIndex: 20 }}>
            {/* Paciente (Usando tasy-compact-input para simular seu CSS) */}
            <div className="tasy-compact-input" style={{position: 'relative', background: '#fff', border: '1px solid #ced4da', borderRadius: '3px', display: 'flex', alignItems: 'center', height: '32px'}}> 
                <div style={{ padding: '0 10px', color: '#6c757d' }}><FaUserInjured size={13} /></div>
                <input 
                    style={{ border: 'none', width: '100%', height: '100%', outline: 'none', fontSize: '12px', color: '#495057' }}
                    placeholder="Buscar Paciente..."
                    value={paciente ? `${paciente.id}_${paciente.nome_completo}` : termoBusca}
                    onChange={(e) => { if (paciente) setPaciente(null); handleBuscaPacienteChange(e); }}
                />
            </div>
            
            {/* Tipo Exame */}
            <div className="tasy-compact-input" style={{background: '#fff', border: '1px solid #ced4da', borderRadius: '3px', display: 'flex', alignItems: 'center', height: '32px'}}>
                <div style={{ padding: '0 10px', color: '#6c757d' }}><FaNotesMedical size={13} /></div>
                <select value={tipoExame} onChange={(e) => setTipoExame(e.target.value)} style={{ border: 'none', width: '100%', height: '100%', outline: 'none', fontSize: '12px', color: '#495057', background: 'transparent' }}>
                    <option value="OBSTETRICO">Medicina Fetal</option>
                    <option value="TRANSVAGINAL">Transvaginal</option>
                    <option value="ECOCARDIOGRAMA">Ecocardiograma</option>
                    <option value="ABDOME">US Geral</option>
                    <option value="DOPPLER_CAROTIDAS">Carótidas</option>
                </select>
            </div>

            {/* Médico */}
            <div className="tasy-compact-input" style={{position: 'relative', background: '#fff', border: '1px solid #ced4da', borderRadius: '3px', display: 'flex', alignItems: 'center', height: '32px'}}>
                <div style={{ padding: '0 10px', color: '#6c757d' }}><FaUserMd size={13} /></div>
                <input style={{ border: 'none', width: '100%', height: '100%', outline: 'none', fontSize: '12px', color: '#495057' }} placeholder="Médico..." value={medicoNome} onChange={(e) => handleInputMedicoChange(e.target.value)} />
            </div>

            {/* CRM */}
            <div className="tasy-compact-input" style={{background: '#fff', border: '1px solid #ced4da', borderRadius: '3px', display: 'flex', alignItems: 'center', height: '32px'}}>
                <input style={{ border: 'none', width: '100%', height: '100%', outline: 'none', fontSize: '12px', textAlign: 'center', color: '#495057' }} placeholder="CRM" value={medicoCrm} onChange={(e) => setMedicoCrm(maskCRM(e.target.value))} />
            </div>
        </div>

        {/* ÁREA DO FORMULÁRIO DINÂMICO */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#ffffff' }}> 
            <div className="tasy-section-header">Preenchimento Clínico</div>
            {tipoExame === 'OBSTETRICO' && <FormObstetrico key={`${paciente?.id || 'novo'}-${tipoExame}`} onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            {tipoExame === 'ABDOME' && <FormAbdome key={`${paciente?.id || 'novo'}-${tipoExame}`} onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            {tipoExame === 'TRANSVAGINAL' && <FormTransvaginal key={`${paciente?.id || 'novo'}-${tipoExame}`} onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            {tipoExame === 'ECOCARDIOGRAMA' && <FormEcocardiograma key={`${paciente?.id || 'novo'}-${tipoExame}`} onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
            {tipoExame === 'DOPPLER_CAROTIDAS' && <FormDopplerCarotidas key={`${paciente?.id || 'novo'}-${tipoExame}`} onUpdate={handleFormUpdate} initialValues={dadosEstruturados} />}
        </div>
      </div> 

      {/* COLUNA DIREITA (PREVIEW WYSIWYG SIMULADO) */}
      <div style={{ flex: 1, minWidth: '400px', display: 'flex', flexDirection: 'column', background: theme.bg, minHeight: 0, paddingLeft: '8px' }}>
         <div className="tasy-flat-panel" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}> 
             
             {/* BARRA DE AÇÕES */}
             <Box sx={{ px: 2, background: '#f8f9fa', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '45px', flexShrink: 0 }}>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                     <FaFileSignature color="#495057" size={14} />
                     <Typography variant="caption" sx={{ fontWeight: 600, color: '#495057', fontSize: '12px', textTransform: 'uppercase' }}>Pré-visualização (HTML)</Typography>
                 </Box>
                 <Stack direction="row" spacing={1} alignItems="center">
                     <Tooltip title="Limpar"><IconButton onClick={handleLimpar} size="small" sx={{ color: '#fa5252' }}><FaEraser size={14} /></IconButton></Tooltip>
                     <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />
                    <Button 
                        variant="contained" size="small" 
                        onClick={() => {
                            if (!textoFinal) return alert("Preencha as medidas para gerar o laudo.");
                            setModalRevisaoOpen(true);
                        }} 
                        sx={{ background: '#1864ab', textTransform: 'none', fontWeight: '600', fontSize: '12px', boxShadow: 'none', '&:hover': { background: '#1971c2', boxShadow: 'none' } }}
                    >
                        Abrir Editor Visual
                    </Button>
                 </Stack>
             </Box>
             
             {/* ÁREA DE RENDERIZAÇÃO DO HTML (Simula a folha antes de abrir o modal) */}
             <div style={{flex: 1, minHeight: 0, overflow: 'auto', background: '#e9ecef', padding: '20px', display: 'flex', justifyContent: 'center'}}>
                <div 
                    style={{ 
                        width: '100%', maxWidth: '210mm', minHeight: '297mm', background: '#fff', 
                        padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #ced4da',
                        fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '13px', lineHeight: '1.5', color: '#333'
                    }}
                    // Temporário: Enquanto o TextBuilderV2 não está pronto, renderizamos como pre-wrap 
                    // para não quebrar o texto atual, mas já preparamos a div para receber HTML.
                    dangerouslySetInnerHTML={{ __html: textoFinal.replace(/\n/g, '<br/>') }}
                />
             </div>
         </div>
      </div>

      {/* --- MODAIS --- */}
      <LaudosPreviewModalV2 
          open={modalRevisaoOpen} 
          onClose={() => setModalRevisaoOpen(false)} 
          htmlInicial={textoFinal} // Retiramos o .replace() provisório, pois o TextBuilder novo já manda HTML
          imagensIniciais={imagens} 
          onFinalizar={handleFinalizacaoAssincrona}
          onAbrirNuvem={() => setModalNuvemOpen(true)}
          
          // NOVA PROPRIEDADE AQUI:
          onSalvarRascunho={(htmlEditado) => {
              setTextoFinal(htmlEditado);
              setModalRevisaoOpen(false);
          }}
      />
      <ImagensNuvemModal open={modalNuvemOpen} onClose={() => setModalNuvemOpen(false)} paciente={paciente} onConfirmar={handleImportarDaNuvem} />
      <DeclaracaoModal open={modalDeclaracaoOpen} onClose={() => setModalDeclaracaoOpen(false)} paciente={paciente} medico={medicoNome} />
      <AtestadoModal open={modalAtestadoOpen} onClose={() => setModalAtestadoOpen(false)} paciente={paciente} medicoNome={medicoNome} medicoCrm={medicoCrm} usaAssinaturaDigital={usuarioTemCertificado} />
    </div>
  );
};

export default LaudosPageV2;