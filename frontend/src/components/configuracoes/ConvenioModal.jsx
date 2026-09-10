// src/components/configuracoes/ConvenioModal.jsx
import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
    Button, CircularProgress, Box, IconButton, Typography 
} from '@mui/material';
import { 
    AddCircleOutline as AddCircleOutlineIcon, 
    RemoveCircleOutline as RemoveCircleOutlineIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

import '../../atendimento.css';

export default function ConvenioModal({ open, onClose, onSave, convenioParaEditar }) {
    const { showSnackbar } = useSnackbar();
    const [nome, setNome] = useState('');
    const [planos, setPlanos] = useState([{ nome: '', descricao: '' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (convenioParaEditar) {
            setNome(convenioParaEditar.nome);
            setPlanos(convenioParaEditar.planos && convenioParaEditar.planos.length > 0 ? convenioParaEditar.planos : [{ nome: '', descricao: '' }]);
        } else {
            setNome('');
            setPlanos([{ nome: '', descricao: '' }]);
        }
    }, [convenioParaEditar, open]);

    const handlePlanoChange = (index, event) => {
        const newPlanos = [...planos];
        newPlanos[index][event.target.name] = event.target.value;
        setPlanos(newPlanos);
    };

    const handleAddPlano = () => {
        setPlanos([...planos, { nome: '', descricao: '' }]);
    };

    const handleRemovePlano = (index) => {
        if (planos.length > 1) {
            setPlanos(planos.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const planosValidos = planos.filter(p => p.nome.trim() !== '');

        const convenioData = {
            nome,
            planos: planosValidos, 
        };

        try {
            if (convenioParaEditar) {
                await apiClient.put(`/faturamento/convenios/${convenioParaEditar.id}/`, convenioData);
            } else {
                await apiClient.post('/faturamento/convenios/', convenioData);
            }

            showSnackbar('Convênio e planos salvos com sucesso!', 'success');
            onSave();
            onClose();
        } catch (error) {
            console.error("Erro ao salvar convênio:", error.response?.data);
            const errorMessage = error.response?.data?.nome?.[0] || 'Erro ao salvar convênio.';
            showSnackbar(errorMessage, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            fullWidth 
            maxWidth="sm" 
            disableEscapeKeyDown={isSubmitting}
            PaperProps={{ className: 'tasy-flat-panel' }}
        >
            <DialogTitle sx={{ p: 0, bgcolor: '#f8f9fa', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#495057', textTransform: 'uppercase' }}>
                        {convenioParaEditar ? 'Editar Convênio' : 'Novo Convênio'}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} disabled={isSubmitting} sx={{ mr: 1, color: '#868e96' }}><CloseIcon fontSize="small" /></IconButton>
            </DialogTitle>

            <form onSubmit={handleSubmit} className="tasy-workspace">
                <DialogContent sx={{ mt: 0, bgcolor: '#f4f6f8', p: 3 }}>
                    
                    {/* Bloco de Nome do Convênio */}
                    <div className="tasy-panel theme-blue">
                        <div className="tasy-panel-body">
                            <div className="tasy-section-header">Dados do Convênio</div>
                            <TextField 
                                autoFocus 
                                label="Nome do Convênio (Ex: Unimed)" 
                                value={nome} 
                                onChange={(e) => setNome(e.target.value)} 
                                fullWidth 
                                required 
                                className="tasy-compact-input" 
                                size="small"
                                sx={{ mb: 1 }} 
                            />
                        </div>
                    </div>

                    {/* Bloco de Planos */}
                    <div className="tasy-panel theme-blue">
                        <div className="tasy-panel-body">
                            <div className="tasy-section-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Planos Vinculados</span>
                                <span style={{ fontSize: '10px', fontWeight: 'normal', textTransform: 'none', color: '#868e96' }}>Adicione os planos oferecidos.</span>
                            </div>
                            
                            {planos.map((plano, index) => (
                                <Box key={index} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1.5, p: 1.5, bgcolor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 1 }}>
                                    <TextField 
                                        name="nome" 
                                        label="Nome do Plano (Ex: Unipart)" 
                                        value={plano.nome} 
                                        onChange={e => handlePlanoChange(index, e)} 
                                        fullWidth 
                                        size="small" 
                                        className="tasy-compact-input" 
                                        required 
                                    />
                                    <TextField 
                                        name="descricao" 
                                        label="Descrição / Detalhes" 
                                        value={plano.descricao} 
                                        onChange={e => handlePlanoChange(index, e)} 
                                        fullWidth 
                                        size="small" 
                                        className="tasy-compact-input" 
                                    />
                                    <IconButton 
                                        onClick={() => handleRemovePlano(index)} 
                                        color="error" 
                                        disabled={planos.length <= 1} 
                                        size="small" 
                                        sx={{ p: 0.5, opacity: planos.length <= 1 ? 0.3 : 1 }}
                                    >
                                        <RemoveCircleOutlineIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            ))}
                            
                            <Button 
                                startIcon={<AddCircleOutlineIcon fontSize="small" />} 
                                onClick={handleAddPlano} 
                                size="small" 
                                variant="outlined" 
                                disableElevation 
                                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '12px', color: '#1c7ed6', borderColor: '#1c7ed6', borderRadius: '4px', mt: 1 }}
                            >
                                Adicionar Outro Plano
                            </Button>
                        </div>
                    </div>

                </DialogContent>
                
                <DialogActions sx={{ p: 1.5, borderTop: '1px solid #e9ecef', bgcolor: '#f8f9fa' }}>
                    <Button onClick={onClose} disabled={isSubmitting} sx={{ color: '#868e96', fontSize: '12px', fontWeight: 600 }}>Cancelar</Button>
                    <Button type="submit" variant="contained" disableElevation disabled={isSubmitting} sx={{ bgcolor: '#1c7ed6', fontSize: '12px', fontWeight: 600, px: 3 }}>
                        {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Salvar Convênio'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}