// src/components/financeiro/FaturamentoConveniosView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Button, CircularProgress, Typography, Paper, Select, MenuItem, FormControl,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox,
    TextField, Chip, InputAdornment, TableFooter, Tabs, Tab,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid
} from '@mui/material';
import { 
    Search, MedicalServices, RequestQuote, CalendarMonth, 
    AssignmentTurnedIn, CheckCircle, WarningAmber
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function FaturamentoConveniosView() {
    const { showSnackbar } = useSnackbar();
    const [activeTab, setActiveTab] = useState(0);

    // --- ESTADOS: ABA 1 (GERAR LOTE) ---
    const [convenios, setConvenios] = useState([]);
    const [agendamentosFaturaveis, setAgendamentosFaturaveis] = useState([]);
    const [selectedConvenio, setSelectedConvenio] = useState('');
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [termoBusca, setTermoBusca] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // --- ESTADOS: ABA 2 (HISTÓRICO DE LOTES) ---
    const [lotes, setLotes] = useState([]);
    const [isLoadingLotes, setIsLoadingLotes] = useState(false);
    const [modalBaixaOpen, setModalBaixaOpen] = useState(false);
    const [loteSelecionado, setLoteSelecionado] = useState(null);
    const [valorPago, setValorPago] = useState('');
    const [dataPagamentoLote, setDataPagamentoLote] = useState(dayjs().format('YYYY-MM-DD'));
    const [isBaixando, setIsBaixando] = useState(false);

    // 1. Carregar Convênios
    useEffect(() => {
        faturamentoService.getConvenios()
            .then(response => setConvenios(response.data))
            .catch(() => showSnackbar("Erro ao carregar convênios.", 'error'));
    }, [showSnackbar]);

    // 2. Carregar Lotes Históricos
    const fetchLotes = () => {
        setIsLoadingLotes(true);
        faturamentoService.getLotes()
            .then(res => setLotes(res.data))
            .catch(() => showSnackbar("Erro ao carregar histórico de lotes.", 'error'))
            .finally(() => setIsLoadingLotes(false));
    };

    useEffect(() => {
        if (activeTab === 1) fetchLotes();
    }, [activeTab]);

    // --- LÓGICA DA ABA 1 (GERAÇÃO) ---
    const handleBuscar = async () => {
        if (!selectedConvenio || !selectedDate) {
            showSnackbar("Selecione um convênio e o mês de referência.", 'warning');
            return;
        }
        setIsLoading(true);
        setAgendamentosFaturaveis([]);
        setSelectedIds([]); 
        
        const params = { convenio_id: selectedConvenio, ano: selectedDate.year(), mes: selectedDate.month() + 1 };
        try {
            const response = await faturamentoService.getAgendamentosFaturaveis(params);
            setAgendamentosFaturaveis(response.data);
            if (response.data.length === 0) showSnackbar("Nenhum agendamento faturável encontrado.", 'info');
        } catch (error) { showSnackbar("Erro ao buscar agendamentos.", 'error'); } 
        finally { setIsLoading(false); }
    };

    const filteredList = useMemo(() => {
        return agendamentosFaturaveis.filter(ag => 
            (ag.paciente_nome || '').toLowerCase().includes(termoBusca.toLowerCase())
        );
    }, [agendamentosFaturaveis, termoBusca]);

    const totais = useMemo(() => {
        const selecionados = filteredList.filter(ag => selectedIds.includes(ag.id));
        return { qtd: selecionados.length, valor: selecionados.reduce((acc, curr) => acc + Number(curr.valor || 0), 0) };
    }, [filteredList, selectedIds]);

    const handleGerarLote = async () => {
        setIsGenerating(true);
        try {
            const mesRefStr = `${selectedDate.year()}-${(selectedDate.month() + 1).toString().padStart(2, '0')}`;
            const response = await faturamentoService.gerarLoteFaturamento({
                convenio_id: selectedConvenio, mes_referencia: mesRefStr, agendamento_ids: selectedIds
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `lote_tiss_${mesRefStr}.xml`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showSnackbar('Lote XML gerado com sucesso!', 'success');
            handleBuscar(); 
        } catch (error) { showSnackbar("Erro ao gerar arquivo XML.", 'error'); } 
        finally { setIsGenerating(false); }
    };

    // --- LÓGICA DA ABA 2 (BAIXA DE LOTE) ---
    const handleAbrirBaixa = (lote) => {
        setLoteSelecionado(lote);
        setValorPago(lote.valor_total_lote); // Sugere o pagamento integral
        setDataPagamentoLote(dayjs().format('YYYY-MM-DD'));
        setModalBaixaOpen(true);
    };

    const handleConfirmarBaixa = async () => {
        const vp = parseFloat(valorPago);
        if (isNaN(vp) || vp < 0) {
            showSnackbar("Valor pago inválido.", "warning");
            return;
        }

        const glosa = parseFloat(loteSelecionado.valor_total_lote) - vp;
        
        setIsBaixando(true);
        try {
            await faturamentoService.baixarLote(loteSelecionado.id, {
                valor_pago: vp,
                valor_glosa: glosa > 0 ? glosa : 0,
                data_pagamento: dataPagamentoLote
            });
            showSnackbar('Baixa realizada! Receita gerada no financeiro.', 'success');
            setModalBaixaOpen(false);
            fetchLotes();
        } catch (error) { showSnackbar("Erro ao baixar lote.", 'error'); } 
        finally { setIsBaixando(false); }
    };

    return (
        <Box sx={{ p: 1, height: 'calc(100vh - 155px)', display: 'flex', flexDirection: 'column' }}>
            
            {/* CABEÇALHO E ABAS */}
            <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ bgcolor: '#e3f2fd', p: 1, borderRadius: '50%', color: '#1565c0' }}><MedicalServices /></Box>
                    <Box>
                        <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">MÓDULO TISS</Typography>
                        <Typography variant="h6" fontWeight="800" lineHeight={1}>FATURAMENTO</Typography>
                    </Box>
                </Box>
                
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ minHeight: 36 }}>
                    <Tab label="Gerar Guias / Lotes" sx={{ fontWeight: 'bold', minHeight: 36 }} />
                    <Tab label="Histórico e Baixas" sx={{ fontWeight: 'bold', minHeight: 36 }} />
                </Tabs>
            </Paper>

            {/* CONTEÚDO: ABA 1 (GERAR LOTES) */}
            {activeTab === 0 && (
                <>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                        <FormControl size="small" sx={{ width: 250, bgcolor: 'white' }}>
                            <Select displayEmpty value={selectedConvenio} onChange={(e) => setSelectedConvenio(e.target.value)}>
                                <MenuItem disabled value=""><em>Selecione o Convênio</em></MenuItem>
                                {convenios.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <DatePicker views={['month', 'year']} value={selectedDate} onChange={setSelectedDate} slotProps={{ textField: { size: 'small', sx: { width: 140, bgcolor: 'white' } } }} />
                        <Button variant="contained" onClick={handleBuscar} disabled={isLoading} startIcon={isLoading ? <CircularProgress size={20} /> : <Search />} sx={{ fontWeight: 'bold' }}>Buscar</Button>
                    </Box>

                    <Paper variant="outlined" sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell padding="checkbox">
                                            <Checkbox size="small" 
                                                indeterminate={selectedIds.length > 0 && selectedIds.length < filteredList.length}
                                                checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
                                                onChange={(e) => setSelectedIds(e.target.checked ? filteredList.map(a => a.id) : [])}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Data/Hora</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Paciente</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Procedimento</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Valor</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredList.map((ag) => (
                                        <TableRow key={ag.id} hover selected={selectedIds.includes(ag.id)}>
                                            <TableCell padding="checkbox">
                                                <Checkbox size="small" checked={selectedIds.includes(ag.id)} onChange={(e) => {
                                                    const ids = e.target.checked ? [...selectedIds, ag.id] : selectedIds.filter(id => id !== ag.id);
                                                    setSelectedIds(ids);
                                                }}/>
                                            </TableCell>
                                            <TableCell>{new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR')}</TableCell>
                                            <TableCell>{ag.paciente_nome}</TableCell>
                                            <TableCell>{ag.procedimento || 'Consulta'}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>{formatMoney(ag.valor)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    {selectedIds.length > 0 && (
                        <Paper elevation={3} sx={{ mt: 1, p: 2, bgcolor: '#1a233b', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
                            <Box><Typography>Selecionados: {totais.qtd}</Typography></Box>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <Typography variant="h6" color="#69f0ae">{formatMoney(totais.valor)}</Typography>
                                <Button variant="contained" color="success" onClick={handleGerarLote} disabled={isGenerating}>
                                    {isGenerating ? 'Gerando...' : 'GERAR LOTE XML'}
                                </Button>
                            </Box>
                        </Paper>
                    )}
                </>
            )}

            {/* CONTEÚDO: ABA 2 (HISTÓRICO E BAIXAS) */}
            {activeTab === 1 && (
                <Paper variant="outlined" sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ID Lote</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Convênio</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Ref.</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Gerado em</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Lote</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Glosa</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ação</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoadingLotes ? <TableRow><TableCell colSpan={8} align="center"><CircularProgress/></TableCell></TableRow> :
                                lotes.map((lote) => (
                                    <TableRow key={lote.id} hover>
                                        <TableCell sx={{ fontWeight: 'bold' }}>#{lote.id}</TableCell>
                                        <TableCell>{lote.convenio_nome}</TableCell>
                                        <TableCell>{lote.mes_referencia.substring(0, 7)}</TableCell>
                                        <TableCell>{new Date(lote.data_criacao).toLocaleDateString('pt-BR')}</TableCell>
                                        <TableCell>
                                            <Chip size="small" 
                                                label={lote.status} 
                                                color={lote.status.includes('Pago') ? 'success' : 'warning'} 
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatMoney(lote.valor_total_lote)}</TableCell>
                                        <TableCell align="right" sx={{ color: 'error.main' }}>
                                            {lote.valor_glosa > 0 ? formatMoney(lote.valor_glosa) : '-'}
                                        </TableCell>
                                        <TableCell align="center">
                                            {lote.status === 'Enviado' || lote.status === 'Aberto' ? (
                                                <Button size="small" variant="outlined" color="success" onClick={() => handleAbrirBaixa(lote)}>
                                                    Baixar Lote
                                                </Button>
                                            ) : (
                                                <CheckCircle color="success" fontSize="small" />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* MODAL DE BAIXA (CÁLCULO DE GLOSA) */}
            <Dialog open={modalBaixaOpen} onClose={() => setModalBaixaOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main', borderBottom: '1px solid #ddd' }}>
                    Baixar Lote #{loteSelecionado?.id}
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Convênio: <strong>{loteSelecionado?.convenio_nome}</strong><br/>
                        Valor Original do Lote: <strong>{formatMoney(loteSelecionado?.valor_total_lote)}</strong>
                    </Typography>

                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField 
                                label="Valor Efetivamente Pago pelo Convênio *" 
                                fullWidth 
                                type="number"
                                InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                                value={valorPago} 
                                onChange={(e) => setValorPago(e.target.value)} 
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField 
                                label="Data do Recebimento" 
                                fullWidth 
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                value={dataPagamentoLote} 
                                onChange={(e) => setDataPagamentoLote(e.target.value)} 
                            />
                        </Grid>
                    </Grid>

                    {/* Exibe o Alerta de Glosa dinâmico */}
                    {valorPago !== '' && parseFloat(loteSelecionado?.valor_total_lote) - parseFloat(valorPago) > 0 && (
                        <Paper sx={{ mt: 2, p: 1.5, bgcolor: '#fff3e0', color: '#e65100', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WarningAmber fontSize="small" />
                            <Typography variant="body2" fontWeight="bold">
                                Glosa Calculada: {formatMoney(parseFloat(loteSelecionado?.valor_total_lote) - parseFloat(valorPago))}
                            </Typography>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setModalBaixaOpen(false)} color="inherit">Cancelar</Button>
                    <Button onClick={handleConfirmarBaixa} variant="contained" color="success" disabled={isBaixando || valorPago === ''}>
                        {isBaixando ? 'Processando...' : 'Confirmar Pagamento'}
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}