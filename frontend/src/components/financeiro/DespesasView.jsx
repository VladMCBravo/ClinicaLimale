import React, { useState, useEffect } from 'react';
import {
    Box, Button, CircularProgress, TextField, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Select, MenuItem, InputLabel, FormControl, IconButton, Checkbox,
    FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, Grid
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

    // --- LÓGICA DE CRIAÇÃO (COM PARCELAMENTO) ---
    const handleCreate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (formData.parcelado && formData.qtd_parcelas > 1) {
                // Lógica de Parcelamento: Cria N despesas
                const promises = [];
                const valorParcela = parseFloat(formData.valor) / formData.qtd_parcelas;
                let dataBase = new Date(formData.data_despesa);

                for (let i = 0; i < formData.qtd_parcelas; i++) {
                    const novaData = new Date(dataBase);
                    novaData.setMonth(novaData.getMonth() + i); // Adiciona meses

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
                // Despesa Simples
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
            categoria: despesa.categoria // Assume que o backend retorna o ID ou objeto correto
        });
        setEditModalOpen(true);
    };

    const handleUpdate = async () => {
        try {
            // Nota: Precisamos adicionar updateDespesa no service se não existir
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
             // Nota: Precisamos adicionar deleteDespesa no service se não existir
            await faturamentoService.deleteDespesa(id);
            showSnackbar('Despesa removida.', 'success');
            fetchData();
        } catch (error) {
            showSnackbar('Erro ao excluir.', 'error');
        }
    }

    return (
        <Box>
            {/* FORMULÁRIO DE ADIÇÃO */}
            <Paper component="form" onSubmit={handleCreate} elevation={2} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Nova Despesa</Typography>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField 
                            label="Descrição" 
                            value={formData.descricao} 
                            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} 
                            required fullWidth 
                        />
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <TextField
                            label="Data"
                            type="date"
                            value={formData.data_despesa}
                            onChange={(e) => setFormData({ ...formData, data_despesa: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            required fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <TextField 
                            label="Valor Total (R$)" 
                            type="number" 
                            value={formData.valor} 
                            onChange={(e) => setFormData({ ...formData, valor: e.target.value })} 
                            required fullWidth 
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl required fullWidth>
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
                    </Grid>
                    
                    {/* Linha de Parcelamento */}
                    <Grid item xs={12} md={12} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                                InputProps={{ inputProps: { min: 2, max: 24 } }}
                            />
                        )}
                        <Box sx={{ flexGrow: 1 }} />
                        <Button type="submit" variant="contained" disabled={isSubmitting || isLoading} size="large">
                            {isSubmitting ? <CircularProgress size={24} /> : 'Lançar Despesa'}
                        </Button>
                    </Grid>
                </Grid>
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
            <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)}>
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
    );
}