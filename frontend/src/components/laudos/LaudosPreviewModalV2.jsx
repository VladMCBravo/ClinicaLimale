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
            
            {/* CABEÇALHO EM UMA ÚNICA LINHA LIMPA */}
            <AppBar sx={{ position: 'relative', background: '#1C2E4A', boxShadow: 'none' }}>
                <Toolbar variant="dense" sx={{ minHeight: '50px', px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    
                    {/* LADO ESQUERDO: Fechar + Título */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton edge="start" color="inherit" onClick={acaoSalvarRascunho} title="Salvar Rascunho e Fechar">
                            <FaTimes size={18} />
                        </IconButton>
                        <Typography sx={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap' }} variant="h6">
                            Revisão Final & Editor Visual
                        </Typography>
                    </Box>

                    {/* CENTRO-ESQUERDA: Data do Exame */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, background: 'rgba(255,255,255,0.12)', px: 1.5, py: 0.4, borderRadius: 1 }}>
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

                    {/* CENTRO-DIREITA: Ações Secundárias */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button size="small" onClick={acaoSalvarRascunho} sx={{ color: '#fff', textTransform: 'none', fontWeight: 600, fontSize: '12px' }}>
                            <FaSave size={14} style={{ marginRight: 5 }} /> Salvar Rascunho
                        </Button>
                        <Divider orientation="vertical" flexItem sx={{ background: 'rgba(255,255,255,0.2)' }} />
                        <Button size="small" onClick={acaoImprimirApenas} sx={{ color: '#90caf9', textTransform: 'none', fontWeight: 600, fontSize: '12px' }}>
                            <FaPrint size={14} style={{ marginRight: 5 }} /> Imprimir
                        </Button>
                        <Divider orientation="vertical" flexItem sx={{ background: 'rgba(255,255,255,0.2)' }} />
                        <Button size="small" onClick={() => setMostrarFotos(!mostrarFotos)} sx={{ color: '#ffb74d', textTransform: 'none', fontWeight: 600, fontSize: '12px' }}>
                            <FaImage size={14} style={{ marginRight: 5 }} /> {mostrarFotos ? 'Ocultar Fotos' : 'Ver Fotos'}
                        </Button>
                    </Stack>

                    {/* LADO DIREITO: Botão Principal de Finalização */}
                    <Button 
                        onClick={acaoFinalizar} 
                        variant="contained" 
                        size="small"
                        sx={{ 
                            background: '#2E7D32', 
                            textTransform: 'none', 
                            fontWeight: 'bold', 
                            px: 2.5, 
                            py: 0.8, 
                            borderRadius: '20px',
                            fontSize: '12px',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            '&:hover': { background: '#1b5e20' } 
                        }}
                    >
                        <FaShareSquare size={14} style={{ marginRight: 6 }} /> Finalizar e Gerar Acesso
                    </Button>

                </Toolbar>
            </AppBar>

            {/* ÁREA DE TRABALHO: EDITOR 100% FLUIDO */}
            <Box sx={{ display: 'flex', height: 'calc(100vh - 50px)', background: '#fff', overflow: 'hidden' }}>
                
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Editor
                        apiKey="qs3k6opqccy0770vysfyha4xffrsjf4tgxy11clmml5o8wq6"
                        onInit={(evt, editor) => editorRef.current = editor}
                        initialValue={htmlInicial}
                        init={{
                            height: '100%',
                            width: '100%',
                            resize: false,
                            branding: false,      // REMOVE O LOGO "POWERED BY TINYMCE"
                            promotion: false,     // REMOVE AVISOS DE UPGRADE E BANNERS
                            elementpath: false,   // LIMPA A BARRA INFERIOR DE ELEMENTOS HTML
                            browser_spellcheck: true, // CORRETOR ORTOGRÁFICO NATIVO DO NAVEGADOR
                            menubar: 'edit view insert format table',
                            plugins: [
                                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 
                                'preview', 'anchor', 'searchreplace', 'visualblocks', 'code', 
                                'fullscreen', 'insertdatetime', 'media', 'table', 'wordcount'
                            ],
                            toolbar: 'undo redo | fontfamily fontsize | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | table | bullist numlist | code preview',
                            toolbar_sticky: true,
                            content_style: `
                                /* 1. O fundo do editor (A "mesa" cinza) */
                                html { 
                                    background: #e9ecef; 
                                }
                                
                                /* 2. A folha de papel A4 */
                                body { 
                                    font-family: Helvetica, Arial, sans-serif; 
                                    font-size: 14px; 
                                    color: #333; 
                                    line-height: 1.5;
                                    
                                    /* Visual do Papel Timbrado */
                                    background-color: #ffffff;
                                    background-image: url('/Receituario_v2.jpg'); 
                                    background-size: 100% 100%;
                                    background-repeat: no-repeat;
                                    background-position: center top;
                                    
                                    /* Trava no tamanho EXATO de uma folha A4 */
                                    width: 210mm !important;
                                    min-height: 297mm !important;
                                    box-sizing: border-box;
                                    
                                    /* Centraliza a folha na tela */
                                    margin: 20px auto !important; 
                                    box-shadow: 0 4px 15px rgba(0,0,0,0.15);

                                    /* Áreas de bloqueio (Cabeçalho e Rodapé) */
                                    padding-top: 6.0cm !important; 
                                    padding-bottom: 4.0cm !important; 
                                    padding-left: 1.5cm !important;
                                    padding-right: 1.5cm !important;
                                }
                                
                                /* 3. Formatação das Tabelas e Títulos */
                                table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
                                td, th { border: 1px dotted #ccc; padding: 6px 8px; text-align: left; }
                                h4 { margin-top: 15px; margin-bottom: 8px; color: #1C2E4A; border-bottom: 1px solid #ccc; padding-bottom: 4px; font-size: 15px; }
                                p { margin-top: 0; margin-bottom: 6px; }
                            `
                        }}
                    />
                </Box>

                {/* PAINEL LATERAL DE FOTOS */}
                {mostrarFotos && (
                    <Box sx={{ width: '340px', background: '#fff', borderLeft: '1px solid #ced4da', display: 'flex', flexDirection: 'column' }}>
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
                                <Box key={idx} sx={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #ddd', height: '170px' }}>
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