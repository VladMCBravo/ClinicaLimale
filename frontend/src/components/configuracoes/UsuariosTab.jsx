// src/components/configuracoes/UsuariosTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Button, IconButton, Switch, FormControl, InputLabel, Select, MenuItem,
    TablePagination // <-- ADICIONADO
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import apiClient from '../../api/axiosConfig'; 
import { useSnackbar } from '../../contexts/SnackbarContext'; 
import UsuarioModal from './UsuarioModal'; 

export default function UsuariosTab() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [filtroCargo, setFiltroCargo] = useState('');

    // 👇 NOVOS ESTADOS PARA PAGINAÇÃO 👇
    const [page, setPage] = useState(0); // MUI usa base 0 para páginas
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalUsers, setTotalUsers] = useState(0);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get('/usuarios/usuarios/', {
                params: { 
                    cargo: filtroCargo,
                    // Django DRF usa base 1 para páginas, então somamos 1
                    page: page + 1, 
                    page_size: rowsPerPage 
                }
            });
            
            // Verifica se a resposta está paginada (tem o count e results) ou se é uma lista plana
            if (response.data.results) {
                setUsers(response.data.results);
                setTotalUsers(response.data.count);
            } else {
                // Fallback caso o backend ainda não esteja paginando
                setUsers(response.data);
                setTotalUsers(response.data.length);
            }
        } catch (error) { 
            showSnackbar('Erro ao carregar usuários.', 'error');
        } finally { 
            setIsLoading(false); 
        }
    }, [filtroCargo, page, rowsPerPage, showSnackbar]);

    // Quando o usuário muda de página
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    // Quando o usuário muda a quantidade de itens por página
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0); // Volta para a página 1 sempre que mudar o tamanho
    };

    // Quando mudar o filtro de cargo, devemos voltar para a página 0
    useEffect(() => {
        setPage(0);
    }, [filtroCargo]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleToggleActive = async (user) => {
        try {
            await apiClient.patch(`/usuarios/usuarios/${user.id}/`, { is_active: !user.is_active });
            showSnackbar(`Status atualizado.`, 'success');
            fetchUsers();
        } catch (error) { showSnackbar('Erro ao atualizar.', 'error'); }
    };

    const formatarCargo = (cargo) => {
        const cargos = {
            'admin': 'Administrador',
            'admin_medico': 'Médico Sócio',
            'medico': 'Médico',
            'recepcao': 'Recepção'
        };
        return cargos[cargo] || cargo;
    };

    return (
        <Box className="tasy-workspace">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <FormControl size="small" sx={{ minWidth: 200 }} className="tasy-compact-input">
                    <InputLabel>Filtrar por Cargo</InputLabel>
                    <Select value={filtroCargo} label="Filtrar por Cargo" onChange={(e) => setFiltroCargo(e.target.value)}>
                        <MenuItem value="">Todos</MenuItem>
                        <MenuItem value="admin">Administrador</MenuItem>
                        <MenuItem value="admin_medico">Médico Sócio</MenuItem> {/* <-- ADICIONADO */}
                        <MenuItem value="medico">Médico</MenuItem>
                        <MenuItem value="recepcao">Recepção</MenuItem>
                    </Select>
                </FormControl>
                <Button 
                    variant="contained" 
                    disableElevation 
                    size="small" 
                    onClick={() => { setEditingUser(null); setIsModalOpen(true); }} 
                    sx={{bgcolor: '#1c7ed6', borderRadius: 0}}
                >
                    Novo Usuário
                </Button>
            </Box>
            
            {/* Uso do flat panel ao invés do Paper com sombra */}
            <TableContainer className="tasy-flat-panel" sx={{ maxHeight: 'calc(100vh - 200px)' }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ bgcolor: '#f8f9fa', fontWeight: 'bold' }}>Nome</TableCell>
                            <TableCell sx={{ bgcolor: '#f8f9fa', fontWeight: 'bold' }}>Login</TableCell>
                            <TableCell sx={{ bgcolor: '#f8f9fa', fontWeight: 'bold' }}>Cargo</TableCell>
                            <TableCell sx={{ bgcolor: '#f8f9fa', fontWeight: 'bold' }} align="center">Status</TableCell>
                            <TableCell sx={{ bgcolor: '#f8f9fa', fontWeight: 'bold' }} align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id} hover>
                                <TableCell>{user.first_name} {user.last_name}</TableCell>
                                <TableCell>{user.username}</TableCell>
                                <TableCell sx={{ textTransform: 'capitalize' }}>{formatarCargo(user.cargo)}</TableCell>
                                <TableCell align="center">
                                    <Switch checked={user.is_active} onChange={() => handleToggleActive(user)} color="success" size="small" />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => { setEditingUser(user); setIsModalOpen(true); }} size="small" color="primary">
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            
            {/* 👇 ADICIONADO O CONTROLE DE PAGINAÇÃO AQUI 👇 */}
            <TablePagination
                component="div"
                count={totalUsers} // Total real de usuários no banco
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Usuários por página:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`}
            />
            {/* 👆 FIM DO CONTROLE DE PAGINAÇÃO 👆 */}
            <UsuarioModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={fetchUsers} usuarioParaEditar={editingUser} />
        </Box>
    );
}