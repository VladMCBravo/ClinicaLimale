// src/pages/CategoriasDespesaPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, CircularProgress, 
    Button, IconButton, Chip 
} from '@mui/material';
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
        setIsLoading(true);
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
                <Typography variant="h5" sx={{color: '#1a233b', fontWeight: 'bold'}}>Categorias de Despesas</Typography>
                <Button 
                    variant="contained" 
                    onClick={() => handleOpenModal()}
                    sx={{ bgcolor: '#1a233b' }}
                >
                    Nova Categoria
                </Button>
            </Box>
            <TableContainer>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Nome</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Descrição</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Tipo Financeiro</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {categorias.map((cat) => (
                            <TableRow key={cat.id} hover>
                                <TableCell sx={{ fontWeight: 500 }}>{cat.nome}</TableCell>
                                <TableCell sx={{ color: '#666', fontSize: '0.9rem' }}>
                                    {cat.descricao || '-'}
                                </TableCell>
                                <TableCell align="center">
                                    <Chip 
                                        label={cat.tipo === 'Fixa' ? 'FIXA (Estrutura)' : 'VARIÁVEL (Consumo)'} 
                                        size="small"
                                        sx={{ 
                                            bgcolor: cat.tipo === 'Fixa' ? '#e3f2fd' : '#fff3e0',
                                            color: cat.tipo === 'Fixa' ? '#1565c0' : '#e65100',
                                            fontWeight: 'bold', 
                                            fontSize: '0.75rem',
                                            height: 24
                                        }}
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => handleOpenModal(cat)} color="primary">
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton onClick={() => handleDelete(cat.id)} color="error">
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            
            {/* O Modal já foi atualizado no passo anterior para aceitar o campo 'tipo' */}
            <CategoriaDespesaModal 
                open={isModalOpen} 
                onClose={handleCloseModal} 
                onSave={fetchCategorias} 
                categoriaParaEditar={categoriaParaEditar} 
            />
        </Paper>
    );
}