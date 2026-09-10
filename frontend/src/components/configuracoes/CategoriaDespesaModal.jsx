// src/components/configuracoes/CategoriaDespesaModal.jsx
import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    TextField, Button, CircularProgress, FormControl, 
    InputLabel, Select, MenuItem, Box, Chip
} from '@mui/material';
import apiClient from '../../api/axiosConfig';

import '../../atendimento.css';

export default function CategoriaDespesaModal({ open, onClose, onSave, categoriaParaEditar }) {
    const [formData, setFormData] = useState({
        nome: '',
        descricao: '',
        tipo: 'Variavel' // Padrão
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (categoriaParaEditar) {
            setFormData({
                nome: categoriaParaEditar.nome || '',
                descricao: categoriaParaEditar.descricao || '',
                tipo: categoriaParaEditar.tipo || 'Variavel'
            });
        } else {
            setFormData({ nome: '', descricao: '', tipo: 'Variavel' });
        }
    }, [categoriaParaEditar, open]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (categoriaParaEditar) {
                await apiClient.put(`/faturamento/categorias-despesa/${categoriaParaEditar.id}/`, formData);
            } else {
                await apiClient.post('/faturamento/categorias-despesa/', formData);
            }
            onSave();
            onClose();
        } catch (error) {
            console.error("Erro ao salvar categoria:", error.response?.data);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            fullWidth 
            maxWidth="xs"
            PaperProps={{ className: 'tasy-flat-panel' }} // Remove bordas e shadows nativas do MUI
        >
            <DialogTitle sx={{ fontWeight: 'bold', color: '#495057', fontSize: '13px', textTransform: 'uppercase', borderBottom: '1px solid #e9ecef', bgcolor: '#f8f9fa', py: 1.5 }}>
                {categoriaParaEditar ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                        
                        <TextField 
                            className="tasy-compact-input"
                            label="Nome da Categoria" 
                            fullWidth 
                            value={formData.nome} 
                            onChange={(e) => setFormData({...formData, nome: e.target.value})} 
                            required 
                        />

                        <TextField 
                            className="tasy-compact-input"
                            label="Descrição (Opcional)" 
                            fullWidth 
                            value={formData.descricao} 
                            onChange={(e) => setFormData({...formData, descricao: e.target.value})} 
                        />

                        <FormControl fullWidth className="tasy-compact-input">
                            <InputLabel>Tipo Financeiro</InputLabel>
                            <Select 
                                value={formData.tipo} 
                                label="Tipo Financeiro"
                                onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                            >
                                <MenuItem value="Fixa">
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px' }}>Fixa</span>
                                        <Chip label="Estrutura" size="small" sx={{ height: 18, fontSize: '10px', bgcolor: '#e7f5ff', color: '#1c7ed6', fontWeight: 'bold', borderRadius: '4px' }} />
                                    </Box>
                                </MenuItem>
                                <MenuItem value="Variavel">
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px' }}>Variável</span>
                                        <Chip label="Consumo" size="small" sx={{ height: 18, fontSize: '10px', bgcolor: '#fff4e6', color: '#e8590c', fontWeight: 'bold', borderRadius: '4px' }} />
                                    </Box>
                                </MenuItem>
                            </Select>
                        </FormControl>

                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 1.5, borderTop: '1px solid #e9ecef', bgcolor: '#f8f9fa' }}>
                    <Button onClick={onClose} sx={{ color: '#868e96', fontSize: '12px', fontWeight: 600 }}>Cancelar</Button>
                    <Button type="submit" variant="contained" disableElevation disabled={isSubmitting} sx={{ bgcolor: '#1c7ed6', fontSize: '12px', fontWeight: 600 }}>
                        {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Salvar Categoria'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}