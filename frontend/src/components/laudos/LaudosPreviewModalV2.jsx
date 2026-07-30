// src/components/laudos/LaudosPreviewModalV2.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
    Dialog, AppBar, Toolbar, Typography, Button, IconButton, 
    Box, Tooltip, Divider, Stack
} from '@mui/material';
import { 
    FaSave, FaTimes, FaCamera, FaTrash, FaCloudDownloadAlt, 
    FaLaptop, FaPrint, FaShareSquare, FaImage
} from 'react-icons/fa';
import { Editor } from '@tinymce/tinymce-react';

const LaudosPreviewModalV2 = ({ 
    open, onClose, htmlInicial, imagensIniciais, 
    onFinalizar, onAbrirNuvem, onSalvarRascunho
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
            
            {/* CABEÇALHO ULTRA-COMPACTO (GARANTIDO EM 1 LINHA) */}
            <AppBar sx={{ position: 'relative', background: '#1C2E4A', boxShadow: 'none' }}>
                <Toolbar variant="dense" sx={{ minHeight: '40px', px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    
                    {/* ESQUERDA: Fechar + Título */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton edge="start" color="inherit" onClick={acaoSalvarRascunho} sx={{ p: 0.5 }}>
                            <FaTimes size={16} />
                        </IconButton>
                        <Typography sx={{ fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap' }}>
                            Editor de Laudos (V2)
                        </Typography>
                    </Box>

                    {/* CENTRO: Data do Exame */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, background: 'rgba(255,255,255,0.1)', px: 1, py: 0.2, borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#fff', fontSize: '11px', whiteSpace: 'nowrap' }}>
                            Data do Exame:
                        </Typography>
                        <input 
                            type="date" 
                            value={dataExameModal} 
                            onChange={(e) => setDataExameModal(e.target.value)}
                            style={{ padding: '2px', borderRadius: '4px', border: 'none', fontSize: '11px', outline: 'none', cursor: 'pointer', background: 'transparent', color: '#fff' }}
                        />
                    </Box>

                    {/* DIREITA: Ícones de Ação e Botão Finalizar */}
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <Tooltip title="Salvar Rascunho">
                            <IconButton onClick={acaoSalvarRascunho} sx={{ color: '#fff', p: 0.8 }}>
                                <FaSave size={14} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Imprimir Rascunho">
                            <IconButton onClick={acaoImprimirApenas} sx={{ color: '#90caf9', p: 0.8 }}>
                                <FaPrint size={14} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={mostrarFotos ? 'Esconder Fotos' : 'Ver Fotos'}>
                            <IconButton onClick={() => setMostrarFotos(!mostrarFotos)} sx={{ color: '#ffb74d', p: 0.8 }}>
                                <FaImage size={14} />
                            </IconButton>
                        </Tooltip>
                        
                        <Divider orientation="vertical" flexItem sx={{ background: 'rgba(255,255,255,0.2)', mx: 1, my: 0.5 }} />
                        
                        <Button 
                            onClick={acaoFinalizar} 
                            variant="contained" 
                            sx={{ 
                                background: '#2E7D32', textTransform: 'none', fontWeight: 'bold', 
                                px: 2, py: 0.4, borderRadius: '20px', fontSize: '11px', 
                                whiteSpace: 'nowrap', boxShadow: 'none',
                                '&:hover': { background: '#1b5e20' } 
                            }}
                        >
                            <FaShareSquare size={13} style={{ marginRight: 6 }} /> Finalizar
                        </Button>
                    </Stack>
                </Toolbar>
            </AppBar>

            {/* ÁREA DE TRABALHO */}
            <Box sx={{ display: 'flex', height: 'calc(100vh - 40px)', background: '#e9ecef', overflow: 'hidden' }}>
                
                {/* EDITOR A4 */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Editor
                        apiKey="qs3k6opqccy0770vysfyha4xffrsjf4tgxy11clmml5o8wq6"
                        onInit={(evt, editor) => editorRef.current = editor}
                        initialValue={htmlInicial}
                        init={{
                            height: '100%',
                            width: '100%',
                            resize: false,
                            branding: false,
                            promotion: false,
                            elementpath: false,
                            browser_spellcheck: true,
                            toolbar_mode: 'sliding', // <--- ISSO GARANTE A BARRA DO TINYMCE EM UMA ÚNICA LINHA
                            
                            // PLUGINS E TOOLBAR EXATOS DA SUA CONTA GRATUITA (Sem bloqueios)
                            plugins: 'anchor autolink charmap codesample emoticons image link lists media searchreplace table visualblocks wordcount',
                            toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat',
                            
                            content_style: `
                                /* Fundo da tela */
                                html { background-color: #e9ecef !important; padding: 0; margin: 0; }
                                
                                /* Folha A4 */
                                body { 
                                    font-family: Arial, Helvetica, sans-serif; 
                                    font-size: 13px; 
                                    color: #222; 
                                    line-height: 1.5;
                                    background-color: #ffffff !important;
                                    background-image: url('/Receituario_v2.jpg'); 
                                    background-size: 100% 100%;
                                    background-repeat: no-repeat;
                                    background-position: center top;
                                    
                                    /* Tamanho cravado de folha A4 */
                                    width: 210mm !important;
                                    min-height: 297mm !important;
                                    box-sizing: border-box !important;
                                    
                                    /* Efeito Flutuante */
                                    margin: 25px auto !important; 
                                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18) !important;
                                    border: 1px solid #d1d5db !important;

                                    /* Margens de impressão */
                                    padding-top: 5.5cm !important; 
                                    padding-bottom: 3.5cm !important; 
                                    padding-left: 2.0cm !important;
                                    padding-right: 2.0cm !important;
                                }
                                
                                /* Estilo das Tabelas de Exames */
                                table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
                                td, th { border: 1px dotted #bbb; padding: 5px 8px; text-align: left; font-size: 13px; }
                                h4 { margin-top: 16px; margin-bottom: 6px; color: #1C2E4A; border-bottom: 1px solid #ccc; padding-bottom: 3px; font-size: 14px; text-transform: uppercase; }
                            `
                        }}
                    />
                </Box>

                {/* PAINEL LATERAL DE FOTOS */}
                {mostrarFotos && (
                    <Box sx={{ width: '300px', background: '#fff', borderLeft: '1px solid #ced4da', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ p: 2, background: '#f0f4f8', borderBottom: '1px solid #e0e6ed' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1C2E4A', mb: 1 }}>
                                Anexos ({imagens.length})
                            </Typography>
                            <Box display="flex" flexDirection="column" gap={1}>
                                <label htmlFor="modal-img-upload-v2" style={{ width: '100%' }}>
                                    <input type="file" id="modal-img-upload-v2" multiple accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                                    <Button component="span" variant="outlined" fullWidth sx={{ background: 'white', color: '#555', borderColor: '#bbb', textTransform: 'none' }}>
                                        <FaLaptop style={{ marginRight: 8, color: '#FF9800' }} /> Do Computador
                                    </Button>
                                </label>
                                <Button onClick={onAbrirNuvem} variant="contained" fullWidth sx={{ background: '#007FFF', textTransform: 'none' }}>
                                    <FaCloudDownloadAlt style={{ marginRight: 8 }} /> Da Nuvem
                                </Button>
                            </Box>
                        </Box>
                        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2, background: '#fafafa' }}>
                            {imagens.length === 0 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#aaa', height: '100%', opacity: 0.6 }}>
                                    <FaCamera size={40} style={{ mb: 1 }} />
                                    <Typography variant="body2">Sem fotos anexadas.</Typography>
                                </Box>
                            )}
                            {imagens.map((img, idx) => (
                                <Box key={idx} sx={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #ddd', height: '150px' }}>
                                    <img src={img} alt={`foto-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <Tooltip title="Remover">
                                        <IconButton size="small" onClick={() => removeImage(idx)} sx={{ position: 'absolute', top: 5, right: 5, background: 'white' }}>
                                            <FaTrash size={12} color="#d32f2f" />
                                        </IconButton>
                                    </Tooltip>
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