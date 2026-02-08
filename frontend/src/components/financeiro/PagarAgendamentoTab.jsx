// src/components/financeiro/PagarAgendamentoTab.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Autocomplete, TextField, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Typography, Button, 
    CircularProgress, Checkbox, Paper, Divider, MenuItem, Grid
} from '@mui/material';
import { pacienteService } from '../../services/pacienteService';
import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import dayjs from 'dayjs';

export default function PagarAgendamentoTab({ onClose }) {
    const [pacientes, setPacientes] = useState([]);
    const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
    const [cobrancas, setCobrancas] = useState([]);
    const [desconto, setDesconto] = useState(0);
    const [selecionados, setSelecionados] = useState([]); // IDs das cobranças
    const [isLoadingCobrancas, setIsLoadingCobrancas] = useState(false);
    
    // Estados de Pagamento
    const [formaPagamento, setFormaPagamento] = useState('PIX');
    const [parcelas, setParcelas] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { showSnackbar } = useSnackbar();

    useEffect(() => {
    let isMounted = true; // Previne erro de update em componente desmontado

    faturamentoService.getPagamentosPendentes()
        .then(response => {
            if (!isMounted) return;
            const pagamentos = response.data || [];
            
            // Usando Map para garantir unicidade com complexidade O(n) em vez de O(n^2)
            const pacientesUnicos = new Map();

            for (const pag of pagamentos) {
                // Verificação de segurança (Short-circuit evaluation)
                const pacienteInfo = pag.paciente;
                if (!pacienteInfo) continue;

                // Suporta tanto objeto quanto ID direto (caso serializer mude)
                const id = typeof pacienteInfo === 'object' ? pacienteInfo.id : pacienteInfo;
                const nome = pag.paciente_nome || pacienteInfo.nome || "Desconhecido";

                if (!pacientesUnicos.has(id)) {
                    pacientesUnicos.set(id, { id, nome_completo: nome });
                }
            }

            setPacientes(Array.from(pacientesUnicos.values()).sort((a, b) => 
                a.nome_completo.localeCompare(b.nome_completo)
            ));
        })
        .catch(err => {
            console.error("Erro ao carregar pacientes", err);
            if(isMounted) showSnackbar('Erro ao carregar lista.', 'error');
        });

    return () => { isMounted = false; };
}, [showSnackbar]);

    useEffect(() => {
        if (pacienteSelecionado) {
            setIsLoadingCobrancas(true);
            faturamentoService.getCobrancasPendentes(pacienteSelecionado.id)
                .then(response => {
                    setCobrancas(response.data);
                    setSelecionados([]); // Reseta seleção ao mudar paciente
                })
                .finally(() => setIsLoadingCobrancas(false));
        }
    }, [pacienteSelecionado]);

    const totalSelecionado = useMemo(() => {
        return cobrancas
            .filter(c => selecionados.includes(c.id))
            .reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
    }, [cobrancas, selecionados]);

    const handleToggleCobranca = (id) => {
        setSelecionados(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const totalComDesconto = useMemo(() => {
        const bruto = cobrancas
            .filter(c => selecionados.includes(c.id))
            .reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
        return bruto - parseFloat(desconto || 0);
    }, [cobrancas, selecionados, desconto]);

    const handleConfirmarBaixa = async () => {
        if (selecionados.length === 0) return showSnackbar('Selecione ao menos um item.', 'warning');
        
        setIsSubmitting(true);
        try {
            // Itera sobre os selecionados para dar baixa
            await Promise.all(selecionados.map(id => 
                faturamentoService.updatePagamento(id, {
                    status: 'Pago',
                    forma_pagamento: formaPagamento,
                    qtd_parcelas: formaPagamento === 'CartaoCredito' ? parcelas : 1,
                    data_pagamento: dayjs().format('YYYY-MM-DD')
                })
            ));
            
            showSnackbar('Recebimento registrado com sucesso!', 'success');
            onClose(); 
        } catch (error) {
            showSnackbar('Erro ao processar baixa.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
    <Box sx={{ minHeight: '400px' }}>
        <Autocomplete
            options={pacientes}
            getOptionLabel={(option) => option.nome_completo || ""}
            value={pacienteSelecionado}
            onChange={(e, nv) => setPacienteSelecionado(nv)}
            renderInput={(params) => <TextField {...params} label="Buscar Paciente" size="small" />}
            sx={{ mb: 2 }}
        />

        {isLoadingCobrancas ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        ) : (
            <Box>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: '250px' }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox"></TableCell>
                                <TableCell sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Data</TableCell>
                                <TableCell sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Procedimento</TableCell>
                                <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Valor</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {cobrancas.map(c => (
                                <TableRow key={c.id} hover onClick={() => handleToggleCobranca(c.id)} sx={{ cursor: 'pointer' }}>
                                    <TableCell padding="checkbox">
                                        <Checkbox size="small" checked={selecionados.includes(c.id)} />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.8rem' }}>{dayjs(c.data_agendamento).format('DD/MM/YYYY')}</TableCell>
                                    <TableCell sx={{ fontSize: '0.8rem' }}>{c.procedimento_nome || c.tipo_agendamento}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valor)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {selecionados.length > 0 && (
                    <Box sx={{ p: 2, bgcolor: '#f0f4fa', borderRadius: 2, border: '1px solid #d1d9e6' }}>
                        <Typography variant="subtitle2" gutterBottom fontWeight="bold" color="primary">
                            Detalhes do Recebimento
                        </Typography>
                        
                        <Grid container spacing={2} sx={{ mt: 0.5 }}>
                            {/* Campo de Desconto */}
                            <Grid item xs={12} md={4}>
                                <TextField 
                                    label="Desconto (R$)" 
                                    type="number" 
                                    size="small" 
                                    fullWidth
                                    value={desconto}
                                    onChange={(e) => setDesconto(e.target.value)}
                                    InputProps={{ startAdornment: <Typography sx={{mr: 1, fontSize: '0.8rem'}}>R$</Typography> }}
                                />
                            </Grid>

                            {/* Forma de Pagamento */}
                            <Grid item xs={12} md={4}>
                                <TextField 
                                    select fullWidth size="small" label="Forma de Pagamento" 
                                    value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}
                                >
                                    {['Dinheiro', 'PIX', 'CartaoDebito', 'CartaoCredito', 'Transferencia'].map(f => (
                                        <MenuItem key={f} value={f}>{f}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            {/* Parcelas (Apenas se for crédito) */}
                            {formaPagamento === 'CartaoCredito' && (
                                <Grid item xs={12} md={4}>
                                    <TextField 
                                        select fullWidth size="small" label="Parcelas" 
                                        value={parcelas} onChange={(e) => setParcelas(e.target.value)}
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                            <MenuItem key={n} value={n}>{n}x</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                            )}
                        </Grid>
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    Valor Bruto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSelecionado)}
                                </Typography>
                                <Typography variant="h6" color="success.main" fontWeight="bold">
                                    Total com Desconto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalComDesconto)}
                                </Typography>
                            </Box>
                            
                            <Button 
                                variant="contained" color="success" 
                                disabled={isSubmitting}
                                onClick={handleConfirmarBaixa}
                                sx={{ fontWeight: 'bold', px: 4 }}
                            >
                                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'CONFIRMAR RECEBIMENTO'}
                            </Button>
                        </Box>
                    </Box>
                )}
            </Box>
        )}
    </Box>
);
}