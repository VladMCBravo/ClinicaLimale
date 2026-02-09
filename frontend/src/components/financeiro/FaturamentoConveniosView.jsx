// src/components/financeiro/FaturamentoConveniosView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Button, CircularProgress, Typography, Paper, Select, MenuItem, FormControl,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox,
    TextField, Stack, Chip, InputAdornment, TableFooter
} from '@mui/material';
import { 
    Search, MedicalServices, RequestQuote, Download, 
    CalendarMonth, CheckCircle, AssignmentTurnedIn 
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function FaturamentoConveniosView() {
    const { showSnackbar } = useSnackbar();

    // Estados de Dados
    const [convenios, setConvenios] = useState([]);
    const [agendamentosFaturaveis, setAgendamentosFaturaveis] = useState([]);
    
    // Estados de Filtro e Seleção
    const [selectedConvenio, setSelectedConvenio] = useState('');
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [termoBusca, setTermoBusca] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // 1. Carregar Convênios ao iniciar
    useEffect(() => {
        faturamentoService.getConvenios()
            .then(response => setConvenios(response.data))
            .catch(error => {
                console.error("Erro ao buscar convênios:", error);
                showSnackbar("Erro ao carregar lista de convênios.", 'error');
            });
    }, [showSnackbar]);

    // 2. Buscar Agendamentos (Faturáveis)
    const handleBuscar = async () => {
        if (!selectedConvenio || !selectedDate) {
            showSnackbar("Selecione um convênio e o mês de referência.", 'warning');
            return;
        }
        
        setIsLoading(true);
        setAgendamentosFaturaveis([]);
        setSelectedIds([]); // Limpa seleção anterior ao buscar
        
        const params = { 
            convenio_id: selectedConvenio, 
            ano: selectedDate.year(), 
            mes: selectedDate.month() + 1 // dayjs é 0-index
        };

        try {
            const response = await faturamentoService.getAgendamentosFaturaveis(params);
            setAgendamentosFaturaveis(response.data);
            if (response.data.length === 0) {
                showSnackbar("Nenhum agendamento faturável encontrado neste período.", 'info');
            }
        } catch (error) {
            console.error("Erro busca:", error);
            showSnackbar("Erro ao buscar agendamentos.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // 3. Filtragem Local (Melhoria: Busca por Nome)
    const filteredList = useMemo(() => {
        return agendamentosFaturaveis.filter(ag => 
            (ag.paciente_nome || '').toLowerCase().includes(termoBusca.toLowerCase()) ||
            (ag.procedimento || ag.tipo_consulta || '').toLowerCase().includes(termoBusca.toLowerCase())
        );
    }, [agendamentosFaturaveis, termoBusca]);

    // 4. Cálculo de Totais (Melhoria: KPI em Tempo Real)
    const totais = useMemo(() => {
        const selecionados = filteredList.filter(ag => selectedIds.includes(ag.id));
        const valorTotalSelecionado = selecionados.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
        return {
            qtd: selecionados.length,
            valor: valorTotalSelecionado
        };
    }, [filteredList, selectedIds]);

    // 5. Gestão de Seleção
    const handleSelectAll = (event) => {
        if (event.target.checked) {
            const allIds = filteredList.map(ag => ag.id);
            setSelectedIds(allIds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (event, id) => {
        const selectedIndex = selectedIds.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selectedIds, id);
        } else if (selectedIndex >= 0) {
            newSelected = selectedIds.filter(itemId => itemId !== id);
        }
        setSelectedIds(newSelected);
    };

    // 6. Gerar Lote XML (Mantida a lógica original robusta)
    const handleGerarLote = async () => {
        if (selectedIds.length === 0) {
            showSnackbar("Nenhum item selecionado para o lote.", 'warning');
            return;
        }

        setIsGenerating(true);
        try {
            // Formata YYYY-MM para o backend
            const mesRefStr = `${selectedDate.year()}-${(selectedDate.month() + 1).toString().padStart(2, '0')}`;
            
            const payload = {
                convenio_id: selectedConvenio,
                mes_referencia: mesRefStr,
                agendamento_ids: selectedIds
            };

            const response = await faturamentoService.gerarLoteFaturamento(payload);

            // Criação do Blob para Download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // Tenta extrair nome do arquivo do header
            const contentDisposition = response.headers['content-disposition'];
            let filename = `lote_tiss_${mesRefStr}.xml`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch && filenameMatch.length === 2)
                    filename = filenameMatch[1];
            }
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

            showSnackbar('Lote XML gerado e baixado com sucesso!', 'success');
            
            // Recarrega para limpar os que já foram processados
            handleBuscar(); 

        } catch (error) {
            console.error("Erro lote:", error);
            showSnackbar("Erro ao gerar arquivo XML.", 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Box sx={{ 
            p: 1, 
            height: 'calc(100vh - 155px)', 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden' 
        }}>
            
            {/* 1. HEADER & FILTROS */}
            <Paper variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                
                {/* Título e Ícone */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ bgcolor: '#e3f2fd', p: 1, borderRadius: '50%', color: '#1565c0' }}>
                        <MedicalServices />
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">MÓDULO TISS</Typography>
                        <Typography variant="h6" fontWeight="800" lineHeight={1}>FATURAMENTO</Typography>
                    </Box>
                </Box>

                {/* Filtros Principais */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexGrow: 1, justifyContent: 'flex-end' }}>
                    
                    <FormControl size="small" sx={{ minWidth: 200, bgcolor: 'white' }}>
                        <Select 
                            displayEmpty
                            value={selectedConvenio} 
                            onChange={(e) => setSelectedConvenio(e.target.value)}
                            renderValue={(selected) => {
                                if (!selected) return <Typography color="gray">Selecione o Convênio</Typography>;
                                const conv = convenios.find(c => c.id === selected);
                                return conv ? conv.nome : selected;
                            }}
                        >
                            <MenuItem disabled value=""><em>Selecione o Convênio</em></MenuItem>
                            {convenios.map((conv) => (
                                <MenuItem key={conv.id} value={conv.id}>{conv.nome}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <DatePicker 
                        views={['month', 'year']} 
                        value={selectedDate} 
                        onChange={(v) => setSelectedDate(v)}
                        slotProps={{ 
                            textField: { 
                                size: 'small', 
                                sx: { width: 140, bgcolor: 'white' },
                                placeholder: "Mês/Ano"
                            } 
                        }}
                    />

                    <Button 
                        variant="contained" 
                        onClick={handleBuscar} 
                        disabled={isLoading}
                        startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <Search />}
                        sx={{ height: 40, px: 3, fontWeight: 'bold' }}
                    >
                        BUSCAR
                    </Button>
                </Box>
            </Paper>

            {/* 2. BARRA DE AÇÃO E KPI (Só aparece se tiver dados) */}
            <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <TextField
                    size="small"
                    placeholder="Filtrar por paciente..."
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                    InputProps={{ 
                        startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> 
                    }}
                    sx={{ width: 300, bgcolor: 'white', borderRadius: 1 }}
                />

                {/* KPI de Seleção */}
                {selectedIds.length > 0 && (
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            display: 'flex', alignItems: 'center', gap: 2, 
                            bgcolor: '#e8f5e9', border: '1px solid #c8e6c9', 
                            px: 2, py: 0.5, borderRadius: 2 
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AssignmentTurnedIn fontSize="small" color="success" />
                            <Typography variant="caption" fontWeight="bold" color="success.main">
                                {totais.qtd} GUIAS
                            </Typography>
                        </Box>
                        <Typography variant="subtitle1" fontWeight="800" color="success.dark">
                            {formatMoney(totais.valor)}
                        </Typography>
                    </Paper>
                )}
            </Box>

            {/* 3. TABELA DE DADOS */}
            <Paper variant="outlined" sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                <TableContainer sx={{ 
                    flexGrow: 1, 
                    overflowY: 'auto',
                    '&::-webkit-scrollbar': { width: '6px' },
                    '&::-webkit-scrollbar-track': { background: '#f1f1f1' },
                    '&::-webkit-scrollbar-thumb': { background: '#ccc', borderRadius: '4px' }
                }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox" sx={{ bgcolor: '#f5f5f5' }}>
                                    <Checkbox
                                        color="primary"
                                        size="small"
                                        indeterminate={selectedIds.length > 0 && selectedIds.length < filteredList.length}
                                        checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
                                        onChange={handleSelectAll}
                                    />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Data/Hora</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Paciente</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Procedimento / Guia</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Valor Previsto</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
                            ) : filteredList.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: '#999' }}>Nenhum agendamento pendente para faturar.</TableCell></TableRow>
                            ) : filteredList.map((ag) => {
                                const isSelected = selectedIds.includes(ag.id);
                                return (
                                    <TableRow key={ag.id} hover selected={isSelected}>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                size="small"
                                                checked={isSelected}
                                                onChange={(event) => handleSelectOne(event, ag.id)}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <CalendarMonth fontSize="inherit" color="action" />
                                                {new Date(ag.data_hora_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                            {ag.paciente_nome}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem', color: '#555' }}>
                                            {ag.procedimento || ag.tipo_consulta || 'Consulta Padrão'}
                                            {ag.codigo_tuss && <Chip label={ag.codigo_tuss} size="small" sx={{ ml: 1, height: 16, fontSize: '0.6rem' }} />}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold', color: '#2e7d32', fontSize: '0.85rem' }}>
                                            {formatMoney(ag.valor || 0)}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                        
                        {/* Footer Fixo */}
                        <TableFooter sx={{ position: 'sticky', bottom: 0, bgcolor: '#fafafa', zIndex: 2, borderTop: '1px solid #eee' }}>
                             <TableRow>
                                <TableCell colSpan={3} />
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#666', textAlign: 'right' }}>
                                    TOTAL DISPONÍVEL:
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: '800', fontSize: '0.9rem', color: '#333' }}>
                                    {formatMoney(filteredList.reduce((acc, curr) => acc + Number(curr.valor || 0), 0))}
                                </TableCell>
                             </TableRow>
                        </TableFooter>
                    </Table>
                </TableContainer>
            </Paper>

            {/* 4. RODAPÉ DE AÇÃO (Floating ou Fixo) */}
            <Paper elevation={3} sx={{ 
                mt: 1, p: 1.5, bgcolor: '#1a233b', color: 'white', borderRadius: 2,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <Box>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>ITENS SELECIONADOS</Typography>
                    <Typography variant="h6" fontWeight="bold" lineHeight={1}>
                        {selectedIds.length} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>guias</span>
                    </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>VALOR DO LOTE</Typography>
                        <Typography variant="h6" fontWeight="bold" lineHeight={1} color="#69f0ae">
                            {formatMoney(totais.valor)}
                        </Typography>
                    </Box>
                    <Button 
                        variant="contained" 
                        color="success" 
                        size="large"
                        disabled={selectedIds.length === 0 || isGenerating}
                        onClick={handleGerarLote}
                        startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <RequestQuote />}
                        sx={{ fontWeight: 'bold', px: 4, bgcolor: '#00e676', color: '#000', '&:hover': { bgcolor: '#00c853' } }}
                    >
                        {isGenerating ? 'GERANDO XML...' : 'GERAR LOTE XML'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}