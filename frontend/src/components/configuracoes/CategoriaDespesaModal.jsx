// src/components/configuracoes/CategoriaDespesaModal.jsx
import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    TextField, Button, CircularProgress, FormControl, 
    InputLabel, Select, MenuItem, Box, Chip
} from '@mui/material';
import apiClient from '../../api/axiosConfig';

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
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ fontWeight: 'bold', color: '#1a233b' }}>
                {categoriaParaEditar ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        
                        <TextField 
                            label="Nome da Categoria" 
                            fullWidth 
                            variant="outlined" 
                            size="small"
                            value={formData.nome} 
                            onChange={(e) => setFormData({...formData, nome: e.target.value})} 
                            required 
                        />

                        <TextField 
                            label="Descrição (Opcional)" 
                            fullWidth 
                            variant="outlined" 
                            size="small"
                            value={formData.descricao} 
                            onChange={(e) => setFormData({...formData, descricao: e.target.value})} 
                        />

                        <FormControl fullWidth size="small">
                            <InputLabel>Tipo Financeiro</InputLabel>
                            <Select 
                                value={formData.tipo} 
                                label="Tipo Financeiro"
                                onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                            >
                                <MenuItem value="Fixa">
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                        <span>Fixa</span>
                                        <Chip label="Estrutura" size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 'bold' }} />
                                    </Box>
                                </MenuItem>
                                <MenuItem value="Variavel">
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                        <span>Variável</span>
                                        <Chip label="Consumo" size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#fff3e0', color: '#e65100', fontWeight: 'bold' }} />
                                    </Box>
                                </MenuItem>
                            </Select>
                        </FormControl>

                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: '#fafafa' }}>
                    <Button onClick={onClose} color="inherit">Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ bgcolor: '#1a233b' }}>
                        {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Salvar'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}