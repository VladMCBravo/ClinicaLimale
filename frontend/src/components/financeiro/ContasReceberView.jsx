import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Box, LinearProgress, Button, InputAdornment, Chip, Drawer, TableSortLabel, ButtonGroup
} from '@mui/material';
import { Search, Add, Print, FilterList } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import LancamentoCaixaModal from './LancamentoCaixaModal';
import { PatientDrawerContent } from './PatientPaymentDrawer';
import { gerarPdfContasReceber } from '../../utils/pdfFinanceiro';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const removeAcentos = (str) => str ? str.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
const apenasNumeros = (str) => str ? str.toString().replace(/\D/g, '') : '';

export default function ContasReceberView() {
    const [lista, setLista] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filtroData, setFiltroData] = useState(dayjs());
    const [busca, setBusca] = useState('');
    const [ordem, setOrdem] = useState({ coluna: 'vencimento', direcao: 'asc' });
    
    // NOVO: Filtro rápido (Tasy style)
    const [filtroRapido, setFiltroRapido] = useState('Todos'); 

    const [modalOpen, setModalOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    const carregarDados = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (busca.length > 2) {
                params.search = busca;
            } else {
                params.mes = filtroData.month() + 1;
                params.ano = filtroData.year();
            }

            const res = await faturamentoService.getPagamentos(params);
            const dadosBrutos = res.data || [];

            const dadosAgrupados = [];
            const mapGrupos = new Map();

            dadosBrutos.forEach(row => {
                if (row.paciente) {
                    const key = `${row.paciente}_${dayjs(row.data_vencimento).format('YYYY-MM-DD')}_${row.status}`;
                    if (mapGrupos.has(key)) {
                        const grupo = mapGrupos.get(key);
                        grupo.valor = (parseFloat(grupo.valor) + parseFloat(row.valor)).toFixed(2);
                        grupo.descricao_visual = `${grupo.descricao_visual} + ${row.descricao_visual || row.categoria_nome}`;
                        grupo.ids.push(row.id);
                        grupo.originais.push(row);
                    } else {
                        const novoGrupo = { ...row, ids: [row.id], originais: [row] };
                        mapGrupos.set(key, novoGrupo);
                        dadosAgrupados.push(novoGrupo);
                    }
                } else {
                    dadosAgrupados.push({ ...row, ids: [row.id], originais: [row] });
                }
            });

            setLista(dadosAgrupados);
        } catch (error) { console.error(error); } 
        finally { setLoading(false); }
    }, [filtroData, busca]);

    useEffect(() => {
        const timeoutId = setTimeout(() => { carregarDados(); }, 500);
        return () => clearTimeout(timeoutId);
    }, [carregarDados]);

    const handleSort = (coluna) => {
        const isAsc = ordem.coluna === coluna && ordem.direcao === 'asc';
        setOrdem({ coluna, direcao: isAsc ? 'desc' : 'asc' });
    };

    const listaOrdenada = useMemo(() => {
        let itensFiltrados = lista;

        // 1. Aplica o Filtro Rápido (Botões)
        if (filtroRapido === 'Pendentes') {
            itensFiltrados = itensFiltrados.filter(i => i.status === 'Pendente');
        } else if (filtroRapido === 'Atrasados') {
            itensFiltrados = itensFiltrados.filter(i => i.status === 'Pendente' && dayjs(i.data_vencimento).isBefore(dayjs(), 'day'));
        }

        // 2. Aplica a Busca por Texto
        if (busca) {
            const termoBusca = removeAcentos(busca);
            const termoNumero = apenasNumeros(busca);
            itensFiltrados = itensFiltrados.filter(item => {
                const pacienteNome = removeAcentos(item.paciente_nome || item.descricao);
                const pacienteCpf = apenasNumeros(item.cpf || item.paciente_cpf); 
                const matchCpf = termoNumero.length > 0 && pacienteCpf.includes(termoNumero);

                return (
                    pacienteNome.includes(termoBusca) || matchCpf ||
                    removeAcentos(item.descricao_visual || item.categoria_nome).includes(termoBusca) ||
                    removeAcentos(item.status).includes(termoBusca) ||
                    (item.valor && item.valor.toString().includes(termoBusca))
                );
            });
        }

        // 3. Ordenação
        let sortableItems = [...itensFiltrados];
        sortableItems.sort((a, b) => {
            if (ordem.coluna === 'vencimento') {
                const dataA = a.data_vencimento ? dayjs(a.data_vencimento).valueOf() : 0;
                const dataB = b.data_vencimento ? dayjs(b.data_vencimento).valueOf() : 0;
                return ordem.direcao === 'asc' ? dataA - dataB : dataB - dataA;
            }
            if (ordem.coluna === 'paciente') {
                const nomeA = (a.paciente_nome || a.descricao || '').toLowerCase();
                const nomeB = (b.paciente_nome || b.descricao || '').toLowerCase();
                return ordem.direcao === 'asc' ? nomeA.localeCompare(nomeB) : nomeB.localeCompare(nomeA);
            }
            if (ordem.coluna === 'valor') {
                return ordem.direcao === 'asc' ? parseFloat(a.valor) - parseFloat(b.valor) : parseFloat(b.valor) - parseFloat(a.valor);
            }
            return 0;
        });

        return sortableItems;
    }, [lista, ordem, busca, filtroRapido]);

    const totais = useMemo(() => {
        const validos = listaOrdenada.filter(i => i.status !== 'Renegociado' && i.status !== 'Cancelado');
        const totalValor = validos.reduce((acc, item) => acc + parseFloat(item.valor || 0), 0);
        const qtdServicos = validos.reduce((acc, item) => acc + (item.originais ? item.originais.length : 1), 0);
        const pacientesUnicos = new Set();
        validos.forEach(item => { if (item.paciente) pacientesUnicos.add(item.paciente); });
        
        return { qtdServicos, qtdPacientes: pacientesUnicos.size, valor: totalValor };
    }, [listaOrdenada]);

    const handleRowClick = (item) => {
        setSelectedItem(item);
        setDrawerOpen(true);
    };

    const getStatusColor = (status, vencimento) => {
        if (status === 'Pago') return 'success';
        if (status === 'Cancelado') return 'error'; 
        if (status === 'Renegociado') return 'secondary'; 
        if (status === 'Pendente' && dayjs(vencimento).isBefore(dayjs(), 'day')) return 'error'; 
        return 'warning'; 
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1, backgroundColor: '#f1f3f5' }}>
            
            {/* TOOLBAR ESTILO TASY (Compacta e Integrada) */}
            <Paper className="tasy-flat-panel" sx={{ p: 1.5, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <DatePicker 
                        views={['month', 'year']}
                        value={filtroData}
                        onChange={(v) => { setFiltroData(v); setBusca(''); }}
                        className="tasy-compact-input" // <--- CLASSE TASY AQUI
                        slotProps={{ textField: { size: 'small', sx: { width: 130 } } }}
                        disabled={busca.length > 0}
                    />
                    
                    <TextField
                        size="small"
                        className="tasy-compact-input" // <--- CLASSE TASY AQUI
                        placeholder="Buscar Paciente/CPF..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                        }}
                        sx={{ width: 250 }}
                    />

                    {/* NOVO: BOTÕES DE FILTRO RÁPIDO */}
                    <ButtonGroup size="small" variant="outlined" sx={{ ml: 2, height: 32 }}>
                        <Button 
                            onClick={() => setFiltroRapido('Todos')} 
                            variant={filtroRapido === 'Todos' ? 'contained' : 'outlined'}
                            sx={{ textTransform: 'none', px: 2 }}
                        >
                            Todos
                        </Button>
                        <Button 
                            onClick={() => setFiltroRapido('Pendentes')} 
                            variant={filtroRapido === 'Pendentes' ? 'contained' : 'outlined'}
                            color="warning"
                            sx={{ textTransform: 'none', px: 2 }}
                        >
                            Pendentes
                        </Button>
                        <Button 
                            onClick={() => setFiltroRapido('Atrasados')} 
                            variant={filtroRapido === 'Atrasados' ? 'contained' : 'outlined'}
                            color="error"
                            sx={{ textTransform: 'none', px: 2 }}
                        >
                            Atrasados
                        </Button>
                    </ButtonGroup>
                </Box>

                <Button 
                    variant="contained" color="success" size="small" startIcon={<Add />}
                    onClick={() => setModalOpen(true)}
                    sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 1 }}
                >
                    Lançamento Avulso
                </Button>
            </Paper>

            {/* TABELA PRINCIPAL TASY */}
            <Paper className="tasy-flat-panel" sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {loading && <LinearProgress sx={{ height: 2 }} />}
                
                <div className="tasy-section-header" style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                    <FilterList fontSize="small" sx={{ mr: 1, opacity: 0.7 }}/>
                    Listagem de Recebíveis
                </div>

                <TableContainer sx={{ flexGrow: 1, bgcolor: '#ffffff' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', py: 1 }}>
                                    <TableSortLabel active={ordem.coluna === 'vencimento'} direction={ordem.direcao} onClick={() => handleSort('vencimento')}>
                                        Vencimento
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', py: 1 }}>
                                    <TableSortLabel active={ordem.coluna === 'paciente'} direction={ordem.direcao} onClick={() => handleSort('paciente')}>
                                        Paciente / Histórico
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', py: 1 }}>
                                    <TableSortLabel active={ordem.coluna === 'valor'} direction={ordem.direcao} onClick={() => handleSort('valor')}>
                                        Valor (R$)
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', py: 1 }}>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {listaOrdenada.map(row => {
                                const isAtrasado = row.status === 'Pendente' && dayjs(row.data_vencimento).isBefore(dayjs(), 'day');
                                const isCancelado = row.status === 'Cancelado'; 

                                return (
                                    <TableRow key={row.id} hover onClick={() => handleRowClick(row)} sx={{ cursor: 'pointer', bgcolor: isCancelado ? '#fff5f5' : 'inherit' }}>
                                        
                                        <TableCell sx={{ color: isCancelado ? '#adb5bd' : '#495057', py: 1.5 }}>
                                            <Typography variant="body2" sx={{ fontSize: '0.85rem', textDecoration: isCancelado ? 'line-through' : 'none', fontWeight: 500 }}>
                                                {dayjs(row.data_vencimento).format('DD/MM/YYYY')}
                                            </Typography>
                                        </TableCell>
                                        
                                        <TableCell sx={{ opacity: isCancelado ? 0.6 : 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#343a40', textDecoration: isCancelado ? 'line-through' : 'none' }}>
                                                {row.paciente_nome || row.descricao}
                                                {row.originais && row.originais.length > 1 && (
                                                    <Chip label={`${row.originais.length} Itens`} size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem', bgcolor: '#e9ecef', color: '#495057' }} />
                                                )}
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                {isCancelado ? (
                                                    <Typography variant="caption" color="error" fontWeight="bold" fontSize="0.75rem">
                                                        ⚠️ Anulado (Falta/Cancelamento)
                                                    </Typography>
                                                ) : (
                                                    <Typography variant="caption" sx={{ color: '#868e96', fontSize: '0.75rem' }}>
                                                        {row.descricao_visual || row.categoria_nome}
                                                    </Typography>
                                                )}
                                                
                                                {row.tipo_atendimento === 'Convenio' && !isCancelado && (
                                                    <Chip label={`${row.convenio_nome || 'Convênio'}`} size="small" sx={{ height: 16, fontSize: '0.60rem', bgcolor: '#e8eaf6', color: '#3949ab', fontWeight: 'bold' }} />
                                                )}
                                            </Box>
                                        </TableCell>
                                        
                                        <TableCell align="right" sx={{ fontWeight: 700, color: isCancelado ? '#adb5bd' : '#2e7d32', fontSize: '0.90rem', textDecoration: isCancelado ? 'line-through' : 'none' }}>
                                            {formatMoney(row.valor)}
                                        </TableCell>
                                        
                                        <TableCell align="center">
                                            <Chip 
                                                label={isAtrasado ? 'Atrasado' : row.status} 
                                                size="small" 
                                                color={getStatusColor(row.status, row.data_vencimento)}
                                                variant={row.status === 'Pago' ? 'filled' : 'outlined'}
                                                sx={{ fontWeight: 'bold', height: 22, fontSize: '0.70rem', borderRadius: 1 }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {!loading && listaOrdenada.length === 0 && (
                                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: '#868e96' }}>Nenhum recebimento encontrado no período.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* RODAPÉ E TOTAIS ESTILO TASY */}
                <Box sx={{ p: 1.5, borderTop: '1px solid #e9ecef', bgcolor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button 
                        variant="outlined" size="small" color="inherit" startIcon={<Print />}
                        onClick={() => gerarPdfContasReceber(listaOrdenada, totais, filtroData)}
                        sx={{ textTransform: 'none', borderRadius: 1, borderColor: '#ced4da', color: '#495057' }}
                    >
                        Imprimir Listagem
                    </Button>
                    <Box sx={{ display: 'flex', gap: 4 }}>
                        <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.75rem' }}>
                            QTD. SERVIÇOS: <b style={{ color: '#343a40' }}>{totais.qtdServicos}</b>
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.75rem' }}>
                            TOTAL PREVISTO: <b style={{ color: '#2e7d32', fontSize: '0.9rem' }}>{formatMoney(totais.valor)}</b>
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            <LancamentoCaixaModal 
                open={modalOpen} 
                onClose={() => { setModalOpen(false); carregarDados(); }}
                initialType="receita" initialTab={0}
            />
            <Drawer 
                anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}
                PaperProps={{ sx: { width: { xs: '100%', md: 450 }, p: 0 } }}
            >
                {selectedItem && (
                    <PatientDrawerContent item={selectedItem} onClose={() => setDrawerOpen(false)} onUpdate={carregarDados} />
                )}
            </Drawer>
        </Box>
    );
}