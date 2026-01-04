// src/pages/ProcedimentosPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, CircularProgress, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment,
    Grid, MenuItem, Select, FormControl, InputLabel, Chip, Tooltip
} from '@mui/material';
import { 
    Edit as EditIcon, 
    Delete as DeleteIcon, 
    CloudUpload as CloudUploadIcon,
    AddCircle as AddIcon,
    Search as SearchIcon
} from '@mui/icons-material';

import { useSnackbar } from '../contexts/SnackbarContext';
import { faturamentoService } from '../services/faturamentoService';

// Categorias baseadas no seu models.py
const CATEGORIAS = [
    { value: 'US_GERAL', label: 'Ultrassonografia Geral', color: 'primary' },
    { value: 'MED_FETAL', label: 'Medicina Fetal', color: 'secondary' },
    { value: 'ECOCARDIOGRAMA', label: 'Ecocardiograma', color: 'error' },
    { value: 'MUSCULO', label: 'Musculoesquelético', color: 'warning' },
    { value: 'DOPPLER', label: 'Doppler Vascular', color: 'info' },
    { value: 'OUTROS', label: 'Outros', color: 'default' },
];

export default function ProcedimentosPage() {
    const [procedimentos, setProcedimentos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();

    // Estados de Filtro
    const [searchTerm, setSearchTerm] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('');

    // Estados do Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemParaEditar, setItemParaEditar] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Form Data Completo
    const [formData, setFormData] = useState({ 
        codigo_tuss: '', 
        descricao: '', 
        categoria: 'OUTROS',
        valor_particular: '' 
    });

    const fetchProcedimentos = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await faturamentoService.getProcedimentos();
            // Ordena alfabeticamente por padrão
            const sorted = response.data.sort((a, b) => a.descricao.localeCompare(b.descricao));
            setProcedimentos(sorted);
        } catch (error) {
            console.error(error);
            showSnackbar('Erro ao carregar procedimentos.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchProcedimentos();
    }, [fetchProcedimentos]);

    // --- FILTRAGEM LOCAL ---
    const filteredList = useMemo(() => {
        return procedimentos.filter(proc => {
            const matchesSearch = 
                proc.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                proc.codigo_tuss.includes(searchTerm);
            
            const matchesCat = categoriaFiltro ? proc.categoria === categoriaFiltro : true;

            return matchesSearch && matchesCat;
        });
    }, [procedimentos, searchTerm, categoriaFiltro]);

    // --- HANDLERS DO MODAL ---
    const handleOpenModal = (item = null) => {
        setItemParaEditar(item);
        if (item) {
            setFormData({ 
                codigo_tuss: item.codigo_tuss || '',
                descricao: item.descricao, 
                categoria: item.categoria || 'OUTROS',
                valor_particular: item.valor_particular || '' 
            });
        } else {
            setFormData({ codigo_tuss: '', descricao: '', categoria: 'OUTROS', valor_particular: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setItemParaEditar(null);
    };

    const handleSave = async () => {
        if (!formData.descricao.trim()) {
            showSnackbar('A descrição é obrigatória.', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                codigo_tuss: formData.codigo_tuss,
                descricao: formData.descricao,
                categoria: formData.categoria,
                valor_particular: formData.valor_particular ? parseFloat(formData.valor_particular) : 0.00
            };

            if (itemParaEditar) {
                await faturamentoService.updateProcedimento(itemParaEditar.id, payload);
                showSnackbar('Procedimento atualizado!', 'success');
            } else {
                await faturamentoService.createProcedimento(payload);
                showSnackbar('Procedimento criado!', 'success');
            }
            handleCloseModal();
            fetchProcedimentos();
        } catch (error) {
            console.error(error);
            showSnackbar('Erro ao salvar.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja remover este procedimento?')) {
            try {
                await faturamentoService.deleteProcedimento(id);
                showSnackbar('Removido com sucesso.', 'success');
                fetchProcedimentos();
            } catch (error) {
                showSnackbar('Erro ao remover.', 'error');
            }
        }
    };

    // --- HANDLER DE UPLOAD TUSS ---
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('arquivo_tuss', file);

        setIsUploading(true);
        try {
            await faturamentoService.uploadTuss(uploadData);
            showSnackbar('Arquivo processado com sucesso!', 'success');
            fetchProcedimentos();
        } catch (error) {
            console.error(error);
            showSnackbar('Erro no upload. Verifique o formato CSV.', 'error');
        } finally {
            setIsUploading(false);
            event.target.value = null; // Limpa o input
        }
    };

    const getCategoriaLabel = (val) => {
        const cat = CATEGORIAS.find(c => c.value === val);
        return cat ? <Chip label={cat.label} size="small" color={cat.color} variant="outlined" /> : val;
    };

    return (
        <Paper sx={{ p: 3, margin: 'auto', maxWidth: '1200px' }}>
            
            {/* CABEÇALHO */}
            <Box sx={{ display: 'flex', flexDirection: {xs: 'column', md: 'row'}, justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2 }}>
                <Typography variant="h5" fontWeight="bold" color="primary">
                    Tabela de Procedimentos
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                    {/* Botão de Upload Escondido + Label Trigger */}
                    <input
                        accept=".csv, .txt"
                        style={{ display: 'none' }}
                        id="raised-button-file"
                        type="file"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                    />
                    <label htmlFor="raised-button-file">
                        <Button 
                            variant="outlined" 
                            component="span" 
                            startIcon={isUploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                            disabled={isUploading}
                        >
                            {isUploading ? 'Processando...' : 'Importar TUSS'}
                        </Button>
                    </label>

                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenModal()}>
                        Novo Exame
                    </Button>
                </Box>
            </Box>

            {/* BARRA DE FILTROS */}
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2, display: 'flex', gap: 2, alignItems: 'center', borderRadius: 2 }}>
                <SearchIcon sx={{ color: 'text.secondary' }} />
                <TextField 
                    placeholder="Buscar por nome ou código TUSS..." 
                    variant="standard" 
                    fullWidth 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{ disableUnderline: true }}
                />
                <FormControl variant="standard" sx={{ minWidth: 200 }}>
                    <Select
                        value={categoriaFiltro}
                        onChange={(e) => setCategoriaFiltro(e.target.value)}
                        displayEmpty
                        disableUnderline
                        sx={{ fontSize: '0.9rem' }}
                    >
                        <MenuItem value=""><em>Todas Categorias</em></MenuItem>
                        {CATEGORIAS.map(c => (
                            <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Paper>

            {/* TABELA */}
            <TableContainer sx={{ maxHeight: '60vh' }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell width="120px" sx={{fontWeight: 'bold'}}>Cód. TUSS</TableCell>
                            <TableCell sx={{fontWeight: 'bold'}}>Descrição do Procedimento</TableCell>
                            <TableCell sx={{fontWeight: 'bold'}}>Categoria</TableCell>
                            <TableCell align="right" width="150px" sx={{fontWeight: 'bold'}}>Valor Particular</TableCell>
                            <TableCell align="center" width="100px" sx={{fontWeight: 'bold'}}>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} align="center"><CircularProgress sx={{mt:2}}/></TableCell></TableRow>
                        ) : filteredList.length > 0 ? (
                            filteredList.map((item) => (
                                <TableRow key={item.id} hover>
                                    <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                                        {item.codigo_tuss || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="500">
                                            {item.descricao}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        {getCategoriaLabel(item.categoria)}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                                        {item.valor_particular 
                                            ? `R$ ${parseFloat(item.valor_particular).toFixed(2)}` 
                                            : <span style={{color: '#999'}}>-</span>
                                        }
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Editar">
                                            <IconButton size="small" onClick={() => handleOpenModal(item)}>
                                                <EditIcon fontSize="small" color="primary" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Excluir">
                                            <IconButton size="small" onClick={() => handleDelete(item.id)}>
                                                <DeleteIcon fontSize="small" color="error" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={5} align="center" sx={{py: 4, color: '#666'}}>Nenhum procedimento encontrado.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* MODAL (Novo/Editar) */}
            <Dialog open={isModalOpen} onClose={handleCloseModal} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontWeight: 'bold' }}>
                    {itemParaEditar ? 'Editar Procedimento' : 'Cadastrar Novo Exame'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Código TUSS"
                                    fullWidth
                                    value={formData.codigo_tuss}
                                    onChange={(e) => setFormData({...formData, codigo_tuss: e.target.value})}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Categoria</InputLabel>
                                    <Select
                                        value={formData.categoria}
                                        label="Categoria"
                                        onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                                    >
                                        {CATEGORIAS.map(c => (
                                            <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>

                        <TextField
                            label="Descrição do Procedimento"
                            fullWidth
                            required
                            multiline
                            rows={2}
                            value={formData.descricao}
                            onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        />

                        <TextField
                            label="Valor Particular (R$)"
                            type="number"
                            fullWidth
                            value={formData.valor_particular}
                            onChange={(e) => setFormData({...formData, valor_particular: e.target.value})}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                            }}
                            helperText="Deixe vazio ou 0 se for depender apenas do valor do convênio"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseModal} color="inherit">Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} color="inherit"/> : 'Salvar Dados'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}