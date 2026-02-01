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
    const [selecionados, setSelecionados] = useState([]); // IDs das cobranças
    const [isLoadingCobrancas, setIsLoadingCobrancas] = useState(false);
    
    // Estados de Pagamento
    const [formaPagamento, setFormaPagamento] = useState('PIX');
    const [parcelas, setParcelas] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { showSnackbar } = useSnackbar();

    useEffect(() => {
    console.log("[DEBUG-UI] Solicitando lista de pacientes devedores...");
    faturamentoService.getPagamentosPendentes()
        .then(response => {
            // A API envia uma lista de PAGAMENTOS
            const pagamentos = response.data || [];
            console.log("[DEBUG-UI] Pagamentos brutos recebidos:", pagamentos);
            
            const pacientesMap = new Map();

            pagamentos.forEach(pag => {
                // Verificamos se o objeto 'paciente' existe dentro do pagamento
                // IMPORTANTE: Se o backend enviar apenas o ID no campo 'paciente', 
                // usamos o 'paciente_nome' que criamos no serializer.
                if (pag.paciente) {
                    const idPaciente = typeof pag.paciente === 'object' ? pag.paciente.id : pag.paciente;
                    
                    if (!pacientesMap.has(idPaciente)) {
                        pacientesMap.set(idPaciente, {
                            id: idPaciente,
                            nome_completo: pag.paciente_nome || "Paciente sem Nome"
                        });
                    }
                }
            });

            // Convertemos o Map de volta para uma lista de objetos
            const listaFinal = Array.from(pacientesMap.values());
            
            console.log("[DEBUG-UI] Lista final para o Autocomplete:", listaFinal);
            
            setPacientes(listaFinal.sort((a, b) => 
                a.nome_completo.localeCompare(b.nome_completo)
            ));
        })
        .catch(err => {
            console.error("[DEBUG-UI] Erro:", err);
            showSnackbar('Erro ao carregar devedores.', 'error');
        });
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
                getOptionLabel={(option) => option.nome_completo}
                value={pacienteSelecionado}
                onChange={(e, nv) => setPacienteSelecionado(nv)}
                renderInput={(params) => <TextField {...params} label="Buscar Paciente" size="small" />}
                sx={{ mb: 2 }}
            />

            {isLoadingCobrancas ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box> : (
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
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid item xs={6}>
                                    <TextField 
                                        select fullWidth size="small" label="Forma de Pagamento" 
                                        value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}
                                    >
                                        {['Dinheiro', 'PIX', 'CartaoDebito', 'CartaoCredito', 'Transferencia'].map(f => (
                                            <MenuItem key={f} value={f}>{f}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                {formaPagamento === 'CartaoCredito' && (
    <Grid item xs={6}>
        <TextField 
            select fullWidth size="small" label="Parcelas" 
            value={parcelas} onChange={(e) => setParcelas(e.target.value)}
        >
            {/* Ajustado de 6 para 10 */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <MenuItem key={n} value={n}>{n}x</MenuItem>
            ))}
        </TextField>
    </Grid>
)}
                            </Grid>
                            
                            <Divider sx={{ my: 2 }} />
                            
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="h6" color="primary" fontWeight="bold">
                                    Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSelecionado)}
                                </Typography>
                                <Button 
                                    variant="contained" color="success" 
                                    disabled={isSubmitting}
                                    onClick={handleConfirmarBaixa}
                                    sx={{ fontWeight: 'bold' }}
                                >
                                    {isSubmitting ? <CircularProgress size={20} /> : 'CONFIRMAR RECEBIMENTO'}
                                </Button>
                            </Box>
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
}