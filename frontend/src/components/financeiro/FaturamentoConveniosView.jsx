import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Button, CircularProgress, Typography, Paper, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox,
    TextField, Chip, InputAdornment, Tabs, Tab,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid
} from '@mui/material';
import { 
    Search, MedicalServices, CalendarMonth, 
    CheckCircle, WarningAmber, Assessment, PointOfSale, CloudDownload
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

import './Financeiro.css';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function FaturamentoConveniosView() {
    const { showSnackbar } = useSnackbar();
    const [activeTab, setActiveTab] = useState(0);

    // --- ESTADOS: ABA 1 (GERAR LOTE) ---
    const [convenios, setConvenios] = useState([]);
    const [agendamentosFaturaveis, setAgendamentosFaturaveis] = useState([]);
    const [selectedConvenio, setSelectedConvenio] = useState('');
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [periodo, setPeriodo] = useState('mensal'); 
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
    const [dataPagamentoLote, setDataPagamentoLote] = useState(dayjs());
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
        
        const params = { 
            convenio_id: selectedConvenio, 
            ano: selectedDate.year(), 
            mes: selectedDate.month() + 1,
            periodo: periodo 
        };
        
        try {
            const response = await faturamentoService.getAgendamentosFaturaveis(params);
            setAgendamentosFaturaveis(response.data);
            if (response.data.length === 0) showSnackbar("Nenhum agendamento faturável encontrado para este período.", 'info');
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
        return { 
            qtd: selecionados.length, 
            valor: selecionados.reduce((acc, curr) => acc + Number(curr.valor_faturamento || 0), 0) 
        };
    }, [filteredList, selectedIds]);

    const handleGerarLote = async () => {
        setIsGenerating(true);
        try {
            let diaRef = '01';
            if (periodo === 'quinzena2') diaRef = '16';
            
            const mesRefStr = `${selectedDate.year()}-${(selectedDate.month() + 1).toString().padStart(2, '0')}-${diaRef}`;
            
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
        setValorPago(lote.valor_total_lote);
        setDataPagamentoLote(dayjs());
        setModalBaixaOpen(true);
    };

    const handleConfirmarBaixa = async () => {
        const vp = parseFloat(valorPago);
        if (isNaN(vp) || vp < 0) return showSnackbar("Valor pago inválido.", "warning");

        const glosa = parseFloat(loteSelecionado.valor_total_lote) - vp;
        
        setIsBaixando(true);
        try {
            await faturamentoService.baixarLote(loteSelecionado.id, {
                valor_pago: vp,
                valor_glosa: glosa > 0 ? glosa : 0,
                data_pagamento: dataPagamentoLote.format('YYYY-MM-DD')
            });
            showSnackbar('Baixa realizada! Receita gerada no financeiro.', 'success');
            setModalBaixaOpen(false);
            fetchLotes();
        } catch (error) { showSnackbar("Erro ao baixar lote.", 'error'); } 
        finally { setIsBaixando(false); }
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1, backgroundColor: '#f1f3f5' }}>
            
            {/* CABEÇALHO E ABAS ESTILO TASY */}
            <Paper className="tasy-flat-panel" sx={{ p: 1, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 1 }}>
                    <Box sx={{ bgcolor: '#e3f2fd', p: 0.8, borderRadius: 1, display: 'flex', alignItems: 'center' }}>
                        <MedicalServices sx={{ color: '#1565c0', fontSize: 20 }} />
                    </Box>
                    <Box>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" lineHeight={1}>
                            MÓDULO TISS
                        </Typography>
                        <Typography variant="subtitle1" fontWeight="800" color="#343a40" lineHeight={1.2}>
                            Faturamento de Convênios
                        </Typography>
                    </Box>
                </Box>
                
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0, fontWeight: 'bold' } }}>
                    <Tab icon={<Assessment fontSize="small"/>} iconPosition="start" label="Gerar Lotes XML" />
                    <Tab icon={<PointOfSale fontSize="small"/>} iconPosition="start" label="Baixas e Glosas" />
                </Tabs>
            </Paper>

            {/* -------------------------------------------------------- */}
            {/* ABA 1: GERAR LOTES XML                                   */}
            {/* -------------------------------------------------------- */}
            {activeTab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
                    
                    {/* BARRA DE FILTROS SUPERIOR */}
                    <Paper className="tasy-flat-panel" sx={{ p: 1.5, mb: 1, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <TextField 
                            select size="small" className="tasy-compact-input" label="Convênio"
                            value={selectedConvenio} onChange={(e) => setSelectedConvenio(e.target.value)}
                            sx={{ width: 220 }}
                        >
                            <MenuItem disabled value=""><em>Selecione...</em></MenuItem>
                            {convenios.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
                        </TextField>

                        <DatePicker 
                            views={['month', 'year']} 
                            label="Mês Ref."
                            value={selectedDate} 
                            onChange={setSelectedDate} 
                            className="tasy-compact-input"
                            slotProps={{ textField: { size: 'small', sx: { width: 140 } } }} 
                        />
                        
                        <TextField 
                            select size="small" className="tasy-compact-input" label="Período"
                            value={periodo} onChange={(e) => setPeriodo(e.target.value)}
                            sx={{ width: 160 }}
                        >
                            <MenuItem value="mensal">Mês Completo</MenuItem>
                            <MenuItem value="quinzena1">1ª Quinzena</MenuItem>
                            <MenuItem value="quinzena2">2ª Quinzena</MenuItem>
                        </TextField>

                        <Button 
                            variant="contained" color="primary" onClick={handleBuscar} 
                            disabled={isLoading} startIcon={isLoading ? <CircularProgress size={20} color="inherit"/> : <Search />} 
                            sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 1 }}
                        >
                            Buscar Atendimentos
                        </Button>

                        <Box sx={{ flexGrow: 1 }} />
                        <TextField 
                            size="small" className="tasy-compact-input" placeholder="Filtrar paciente..." 
                            value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small"/></InputAdornment> }}
                            sx={{ width: 200 }}
                        />
                    </Paper>

                    {/* TABELA DE ATENDIMENTOS FATURÁVEIS */}
                    <Paper className="tasy-flat-panel" sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className="tasy-section-header" style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                            Atendimentos Pendentes de Faturamento
                            <Chip label={filteredList.length} size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem', fontWeight: 'bold', bgcolor: '#e9ecef' }} />
                        </div>

                        <TableContainer sx={{ flexGrow: 1, bgcolor: '#ffffff' }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell padding="checkbox" sx={{ bgcolor: '#f8f9fa' }}>
                                            <Checkbox size="small" color="primary"
                                                indeterminate={selectedIds.length > 0 && selectedIds.length < filteredList.length}
                                                checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
                                                onChange={(e) => setSelectedIds(e.target.checked ? filteredList.map(a => a.id) : [])}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057' }}>Data/Hora</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057' }}>Paciente / Plano</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057' }}>Procedimento</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057' }}>Valor Cobrado</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredList.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: '#868e96' }}>Nenhum atendimento listado.</TableCell></TableRow>
                                    ) : filteredList.map((ag) => (
                                        <TableRow key={ag.id} hover selected={selectedIds.includes(ag.id)}>
                                            <TableCell padding="checkbox">
                                                <Checkbox size="small" color="primary" checked={selectedIds.includes(ag.id)} onChange={(e) => {
                                                    const ids = e.target.checked ? [...selectedIds, ag.id] : selectedIds.filter(id => id !== ag.id);
                                                    setSelectedIds(ids);
                                                }}/>
                                            </TableCell>
                                            <TableCell sx={{ py: 1 }}>
                                                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{dayjs(ag.data_hora_inicio).format('DD/MM/YYYY')}</Typography>
                                                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold' }}>{dayjs(ag.data_hora_inicio).format('HH:mm')}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="600" color="#343a40">{ag.paciente_nome}</Typography>
                                                <Chip label={ag.plano_utilizado || 'Convênio'} size="small" sx={{ height: 16, fontSize: '0.65rem', bgcolor: '#e8eaf6', color: '#3949ab', fontWeight: 'bold' }} />
                                            </TableCell>
                                            <TableCell sx={{ color: '#495057', fontSize: '0.85rem' }}>{ag.procedimento_descricao || 'Consulta Médica'}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>{formatMoney(ag.valor_faturamento)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* RODAPÉ ESTATÍSTICO DE GERAÇÃO */}
                        <Box sx={{ p: 1.5, borderTop: '1px solid #dee2e6', bgcolor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.75rem' }}>
                                    ITENS SELECIONADOS: <b style={{ color: '#343a40' }}>{totais.qtd}</b>
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.75rem' }}>
                                    VALOR DO LOTE: <b style={{ color: '#2e7d32', fontSize: '1rem' }}>{formatMoney(totais.valor)}</b>
                                </Typography>
                            </Box>
                            <Button 
                                variant="contained" color="success" onClick={handleGerarLote} 
                                disabled={isGenerating || selectedIds.length === 0}
                                startIcon={isGenerating ? <CircularProgress size={16} color="inherit" /> : <CloudDownload />}
                                sx={{ fontWeight: 'bold', borderRadius: 1 }}
                            >
                                {isGenerating ? 'PROCESSANDO...' : 'GERAR LOTE TISS (.XML)'}
                            </Button>
                        </Box>
                    </Paper>
                </Box>
            )}

            {/* -------------------------------------------------------- */}
            {/* ABA 2: HISTÓRICO E BAIXAS DE LOTE                        */}
            {/* -------------------------------------------------------- */}
            {activeTab === 1 && (
                <Paper className="tasy-flat-panel" sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div className="tasy-section-header" style={{ margin: 0 }}>Lotes Enviados e Recebimentos</div>
                    
                    <TableContainer sx={{ flexGrow: 1, bgcolor: '#ffffff' }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057' }}>ID Lote</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057' }}>Convênio</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057' }}>Ref.</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057' }}>Gerado em</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057' }}>Status</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057' }}>Total Lote</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057' }}>Glosa</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057' }}>Ação Financeira</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoadingLotes ? <TableRow><TableCell colSpan={8} align="center" sx={{py:4}}><CircularProgress size={24}/></TableCell></TableRow> :
                                lotes.map((lote) => (
                                    <TableRow key={lote.id} hover>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#6c757d' }}>#{lote.id}</TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: '#343a40' }}>{lote.convenio_nome}</TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem' }}>
                                            {lote.mes_referencia.endsWith('-16') 
                                                ? `2ª Q. ${lote.mes_referencia.substring(5, 7)}/${lote.mes_referencia.substring(0, 4)}` 
                                                : `${lote.mes_referencia.substring(5, 7)}/${lote.mes_referencia.substring(0, 4)}`}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem' }}>{dayjs(lote.data_criacao).format('DD/MM/YYYY')}</TableCell>
                                        <TableCell>
                                            <Chip size="small" 
                                                label={lote.status} 
                                                color={lote.status.includes('Pago') ? 'success' : 'warning'} 
                                                variant={lote.status.includes('Pago') ? 'filled' : 'outlined'}
                                                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }}
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold', color: '#495057' }}>{formatMoney(lote.valor_total_lote)}</TableCell>
                                        <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>
                                            {lote.valor_glosa > 0 ? formatMoney(lote.valor_glosa) : '-'}
                                        </TableCell>
                                        <TableCell align="center">
                                            {lote.status === 'Enviado' || lote.status === 'Aberto' ? (
                                                <Button size="small" variant="outlined" color="primary" sx={{textTransform: 'none', borderRadius: 1}} onClick={() => handleAbrirBaixa(lote)}>
                                                    Registrar Pagto.
                                                </Button>
                                            ) : (
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, color: 'success.main' }}>
                                                    <CheckCircle fontSize="small" /> <Typography variant="caption" fontWeight="bold">Recebido</Typography>
                                                </Box>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!isLoadingLotes && lotes.length === 0 && (
                                    <TableRow><TableCell colSpan={8} align="center" sx={{py:4, color: '#868e96'}}>Nenhum lote enviado ainda.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* -------------------------------------------------------- */}
            {/* MODAL DE BAIXA / GLOSA                                   */}
            {/* -------------------------------------------------------- */}
            <Dialog open={modalBaixaOpen} onClose={() => setModalBaixaOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ p: 2, bgcolor: '#f8f9fa', borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PointOfSale color="primary" />
                    <Typography variant="subtitle1" fontWeight="bold" color="#343a40">
                        Recebimento de Lote #{loteSelecionado?.id}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Paper elevation={0} sx={{ p: 1.5, mb: 2, bgcolor: '#f8f9fa', border: '1px solid #dee2e6' }}>
                        <Typography variant="body2" color="text.secondary">Convênio</Typography>
                        <Typography variant="body1" fontWeight="bold" color="#343a40" mb={1}>{loteSelecionado?.convenio_nome}</Typography>
                        <Typography variant="body2" color="text.secondary">Valor Faturado (Esperado)</Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary.main">{formatMoney(loteSelecionado?.valor_total_lote)}</Typography>
                    </Paper>

                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField 
                                label="Valor Pago pelo Convênio (Real) *" 
                                fullWidth type="number" size="small"
                                InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                                value={valorPago} 
                                onChange={(e) => setValorPago(e.target.value)} 
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <DatePicker 
                                label="Data da Transferência" 
                                value={dataPagamentoLote} 
                                onChange={setDataPagamentoLote} 
                                slotProps={{ textField: { size: 'small', fullWidth: true } }} 
                            />
                        </Grid>
                    </Grid>

                    {/* ALERTA DINÂMICO DE GLOSA */}
                    {valorPago !== '' && parseFloat(loteSelecionado?.valor_total_lote) - parseFloat(valorPago) > 0 && (
                        <Paper sx={{ mt: 2, p: 1.5, bgcolor: '#fff5f5', border: '1px solid #ffcdd2', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <WarningAmber color="error" />
                            <Box>
                                <Typography variant="caption" fontWeight="bold" color="error.main" display="block">GLOSA DETECTADA (CORTE)</Typography>
                                <Typography variant="body2" fontWeight="bold" color="error.dark">
                                    {formatMoney(parseFloat(loteSelecionado?.valor_total_lote) - parseFloat(valorPago))}
                                </Typography>
                            </Box>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid #dee2e6' }}>
                    <Button onClick={() => setModalBaixaOpen(false)} sx={{ color: '#495057' }}>Cancelar</Button>
                    <Button onClick={handleConfirmarBaixa} variant="contained" color="success" disabled={isBaixando || valorPago === ''} sx={{ fontWeight: 'bold' }}>
                        {isBaixando ? 'Processando...' : 'Confirmar Recebimento'}
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}