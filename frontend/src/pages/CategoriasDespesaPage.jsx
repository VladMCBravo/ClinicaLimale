// src/pages/CategoriasDespesaPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Button, IconButton } from '@mui/material';
import apiClient from '../api/axiosConfig';
import { useSnackbar } from '../contexts/SnackbarContext';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CategoriaDespesaModal from '../components/configuracoes/CategoriaDespesaModal';

export default function CategoriasDespesaPage() {
    const [categorias, setCategorias] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categoriaParaEditar, setCategoriaParaEditar] = useState(null);

    const fetchCategorias = useCallback(async () => {
        try {
            const response = await apiClient.get('/faturamento/categorias-despesa/');
            setCategorias(response.data);
        } catch (error) {
            showSnackbar('Erro ao carregar categorias.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchCategorias();
    }, [fetchCategorias]);

    const handleOpenModal = (categoria = null) => {
        setCategoriaParaEditar(categoria);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCategoriaParaEditar(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja deletar esta categoria?')) {
            try {
                await apiClient.delete(`/faturamento/categorias-despesa/${id}/`);
                showSnackbar('Categoria deletada com sucesso!', 'success');
                fetchCategorias();
            } catch (error) {
                showSnackbar('Erro ao deletar categoria.', 'error');
            }
        }
    };

    if (isLoading) return <CircularProgress />;

    return (
        <Paper sx={{ p: 2, margin: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Categorias de Despesas</Typography>
                <Button variant="contained" onClick={() => handleOpenModal()}>Nova Categoria</Button>
            </Box>
            <TableContainer>
                <Table>
                    <TableHead><TableRow><TableCell>Nome</TableCell><TableCell align="right">Ações</TableCell></TableRow></TableHead>
                    <TableBody>
                        {categorias.map((cat) => (
                            <TableRow key={cat.id} hover>
                                <TableCell>{cat.nome}</TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => handleOpenModal(cat)}><EditIcon /></IconButton>
                                    <IconButton onClick={() => handleDelete(cat.id)}><DeleteIcon color="error" /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <CategoriaDespesaModal open={isModalOpen} onClose={handleCloseModal} onSave={fetchCategorias} categoriaParaEditar={categoriaParaEditar} />
        </Paper>
    );
}