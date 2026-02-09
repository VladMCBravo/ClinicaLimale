// src/components/financeiro/ContasReceberView.jsx
import React, { useState, useMemo } from 'react';
import {
    TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableFooter,
    IconButton, Typography, Chip, Box, Stack, Menu, MenuItem, ListItemIcon, ListItemText,
    Checkbox, Button
} from '@mui/material';
import { Edit, CheckCircle, Search, Warning, History, Handshake, Block, Info, TrendingUp, TrendingDown, AccessTime } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { faturamentoService } from '../../services/faturamentoService';
import { agendamentoService } from '../../services/agendamentoService';
import BaixaUnificadaModal from './BaixaUnificadaModal';
import ResumoPacienteModal from './ResumoPacienteModal';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function ContasReceberView({ dadosIniciais = [], onReload }) {
    const { showSnackbar } = useSnackbar();
    
    // Filtros
    const [filtroData, setFiltroData] = useState(dayjs());
    const [termoBusca, setTermoBusca] = useState('');

    // Estados de Seleção e Modal
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Estados dos Modais
    const [modalUnificadoOpen, setModalUnificadoOpen] = useState(false);
    const [itemSelecionado, setItemSelecionado] = useState(null);
    const [modalResumoOpen, setModalResumoOpen] = useState(false);
    const [pacienteResumo, setPacienteResumo] = useState({ id: null, nome: '' });

    // Menus
    const [anchorEl, setAnchorEl] = useState(null);
    const [statusTarget, setStatusTarget] = useState(null);

    // Filtragem Otimizada
    const filteredList = useMemo(() => {
        return dadosIniciais.filter(row => {
            const rowDate = dayjs(row.data_vencimento);
            const matchDate = rowDate.month() === filtroData.month() && rowDate.year() === filtroData.year();
            const matchText = (row.paciente_nome || '').toLowerCase().includes(termoBusca.toLowerCase()) ||
                              (row.descricao || '').toLowerCase().includes(termoBusca.toLowerCase());
            return matchDate && matchText;
        });
    }, [dadosIniciais, filtroData, termoBusca]);

    // KPIs & Totais Dinâmicos
    const kpis = useMemo(() => {
        const totalRecebido = filteredList.filter(l => l.status === 'Pago').reduce((acc, l) => acc + Number(l.valor), 0);
        const totalPendente = filteredList.filter(l => l.status === 'Pendente').reduce((acc, l) => acc + Number(l.valor), 0);
        const totalGeralVisivel = filteredList.reduce((acc, l) => acc + Number(l.valor), 0);
        const atrasados = filteredList.filter(l => l.status === 'Pendente' && dayjs(l.data_vencimento).isBefore(dayjs(), 'day')).length;
        
        return { totalRecebido, totalPendente, totalGeralVisivel, atrasados };
    }, [filteredList]);

    // Lógica de Seleção
    const handleSelectAll = (event) => {
        if (event.target.checked) {
            const newSelecteds = filteredList
                .filter(n => n.status !== 'Pago' && n.status !== 'Cancelado' && n.status !== 'Renegociado')
                .map(n => n.id);
            setSelectedIds(newSelecteds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (event, id) => {
        const selectedIndex = selectedIds.indexOf(id);
        let newSelected = [];
        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selectedIds, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selectedIds.slice(1));
        } else if (selectedIndex === selectedIds.length - 1) {
            newSelected = newSelected.concat(selectedIds.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(selectedIds.slice(0, selectedIndex), selectedIds.slice(selectedIndex + 1));
        }
        setSelectedIds(newSelected);
    };

    // Ações
    const handleConfirmBaixa = async (id, dadosBaixa) => {
        try {
            await faturamentoService.updatePagamento(id, dadosBaixa);
            showSnackbar('Baixa realizada!', 'success');
            if(onReload) onReload();
        } catch(e) { showSnackbar('Erro na baixa.', 'error'); }
    };

    const handleConfirmRenegociacao = async (ids, parcelas, pacienteId) => {
        try {
            await faturamentoService.renegociarDivida({ ids_originais: ids, novas_parcelas: parcelas, paciente_id: pacienteId });
            showSnackbar('Renegociação realizada!', 'success');
            setSelectedIds([]); 
            if(onReload) onReload();
        } catch(e) { showSnackbar('Erro na renegociação.', 'error'); }
    };

    const handleReverterStatus = async (novoStatus) => {
        if (!statusTarget) return;
        try {
            await faturamentoService.updatePagamento(statusTarget.id, { status: novoStatus, pago: false, data_pagamento: null });
            showSnackbar(`Status alterado para ${novoStatus}.`, 'info');
            setAnchorEl(null);
            if(onReload) onReload();
        } catch (error) { showSnackbar('Erro ao alterar status.', 'error'); }
    };

    const handleUpdateStatusAgenda = async (novoStatus) => {
        if (!statusTarget) return;
        const rawId = statusTarget.agendamento_id || statusTarget.agendamento;
        const agendamentoId = (rawId && typeof rawId === 'object') ? rawId.id : rawId;
        if (!agendamentoId) return;
        try {
            await agendamentoService.updateAgendamento(agendamentoId, { status: novoStatus });
            showSnackbar(`Agenda atualizada para ${novoStatus}`, 'success');
            setAnchorEl(null);
            if(onReload) onReload();
        } catch (error) { console.error("Erro update agendamento:", error); }
    };

    const handleRenegociarLote = () => {
        const itemReferencia = dadosIniciais.find(i => i.id === selectedIds[0]);
        if (!itemReferencia) return;
        setItemSelecionado({
            ...itemReferencia,
            valor: dadosIniciais.filter(i => selectedIds.includes(i.id)).reduce((acc, curr) => acc + Number(curr.valor), 0),
            descricao: `Renegociação de ${selectedIds.length} itens`,
            tipo: 'receita'
        });
        setModalUnificadoOpen(true);
    };

    const handleOpenResumo = (paciente) => {
        const id = typeof paciente === 'object' ? paciente.id : paciente;
        const nome = typeof paciente === 'object' ? paciente.nome_completo : 'Paciente';
        if (id) {
            setPacienteResumo({ id, nome });
            setModalResumoOpen(true);
        }
    };

    return (
        <Box sx={{ 
            p: 1, 
            height: 'calc(100vh - 85px)', // Ajuste fino para não rolar a página
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden' // Garante que nada vaze
        }}>
            
            {/* 1. LINHA ÚNICA: KPIs (Esq) + FILTROS (Dir) */}
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 1,
                gap: 2,
                flexWrap: 'wrap' // Segurança para telas muito pequenas
            }}>
                
                {/* Lado Esquerdo: KPIs Compactos */}
                <Stack direction="row" spacing={1.5}>
                    <CompactKPI 
                        title="RECEBIDO" 
                        value={kpis.totalRecebido} 
                        icon={<TrendingUp fontSize="inherit" />} 
                        color="#2e7d32" 
                        bgcolor="#e8f5e9"
                    />
                    <CompactKPI 
                        title="A RECEBER" 
                        value={kpis.totalPendente} 
                        icon={<AccessTime fontSize="inherit" />} 
                        color="#ef6c00" 
                        bgcolor="#fff3e0"
                    />
                    <CompactKPI 
                        title="ATRASADOS" 
                        value={kpis.atrasados} 
                        isCount 
                        icon={<Warning fontSize="inherit" />} 
                        color="#c62828" 
                        bgcolor="#ffebee"
                    />
                </Stack>

                {/* Lado Direito: Filtros e Botões */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <DatePicker 
                        views={['month', 'year']} 
                        value={filtroData} 
                        onChange={(v) => setFiltroData(v)}
                        slotProps={{ 
                            textField: { 
                                size: 'small', 
                                sx: { width: 120, bgcolor: 'white' },
                                inputProps: { style: { fontSize: '0.8rem', padding: '8px' } }
                            } 
                        }}
                    />
                    <TextField
                        placeholder="Buscar..." 
                        size="small" 
                        value={termoBusca} 
                        onChange={(e) => setTermoBusca(e.target.value)}
                        InputProps={{ 
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search sx={{ color: 'gray', fontSize: 18 }} />
                                </InputAdornment>
                            ),
                            style: { fontSize: '0.8rem', paddingLeft: 0 }
                        }}
                        sx={{ width: 220, bgcolor: 'white' }}
                    />
                    {selectedIds.length > 0 && (
                        <Button 
                            variant="contained" color="secondary" size="small" 
                            startIcon={<Handshake />} onClick={handleRenegociarLote}
                            sx={{ textTransform: 'none', fontWeight: 'bold', height: 36 }}
                        >
                            Renegociar ({selectedIds.length})
                        </Button>
                    )}
                </Box>
            </Box>

            {/* 2. TABELA COM SCROLL INTERNO (Ocupa todo o resto) */}
            <Paper variant="outlined" sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden', // Importante para segurar o TableContainer
                borderRadius: 2 
            }}>
                <TableContainer sx={{ 
                    flexGrow: 1, 
                    overflowY: 'auto', // A rolagem é só aqui
                    '&::-webkit-scrollbar': { width: '6px' },
                    '&::-webkit-scrollbar-track': { background: '#f1f1f1' },
                    '&::-webkit-scrollbar-thumb': { background: '#ccc', borderRadius: '4px' }
                }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox" sx={{ bgcolor: '#f5f5f5', height: 40 }}>
                                    <Checkbox
                                        size="small"
                                        color="primary"
                                        indeterminate={selectedIds.length > 0 && selectedIds.length < filteredList.length}
                                        checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
                                        onChange={handleSelectAll}
                                    />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Vencimento</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Paciente / Descrição</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Valor</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Status</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredList.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>Nenhum lançamento encontrado.</TableCell></TableRow>
                            ) : filteredList.map((row) => {
                                const isSelected = selectedIds.indexOf(row.id) !== -1;
                                const isAtrasado = row.status === 'Pendente' && dayjs(row.data_vencimento).isBefore(dayjs(), 'day');
                                const canInteract = row.status !== 'Pago' && row.status !== 'Renegociado' && row.status !== 'Cancelado';
                                
                                return (
                                    <TableRow key={row.id} hover sx={{ bgcolor: isAtrasado ? '#fff5f5' : 'inherit' }} selected={isSelected}>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                size="small"
                                                color="primary"
                                                checked={isSelected}
                                                onChange={(event) => handleSelectOne(event, row.id)}
                                                disabled={!canInteract}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem', color: isAtrasado ? '#d32f2f' : 'inherit', fontWeight: isAtrasado ? 500 : 400 }}>
                                            {dayjs(row.data_vencimento).format('DD/MM/YY')}
                                            {isAtrasado && <Typography component="span" variant="caption" sx={{ display: 'block', fontSize: '0.6rem', color: '#d32f2f' }}>Vencido</Typography>}
                                        </TableCell>
                                        
                                        <TableCell 
                                            onClick={() => row.paciente && handleOpenResumo({ id: row.paciente, nome_completo: row.paciente_nome })}
                                            sx={{ cursor: row.paciente ? 'pointer' : 'default', py: 0.8 }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Typography variant="body2" fontWeight="600" color={row.paciente ? 'primary.main' : 'text.primary'} sx={{ fontSize: '0.85rem' }}>
                                                    {row.paciente_nome || 'Avulso'}
                                                </Typography>
                                                {row.paciente && <Info fontSize="inherit" color="disabled" sx={{ fontSize: 14 }} />}
                                            </Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                {row.descricao || row.descricao_visual}
                                            </Typography>
                                        </TableCell>

                                        <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#444' }}>
                                            {formatMoney(row.valor)}
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={row.status} size="small" 
                                                sx={{ 
                                                    height: 20, fontWeight: 'bold', fontSize: '0.65rem',
                                                    bgcolor: row.status === 'Pago' ? '#e8f5e9' : row.status === 'Pendente' ? '#fff3e0' : row.status === 'Cancelado' ? '#eeeeee' : '#ffebee',
                                                    color: row.status === 'Pago' ? '#2e7d32' : row.status === 'Pendente' ? '#ef6c00' : row.status === 'Cancelado' ? '#999' : '#c62828'
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={0} justifyContent="flex-end">
                                                <IconButton 
                                                    size="small" 
                                                    disabled={!canInteract} 
                                                    onClick={() => { setItemSelecionado(row); setModalUnificadoOpen(true); }}
                                                    sx={{ color: canInteract ? 'success.main' : 'action.disabled' }}
                                                >
                                                    <CheckCircle fontSize="small" />
                                                </IconButton>
                                                
                                                <IconButton size="small" onClick={(e) => { setAnchorEl(e.currentTarget); setStatusTarget(row); }}>
                                                    <Edit fontSize="small" color="action" />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                        
                        {/* FOOTER FIXO NO FINAL DA TABELA */}
                        <TableFooter sx={{ 
                            position: 'sticky', 
                            bottom: 0, 
                            bgcolor: '#fcfcfc', 
                            zIndex: 2, 
                            borderTop: '1px solid #e0e0e0',
                            boxShadow: '0 -2px 5px rgba(0,0,0,0.05)' 
                        }}>
                             <TableRow>
                                <TableCell colSpan={2} />
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.7rem', color: '#666', textAlign: 'right', pr: 2 }}>
                                    TOTAL DESTA LISTA:
                                </TableCell>
                                <TableCell sx={{ fontWeight: '800', fontSize: '0.9rem', color: '#333' }}>
                                    {formatMoney(kpis.totalGeralVisivel)}
                                </TableCell>
                                <TableCell colSpan={2} />
                             </TableRow>
                        </TableFooter>
                    </Table>
                </TableContainer>
            </Paper>

            {/* MENUS E MODAIS (Mantidos) */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={() => handleUpdateStatusAgenda('Não Compareceu')}>
                    <ListItemIcon><Block fontSize="small" color="error"/></ListItemIcon>
                    <ListItemText>Não Compareceu</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleReverterStatus('Pendente')}>
                    <ListItemIcon><History fontSize="small" /></ListItemIcon>
                    <ListItemText>Reverter para Pendente</ListItemText>
                </MenuItem>
                {statusTarget?.status === 'Renegociado' && (
                    <MenuItem onClick={() => handleReverterStatus('Pendente')} sx={{ color: 'warning.main' }}>
                        <ListItemIcon><Warning fontSize="small" color="warning" /></ListItemIcon>
                        <ListItemText>Desfazer Renegociação</ListItemText>
                    </MenuItem>
                )}
            </Menu>

            <BaixaUnificadaModal 
                open={modalUnificadoOpen}
                onClose={() => setModalUnificadoOpen(false)}
                item={itemSelecionado}
                onConfirmBaixa={handleConfirmBaixa}
                onConfirmRenegociacao={handleConfirmRenegociacao}
            />

            <ResumoPacienteModal 
                open={modalResumoOpen}
                onClose={() => setModalResumoOpen(false)}
                pacienteId={pacienteResumo.id}
                nomePaciente={pacienteResumo.nome}
            />
        </Box>
    );
}

// COMPONENTE AUXILIAR DE KPI COMPACTO (Ajustado para caber na linha)
const CompactKPI = ({ title, value, isCount, icon, color, bgcolor }) => (
    <Paper 
        elevation={0} 
        sx={{ 
            p: 0.5, px: 1.5, borderRadius: 2, bgcolor: bgcolor, 
            display: 'flex', alignItems: 'center', gap: 1,
            border: `1px solid ${color}30`,
            minWidth: 140,
            height: 40 // Altura fixa e compacta
        }}
    >
        <Box sx={{ bgcolor: 'white', p: 0.3, borderRadius: '50%', display: 'flex', color: color }}>
            {icon}
        </Box>
        <Box sx={{ lineHeight: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: color, opacity: 0.9, fontSize: '0.65rem', display: 'block' }}>
                {title}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: color, fontSize: '0.85rem' }}>
                {isCount ? value : formatMoney(value)}
            </Typography>
        </Box>
    </Paper>
);