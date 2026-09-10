// src/components/ponto/RelatorioPontoTab.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Typography, CircularProgress, Chip, Alert, IconButton, Tooltip, Button,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, 
    InputLabel, FormControl, Tabs, Tab, Grid, Divider
} from '@mui/material';
import { Refresh, ErrorOutline, CheckCircle, Edit, Delete, Add, Block, Print } from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';
import dayjs from 'dayjs';

import '../../atendimento.css';

export default function RelatorioPontoTab() {
    const [abaAtual, setAbaAtual] = useState(0); 
    const [logs, setLogs] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, usuario: '', data_hora: '', tipo: 'entrada', observacao: '' });
    const [isSaving, setIsSaving] = useState(false);

    const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1);
    const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());
    const [filtroUsuario, setFiltroUsuario] = useState('');

    const fetchLogs = async () => {
        setLoading(true); setErro('');
        try {
            const response = await apiClient.get('/usuarios/ponto/admin/');
            setLogs(response.data);
        } catch (error) { setErro('Erro ao carregar os relatórios de ponto. Verifique suas permissões.'); } 
        finally { setLoading(false); }
    };

    const fetchUsuarios = async () => {
        try {
            const response = await apiClient.get('/usuarios/usuarios/'); 
            const listaUsuarios = response.data.results || response.data;
            setUsuarios(Array.isArray(listaUsuarios) ? listaUsuarios : []);
        } catch (error) { setUsuarios([]); }
    };

    useEffect(() => { fetchLogs(); fetchUsuarios(); }, []);

    const handleOpenModal = (log = null) => {
        if (log) {
            const localISOTime = dayjs(log.data_hora).format('YYYY-MM-DDTHH:mm');
            setFormData({ id: log.id, usuario: log.usuario, data_hora: localISOTime, tipo: log.tipo, observacao: '' });
        } else {
            const localISOTime = dayjs().format('YYYY-MM-DDTHH:mm');
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
            fetchLogs(); setModalOpen(false);
        } catch (error) { alert('Erro ao salvar o registro.'); } 
        finally { setIsSaving(false); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja CANCELAR este registro?')) {
            try { await apiClient.delete(`/usuarios/ponto/admin/${id}/`); fetchLogs(); } 
            catch (error) { alert('Erro ao cancelar o registro.'); }
        }
    };

    const formatarHorasMinutos = (totalMs) => {
        const horas = Math.floor(totalMs / (1000 * 60 * 60));
        const minutos = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
    };

    const gerarRelatorioMensal = () => {
        if (!filtroUsuario) return null;
        const logsFiltrados = logs.filter(log => {
            if (log.status === 'cancelado' || log.status === 'rejeitado') return false;
            if (log.usuario !== filtroUsuario) return false;
            const dataLog = new Date(log.data_hora);
            return (dataLog.getMonth() + 1 === filtroMes && dataLog.getFullYear() === filtroAno);
        });

        const diasAgrupados = {};
        logsFiltrados.forEach(log => {
            const dataString = new Date(log.data_hora).toISOString().split('T')[0];
            if (!diasAgrupados[dataString]) diasAgrupados[dataString] = [];
            diasAgrupados[dataString].push(log);
        });

        let totalMensalMs = 0;
        const relatorioFinal = [];
        const diasNoMes = new Date(filtroAno, filtroMes, 0).getDate();
        
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const dataString = `${filtroAno}-${filtroMes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
            const logsDoDia = diasAgrupados[dataString] || [];
            logsDoDia.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

            let msTrabalhadosDia = 0;
            const horariosDisplay = [];

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

    const renderStatus = (status, observacao) => {
        if (status === 'aprovado') return <Chip icon={<CheckCircle />} label="Aprovado" sx={{ bgcolor: '#e7f5ff', color: '#1c7ed6', fontWeight: 600, height: 22, fontSize: '10px' }} />;
        if (status === 'rejeitado') return <Tooltip title={observacao || 'Bloqueado'}><Chip icon={<ErrorOutline />} label="Bloqueado" sx={{ bgcolor: '#fff0f6', color: '#c2255c', fontWeight: 600, height: 22, fontSize: '10px' }} /></Tooltip>;
        if (status === 'cancelado') return <Chip icon={<Block />} label="Cancelado" sx={{ bgcolor: '#f1f3f5', color: '#868e96', fontWeight: 600, height: 22, fontSize: '10px' }} />;
        return <Chip label="Ajuste Manual" sx={{ bgcolor: '#fff4e6', color: '#e8590c', fontWeight: 600, height: 22, fontSize: '10px' }} />;
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

    const dadosEspelho = abaAtual === 1 ? gerarRelatorioMensal() : null;
    const usuarioSelecionadoObj = usuarios.find(u => u.id === filtroUsuario);
    const thStyle = { fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #e9ecef' };

    return (
        <Box className="tasy-workspace tasy-flat-panel" sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#f1f3f5' }}>
            <style>
                {`
                @media print {
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    body { background: white; margin: 0; padding: 0; }
                    @page { margin: 1cm; }
                    #area-impressao { box-shadow: none !important; border: none !important; padding: 0 !important; }
                }
                `}
            </style>

            {erro && <Alert severity="error" sx={{ borderRadius: 0, borderBottom: '1px solid #f5c2c7' }} className="no-print">{erro}</Alert>}

            <Box className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#fff', borderBottom: '1px solid #e9ecef' }}>
                <Typography sx={{ fontWeight: 600, color: '#495057', fontSize: '13px', textTransform: 'uppercase' }}>
                    Gestão de Ponto Eletrônico
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <Button variant="contained" disableElevation color="primary" startIcon={<Add />} onClick={() => handleOpenModal()} size="small" sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#1c7ed6', fontSize: '12px' }}>
                        Ponto Manual
                    </Button>
                    <IconButton onClick={fetchLogs} size="small" sx={{ color: '#868e96', '&:hover': { color: '#1c7ed6' } }} title="Atualizar">
                        <Refresh fontSize="small" />
                    </IconButton>
                </Box>
            </Box>

            <Box sx={{ borderBottom: '1px solid #dee2e6', bgcolor: '#ffffff', px: 2 }} className="no-print">
                <Tabs value={abaAtual} onChange={(e, newValue) => setAbaAtual(newValue)} sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, fontWeight: 600, fontSize: '12px', textTransform: 'none' } }}>
                    <Tab label="Auditoria de Logs (Geral)" />
                    <Tab label="Espelho de Ponto (Mensal)" />
                </Tabs>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', bgcolor: '#ffffff' }} className={abaAtual === 1 ? 'print-only-container' : 'no-print'}>
                {abaAtual === 0 && (
                    <TableContainer>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={thStyle}>Data e Hora</TableCell>
                                    <TableCell sx={thStyle}>Funcionário</TableCell>
                                    <TableCell sx={thStyle}>Tipo</TableCell>
                                    <TableCell sx={thStyle}>Status</TableCell>
                                    <TableCell sx={thStyle}>Observação / Log</TableCell>
                                    <TableCell align="center" sx={thStyle}>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {logs.map((log) => {
                                    const isCancelado = log.status === 'cancelado';
                                    return (
                                        <TableRow key={log.id} hover sx={{ bgcolor: log.status === 'rejeitado' ? '#fff5f5' : (isCancelado ? '#f9f9f9' : 'inherit'), opacity: isCancelado ? 0.6 : 1 }}>
                                            <TableCell sx={{ fontSize: '12px', color: '#495057', whiteSpace: 'nowrap', textDecoration: isCancelado ? 'line-through' : 'none' }}>
                                                {new Date(log.data_hora).toLocaleString('pt-BR')}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#343a40' }}>{log.nome_funcionario}</TableCell>
                                            <TableCell sx={{ fontSize: '12px', textTransform: 'capitalize' }}>{log.tipo_display}</TableCell>
                                            <TableCell>{renderStatus(log.status, log.observacao)}</TableCell>
                                            <TableCell sx={{ fontSize: '11px', color: '#868e96', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.observacao}>{log.observacao}</TableCell>
                                            <TableCell align="center">
                                                <IconButton size="small" sx={{ color: '#868e96', '&:hover': { color: '#1c7ed6' } }} onClick={() => handleOpenModal(log)} disabled={isCancelado}><Edit fontSize="small" /></IconButton>
                                                <IconButton size="small" sx={{ color: '#868e96', '&:hover': { color: '#e03131' } }} onClick={() => handleDelete(log.id)} disabled={isCancelado}><Delete fontSize="small" /></IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {abaAtual === 1 && (
                    <Box sx={{ p: 3, bgcolor: '#f4f6f8', minHeight: '100%' }}>
                        <div className="tasy-panel theme-blue no-print" style={{ marginBottom: '24px' }}>
                            <div className="tasy-panel-body">
                                <div className="tasy-section-header">Filtros de Geração</div>
                                <Grid container spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
                                    <Grid item xs={12} md={4}>
                                        <FormControl size="small" fullWidth className="tasy-compact-input">
                                            <InputLabel>Funcionário</InputLabel>
                                            <Select value={filtroUsuario} label="Funcionário" onChange={(e) => setFiltroUsuario(e.target.value)}>
                                                <MenuItem value=""><em>Selecione...</em></MenuItem>
                                                {usuarios.map(u => <MenuItem key={u.id} value={u.id}>{`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <TextField className="tasy-compact-input" size="small" fullWidth type="number" label="Mês (1 a 12)" value={filtroMes} onChange={(e) => setFiltroMes(Number(e.target.value))} inputProps={{ min: 1, max: 12 }} />
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <TextField className="tasy-compact-input" size="small" fullWidth type="number" label="Ano" value={filtroAno} onChange={(e) => setFiltroAno(Number(e.target.value))} />
                                    </Grid>
                                    <Grid item xs={12} md={2}>
                                        <Button fullWidth variant="contained" disableElevation color="secondary" startIcon={<Print fontSize="small" />} onClick={handlePrint} disabled={!filtroUsuario} sx={{ height: 36, fontWeight: 600, fontSize: '12px' }}>
                                            Imprimir
                                        </Button>
                                    </Grid>
                                </Grid>
                            </div>
                        </div>

                        {filtroUsuario && dadosEspelho && (
                            <Paper id="area-impressao" sx={{ p: 4, bgcolor: '#fff', border: '1px solid #dee2e6', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} elevation={0}>
                                <Typography align="center" sx={{ fontWeight: 700, fontSize: '16px', mb: 0.5, textTransform: 'uppercase', color: '#212529' }}>
                                    Espelho de Ponto Individual
                                </Typography>
                                <Typography align="center" sx={{ mb: 3, fontSize: '13px', color: '#495057' }}>
                                    Referência: {filtroMes.toString().padStart(2, '0')}/{filtroAno}
                                </Typography>
                                
                                <Divider sx={{ mb: 2 }} />
                                
                                <Box sx={{ mb: 3, fontSize: '13px', color: '#343a40' }}>
                                    <Typography variant="body2" sx={{ mb: 0.5 }}><strong>Funcionário:</strong> {usuarioSelecionadoObj ? `${usuarioSelecionadoObj.first_name || ''} ${usuarioSelecionadoObj.last_name || ''}`.trim() || usuarioSelecionadoObj.username : ''}</Typography>
                                    {usuarioSelecionadoObj?.cpf && <Typography variant="body2" sx={{ mb: 0.5 }}><strong>CPF:</strong> {usuarioSelecionadoObj.cpf}</Typography>}
                                    {usuarioSelecionadoObj?.cargo && <Typography variant="body2"><strong>Cargo:</strong> {usuarioSelecionadoObj.cargo.toUpperCase()}</Typography>}
                                </Box>

                                <Table size="small" sx={{ borderCollapse: 'collapse', '& th, & td': { border: '1px solid #cfcfcf' } }}>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#f1f3f5' }}>
                                            <TableCell sx={{ fontWeight: 600, textAlign: 'center', width: '20%', fontSize: '12px', color: '#495057' }}>Data</TableCell>
                                            <TableCell sx={{ fontWeight: 600, textAlign: 'center', fontSize: '12px', color: '#495057' }}>Batidas Registradas</TableCell>
                                            <TableCell sx={{ fontWeight: 600, textAlign: 'center', width: '20%', fontSize: '12px', color: '#495057' }}>Horas Trabalhadas</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {dadosEspelho.linhas.map((linha, index) => (
                                            <TableRow key={index} sx={{ bgcolor: linha.isFimDeSemana ? '#f8f9fa' : 'inherit' }}>
                                                <TableCell sx={{ textAlign: 'center', fontSize: '12px', color: '#495057' }}>
                                                    {linha.diaStr} {linha.isFimDeSemana && <span style={{fontSize: '10px', color: '#868e96'}}><br/>(FDS)</span>}
                                                </TableCell>
                                                <TableCell sx={{ fontFamily: 'monospace', textAlign: 'center', letterSpacing: '1px', fontSize: '13px', color: '#343a40' }}>
                                                    {linha.horarios}
                                                </TableCell>
                                                <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '12px', color: linha.horasDiaText !== '-' ? '#212529' : '#adb5bd' }}>
                                                    {linha.horasDiaText}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow sx={{ bgcolor: '#e7f5ff' }}>
                                            <TableCell colSpan={2} sx={{ fontWeight: 700, textAlign: 'right', textTransform: 'uppercase', fontSize: '12px', color: '#1c7ed6' }}>
                                                Total de Horas no Mês:
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, textAlign: 'center', fontSize: '16px', color: '#1864ab' }}>
                                                {dadosEspelho.totalHorasText}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </Paper>
                        )}
                        {!filtroUsuario && (
                            <Typography align="center" sx={{ mt: 5, fontSize: '13px', color: '#868e96' }} className="no-print">
                                Selecione um funcionário acima para gerar o espelho de ponto.
                            </Typography>
                        )}
                    </Box>
                )}
            </Box>

            <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="xs" fullWidth className="no-print" PaperProps={{ className: 'tasy-flat-panel' }}>
                <DialogTitle sx={{ p: 0, bgcolor: '#f8f9fa', borderBottom: '1px solid #e9ecef', px: 2, py: 1.5 }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#495057', textTransform: 'uppercase' }}>
                        {formData.id ? 'Editar Ponto' : 'Novo Ponto Manual'}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ p: 3, bgcolor: '#fff' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                        <FormControl size="small" fullWidth disabled={!!formData.id} className="tasy-compact-input">
                            <InputLabel>Funcionário</InputLabel>
                            <Select value={formData.usuario} onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}>
                                {usuarios.map(u => <MenuItem key={u.id} value={u.id}>{`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField className="tasy-compact-input" label="Data e Hora do Ponto" type="datetime-local" size="small" fullWidth InputLabelProps={{ shrink: true }} value={formData.data_hora} onChange={(e) => setFormData({ ...formData, data_hora: e.target.value })} />
                        <FormControl size="small" fullWidth className="tasy-compact-input">
                            <InputLabel>Tipo</InputLabel>
                            <Select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}>
                                <MenuItem value="entrada">Entrada</MenuItem>
                                <MenuItem value="saida_pausa">Saída Pausa</MenuItem>
                                <MenuItem value="retorno_pausa">Retorno Pausa</MenuItem>
                                <MenuItem value="saida">Saída (Fim Exp.)</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField className="tasy-compact-input" label="Justificativa (Auditoria RH)" size="small" fullWidth multiline rows={2} value={formData.observacao} onChange={(e) => setFormData({ ...formData, observacao: e.target.value })} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 1.5, borderTop: '1px solid #e9ecef', bgcolor: '#f8f9fa' }}>
                    <Button onClick={() => setModalOpen(false)} sx={{ color: '#868e96', fontSize: '12px', fontWeight: 600 }}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" disableElevation disabled={isSaving} sx={{ bgcolor: '#1c7ed6', fontSize: '12px', fontWeight: 600, px: 3 }}>
                        {isSaving ? <CircularProgress size={20} color="inherit" /> : 'Salvar Ponto'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}