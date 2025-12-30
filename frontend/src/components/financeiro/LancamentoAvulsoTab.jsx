import React, { useState, useEffect } from 'react';
import {
    Box, Grid, TextField, Button, CircularProgress, Autocomplete, 
    ToggleButton, ToggleButtonGroup, Typography, Paper, InputAdornment, MenuItem,
    FormControlLabel, Switch
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { 
    Person, AccountBalance, AttachMoney, MoneyOff, 
    CreditCard, LocalAtm, QrCode, PointOfSale, Event
} from '@mui/icons-material';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { pacienteService } from '../../services/pacienteService';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function LancamentoAvulsoTab({ onClose }) {
    const [tipo, setTipo] = useState('receita');
    const [origemReceita, setOrigemReceita] = useState('paciente');
    const [jaRecebido, setJaRecebido] = useState(true); 

    const [formData, setFormData] = useState({ qtd_parcelas: 1 });
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
            setFormData({ qtd_parcelas: 1 }); 
            setJaRecebido(true);
        }
    };

    const handleOrigemChange = (event, newOrigem) => {
        if (newOrigem !== null) {
            setOrigemReceita(newOrigem);
            if (newOrigem === 'outros') setFormData(prev => ({ ...prev, paciente: null }));
        }
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePaymentMethod = (method) => {
        setFormData(prev => ({ 
            ...prev, 
            forma_pagamento: method,
            qtd_parcelas: method === 'CartaoCredito' ? prev.qtd_parcelas : 1
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!formData.descricao || !formData.valor) {
            showSnackbar('Preencha descrição e valor.', 'warning');
            return;
        }
        
        if (tipo === 'receita' && jaRecebido && !formData.forma_pagamento) {
            showSnackbar('Selecione a forma de pagamento.', 'warning');
            return;
        }

        setIsSubmitting(true);
        
        const payload = {
            ...formData,
            tipo: tipo,
            paciente: (tipo === 'receita' && origemReceita === 'paciente') ? formData.paciente?.id : null,
            status: jaRecebido ? 'Pago' : 'Pendente' 
        };

        try {
            await faturamentoService.createLancamentoAvulso(payload);
            showSnackbar(`Lançamento salvo!`, 'success');
            onClose(); 
        } catch (error) {
            showSnackbar(`Erro ao salvar.`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Card de Pagamento Ultra Compacto
    const PaymentCard = ({ value, label, icon: Icon }) => {
        const selected = formData.forma_pagamento === value;
        return (
            <Paper
                elevation={0}
                onClick={() => handlePaymentMethod(value)}
                sx={{
                    p: 0.5,
                    cursor: 'pointer',
                    border: selected ? '2px solid #1a233b' : '1px solid #e0e0e0',
                    bgcolor: selected ? '#f0f4fa' : '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '50px',
                    transition: 'all 0.1s',
                    '&:hover': { borderColor: '#1a233b' }
                }}
            >
                <Icon sx={{ fontSize: 18, color: selected ? '#1a233b' : '#757575' }} />
                <Typography variant="caption" sx={{ fontSize: '0.65rem', lineHeight: 1.1, mt: 0.5 }} align="center" fontWeight={selected ? 'bold' : 'normal'} color={selected ? '#1a233b' : 'text.secondary'}>
                    {label}
                </Typography>
            </Paper>
        );
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            
            {/* SELEÇÃO DO TIPO */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <ToggleButtonGroup value={tipo} exclusive onChange={handleTipoChange} size="small" sx={{height: '30px'}}>
                    <ToggleButton value="receita" color="success" sx={{ px: 3, fontSize: '0.75rem' }}>
                        <AttachMoney fontSize="small" sx={{ mr: 0.5, fontSize: '1rem' }} /> RECEITA
                    </ToggleButton>
                    <ToggleButton value="despesa" color="error" sx={{ px: 3, fontSize: '0.75rem' }}>
                        <MoneyOff fontSize="small" sx={{ mr: 0.5, fontSize: '1rem' }} /> DESPESA
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            <Grid container spacing={2}>
                
                {/* --- COLUNA ESQUERDA (Dados) --- */}
                <Grid item xs={12} md={7}>
                    <Paper sx={{ p: 2 }} elevation={1}>
                        
                        {/* --- CORREÇÃO 1: HEADER ALINHADO COM SPACE-BETWEEN E GAP --- */}
                        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1}}>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{color: '#1a233b', fontSize: '0.85rem'}}>
                                Dados Gerais
                            </Typography>
                            
                            <FormControlLabel
                                sx={{ margin: 0 }} // Remove margem negativa padrão
                                control={
                                    <Switch 
                                        size="small"
                                        checked={jaRecebido}
                                        onChange={(e) => setJaRecebido(e.target.checked)}
                                        color={tipo === 'receita' ? "success" : "error"}
                                    />
                                }
                                label={
                                    <Typography fontSize="0.7rem" fontWeight="bold" sx={{minWidth: '60px', textAlign: 'right'}}>
                                        {jaRecebido ? (tipo === 'receita' ? "RECEBIDO" : "PAGO") : "PENDENTE"}
                                    </Typography>
                                }
                            />
                        </Box>
                        
                        {tipo === 'receita' && (
                            <Box sx={{ mb: 1.5 }}>
                                {/* --- CORREÇÃO 2: TEXTO MENOR NO BOTÃO PARA NÃO QUEBRAR --- */}
                                <ToggleButtonGroup
                                    value={origemReceita}
                                    exclusive
                                    onChange={handleOrigemChange}
                                    size="small"
                                    fullWidth
                                    sx={{ mb: 1, height: '32px' }}
                                >
                                    <ToggleButton value="paciente" sx={{fontSize: '0.7rem', px: 1}}>
                                        <Person fontSize="small" sx={{mr:0.5}}/> Paciente
                                    </ToggleButton>
                                    <ToggleButton value="outros" sx={{fontSize: '0.7rem', px: 1, whiteSpace: 'nowrap'}}>
                                        <AccountBalance fontSize="small" sx={{mr:0.5}}/> Outros / Sócios
                                    </ToggleButton>
                                </ToggleButtonGroup>

                                {origemReceita === 'paciente' ? (
                                    <Autocomplete
                                        size="small"
                                        options={pacientes}
                                        getOptionLabel={(p) => p.nome_completo}
                                        value={formData.paciente || null}
                                        onChange={(e, value) => setFormData(prev => ({ ...prev, paciente: value }))}
                                        renderInput={(params) => (
                                            <TextField {...params} label="Paciente" placeholder="Buscar..." margin="dense" 
                                                InputLabelProps={{style: {fontSize: '0.85rem'}}}
                                            />
                                        )}
                                    />
                                ) : (
                                    <TextField disabled fullWidth value="Sem vínculo (Caixa Geral)" size="small" margin="dense" sx={{ bgcolor: '#f5f5f5' }} InputProps={{style: {fontSize: '0.85rem'}}} />
                                )}
                            </Box>
                        )}

                        <TextField 
                            name="descricao" 
                            label="Descrição" 
                            size="small"
                            margin="dense"
                            required 
                            fullWidth 
                            value={formData.descricao || ''} 
                            onChange={handleChange} 
                            InputLabelProps={{style: {fontSize: '0.85rem'}}}
                            InputProps={{style: {fontSize: '0.9rem'}}}
                        />
                        <Grid item xs={12} sm={6}>
    <DatePicker
        label="Data de Vencimento"
        value={formData.data_vencimento ? dayjs(formData.data_vencimento) : dayjs()} // Padrão hoje
        onChange={(newValue) => setFormData(prev => ({ ...prev, data_vencimento: newValue ? newValue.format('YYYY-MM-DD') : '' }))}
        slotProps={{ 
            textField: { 
                size: 'small', 
                margin: 'dense', 
                fullWidth: true,
                helperText: "Para controle de fluxo futuro"
            } 
        }}
    />
</Grid>
                        
                    
                        {tipo === 'despesa' && (
                            <Grid container spacing={1}>
                                <Grid item xs={6}>
                                    <TextField select name="categoria" label="Categoria" size="small" margin="dense" required fullWidth value={formData.categoria || ''} onChange={handleChange} SelectProps={{ native: true }} InputLabelProps={{style: {fontSize: '0.85rem'}}}>
                                        <option value="">Selecione...</option>
                                        {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
                                    </TextField>
                                </Grid>
                                <Grid item xs={6}>
                                    <DatePicker
                                        label="Data"
                                        value={formData.data_despesa ? dayjs(formData.data_despesa) : null}
                                        onChange={(newValue) => setFormData(prev => ({ ...prev, data_despesa: newValue ? newValue.format('YYYY-MM-DD') : '' }))}
                                        slotProps={{ textField: { size: 'small', margin: 'dense', fullWidth: true } }}
                                    />
                                </Grid>
                            </Grid>
                        )}
                    </Paper>
                </Grid>

                {/* --- COLUNA DIREITA (Financeiro) --- */}
                <Grid item xs={12} md={5}>
                    <Paper sx={{ p: 2, height: '100%', bgcolor: '#fafafa', display: 'flex', flexDirection: 'column' }} elevation={0} variant="outlined">
                        
                        <TextField 
                            name="valor" 
                            label="Valor Total" 
                            type="number" 
                            size="small"
                            margin="dense"
                            required 
                            fullWidth 
                            value={formData.valor || ''} 
                            onChange={handleChange} 
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><Typography fontSize="0.8rem">R$</Typography></InputAdornment>,
                                style: { fontWeight: 'bold', color: tipo === 'receita' ? '#2e7d32' : '#c62828', fontSize: '1rem' }
                            }}
                            InputLabelProps={{style: {fontSize: '0.85rem'}}}
                            sx={{ mb: 1.5, bgcolor: '#fff' }}
                        />

                        {tipo === 'receita' && jaRecebido && (
                            <>
                                <Typography variant="caption" fontWeight="bold" color="text.secondary" mb={0.5} display="block" sx={{fontSize: '0.7rem'}}>
                                    FORMA DE PAGAMENTO
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5, mb: 1.5 }}>
                                    <PaymentCard value="Dinheiro" label="Dinheiro" icon={LocalAtm} />
                                    <PaymentCard value="PIX" label="PIX" icon={QrCode} />
                                    <PaymentCard value="CartaoDebito" label="Débito" icon={CreditCard} />
                                    <PaymentCard value="CartaoCredito" label="Crédito" icon={CreditCard} />
                                    <PaymentCard value="MaquinaCartao" label="Maq." icon={PointOfSale} />
                                </Box>

                                {formData.forma_pagamento === 'CartaoCredito' && (
                                    <Box sx={{ p: 1, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid #90caf9', mb: 1 }}>
                                        <TextField
                                            select
                                            label="Parcelamento"
                                            value={formData.qtd_parcelas || 1}
                                            onChange={(e) => setFormData(prev => ({ ...prev, qtd_parcelas: Number(e.target.value) }))}
                                            fullWidth
                                            size="small"
                                            margin="none"
                                            variant="standard"
                                            InputProps={{ disableUnderline: true, style: { fontSize: '0.9rem', color: '#1565c0', fontWeight: 'bold' } }}
                                        >
                                            {[...Array(12)].map((_, i) => (
                                                <MenuItem key={i + 1} value={i + 1}>
                                                    {i + 1}x {formData.valor ? `de R$ ${(formData.valor / (i + 1)).toFixed(2)}` : ''}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </Box>
                                )}
                            </>
                        )}

                        {tipo === 'receita' && !jaRecebido && (
                            <Box sx={{ p: 1.5, bgcolor: '#fff3e0', borderRadius: 1, border: '1px dashed #ffb74d', mb: 'auto' }}>
                                <Typography variant="caption" color="warning.main" display="flex" alignItems="center">
                                    <Event fontSize="small" sx={{mr: 0.5}} />
                                    Ficará como "A Receber".
                                </Typography>
                            </Box>
                        )}
                        
                        <Box sx={{ mt: 'auto' }}>
                            <Button 
                                type="submit" 
                                variant="contained" 
                                fullWidth
                                disabled={isSubmitting}
                                sx={{ py: 0.8, fontSize: '0.8rem', fontWeight: 'bold', bgcolor: '#1a233b' }}
                            >
                                {isSubmitting ? <CircularProgress size={18} color="inherit" /> : 'CONFIRMAR'}
                            </Button>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}