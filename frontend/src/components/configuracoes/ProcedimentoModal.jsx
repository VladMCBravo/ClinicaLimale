// src/components/financeiro/ProcedimentoModal.jsx
import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, 
    CircularProgress, Box, Typography, List, ListItem, ListItemText, 
    IconButton, MenuItem, InputAdornment, Tabs, Tab, Stack, Tooltip, Grid, Divider
} from '@mui/material';
import { 
    Delete, Save, AddCircle, AccessTime, AttachMoney, Edit, Close, 
    LocalHospital, Build
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { faturamentoService } from '../../services/faturamentoService';

import '../../atendimento.css';

const CATEGORIAS = [
    { value: 'US_GERAL', label: 'Ultrassonografia Geral' }, { value: 'MED_FETAL', label: 'Medicina Fetal' },
    { value: 'ECOCARDIOGRAMA', label: 'Ecocardiograma' }, { value: 'MUSCULO', label: 'Musculoesquelético' },
    { value: 'DOPPLER', label: 'Doppler Vascular' }, { value: 'OUTROS', label: 'Outros' },
];

const DIAS_SEMANA = [
    { value: 0, label: 'Segunda-feira' }, { value: 1, label: 'Terça-feira' }, { value: 2, label: 'Quarta-feira' },
    { value: 3, label: 'Quinta-feira' }, { value: 4, label: 'Sexta-feira' }, { value: 5, label: 'Sábado' }, { value: 6, label: 'Domingo' }
];

function TabPanel({ children, value, index }) {
    return (
        <div role="tabpanel" hidden={value !== index} style={{ height: '100%' }}>
            {value === index && (
                <Box sx={{ p: 3, height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export default function ProcedimentoModal({ open, onClose, onSave, procedimento }) {
    const { showSnackbar } = useSnackbar();
    const isEditing = !!procedimento;
    const [tabValue, setTabValue] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({ codigo_tuss: '', descricao: '', categoria: 'OUTROS', valor_particular: '' });
    
    const [valoresConvenio, setValoresConvenio] = useState([]);
    const [planosDisponiveis, setPlanosDisponiveis] = useState([]);
    const [planoSelecionadoId, setPlanoSelecionadoId] = useState('');
    const [valorConvenio, setValorConvenio] = useState('');
    
    const [configAgenda, setConfigAgenda] = useState({ duracao_padrao: 15, equipamento_obrigatorio: '', dias_funcionamento: [] });
    const [novoDia, setNovoDia] = useState({ dia_semana: '', hora_inicio: '08:00', hora_fim: '18:00' });

    useEffect(() => {
        if (open) {
            setTabValue(0); 
            setPlanoSelecionadoId('');
            setValorConvenio('');
            if (isEditing) {
                setFormData({
                    codigo_tuss: procedimento.codigo_tuss || '', descricao: procedimento.descricao || '',
                    categoria: procedimento.categoria || 'OUTROS', valor_particular: procedimento.valor_particular || '',
                });
                setValoresConvenio(procedimento.valores_convenio || []);
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

    const handleSaveData = async () => {
        if (!formData.descricao) return showSnackbar('Descrição é obrigatória.', 'warning');
        setIsSubmitting(true);
        try {
            const payload = {
                codigo_tuss: formData.codigo_tuss, descricao: formData.descricao, categoria: formData.categoria,
                valor_particular: formData.valor_particular ? parseFloat(formData.valor_particular) : 0,
                configuracao_clinica: configAgenda 
            };
            if (isEditing) {
                await faturamentoService.updateProcedimento(procedimento.id, payload);
                showSnackbar('Procedimento atualizado!', 'success');
            } else {
                await faturamentoService.createProcedimento(payload);
                showSnackbar('Procedimento criado!', 'success');
            }
            onSave(); onClose(); 
        } catch (error) { showSnackbar('Erro ao salvar.', 'error'); } 
        finally { setIsSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!isEditing || !window.confirm(`Deseja realmente excluir "${formData.descricao}"?`)) return;
        setIsSubmitting(true);
        try {
            await faturamentoService.deleteProcedimento(procedimento.id);
            showSnackbar('Procedimento excluído.', 'success');
            onSave(); onClose();
        } catch (error) { showSnackbar('Erro ao excluir.', 'error'); } 
        finally { setIsSubmitting(false); }
    };

    const handleAddPrecoConvenio = async () => {
        if (!planoSelecionadoId || !valorConvenio) return showSnackbar('Selecione plano e valor.', 'warning');
        setIsSubmitting(true);
        try {
            await faturamentoService.definirPrecoConvenio(procedimento.id, { plano_convenio_id: planoSelecionadoId, valor: valorConvenio });
            showSnackbar('Preço salvo/atualizado!', 'success');
            
            const planoNome = planosDisponiveis.find(p => p.id === planoSelecionadoId);
            setValoresConvenio(prev => {
                const existe = prev.findIndex(v => v.plano_convenio.id === planoSelecionadoId);
                const novoItem = { plano_convenio: planoNome, valor: valorConvenio };
                if (existe >= 0) { 
                    const updated = [...prev]; 
                    updated[existe] = novoItem; 
                    return updated; 
                }
                return [...prev, novoItem];
            });

            setPlanoSelecionadoId(''); setValorConvenio(''); onSave(); 
        } catch (error) { showSnackbar('Erro ao salvar preço.', 'error'); } 
        finally { setIsSubmitting(false); }
    };

    const handleEditPreco = (item) => {
        setPlanoSelecionadoId(item.plano_convenio.id);
        setValorConvenio(item.valor);
    };

    const handleAddDia = () => {
        if (novoDia.dia_semana === '' || !novoDia.hora_inicio || !novoDia.hora_fim) return showSnackbar('Preencha horários.', 'warning');
        if (configAgenda.dias_funcionamento.some(d => d.dia_semana === novoDia.dia_semana)) return showSnackbar('Dia já configurado.', 'warning');
        setConfigAgenda(prev => ({ ...prev, dias_funcionamento: [...prev.dias_funcionamento, novoDia].sort((a, b) => a.dia_semana - b.dia_semana) }));
        setNovoDia({ dia_semana: '', hora_inicio: '08:00', hora_fim: '18:00' });
    };

    const handleRemoveDia = (dia_semana) => {
        setConfigAgenda(prev => ({ ...prev, dias_funcionamento: prev.dias_funcionamento.filter(d => d.dia_semana !== dia_semana) }));
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" disableEscapeKeyDown={isSubmitting} PaperProps={{ className: 'tasy-flat-panel', sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ p: 2, bgcolor: '#f8f9fa', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalHospital sx={{ color: '#1c7ed6' }} />
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#495057', textTransform: 'uppercase' }}>
                        {isEditing ? `Gerenciar: ${formData.descricao}` : 'Cadastrar Novo Procedimento'}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} disabled={isSubmitting} sx={{ color: '#868e96' }}><Close fontSize="small" /></IconButton>
            </DialogTitle>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8f9fa', px: 2 }}>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} textColor="primary" indicatorColor="primary" sx={{ minHeight: 48 }}>
                    <Tab icon={<AttachMoney sx={{mr:1, mb:0}}/>} iconPosition="start" label="Identificação & Valores" sx={{ minHeight: 48, fontSize: '12px', fontWeight: 600 }} />
                    <Tab icon={<AccessTime sx={{mr:1, mb:0}}/>} iconPosition="start" label="Automação de Agenda" sx={{ minHeight: 48, fontSize: '12px', fontWeight: 600 }} />
                </Tabs>
            </Box>

            {/* Altura fixa para evitar o modal pular de tamanho entre as abas */}
            <DialogContent sx={{ p: 0, bgcolor: '#fff', overflow: 'hidden', height: '420px' }}>
                
                {/* ABA 1: DADOS E VALORES */}
                <TabPanel value={tabValue} index={0}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#1c7ed6', mb: 2, textTransform: 'uppercase' }}>
                                Dados Básicos do Exame
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={3}>
                                    <TextField label="Cód. TUSS" value={formData.codigo_tuss} onChange={(e) => setFormData({...formData, codigo_tuss: e.target.value})} size="small" fullWidth className="tasy-compact-input" />
                                </Grid>
                                <Grid item xs={12} sm={9}>
                                    <TextField label="Descrição do Exame *" value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} size="small" required fullWidth className="tasy-compact-input" />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField select label="Categoria do Painel" value={formData.categoria} onChange={(e) => setFormData({...formData, categoria: e.target.value})} size="small" fullWidth className="tasy-compact-input">
                                        {CATEGORIAS.map(cat => <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField label="Valor Base (Particular)" type="number" value={formData.valor_particular} onChange={(e) => setFormData({...formData, valor_particular: e.target.value})} size="small" fullWidth className="tasy-compact-input" InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }} />
                                </Grid>
                            </Grid>
                        </Grid>

                        <Grid item xs={12}>
                            <Divider sx={{ mb: 3 }} />
                            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#1c7ed6', mb: 2, textTransform: 'uppercase' }}>
                                Tabela de Repasse (Planos de Saúde)
                            </Typography>
                            
                            {isEditing ? (
                                <Box>
                                    <Grid container spacing={1} sx={{ p: 2, bgcolor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 2, mb: 2, alignItems: 'center' }}>
                                        <Grid item xs={12} sm={6}>
                                            <TextField select label="Selecione o Plano" value={planoSelecionadoId} onChange={(e) => setPlanoSelecionadoId(e.target.value)} size="small" fullWidth className="tasy-compact-input">
                                                {planosDisponiveis.map(p => <MenuItem key={p.id} value={p.id}><strong>{p.convenio_nome}</strong> &nbsp;—&nbsp; {p.nome}</MenuItem>)}
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={12} sm={3}>
                                            <TextField label="Valor (R$)" type="number" value={valorConvenio} onChange={(e) => setValorConvenio(e.target.value)} size="small" fullWidth className="tasy-compact-input" />
                                        </Grid>
                                        <Grid item xs={12} sm={3}>
                                            <Button onClick={handleAddPrecoConvenio} variant="contained" color="success" disableElevation disabled={isSubmitting} fullWidth sx={{ fontWeight: 600, fontSize: '12px', height: 36, borderRadius: '4px' }}>
                                                Atualizar
                                            </Button>
                                        </Grid>
                                    </Grid>

                                    <List dense sx={{ border: '1px solid #e9ecef', borderRadius: 2, maxHeight: 120, overflow: 'auto', p: 0, bgcolor: '#fff' }}>
                                        {valoresConvenio.length === 0 ? (
                                            <ListItem><ListItemText secondary={<Typography sx={{ fontSize: '12px', color: '#868e96', textAlign: 'center', py: 2 }}>Nenhum valor de convênio cadastrado.</Typography>} /></ListItem>
                                        ) : valoresConvenio.map(item => (
                                            <ListItem key={item.id} divider sx={{ '&:hover': { bgcolor: '#f8f9fa' } }}>
                                                <ListItemText primary={<Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#343a40' }}>{item.plano_convenio?.convenio_nome} - {item.plano_convenio?.nome}</Typography>} />
                                                <Typography sx={{ fontSize: '13px', color: '#2b8a3e', fontWeight: 600, mr: 2 }}>
                                                    R$ {item.valor}
                                                </Typography>
                                                <Tooltip title="Alterar Valor">
                                                    <IconButton size="small" onClick={() => handleEditPreco(item)} sx={{ color: '#1c7ed6' }}>
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            ) : (
                                <Box sx={{ p: 3, border: '1px dashed #ced4da', borderRadius: 2, bgcolor: '#f8f9fa', textAlign: 'center' }}>
                                    <Typography sx={{ fontSize: '12px', color: '#868e96' }}>
                                        Salve o procedimento pela primeira vez para liberar a inserção de preços de convênios.
                                    </Typography>
                                </Box>
                            )}
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* ABA 2: REGRAS DE AGENDA */}
                <TabPanel value={tabValue} index={1}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#1c7ed6', mb: 2, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase' }}>
                                <Build fontSize="small" /> Requisitos Operacionais
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={5}>
                                    <TextField label="Duração Padrão (Minutos)" type="number" value={configAgenda.duracao_padrao} onChange={(e) => setConfigAgenda({...configAgenda, duracao_padrao: e.target.value})} size="small" fullWidth className="tasy-compact-input" />
                                </Grid>
                                <Grid item xs={12} sm={7}>
                                    <TextField label="Equipamento Exigido (Tag da Sala)" value={configAgenda.equipamento_obrigatorio} onChange={(e) => setConfigAgenda({...configAgenda, equipamento_obrigatorio: e.target.value.toUpperCase()})} size="small" fullWidth className="tasy-compact-input" placeholder="Ex: SAMSUNG_V7 (Deixe em branco se livre)" />
                                </Grid>
                            </Grid>
                        </Grid>

                        <Grid item xs={12}>
                            <Divider sx={{ mb: 3 }} />
                            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#1c7ed6', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase' }}>
                                <AccessTime fontSize="small" /> Dias e Horários Autorizados
                            </Typography>
                            <Typography sx={{ fontSize: '12px', color: '#868e96', mb: 2 }}>
                                O paciente/chatbot só poderá encontrar vagas para este exame caso a agenda caia nestes períodos.
                            </Typography>
                            
                            <Grid container spacing={1} sx={{ p: 2, bgcolor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 2, mb: 2, alignItems: 'center' }}>
                                <Grid item xs={12} sm={4}>
                                    <TextField select label="Dia da Semana" value={novoDia.dia_semana} onChange={(e) => setNovoDia({...novoDia, dia_semana: e.target.value})} size="small" fullWidth className="tasy-compact-input">
                                        {DIAS_SEMANA.map(dia => <MenuItem key={dia.value} value={dia.value}>{dia.label}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField label="Horário Inicial" type="time" size="small" fullWidth className="tasy-compact-input" value={novoDia.hora_inicio} onChange={(e) => setNovoDia({...novoDia, hora_inicio: e.target.value})} InputLabelProps={{ shrink: true }} />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField label="Horário Final" type="time" size="small" fullWidth className="tasy-compact-input" value={novoDia.hora_fim} onChange={(e) => setNovoDia({...novoDia, hora_fim: e.target.value})} InputLabelProps={{ shrink: true }} />
                                </Grid>
                                <Grid item xs={12} sm={2}>
                                    <Button onClick={handleAddDia} variant="contained" disableElevation fullWidth sx={{ bgcolor: '#1c7ed6', height: 36, p: 0 }}><AddCircle fontSize="small" /></Button>
                                </Grid>
                            </Grid>

                            <Stack spacing={1} sx={{ maxHeight: 140, overflow: 'auto', p: 0.5 }}>
                                {configAgenda.dias_funcionamento.length === 0 ? (
                                    <Typography sx={{ fontSize: '12px', color: '#adb5bd', textAlign: 'center', py: 2, fontStyle: 'italic' }}>
                                        Nenhuma regra configurada. Este exame NÃO será ofertado automaticamente pelo robô.
                                    </Typography>
                                ) : configAgenda.dias_funcionamento.map((dia) => (
                                    <Box key={dia.dia_semana} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, border: '1px solid #dee2e6', borderRadius: 2, bgcolor: '#fff' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Typography sx={{ bgcolor: '#e7f5ff', color: '#1c7ed6', fontWeight: 600, width: 100, textAlign: 'center', borderRadius: 1, py: 0.5, fontSize: '11px' }}>
                                                {DIAS_SEMANA.find(d => d.value === dia.dia_semana)?.label}
                                            </Typography>
                                            <Typography sx={{ fontSize: '13px', color: '#495057' }}>
                                                Permitido agendar entre <strong>{dia.hora_inicio}</strong> e <strong>{dia.hora_fim}</strong>
                                            </Typography>
                                        </Box>
                                        <IconButton size="small" sx={{ color: '#e03131', '&:hover': { bgcolor: '#ffe3e3' } }} onClick={() => handleRemoveDia(dia.dia_semana)}>
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </Box>
                                ))}
                            </Stack>
                        </Grid>
                    </Grid>
                </TabPanel>
            </DialogContent>
            
            <DialogActions sx={{ justifyContent: 'space-between', p: 2, bgcolor: '#f8f9fa', borderTop: '1px solid #e9ecef' }}>
                <Box>
                    {isEditing && (
                        <Button color="error" onClick={handleDelete} disabled={isSubmitting} sx={{ fontWeight: 600, fontSize: '12px', textTransform: 'none' }}>
                            Excluir Procedimento
                        </Button>
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button onClick={onClose} disabled={isSubmitting} sx={{ color: '#868e96', fontSize: '12px', fontWeight: 600 }}>Cancelar</Button>
                    <Button 
                        variant="contained" disableElevation
                        startIcon={isSubmitting ? <CircularProgress size={16} color="inherit"/> : <Save />}
                        onClick={handleSaveData} disabled={isSubmitting}
                        sx={{ fontWeight: 600, fontSize: '12px', px: 3, borderRadius: '4px', bgcolor: '#1c7ed6' }}
                    >
                        Salvar e Fechar
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
}