// src/components/financeiro/DespesasView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Button, CircularProgress, TextField, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Select, MenuItem, InputLabel, FormControl, IconButton, Checkbox,
    FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions,
    Typography, Grid, Switch, Tooltip
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
    data_vencimento: new Date().toISOString().split('T')[0], // NOVO CAMPO
    parcelado: false,
    qtd_parcelas: 1,
    pago: false
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
                let dataDespesaBase = new Date(formData.data_despesa);
                let dataVencimentoBase = new Date(formData.data_vencimento);

                for (let i = 0; i < formData.qtd_parcelas; i++) {
                    // Calcula Data Despesa (mês a mês)
                    const novaDataDespesa = new Date(dataDespesaBase);
                    novaDataDespesa.setMonth(novaDataDespesa.getMonth() + i);

                    // Calcula Data Vencimento (mês a mês)
                    const novaDataVencimento = new Date(dataVencimentoBase);
                    novaDataVencimento.setMonth(novaDataVencimento.getMonth() + i);

                    const payload = {
                        ...formData,
                        descricao: `${formData.descricao} (${i + 1}/${formData.qtd_parcelas})`,
                        valor: valorParcela.toFixed(2),
                        data_despesa: novaDataDespesa.toISOString().split('T')[0],
                        data_vencimento: novaDataVencimento.toISOString().split('T')[0] // Envia vencimento calculado
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
        setEditingDespesa({
            ...despesa,
            categoria: despesa.categoria,
            // Garante que se vier nulo do banco, preenche com a data da despesa
            data_vencimento: despesa.data_vencimento || despesa.data_despesa 
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

    // --- ALTERAR STATUS (CORRIGIDO) ---
    const handleToggleStatus = async (despesa) => {
        const novoStatus = !despesa.pago;
        
        // 1. Atualização Otimista (Muda na tela na hora)
        setDespesas(prev => prev.map(item => 
            item.id === despesa.id ? { ...item, pago: novoStatus } : item
        ));

        try {
            // 2. PREPARAÇÃO DO PAYLOAD (A CORREÇÃO ESTÁ AQUI)
            // Criamos um objeto limpo apenas com os dados que o banco aceita editar.
            // Isso remove campos como 'categoria_nome' que causam erro no backend.
            const payload = {
                id: despesa.id,
                descricao: despesa.descricao,
                valor: despesa.valor,
                categoria: despesa.categoria, // Garante que vai o ID
                data_despesa: despesa.data_despesa,
                data_vencimento: despesa.data_vencimento,
                parcelado: despesa.parcelado,
                qtd_parcelas: despesa.qtd_parcelas,
                pago: novoStatus
            };

            // Envia apenas o payload limpo
            await faturamentoService.updateDespesa(despesa.id, payload);
            
            showSnackbar(novoStatus ? 'Conta marcada como PAGA' : 'Conta marcada como PENDENTE', 'success');
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            
            // 3. Reversão em caso de erro (Volta o botão se o servidor recusar)
            setDespesas(prev => prev.map(item => 
                item.id === despesa.id ? { ...item, pago: !novoStatus } : item
            ));
            showSnackbar('Erro ao atualizar status. Tente novamente.', 'error');
        }
    };

    const financialSummary = useMemo(() => {
        return despesas.reduce((acc, item) => {
            const valor = parseFloat(item.valor) || 0;
            acc.total += valor;
            if (item.pago === true || item.status === 'pago') { 
                acc.pagas += valor;
            } else {
                acc.aPagar += valor;
            }
            return acc;
        }, { pagas: 0, aPagar: 0, total: 0 });
    }, [despesas]);

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        // Ajuste de fuso horário simples (UTC para local visualmente)
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    };

    return (
        <Box>
            {/* --- DASHBOARD DE TOTAIS COMPACTO --- */}
            <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                    <Paper elevation={1} sx={{ p: 1.5, borderLeft: '4px solid #2e7d32', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">JÁ PAGAS</Typography>
                            <Typography variant="subtitle1" fontWeight="bold" color="#1b5e20" lineHeight={1}>{formatMoney(financialSummary.pagas)}</Typography>
                        </Box>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2e7d32' }} />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper elevation={1} sx={{ p: 1.5, borderLeft: '4px solid #ed6c02', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">A PAGAR</Typography>
                            <Typography variant="subtitle1" fontWeight="bold" color="#c62828" lineHeight={1}>{formatMoney(financialSummary.aPagar)}</Typography>
                        </Box>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ed6c02' }} />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper elevation={1} sx={{ p: 1.5, borderLeft: '4px solid #1976d2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">TOTAL</Typography>
                            <Typography variant="subtitle1" fontWeight="bold" color="#0d47a1" lineHeight={1}>{formatMoney(financialSummary.total)}</Typography>
                        </Box>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1976d2' }} />
                    </Paper>
                </Grid>
            </Grid>

            {/* FORMULÁRIO DE ADIÇÃO (Compacto) */}
            <Paper component="form" onSubmit={handleCreate} elevation={1} sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Nova Despesa</Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                    <TextField 
                        label="Descrição" 
                        value={formData.descricao} 
                        onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} 
                        required 
                        size="small" 
                        sx={{ flexGrow: 2, minWidth: '180px' }} 
                        InputProps={{ style: { fontSize: '0.9rem' } }}
                        InputLabelProps={{ style: { fontSize: '0.9rem' } }}
                    />
                    
                    {/* DATA DESPESA */}
                    <TextField
                        label="Data Emissão"
                        type="date"
                        value={formData.data_despesa}
                        onChange={(e) => setFormData({ ...formData, data_despesa: e.target.value })}
                        InputLabelProps={{ shrink: true, style: { fontSize: '0.85rem' } }}
                        required 
                        size="small"
                        sx={{ width: '130px' }}
                        InputProps={{ style: { fontSize: '0.85rem' } }}
                    />

                    {/* NOVO CAMPO: VENCIMENTO */}
                    <TextField
                        label="Vencimento"
                        type="date"
                        value={formData.data_vencimento}
                        onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                        InputLabelProps={{ shrink: true, style: { fontSize: '0.85rem' } }}
                        required 
                        size="small"
                        sx={{ width: '130px' }}
                        InputProps={{ style: { fontSize: '0.85rem' } }}
                    />

                    <TextField 
                        label="Valor (R$)" 
                        type="number" 
                        value={formData.valor} 
                        onChange={(e) => setFormData({ ...formData, valor: e.target.value })} 
                        required 
                        size="small" 
                        sx={{ width: '110px' }} 
                        InputProps={{ style: { fontSize: '0.9rem' } }}
                        InputLabelProps={{ style: { fontSize: '0.9rem' } }}
                    />

                    <FormControl required size="small" sx={{ minWidth: '150px', flexGrow: 1 }}>
                        <InputLabel sx={{ fontSize: '0.9rem' }}>Categoria</InputLabel>
                        <Select
                            value={formData.categoria}
                            label="Categoria"
                            onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                            sx={{ fontSize: '0.9rem' }}
                        >
                            {categorias.map((cat) => (
                                <MenuItem key={cat.id} value={cat.id} sx={{ fontSize: '0.9rem' }}>{cat.nome}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
                    
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1.5 }}>
                    <FormControlLabel
                        sx={{ '& .MuiTypography-root': { fontSize: '0.8rem' } }}
                        control={<Checkbox size="small" checked={formData.parcelado} onChange={(e) => setFormData({...formData, parcelado: e.target.checked})} />}
                        label="Parcelar?"
                    />
                    <FormControlLabel
                        sx={{ '& .MuiTypography-root': { fontSize: '0.8rem' } }}
                        control={<Checkbox size="small" checked={formData.pago} onChange={(e) => setFormData({...formData, pago: e.target.checked})} color="success" />}
                        label="Pago?"
                    />

                    {formData.parcelado && (
                        <TextField 
                            label="Qtd" 
                            type="number" 
                            size="small"
                            sx={{ width: 70 }}
                            value={formData.qtd_parcelas}
                            onChange={(e) => setFormData({...formData, qtd_parcelas: parseInt(e.target.value)})}
                            InputProps={{ inputProps: { min: 2, max: 60 }, style: { fontSize: '0.85rem' } }} 
                            InputLabelProps={{ style: { fontSize: '0.85rem' } }}
                        />
                    )}
                    
                    <Box sx={{ flexGrow: 1 }} />
                    <Button type="submit" variant="contained" disabled={isSubmitting || isLoading} size="medium" sx={{ px: 4, textTransform: 'none' }}>
                        {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Lançar'}
                    </Button>
                </Box>
            </Paper>

            {/* TABELA DE DESPESAS (Compacta) */}
            <TableContainer component={Paper}>
                {/* size="small" diminui o padding das células */}
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            {/* Fonte reduzida no header também */}
                            <TableCell sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Emissão</TableCell>
                            <TableCell sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Vencimento</TableCell>
                            <TableCell sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Descrição</TableCell>
                            <TableCell sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Categoria</TableCell>
                            <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Valor</TableCell>
                            <TableCell align="center" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Pago?</TableCell> 
                            <TableCell align="center" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {despesas.map((despesa) => (
                            <TableRow key={despesa.id} hover>
                                <TableCell sx={{ fontSize: '0.8rem' }}>{formatDate(despesa.data_despesa)}</TableCell>
                                
                                {/* NOVA COLUNA DE VENCIMENTO */}
                                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#555' }}>
                                    {formatDate(despesa.data_vencimento)}
                                </TableCell>
                                
                                <TableCell sx={{ fontSize: '0.8rem' }}>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem', textDecoration: despesa.pago ? 'line-through' : 'none', color: despesa.pago ? 'text.secondary' : 'text.primary' }}>
                                        {despesa.descricao}
                                    </Typography>
                                </TableCell>
                                
                                <TableCell sx={{ fontSize: '0.8rem' }}>{despesa.categoria_nome}</TableCell>
                                
                                <TableCell align="right" sx={{ fontSize: '0.8rem' }}>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }} fontWeight="bold" color={despesa.pago ? 'success.main' : 'error.main'}>
                                        R$ {parseFloat(despesa.valor).toFixed(2)}
                                    </Typography>
                                </TableCell>

                                <TableCell align="center">
                                    <Tooltip title={despesa.pago ? "Marcar como pendente" : "Marcar como pago"}>
                                        <Switch
                                            checked={!!despesa.pago}
                                            onChange={() => handleToggleStatus(despesa)}
                                            color="success"
                                            size="small"
                                        />
                                    </Tooltip>
                                </TableCell>

                                <TableCell align="center">
                                    <IconButton size="small" onClick={() => handleOpenEdit(despesa)} color="primary"><EditIcon sx={{ fontSize: 18 }} /></IconButton>
                                    <IconButton size="small" onClick={() => handleDelete(despesa.id)} color="error"><DeleteIcon sx={{ fontSize: 18 }} /></IconButton>
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
                                    label="Descrição" fullWidth 
                                    value={editingDespesa.descricao} 
                                    onChange={(e) => setEditingDespesa({...editingDespesa, descricao: e.target.value})} 
                                />
                            </Grid>
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
                            <Grid item xs={6}>
                                <TextField 
                                    label="Data Emissão" type="date" fullWidth 
                                    InputLabelProps={{ shrink: true }}
                                    value={editingDespesa.data_despesa} 
                                    onChange={(e) => setEditingDespesa({...editingDespesa, data_despesa: e.target.value})} 
                                />
                            </Grid>
                            {/* CAMPO DE VENCIMENTO NO EDIT */}
                            <Grid item xs={6}>
                                <TextField 
                                    label="Data Vencimento" type="date" fullWidth 
                                    InputLabelProps={{ shrink: true }}
                                    value={editingDespesa.data_vencimento || ''} 
                                    onChange={(e) => setEditingDespesa({...editingDespesa, data_vencimento: e.target.value})} 
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField 
                                    label="Valor" type="number" fullWidth 
                                    value={editingDespesa.valor} 
                                    onChange={(e) => setEditingDespesa({...editingDespesa, valor: e.target.value})} 
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
    );
}