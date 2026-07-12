// src/components/laudos/LaudosPreviewModalV2.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
    Dialog, AppBar, Toolbar, Typography, Button, IconButton, 
    Box, Tooltip, Divider
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
            
            <AppBar sx={{ position: 'relative', background: '#1C2E4A', boxShadow: 'none' }}>
                <Toolbar variant="dense" sx={{ minHeight: '48px', px: 2 }}>
                    <Typography sx={{ ml: 2, flex: 1, fontWeight: 'bold', fontSize: '14px' }} variant="h6">
                        Revisão Final e Assinatura Eletrônica
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.1)', px: 2, py: 0.5, borderRadius: 1, mr: 3 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#fff' }}>Data do Exame:</Typography>
                        <input 
                            type="date" value={dataExameModal} onChange={(e) => setDataExameModal(e.target.value)}
                            style={{ padding: '2px 6px', borderRadius: '4px', border: 'none', fontSize: '12px', outline: 'none' }}
                        />
                    </Box>
                    <IconButton edge="end" color="inherit" onClick={acaoSalvarRascunho}><FaTimes size={18} /></IconButton>
                </Toolbar>
            </AppBar>

            <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, background: '#f8f9fa', borderBottom: '1px solid #ced4da', gap: 2 }}>
                <Button onClick={acaoSalvarRascunho} sx={{ color: '#495057', textTransform: 'none', fontWeight: 600 }}>
                    <FaSave size={16} style={{ marginRight: 6 }} /> Salvar e Voltar
                </Button>
                <Divider orientation="vertical" flexItem />
                <Button onClick={acaoImprimirApenas} sx={{ color: '#007FFF', textTransform: 'none', fontWeight: 600 }}>
                    <FaPrint size={16} style={{ marginRight: 6 }} /> Imprimir Rascunho
                </Button>
                <Divider orientation="vertical" flexItem />
                <Button onClick={() => setMostrarFotos(!mostrarFotos)} sx={{ color: '#E65100', textTransform: 'none', fontWeight: 600 }}>
                    <FaImage size={16} style={{ marginRight: 6 }} /> {mostrarFotos ? 'Ocultar Fotos' : 'Ver Fotos'}
                </Button>
                <Box sx={{ flexGrow: 1 }} /> 
                <Button onClick={acaoFinalizar} variant="contained" sx={{ background: '#2E7D32', textTransform: 'none', fontWeight: 'bold', px: 3, py: 1, borderRadius: '30px' }}>
                    <FaShareSquare size={16} style={{ marginRight: 8 }} /> Finalizar e Gerar Acesso
                </Button>
            </Box>

            {/* ÁREA DE TRABALHO: EDITOR 100% FLUIDO */}
            <Box sx={{ display: 'flex', height: 'calc(100vh - 110px)', background: '#fff', overflow: 'hidden' }}>
                
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Editor
                        apiKey="qs3k6opqccy0770vysfyha4xffrsjf4tgxy11clmml5o8wq6"
                        onInit={(evt, editor) => editorRef.current = editor}
                        initialValue={htmlInicial}
                        init={{
                            height: '100%',
                            width: '100%',
                            resize: false,
                            menubar: 'edit view insert format table',
                            plugins: [
                                // Free plugins baseline
                                'accordion', 'advlist', 'anchor', 'autolink', 'autoresize', 'autosave',
                                'charmap', 'code', 'codesample', 'directionality', 'emoticons', 'fullscreen',
                                'help', 'image', 'importcss', 'insertdatetime', 'link', 'lists', 'media',
                                'nonbreaking', 'pagebreak', 'preview', 'quickbars', 'save', 'searchreplace',
                                'table', 'visualblocks', 'visualchars', 'wordcount',
                                // Premium plugins — selecionados para o setor Clínico/Saúde
                                'a11ychecker',       // Ensures medical reports meet accessibility standards
                                'revisionhistory',   // Audit trail of every change for clinical compliance
                                'tinymcespellchecker', // Medical spell checking for accurate terminology
                                'exportpdf',         // Generate clean PDF reports for patients and records
                                'advtable'           // Advanced grids for complex fetal biometry data
                            ],
                            toolbar: 'undo redo | fontfamily fontsize | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | advtablerownumbering table | bullist numlist | spellcheckdialog a11ycheck | exportpdf',
                            toolbar_sticky: true,
                            spellchecker_language: 'pt_BR',
                            revisionhistory_fetch: () => Promise.resolve([]), // Callback obrigatório para o histórico
                            content_style: `
                                body { 
                                    font-family: Helvetica, Arial, sans-serif; 
                                    font-size: 14px; 
                                    color: #333; 
                                    line-height: 1.5;
                                    
                                    /* 1. O TRUQUE DA MÁSCARA DE FUNDO */
                                    background-image: url('/receituario-fundo.png'); 
                                    background-size: 100% 100%; /* Estica para caber na folha A4 virtual */
                                    background-repeat: no-repeat;
                                    background-position: center top;

                                    /* 2. AS MARGENS DO SEU GERADOR DE PDF (xhtml2pdf) */
                                    /* Isso impede que o médico digite em cima do cabeçalho ou da assinatura */
                                    padding-top: 6.0cm !important; 
                                    padding-bottom: 4.0cm !important; 
                                    padding-left: 1.5cm !important;
                                    padding-right: 1.5cm !important;
                                    margin: 0; 
                                }
                                
                                /* Configuração das Tabelas V2 */
                                table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
                                td, th { border: 1px dotted #ccc; padding: 8px; text-align: left; }
                                h4 { margin-top: 20px; margin-bottom: 10px; color: #1C2E4A; border-bottom: 1px solid #ccc; padding-bottom: 4px; font-size: 16px; }
                                p { margin-top: 0; margin-bottom: 8px; }
                            `
                        }}
                    />
                </Box>

                {mostrarFotos && (
                    <Box sx={{ width: '350px', background: '#fff', borderLeft: '1px solid #ced4da', display: 'flex', flexDirection: 'column' }}>
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
                                <Box key={idx} sx={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #ddd', height: '180px' }}>
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