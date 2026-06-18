// src/components/ponto/RelatorioPontoTab.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Typography, CircularProgress, Chip, Alert, IconButton, Tooltip, Button,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, 
    InputLabel, FormControl, Tabs, Tab, Grid, Divider
} from '@mui/material';
import { Refresh, GpsFixed, ErrorOutline, CheckCircle, Edit, Delete, Add, Block, Print } from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';

export default function RelatorioPontoTab() {
    const [abaAtual, setAbaAtual] = useState(0); // 0 = Auditoria, 1 = Espelho Mensal
    const [logs, setLogs] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');

    // Estados do Modal de Ponto Manual
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, usuario: '', data_hora: '', tipo: 'entrada', observacao: '' });
    const [isSaving, setIsSaving] = useState(false);

    // Estados do Espelho Mensal
    const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1);
    const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());
    const [filtroUsuario, setFiltroUsuario] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        setErro('');
        try {
            const response = await apiClient.get('/usuarios/ponto/admin/');
            setLogs(response.data);
        } catch (error) {
            setErro('Erro ao carregar os relatórios de ponto. Verifique suas permissões.');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsuarios = async () => {
        try {
            const response = await apiClient.get('/usuarios/usuarios/'); 
            const listaUsuarios = response.data.results || response.data;
            setUsuarios(Array.isArray(listaUsuarios) ? listaUsuarios : []);
        } catch (error) {
            setUsuarios([]); 
        }
    };

    useEffect(() => {
        fetchLogs();
        fetchUsuarios();
    }, []);

    // --- FUNÇÕES DE CRUD DO RH (Aba 0) ---
    const handleOpenModal = (log = null) => {
        if (log) {
            const dateObj = new Date(log.data_hora);
            const tzOffset = dateObj.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(dateObj - tzOffset)).toISOString().slice(0, 16);
            setFormData({ id: log.id, usuario: log.usuario, data_hora: localISOTime, tipo: log.tipo, observacao: '' });
        } else {
            const now = new Date();
            const tzOffset = now.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(now - tzOffset)).toISOString().slice(0, 16);
            setFormData({ id: null, usuario: '', data_hora: localISOTime, tipo: 'entrada', observacao: '' });
        }
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.usuario || !formData.data_hora || !formData.observacao) return alert('Preencha funcionário, data/hora e justificativa.');
        setIsSaving(true);
        try {
            const payload = { usuario: formData.usuario, data_hora: new Date(formData.data_hora).toISOString(), tipo: formData.tipo, observacao: formData.observacao, status: 'ajuste_manual' };
            if (formData.id) await apiClient.patch(`/usuarios/ponto/admin/${formData.id}/`, payload);
            else await apiClient.post('/usuarios/ponto/admin/', payload);
            fetchLogs();
            setModalOpen(false);
        } catch (error) {
            alert('Erro ao salvar o registro.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja CANCELAR este registro?')) {
            try {
                await apiClient.delete(`/usuarios/ponto/admin/${id}/`);
                fetchLogs();
            } catch (error) {
                alert('Erro ao cancelar o registro.');
            }
        }
    };

    // --- FUNÇÕES DO ESPELHO MENSAL (Aba 1) ---
    const formatarHorasMinutos = (totalMs) => {
        const horas = Math.floor(totalMs / (1000 * 60 * 60));
        const minutos = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
    };

    const gerarRelatorioMensal = () => {
        if (!filtroUsuario) return null;

        // 1. Filtra apenas logs Válidos, do Usuário e do Mês/Ano escolhido
        const logsFiltrados = logs.filter(log => {
            if (log.status === 'cancelado' || log.status === 'rejeitado') return false;
            if (log.usuario !== filtroUsuario) return false;
            
            const dataLog = new Date(log.data_hora);
            return (dataLog.getMonth() + 1 === filtroMes && dataLog.getFullYear() === filtroAno);
        });

        // 2. Agrupa por Dia (Ex: "2026-06-18": [log1, log2...])
        const diasAgrupados = {};
        logsFiltrados.forEach(log => {
            const dataObj = new Date(log.data_hora);
            const dataString = dataObj.toISOString().split('T')[0]; // YYYY-MM-DD
            if (!diasAgrupados[dataString]) diasAgrupados[dataString] = [];
            diasAgrupados[dataString].push(log);
        });

        let totalMensalMs = 0;
        const relatorioFinal = [];

        // 3. Processa cada dia do mês (1 a 31)
        const diasNoMes = new Date(filtroAno, filtroMes, 0).getDate();
        
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const dataString = `${filtroAno}-${filtroMes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
            const logsDoDia = diasAgrupados[dataString] || [];
            
            // Ordena cronologicamente
            logsDoDia.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

            let msTrabalhadosDia = 0;
            const horariosDisplay = [];

            // Calcula o tempo de pares de batidas (1-2, 3-4, etc)
            for (let i = 0; i < logsDoDia.length; i += 2) {
                const batida1 = new Date(logsDoDia[i].data_hora);
                horariosDisplay.push(batida1.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

                if (logsDoDia[i + 1]) {
                    const batida2 = new Date(logsDoDia[i + 1].data_hora);
                    horariosDisplay.push(batida2.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                    msTrabalhadosDia += (batida2 - batida1);
                } else {
                    horariosDisplay.push('? (Incompleto)');
                }
            }

            totalMensalMs += msTrabalhadosDia;

            relatorioFinal.push({
                diaStr: `${dia.toString().padStart(2, '0')}/${filtroMes.toString().padStart(2, '0')}/${filtroAno}`,
                horarios: horariosDisplay.join(' | '),
                horasDiaText: msTrabalhadosDia > 0 ? formatarHorasMinutos(msTrabalhadosDia) : '-',
                isFimDeSemana: new Date(filtroAno, filtroMes - 1, dia).getDay() === 0 || new Date(filtroAno, filtroMes - 1, dia).getDay() === 6
            });
        }

        return { linhas: relatorioFinal, totalHorasText: formatarHorasMinutos(totalMensalMs) };
    };

    const handlePrint = () => {
        window.print();
    };

    // --- COMPONENTES AUXILIARES ---
    const renderStatus = (status, observacao) => {
        if (status === 'aprovado') return <Chip icon={<CheckCircle />} label="Aprovado" color="success" size="small" variant="outlined" />;
        if (status === 'rejeitado') return <Tooltip title={observacao || 'Bloqueado'}><Chip icon={<ErrorOutline />} label="Bloqueado" color="error" size="small" /></Tooltip>;
        if (status === 'cancelado') return <Chip icon={<Block />} label="Cancelado" size="small" sx={{ bgcolor: '#eee', color: '#666' }} />;
        return <Chip label="Ajuste Manual" color="info" size="small" />;
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

    const dadosEspelho = abaAtual === 1 ? gerarRelatorioMensal() : null;
    const usuarioSelecionadoObj = usuarios.find(u => u.id === filtroUsuario);

    return (
        <Box>
            {/* ESTILOS PARA IMPRESSÃO (Oculta botões e menus quando dá Ctrl+P) */}
            <style>
                {`
                @media print {
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    body { background: white; margin: 0; padding: 0; }
                    @page { margin: 1cm; }
                }
                `}
            </style>

            <Box className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" color="primary">Gestão de Ponto Eletrônico</Typography>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="contained" color="primary" startIcon={<Add />} onClick={() => handleOpenModal()} size="small" sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                        Ponto Manual
                    </Button>
                    <IconButton onClick={fetchLogs} color="primary" title="Atualizar">
                        <Refresh />
                    </IconButton>
                </Box>
            </Box>

            {erro && <Alert severity="error" sx={{ mb: 2 }} className="no-print">{erro}</Alert>}

            {/* ABAS (TABS) */}
            <Tabs value={abaAtual} onChange={(e, newValue) => setAbaAtual(newValue)} sx={{ mb: 2 }} className="no-print">
                <Tab label="Auditoria de Logs (Geral)" />
                <Tab label="Espelho de Ponto (Mensal)" />
            </Tabs>

            {/* CONTEÚDO DA ABA 0: AUDITORIA */}
            {abaAtual === 0 && (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 300px)' }} className="no-print">
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow sx={{ '& th': { bgcolor: '#f5f5f5', fontWeight: 'bold' } }}>
                                <TableCell>Data e Hora</TableCell>
                                <TableCell>Funcionário</TableCell>
                                <TableCell>Tipo</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Obs (Logs)</TableCell>
                                <TableCell align="center">Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {logs.map((log) => {
                                const isCancelado = log.status === 'cancelado';
                                return (
                                    <TableRow key={log.id} hover sx={{ bgcolor: log.status === 'rejeitado' ? '#fff5f5' : (isCancelado ? '#f9f9f9' : 'inherit'), opacity: isCancelado ? 0.6 : 1 }}>
                                        <TableCell sx={{ whiteSpace: 'nowrap', textDecoration: isCancelado ? 'line-through' : 'none' }}>
                                            {new Date(log.data_hora).toLocaleString('pt-BR')}
                                        </TableCell>
                                        <TableCell><strong>{log.nome_funcionario}</strong></TableCell>
                                        <TableCell sx={{ textTransform: 'capitalize' }}>{log.tipo_display}</TableCell>
                                        <TableCell>{renderStatus(log.status, log.observacao)}</TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.observacao}>{log.observacao}</TableCell>
                                        <TableCell align="center">
                                            <IconButton size="small" color="primary" onClick={() => handleOpenModal(log)} disabled={isCancelado}><Edit fontSize="small" /></IconButton>
                                            <IconButton size="small" color="error" onClick={() => handleDelete(log.id)} disabled={isCancelado}><Delete fontSize="small" /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* CONTEÚDO DA ABA 1: ESPELHO DE PONTO MENSAL */}
            {abaAtual === 1 && (
                <Box>
                    <Paper className="no-print" sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa' }} variant="outlined">
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={4}>
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Funcionário</InputLabel>
                                    <Select value={filtroUsuario} label="Funcionário" onChange={(e) => setFiltroUsuario(e.target.value)}>
                                        <MenuItem value=""><em>Selecione...</em></MenuItem>
                                        {usuarios.map(u => (
                                            <MenuItem key={u.id} value={u.id}>
                                                {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <TextField size="small" fullWidth type="number" label="Mês (1 a 12)" value={filtroMes} onChange={(e) => setFiltroMes(Number(e.target.value))} inputProps={{ min: 1, max: 12 }} />
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <TextField size="small" fullWidth type="number" label="Ano" value={filtroAno} onChange={(e) => setFiltroAno(Number(e.target.value))} />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <Button fullWidth variant="contained" color="secondary" startIcon={<Print />} onClick={handlePrint} disabled={!filtroUsuario}>
                                    Imprimir
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* ÁREA DE IMPRESSÃO DO ESPELHO */}
                    {filtroUsuario && dadosEspelho && (
                        <Paper id="area-impressao" sx={{ p: 4, bgcolor: '#fff' }} variant="outlined">
                            <Typography variant="h5" align="center" sx={{ fontWeight: 'bold', mb: 1, textTransform: 'uppercase' }}>
                                Espelho de Ponto Individual
                            </Typography>
                            <Typography align="center" sx={{ mb: 3 }} color="text.secondary">
                                Referência: {filtroMes.toString().padStart(2, '0')}/{filtroAno}
                            </Typography>
                            
                            <Divider sx={{ mb: 2 }} />
                            
                            <Box sx={{ mb: 3 }}>
                                <Typography><strong>Funcionário:</strong> {usuarioSelecionadoObj ? `${usuarioSelecionadoObj.first_name || ''} ${usuarioSelecionadoObj.last_name || ''}`.trim() || usuarioSelecionadoObj.username : ''}</Typography>
                                {usuarioSelecionadoObj?.cpf && <Typography><strong>CPF:</strong> {usuarioSelecionadoObj.cpf}</Typography>}
                                {usuarioSelecionadoObj?.cargo && <Typography><strong>Cargo:</strong> {usuarioSelecionadoObj.cargo.toUpperCase()}</Typography>}
                            </Box>

                            <Table size="small" sx={{ mb: 4, border: '1px solid #ddd' }}>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#eee' }}>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Data</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Batidas Registradas (Entrada | Pausa | Retorno | Saída)</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Horas Trabalhadas</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {dadosEspelho.linhas.map((linha, index) => (
                                        <TableRow key={index} sx={{ bgcolor: linha.isFimDeSemana ? '#fcfcfc' : 'inherit' }}>
                                            <TableCell>{linha.diaStr} {linha.isFimDeSemana && '(FDS)'}</TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace' }}>{linha.horarios}</TableCell>
                                            <TableCell sx={{ textAlign: 'right', fontWeight: 'bold' }}>{linha.horasDiaText}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                                        <TableCell colSpan={2} sx={{ fontWeight: 'bold', textAlign: 'right' }}>Total de Horas no Mês:</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', fontSize: '1.1rem' }}>{dadosEspelho.totalHorasText}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>

                            <Box sx={{ mt: 10, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                                <Box sx={{ width: '40%', borderTop: '1px solid black', pt: 1 }}>
                                    <Typography variant="body2">Assinatura do Responsável (RH)</Typography>
                                </Box>
                                <Box sx={{ width: '40%', borderTop: '1px solid black', pt: 1 }}>
                                    <Typography variant="body2">Assinatura do Funcionário</Typography>
                                </Box>
                            </Box>
                        </Paper>
                    )}

                    {!filtroUsuario && (
                        <Typography align="center" color="text.secondary" sx={{ mt: 5 }} className="no-print">
                            Selecione um funcionário acima para gerar o espelho de ponto.
                        </Typography>
                    )}
                </Box>
            )}

            {/* MODAL DE ADIÇÃO / EDIÇÃO MANUTENÇÃO */}
            <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth className="no-print">
                <DialogTitle>{formData.id ? 'Editar Ponto' : 'Novo Ponto Manual'}</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                        <FormControl size="small" fullWidth disabled={!!formData.id}>
                            <InputLabel>Funcionário</InputLabel>
                            <Select value={formData.usuario} onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}>
                                {usuarios.map(u => (
                                    <MenuItem key={u.id} value={u.id}>{`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField label="Data e Hora do Ponto" type="datetime-local" size="small" fullWidth InputLabelProps={{ shrink: true }} value={formData.data_hora} onChange={(e) => setFormData({ ...formData, data_hora: e.target.value })} />
                        <FormControl size="small" fullWidth>
                            <InputLabel>Tipo</InputLabel>
                            <Select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}>
                                <MenuItem value="entrada">Entrada</MenuItem>
                                <MenuItem value="saida_pausa">Saída Pausa</MenuItem>
                                <MenuItem value="retorno_pausa">Retorno Pausa</MenuItem>
                                <MenuItem value="saida">Saída (Fim Exp.)</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField label="Justificativa" size="small" fullWidth multiline rows={3} value={formData.observacao} onChange={(e) => setFormData({ ...formData, observacao: e.target.value })} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalOpen(false)} color="inherit">Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" color="primary" disabled={isSaving}>Salvar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}