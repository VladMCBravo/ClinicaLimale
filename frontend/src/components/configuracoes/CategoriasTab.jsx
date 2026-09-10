// src/components/configuracoes/CategoriasTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Button, IconButton, Chip, Typography
} from '@mui/material';
import { Edit, Add } from '@mui/icons-material';
import apiClient from '../../api/axiosConfig'; 
import { useSnackbar } from '../../contexts/SnackbarContext'; 
import CategoriaDespesaModal from './CategoriaDespesaModal';

// 👇 Adicionando o import global do estilo flat e removendo qualquer resíduo do Financeiro.css 👇
import '../../atendimento.css'; 

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
        // Transformando a tela num painel único flat com scrollbar corporativo
        <Box className="tasy-flat-panel" sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* Header estilizado estilo dashboard */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #e9ecef', bgcolor: '#f8f9fa' }}>
                <Typography sx={{ fontWeight: 600, color: '#495057', fontSize: '13px', textTransform: 'uppercase' }}>
                    Categorias Financeiras
                </Typography>
                <Button 
                    variant="contained" 
                    size="small" 
                    disableElevation
                    startIcon={<Add sx={{ fontSize: '16px' }} />}
                    sx={{ bgcolor: '#1c7ed6', fontSize: '12px' }}
                    onClick={() => { setEditData(null); setOpenModal(true); }}
                >
                    Nova Categoria
                </Button>
            </Box>
            
            <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }} className="tasy-workspace">
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ bgcolor: '#f8f9fa', fontWeight: 600, color: '#495057', borderBottom: '1px solid #e9ecef' }}>Nome da Categoria</TableCell>
                            <TableCell sx={{ bgcolor: '#f8f9fa', fontWeight: 600, color: '#495057', borderBottom: '1px solid #e9ecef' }} align="center">Tipo</TableCell>
                            <TableCell sx={{ bgcolor: '#f8f9fa', fontWeight: 600, color: '#495057', borderBottom: '1px solid #e9ecef' }} align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {categorias.map((cat) => (
                            <TableRow key={cat.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell sx={{ fontWeight: 500, color: '#343a40' }}>{cat.nome}</TableCell>
                                <TableCell align="center">
                                    <Chip 
                                        label={cat.tipo === 'Fixa' ? 'FIXA' : 'VARIÁVEL'} 
                                        size="small"
                                        sx={{ 
                                            fontWeight: 'bold', fontSize: '10px', height: 20,
                                            bgcolor: cat.tipo === 'Fixa' ? '#e7f5ff' : '#fff4e6',
                                            color: cat.tipo === 'Fixa' ? '#1c7ed6' : '#e8590c',
                                            borderRadius: '4px'
                                        }}
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => { setEditData(cat); setOpenModal(true); }} size="small" sx={{ color: '#868e96', '&:hover': { color: '#1c7ed6' } }}>
                                        <Edit fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <CategoriaDespesaModal 
                open={openModal} 
                onClose={() => setOpenModal(false)} 
                onSave={fetchCats} 
                categoriaParaEditar={editData} 
            />
        </Box>
    );
}