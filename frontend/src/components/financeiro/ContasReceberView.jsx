// src/components/financeiro/ContasReceberView.jsx
import React, { useState, useCallback, useEffect } from 'react'; // <--- ADICIONADO useCallback e useEffect
import {
    TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Box, LinearProgress, Button, InputAdornment, 
} from '@mui/material';
import { Search, Add } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { faturamentoService } from '../../services/faturamentoService';
import LancamentoCaixaModal from './LancamentoCaixaModal';

// <--- ADICIONADO A FUNÇÃO QUE FALTAVA
const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function ContasReceberView() {
    // ESTADOS
    const [lista, setLista] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filtros
    const [filtroData, setFiltroData] = useState(dayjs());
    const [busca, setBusca] = useState('');
    
    // Modal
    const [modalOpen, setModalOpen] = useState(false);

    // BUSCA DE DADOS (Server-Side)
    const carregarDados = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            
            // Lógica Inteligente: Se tem busca, ignora data. Se não tem, usa data.
            if (busca.length > 2) {
                params.search = busca;
            } else {
                params.mes = filtroData.month() + 1; // Backend espera 1-12
                params.ano = filtroData.year();
            }

            // Busca Legado + Novo (backend filtra)
            const res = await faturamentoService.getPagamentos(params);
            setLista(res.data || []);
            
        } catch (error) {
            console.error("Erro ao buscar contas a receber", error);
        } finally {
            setLoading(false);
        }
    }, [filtroData, busca]);

    // Debounce da busca (para não chamar API a cada letra)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            carregarDados();
        }, 500); // Espera 500ms após parar de digitar
        return () => clearTimeout(timeoutId);
    }, [carregarDados]);


    return (
        <Box sx={{ height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
            
            {/* BARRA DE FERRAMENTAS */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <DatePicker 
                        views={['month', 'year']}
                        value={filtroData}
                        onChange={(v) => { setFiltroData(v); setBusca(''); }} // Limpa busca ao mudar data
                        slotProps={{ textField: { size: 'small', sx: { width: 140, bgcolor: 'white' } } }}
                        disabled={busca.length > 0} // Trava data se estiver buscando globalmente
                    />
                    <TextField
                        size="small"
                        placeholder="Buscar Paciente/Valor (Global)..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Search /></InputAdornment>
                        }}
                        sx={{ width: 300, bgcolor: 'white' }}
                    />
                </Box>

                <Button 
                    variant="contained" 
                    color="success" 
                    startIcon={<Add />}
                    onClick={() => setModalOpen(true)}
                    sx={{ fontWeight: 'bold' }}
                >
                    NOVA RECEITA
                </Button>
            </Box>

            {/* TABELA */}
            <Paper variant="outlined" sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {loading && <LinearProgress />}
                
                <TableContainer sx={{ flexGrow: 1 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Vencimento</TableCell>
                                <TableCell>Paciente / Descrição</TableCell>
                                <TableCell>Valor</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lista.map(row => (
                                <TableRow key={row.id} hover>
                                    <TableCell>{dayjs(row.data_vencimento).format('DD/MM/YY')}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="bold">
                                            {row.paciente_nome || row.descricao}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {row.descricao_visual || row.categoria_nome}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>R$ {parseFloat(row.valor).toFixed(2)}</TableCell>
                                    <TableCell>{/* Chip de Status aqui */}</TableCell>
                                    <TableCell align="right">
                                        {/* Seus botões de ação aqui (Drawer, Editar, etc) */}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && lista.length === 0 && (
                                <TableRow><TableCell colSpan={5} align="center">Nada encontrado.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* MODAL CONFIGURADO APENAS PARA RECEITA */}
            <LancamentoCaixaModal 
                open={modalOpen} 
                onClose={() => { setModalOpen(false); carregarDados(); }}
                initialType="receita" // <--- Força tipo Receita
                initialTab={0}
            />
        </Box>
    );
}

// COMPONENTE AUXILIAR DE KPI COMPACTO
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