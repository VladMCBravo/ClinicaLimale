import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Button, CircularProgress, TextField, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Select, MenuItem, InputLabel, FormControl, IconButton, Checkbox,
    FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions,
    Typography, Grid, Switch, Tooltip, InputAdornment, Chip
} from '@mui/material';
import { 
    Edit, Delete, AddCircleOutline, Search, 
    MoneyOff, CheckCircle, Warning 
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Estado inicial do formulário (ADICIONADO data_pagamento)
const initialFormState = { 
    descricao: '', 
    valor: '', 
    categoria: '', 
    data_despesa: dayjs().format('YYYY-MM-DD'),
    data_vencimento: dayjs().format('YYYY-MM-DD'),
    data_pagamento: dayjs().format('YYYY-MM-DD'), // Default para hoje se marcar pago
    parcelado: false,
    qtd_parcelas: 1,
    pago: false
};

// Função auxiliar de formatação de data (igual ao Receber)
const formatDataSimples = (dataISO) => {
    if (!dataISO) return '-';
    // Previne erros de fuso horário pegando apenas a parte da data YYYY-MM-DD
    const partes = dataISO.split('T')[0].split('-'); 
    if(partes.length < 3) return '-';
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

export default function DespesasView() {
    const { showSnackbar } = useSnackbar();
    
    // Dados
    const [despesas, setDespesas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [filteredDespesas, setFilteredDespesas] = useState([]);
    
    // Filtros e UI
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [mesFiltro, setMesFiltro] = useState(''); 
    const [anoFiltro, setAnoFiltro] = useState(dayjs().year());

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(initialFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- CARGA DE DADOS ---
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [despesasRes, categoriasRes] = await Promise.all([
                faturamentoService.getDespesas(),
                faturamentoService.getCategoriasDespesa()
            ]);
            setDespesas(despesasRes.data);
            setCategorias(categoriasRes.data);
        } catch (error) {
            console.error(error);
            showSnackbar('Erro ao carregar despesas.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- FILTRAGEM ---
    useEffect(() => {
        let lista = despesas;

        if (mesFiltro !== '') {
            lista = lista.filter(d => {
                const dataRef = d.data_vencimento || d.data_despesa;
                const dataObj = dayjs(dataRef);
                return dataObj.month() === mesFiltro && dataObj.year() === anoFiltro;
            });
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            lista = lista.filter(d => 
                d.descricao.toLowerCase().includes(term) || 
                (d.categoria_nome && d.categoria_nome.toLowerCase().includes(term))
            );
        }

        // Ordenação: Pendentes no topo, depois Pagos (mais recentes)
        lista.sort((a, b) => {
            if (a.pago === b.pago) return new Date(b.data_vencimento) - new Date(a.data_vencimento);
            return a.pago ? 1 : -1;
        });

        setFilteredDespesas(lista);
    }, [despesas, mesFiltro, anoFiltro, searchTerm]);

    // --- CÁLCULO DE TOTAIS (KPIs) ---
    const financialSummary = useMemo(() => {
        return filteredDespesas.reduce((acc, item) => {
            const valor = parseFloat(item.valor) || 0;
            acc.total += valor;
            if (item.pago) { 
                acc.pagas += valor;
            } else {
                acc.aPagar += valor;
            }
            return acc;
        }, { pagas: 0, aPagar: 0, total: 0 });
    }, [filteredDespesas]);

    // --- HANDLERS DE MODAL ---
    const handleOpenCreate = () => {
        setIsEditing(false);
        setFormData(initialFormState);
        setModalOpen(true);
    };

    const handleOpenEdit = (item) => {
        setIsEditing(true);
        setFormData({
            ...item,
            categoria: item.categoria, 
            data_despesa: item.data_despesa,
            data_vencimento: item.data_vencimento || item.data_despesa,
            // Garante que se tem data de pagamento, carrega ela. Se não, hoje.
            data_pagamento: item.data_pagamento || dayjs().format('YYYY-MM-DD'), 
            parcelado: false, 
            qtd_parcelas: 1
        });
        setModalOpen(true);
    };

    // Handler para Switch de Pago no Modal
    const handlePagoSwitchChange = (e) => {
        const isPago = e.target.checked;
        setFormData(prev => ({
            ...prev,
            pago: isPago,
            // Se marcou pago, sugere hoje. Se desmarcou, limpa.
            data_pagamento: isPago ? dayjs().format('YYYY-MM-DD') : null 
        }));
    };

    // --- AÇÕES CRUD ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Prepara payload garantindo que data_pagamento vá null se não for pago
            const payloadBase = {
                ...formData,
                data_pagamento: formData.pago ? formData.data_pagamento : null
            };

            if (isEditing) {
                await faturamentoService.updateDespesa(formData.id, payloadBase);
                showSnackbar('Despesa atualizada!', 'success');
            } else {
                if (formData.parcelado && formData.qtd_parcelas > 1) {
                    const promises = [];
                    const valorParcela = parseFloat(formData.valor) / formData.qtd_parcelas;
                    let dataBaseVencimento = dayjs(formData.data_vencimento);
                    let dataBaseEmissao = dayjs(formData.data_despesa);

                    for (let i = 0; i < formData.qtd_parcelas; i++) {
                        // Parcelamento inteligente: mantém dia fixo (ex: 30/01 -> 28/02 -> 30/03)
                        const novaDataVenc = dataBaseVencimento.add(i, 'month').format('YYYY-MM-DD');
                        
                        const payload = {
                            ...payloadBase,
                            descricao: `${formData.descricao} (${i + 1}/${formData.qtd_parcelas})`,
                            valor: valorParcela.toFixed(2),
                            data_despesa: dataBaseEmissao.add(i, 'month').format('YYYY-MM-DD'),
                            data_vencimento: novaDataVenc,
                            // Se for parcelado, geralmente só a 1ª é paga se o usuário marcou. 
                            // Aqui simplificamos: Se marcou pago no cadastro parcelado, considera só a 1ª paga ou todas? 
                            // Geralmente o usuário quer lançar a compra parcelada futura.
                            pago: i === 0 ? formData.pago : false, 
                            data_pagamento: (i === 0 && formData.pago) ? formData.data_pagamento : null
                        };
                        promises.push(faturamentoService.createDespesa(payload));
                    }
                    await Promise.all(promises);
                    showSnackbar(`${formData.qtd_parcelas} parcelas geradas!`, 'success');
                } else {
                    await faturamentoService.createDespesa(payloadBase);
                    showSnackbar('Despesa lançada!', 'success');
                }
            }
            setModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            showSnackbar('Erro ao salvar.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Excluir esta despesa?")) return;
        try {
            await faturamentoService.deleteDespesa(id);
            showSnackbar('Despesa removida.', 'success');
            fetchData();
        } catch (error) {
            showSnackbar('Erro ao excluir.', 'error');
        }
    };

    const handleToggleStatus = async (despesa) => {
        const novoStatus = !despesa.pago;
        // Otimistic UI update
        setDespesas(prev => prev.map(d => d.id === despesa.id ? { ...d, pago: novoStatus } : d));

        try {
            const payload = {
                id: despesa.id,
                descricao: despesa.descricao,
                valor: despesa.valor,
                categoria: despesa.categoria,
                data_despesa: despesa.data_despesa,
                data_vencimento: despesa.data_vencimento,
                pago: novoStatus,
                // Se marcou como pago na lista rápida, usa data de hoje
                data_pagamento: novoStatus ? dayjs().format('YYYY-MM-DD') : null
            };
            await faturamentoService.updateDespesa(despesa.id, payload);
            showSnackbar(novoStatus ? 'Pago!' : 'Pendente.', 'success');
        } catch (error) {
            fetchData(); // Reverte em caso de erro
            showSnackbar('Erro ao atualizar.', 'error');
        }
    };

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const getVencimentoColor = (dataVenc, pago) => {
        if (pago) return 'text.secondary';
        const hoje = dayjs();
        const venc = dayjs(dataVenc);
        if (venc.isBefore(hoje, 'day')) return 'error.main'; 
        if (venc.isSame(hoje, 'day')) return 'warning.main'; 
        return 'text.primary';
    };

    const KpiCard = ({ title, value, color, icon: Icon, bgColor }) => (
        <Paper elevation={0} sx={{ 
            p: 1, flex: 1, border: '1px solid #f0f0f0', borderRadius: '8px', 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            bgcolor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
            <Box sx={{ px: 1 }}>
                <Typography variant="caption" fontWeight="bold" sx={{color: '#95a5a6', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.5px'}}>{title}</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{color: color, mt: 0, fontSize: '1rem'}}>{formatMoney(value)}</Typography>
            </Box>
            <Box sx={{ bgcolor: bgColor, color: color, width: 28, height: 28, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1 }}>
                <Icon sx={{ fontSize: 16 }} />
            </Box>
        </Paper>
    );

    return (
        <Box sx={{ p: 1 }}>
            
            {/* 1. TOPO: FILTROS E AÇÃO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormControl size="small" sx={{ minWidth: 110 }}>
                        <InputLabel sx={{fontSize: '0.8rem'}}>Período</InputLabel>
                        <Select value={mesFiltro} label="Período" onChange={(e) => setMesFiltro(e.target.value)} sx={{ fontSize: '0.8rem', bgcolor: '#fff', height: '32px' }}>
                            <MenuItem value=""><em>Todos</em></MenuItem>
                            {Array.from({length: 12}, (_, i) => (
                                <MenuItem key={i} value={i} sx={{fontSize: '0.8rem'}}>{dayjs().month(i).format('MMMM')}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select value={anoFiltro} onChange={(e) => setAnoFiltro(e.target.value)} sx={{ fontSize: '0.8rem', bgcolor: '#fff', height: '32px' }}>
                            <MenuItem value={2024}>2024</MenuItem>
                            <MenuItem value={2025}>2025</MenuItem>
                            <MenuItem value={2026}>2026</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                <Button variant="contained" startIcon={<AddCircleOutline sx={{fontSize: 18}} />} onClick={handleOpenCreate} sx={{ bgcolor: '#1a233b', '&:hover': { bgcolor: '#2c3a5b' }, borderRadius: '6px', px: 2, py: 0.5, textTransform: 'none', fontWeight: 'bold', fontSize: '0.8rem' }}>
                    Nova Despesa
                </Button>
            </Box>

            {/* 2. KPIs */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                <KpiCard title={mesFiltro === '' ? "A Pagar (Geral)" : "A Pagar (Mês)"} value={financialSummary.aPagar} color="#dc3545" bgColor="#fff5f5" icon={Warning} />
                <KpiCard title={mesFiltro === '' ? "Pago (Geral)" : "Pago (Mês)"} value={financialSummary.pagas} color="#28a745" bgColor="#f0fff4" icon={CheckCircle} />
                <KpiCard title="Total Acumulado" value={financialSummary.total} color="#1a233b" bgColor="#f8f9fa" icon={MoneyOff} />
            </Box>

            {/* 3. BARRA DE BUSCA */}
            <Paper elevation={0} sx={{ p: 0.5, px: 1.5, mb: 2, border: '1px solid #f0f0f0', borderRadius: '8px' }}>
                <TextField fullWidth variant="standard" placeholder="Buscar por descrição..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} InputProps={{ disableUnderline: true, startAdornment: <InputAdornment position="start"><Search sx={{color:'#ccc', fontSize: 20}} /></InputAdornment>, style: { fontSize: '0.85rem' } }} />
            </Paper>

            {/* 4. TABELA DE DADOS */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #f0f0f0', borderRadius: '8px', overflow: 'hidden' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                        <TableRow>
                            {/* --- COLUNAS SEPARADAS DE DATAS --- */}
                            <TableCell sx={{fontWeight:'bold', color:'#666', fontSize:'0.75rem', width: '100px'}}>Vencimento</TableCell>
                            <TableCell sx={{fontWeight:'bold', color:'#666', fontSize:'0.75rem', width: '100px'}}>Pagamento</TableCell>
                            
                            <TableCell sx={{fontWeight:'bold', color:'#666', fontSize:'0.75rem'}}>Descrição</TableCell>
                            <TableCell sx={{fontWeight:'bold', color:'#666', fontSize:'0.75rem'}}>Categoria</TableCell>
                            <TableCell align="right" sx={{fontWeight:'bold', color:'#666', fontSize:'0.75rem'}}>Valor</TableCell>
                            <TableCell align="center" sx={{fontWeight:'bold', color:'#666', fontSize:'0.75rem'}}>Status</TableCell>
                            <TableCell align="center" sx={{fontWeight:'bold', color:'#666', fontSize:'0.75rem'}}>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredDespesas.length > 0 ? filteredDespesas.map((item) => (
                            <TableRow key={item.id} hover>
                                {/* DATA VENCIMENTO */}
                                <TableCell sx={{ fontSize: '0.8rem' }}>
                                    <Typography variant="body2" fontWeight="500" color={getVencimentoColor(item.data_vencimento, item.pago)} sx={{ fontSize: '0.8rem' }}>
                                        {formatDataSimples(item.data_vencimento)}
                                    </Typography>
                                </TableCell>
                                
                                {/* DATA PAGAMENTO (Verde se existir) */}
                                <TableCell sx={{ fontSize: '0.8rem' }}>
                                    {item.data_pagamento ? (
                                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#2e7d32', bgcolor: '#e8f5e9', px: 0.8, py: 0.3, borderRadius: 1 }}>
                                            {formatDataSimples(item.data_pagamento)}
                                        </Typography>
                                    ) : '-'}
                                </TableCell>

                                <TableCell sx={{ fontSize: '0.85rem' }}>{item.descricao}</TableCell>
                                <TableCell><Chip label={item.categoria_nome} size="small" sx={{fontSize:'0.65rem', height: 20, bgcolor: '#f5f5f5', color: '#555'}} /></TableCell>
                                <TableCell align="right" sx={{fontWeight:'bold', color:'#1a233b', fontSize: '0.85rem'}}>
                                    {formatMoney(item.valor)}
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title={item.pago ? "Marcar como pendente" : "Marcar como pago"}>
                                        <Switch size="small" checked={!!item.pago} onChange={() => handleToggleStatus(item)} color="success"/>
                                    </Tooltip>
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton size="small" onClick={() => handleOpenEdit(item)}><Edit sx={{ fontSize: 16 }} /></IconButton>
                                    <IconButton size="small" onClick={() => handleDelete(item.id)} color="error"><Delete sx={{ fontSize: 16 }} /></IconButton>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{py:4, color:'#999', fontSize: '0.85rem'}}>Nenhuma despesa encontrada.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
            <Dialog open={modalOpen} onClose={() => setModalOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1a233b', fontSize: '1rem', borderBottom: '1px solid #f0f0f0', pb: 1 }}>
                    {isEditing ? 'Editar Despesa' : 'Nova Despesa'}
                </DialogTitle>
                <form onSubmit={handleSubmit}>
                    <DialogContent sx={{ pt: 2, bgcolor: '#fcfcfc' }}>
                        <Grid container spacing={2}>
                            
                            {/* DADOS GERAIS */}
                            <Grid item xs={12}>
                                <Paper elevation={0} variant="outlined" sx={{ p: 2, bgcolor: '#fff' }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary" mb={1} display="block">DADOS GERAIS</Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <TextField label="Descrição" fullWidth required size="medium" value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} placeholder="Ex: Aluguel, Material"/>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField select label="Categoria" fullWidth required size="medium" value={formData.categoria} onChange={(e) => setFormData({...formData, categoria: e.target.value})}>
                                                {categorias.map(cat => <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>)}
                                            </TextField>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </Grid>

                            {/* VALORES E DATAS */}
                            <Grid item xs={12}>
                                <Paper elevation={0} variant="outlined" sx={{ p: 2, bgcolor: '#fff' }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary" mb={1} display="block">FINANCEIRO</Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <TextField label="Valor (R$)" type="number" fullWidth required size="medium" value={formData.valor} onChange={(e) => setFormData({...formData, valor: e.target.value})} InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}/>
                                        </Grid>
                                        <Grid item xs={6} display="flex" alignItems="center">
                                            <FormControlLabel control={<Switch checked={formData.pago} onChange={handlePagoSwitchChange} color="success"/>} label={<Typography fontSize="0.9rem">Já Pago?</Typography>} />
                                        </Grid>
                                        
                                        <Grid item xs={6}>
                                            <DatePicker label="Data Emissão" value={dayjs(formData.data_despesa)} onChange={(v) => setFormData({...formData, data_despesa: v ? v.format('YYYY-MM-DD') : ''})} slotProps={{ textField: { fullWidth: true, size: 'medium' } }}/>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <DatePicker label="Vencimento" value={dayjs(formData.data_vencimento)} onChange={(v) => setFormData({...formData, data_vencimento: v ? v.format('YYYY-MM-DD') : ''})} slotProps={{ textField: { fullWidth: true, size: 'medium' } }}/>
                                        </Grid>

                                        {/* CAMPO DE DATA DE PAGAMENTO (SÓ APARECE SE 'JÁ PAGO' ESTIVER MARCADO) */}
                                        {formData.pago && (
                                            <Grid item xs={12}>
                                                <DatePicker 
                                                    label="Data do Pagamento" 
                                                    value={dayjs(formData.data_pagamento)} 
                                                    onChange={(v) => setFormData({...formData, data_pagamento: v ? v.format('YYYY-MM-DD') : ''})} 
                                                    slotProps={{ 
                                                        textField: { 
                                                            fullWidth: true, 
                                                            size: 'medium', 
                                                            color: 'success', 
                                                            focused: true,
                                                            helperText: "Data real da saída do caixa"
                                                        } 
                                                    }}
                                                />
                                            </Grid>
                                        )}
                                    </Grid>
                                </Paper>
                            </Grid>

                            {!isEditing && (
                                <Grid item xs={12}>
                                    <Box sx={{ p: 1.5, bgcolor: '#f4f7fa', borderRadius: 2, border: '1px dashed #d0d7de', display: 'flex', alignItems: 'center' }}>
                                        <FormControlLabel control={<Checkbox size="small" checked={formData.parcelado} onChange={(e) => setFormData({...formData, parcelado: e.target.checked})} />} label={<Typography fontSize="0.85rem">Repetir / Parcelar?</Typography>} />
                                        {formData.parcelado && (
                                            <TextField label="Vezes" type="number" size="small" sx={{ width: 80, ml: 2, bgcolor: '#fff' }} value={formData.qtd_parcelas} onChange={(e) => setFormData({...formData, qtd_parcelas: e.target.value})} />
                                        )}
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, bgcolor: '#fcfcfc', borderTop: '1px solid #f0f0f0' }}>
                        <Button onClick={() => setModalOpen(false)} size="small" sx={{color: '#666'}}>Cancelar</Button>
                        <Button type="submit" variant="contained" disabled={isSubmitting} size="small" sx={{ bgcolor: '#1a233b', px: 3 }}>
                            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Salvar'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
}