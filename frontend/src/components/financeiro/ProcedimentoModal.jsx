// src/components/financeiro/ProcedimentoModal.jsx
import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, 
    CircularProgress, Box, Typography, List, ListItem, ListItemText, 
    IconButton, Select, MenuItem, FormControl, InputLabel, Divider, Grid, InputAdornment,
    Tabs, Tab, Paper, Chip, Stack
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { faturamentoService } from '../../services/faturamentoService';

// Lista de Categorias
const CATEGORIAS = [
    { value: 'US_GERAL', label: 'Ultrassonografia Geral' },
    { value: 'MED_FETAL', label: 'Medicina Fetal' },
    { value: 'ECOCARDIOGRAMA', label: 'Ecocardiograma' },
    { value: 'MUSCULO', label: 'Musculoesquelético' },
    { value: 'DOPPLER', label: 'Doppler Vascular' },
    { value: 'OUTROS', label: 'Outros' },
];

const DIAS_SEMANA = [
    { value: 0, label: 'Segunda-feira' }, { value: 1, label: 'Terça-feira' },
    { value: 2, label: 'Quarta-feira' }, { value: 3, label: 'Quinta-feira' },
    { value: 4, label: 'Sexta-feira' }, { value: 5, label: 'Sábado' }, { value: 6, label: 'Domingo' }
];

// Componente Auxiliar para as Abas
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 3, pb: 1 }}>{children}</Box>}
        </div>
    );
}

