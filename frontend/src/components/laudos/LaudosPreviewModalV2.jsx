import React, { useState, useEffect, useRef } from 'react';
import { 
    Dialog, AppBar, Toolbar, Typography, Button, IconButton, 
    Box, Tooltip, Divider, Stack
} from '@mui/material';
import { 
    FaSave, FaTimes, FaCamera, FaTrash, FaCloudDownloadAlt, 
    FaLaptop, FaPrint, FaShareSquare, FaImage, FaExclamationTriangle
} from 'react-icons/fa';
import { Editor } from '@tinymce/tinymce-react';


const LaudosPreviewModalV2 = ({ 
    open, onClose, htmlInicial, imagensIniciais, 
    onFinalizar, onAbrirNuvem, onSalvarRascunho,
    nomePaciente
}) => {
    const editorRef = useRef(null);
    const [imagens, setImagens] = useState([]);
    const [dataExameModal, setDataExameModal] = useState(new Date().toISOString().split('T')[0]);
    const [mostrarFotos, setMostrarFotos] = useState(true);
    const imagensBaseRef = useRef(0);

    // Reseta o estado local SÓ quando o modal abre de fato
    useEffect(() => {
        if (open) {
            setImagens(imagensIniciais || []);
            setDataExameModal(new Date().toISOString().split('T')[0]);
            imagensBaseRef.current = (imagensIniciais || []).length;
        }
    }, [open]);

    // Com o modal já aberto, só ANEXA fotos novas vindas do pai (ex: importadas
    // da nuvem), sem sobrescrever fotos locais ainda não salvas no pai
    useEffect(() => {
        if (!open) return;
        const listaPai = imagensIniciais || [];
        if (listaPai.length > imagensBaseRef.current) {
            const novas = listaPai.slice(imagensBaseRef.current);
            setImagens(prev => [...prev, ...novas]);
            imagensBaseRef.current = listaPai.length;
        }
    }, [imagensIniciais, open]);

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        const promises = files.map(file => new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
        }));
        Promise.all(promises).then(base64List => setImagens(prev => [...prev, ...base64List]));
    };

    const removeImage = (index) => setImagens(prev => prev.filter((_, i) => i !== index));
    const extrairHTML = () => editorRef.current ? editorRef.current.getContent() : htmlInicial;

    const acaoSalvarRascunho = () => { onSalvarRascunho(extrairHTML()); onClose(); };
    const acaoImprimirApenas = () => {
        if (editorRef.current) {
            const iframe = editorRef.current.getWin();
            iframe.focus();
            iframe.print();
        }
    };
    const acaoFinalizar = () => onFinalizar(extrairHTML(), imagens, dataExameModal);

    return (
        <Dialog open={open} onClose={acaoSalvarRascunho} fullScreen>
            <style>{`
                .tox-notifications-container, .tox-statusbar__branding, .tox-promotion { display: none !important; }
                .tox-editor-header { 
                    box-shadow: 0 2px 6px rgba(0,0,0,0.08) !important; 
                    border-bottom: 1px solid #ced4da !important; 
                    z-index: 20 !important; 
                    background: #f8f9fa !important;
                }
                .tox .tox-toolbar__primary { flex-wrap: nowrap !important; overflow-x: auto !important; background-color: #f8f9fa !important; padding: 4px 8px !important; }
                
                /* Agora seguro reintroduzir: sem o plugin autoresize brigando pelo controle,
                isso deixa os containers crescerem livremente conforme a altura que 
                aplicamos manualmente no iframe via JS (ajustarAlturaIframe) */
                .tox-tinymce { 
                    border: none !important; 
                    width: 100% !important; 
                    height: auto !important;
                    overflow: visible !important;
                }
                .tox-editor-container {
                    height: auto !important;
                    overflow: visible !important;
                }
                .tox-edit-area {
                    height: auto !important;
                    overflow: visible !important;
                }
                
                .tox-edit-area, .tox-edit-area__iframe, .tox-editor-container { 
                    background: transparent !important; 
                }

                /* A barra de contagem de palavras não precisa ficar visível como barra
                flutuante dentro do fluxo — esconder evita o artefato visual */
                .tox-statusbar {
                    display: none !important;
                }
            `}</style>

            <AppBar sx={{ position: 'relative', background: '#b71c1c', boxShadow: 'none' }}>
                <Toolbar variant="dense" sx={{ minHeight: '48px', px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton edge="start" color="inherit" onClick={acaoSalvarRascunho} title="Voltar e Salvar Rascunho" sx={{ p: 0.5 }}>
                            <FaTimes size={18} />
                        </IconButton>
                        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FaExclamationTriangle /> REVISÃO E FINALIZAÇÃO
                            </Typography>
                            <Typography sx={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                {nomePaciente ? `PACIENTE: ${nomePaciente.toUpperCase()}` : 'PACIENTE: DESCONHECIDO'}
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, background: 'rgba(0,0,0,0.2)', px: 1.5, py: 0.3, borderRadius: '4px' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#fff', fontSize: '11px' }}>Data:</Typography>
                        <input 
                            type="date" value={dataExameModal} onChange={(e) => setDataExameModal(e.target.value)}
                            style={{ padding: '2px', border: 'none', fontSize: '11px', outline: 'none', cursor: 'pointer', background: 'transparent', color: '#fff', fontWeight: 'bold' }}
                        />
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button size="small" onClick={acaoSalvarRascunho} sx={{ color: '#fff', textTransform: 'none', fontWeight: 600, fontSize: '11px' }}>
                            <FaSave size={13} style={{ marginRight: 4 }} /> Salvar Rascunho
                        </Button>
                        <Divider orientation="vertical" flexItem sx={{ background: 'rgba(255,255,255,0.3)', my: 1 }} />
                        <Tooltip title="Imprimir Teste">
                            <IconButton onClick={acaoImprimirApenas} sx={{ color: '#fff', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                                <FaPrint size={15} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={mostrarFotos ? 'Ocultar Fotos' : 'Mostrar Fotos'}>
                            <IconButton onClick={() => setMostrarFotos(!mostrarFotos)} sx={{ color: mostrarFotos ? '#ffb74d' : '#fff', opacity: mostrarFotos ? 1 : 0.8 }}>
                                <FaImage size={15} />
                            </IconButton>
                        </Tooltip>
                        <Divider orientation="vertical" flexItem sx={{ background: 'rgba(255,255,255,0.3)', my: 1, mx: 0.5 }} />
                        <Button 
                            onClick={acaoFinalizar} variant="contained" 
                            sx={{ background: '#2E7D32', textTransform: 'none', fontWeight: 'bold', px: 2.5, py: 0.6, borderRadius: '30px', fontSize: '11px', whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(46, 125, 50, 0.4)', '&:hover': { background: '#1b5e20' } }}
                        >
                            <FaShareSquare size={13} style={{ marginRight: 6 }} /> FINALIZAR
                        </Button>
                    </Stack>
                </Toolbar>
            </AppBar>

            {/* ÁREA DE TRABALHO GERAL — agora o editor ocupa 100% da largura, como o Word */}
            <Box sx={{ display: 'flex', height: 'calc(100vh - 48px)', background: '#e9ecef', overflowY: 'auto' }}>
                
                {/* CONTAINER DO EDITOR — full width, sem centralizar aqui; a "folha" é centralizada dentro do iframe */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <Editor
                        apiKey="qs3k6opqccy0770vysfyha4xffrsjf4tgxy11clmml5o8wq6"
                        onInit={(evt, editor) => {
                            editorRef.current = editor;

                            const ajustarAlturaIframe = () => {
                                try {
                                    const body = editor.getBody();
                                    const container = editor.getContentAreaContainer();
                                    const iframe = container?.querySelector('iframe');
                                    if (!body || !iframe) return;

                                    // scrollHeight reflete o conteúdo real, mesmo se offsetHeight
                                    // do body ainda não tiver "assentado" no layout
                                    const alturaReal = Math.max(body.scrollHeight, 1123); // nunca menor que 1 folha A4 (~297mm em px)
                                    iframe.style.height = `${alturaReal}px`;
                                } catch (err) {
                                    console.error('[ajustarAlturaIframe] erro:', err);
                                }
                            };

                            // Ajusta assim que o editor termina de montar
                            setTimeout(ajustarAlturaIframe, 100);

                            // Reajusta sempre que o conteúdo mudar (digitação, colar, etc.)
                            editor.on('NodeChange input SetContent Undo Redo', () => {
                                // pequeno debounce via rAF evita recalcular dezenas de vezes por segundo
                                requestAnimationFrame(ajustarAlturaIframe);
                            });

                            // ResizeObserver cobre casos que os eventos acima não pegam
                            // (ex: imagem carregando e mudando a altura depois)
                            try {
                                const body = editor.getBody();
                                if (body && window.ResizeObserver) {
                                    const observer = new ResizeObserver(() => ajustarAlturaIframe());
                                    observer.observe(body);
                                }
                            } catch (err) {
                                console.warn('[ResizeObserver] não disponível ou falhou:', err);
                            }
                        }}
                        initialValue={htmlInicial}
                        init={{
                            width: '100%',
                            resize: false,
                            branding: false,
                            promotion: false,
                            elementpath: false,
                            menubar: false,
                            browser_spellcheck: true,
                            toolbar_mode: 'sliding',
                            toolbar_sticky: true,
                            toolbar_sticky_offset: 0,
                            plugins: 'advlist autolink lists charmap preview searchreplace visualblocks pagebreak table wordcount',
                            toolbar: 'undo redo | fontfamily fontsize | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | table pagebreak | bullist numlist | removeformat',
                            content_style: `
                                html { 
                                    background: #e9ecef !important; 
                                    margin: 0;
                                    padding: 24px 0 40px 0;
                                }
                                body { 
                                    font-family: Arial, Helvetica, sans-serif; 
                                    font-size: 13px; color: #222; line-height: 1.5;
                                    width: 210mm;
                                    min-height: 297mm;
                                    margin: 0 auto !important;
                                    box-sizing: border-box;
                                    background-color: #ffffff;
                                    background-image: url('${process.env.PUBLIC_URL}/Receituario_v2.jpg');
                                    background-size: 210mm 297mm;
                                    background-repeat: repeat-y;
                                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
                                    border: 1px solid #d1d5db;
                                    padding: 0 1.5cm 5.5cm 1.5cm !important;
                                }
                                table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
                                td, th { padding: 4px; text-align: left; font-size: 13px; border: 1px dotted #bbb; }
                                .mce-pagebreak {
                                    display: block !important; 
                                    height: 11.5cm !important; 
                                    margin: 0 !important; padding: 0 !important; border: none !important;
                                    border-top: 2px dashed rgba(24, 100, 171, 0.4) !important; 
                                    page-break-after: always !important; break-after: page !important;
                                }
                            `
                        }}
                    />
                </Box>
                

                {/* PAINEL LATERAL DE FOTOS */}
                {mostrarFotos && (
                    <Box sx={{ width: '310px', background: '#fff', borderLeft: '1px solid #ced4da', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: 'calc(100vh - 48px)' }}>
                        <Box sx={{ p: 2, background: '#f0f4f8', borderBottom: '1px solid #e0e6ed' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1C2E4A', mb: 1.5 }}>
                                Anexos ({imagens.length})
                            </Typography>
                            <Box display="flex" flexDirection="column" gap={1}>
                                <label htmlFor="modal-img-upload-v2" style={{ width: '100%' }}>
                                    <input type="file" id="modal-img-upload-v2" multiple accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                                    <Button component="span" variant="outlined" fullWidth sx={{ background: 'white', color: '#555', borderColor: '#bbb', textTransform: 'none', justifyContent: 'flex-start', padding: '6px 12px' }}>
                                        <FaLaptop style={{ marginRight: 8, color: '#FF9800' }} /> Do Computador
                                    </Button>
                                </label>
                                <Button onClick={onAbrirNuvem} variant="contained" fullWidth sx={{ background: '#007FFF', textTransform: 'none', justifyContent: 'flex-start', padding: '6px 12px' }}>
                                    <FaCloudDownloadAlt style={{ marginRight: 8, fontSize: '1.1em' }} /> Buscar da Nuvem
                                </Button>
                            </Box>
                        </Box>
                        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2, background: '#fafafa' }}>
                            {imagens.length === 0 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#aaa', height: '100%', opacity: 0.6 }}>
                                    <FaCamera size={40} style={{ mb: 1 }} />
                                    <Typography variant="body2">Nenhuma foto selecionada.</Typography>
                                </Box>
                            )}
                            {imagens.map((img, idx) => (
                                <Box key={idx} sx={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ddd', height: '150px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <img src={img} alt={`foto-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <Tooltip title="Remover">
                                        <IconButton size="small" onClick={() => removeImage(idx)} sx={{ position: 'absolute', top: 5, right: 5, background: 'white', '&:hover': { background: '#ffebee' } }}>
                                            <FaTrash size={12} color="#d32f2f" />
                                        </IconButton>
                                    </Tooltip>
                                    <Box sx={{ position: 'absolute', bottom: 5, left: 5, background: 'rgba(0,0,0,0.6)', color: 'white', px: 1, py: 0.2, borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }}>
                                        #{idx + 1}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}
            </Box>
        </Dialog>
    );
};

export default LaudosPreviewModalV2;