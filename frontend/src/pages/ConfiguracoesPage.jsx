// src/pages/ConfiguracoesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, CircularProgress, Switch, Button 
} from '@mui/material';
import apiClient from '../api/axiosConfig';
import { useSnackbar } from '../contexts/SnackbarContext';
import UsuarioModal from '../components/configuracoes/UsuarioModal';
import { Link as RouterLink } from 'react-router-dom'; // Importe o Link

export default function ConfiguracoesPage() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await apiClient.get('/usuarios/usuarios/');
            setUsers(response.data);
        } catch (error) {
            showSnackbar('Erro ao carregar usuários.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleToggleActive = async (user) => {
        const newStatus = !user.is_active;
        try {
            await apiClient.patch(`/usuarios/usuarios/${user.id}/`, { is_active: newStatus });
            showSnackbar(`Usuário ${user.first_name} ${newStatus ? 'ativado' : 'desativado'}.`, 'success');
            fetchUsers();
        } catch (error) {
            showSnackbar('Erro ao atualizar status do usuário.', 'error');
        }
    };

    if (isLoading) return <CircularProgress />;

    return (
        <Paper sx={{ p: 2, margin: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Configurações Gerais</Typography> {/* Título ajustado para ser mais genérico */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="outlined" component={RouterLink} to="/configuracoes/categorias-despesa">
                        Categorias de Despesa
                    </Button>
                    <Button variant="outlined" component={RouterLink} to="/configuracoes/convenios">
                        Convênios
                    </Button>
                    {/* --- BOTÃO NOVO ADICIONADO AQUI --- */}
                    <Button variant="outlined" component={RouterLink} to="/configuracoes/especialidades">
                        Especialidades
                    </Button>
                    <Button variant="contained" onClick={() => setIsModalOpen(true)}>
                        Criar Novo Usuário
                    </Button>
                </Box>
            </Box>
            {/* --- CORREÇÃO: A TABELA QUE ESTAVA FALTANDO FOI ADICIONADA AQUI --- */}
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nome Completo</TableCell>
                            <TableCell>Usuário (Login)</TableCell>
                            <TableCell>Cargo</TableCell>
                            <TableCell align="center">Status (Ativo)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id} hover>
                                <TableCell>{user.first_name} {user.last_name}</TableCell>
                                <TableCell>{user.username}</TableCell>
                                <TableCell sx={{ textTransform: 'capitalize' }}>{user.cargo}</TableCell>
                                <TableCell align="center">
                                    <Switch
                                        checked={user.is_active}
                                        onChange={() => handleToggleActive(user)}
                                        color="success"
                                        title={user.is_active ? "Desativar usuário" : "Ativar usuário"}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <UsuarioModal 
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchUsers}
            />
        </Paper>
    );
}