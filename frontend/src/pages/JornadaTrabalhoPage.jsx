// src/pages/JornadaTrabalhoPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, CircularProgress, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from '../contexts/SnackbarContext';
import { configuracoesService } from '../services/configuracoesService'; // Importando do serviço atualizado

export default function JornadaTrabalhoPage() {
    const [jornadas, setJornadas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemParaEditar, setItemParaEditar] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ nome: '' });

    const fetchJornadas = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await configuracoesService.getJornadas();
            setJornadas(response.data);
        } catch (error) {
            showSnackbar('Erro ao carregar jornadas de trabalho.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchJornadas();
    }, [fetchJornadas]);

    const handleOpenModal = (item = null) => {
        setItemParaEditar(item);
        if (item) {
            // Assumindo que o campo se chama 'nome'
            setFormData({ nome: item.nome });
        } else {
            setFormData({ nome: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setItemParaEditar(null);
        setFormData({ nome: '' });
    };

    const handleSave = async () => {
        if (!formData.nome.trim()) {
            showSnackbar('O nome não pode estar vazio.', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            // Assumindo que a API espera um objeto { nome: '...' }
            const dataToSend = { nome: formData.nome };

            if (itemParaEditar) {
                await configuracoesService.updateJornada(itemParaEditar.id, dataToSend);
            } else {
                await configuracoesService.createJornada(dataToSend);
            }
            showSnackbar('Jornada salva com sucesso!', 'success');
            handleCloseModal();
            fetchJornadas();
        } catch (error) {
            showSnackbar('Erro ao salvar jornada.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja deletar esta jornada?')) {
            try {
                await configuracoesService.deleteJornada(id);
                showSnackbar('Jornada deletada com sucesso!', 'success');
                fetchJornadas();
            } catch (error) {
                showSnackbar('Erro ao deletar jornada.', 'error');
            }
        }
    };

    if (isLoading) return <CircularProgress />;

    return (
        <Paper sx={{ p: 2, margin: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Jornadas de Trabalho</Typography>
                <Button variant="contained" onClick={() => handleOpenModal()}>
                    Nova Jornada
                </Button>
            </Box>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nome da Jornada</TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {jornadas.map((item) => (
                            <TableRow key={item.id} hover>
                                <TableCell>{item.nome}</TableCell> {/* Confirme se o campo é 'item.nome' */}
                                <TableCell align="right">
                                    <IconButton onClick={() => handleOpenModal(item)}><EditIcon /></IconButton>
                                    <IconButton onClick={() => handleDelete(item.id)}><DeleteIcon color="error" /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={isModalOpen} onClose={handleCloseModal} fullWidth maxWidth="sm">
                <DialogTitle>{itemParaEditar ? 'Editar Jornada' : 'Nova Jornada'}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus margin="dense" label="Nome da Jornada" type="text" fullWidth
                        variant="outlined" value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Salvar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}