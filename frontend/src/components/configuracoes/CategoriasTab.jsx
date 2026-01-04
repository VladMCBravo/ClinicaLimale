// src/components/configuracoes/CategoriasTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, 
    TextField, Select, MenuItem, FormControl, InputLabel, Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import apiClient from '../../api/axiosConfig'; // Ajuste o caminho conforme sua estrutura
import { useSnackbar } from '../../contexts/SnackbarContext'; // Ajuste o caminho

export default function CategoriasTab() {
    const [categorias, setCategorias] = useState([]);
    const { showSnackbar } = useSnackbar();
    const [openModal, setOpenModal] = useState(false);
    const [editData, setEditData] = useState({});

    const fetchCats = useCallback(async () => {
        try {
            const res = await apiClient.get('/faturamento/categorias-despesa/');
            setCategorias(res.data);
        } catch (error) { showSnackbar('Erro ao buscar categorias', 'error'); }
    }, [showSnackbar]);

    useEffect(() => { fetchCats(); }, [fetchCats]);

    const handleSave = async () => {
        try {
            if (editData.id) {
                await apiClient.patch(`/faturamento/categorias-despesa/${editData.id}/`, editData);
            } else {
                await apiClient.post(`/faturamento/categorias-despesa/`, editData);
            }
            showSnackbar('Categoria salva!', 'success');
            setOpenModal(false);
            fetchCats();
        } catch (error) { showSnackbar('Erro ao salvar.', 'error'); }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" onClick={() => { setEditData({ tipo: 'Variavel' }); setOpenModal(true); }} sx={{bgcolor: '#1a233b'}}>
                    Nova Categoria
                </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell>Nome da Categoria</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell align="center">Tipo Financeiro</TableCell>
                            <TableCell align="right">Editar</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {categorias.map((cat) => (
                            <TableRow key={cat.id} hover>
                                <TableCell sx={{ fontWeight: 500 }}>{cat.nome}</TableCell>
                                <TableCell>{cat.descricao || '-'}</TableCell>
                                <TableCell align="center">
                                    <Chip 
                                        label={cat.tipo === 'Fixa' ? 'FIXA (Estrutura)' : 'VARIÁVEL (Consumo)'} 
                                        size="small"
                                        sx={{ 
                                            bgcolor: cat.tipo === 'Fixa' ? '#e3f2fd' : '#fff3e0',
                                            color: cat.tipo === 'Fixa' ? '#1565c0' : '#e65100',
                                            fontWeight: 'bold', fontSize: '0.7rem'
                                        }}
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => { setEditData(cat); setOpenModal(true); }} size="small">
                                        <EditIcon fontSize="small" sx={{ color: '#1976d2' }} />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* MODAL DE EDIÇÃO DE CATEGORIA */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Categoria de Despesa</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField 
                            label="Nome" fullWidth size="small" 
                            value={editData.nome || ''} 
                            onChange={(e) => setEditData({...editData, nome: e.target.value})} 
                        />
                        <TextField 
                            label="Descrição (Opcional)" fullWidth size="small" 
                            value={editData.descricao || ''} 
                            onChange={(e) => setEditData({...editData, descricao: e.target.value})} 
                        />
                        <FormControl fullWidth size="small">
                            <InputLabel>Tipo Financeiro</InputLabel>
                            <Select 
                                value={editData.tipo || 'Variavel'} 
                                label="Tipo Financeiro"
                                onChange={(e) => setEditData({...editData, tipo: e.target.value})}
                            >
                                <MenuItem value="Fixa">Fixa (Aluguel, Salários, Contratos)</MenuItem>
                                <MenuItem value="Variavel">Variável (Compras, Mercado, Manutenção)</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={handleSave}>Salvar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}