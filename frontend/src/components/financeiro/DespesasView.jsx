// src/components/financeiro/DespesasView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Button, CircularProgress, TextField, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Select, MenuItem, InputLabel, FormControl, IconButton, Checkbox,
    FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions,
    Typography, Grid
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

const initialFormState = { 
    descricao: '', 
    valor: '', 
    categoria: '', 
    data_despesa: new Date().toISOString().split('T')[0],
    parcelado: false,
    qtd_parcelas: 1
};

export default function DespesasView() {
    const { showSnackbar } = useSnackbar();
    const [despesas, setDespesas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    
    // Estados do Formulário e UI
    const [formData, setFormData] = useState(initialFormState);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Estados para Edição
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingDespesa, setEditingDespesa] = useState(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [despesasRes, categoriasRes] = await Promise.all([
                faturamentoService.getDespesas(),
                faturamentoService.getCategoriasDespesa()
            ]);
            setDespesas(despesasRes.data);
            setCategorias(categoriasRes.data);
        } catch (error) {
            console.error(error);
            showSnackbar('Erro ao carregar dados.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- LÓGICA DE CRIAÇÃO ---
    const handleCreate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (formData.parcelado && formData.qtd_parcelas > 1) {
                const promises = [];
                const valorParcela = parseFloat(formData.valor) / formData.qtd_parcelas;
                let dataBase = new Date(formData.data_despesa);

                for (let i = 0; i < formData.qtd_parcelas; i++) {
                    const novaData = new Date(dataBase);
                    novaData.setMonth(novaData.getMonth() + i);

                    const payload = {
                        ...formData,
                        descricao: `${formData.descricao} (${i + 1}/${formData.qtd_parcelas})`,
                        valor: valorParcela.toFixed(2),
                        data_despesa: novaData.toISOString().split('T')[0]
                    };
                    promises.push(faturamentoService.createDespesa(payload));
                }
                await Promise.all(promises);
                showSnackbar(`${formData.qtd_parcelas} parcelas geradas com sucesso!`, 'success');

            } else {
                await faturamentoService.createDespesa(formData);
                showSnackbar('Despesa salva com sucesso!', 'success');
            }
            
            setFormData(initialFormState);
            fetchData();
        } catch (error) {
            console.error(error);
            showSnackbar('Erro ao salvar despesa.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- LÓGICA DE EDIÇÃO ---
    const handleOpenEdit = (despesa) => {
        // Clona o objeto para edição
        setEditingDespesa({
            ...despesa,
            // Garante que categoria seja o ID para o Select funcionar
            categoria: despesa.categoria 
        });
        setEditModalOpen(true);
    };

    const handleUpdate = async () => {
        try {
            await faturamentoService.updateDespesa(editingDespesa.id, editingDespesa);
            showSnackbar('Despesa atualizada!', 'success');
            setEditModalOpen(false);
            setEditingDespesa(null);
            fetchData();
        } catch (error) {
            showSnackbar('Erro ao atualizar.', 'error');
        }
    };
    
    const handleDelete = async (id) => {
        if(!window.confirm("Tem certeza que deseja excluir esta despesa?")) return;
        try {
            await faturamentoService.deleteDespesa(id);
            showSnackbar('Despesa removida.', 'success');
            fetchData();
        } catch (error) {
            showSnackbar('Erro ao excluir.', 'error');
        }
    }

    // --- CÁLCULO DOS TOTAIS (Compacto) ---
    const financialSummary = useMemo(() => {
        return despesas.reduce((acc, item) => {
            const valor = parseFloat(item.valor) || 0;
            
            // Soma ao Total Geral
            acc.total += valor;

            // Lógica de Status
            // ATENÇÃO: Verifique se sua API retorna 'pago' ou 'status'. 
            // Se não tiver esse campo, tudo cairá em "A Pagar".
            if (item.pago === true || item.status === 'pago') { 
                acc.pagas += valor;
            } else {
                acc.aPagar += valor;
            }

            return acc;
        }, { pagas: 0, aPagar: 0, total: 0 });
    }, [despesas]);

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <Box>
            {/* --- DASHBOARD DE TOTAIS COMPACTO --- */}
            <Grid container spacing={1} sx={{ mb: 2 }}>
                {/* Card: Já Pagas */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={1} sx={{ p: 1.5, borderLeft: '4px solid #2e7d32', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                                Já Pagas
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1b5e20', lineHeight: 1 }}>
                                {formatMoney(financialSummary.pagas)}
                            </Typography>
                        </Box>
                        {/* Indicador visual simples (opcional) */}
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2e7d32' }} />
                    </Paper>
                </Grid>

                {/* Card: A Pagar */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={1} sx={{ p: 1.5, borderLeft: '4px solid #ed6c02', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                                A Pagar
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#c62828', lineHeight: 1 }}>
                                {formatMoney(financialSummary.aPagar)}
                            </Typography>
                        </Box>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ed6c02' }} />
                    </Paper>
                </Grid>

                {/* Card: Total Geral */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={1} sx={{ p: 1.5, borderLeft: '4px solid #1976d2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                                Total Despesas
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#0d47a1', lineHeight: 1 }}>
                                {formatMoney(financialSummary.total)}
                            </Typography>
                        </Box>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1976d2' }} />
                    </Paper>
                </Grid>
            </Grid>
        <Box>
            {/* FORMULÁRIO DE ADIÇÃO (Flex Box) */}
            <Paper component="form" onSubmit={handleCreate} elevation={2} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Nova Despesa</Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
                    <TextField 
                        label="Descrição" 
                        value={formData.descricao} 
                        onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} 
                        required 
                        sx={{ flexGrow: 1, minWidth: '250px' }} 
                    />
                    <TextField
                        label="Data"
                        type="date"
                        value={formData.data_despesa}
                        onChange={(e) => setFormData({ ...formData, data_despesa: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        required 
                        sx={{ width: '160px' }}
                    />
                    <TextField 
                        label="Valor (R$)" 
                        type="number" 
                        value={formData.valor} 
                        onChange={(e) => setFormData({ ...formData, valor: e.target.value })} 
                        required 
                        sx={{ width: '140px' }} 
                    />
                    <FormControl required sx={{ minWidth: '200px', flexGrow: 1 }}>
                        <InputLabel>Categoria</InputLabel>
                        <Select
                            value={formData.categoria}
                            label="Categoria"
                            onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                        >
                            {categorias.map((cat) => (
                                <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
                    
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                    <FormControlLabel
                        control={<Checkbox checked={formData.parcelado} onChange={(e) => setFormData({...formData, parcelado: e.target.checked})} />}
                        label="Parcelar despesa?"
                    />
                    {formData.parcelado && (
                        <TextField 
                            label="Qtd. Parcelas" 
                            type="number" 
                            size="small"
                            sx={{ width: 120 }}
                            value={formData.qtd_parcelas}
                            onChange={(e) => setFormData({...formData, qtd_parcelas: parseInt(e.target.value)})}
                            InputProps={{ inputProps: { min: 2, max: 60 } }} 
                        />
                    )}
                    <Box sx={{ flexGrow: 1 }} />
                    <Button type="submit" variant="contained" disabled={isSubmitting || isLoading} size="large">
                        {isSubmitting ? <CircularProgress size={24} /> : 'Lançar Despesa'}
                    </Button>
                </Box>
            </Paper>

            {/* TABELA DE DESPESAS */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Data</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell>Categoria</TableCell>
                            <TableCell align="right">Valor</TableCell>
                            <TableCell align="center">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {despesas.map((despesa) => (
                            <TableRow key={despesa.id} hover>
                                <TableCell>{new Date(despesa.data_despesa).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
                                <TableCell>{despesa.descricao}</TableCell>
                                <TableCell>{despesa.categoria_nome}</TableCell>
                                <TableCell align="right">R$ {parseFloat(despesa.valor).toFixed(2)}</TableCell>
                                <TableCell align="center">
                                    <IconButton size="small" onClick={() => handleOpenEdit(despesa)} color="primary"><EditIcon /></IconButton>
                                    <IconButton size="small" onClick={() => handleDelete(despesa.id)} color="error"><DeleteIcon /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* MODAL DE EDIÇÃO */}
            <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Editar Despesa</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    {editingDespesa && (
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12}>
                                <TextField 
                                    label="Descrição" 
                                    fullWidth 
                                    value={editingDespesa.descricao} 
                                    onChange={(e) => setEditingDespesa({...editingDespesa, descricao: e.target.value})} 
                                />
                            </Grid>
                            
                            {/* --- NOVO CAMPO: CATEGORIA --- */}
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>Categoria</InputLabel>
                                    <Select
                                        value={editingDespesa.categoria || ''}
                                        label="Categoria"
                                        onChange={(e) => setEditingDespesa({...editingDespesa, categoria: e.target.value})}
                                    >
                                        {categorias.map((cat) => (
                                            <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            {/* ----------------------------- */}

                            <Grid item xs={6}>
                                <TextField 
                                    label="Valor" 
                                    type="number" 
                                    fullWidth 
                                    value={editingDespesa.valor} 
                                    onChange={(e) => setEditingDespesa({...editingDespesa, valor: e.target.value})} 
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField 
                                    label="Data" 
                                    type="date" 
                                    fullWidth 
                                    InputLabelProps={{ shrink: true }}
                                    value={editingDespesa.data_despesa} 
                                    onChange={(e) => setEditingDespesa({...editingDespesa, data_despesa: e.target.value})} 
                                />
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleUpdate} variant="contained">Salvar Alterações</Button>
                </DialogActions>
            </Dialog>
        </Box>
    </Box>
    );
}