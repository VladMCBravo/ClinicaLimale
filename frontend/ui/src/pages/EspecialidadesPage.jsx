// src/pages/EspecialidadesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, CircularProgress, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from '../contexts/SnackbarContext';
import { configuracoesService } from '../services/configuracoesService'; // Nosso novo serviço!

export default function EspecialidadesPage() {
    const [especialidades, setEspecialidades] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();

    // Estados para o Modal de edição/criação
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemParaEditar, setItemParaEditar] = useState(null);
    const [nomeEspecialidade, setNomeEspecialidade] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        setNomeEspecialidade(item ? item.nome : '');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setItemParaEditar(null);
        setNomeEspecialidade('');
    };

    const handleSave = async () => {
        if (!nomeEspecialidade.trim()) {
            showSnackbar('O nome não pode estar vazio.', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            if (itemParaEditar) {
                await configuracoesService.updateEspecialidade(itemParaEditar.id, { nome: nomeEspecialidade });
            } else {
                await configuracoesService.createEspecialidade({ nome: nomeEspecialidade });
            }
            showSnackbar('Especialidade salva com sucesso!', 'success');
            handleCloseModal();
            fetchEspecialidades(); // Recarrega a lista
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
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {especialidades.map((item) => (
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

            {/* Modal para Adicionar/Editar */}
            <Dialog open={isModalOpen} onClose={handleCloseModal}>
                <DialogTitle>{itemParaEditar ? 'Editar Especialidade' : 'Nova Especialidade'}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Nome da Especialidade"
                        type="text"
                        fullWidth
                        variant="standard"
                        value={nomeEspecialidade}
                        onChange={(e) => setNomeEspecialidade(e.target.value)}
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