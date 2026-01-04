// src/components/configuracoes/SalasTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, Button, IconButton, Dialog, DialogTitle, DialogContent, 
    DialogActions, TextField, Paper
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { agendamentoService } from '../../services/agendamentoService';

export default function SalasTab() {
    const [salas, setSalas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemParaEditar, setItemParaEditar] = useState(null);
    const [formData, setFormData] = useState({ nome: '' });

    const fetchSalas = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await agendamentoService.getSalas();
            setSalas(response.data);
        } catch (error) { showSnackbar('Erro ao carregar salas.', 'error'); } 
        finally { setIsLoading(false); }
    }, [showSnackbar]);

    useEffect(() => { fetchSalas(); }, [fetchSalas]);

    const handleSave = async () => {
        try {
            if (itemParaEditar) await agendamentoService.updateSala(itemParaEditar.id, { nome: formData.nome });
            else await agendamentoService.createSala({ nome: formData.nome });
            showSnackbar('Sala salva!', 'success');
            setIsModalOpen(false); fetchSalas();
        } catch (error) { showSnackbar('Erro ao salvar.', 'error'); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza?')) {
            try { await agendamentoService.deleteSala(id); fetchSalas(); } 
            catch { showSnackbar('Erro ao deletar.', 'error'); }
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" onClick={() => { setItemParaEditar(null); setFormData({nome:''}); setIsModalOpen(true); }} sx={{bgcolor: '#1a233b'}}>Nova Sala</Button>
            </Box>
            {isLoading ? <CircularProgress /> : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                            <TableRow><TableCell>Nome da Sala</TableCell><TableCell align="right">Ações</TableCell></TableRow>
                        </TableHead>
                        <TableBody>
                            {salas.map((item) => (
                                <TableRow key={item.id} hover>
                                    <TableCell>{item.nome}</TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => { setItemParaEditar(item); setFormData({nome: item.nome}); setIsModalOpen(true); }}><EditIcon fontSize="small"/></IconButton>
                                        <IconButton size="small" onClick={() => handleDelete(item.id)}><DeleteIcon fontSize="small" color="error"/></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>{itemParaEditar ? 'Editar Sala' : 'Nova Sala'}</DialogTitle>
                <DialogContent>
                    <TextField autoFocus margin="dense" label="Nome da Sala" fullWidth value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained">Salvar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}