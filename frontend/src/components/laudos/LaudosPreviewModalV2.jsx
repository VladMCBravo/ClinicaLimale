// src/components/laudos/LaudosPreviewModalV2.jsx
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

    useEffect(() => {
        if (open) {
            setImagens(imagensIniciais || []);
            setDataExameModal(new Date().toISOString().split('T')[0]); 
        }
    }, [open, imagensIniciais]);

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
                .tox-editor-header { box-shadow: none !important; border-bottom: 1px solid #ced4da !important; }
                .tox .tox-toolbar__primary { flex-wrap: nowrap !important; overflow-x: auto !important; background-color: #f8f9fa !important; padding: 2px 4px !important; }
                .tox .tox-tbtn { height: 26px !important; width: 26px !important; margin: 0 1px !important; border-radius: 4px !important; }
                .tox .tox-tbtn svg { transform: scale(0.8) !important; }
                .tox .tox-tbtn--select { width: auto !important; padding: 0 4px !important; font-size: 11px !important; }
                .tox-tinymce { border: none !important; }
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

            <Box sx={{ display: 'flex', height: 'calc(100vh - 48px)', background: '#e9ecef', overflow: 'hidden' }}>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <Editor
                        apiKey="qs3k6opqccy0770vysfyha4xffrsjf4tgxy11clmml5o8wq6"
                        onInit={(evt, editor) => editorRef.current = editor}
                        initialValue={htmlInicial}
                        init={{
                            height: '100%', width: '100%', resize: false, branding: false, promotion: false, elementpath: false, menubar: false, browser_spellcheck: true, toolbar_mode: 'sliding',
                            plugins: 'advlist autolink lists charmap preview searchreplace visualblocks pagebreak table wordcount',
                            toolbar: 'undo redo | fontfamily fontsize | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | table pagebreak | bullist numlist | removeformat',
                            content_style: `
                                /* ROLAGEM MESTRA DO EDITOR */
                                html { background-color: #e9ecef !important; overflow-y: auto !important; overflow-x: hidden !important; height: 100% !important; padding: 20px 0 !important; }
                                
                                /* TÉCNICA DO PAPEL A4 EM CASCATA */
                                body { 
                                    font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #222; line-height: 1.5;
                                    
                                    /* Fundo que repete as folhas */
                                    background-image: url('/Receituario_v2.jpg') !important; 
                                    background-size: 210mm 297mm !important; 
                                    background-repeat: repeat-y !important;
                                    background-color: #e9ecef !important;
                                    
                                    /* Dimensões flexíveis que crescem de acordo com o texto */
                                    width: 210mm !important; min-height: 297mm !important; box-sizing: border-box !important;
                                    margin: 0 auto !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
                                    
                                    /* MARGENS SIMULADAS (6cm topo / 5.5cm rodapé para salvar o timbre) */
                                    padding-top: 6.0cm !important; 
                                    padding-bottom: 5.5cm !important; 
                                    padding-left: 1.5cm !important; 
                                    padding-right: 1.5cm !important;
                                }

                                /* O SEGREDO DA QUEBRA: Força espaços vazios que casam com o background-repeat */
                                .mce-pagebreak {
                                    display: block !important;
                                    height: 11.5cm !important; /* Espaço exato entre o fim do texto (rodapé) e o começo da página seguinte (cabeçalho) */
                                    margin: 0 !important;
                                    padding: 0 !important;
                                    border: none !important;
                                    border-top: 2px dashed rgba(24, 100, 171, 0.4) !important;
                                    page-break-after: always !important;
                                    break-after: page !important;
                                }

                                table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
                                td, th { padding: 4px; text-align: left; font-size: 13px; border: 1px dotted #bbb; }
                            `
                        }}
                    />
                </Box>

                {mostrarFotos && (
                    <Box sx={{ width: '310px', background: '#fff', borderLeft: '1px solid #ced4da', display: 'flex', flexDirection: 'column' }}>
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