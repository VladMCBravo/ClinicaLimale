// src/components/financeiro/LancamentoAvulsoTab.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Grid, TextField, Button, CircularProgress, Autocomplete, 
    ToggleButton, ToggleButtonGroup, Typography, Paper, Slider, InputAdornment
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { 
    Person, AccountBalance, AttachMoney, MoneyOff, 
    CreditCard, LocalAtm, QrCode, PointOfSale 
} from '@mui/icons-material';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { pacienteService } from '../../services/pacienteService';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function LancamentoAvulsoTab({ onClose }) {
    const [tipo, setTipo] = useState('receita');
    const [origemReceita, setOrigemReceita] = useState('paciente');
    
    // Estado do Formulário
    const [formData, setFormData] = useState({
        qtd_parcelas: 1,
        status: 'Pago' // Padrão
    });
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
            setFormData({ qtd_parcelas: 1, status: 'Pago' }); 
        }
    };

    const handleOrigemChange = (event, newOrigem) => {
        if (newOrigem !== null) {
            setOrigemReceita(newOrigem);
            if (newOrigem === 'outros') {
                setFormData(prev => ({ ...prev, paciente: null }));
            }
        }
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handler exclusivo para os cards de pagamento
    const handlePaymentMethod = (method) => {
        setFormData(prev => ({ 
            ...prev, 
            forma_pagamento: method,
            // Se for Crédito, status padrão vira Pendente (receber no futuro), senão Pago
            status: method === 'CartaoCredito' ? 'Pendente' : 'Pago'
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        
        if (!formData.descricao || !formData.valor) {
            showSnackbar('Preencha descrição e valor.', 'warning');
            return;
        }

        setIsSubmitting(true);
        
        const payload = {
            ...formData,
            tipo: tipo,
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

    // Componente auxiliar para Card de Pagamento
    const PaymentCard = ({ value, label, icon: Icon }) => {
        const selected = formData.forma_pagamento === value;
        return (
            <Paper
                elevation={0}
                onClick={() => handlePaymentMethod(value)}
                sx={{
                    p: 2,
                    cursor: 'pointer',
                    border: selected ? '2px solid #1a233b' : '1px solid #e0e0e0',
                    bgcolor: selected ? '#f0f4fa' : '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: '#1a233b', transform: 'translateY(-2px)' }
                }}
            >
                <Icon sx={{ fontSize: 28, color: selected ? '#1a233b' : '#757575', mb: 1 }} />
                <Typography variant="caption" fontWeight={selected ? 'bold' : 'normal'} color={selected ? '#1a233b' : 'text.secondary'}>
                    {label}
                </Typography>
            </Paper>
        );
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 0 }}>
            
            {/* 1. SELEÇÃO DO TIPO (RECEITA / DESPESA) */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <ToggleButtonGroup
                    value={tipo}
                    exclusive
                    onChange={handleTipoChange}
                    size="large"
                >
                    <ToggleButton value="receita" color="success" sx={{ px: 5, py: 1.5 }}>
                        <AttachMoney sx={{ mr: 1 }} /> RECEITA
                    </ToggleButton>
                    <ToggleButton value="despesa" color="error" sx={{ px: 5, py: 1.5 }}>
                        <MoneyOff sx={{ mr: 1 }} /> DESPESA
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            <Grid container spacing={3}>
                
                {/* --- COLUNA DA ESQUERDA: DADOS GERAIS --- */}
                <Grid item xs={12} md={7}>
                    <Paper sx={{ p: 3 }} elevation={1}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{color: '#1a233b'}}>
                            Detalhes do Lançamento
                        </Typography>
                        
                        {tipo === 'receita' && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                                    Origem:
                                </Typography>
                                <ToggleButtonGroup
                                    value={origemReceita}
                                    exclusive
                                    onChange={handleOrigemChange}
                                    size="small"
                                    fullWidth
                                    sx={{ mb: 2 }}
                                >
                                    <ToggleButton value="paciente"><Person sx={{mr:1}}/> Paciente</ToggleButton>
                                    <ToggleButton value="outros"><AccountBalance sx={{mr:1}}/> Outros (Sócio/Invest)</ToggleButton>
                                </ToggleButtonGroup>

                                {origemReceita === 'paciente' ? (
                                    <Autocomplete
                                        options={pacientes}
                                        getOptionLabel={(p) => p.nome_completo}
                                        value={formData.paciente || null}
                                        onChange={(e, value) => setFormData(prev => ({ ...prev, paciente: value }))}
                                        renderInput={(params) => <TextField {...params} label="Selecione o Paciente" fullWidth />}
                                    />
                                ) : (
                                    <TextField 
                                        disabled 
                                        fullWidth 
                                        value="Entrada sem vínculo (Caixa Geral)" 
                                        size="small"
                                        sx={{ bgcolor: '#f5f5f5' }}
                                    />
                                )}
                            </Box>
                        )}

                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField 
                                    name="descricao" 
                                    label="Descrição" 
                                    placeholder={tipo==='receita' ? "Ex: Consulta Particular" : "Ex: Compra de Material"}
                                    required 
                                    fullWidth 
                                    value={formData.descricao || ''} 
                                    onChange={handleChange} 
                                />
                            </Grid>
                            
                            {/* Se for Despesa, mostra Categoria e Data */}
                            {tipo === 'despesa' && (
                                <>
                                    <Grid item xs={6}>
                                        <TextField
                                            select
                                            name="categoria"
                                            label="Categoria"
                                            required
                                            fullWidth
                                            value={formData.categoria || ''}
                                            onChange={handleChange}
                                            SelectProps={{ native: true }}
                                        >
                                            <option value="">Selecione...</option>
                                            {categorias.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.nome}</option>
                                            ))}
                                        </TextField>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <DatePicker
                                            label="Data"
                                            value={formData.data_despesa ? dayjs(formData.data_despesa) : null}
                                            onChange={(newValue) => setFormData(prev => ({ ...prev, data_despesa: newValue ? newValue.format('YYYY-MM-DD') : '' }))}
                                            sx={{ width: '100%' }}
                                        />
                                    </Grid>
                                </>
                            )}
                        </Grid>
                    </Paper>
                </Grid>

                {/* --- COLUNA DA DIREITA: VALORES E PAGAMENTO --- */}
                <Grid item xs={12} md={5}>
                    <Paper sx={{ p: 3, height: '100%', bgcolor: '#fafafa' }} elevation={0} variant="outlined">
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{color: '#1a233b'}}>
                            Financeiro
                        </Typography>

                        <TextField 
                            name="valor" 
                            label="Valor Total" 
                            type="number" 
                            required 
                            fullWidth 
                            value={formData.valor || ''} 
                            onChange={handleChange} 
                            InputProps={{
                                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                style: { fontSize: '1.2rem', fontWeight: 'bold', color: tipo === 'receita' ? '#2e7d32' : '#c62828' }
                            }}
                            sx={{ mb: 3, bgcolor: '#fff' }}
                        />

                        {tipo === 'receita' && (
                            <>
                                <Typography variant="caption" fontWeight="bold" color="text.secondary" mb={1} display="block">
                                    FORMA DE PAGAMENTO
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 3 }}>
                                    <PaymentCard value="Dinheiro" label="Dinheiro" icon={LocalAtm} />
                                    <PaymentCard value="PIX" label="PIX" icon={QrCode} />
                                    <PaymentCard value="CartaoDebito" label="Débito" icon={CreditCard} />
                                    <PaymentCard value="CartaoCredito" label="Crédito" icon={CreditCard} />
                                    <PaymentCard value="MaquinaCartao" label="Maquininha" icon={PointOfSale} />
                                </Box>

                                {/* PARCELAMENTO - SÓ APARECE SE FOR CRÉDITO */}
                                {formData.forma_pagamento === 'CartaoCredito' && (
                                    <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2, border: '1px solid #90caf9' }}>
                                        <Typography variant="body2" fontWeight="bold" color="primary" gutterBottom>
                                            Parcelamento no Cartão
                                        </Typography>
                                        <Grid container spacing={2} alignItems="center">
                                            <Grid item xs={8}>
                                                <Slider
                                                    value={formData.qtd_parcelas || 1}
                                                    onChange={(e, val) => setFormData(prev => ({ ...prev, qtd_parcelas: val }))}
                                                    step={1}
                                                    marks
                                                    min={1}
                                                    max={12}
                                                    valueLabelDisplay="auto"
                                                />
                                            </Grid>
                                            <Grid item xs={4}>
                                                <TextField
                                                    label="Vezes"
                                                    type="number"
                                                    size="small"
                                                    value={formData.qtd_parcelas || 1}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, qtd_parcelas: e.target.value }))}
                                                />
                                            </Grid>
                                        </Grid>
                                        <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                                            {(formData.valor && formData.qtd_parcelas > 1) 
                                                ? `${formData.qtd_parcelas}x de R$ ${(formData.valor / formData.qtd_parcelas).toFixed(2)}`
                                                : 'À vista'
                                            }
                                        </Typography>
                                    </Box>
                                )}
                            </>
                        )}
                    </Paper>
                </Grid>

                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                     <Button 
                        type="submit" 
                        variant="contained" 
                        size="large"
                        disabled={isSubmitting}
                        sx={{ px: 5, py: 1.5, fontSize: '1rem', fontWeight: 'bold', bgcolor: '#1a233b' }}
                     >
                        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'CONFIRMAR LANÇAMENTO'}
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
}