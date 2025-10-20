// src/pages/ConfiguracoesPage.jsx - VERSÃO REVISADA E LIMPA
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, CircularProgress, Switch, Button, IconButton 
} from '@mui/material';
import apiClient from '../api/axiosConfig';
import { useSnackbar } from '../contexts/SnackbarContext';
import UsuarioModal from '../components/configuracoes/UsuarioModal';
// import { Link as RouterLink } from 'react-router-dom'; // <-- NÃO PRECISA MAIS
import EditIcon from '@mui/icons-material/Edit';

export default function ConfiguracoesPage() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    
    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
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

    const handleOpenModal = (user = null) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

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
        // O Paper foi removido, pois o Outlet no layout já está dentro de um <Box p={3}>
        // Se preferir manter o Paper, pode deixar.
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                {/* --- TÍTULO MUDADO --- */}
                <Typography variant="h5">Gestão de Usuários</Typography>
                
                {/* --- BOTÕES DE NAVEGAÇÃO REMOVIDOS --- */}
                
                <Button variant="contained" onClick={() => handleOpenModal()}>
                    Criar Novo Usuário
                </Button>
            </Box>
            
            <Paper> {/* Adicionei o Paper aqui para conter a tabela */}
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Nome Completo</TableCell>
                                <TableCell>Usuário (Login)</TableCell>
                                <TableCell>Cargo</TableCell>
                                <TableCell align="center">Status (Ativo)</TableCell>
                                <TableCell align="right">Ações</TableCell>
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
                                    <TableCell align="right">
                                        <IconButton onClick={() => handleOpenModal(user)}>
                                            <EditIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <UsuarioModal 
                open={isModalOpen}
                onClose={handleCloseModal}
                onSave={fetchUsers}
                usuarioParaEditar={editingUser}
            />
        </>
    );
}