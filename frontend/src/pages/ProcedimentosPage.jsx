// src/pages/ProcedimentosPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, CircularProgress, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from '../contexts/SnackbarContext';
import { faturamentoService } from '../services/faturamentoService'; // Importando o novo serviço

export default function ProcedimentosPage() {
    const [procedimentos, setProcedimentos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemParaEditar, setItemParaEditar] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Assumindo que o procedimento tem 'nome' e 'valor'
    const [formData, setFormData] = useState({ nome: '', valor: '' });

    const fetchProcedimentos = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await faturamentoService.getProcedimentos();
            setProcedimentos(response.data);
        } catch (error) {
            showSnackbar('Erro ao carregar procedimentos.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchProcedimentos();
    }, [fetchProcedimentos]);

    const handleOpenModal = (item = null) => {
    setItemParaEditar(item);
    if (item) {
        // --- MUDE AQUI ---
        setFormData({ nome: item.descricao, valor: item.valor_particular || '' });
    } else {
        setFormData({ nome: '', valor: '' });
    }
    setIsModalOpen(true);
};

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setItemParaEditar(null);
        setFormData({ nome: '', valor: '' });
    };

    const handleSave = async () => {
        if (!formData.nome.trim()) {
            showSnackbar('O nome não pode estar vazio.', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            // Confirme os nomes dos campos
            const dataToSend = {
            descricao: formData.nome, // O campo 'nome' do formulário vai para 'descricao' na API
            valor_particular: formData.valor ? parseFloat(formData.valor) : null
        };

        if (itemParaEditar) {
            await faturamentoService.updateProcedimento(itemParaEditar.id, dataToSend);
            } else {
                await faturamentoService.createProcedimento(dataToSend);
            }
            showSnackbar('Procedimento salvo com sucesso!', 'success');
            handleCloseModal();
            fetchProcedimentos();
        } catch (error) {
            showSnackbar('Erro ao salvar procedimento.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja deletar este procedimento?')) {
            try {
                await faturamentoService.deleteProcedimento(id);
                showSnackbar('Procedimento deletado com sucesso!', 'success');
                fetchProcedimentos();
            } catch (error) {
                showSnackbar('Erro ao deletar procedimento.', 'error');
            }
        }
    };

    if (isLoading) return <CircularProgress />;

    return (
        <Paper sx={{ p: 2, margin: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Gerenciamento de Procedimentos</Typography>
                <Button variant="contained" onClick={() => handleOpenModal()}>
                    Novo Procedimento
                </Button>
            </Box>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nome do Procedimento</TableCell>
                            <TableCell>Valor (Particular)</TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {procedimentos.map((item) => (
                        <TableRow key={item.id} hover>
                        {/* --- MUDE DE item.nome PARA item.descricao --- */}
                        <TableCell>{item.descricao}</TableCell>
            
                        {/* --- MUDE DE item.valor PARA item.valor_particular (ou o nome correto) --- */}
                        <TableCell>
                        {item.valor_particular ? `R$ ${parseFloat(item.valor_particular).toFixed(2)}` : 'Não definido'}
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

            <Dialog open={isModalOpen} onClose={handleCloseModal} fullWidth maxWidth="sm">
                <DialogTitle>{itemParaEditar ? 'Editar Procedimento' : 'Novo Procedimento'}</DialogTitle>
                <DialogContent>
    <TextField
        autoFocus margin="dense" 
        // --- MUDE O LABEL ---
        label="Nome do Procedimento (Descrição)" 
        type="text" fullWidth
        variant="outlined" value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        sx={{ mt: 1, mb: 2 }}
                    />
                    <TextField
                        margin="dense" label="Valor (Particular)" type="number" fullWidth
                        variant="outlined" value={formData.valor}
                        onChange={(e) => setFormData({...formData, valor: e.target.value})}
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