import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Box, Grid, TextField, 
    Button, CircularProgress, ToggleButton, ToggleButtonGroup, Typography, 
    Paper, InputAdornment, MenuItem, Switch, Divider, IconButton, Autocomplete
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AttachMoney, MoneyOff, CalendarMonth, InfoOutlined, Close, AddBox } from '@mui/icons-material';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function ModalLancamentoAvulso({ open, onClose, onSuccess, initialType = 'despesa' }) {
    const [tipo, setTipo] = useState(initialType);
    const [jaLiquidado, setJaLiquidado] = useState(false); // false = Pendente, true = Pago
    
    const [categorias, setCategorias] = useState([]);
    const [pacientes, setPacientes] = useState([]); // Apenas para Receitas Avulsas
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSnackbar } = useSnackbar();

    const [formData, setFormData] = useState({
        descricao: '',
        valor: '',
        categoria: '', 
        paciente_id: null,
        forma_pagamento: 'PIX',
        data_vencimento: dayjs(),
        data_pagamento: dayjs(),
        qtd_parcelas: 1
    });

    // Resetar form ao abrir
    useEffect(() => {
        if (open) {
            setTipo(initialType);
            setJaLiquidado(false);
            setFormData({
                descricao: '', valor: '', categoria: '', paciente_id: null,
                forma_pagamento: 'PIX', data_vencimento: dayjs(), data_pagamento: dayjs(), qtd_parcelas: 1
            });
            carregarDadosIniciais();
        }
    }, [open, initialType]);

    const carregarDadosIniciais = async () => {
        try {
            const resCat = await faturamentoService.getCategoriasDespesa();
            setCategorias(resCat.data || []);
            
            // Busca pacientes de forma silenciosa para o Autocomplete
            import('../../services/pacienteService').then(mod => {
                mod.pacienteService.getPacientes().then(res => setPacientes(res.data || []));
            }).catch(() => console.warn("Serviço de paciente não carregou."));
        } catch (error) { console.error(error); }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Cálculos em Tempo Real para o Resumo
    const baseValor = parseFloat(formData.valor) || 0;
    const parcelas = parseInt(formData.qtd_parcelas) || 1;
    const totalCalculado = baseValor * parcelas;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.descricao || !formData.valor) {
            return showSnackbar('Preencha descrição e valor.', 'warning');
        }
        if (tipo === 'despesa' && !formData.categoria) {
            return showSnackbar('Selecione uma categoria para a despesa.', 'warning');
        }

        setIsSubmitting(true);

        try {
            const basePayload = {
                descricao: formData.descricao,
                forma_pagamento: formData.forma_pagamento,
                data_vencimento: dayjs(formData.data_vencimento).format('YYYY-MM-DD'),
                status: jaLiquidado ? 'Pago' : 'Pendente', 
                pago: jaLiquidado, 
                data_pagamento: jaLiquidado ? dayjs(formData.data_pagamento).format('YYYY-MM-DD') : null,
            };

            // LÓGICA DE CRIAÇÃO PRESERVADA DO ANTIGO COMPONENTE
            if (tipo === 'despesa') {
                await faturamentoService.createDespesa({
                    ...basePayload,
                    valor: baseValor, // O backend repetirá este valor X vezes
                    categoria: formData.categoria,
                    data_despesa: basePayload.data_vencimento,
                    qtd_parcelas: parcelas,
                    repetir_valor: true 
                });
            } else {
                await faturamentoService.createLancamentoAvulso({
                    ...basePayload,
                    valor: totalCalculado, // Para receita, o backend divide o total sozinho
                    qtd_parcelas: parcelas,
                    paciente: formData.paciente_id ? formData.paciente_id.id : null 
                });
            }
            
            showSnackbar(`${tipo === 'despesa' ? 'Despesa' : 'Receita'} registrada com sucesso!`, 'success');
            if (onSuccess) onSuccess();
            onClose();

        } catch (error) {
            showSnackbar('Erro ao registrar lançamento.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const parcelasReceita = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const parcelasDespesa = Array.from({ length: 72 }, (_, i) => i + 1);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" disableEscapeKeyDown={isSubmitting}>
            
            {/* CABEÇALHO TASY */}
            <DialogTitle sx={{ p: 0, bgcolor: '#f8f9fa', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AddBox color="primary" />
                    <Typography variant="subtitle1" fontWeight="bold" color="#343a40">
                        Novo Lançamento
                    </Typography>
                </Box>
                <IconButton onClick={onClose} disabled={isSubmitting} sx={{ mr: 1 }}><Close /></IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 3, bgcolor: '#ffffff' }}>
                <Box component="form" id="form-lancamento" onSubmit={handleSubmit}>
                    
                    {/* TOGGLE TIPO DE LANÇAMENTO */}
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                        <ToggleButtonGroup 
                            value={tipo} exclusive 
                            onChange={(e, newTipo) => { if(newTipo) setTipo(newTipo) }} 
                            size="small"
                        >
                            <ToggleButton value="receita" color="success" sx={{ px: 4, fontWeight: 'bold' }}>
                                <AttachMoney sx={{ mr: 1, fontSize: 18 }} /> RECEITA
                            </ToggleButton>
                            <ToggleButton value="despesa" color="error" sx={{ px: 4, fontWeight: 'bold' }}>
                                <MoneyOff sx={{ mr: 1, fontSize: 18 }} /> DESPESA
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    <Grid container spacing={3}>
                        
                        {/* COLUNA ESQUERDA: DADOS BASE */}
                        <Grid item xs={12} md={7}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                
                                <div className="tasy-section-header" style={{ margin: 0 }}>Informações Gerais</div>

                                <TextField 
                                    label="Descrição do Lançamento" name="descricao" fullWidth required autoFocus size="small"
                                    value={formData.descricao} onChange={handleChange}
                                    placeholder={tipo === 'despesa' ? "Ex: Aluguel, Equipamento" : "Ex: Venda de Produto, Aporte"}
                                />

                                {tipo === 'despesa' ? (
                                    <TextField select label="Categoria da Despesa" name="categoria" fullWidth required size="small" value={formData.categoria} onChange={handleChange}>
                                        {categorias.map((cat) => (
                                            <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>
                                        ))}
                                    </TextField>
                                ) : (
                                    <Autocomplete
                                        options={pacientes}
                                        getOptionLabel={(option) => option.nome_completo || ""}
                                        value={formData.paciente_id}
                                        onChange={(e, nv) => setFormData({...formData, paciente_id: nv})}
                                        renderInput={(params) => <TextField {...params} label="Vincular Paciente (Opcional)" size="small" />}
                                    />
                                )}

                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <DatePicker
                                        label={tipo === 'despesa' ? "Vencimento Inicial" : "Data Prevista"}
                                        value={formData.data_vencimento}
                                        onChange={(v) => setFormData(prev => ({ ...prev, data_vencimento: v }))}
                                        slotProps={{ textField: { fullWidth: true, required: true, size: 'small' } }}
                                    />
                                    
                                    <TextField
                                        select label="Recorrência / Parcelas" name="qtd_parcelas" size="small"
                                        value={formData.qtd_parcelas} onChange={handleChange} sx={{ minWidth: 140 }}
                                        InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonth fontSize="small"/></InputAdornment> }}
                                    >
                                        {(tipo === 'receita' ? parcelasReceita : parcelasDespesa).map((num) => (
                                            <MenuItem key={num} value={num}>{num === 1 ? 'Lançamento Único' : `${num}x Meses`}</MenuItem>
                                        ))}
                                    </TextField>
                                </Box>
                            </Box>
                        </Grid>

                        {/* COLUNA DIREITA: VALORES E STATUS */}
                        <Grid item xs={12} md={5}>
                            <Paper elevation={0} sx={{ p: 2.5, height: '100%', bgcolor: '#f8f9fa', border: '1px solid #dee2e6', display: 'flex', flexDirection: 'column' }}>
                                
                                <Typography variant="overline" color="text.secondary" fontWeight="bold" lineHeight={1.2} mb={1}>
                                    {parcelas > 1 ? "VALOR UNITÁRIO (POR MÊS)" : "VALOR DO LANÇAMENTO"}
                                </Typography>
                                
                                <TextField
                                    name="valor" fullWidth required type="number" size="small"
                                    value={formData.valor} onChange={handleChange}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                        style: { fontSize: '1.2rem', fontWeight: 'bold', color: tipo === 'receita' ? '#2e7d32' : '#d9534f' }
                                    }}
                                    sx={{ mb: 2, bgcolor: '#ffffff' }}
                                />

                                {/* CAIXA DE STATUS (PAGO / PENDENTE) */}
                                <Paper variant="outlined" sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: jaLiquidado ? '#e8f5e9' : '#fff3e0', borderColor: jaLiquidado ? '#c8e6c9' : '#ffe0b2' }}>
                                    <Box>
                                        <Typography variant="caption" display="block" color="text.secondary">STATUS FINANCEIRO</Typography>
                                        <Typography variant="subtitle2" fontWeight="bold" color={jaLiquidado ? "success.main" : "warning.dark"}>
                                            {jaLiquidado ? "PAGO / EFETIVADO" : "PENDENTE / A PAGAR"}
                                        </Typography>
                                    </Box>
                                    <Switch checked={jaLiquidado} onChange={(e) => setJaLiquidado(e.target.checked)} color={tipo === 'receita' ? "success" : "error"} />
                                </Paper>

                                {jaLiquidado && (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                                        <DatePicker
                                            label="Data da Baixa (Caixa)"
                                            value={formData.data_pagamento}
                                            onChange={(v) => setFormData(prev => ({ ...prev, data_pagamento: v }))}
                                            slotProps={{ textField: { fullWidth: true, size: 'small', sx:{bgcolor:'#fff'} } }}
                                        />
                                        <TextField
                                            select label="Meio de Pagamento" name="forma_pagamento" fullWidth size="small" sx={{bgcolor:'#fff'}}
                                            value={formData.forma_pagamento} onChange={handleChange}
                                        >
                                            <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                                            <MenuItem value="PIX">PIX</MenuItem>
                                            <MenuItem value="CartaoCredito">Cartão de Crédito</MenuItem>
                                            <MenuItem value="CartaoDebito">Cartão de Débito</MenuItem>
                                            <MenuItem value="Boleto">Boleto</MenuItem>
                                            <MenuItem value="Transferencia">Transferência Bancária</MenuItem>
                                        </TextField>
                                    </Box>
                                )}

                                <Box sx={{ flexGrow: 1 }} />
                                <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

                                {/* RESUMO MATEMÁTICO */}
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                        <InfoOutlined color="action" fontSize="small" />
                                        <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                            TOTAL {tipo === 'receita' ? "GERADO" : "COMPROMETIDO"}:
                                        </Typography>
                                    </Box>
                                    <Typography variant="h6" fontWeight="900" color={tipo === 'receita' ? "success.main" : "error.main"} sx={{ lineHeight: 1 }}>
                                        {formatMoney(totalCalculado)}
                                    </Typography>
                                </Box>
                                
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
            
            <DialogActions sx={{ p: 2, bgcolor: '#f8f9fa', borderTop: '1px solid #e9ecef' }}>
                <Button onClick={onClose} disabled={isSubmitting} sx={{ color: '#495057' }}>Cancelar</Button>
                <Button 
                    type="submit" form="form-lancamento"
                    variant="contained" 
                    color={tipo === 'receita' ? "success" : "error"} 
                    disabled={isSubmitting}
                    sx={{ px: 4, fontWeight: 'bold', borderRadius: 1 }}
                >
                    {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "Gravar Lançamento"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}