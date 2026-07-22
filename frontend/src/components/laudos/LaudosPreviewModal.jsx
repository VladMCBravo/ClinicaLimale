// src/components/LaudosPreviewModal.jsx
import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, Tabs, Tab, Box, Typography, IconButton, Tooltip 
} from '@mui/material';
import { 
    FaSave, FaTimes, FaCamera, FaTrash, 
    FaCloudDownloadAlt, FaLaptop 
} from 'react-icons/fa';

const LaudosPreviewModal = ({ 
    open, 
    onClose, 
    textoInicial, 
    imagensIniciais, 
    onFinalizar,
    onAbrirNuvem, // <--- NOVA PROP: Função que chama o modal da nuvem
    nomePaciente
}) => {
    const [textoEditado, setTextoEditado] = useState('');
    const [imagens, setImagens] = useState([]);
    const [tabIndex, setTabIndex] = useState(0); // 0 = Texto, 1 = Fotos
    const [dataExameModal, setDataExameModal] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (open) {
            setTextoEditado(textoInicial);
            setImagens(imagensIniciais || []);
            setTabIndex(0);
            // Reseta a data para hoje sempre que o modal abre
            setDataExameModal(new Date().toISOString().split('T')[0]); 
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
            <DialogTitle style={{ background: '#b71c1c', color: 'white', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="subtitle2" style={{ opacity: 0.8 }}>Revisão e Finalização</Typography>
                    <Typography variant="h6" style={{ fontWeight: 'bold' }}>
                        PACIENTE: {nomePaciente ? nomePaciente.toUpperCase() : 'DESCONHECIDO'}
                    </Typography>
                </Box>
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
                    <div style={{ padding: '20px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                        
                        {/* --- BARRA DE FERRAMENTAS --- */}
                        <Box style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginBottom: '20px',
                            padding: '15px',
                            background: '#f0f4f8',
                            borderRadius: '8px',
                            border: '1px solid #e0e6ed'
                        }}>
                            <Box>
                                <Typography variant="subtitle2" style={{ fontWeight: 'bold', color: '#1C2E4A' }}>
                                    Adicionar Imagens
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    Escolha a origem das fotos do exame.
                                </Typography>
                            </Box>

                            <Box display="flex" gap={2}>
                                {/* BOTÃO 1: DO COMPUTADOR */}
                                <label htmlFor="modal-img-upload">
                                    <input 
                                        type="file" 
                                        id="modal-img-upload" 
                                        multiple 
                                        accept="image/*" 
                                        onChange={handleImageUpload} 
                                        style={{ display: 'none' }} 
                                    />
                                    <Button 
                                        component="span" 
                                        variant="outlined" 
                                        style={{ 
                                            background: 'white', 
                                            color: '#555', 
                                            borderColor: '#bbb',
                                            textTransform: 'none',
                                            fontWeight: '600'
                                        }}
                                    >
                                        <FaLaptop style={{ marginRight: 8, color: '#FF9800' }} /> 
                                        Do Computador
                                    </Button>
                                </label>

                                {/* BOTÃO 2: DA NUVEM (SUPABASE) */}
                                <Button 
                                    onClick={onAbrirNuvem}
                                    variant="contained" 
                                    style={{ 
                                        background: '#007FFF', 
                                        color: '#fff',
                                        textTransform: 'none',
                                        fontWeight: '600'
                                    }}
                                >
                                    <FaCloudDownloadAlt style={{ marginRight: 8, fontSize: '1.1em' }} /> 
                                    Buscar da Nuvem
                                </Button>
                            </Box>
                        </Box>

                        {/* GRID DE PREVIEW */}
                        <div style={{ 
                            flex: 1,
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
                            gridAutoRows: '120px',
                            gap: '15px', 
                            overflowY: 'auto',
                            padding: '15px',
                            border: '2px dashed #e0e0e0',
                            borderRadius: '8px',
                            background: '#fafafa'
                        }}>
                            {imagens.length === 0 && (
                                <div style={{ 
                                    gridColumn: '1 / -1', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    color: '#aaa',
                                    height: '100%'
                                }}>
                                    <FaCamera size={40} style={{ marginBottom: 10, opacity: 0.3 }} />
                                    <Typography variant="body2">Nenhuma foto selecionada.</Typography>
                                </div>
                            )}
                            
                            {imagens.map((img, idx) => (
                                <div key={idx} style={{ 
                                    position: 'relative', 
                                    borderRadius: '8px', 
                                    overflow: 'hidden', 
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                    background: '#fff',
                                    border: '1px solid #eee'
                                }}>
                                    <img 
                                        src={img} 
                                        alt={`foto-${idx}`} 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                    
                                    {/* Overlay de Exclusão */}
                                    <div style={{ 
                                        position: 'absolute', 
                                        top: 5, 
                                        right: 5, 
                                    }}>
                                        <Tooltip title="Remover foto">
                                            <IconButton 
                                                size="small" 
                                                onClick={() => removeImage(idx)} 
                                                style={{ background: 'white', padding: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                                            >
                                                <FaTrash size={12} color="#f44336" />
                                            </IconButton>
                                        </Tooltip>
                                    </div>

                                    {/* Número da Foto */}
                                    <div style={{ 
                                        position: 'absolute', 
                                        bottom: 5, 
                                        left: 5, 
                                        background: 'rgba(0,0,0,0.6)', 
                                        color: 'white',
                                        padding: '2px 8px', 
                                        borderRadius: '10px',
                                        fontSize: '10px', 
                                        fontWeight: 'bold' 
                                    }}>
                                        #{idx + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </DialogContent>

            <DialogActions style={{ padding: '20px 24px', background: '#f5f5f5', justifyContent: 'space-between' }}>
                {/* --- LADO ESQUERDO DA BARRA INFERIOR: DATA RETROATIVA --- */}
                <Box style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Typography variant="caption" style={{ fontWeight: 'bold', color: '#555' }}>
                        Data do Exame:
                    </Typography>
                    <input 
                        type="date"
                        value={dataExameModal}
                        onChange={(e) => setDataExameModal(e.target.value)}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            fontFamily: 'inherit',
                            fontSize: '13px',
                            cursor: 'pointer',
                            outline: 'none',
                            color: '#333'
                        }}
                    />
                </Box>

                {/* --- LADO DIREITO DA BARRA INFERIOR: BOTÕES --- */}
                <Box>
                    <Button onClick={onClose} style={{ color: '#666', marginRight: '15px' }}>
                        Voltar
                    </Button>
                
                <Button 
                    onClick={() => onFinalizar(textoEditado, imagens, dataExameModal)} 
                    variant="contained" 
                    size="large"
                    style={{ 
                        background: '#2E7D32', 
                        color: 'white', 
                        fontWeight: 'bold', 
                        padding: '10px 40px', 
                        borderRadius: '30px',
                        boxShadow: '0 4px 10px rgba(46, 125, 50, 0.3)'
                    }}
                >
                    <FaSave style={{ marginRight: 10 }} /> 
                    SALVAR E FINALIZAR
                </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
};

export default LaudosPreviewModal;