// src/components/configuracoes/CategoriaDespesaModal.jsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, CircularProgress } from '@mui/material';
import apiClient from '../../api/axiosConfig';

export default function CategoriaDespesaModal({ open, onClose, onSave, categoriaParaEditar }) {
    const [nome, setNome] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (categoriaParaEditar) {
            setNome(categoriaParaEditar.nome);
        } else {
            setNome('');
        }
    }, [categoriaParaEditar, open]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const data = { nome };
        try {
            if (categoriaParaEditar) {
                await apiClient.put(`/faturamento/categorias-despesa/${categoriaParaEditar.id}/`, data);
            } else {
                await apiClient.post('/faturamento/categorias-despesa/', data);
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
            <DialogTitle>{categoriaParaEditar ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <TextField autoFocus margin="dense" label="Nome da Categoria" type="text" fullWidth variant="outlined" value={nome} onChange={(e) => setNome(e.target.value)} required />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Salvar'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}