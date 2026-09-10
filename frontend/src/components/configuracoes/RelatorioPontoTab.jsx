// src/components/ponto/RelatorioPontoTab.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Typography, CircularProgress, Chip, Alert, IconButton, Tooltip, Button,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, 
    InputLabel, FormControl, Tabs, Tab, Collapse, Divider
} from '@mui/material';
import { 
    Refresh, ErrorOutline, CheckCircle, Edit, Delete, Add, Block, 
    Print, KeyboardArrowDown, KeyboardArrowUp, Badge, AccessTime
} from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';
import dayjs from 'dayjs';

import '../../atendimento.css';

const formatarHorasMinutos = (totalMs) => {
    const horas = Math.floor(totalMs / (1000 * 60 * 60));
    const minutos = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
};

// COMPONENTE: Linha Colapsável do Espelho de Ponto
function UsuarioEspelhoRow({ usuario, logsGlobais, mes, ano, isPrinting, onPrint }) {
    const [open, setOpen] = useState(false);

    // Se a impressão for ativada de fora, forçamos a abertura do painel
    useEffect(() => {
        if (isPrinting) setOpen(true);
    }, [isPrinting]);

    // Calcula o relatório deste usuário dinamicamente
    const { linhas, totalHorasText } = useMemo(() => {
        const logsFiltrados = logsGlobais.filter(log => {
            if (log.status === 'cancelado' || log.status === 'rejeitado') return false;
            if (log.usuario !== usuario.id) return false;
            const dataLog = new Date(log.data_hora);
            return (dataLog.getMonth() + 1 === mes && dataLog.getFullYear() === ano);
        });

        const diasAgrupados = {};
        logsFiltrados.forEach(log => {
            const dataString = new Date(log.data_hora).toISOString().split('T')[0];
            if (!diasAgrupados[dataString]) diasAgrupados[dataString] = [];
            diasAgrupados[dataString].push(log);
        });

        let totalMensalMs = 0;
        const relatorioFinal = [];
        const diasNoMes = new Date(ano, mes, 0).getDate();
        
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const dataString = `${ano}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
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
                diaStr: `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${ano}`,
                horarios: horariosDisplay.join(' | '),
                horasDiaText: msTrabalhadosDia > 0 ? formatarHorasMinutos(msTrabalhadosDia) : '-',
                isFimDeSemana: new Date(ano, mes - 1, dia).getDay() === 0 || new Date(ano, mes - 1, dia).getDay() === 6
            });
        }
        return { linhas: relatorioFinal, totalHorasText: formatarHorasMinutos(totalMensalMs) };
    }, [usuario.id, logsGlobais, mes, ano]);

    const nomeDisplay = `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim() || usuario.username;

    return (
        <React.Fragment>
            <TableRow hover onClick={() => !isPrinting && setOpen(!open)} sx={{ cursor: 'pointer', bgcolor: open ? '#f8f9fa' : 'transparent', transition: '0.2s', '& > *': { borderBottom: 'unset' } }}>
                <TableCell sx={{ width: 50, py: 1 }} className="no-print">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
                        {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#343a40', fontSize: '14px', py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Badge sx={{ color: '#1c7ed6' }} />
                        <Box>
                            {nomeDisplay}
                            <Typography variant="caption" sx={{ display: 'block', color: '#868e96', fontWeight: 500, mt: 0.5 }}>
                                CPF: {usuario.cpf || 'Não informado'} | Cargo: {usuario.cargo.toUpperCase()}
                            </Typography>
                        </Box>
                    </Box>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, color: '#1864ab', fontSize: '14px' }}>
                    {totalHorasText}
                </TableCell>
                <TableCell align="right" className="no-print">
                    <Button variant="outlined" size="small" startIcon={<Print />} onClick={(e) => { e.stopPropagation(); onPrint(usuario.id); }} sx={{ borderColor: '#ced4da', color: '#495057' }}>
                        Imprimir
                    </Button>
                </TableCell>
            </TableRow>
            
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0, border: 0 }} colSpan={4}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2, mb: 4, p: 3, bgcolor: '#fff', border: '1px solid #dee2e6', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            
                            {/* Cabeçalho exclusivo para impressão */}
                            <Box className="print-only" sx={{ display: 'none', mb: 3 }}>
                                <Typography align="center" sx={{ fontWeight: 700, fontSize: '16px', mb: 0.5, textTransform: 'uppercase' }}>
                                    Espelho de Ponto Individual
                                </Typography>
                                <Typography align="center" sx={{ mb: 2, fontSize: '13px' }}>
                                    Referência: {mes.toString().padStart(2, '0')}/{ano}
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Box sx={{ fontSize: '13px' }}>
                                    <Typography variant="body2" sx={{ mb: 0.5 }}><strong>Funcionário:</strong> {nomeDisplay}</Typography>
                                    <Typography variant="body2"><strong>CPF:</strong> {usuario.cpf}</Typography>
                                </Box>
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
                                    {linhas.map((linha, index) => (
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
                                            {totalHorasText}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}

export default function RelatorioPontoTab() {
    const [abaAtual, setAbaAtual] = useState(0); 
    const [logs, setLogs] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, usuario: '', data_hora: '', tipo: 'entrada', observacao: '' });
    const [isSaving, setIsSaving] = useState(false);

    // Filtros Espelho
    const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1);
    const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());
    const [filtroStatus, setFiltroStatus] = useState('ativos'); // Padrão: ativos
    
    // Controle de impressão limpa
    const [printingUserId, setPrintingUserId] = useState(null);

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

    // Filtra usuários pelo status (Ativos/Inativos/Todos)
    const usuariosParaMostrar = usuarios.filter(u => {
        if (filtroStatus === 'ativos' && u.is_active === false) return false;
        if (filtroStatus === 'inativos' && u.is_active !== false) return false;
        return true;
    });

    const handlePrintUsuario = (id) => {
        setPrintingUserId(id);
        setTimeout(() => {
            window.print();
            setPrintingUserId(null); // Restaura após a tela de impressão abrir
        }, 150);
    };

    const renderStatus = (status, observacao) => {
        if (status === 'aprovado') return <Chip icon={<CheckCircle />} label="Aprovado" sx={{ bgcolor: '#e7f5ff', color: '#1c7ed6', fontWeight: 600, height: 22, fontSize: '10px' }} />;
        if (status === 'rejeitado') return <Tooltip title={observacao || 'Bloqueado'}><Chip icon={<ErrorOutline />} label="Bloqueado" sx={{ bgcolor: '#fff0f6', color: '#c2255c', fontWeight: 600, height: 22, fontSize: '10px' }} /></Tooltip>;
        if (status === 'cancelado') return <Chip icon={<Block />} label="Cancelado" sx={{ bgcolor: '#f1f3f5', color: '#868e96', fontWeight: 600, height: 22, fontSize: '10px' }} />;
        return <Chip label="Ajuste Manual" sx={{ bgcolor: '#fff4e6', color: '#e8590c', fontWeight: 600, height: 22, fontSize: '10px' }} />;
    };

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
                    <Tab icon={<AccessTime sx={{ mr: 1, mb: 0 }}/>} iconPosition="start" label="Espelho de Ponto" />
                </Tabs>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', bgcolor: '#ffffff' }}>
                
                {/* ABA 0: LISTAGEM GERAL DE LOGS */}
                {abaAtual === 0 && (
                    <TableContainer className="no-print">
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

                {/* ABA 1: ESPELHO DE PONTO AGRUPADO (BANHO DE LOJA) */}
                {abaAtual === 1 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#f4f6f8' }}>
                        
                        {/* Filtros da Aba de Espelho */}
                        <Box className="no-print" sx={{ p: 2, bgcolor: '#fff', borderBottom: '1px solid #dee2e6', display: 'flex', gap: 2, alignItems: 'center' }}>
                            <FormControl size="small" sx={{ minWidth: 150 }} className="tasy-compact-input">
                                <InputLabel>Status Equipe</InputLabel>
                                <Select value={filtroStatus} label="Status Equipe" onChange={(e) => setFiltroStatus(e.target.value)}>
                                    <MenuItem value="ativos">Apenas Ativos</MenuItem>
                                    <MenuItem value="inativos">Apenas Inativos</MenuItem>
                                    <MenuItem value="todos">Todos</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField className="tasy-compact-input" size="small" type="number" label="Mês (1 a 12)" value={filtroMes} onChange={(e) => setFiltroMes(Number(e.target.value))} inputProps={{ min: 1, max: 12 }} sx={{ width: 120 }} />
                            <TextField className="tasy-compact-input" size="small" type="number" label="Ano" value={filtroAno} onChange={(e) => setFiltroAno(Number(e.target.value))} sx={{ width: 120 }} />
                        </Box>

                        {/* Tabela de Agrupamento */}
                        <TableContainer sx={{ flexGrow: 1, bgcolor: '#fff' }}>
                            <Table size="small" stickyHeader>
                                <TableHead className="no-print">
                                    <TableRow>
                                        <TableCell sx={{ width: 50, ...thStyle }}></TableCell>
                                        <TableCell sx={thStyle}>Funcionário</TableCell>
                                        <TableCell align="center" sx={thStyle}>Carga Horária no Mês</TableCell>
                                        <TableCell align="right" sx={thStyle}>Relatório</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {usuariosParaMostrar.length === 0 ? (
                                        <TableRow className="no-print">
                                            <TableCell colSpan={4} align="center" sx={{ py: 4, color: '#868e96' }}>Nenhum funcionário encontrado.</TableCell>
                                        </TableRow>
                                    ) : (
                                        usuariosParaMostrar.map(usuario => {
                                            // Se o sistema estiver imprimindo, oculta os funcionários que não foram clicados
                                            if (printingUserId && printingUserId !== usuario.id) return null;
                                            
                                            return (
                                                <UsuarioEspelhoRow 
                                                    key={usuario.id} 
                                                    usuario={usuario} 
                                                    logsGlobais={logs} 
                                                    mes={filtroMes} 
                                                    ano={filtroAno}
                                                    isPrinting={printingUserId === usuario.id}
                                                    onPrint={handlePrintUsuario}
                                                />
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </Box>

            {/* Modal de Ponto Manual (Auditoria) */}
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