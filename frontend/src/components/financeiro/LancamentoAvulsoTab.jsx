// src/components/financeiro/LancamentoAvulsoTab.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Grid, TextField, Button, CircularProgress, Autocomplete, FormControl, InputLabel, Select, MenuItem,
    ToggleButton, ToggleButtonGroup, Typography
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { faturamentoService } from '../../services/faturamentoService';
import { pacienteService } from '../../services/pacienteService';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function LancamentoAvulsoTab({ onClose }) {
    const [tipo, setTipo] = useState('receita');
    const [formData, setFormData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Dados para os dropdowns
    const [pacientes, setPacientes] = useState([]);
    const [categorias, setCategorias] = useState([]);
    
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        // Busca dados para preencher os seletores do formulário
        pacienteService.getPacientes().then(res => setPacientes(res.data));
        faturamentoService.getCategoriasDespesa().then(res => setCategorias(res.data));
    }, []);

    const handleTipoChange = (event, newTipo) => {
        if (newTipo !== null) {
            setTipo(newTipo);
            setFormData({}); // Limpa o formulário ao trocar o tipo
        }
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        
        // Monta o payload final para a API
        const payload = {
            ...formData,
            tipo: tipo,
            // Garante que o ID do paciente seja enviado, e não o objeto inteiro
            paciente: formData.paciente?.id || null, 
        };

        try {
            await faturamentoService.createLancamentoAvulso(payload);
            showSnackbar(`Lançamento de ${tipo} salvo com sucesso!`, 'success');
            onClose(); // Fecha o modal principal
        } catch (error) {
            showSnackbar(`Erro ao salvar lançamento.`, 'error');
            console.error("Erro no lançamento avulso:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <ToggleButtonGroup
                        color="primary"
                        value={tipo}
                        exclusive
                        onChange={handleTipoChange}
                        fullWidth
                    >
                        <ToggleButton value="receita">Receita</ToggleButton>
                        <ToggleButton value="despesa">Despesa</ToggleButton>
                    </ToggleButtonGroup>
                </Grid>

                <Grid item xs={12}>
                    <TextField name="descricao" label="Descrição" required fullWidth value={formData.descricao || ''} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField name="valor" label="Valor (R$)" type="number" required fullWidth value={formData.valor || ''} onChange={handleChange} />
                </Grid>

                {tipo === 'receita' ? (
                    <>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Forma de Pagamento</InputLabel>
                                <Select name="forma_pagamento" value={formData.forma_pagamento || ''} label="Forma de Pagamento" onChange={handleChange}>
                                    <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                                    <MenuItem value="PIX">PIX</MenuItem>
                                    <MenuItem value="MaquinaCartao">Máquina de Cartão</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <Autocomplete
                                options={pacientes}
                                getOptionLabel={(p) => p.nome_completo}
                                onChange={(e, value) => setFormData(prev => ({ ...prev, paciente: value }))}
                                renderInput={(params) => <TextField {...params} label="Associar a um Paciente (Opcional)" />}
                            />
                        </Grid>
                    </>
                ) : ( // Campos para Despesa
                    <>
                        <Grid item xs={12} sm={6}>
                            <DatePicker
                                label="Data da Despesa"
                                value={formData.data_despesa ? dayjs(formData.data_despesa) : null}
                                onChange={(newValue) => setFormData(prev => ({ ...prev, data_despesa: newValue ? newValue.format('YYYY-MM-DD') : '' }))}
                                sx={{ width: '100%' }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth required>
                                <InputLabel>Categoria da Despesa</InputLabel>
                                <Select name="categoria" value={formData.categoria || ''} label="Categoria da Despesa" onChange={handleChange}>
                                    {categorias.map(cat => (
                                        <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </>
                )}
                
                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                     <Button type="submit" variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Lançamento'}
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
}