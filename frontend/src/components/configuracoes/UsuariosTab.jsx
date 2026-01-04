// src/components/configuracoes/UsuariosTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Button, IconButton, Switch 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import apiClient from '../../api/axiosConfig'; // Ajuste o caminho
import { useSnackbar } from '../../contexts/SnackbarContext'; // Ajuste o caminho
import UsuarioModal from './UsuarioModal'; // Certifique-se que este arquivo existe nesta mesma pasta

export default function UsuariosTab() {
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
        } catch (error) { showSnackbar('Erro ao carregar usuários.', 'error'); } 
        finally { setIsLoading(false); }
    }, [showSnackbar]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleToggleActive = async (user) => {
        try {
            await apiClient.patch(`/usuarios/usuarios/${user.id}/`, { is_active: !user.is_active });
            showSnackbar(`Status atualizado.`, 'success');
            fetchUsers();
        } catch (error) { showSnackbar('Erro ao atualizar.', 'error'); }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" onClick={() => { setEditingUser(null); setIsModalOpen(true); }} sx={{bgcolor: '#1a233b'}}>
                    Novo Usuário
                </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell>Nome</TableCell>
                            <TableCell>Login</TableCell>
                            <TableCell>Cargo</TableCell>
                            <TableCell align="center">Status</TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>{user.first_name} {user.last_name}</TableCell>
                                <TableCell>{user.username}</TableCell>
                                <TableCell sx={{ textTransform: 'capitalize' }}>{user.cargo}</TableCell>
                                <TableCell align="center">
                                    <Switch checked={user.is_active} onChange={() => handleToggleActive(user)} color="success" size="small" />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => { setEditingUser(user); setIsModalOpen(true); }} size="small"><EditIcon fontSize="small" /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <UsuarioModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={fetchUsers} usuarioParaEditar={editingUser} />
        </Box>
    );
}