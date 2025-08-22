// src/components/configuracoes/ConvenioModal.jsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, CircularProgress, Box, IconButton, Typography } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function ConvenioModal({ open, onClose, onSave, convenioParaEditar }) {
    const { showSnackbar } = useSnackbar();
    const [nome, setNome] = useState('');
    const [planos, setPlanos] = useState([{ nome: '', descricao: '' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (convenioParaEditar) {
            setNome(convenioParaEditar.nome);
            setPlanos(convenioParaEditar.planos.length > 0 ? convenioParaEditar.planos : [{ nome: '', descricao: '' }]);
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

    const handleAddPlano = () => setPlanos([...planos, { nome: '', descricao: '' }]);
    const handleRemovePlano = (index) => setPlanos(planos.filter((_, i) => i !== index));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Lógica de salvar convênio e depois seus planos...
        // Por simplicidade, vamos focar em criar/editar o nome do convênio por enquanto.
        // A gestão de planos pode ser feita em um segundo momento.
        const data = { nome };
        try {
            if (convenioParaEditar) {
                await apiClient.put(`/faturamento/convenios/${convenioParaEditar.id}/`, data);
            } else {
                await apiClient.post('/faturamento/convenios/', data);
            }
            showSnackbar('Convênio salvo com sucesso!', 'success');
            onSave();
            onClose();
        } catch (error) {
            showSnackbar('Erro ao salvar convênio.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{convenioParaEditar ? 'Editar Convênio' : 'Novo Convênio'}</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <TextField autoFocus label="Nome do Convênio" value={nome} onChange={(e) => setNome(e.target.value)} fullWidth required />
                    {/* A gestão de planos pode ser adicionada aqui no futuro */}
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