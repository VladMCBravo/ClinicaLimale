// src/components/financeiro/ContasReceberView.jsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Box, LinearProgress, Button, InputAdornment, Chip, Drawer
} from '@mui/material';
import { Search, Add } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import LancamentoCaixaModal from './LancamentoCaixaModal';
import { PatientDrawerContent } from './PatientPaymentDrawer';

import './Financeiro.css';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function ContasReceberView() {
    const [lista, setLista] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filtroData, setFiltroData] = useState(dayjs());
    const [busca, setBusca] = useState('');
    
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

            // --- A MÁGICA: AGRUPAMENTO DE EXAMES DO MESMO DIA ---
            const dadosAgrupados = [];
            const mapGrupos = new Map();

            dadosBrutos.forEach(row => {
                // Só agrupa se for do mesmo paciente, na mesma data e com o mesmo status
                if (row.paciente) {
                    const key = `${row.paciente}_${dayjs(row.data_vencimento).format('YYYY-MM-DD')}_${row.status}`;
                    
                    if (mapGrupos.has(key)) {
                        const grupo = mapGrupos.get(key);
                        // Soma os valores
                        grupo.valor = (parseFloat(grupo.valor) + parseFloat(row.valor)).toFixed(2);
                        // Junta os nomes dos exames
                        grupo.descricao_visual = `${grupo.descricao_visual} + ${row.descricao_visual || row.categoria_nome}`;
                        // Guarda os IDs para podermos dar baixa em todos juntos depois
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

            // Ordenação: Data Futura -> Passada
            dadosAgrupados.sort((a, b) => {
                const dataA = a.data_vencimento ? dayjs(a.data_vencimento) : dayjs(0);
                const dataB = b.data_vencimento ? dayjs(b.data_vencimento) : dayjs(0);
                return dataB.diff(dataA); 
            });

            setLista(dadosAgrupados);
        } catch (error) { console.error(error); } 
        finally { setLoading(false); }
    }, [filtroData, busca]);

    useEffect(() => {
        const timeoutId = setTimeout(() => { carregarDados(); }, 500);
        return () => clearTimeout(timeoutId);
    }, [carregarDados]);

    const totais = useMemo(() => {
        const validos = lista.filter(i => i.status !== 'Renegociado' && i.status !== 'Cancelado');
        const totalValor = validos.reduce((acc, item) => acc + parseFloat(item.valor || 0), 0);
        return { qtd: validos.length, valor: totalValor };
    }, [lista]);

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
        <div className="fin-container" style={{ padding: '10px 20px' }}>
            
            <div className="fin-toolbar" style={{ marginBottom: 10 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <DatePicker 
                        views={['month', 'year']}
                        value={filtroData}
                        onChange={(v) => { setFiltroData(v); setBusca(''); }}
                        slotProps={{ textField: { size: 'small', variant: 'standard', sx: { width: 120 } } }}
                        disabled={busca.length > 0}
                    />
                    <TextField
                        size="small"
                        placeholder="Buscar Paciente..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        variant="standard"
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                            disableUnderline: true,
                            style: { fontSize: '0.9rem' }
                        }}
                        sx={{ width: 250, borderBottom: '1px solid #ddd' }}
                    />
                </Box>

                <Button 
                    variant="contained" color="success" size="small" startIcon={<Add />}
                    onClick={() => setModalOpen(true)}
                    sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 6, px: 3 }}
                >
                    Nova Receita
                </Button>
            </div>

            <Paper variant="outlined" sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '99%', margin: '0 auto', borderRadius: 2, border: '1px solid #eee' }}>
                {loading && <LinearProgress sx={{ height: 2 }} />}
                
                <TableContainer sx={{ flexGrow: 1 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f9fafb', color: '#666' }}>Vencimento</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f9fafb', color: '#666' }}>Paciente / Descrição</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#f9fafb', color: '#666' }}>Valor</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#f9fafb', color: '#666' }}>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lista.map(row => {
                                const isAtrasado = row.status === 'Pendente' && dayjs(row.data_vencimento).isBefore(dayjs(), 'day');
                                const isRenegociado = row.status === 'Renegociado';
                                const isConvenio = row.tipo_atendimento === 'Convenio'; // <--- IDENTIFICAÇÃO

                                return (
                                    <TableRow key={row.id} hover onClick={() => handleRowClick(row)}>
                                        <TableCell sx={{ fontSize: '0.8rem', color: '#444' }}>
                                            {dayjs(row.data_vencimento).format('DD/MM/YY')}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="600" fontSize="0.85rem">
                                                {row.paciente_nome || row.descricao}
                                                {row.originais && row.originais.length > 1 && (
                                                    <Chip label={`${row.originais.length} Itens`} size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                                                )}
                                            </Typography>
                                            
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.2 }}>
                                                <Typography variant="caption" color="textSecondary" fontSize="0.7rem">
                                                    {row.descricao_visual || row.categoria_nome}
                                                </Typography>

                                                {/* 👇 ETIQUETA DO CONVÊNIO APARECE AQUI 👇 */}
                                                {isConvenio && (
                                                    <Chip 
                                                        label={`${row.convenio_nome || 'Convênio'} - ${row.plano_nome || ''}`} 
                                                        size="small" 
                                                        sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#e8eaf6', color: '#3949ab', fontWeight: 'bold' }} 
                                                    />
                                                )}

                                                {row.paciente_nome && (row.primeira_consulta !== undefined || row.tipo_visita) && (
                                                    <Chip 
                                                        label={row.primeira_consulta || row.tipo_visita === 'Primeira Consulta' ? '1ª Vez' : (row.tipo_visita || 'Retorno')} 
                                                        size="small" 
                                                        sx={{ 
                                                            height: '16px', 
                                                            fontSize: '0.6rem', 
                                                            bgcolor: (row.primeira_consulta || row.tipo_visita === 'Primeira Consulta') ? '#fff8e1' : '#e3f2fd', 
                                                            color: (row.primeira_consulta || row.tipo_visita === 'Primeira Consulta') ? '#f57f17' : '#1565c0',
                                                            border: `1px solid ${(row.primeira_consulta || row.tipo_visita === 'Primeira Consulta') ? '#ffe082' : '#90caf9'}`,
                                                            '& .MuiChip-label': { px: 0.6, py: 0 }
                                                        }} 
                                                    />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold', color: isRenegociado ? '#999' : '#2e7d32', fontSize: '0.85rem', textDecoration: isRenegociado ? 'line-through' : 'none' }}>
                                            {formatMoney(row.valor)}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip 
                                                label={isAtrasado && row.status === 'Pendente' ? 'Atrasado' : row.status} 
                                                size="small" 
                                                color={getStatusColor(row.status, row.data_vencimento)}
                                                variant={row.status === 'Pago' ? 'filled' : 'outlined'}
                                                sx={{ 
                                                    fontWeight: 'bold', 
                                                    height: 20, 
                                                    fontSize: '0.65rem',
                                                    ...(row.status === 'Renegociado' && {
                                                        color: '#7b1fa2',
                                                        borderColor: '#7b1fa2',
                                                        bgcolor: 'transparent'
                                                    })
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {!loading && lista.length === 0 && (
                                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: '#999' }}>Nenhum registro encontrado.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box sx={{ p: 1.5, borderTop: '1px solid #eee', bgcolor: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                        QUANTIDADE: <b>{totais.qtd}</b>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        TOTAL ATIVO: <b style={{ color: '#2e7d32', fontSize: '0.9rem' }}>{formatMoney(totais.valor)}</b>
                    </Typography>
                </Box>
            </Paper>

            <LancamentoCaixaModal 
                open={modalOpen} 
                onClose={() => { setModalOpen(false); carregarDados(); }}
                initialType="receita" 
                initialTab={0}
            />

            <Drawer 
                anchor="right" 
                open={drawerOpen} 
                onClose={() => setDrawerOpen(false)}
                PaperProps={{ sx: { width: { xs: '100%', md: 450 }, p: 0 } }}
            >
                {selectedItem && (
                    <PatientDrawerContent 
                        item={selectedItem} 
                        onClose={() => setDrawerOpen(false)} 
                        onUpdate={carregarDados} 
                    />
                )}
            </Drawer>
        </div>
    );
}