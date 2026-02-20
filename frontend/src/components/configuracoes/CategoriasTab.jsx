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
import CategoriaDespesaModal from './CategoriaDespesaModal';

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
    
    return (
    <Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
            <Button variant="contained" size="small" onClick={() => { setEditData(null); setOpenModal(true); }}>
                Nova Categoria
            </Button>
        </Box>
        
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
            <Table size="small" stickyHeader>
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                    <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell>Tipo Financeiro</TableCell>
                        <TableCell align="right">Editar</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {categorias.map((cat) => (
                        <TableRow key={cat.id} hover>
                            <TableCell sx={{ fontWeight: 500 }}>{cat.nome}</TableCell>
                            <TableCell align="center">
                                <Chip 
                                    label={cat.tipo === 'Fixa' ? 'FIXA' : 'VARIÁVEL'} 
                                    size="small"
                                    sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}
                                />
                            </TableCell>
                            <TableCell align="right">
                                <IconButton onClick={() => { setEditData(cat); setOpenModal(true); }} size="small">
                                    <EditIcon fontSize="small" color="primary" />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>

        {/* O Modal já faz todo o trabalho de POST/PUT e chama o fetchCats no onSave */}
        <CategoriaDespesaModal 
            open={openModal} 
            onClose={() => setOpenModal(false)} 
            onSave={fetchCats} 
            categoriaParaEditar={editData} 
        />
    </Box>
);
}