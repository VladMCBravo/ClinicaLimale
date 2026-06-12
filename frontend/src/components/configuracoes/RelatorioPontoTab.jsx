import React, { useState, useEffect } from 'react';
import { 
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Typography, CircularProgress, Chip, Alert, IconButton, Tooltip
} from '@mui/material';
import { Refresh, GpsFixed, ErrorOutline, CheckCircle } from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';

export default function RelatorioPontoTab() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        setErro('');
        try {
            const response = await apiClient.get('/usuarios/ponto/relatorio/');
            setLogs(response.data);
        } catch (error) {
            setErro('Erro ao carregar os relatórios de ponto. Verifique suas permissões.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const renderStatus = (status, observacao) => {
        if (status === 'aprovado') {
            return <Chip icon={<CheckCircle />} label="Aprovado" color="success" size="small" variant="outlined" />;
        }
        if (status === 'rejeitado') {
            return (
                <Tooltip title={observacao || 'Tentativa Bloqueada'}>
                    <Chip icon={<ErrorOutline />} label="Bloqueado" color="error" size="small" />
                </Tooltip>
            );
        }
        return <Chip label="Ajuste Manual" color="info" size="small" />;
    };

    const formatarDataHora = (isoString) => {
        const data = new Date(isoString);
        return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="primary">Auditoria e Registros de Ponto</Typography>
                <IconButton onClick={fetchLogs} color="primary" title="Atualizar Tabela">
                    <Refresh />
                </IconButton>
            </Box>

            {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 300px)' }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow sx={{ '& th': { bgcolor: '#f5f5f5', fontWeight: 'bold' } }}>
                            <TableCell>Data e Hora</TableCell>
                            <TableCell>Funcionário</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Status / Erro</TableCell>
                            <TableCell align="center">Distância</TableCell>
                            <TableCell>Observação (Logs)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {logs.length === 0 ? (
                            <TableRow><TableCell colSpan={6} align="center">Nenhum registro encontrado.</TableCell></TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id} hover sx={{ bgcolor: log.status === 'rejeitado' ? '#fff5f5' : 'inherit' }}>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatarDataHora(log.data_hora)}</TableCell>
                                    <TableCell><strong>{log.nome_funcionario}</strong></TableCell>
                                    <TableCell sx={{ textTransform: 'capitalize' }}>{log.tipo_display}</TableCell>
                                    <TableCell>{renderStatus(log.status, log.observacao)}</TableCell>
                                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                                        {log.distancia_metros != null ? (
                                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, color: log.status === 'rejeitado' ? 'error.main' : 'text.secondary' }}>
                                                <GpsFixed fontSize="small" /> {parseInt(log.distancia_metros)}m
                                            </Typography>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                                        {log.observacao || 'Ponto registrado normalmente.'}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}