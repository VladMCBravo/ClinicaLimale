// src/components/configuracoes/UsuariosTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Button, IconButton, Switch, FormControl, InputLabel, Select, MenuItem,
    TablePagination, Typography, TableSortLabel
} from '@mui/material';
import { Edit, Add } from '@mui/icons-material';
import apiClient from '../../api/axiosConfig'; 
import { useSnackbar } from '../../contexts/SnackbarContext'; 
import UsuarioModal from './UsuarioModal'; 

import '../../atendimento.css'; 

export default function UsuariosTab() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    
    // Filtros e Ordenação
    const [filtroCargo, setFiltroCargo] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('ativos'); // Padrão: mostra só ativos
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('first_name');

    // Paginação
    const [page, setPage] = useState(0); 
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalUsers, setTotalUsers] = useState(0);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get('/usuarios/usuarios/', {
                params: { 
                    cargo: filtroCargo,
                    status: filtroStatus, // Envia o status para a API
                    ordering: order === 'desc' ? `-${orderBy}` : orderBy, // Envia a ordenação
                    page: page + 1, 
                    page_size: rowsPerPage 
                }
            });
            
            if (response.data.results) {
                setUsers(response.data.results);
                setTotalUsers(response.data.count);
            } else {
                setUsers(response.data);
                setTotalUsers(response.data.length);
            }
        } catch (error) { 
            showSnackbar('Erro ao carregar usuários.', 'error');
        } finally { 
            setIsLoading(false); 
        }
    }, [filtroCargo, filtroStatus, order, orderBy, page, rowsPerPage, showSnackbar]);

    const handleChangePage = (event, newPage) => setPage(newPage);

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0); 
    };

    // Zera a página sempre que mudar um filtro ou a ordenação
    useEffect(() => {
        setPage(0);
    }, [filtroCargo, filtroStatus, order, orderBy]);

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

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    // Configuração das colunas
    const headCells = [
        { id: 'first_name', label: 'Nome', align: 'left' },
        { id: 'username', label: 'Login', align: 'left' },
        { id: 'cargo', label: 'Cargo', align: 'left' },
        { id: 'is_active', label: 'Acesso', align: 'center' },
        { id: 'acoes', label: 'Ações', align: 'right', sortable: false }
    ];

    return (
        <Box className="tasy-flat-panel tasy-workspace" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* Header Padronizado */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #e9ecef', bgcolor: '#f8f9fa' }}>
                <Typography sx={{ fontWeight: 600, color: '#495057', fontSize: '13px', textTransform: 'uppercase' }}>
                    Gestão de Equipe
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    
                    <FormControl size="small" sx={{ minWidth: 150 }} className="tasy-compact-input">
                        <InputLabel>Status</InputLabel>
                        <Select value={filtroStatus} label="Status" onChange={(e) => setFiltroStatus(e.target.value)}>
                            <MenuItem value="ativos">Apenas Ativos</MenuItem>
                            <MenuItem value="inativos">Apenas Inativos</MenuItem>
                            <MenuItem value="todos">Todos</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 180 }} className="tasy-compact-input">
                        <InputLabel>Filtrar por Cargo</InputLabel>
                        <Select value={filtroCargo} label="Filtrar por Cargo" onChange={(e) => setFiltroCargo(e.target.value)}>
                            <MenuItem value="">Todos os Cargos</MenuItem>
                            <MenuItem value="admin">Administrador</MenuItem>
                            <MenuItem value="admin_medico">Médico Sócio</MenuItem> 
                            <MenuItem value="medico">Médico</MenuItem>
                            <MenuItem value="recepcao">Recepção</MenuItem>
                        </Select>
                    </FormControl>
                    
                    <Button 
                        variant="contained" 
                        disableElevation 
                        size="small" 
                        startIcon={<Add sx={{ fontSize: '16px' }} />}
                        onClick={() => { setEditingUser(null); setIsModalOpen(true); }} 
                        sx={{ bgcolor: '#1c7ed6', fontSize: '12px', minWidth: '130px' }}
                    >
                        Novo Usuário
                    </Button>
                </Box>
            </Box>
            
            <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            {headCells.map((headCell) => (
                                <TableCell
                                    key={headCell.id}
                                    align={headCell.align}
                                    sx={{ bgcolor: '#f8f9fa', fontWeight: 600, color: '#495057', borderBottom: '1px solid #e9ecef' }}
                                >
                                    {headCell.sortable !== false ? (
                                        <TableSortLabel
                                            active={orderBy === headCell.id}
                                            direction={orderBy === headCell.id ? order : 'asc'}
                                            onClick={() => handleRequestSort(headCell.id)}
                                        >
                                            {headCell.label}
                                        </TableSortLabel>
                                    ) : (
                                        headCell.label
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, opacity: user.is_active ? 1 : 0.6 }}>
                                <TableCell sx={{ color: '#343a40', fontWeight: 500 }}>{user.first_name} {user.last_name}</TableCell>
                                <TableCell sx={{ color: '#6c757d' }}>{user.username}</TableCell>
                                <TableCell sx={{ color: '#495057', textTransform: 'capitalize' }}>{formatarCargo(user.cargo)}</TableCell>
                                <TableCell align="center">
                                    <Switch checked={user.is_active} onChange={() => handleToggleActive(user)} color="success" size="small" />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => { setEditingUser(user); setIsModalOpen(true); }} size="small" sx={{ color: '#868e96', '&:hover': { color: '#1c7ed6' } }}>
                                        <Edit fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            
            <Box sx={{ borderTop: '1px solid #e9ecef', bgcolor: '#fff' }}>
                <TablePagination
                    component="div"
                    count={totalUsers} 
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    labelRowsPerPage="Usuários:"
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`}
                    sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '13px', color: '#495057' } }}
                />
            </Box>

            <UsuarioModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={fetchUsers} usuarioParaEditar={editingUser} />
        </Box>
    );
}