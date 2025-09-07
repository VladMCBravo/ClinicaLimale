// src/pages/EspecialidadesPage.jsx - VERSÃO FINAL COM VALOR

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, CircularProgress, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from '../contexts/SnackbarContext';
import { configuracoesService } from '../services/configuracoesService';

export default function EspecialidadesPage() {
    const [especialidades, setEspecialidades] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();

    // Estados para o Modal de edição/criação
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemParaEditar, setItemParaEditar] = useState(null);
    const [nomeEspecialidade, setNomeEspecialidade] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ nome: '', valor_consulta: '' });

    const fetchEspecialidades = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await configuracoesService.getEspecialidades();
            setEspecialidades(response.data);
        } catch (error) {
            showSnackbar('Erro ao carregar especialidades.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchEspecialidades();
    }, [fetchEspecialidades]);

    // Funções para o Modal
    const handleOpenModal = (item = null) => {
        setItemParaEditar(item);
        // --- PREENCHE O NOVO ESTADO ---
        if (item) {
            setFormData({ nome: item.nome, valor_consulta: item.valor_consulta || '' });
        } else {
            setFormData({ nome: '', valor_consulta: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setItemParaEditar(null);
        setFormData({ nome: '', valor_consulta: '' }); // Limpa o formulário
    };

    const handleSave = async () => {
        if (!formData.nome.trim()) {
            showSnackbar('O nome não pode estar vazio.', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            // Prepara os dados para enviar, garantindo que o valor seja um número ou nulo
            const dataToSend = {
                nome: formData.nome,
                valor_consulta: formData.valor_consulta ? parseFloat(formData.valor_consulta) : null
            };

            if (itemParaEditar) {
                await configuracoesService.updateEspecialidade(itemParaEditar.id, dataToSend);
            } else {
                await configuracoesService.createEspecialidade(dataToSend);
            }
            showSnackbar('Especialidade salva com sucesso!', 'success');
            handleCloseModal();
            fetchEspecialidades();
        } catch (error) {
            showSnackbar('Erro ao salvar especialidade.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja deletar esta especialidade?')) {
            try {
                await configuracoesService.deleteEspecialidade(id);
                showSnackbar('Especialidade deletada com sucesso!', 'success');
                fetchEspecialidades(); // Recarrega a lista
            } catch (error) {
                showSnackbar('Erro ao deletar especialidade.', 'error');
            }
        }
    };

    if (isLoading) return <CircularProgress />;

    return (
        <Paper sx={{ p: 2, margin: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Gerenciamento de Especialidades</Typography>
                <Button variant="contained" onClick={() => handleOpenModal()}>
                    Nova Especialidade
                </Button>
            </Box>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nome da Especialidade</TableCell>
                            <TableCell>Valor da Consulta (Particular)</TableCell> {/* <-- NOVA COLUNA */}
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {especialidades.map((item) => (
                            <TableRow key={item.id} hover>
                                <TableCell>{item.nome}</TableCell>
                                <TableCell> {/* <-- NOVA CÉLULA */}
                                    {item.valor_consulta ? `R$ ${parseFloat(item.valor_consulta).toFixed(2)}` : 'Não definido'}
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => handleOpenModal(item)}><EditIcon /></IconButton>
                                    <IconButton onClick={() => handleDelete(item.id)}><DeleteIcon color="error" /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={isModalOpen} onClose={handleCloseModal}>
                <DialogTitle>{itemParaEditar ? 'Editar Especialidade' : 'Nova Especialidade'}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus margin="dense" label="Nome da Especialidade" type="text" fullWidth
                        variant="outlined" value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        sx={{ mb: 2 }}
                    />
                    {/* --- CAMPO DE VALOR ADICIONADO --- */}
                    <TextField
                        margin="dense" label="Valor da Consulta Particular" type="number" fullWidth
                        variant="outlined" value={formData.valor_consulta}
                        onChange={(e) => setFormData({...formData, valor_consulta: e.target.value})}
                        InputProps={{
                            startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                        }}
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