export default function ProcedimentoModal({ open, onClose, onSave, procedimento }) {
    const { showSnackbar } = useSnackbar();
    const isEditing = !!procedimento;

    // Controle de Abas
    const [tabValue, setTabValue] = useState(0);

    // Estados de Dados Básicos
    const [formData, setFormData] = useState({ 
        codigo_tuss: '', descricao: '', categoria: 'OUTROS', valor_particular: '' 
    });
    
    // Estados Financeiros (Convênios)
    const [valoresConvenio, setValoresConvenio] = useState([]);
    const [planosDisponiveis, setPlanosDisponiveis] = useState([]);
    const [planoSelecionadoId, setPlanoSelecionadoId] = useState('');
    const [valorConvenio, setValorConvenio] = useState('');
    
    // NOVO: Estados de Configuração de Agenda
    const [configAgenda, setConfigAgenda] = useState({
        duracao_padrao: 15,
        equipamento_obrigatorio: '',
        dias_funcionamento: []
    });
    
    // Estado temporário para adicionar um novo dia na lista
    const [novoDia, setNovoDia] = useState({ dia_semana: '', hora_inicio: '08:00', hora_fim: '18:00' });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setTabValue(0); // Reseta para a primeira aba ao abrir
            if (isEditing) {
                setFormData({
                    codigo_tuss: procedimento.codigo_tuss || '',
                    descricao: procedimento.descricao || '',
                    categoria: procedimento.categoria || 'OUTROS',
                    valor_particular: procedimento.valor_particular || '',
                });
                setValoresConvenio(procedimento.valores_convenio || []);
                
                // Carrega a configuração clínica, se existir no objeto retornado pela API
                if (procedimento.configuracao_clinica) {
                    setConfigAgenda({
                        duracao_padrao: procedimento.configuracao_clinica.duracao_minutos || 15,
                        equipamento_obrigatorio: procedimento.configuracao_clinica.equipamento_obrigatorio || '',
                        dias_funcionamento: procedimento.configuracao_clinica.dias_funcionamento || []
                    });
                }
                
                faturamentoService.getPlanosConvenio().then(response => {
                    const planosFiltrados = response.data.filter(plano => (plano.convenio_nome || '').toLowerCase() !== 'particular');
                    setPlanosDisponiveis(planosFiltrados);
                }).catch(() => showSnackbar('Erro ao carregar planos.', 'error'));
            } else {
                setFormData({ codigo_tuss: '', descricao: '', categoria: 'OUTROS', valor_particular: '' });
                setValoresConvenio([]);
                setConfigAgenda({ duracao_padrao: 15, equipamento_obrigatorio: '', dias_funcionamento: [] });
            }
        }
    }, [procedimento, open, isEditing, showSnackbar]);

    // --- Lógica de Salvamento Principal ---
    const handleSaveData = async () => {
        if (!formData.descricao) return showSnackbar('Descrição é obrigatória.', 'warning');

        setIsSubmitting(true);
        try {
            // O payload agora envia os dados financeiros E as regras de agenda juntas
            const payload = {
                codigo_tuss: formData.codigo_tuss,
                descricao: formData.descricao,
                categoria: formData.categoria,
                valor_particular: formData.valor_particular ? parseFloat(formData.valor_particular) : 0,
                configuracao_clinica: configAgenda // Envia as regras pro Django processar
            };

            if (isEditing) {
                await faturamentoService.updateProcedimento(procedimento.id, payload);
                showSnackbar('Procedimento e regras atualizados!', 'success');
            } else {
                await faturamentoService.createProcedimento(payload);
                showSnackbar('Procedimento criado com sucesso!', 'success');
            }
            onSave(); 
            onClose(); 
        } catch (error) {
            console.error(error);
            showSnackbar('Erro ao salvar. Verifique os dados.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!isEditing) return;
        if (!window.confirm(`Deseja realmente excluir "${formData.descricao}"?`)) return;
        setIsSubmitting(true);
        try {
            await faturamentoService.deleteProcedimento(procedimento.id);
            showSnackbar('Procedimento excluído com sucesso.', 'success');
            onSave(); onClose();
        } catch (error) {
            showSnackbar('Erro ao excluir procedimento.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddPrecoConvenio = async () => {
        if (!planoSelecionadoId || !valorConvenio) return showSnackbar('Selecione um plano e informe um valor.', 'warning');
        setIsSubmitting(true);
        try {
            await faturamentoService.definirPrecoConvenio(procedimento.id, { plano_convenio_id: planoSelecionadoId, valor: valorConvenio });
            showSnackbar('Preço salvo!', 'success');
            setPlanoSelecionadoId(''); setValorConvenio(''); onSave();
        } catch (error) {
            showSnackbar('Erro ao salvar preço.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Lógica de Dias de Funcionamento ---
    const handleAddDia = () => {
        if (novoDia.dia_semana === '' || !novoDia.hora_inicio || !novoDia.hora_fim) {
            return showSnackbar('Preencha o dia e os horários corretamente.', 'warning');
        }
        // Evita duplicar o mesmo dia
        if (configAgenda.dias_funcionamento.some(d => d.dia_semana === novoDia.dia_semana)) {
            return showSnackbar('Este dia da semana já está configurado.', 'warning');
        }
        
        setConfigAgenda(prev => ({
            ...prev,
            dias_funcionamento: [...prev.dias_funcionamento, novoDia].sort((a, b) => a.dia_semana - b.dia_semana)
        }));
        setNovoDia({ dia_semana: '', hora_inicio: '08:00', hora_fim: '18:00' });
    };

    const handleRemoveDia = (dia_semana) => {
        setConfigAgenda(prev => ({
            ...prev,
            dias_funcionamento: prev.dias_funcionamento.filter(d => d.dia_semana !== dia_semana)
        }));
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3, bgcolor: '#f4f6f8' } }}>
            <DialogTitle sx={{ fontWeight: 800, bgcolor: 'white', pb: 2 }}>
                {isEditing ? `Gerenciar: ${formData.descricao}` : 'Cadastrar Novo Exame'}
            </DialogTitle>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white', px: 3 }}>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} indicatorColor="primary" textColor="primary">
                    <Tab icon={<AttachMoneyIcon sx={{mr: 1}}/>} iconPosition="start" label="Dados & Valores" sx={{ fontWeight: 'bold' }} />
                    <Tab icon={<AccessTimeIcon sx={{mr: 1}}/>} iconPosition="start" label="Regras de Agenda" sx={{ fontWeight: 'bold' }} />
                </Tabs>
            </Box>

            <DialogContent sx={{ p: 3 }}>
                
                {/* ABA 1: DADOS BÁSICOS E CONVÊNIOS */}
                <TabPanel value={tabValue} index={0}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 'bold' }}>Identificação</Typography>
                        <Grid container spacing={2} sx={{ mt: 0.5 }}>
                            <Grid item xs={12} sm={3}>
                                <TextField label="Cód. TUSS" value={formData.codigo_tuss} onChange={(e) => setFormData({...formData, codigo_tuss: e.target.value})} size="small" fullWidth />
                            </Grid>
                            <Grid item xs={12} sm={5}>
                                <TextField label="Descrição / Nome do Exame" value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} size="small" fullWidth required />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Categoria</InputLabel>
                                    <Select value={formData.categoria} label="Categoria" onChange={(e) => setFormData({...formData, categoria: e.target.value})}>
                                        {CATEGORIAS.map(cat => <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField label="Valor Particular" type="number" value={formData.valor_particular} onChange={(e) => setFormData({...formData, valor_particular: e.target.value})} size="small" fullWidth InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }} />
                            </Grid>
                        </Grid>
                    </Paper>

                    {isEditing && (
                        <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
                            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 'bold' }}>Tabela de Convênios</Typography>
                            <Box sx={{ display: 'flex', gap: 2, my: 2, alignItems: 'center' }}>
                                <FormControl fullWidth size="small" sx={{flex: 2}}>
                                    <InputLabel>Convênio / Plano</InputLabel>
                                    <Select value={planoSelecionadoId} label="Convênio / Plano" onChange={(e) => setPlanoSelecionadoId(e.target.value)}>
                                        {planosDisponiveis.map(p => <MenuItem key={p.id} value={p.id}><strong>{p.convenio_nome}</strong> &nbsp;—&nbsp; {p.nome}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <TextField label="Valor (R$)" type="number" value={valorConvenio} onChange={(e) => setValorConvenio(e.target.value)} size="small" sx={{ flex: 1 }} />
                                <Button onClick={handleAddPrecoConvenio} variant="contained" color="primary" disabled={isSubmitting}>Adicionar</Button>
                            </Box>
                            <List dense sx={{ border: '1px solid #eee', borderRadius: 1, maxHeight: 150, overflow: 'auto' }}>
                                {valoresConvenio.map(item => (
                                    <ListItem key={item.id} divider>
                                        <ListItemText primary={item.plano_convenio?.convenio_nome ? `${item.plano_convenio.convenio_nome} - ${item.plano_convenio.nome}` : 'Desconhecido'} secondary={<Typography variant="body2" color="success.main" fontWeight="bold">R$ {item.valor}</Typography>} />
                                    </ListItem>
                                ))}
                                {valoresConvenio.length === 0 && <ListItem><ListItemText secondary="Nenhum valor de convênio cadastrado." /></ListItem>}
                            </List>
                        </Paper>
                    )}
                </TabPanel>

                {/* ABA 2: REGRAS DE AGENDA (CHATBOT E SISTEMA) */}
                <TabPanel value={tabValue} index={1}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 'bold' }}>Requisitos do Procedimento</Typography>
                        <Grid container spacing={3} sx={{ mt: 0.5 }}>
                            <Grid item xs={12} sm={6}>
                                <TextField 
                                    label="Duração Padrão (minutos)" 
                                    type="number" 
                                    value={configAgenda.duracao_padrao} 
                                    onChange={(e) => setConfigAgenda({...configAgenda, duracao_padrao: e.target.value})} 
                                    size="small" fullWidth 
                                    helperText="Tempo que o exame bloqueia na agenda."
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField 
                                    label="Equipamento Exigido (Tag da Sala)" 
                                    value={configAgenda.equipamento_obrigatorio} 
                                    onChange={(e) => setConfigAgenda({...configAgenda, equipamento_obrigatorio: e.target.value.toUpperCase()})} 
                                    size="small" fullWidth 
                                    placeholder="Ex: SAMSUNG_V7"
                                    helperText="Deixe em branco se puder ser feito em qualquer sala."
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
                        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 'bold' }}>Dias e Horários de Atendimento</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Defina aqui os dias em que o Chatbot e o sistema devem ofertar este exame.
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', p: 2, bgcolor: '#f0f4f8', borderRadius: 2 }}>
                            <FormControl size="small" sx={{ minWidth: 150, flex: 1 }}>
                                <InputLabel>Dia da Semana</InputLabel>
                                <Select value={novoDia.dia_semana} label="Dia da Semana" onChange={(e) => setNovoDia({...novoDia, dia_semana: e.target.value})}>
                                    {DIAS_SEMANA.map(dia => <MenuItem key={dia.value} value={dia.value}>{dia.label}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <TextField label="Início" type="time" size="small" value={novoDia.hora_inicio} onChange={(e) => setNovoDia({...novoDia, hora_inicio: e.target.value})} InputLabelProps={{ shrink: true }} sx={{ width: 120 }} />
                            <TextField label="Fim" type="time" size="small" value={novoDia.hora_fim} onChange={(e) => setNovoDia({...novoDia, hora_fim: e.target.value})} InputLabelProps={{ shrink: true }} sx={{ width: 120 }} />
                            <IconButton color="primary" onClick={handleAddDia} sx={{ bgcolor: 'white', boxShadow: 1 }}>
                                <AddCircleIcon />
                            </IconButton>
                        </Box>

                        <Stack spacing={1}>
                            {configAgenda.dias_funcionamento.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                                    Nenhuma regra de dia configurada. O chatbot não ofertará este exame automaticamente.
                                </Typography>
                            ) : (
                                configAgenda.dias_funcionamento.map((dia) => (
                                    <Paper key={dia.dia_semana} variant="outlined" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Chip label={DIAS_SEMANA.find(d => d.value === dia.dia_semana)?.label} color="primary" variant="outlined" sx={{ fontWeight: 'bold', minWidth: 120 }} />
                                            <Typography variant="body2">
                                                Das <strong>{dia.hora_inicio}</strong> às <strong>{dia.hora_fim}</strong>
                                            </Typography>
                                        </Box>
                                        <IconButton size="small" color="error" onClick={() => handleRemoveDia(dia.dia_semana)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Paper>
                                ))
                            )}
                        </Stack>
                    </Paper>
                </TabPanel>

            </DialogContent>
            
            <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2, bgcolor: 'white', borderTop: '1px solid #eee' }}>
                <Box>
                    {isEditing && (
                        <Button color="error" onClick={handleDelete} disabled={isSubmitting} sx={{ fontWeight: 'bold' }}>
                            Excluir Procedimento
                        </Button>
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button onClick={onClose} disabled={isSubmitting} color="inherit">Cancelar</Button>
                    <Button 
                        variant="contained" 
                        color="primary"
                        startIcon={isSubmitting ? <CircularProgress size={20} color="inherit"/> : <SaveIcon />}
                        onClick={handleSaveData}
                        disabled={isSubmitting}
                        sx={{ fontWeight: 'bold', px: 3 }}
                    >
                        Salvar Configurações
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
}