// src/components/financeiro/LancamentoAvulsoTab.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Grid, TextField, Button, CircularProgress, Autocomplete, FormControl, InputLabel, Select, MenuItem,
    ToggleButton, ToggleButtonGroup, Typography, Paper, Divider, Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Person, AccountBalance, AttachMoney, MoneyOff } from '@mui/icons-material';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { pacienteService } from '../../services/pacienteService';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function LancamentoAvulsoTab({ onClose }) {
    // Tipos de lançamento: 'receita' ou 'despesa'
    const [tipo, setTipo] = useState('receita');
    
    // Origem da Receita: 'paciente' ou 'outros'
    const [origemReceita, setOrigemReceita] = useState('paciente');

    const [formData, setFormData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [pacientes, setPacientes] = useState([]);
    const [categorias, setCategorias] = useState([]);
    
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        pacienteService.getPacientes().then(res => setPacientes(res.data));
        faturamentoService.getCategoriasDespesa().then(res => setCategorias(res.data));
    }, []);

    const handleTipoChange = (event, newTipo) => {
        if (newTipo !== null) {
            setTipo(newTipo);
            setFormData({}); 
        }
    };

    const handleOrigemChange = (event, newOrigem) => {
        if (newOrigem !== null) {
            setOrigemReceita(newOrigem);
            // Limpa paciente se mudar para 'outros'
            if (newOrigem === 'outros') {
                setFormData(prev => ({ ...prev, paciente: null }));
            }
        }
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        
        // Validação simples
        if (!formData.descricao || !formData.valor) {
            showSnackbar('Preencha descrição e valor.', 'warning');
            return;
        }
        if (tipo === 'receita' && origemReceita === 'paciente' && !formData.paciente) {
            showSnackbar('Selecione um paciente ou mude a origem.', 'warning');
            return;
        }

        setIsSubmitting(true);
        
        const payload = {
            ...formData,
            tipo: tipo,
            // Se for outros, envia null no paciente. Se for paciente, envia o ID.
            paciente: (tipo === 'receita' && origemReceita === 'paciente') ? formData.paciente?.id : null,
        };

        try {
            await faturamentoService.createLancamentoAvulso(payload);
            showSnackbar(`Lançamento salvo com sucesso!`, 'success');
            onClose(); 
        } catch (error) {
            showSnackbar(`Erro ao salvar lançamento.`, 'error');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            
            {/* 1. SELEÇÃO DO TIPO (RECEITA / DESPESA) */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <ToggleButtonGroup
                    value={tipo}
                    exclusive
                    onChange={handleTipoChange}
                    aria-label="Tipo de Lançamento"
                >
                    <ToggleButton value="receita" color="success" sx={{ px: 4 }}>
                        <AttachMoney sx={{ mr: 1 }} /> Receita
                    </ToggleButton>
                    <ToggleButton value="despesa" color="error" sx={{ px: 4 }}>
                        <MoneyOff sx={{ mr: 1 }} /> Despesa
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            <Grid container spacing={2}>
                
                {/* --- CAMPOS ESPECÍFICOS DE RECEITA --- */}
                {tipo === 'receita' && (
                    <Grid item xs={12}>
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Origem do Dinheiro
                            </Typography>
                            
                            {/* Toggle: Paciente vs Outros */}
                            <ToggleButtonGroup
                                value={origemReceita}
                                exclusive
                                onChange={handleOrigemChange}
                                size="small"
                                sx={{ mb: 2, width: '100%' }}
                            >
                                <ToggleButton value="paciente" sx={{ flex: 1 }}>
                                    <Person sx={{ mr: 1, fontSize: 20 }} /> Paciente
                                </ToggleButton>
                                <ToggleButton value="outros" sx={{ flex: 1 }}>
                                    <AccountBalance sx={{ mr: 1, fontSize: 20 }} /> Outros (Sócios, etc)
                                </ToggleButton>
                            </ToggleButtonGroup>

                            {/* Campo de Paciente (VISUAL BOX MELHORADO) */}
                            {origemReceita === 'paciente' ? (
                                <Autocomplete
                                    options={pacientes}
                                    getOptionLabel={(p) => p.nome_completo}
                                    value={formData.paciente || null}
                                    onChange={(e, value) => setFormData(prev => ({ ...prev, paciente: value }))}
                                    renderInput={(params) => (
                                        <TextField 
                                            {...params} 
                                            label="Buscar Paciente" 
                                            placeholder="Digite o nome..." 
                                            variant="outlined"
                                            fullWidth
                                            helperText="Vincular receita ao histórico financeiro do paciente"
                                        />
                                    )}
                                />
                            ) : (
                                <Box sx={{ p: 1, bgcolor: '#e8f5e9', borderRadius: 1, border: '1px dashed #66bb6a' }}>
                                    <Typography variant="body2" color="success.main" align="center">
                                        Entrada avulsa sem vínculo com prontuário.
                                        <br/>
                                        Ex: Aporte de capital, Venda de equipamento, Rendimentos.
                                    </Typography>
                                </Box>
                            )}
                        </Paper>
                    </Grid>
                )}

                {/* --- CAMPOS COMUNS --- */}
                <Grid item xs={12}>
                    <TextField 
                        name="descricao" 
                        label={tipo === 'receita' && origemReceita === 'outros' ? "Descrição (Ex: Aporte Sócio)" : "Descrição"} 
                        required 
                        fullWidth 
                        value={formData.descricao || ''} 
                        onChange={handleChange} 
                    />
                </Grid>

                <Grid item xs={6}>
                    <TextField 
                        name="valor" 
                        label="Valor (R$)" 
                        type="number" 
                        required 
                        fullWidth 
                        value={formData.valor || ''} 
                        onChange={handleChange} 
                    />
                </Grid>

                {/* Campos condicionais baseados no TIPO */}
                {tipo === 'receita' ? (
                    <Grid item xs={6}>
                        <FormControl fullWidth>
                            <InputLabel>Forma Pagamento</InputLabel>
                            <Select 
                                name="forma_pagamento" 
                                value={formData.forma_pagamento || ''} 
                                label="Forma Pagamento" 
                                onChange={handleChange}
                            >
                                <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                                <MenuItem value="PIX">PIX</MenuItem>
                                <MenuItem value="CartaoCredito">Crédito</MenuItem>
                                <MenuItem value="CartaoDebito">Débito</MenuItem>
                                <MenuItem value="MaquinaCartao">Máquina Cartão</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                ) : (
                    <>
                        <Grid item xs={6}>
                            <DatePicker
                                label="Data Despesa"
                                value={formData.data_despesa ? dayjs(formData.data_despesa) : null}
                                onChange={(newValue) => setFormData(prev => ({ ...prev, data_despesa: newValue ? newValue.format('YYYY-MM-DD') : '' }))}
                                sx={{ width: '100%' }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth required>
                                <InputLabel>Categoria</InputLabel>
                                <Select 
                                    name="categoria" 
                                    value={formData.categoria || ''} 
                                    label="Categoria" 
                                    onChange={handleChange}
                                >
                                    {categorias.map(cat => (
                                        <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </>
                )}
                
                <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                     <Button 
                        type="submit" 
                        variant="contained" 
                        size="large"
                        disabled={isSubmitting}
                        sx={{ minWidth: 150 }}
                     >
                        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Confirmar Lançamento'}
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
}