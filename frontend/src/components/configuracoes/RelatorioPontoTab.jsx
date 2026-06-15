// src/components/ponto/RelatorioPontoTab.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Typography, CircularProgress, Chip, Alert, IconButton, Tooltip, Button,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, InputLabel, FormControl
} from '@mui/material';
import { Refresh, GpsFixed, ErrorOutline, CheckCircle, Edit, Delete, Add, Block } from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';

export default function RelatorioPontoTab() {
    const [logs, setLogs] = useState([]);
    const [usuarios, setUsuarios] = useState([]); // Lista para o Dropdown do RH
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');

    // Estados do Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, usuario: '', data_hora: '', tipo: 'entrada', observacao: '' });

    const fetchLogs = async () => {
        setLoading(true);
        setErro('');
        try {
            // AGORA CONSOME A ROTA ADMIN
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
            // 👇 AQUI: Adicionamos o /usuarios/ extra
            const response = await apiClient.get('/usuarios/usuarios/'); 
            
            const listaUsuarios = response.data.results || response.data;
            
            if (Array.isArray(listaUsuarios)) {
                setUsuarios(listaUsuarios);
            } else {
                setUsuarios([]);
            }
        } catch (error) {
            console.error('Erro ao carregar lista de usuários', error);
            setUsuarios([]); 
        }
    };

    useEffect(() => {
        fetchLogs();
        fetchUsuarios();
    }, []);

    // --- FUNÇÕES DO RH (CRUD) ---

    const handleOpenModal = (log = null) => {
        if (log) {
            // MODO EDIÇÃO
            // Converte a ISO do banco para o formato do input datetime-local
            const dateObj = new Date(log.data_hora);
            const tzOffset = dateObj.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(dateObj - tzOffset)).toISOString().slice(0, 16);

            setFormData({
                id: log.id,
                usuario: log.usuario,
                data_hora: localISOTime,
                tipo: log.tipo,
                observacao: '' // Deixa em branco para o RH justificar a nova alteração
            });
        } else {
            // MODO NOVO REGISTRO
            const now = new Date();
            const tzOffset = now.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(now - tzOffset)).toISOString().slice(0, 16);

            setFormData({ id: null, usuario: '', data_hora: localISOTime, tipo: 'entrada', observacao: '' });
        }
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    const handleSave = async () => {
        if (!formData.usuario || !formData.data_hora || !formData.observacao) {
            alert('Preencha o funcionário, data/hora e a justificativa (observação).');
            return;
        }

        try {
            const payload = {
                usuario: formData.usuario,
                data_hora: new Date(formData.data_hora).toISOString(),
                tipo: formData.tipo,
                observacao: formData.observacao,
                status: 'ajuste_manual' // Sempre que o RH mexe, vira ajuste manual
            };

            if (formData.id) {
                await apiClient.patch(`/usuarios/ponto/admin/${formData.id}/`, payload);
            } else {
                await apiClient.post('/usuarios/ponto/admin/', payload);
            }
            
            fetchLogs();
            handleCloseModal();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar o registro. Verifique os dados.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja CANCELAR (inativar) este registro? Isso ficará gravado na auditoria.')) {
            try {
                await apiClient.delete(`/usuarios/ponto/admin/${id}/`);
                fetchLogs();
            } catch (error) {
                alert('Erro ao cancelar o registro.');
            }
        }
    };

    // --- RENDERIZAÇÃO ---

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
        if (status === 'cancelado') {
            return <Chip icon={<Block />} label="Cancelado (RH)" color="default" size="small" sx={{ bgcolor: '#eee', color: '#666' }} />;
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
                <Typography variant="h6" color="primary">Gestão de Ponto Eletrônico (RH)</Typography>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<Add />} 
                        onClick={() => handleOpenModal()}
                        size="small"
                        sx={{ textTransform: 'none', fontWeight: 'bold' }}
                    >
                        Novo Ponto Manual
                    </Button>
                    <IconButton onClick={fetchLogs} color="primary" title="Atualizar Tabela" sx={{ border: '1px solid #ddd', borderRadius: 1 }}>
                        <Refresh />
                    </IconButton>
                </Box>
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
                            <TableCell align="center">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {logs.length === 0 ? (
                            <TableRow><TableCell colSpan={7} align="center">Nenhum registro encontrado.</TableCell></TableRow>
                        ) : (
                            logs.map((log) => {
                                const isCancelado = log.status === 'cancelado';
                                
                                return (
                                    <TableRow key={log.id} hover sx={{ bgcolor: log.status === 'rejeitado' ? '#fff5f5' : (isCancelado ? '#f9f9f9' : 'inherit'), opacity: isCancelado ? 0.6 : 1 }}>
                                        <TableCell sx={{ whiteSpace: 'nowrap', textDecoration: isCancelado ? 'line-through' : 'none' }}>
                                            {formatarDataHora(log.data_hora)}
                                        </TableCell>
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
                                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.observacao}>
                                            {log.observacao || 'Ponto registrado normalmente.'}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Editar Horário">
                                                <span>
                                                    <IconButton size="small" color="primary" onClick={() => handleOpenModal(log)} disabled={isCancelado}>
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Cancelar Ponto (Soft Delete)">
                                                <span>
                                                    <IconButton size="small" color="error" onClick={() => handleDelete(log.id)} disabled={isCancelado}>
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* MODAL DE ADIÇÃO / EDIÇÃO */}
            <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
                <DialogTitle>{formData.id ? 'Editar Registro de Ponto' : 'Novo Ponto Manual (RH)'}</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                        
                        <FormControl size="small" fullWidth disabled={!!formData.id}>
                            <InputLabel>Funcionário</InputLabel>
                            <Select
                                value={formData.usuario}
                                label="Funcionário"
                                onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                            >
                                <MenuItem value="">
                                    <em>Selecione um funcionário...</em>
                                </MenuItem>
                                {usuarios.map(u => {
                                    // Se não tiver nome e sobrenome, mostra o username de login
                                    const nomeExibicao = (u.first_name || u.last_name) 
                                        ? `${u.first_name || ''} ${u.last_name || ''}`.trim() 
                                        : u.username;
                                    
                                    return (
                                        <MenuItem key={u.id} value={u.id}>
                                            {nomeExibicao}
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </FormControl>

                        <TextField
                            label="Data e Hora do Ponto"
                            type="datetime-local"
                            size="small"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.data_hora}
                            onChange={(e) => setFormData({ ...formData, data_hora: e.target.value })}
                        />

                        <FormControl size="small" fullWidth>
                            <InputLabel>Tipo de Batida</InputLabel>
                            <Select
                                value={formData.tipo}
                                label="Tipo de Batida"
                                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                            >
                                <MenuItem value="entrada">Entrada</MenuItem>
                                <MenuItem value="saida_pausa">Saída para Pausa/Almoço</MenuItem>
                                <MenuItem value="retorno_pausa">Retorno da Pausa</MenuItem>
                                <MenuItem value="saida">Saída (Fim do Expediente)</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            label="Justificativa (Auditoria)"
                            size="small"
                            fullWidth
                            multiline
                            rows={3}
                            placeholder="Ex: Funcionário esqueceu de bater o ponto no horário correto..."
                            value={formData.observacao}
                            onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                            helperText="Esta observação ficará registrada no log do sistema com o seu nome."
                        />

                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal} color="inherit">Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" color="primary">Salvar Registro</Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}