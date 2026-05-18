// src/pages/EspecialidadesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, CircularProgress, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment,
    FormControl, InputLabel, Select, MenuItem, List, ListItem, ListItemText, Divider
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from '../contexts/SnackbarContext';
import { configuracoesService } from '../services/configuracoesService';
import { faturamentoService } from '../services/faturamentoService'; // Import para pegar os planos

export default function EspecialidadesPage() {
    const [especialidades, setEspecialidades] = useState([]);
    const [planosDisponiveis, setPlanosDisponiveis] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();

    // Estados para o Modal de edição/criação
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemParaEditar, setItemParaEditar] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ nome: '', valor_consulta: '' });

    // Estados para preificação de convênio
    const [valoresConvenio, setValoresConvenio] = useState([]);
    const [planoSelecionadoId, setPlanoSelecionadoId] = useState('');
    const [valorConvenio, setValorConvenio] = useState('');

    const fetchDados = useCallback(async () => {
        setIsLoading(true);
        try {
            const [espRes, planosRes] = await Promise.all([
                configuracoesService.getEspecialidades(),
                faturamentoService.getPlanosConvenio()
            ]);
            setEspecialidades(espRes.data);
            setPlanosDisponiveis(planosRes.data.filter(p => (p.convenio_nome || '').toLowerCase() !== 'particular'));
        } catch (error) {
            showSnackbar('Erro ao carregar dados.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => { fetchDados(); }, [fetchDados]);

    const handleOpenModal = (item = null) => {
        setItemParaEditar(item);
        if (item) {
            setFormData({ nome: item.nome, valor_consulta: item.valor_consulta || '' });
            setValoresConvenio(item.valores_convenio || []);
        } else {
            setFormData({ nome: '', valor_consulta: '' });
            setValoresConvenio([]);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setItemParaEditar(null);
        setFormData({ nome: '', valor_consulta: '' });
        setPlanoSelecionadoId('');
        setValorConvenio('');
    };

    const handleSave = async () => {
        if (!formData.nome.trim()) return showSnackbar('O nome não pode estar vazio.', 'warning');
        setIsSubmitting(true);
        try {
            const dataToSend = {
                nome: formData.nome,
                valor_consulta: formData.valor_consulta ? parseFloat(formData.valor_consulta) : null
            };
            if (itemParaEditar) await configuracoesService.updateEspecialidade(itemParaEditar.id, dataToSend);
            else await configuracoesService.createEspecialidade(dataToSend);
            
            showSnackbar('Especialidade salva com sucesso!', 'success');
            handleCloseModal();
            fetchDados();
        } catch (error) { showSnackbar('Erro ao salvar.', 'error'); } 
        finally { setIsSubmitting(false); }
    };
    
    const handleAddPrecoConvenio = async () => {
        if (!planoSelecionadoId || !valorConvenio) return showSnackbar('Selecione um plano e informe o valor.', 'warning');
        setIsSubmitting(true);
        try {
            await configuracoesService.definirPrecoConvenioEspecialidade(itemParaEditar.id, { 
                plano_convenio_id: planoSelecionadoId, 
                valor: valorConvenio 
            });
            showSnackbar('Preço de convênio adicionado!', 'success');
            setPlanoSelecionadoId(''); setValorConvenio('');
            fetchDados(); // Recarrega para atualizar a lista
            handleCloseModal(); // Fecha para forçar reabertura limpa (opcional)
        } catch (error) { showSnackbar('Erro ao salvar preço.', 'error'); } 
        finally { setIsSubmitting(false); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Deseja deletar esta especialidade?')) {
            try { await configuracoesService.deleteEspecialidade(id); fetchDados(); } 
            catch { showSnackbar('Erro ao deletar.', 'error'); }
        }
    };

    if (isLoading) return <CircularProgress />;

    return (
        <Paper sx={{ p: 2, margin: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h5">Especialidades e Consultas</Typography>
                <Button variant="contained" onClick={() => handleOpenModal()}>Nova Especialidade</Button>
            </Box>
            
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{fontWeight: 'bold'}}>Nome da Especialidade</TableCell>
                            <TableCell sx={{fontWeight: 'bold'}}>Valor (Particular)</TableCell>
                            <TableCell sx={{fontWeight: 'bold'}} align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {especialidades.map((item) => (
                            <TableRow key={item.id} hover>
                                <TableCell>{item.nome}</TableCell>
                                <TableCell>{item.valor_consulta ? `R$ ${parseFloat(item.valor_consulta).toFixed(2)}` : 'Não definido'}</TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => handleOpenModal(item)}><EditIcon color="primary" /></IconButton>
                                    <IconButton onClick={() => handleDelete(item.id)}><DeleteIcon color="error" /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
                <DialogTitle>{itemParaEditar ? 'Gerenciar Especialidade' : 'Nova Especialidade'}</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="overline" color="text.secondary">Dados Gerais</Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, mt: 1 }}>
                        <TextField autoFocus label="Nome da Especialidade" fullWidth size="small" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} />
                        <TextField label="Valor Particular" type="number" size="small" value={formData.valor_consulta} onChange={(e) => setFormData({...formData, valor_consulta: e.target.value})} InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }} />
                    </Box>

                    {itemParaEditar && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="overline" color="text.secondary">Tabela de Convênios</Typography>
                            <Box sx={{ display: 'flex', gap: 2, mt: 1, mb: 2, alignItems: 'center' }}>
                                <FormControl fullWidth size="small" sx={{flex: 2}}>
                                    <InputLabel>Convênio / Plano</InputLabel>
                                    <Select value={planoSelecionadoId} label="Convênio / Plano" onChange={(e) => setPlanoSelecionadoId(e.target.value)}>
                                        {planosDisponiveis.map(p => <MenuItem key={p.id} value={p.id}><strong>{p.convenio_nome}</strong> &nbsp;—&nbsp; {p.nome}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <TextField label="Valor (R$)" type="number" value={valorConvenio} onChange={(e) => setValorConvenio(e.target.value)} size="small" sx={{ flex: 1 }} />
                                <Button onClick={handleAddPrecoConvenio} variant="contained" color="primary" disabled={isSubmitting}>Add</Button>
                            </Box>
                            
                            <List dense sx={{ border: '1px solid #eee', borderRadius: 1, maxHeight: 150, overflow: 'auto' }}>
                                {valoresConvenio.map(item => (
                                    <ListItem key={item.id} divider>
                                        <ListItemText primary={`${item.convenio_nome} - ${item.plano_nome}`} secondary={<Typography variant="body2" color="success.main" fontWeight="bold">R$ {item.valor}</Typography>} />
                                    </ListItem>
                                ))}
                                {valoresConvenio.length === 0 && <ListItem><ListItemText secondary="Nenhum valor de convênio cadastrado." /></ListItem>}
                            </List>
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseModal}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Especialidade'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}