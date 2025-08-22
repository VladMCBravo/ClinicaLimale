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
            // Se o convênio tem planos, usa a lista de planos. Senão, começa com um plano vazio.
            setPlanos(convenioParaEditar.planos && convenioParaEditar.planos.length > 0 ? convenioParaEditar.planos : [{ nome: '', descricao: '' }]);
        } else {
            // Reseta para o estado inicial ao criar um novo
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

    // Filtra planos que tenham um nome, para não enviar planos vazios
    const planosValidos = planos.filter(p => p.nome.trim() !== '');

    // --- A MUDANÇA ESTÁ AQUI ---
    const convenioData = {
        nome,
        planos: planosValidos, // Envia a lista de planos junto
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
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{convenioParaEditar ? 'Editar Convênio' : 'Novo Convênio'}</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <TextField autoFocus label="Nome do Convênio" value={nome} onChange={(e) => setNome(e.target.value)} fullWidth required sx={{ mb: 3 }} />
                    
                    <Typography variant="subtitle1" gutterBottom>Planos</Typography>
                    {planos.map((plano, index) => (
                        <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
                            <TextField name="nome" label="Nome do Plano" value={plano.nome} onChange={e => handlePlanoChange(index, e)} fullWidth size="small" />
                            <TextField name="descricao" label="Descrição" value={plano.descricao} onChange={e => handlePlanoChange(index, e)} fullWidth size="small" />
                            <IconButton onClick={() => handleRemovePlano(index)} color="error" disabled={planos.length <= 1}>
                                <RemoveCircleOutlineIcon />
                            </IconButton>
                        </Box>
                    ))}
                    <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAddPlano} size="small">
                        Adicionar Plano
                    </Button>
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