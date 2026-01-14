// src/components/LaudosPreviewModal.jsx
import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, Tabs, Tab, Box, Typography, Grid, IconButton 
} from '@mui/material';
import { FaSave, FaTimes, FaCamera, FaTrash } from 'react-icons/fa';

const LaudosPreviewModal = ({ 
    open, 
    onClose, 
    textoInicial, 
    imagensIniciais, 
    onFinalizar // A função unificada que vamos criar no pai
}) => {
    const [textoEditado, setTextoEditado] = useState('');
    const [imagens, setImagens] = useState([]);
    const [tabIndex, setTabIndex] = useState(0); // 0 = Texto, 1 = Fotos

    useEffect(() => {
        if (open) {
            setTextoEditado(textoInicial);
            setImagens(imagensIniciais || []);
            setTabIndex(0);
        }
    }, [open, textoInicial, imagensIniciais]);

    // Função interna de upload
    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        const promises = files.map(file => new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
        }));

        Promise.all(promises).then(base64List => {
            setImagens(prev => [...prev, ...base64List]);
        });
    };

    const removeImage = (index) => {
        setImagens(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            {/* CABEÇALHO */}
            <DialogTitle style={{ background: '#1C2E4A', color: 'white', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Revisão e Finalização</Typography>
                <FaTimes onClick={onClose} style={{ cursor: 'pointer' }} />
            </DialogTitle>

            {/* ABAS DE NAVEGAÇÃO */}
            <Box style={{ borderBottom: '1px solid #ddd', background: '#f5f5f5' }}>
                <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} indicatorColor="primary" textColor="primary">
                    <Tab label="1. Revisão do Texto" />
                    <Tab label={`2. Anexar Fotos (${imagens.length})`} />
                </Tabs>
            </Box>
            
            <DialogContent style={{ padding: 0, height: '65vh', background: '#fff' }}>
                
                {/* ABA 1: EDITOR DE TEXTO */}
                {tabIndex === 0 && (
                    <div style={{ height: '100%', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="caption" color="textSecondary" style={{ marginBottom: 5 }}>
                            * Edite o texto livremente abaixo. O que estiver aqui sairá no PDF.
                        </Typography>
                        <textarea
                            value={textoEditado}
                            onChange={(e) => setTextoEditado(e.target.value)}
                            style={{
                                flex: 1,
                                width: '100%',
                                fontFamily: '"Courier New", Courier, monospace',
                                fontSize: '14px',
                                padding: '15px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                resize: 'none',
                                outline: 'none',
                                lineHeight: '1.5',
                                boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.05)'
                            }}
                        />
                    </div>
                )}

                {/* ABA 2: GERENCIADOR DE FOTOS */}
                {tabIndex === 1 && (
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                            <Typography variant="body2" color="textSecondary">
                                O sistema organizará 6 fotos por página automaticamente.
                            </Typography>
                            
                            {/* BOTÃO UPLOAD */}
                            <label htmlFor="modal-img-upload">
                                <input 
                                    type="file" 
                                    id="modal-img-upload" 
                                    multiple 
                                    accept="image/*" 
                                    onChange={handleImageUpload} 
                                    style={{ display: 'none' }} 
                                />
                                <Button component="span" variant="contained" style={{ background: '#FF9800', color: '#fff', gap: 5 }}>
                                    <FaCamera /> Adicionar Fotos
                                </Button>
                            </label>
                        </div>

                        {/* GRID DE PREVIEW */}
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                            gap: '10px', 
                            maxHeight: '50vh', 
                            overflowY: 'auto',
                            padding: '10px',
                            background: '#f9f9f9',
                            border: '1px dashed #ccc',
                            borderRadius: '4px'
                        }}>
                            {imagens.length === 0 && (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#aaa' }}>
                                    Nenhuma foto anexada ainda.
                                </div>
                            )}
                            {imagens.map((img, idx) => (
                                <div key={idx} style={{ position: 'relative', aspectRatio: '4/3', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden', background: '#fff' }}>
                                    <img src={img} alt={`foto-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', padding: '2px' }}>
                                        <IconButton size="small" onClick={() => removeImage(idx)} style={{ color: 'white' }}>
                                            <FaTrash size={14} />
                                        </IconButton>
                                    </div>
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, background: 'rgba(255,255,255,0.8)', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold' }}>
                                        {idx + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </DialogContent>

            <DialogActions style={{ padding: '15px 20px', background: '#eee', justifyContent: 'space-between' }}>
                <Button onClick={onClose} color="inherit">
                    Voltar / Cancelar
                </Button>
                
                <Button 
                    onClick={() => onFinalizar(textoEditado, imagens)} 
                    variant="contained" 
                    size="large"
                    style={{ background: '#2E7D32', color: 'white', fontWeight: 'bold', padding: '10px 30px', gap: '10px' }}
                >
                    <FaSave size={18}/> SALVAR, IMPRIMIR E ENVIAR
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default LaudosPreviewModal;