// src/components/financeiro/DespesasView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, CircularProgress, TextField, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Select, MenuItem, InputLabel, FormControl
} from '@mui/material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext'; // <-- IMPORTE O HOOK DE NOTIFICAÇÃO

const initialFormState = { 
    descricao: '', 
    valor: '', 
    categoria: '', 
    data_despesa: new Date().toISOString().split('T')[0]
};

export default function DespesasView() {
    const { showSnackbar } = useSnackbar(); // <-- USE O HOOK
    const [despesas, setDespesas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [formData, setFormData] = useState(initialFormState);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Simplificamos a função fetchData, removendo o useCallback para garantir que ela sempre busca os dados mais recentes
    const fetchData = async () => {
        try {
            const [despesasRes, categoriasRes] = await Promise.all([
                apiClient.get('/faturamento/despesas/'),
                apiClient.get('/faturamento/categorias-despesa/')
            ]);
            setDespesas(despesasRes.data);
            setCategorias(categoriasRes.data);
        } catch (error) {
            console.error("Erro ao buscar dados financeiros:", error);
            showSnackbar('Erro ao carregar dados.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setIsLoading(true);
        fetchData();
    }, []); // Roda apenas uma vez na montagem inicial

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await apiClient.post('/faturamento/despesas/', formData);
            showSnackbar('Despesa salva com sucesso!', 'success'); // <-- FEEDBACK DE SUCESSO
            setFormData(initialFormState);
            fetchData(); // Recarrega os dados para atualizar a lista
        } catch (error) {
            console.error("Erro ao salvar despesa:", error.response?.data);
            showSnackbar('Erro ao salvar despesa. Verifique os campos.', 'error'); // <-- FEEDBACK DE ERRO
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading && despesas.length === 0) return <CircularProgress />;

    return (
        <Box>
            <Paper component="form" onSubmit={handleSave} elevation={2} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <TextField name="descricao" label="Descrição" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} required fullWidth />
                
                {/* --- 2. ADICIONADO INPUT DE DATA --- */}
                <TextField
                    name="data_despesa"
                    label="Data da Despesa"
                    type="date"
                    value={formData.data_despesa}
                    onChange={(e) => setFormData({ ...formData, data_despesa: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    required
                />

                <TextField name="valor" label="Valor (R$)" type="number" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} required />
                
                <FormControl required sx={{ minWidth: 200 }}>
                    <InputLabel id="categoria-select-label">Categoria</InputLabel>
                    <Select
                        labelId="categoria-select-label"
                        name="categoria"
                        value={formData.categoria}
                        label="Categoria"
                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    >
                        {categorias.map((cat) => (
                            <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                
                <Button type="submit" variant="contained" disabled={isLoading} sx={{ height: 56 }}>Adicionar</Button>
            </Paper>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Data da Despesa</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell>Categoria</TableCell>
                            <TableCell align="right">Valor (R$)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {despesas.map((despesa) => (
                            <TableRow key={despesa.id}>
                                <TableCell>{new Date(despesa.data_despesa).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                                <TableCell>{despesa.descricao}</TableCell>
                                <TableCell>{despesa.categoria_nome}</TableCell>
                                <TableCell align="right">{parseFloat(despesa.valor).toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}