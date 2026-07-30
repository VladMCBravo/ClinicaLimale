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
            
            {/* INJEÇÃO DE CSS GLOBAL PARA ELIMINAR QUALQUER NOTIFICAÇÃO DO TINYMCE */}
            <style>{`
                .tox-notifications-container, 
                .tox-notification, 
                .tox-notification--warning, 
                .tox-notification--error,
                .tox-notification--in,
                .tox-statusbar__branding, 
                .tox-promotion {
                    display: none !important;
                }
            `}</style>

            {/* CABEÇALHO COMPACTO EM UMA SÓ LINHA */}
            <AppBar sx={{ position: 'relative', background: '#1C2E4A', boxShadow: 'none' }}>
                <Toolbar variant="dense" sx={{ minHeight: '48px', px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    
                    {/* ESQUERDA: Fechar + Título */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton edge="start" color="inherit" onClick={acaoSalvarRascunho} title="Salvar Rascunho e Fechar">
                            <FaTimes size={16} />
                        </IconButton>
                        <Typography sx={{ fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap' }} variant="h6">
                            Revisão Final & Editor Visual (Word A4)
                        </Typography>
                    </Box>

                    {/* CENTRO: Data do Exame */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, background: 'rgba(255,255,255,0.12)', px: 1.5, py: 0.3, borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#fff', fontSize: '11px', whiteSpace: 'nowrap' }}>
                            Data do Exame:
                        </Typography>
                        <input 
                            type="date" 
                            value={dataExameModal} 
                            onChange={(e) => setDataExameModal(e.target.value)}
                            style={{ padding: '2px 6px', borderRadius: '4px', border: 'none', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                        />
                    </Box>

                    {/* AÇÕES DE SUPORTE */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button size="small" onClick={acaoSalvarRascunho} sx={{ color: '#fff', textTransform: 'none', fontWeight: 600, fontSize: '11px' }}>
                            <FaSave size={13} style={{ marginRight: 4 }} /> Rascunho
                        </Button>
                        <Divider orientation="vertical" flexItem sx={{ background: 'rgba(255,255,255,0.2)' }} />
                        <Button size="small" onClick={acaoImprimirApenas} sx={{ color: '#90caf9', textTransform: 'none', fontWeight: 600, fontSize: '11px' }}>
                            <FaPrint size={13} style={{ marginRight: 4 }} /> Imprimir
                        </Button>
                        <Divider orientation="vertical" flexItem sx={{ background: 'rgba(255,255,255,0.2)' }} />
                        <Button size="small" onClick={() => setMostrarFotos(!mostrarFotos)} sx={{ color: '#ffb74d', textTransform: 'none', fontWeight: 600, fontSize: '11px' }}>
                            <FaImage size={13} style={{ marginRight: 4 }} /> {mostrarFotos ? 'Esconder Fotos' : 'Ver Fotos'}
                        </Button>
                    </Stack>

                    {/* DIREITA: Botão Principal */}
                    <Button 
                        onClick={acaoFinalizar} 
                        variant="contained" 
                        size="small"
                        sx={{ 
                            background: '#2E7D32', 
                            textTransform: 'none', 
                            fontWeight: 'bold', 
                            px: 2, 
                            py: 0.6, 
                            borderRadius: '20px',
                            fontSize: '11px',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            '&:hover': { background: '#1b5e20' } 
                        }}
                    >
                        <FaShareSquare size={13} style={{ marginRight: 5 }} /> Finalizar e Assinar
                    </Button>

                </Toolbar>
            </AppBar>

            {/* ÁREA DE TRABALHO: EDITOR A4 CENTRALIZADO ESTILO WORD */}
            <Box sx={{ display: 'flex', height: 'calc(100vh - 48px)', background: '#e9ecef', overflow: 'hidden' }}>
                
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
                            menubar: 'edit view insert format table',
                            plugins: [
                                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 
                                'preview', 'anchor', 'searchreplace', 'visualblocks', 'code', 
                                'fullscreen', 'insertdatetime', 'media', 'table', 'wordcount'
                            ],
                            toolbar: 'undo redo | fontfamily fontsize | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | table | bullist numlist | code preview',
                            toolbar_sticky: true,
                            content_style: `
                                /* Desativa notificações internas */
                                .tox-notifications-container { display: none !important; }

                                /* Fundo Cinza da Área de Trabalho */
                                html { 
                                    background-color: #e9ecef !important; 
                                    padding: 0;
                                    margin: 0;
                                }
                                
                                /* Papel A4 em Branco Centralizado */
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
                                    
                                    /* Dimensões exatas de papel A4 */
                                    width: 210mm !important;
                                    min-height: 297mm !important;
                                    box-sizing: border-box !important;
                                    
                                    /* Efeito de folha de papel flutuante */
                                    margin: 25px auto !important; 
                                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18), 0 0 1px rgba(0, 0, 0, 0.2) !important;
                                    border: 1px solid #d1d5db !important;

                                    /* Recuos de margem de impressão (Cabeçalho/Rodapé) */
                                    padding-top: 5.5cm !important; 
                                    padding-bottom: 3.5cm !important; 
                                    padding-left: 2.0cm !important;
                                    padding-right: 2.0cm !important;
                                }
                                
                                /* Estilo das Tabelas de Exames */
                                table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
                                td, th { border: 1px dotted #bbb; padding: 5px 8px; text-align: left; font-size: 13px; }
                                h4 { margin-top: 16px; margin-bottom: 6px; color: #1C2E4A; border-bottom: 1px solid #ccc; padding-bottom: 3px; font-size: 14px; text-transform: uppercase; }
                                p { margin-top: 0; margin-bottom: 6px; }
                            `
                        }}
                    />
                </Box>

                {/* PAINEL LATERAL DE FOTOS */}
                {mostrarFotos && (
                    <Box sx={{ width: '330px', background: '#fff', borderLeft: '1px solid #ced4da', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ p: 2, background: '#f0f4f8', borderBottom: '1px solid #e0e6ed' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1C2E4A', mb: 1 }}>
                                Anexos ({imagens.length})
                            </Typography>
                            <Box display="flex" flexDirection="column" gap={1}>
                                <label htmlFor="modal-img-upload-v2" style={{ width: '100%' }}>
                                    <input type="file" id="modal-img-upload-v2" multiple accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                                    <Button component="span" variant="outlined" fullWidth sx={{ background: 'white', color: '#555', borderColor: '#bbb', textTransform: 'none', justifyContent: 'flex-start' }}>
                                        <FaLaptop style={{ marginRight: 8, color: '#FF9800' }} /> Do Computador
                                    </Button>
                                </label>
                                <Button onClick={onAbrirNuvem} variant="contained" fullWidth sx={{ background: '#007FFF', textTransform: 'none', justifyContent: 'flex-start' }}>
                                    <FaCloudDownloadAlt style={{ marginRight: 8 }} /> Da Nuvem
                                </Button>
                            </Box>
                        </Box>
                        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2, background: '#fafafa' }}>
                            {imagens.length === 0 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#aaa', height: '100%', opacity: 0.6 }}>
                                    <FaCamera size={40} style={{ mb: 1 }} />
                                    <Typography variant="body2">Nenhuma foto anexada.</Typography>
                                </Box>
                            )}
                            {imagens.map((img, idx) => (
                                <Box key={idx} sx={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #ddd', height: '160px' }}>
                                    <img src={img} alt={`foto-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <Tooltip title="Remover">
                                        <IconButton size="small" onClick={() => removeImage(idx)} sx={{ position: 'absolute', top: 5, right: 5, background: 'white', '&:hover':{background: '#ffebee'} }}>
                                            <FaTrash size={14} color="#d32f2f" />
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