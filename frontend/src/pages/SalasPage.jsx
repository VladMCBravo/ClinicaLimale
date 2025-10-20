// src/pages/SalasPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, CircularProgress, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from '../contexts/SnackbarContext';
import { agendamentoService } from '../services/agendamentoService'; // Importando do serviço de agendamentos

export default function SalasPage() {
    const [salas, setSalas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemParaEditar, setItemParaEditar] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ nome: '' });

    const fetchSalas = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await agendamentosService.getSalas();
            setSalas(response.data);
        } catch (error) {
            showSnackbar('Erro ao carregar salas.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchSalas();
    }, [fetchSalas]);

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
            const dataToSend = { nome: formData.nome };

            if (itemParaEditar) {
                await agendamentosService.updateSala(itemParaEditar.id, dataToSend);
            } else {
                await agendamentosService.createSala(dataToSend);
            }
            showSnackbar('Sala salva com sucesso!', 'success');
            handleCloseModal();
            fetchSalas();
        } catch (error) {
            showSnackbar('Erro ao salvar sala.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja deletar esta sala?')) {
            try {
                await agendamentosService.deleteSala(id);
                showSnackbar('Sala deletada com sucesso!', 'success');
                fetchSalas();
            } catch (error) {
                showSnackbar('Erro ao deletar sala.', 'error');
            }
        }
    };

    if (isLoading) return <CircularProgress />;

    return (
        <Paper sx={{ p: 2, margin: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Gestão de Salas</Typography>
                <Button variant="contained" onClick={() => handleOpenModal()}>
                    Nova Sala
                </Button>
            </Box>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nome da Sala</TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {salas.map((item) => (
                            <TableRow key={item.id} hover>
                                <TableCell>{item.nome}</TableCell>
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
                <DialogTitle>{itemParaEditar ? 'Editar Sala' : 'Nova Sala'}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus margin="dense" label="Nome da Sala" type="text" fullWidth
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