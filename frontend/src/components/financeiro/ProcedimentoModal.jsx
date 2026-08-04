import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, 
    CircularProgress, Box, Typography, List, ListItem, ListItemText, 
    IconButton, MenuItem, InputAdornment, Tabs, Tab, Paper, Chip, Stack, Tooltip
} from '@mui/material';
import { Delete, Save, AddCircle, AccessTime, AttachMoney, Edit, Close } from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { faturamentoService } from '../../services/faturamentoService';

const CATEGORIAS = [
    { value: 'US_GERAL', label: 'Ultrassonografia Geral' }, { value: 'MED_FETAL', label: 'Medicina Fetal' },
    { value: 'ECOCARDIOGRAMA', label: 'Ecocardiograma' }, { value: 'MUSCULO', label: 'Musculoesquelético' },
    { value: 'DOPPLER', label: 'Doppler Vascular' }, { value: 'OUTROS', label: 'Outros' },
];

const DIAS_SEMANA = [
    { value: 0, label: 'Segunda-feira' }, { value: 1, label: 'Terça-feira' }, { value: 2, label: 'Quarta-feira' },
    { value: 3, label: 'Quinta-feira' }, { value: 4, label: 'Sexta-feira' }, { value: 5, label: 'Sábado' }, { value: 6, label: 'Domingo' }
];

function TabPanel({ children, value, index, ...other }) {
    return <div hidden={value !== index} {...other}>{value === index && <Box sx={{ pt: 2, pb: 1 }}>{children}</Box>}</div>;
}

export default function ProcedimentoModal({ open, onClose, onSave, procedimento }) {
    const { showSnackbar } = useSnackbar();
    const isEditing = !!procedimento;
    const [tabValue, setTabValue] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form Geral
    const [formData, setFormData] = useState({ codigo_tuss: '', descricao: '', categoria: 'OUTROS', valor_particular: '' });
    
    // Form Convênios
    const [valoresConvenio, setValoresConvenio] = useState([]);
    const [planosDisponiveis, setPlanosDisponiveis] = useState([]);
    const [planoSelecionadoId, setPlanoSelecionadoId] = useState('');
    const [valorConvenio, setValorConvenio] = useState('');
    
    // Form Agenda
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

    // --- NOVA LÓGICA DE EDIÇÃO DO PLANO DE SAÚDE ---
    const handleAddPrecoConvenio = async () => {
        if (!planoSelecionadoId || !valorConvenio) return showSnackbar('Selecione plano e valor.', 'warning');
        setIsSubmitting(true);
        try {
            await faturamentoService.definirPrecoConvenio(procedimento.id, { plano_convenio_id: planoSelecionadoId, valor: valorConvenio });
            showSnackbar('Preço salvo/atualizado!', 'success');
            
            // Simula atualização na tela sem precisar recarregar o modal inteiro
            const planoNome = planosDisponiveis.find(p => p.id === planoSelecionadoId);
            setValoresConvenio(prev => {
                const existe = prev.findIndex(v => v.plano_convenio.id === planoSelecionadoId);
                const novoItem = { plano_convenio: planoNome, valor: valorConvenio };
                if (existe >= 0) { const updated = [...prev]; atualizadas[existe] = novoItem; return updated; }
                return [...prev, novoItem];
            });

            setPlanoSelecionadoId(''); setValorConvenio(''); onSave(); // Força update na lista atrás
        } catch (error) { showSnackbar('Erro ao salvar preço.', 'error'); } 
        finally { setIsSubmitting(false); }
    };

    // A MÁGICA: Joga o item clicado de volta para as caixinhas de cima!
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
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" disableEscapeKeyDown={isSubmitting}>
            <DialogTitle sx={{ p: 0, bgcolor: '#f8f9fa', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="#343a40">
                        {isEditing ? `Gerenciar: ${formData.descricao}` : 'Cadastrar Novo Procedimento'}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} disabled={isSubmitting} sx={{ mr: 1 }}><Close /></IconButton>
            </DialogTitle>
            
            <Box sx={{ borderBottom: 1, borderColor: '#dee2e6', bgcolor: '#ffffff', px: 2 }}>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, fontWeight: 'bold', fontSize: '0.75rem' } }}>
                    <Tab icon={<AttachMoney fontSize="small"/>} iconPosition="start" label="Identificação & Valores" />
                    <Tab icon={<AccessTime fontSize="small"/>} iconPosition="start" label="Automação de Agenda" />
                </Tabs>
            </Box>

            <DialogContent sx={{ p: 2, bgcolor: '#f1f3f5' }}>
                
                {/* ABA 1: DADOS E VALORES */}
                <TabPanel value={tabValue} index={0}>
                    <Paper className="tasy-flat-panel" sx={{ p: 2, mb: 2 }}>
                        <div className="tasy-section-header" style={{ margin: '-16px -16px 16px -16px' }}>Dados Base</div>
                        <Box display="flex" gap={1.5} flexWrap="wrap">
                            <TextField 
                                label="Cód. TUSS" value={formData.codigo_tuss} onChange={(e) => setFormData({...formData, codigo_tuss: e.target.value})} 
                                size="small" className="tasy-compact-input" sx={{ width: 120 }} 
                            />
                            <TextField 
                                label="Descrição do Exame" value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} 
                                size="small" required className="tasy-compact-input" sx={{ flexGrow: 1, minWidth: 250 }} 
                            />
                            <TextField 
                                select label="Categoria" value={formData.categoria} onChange={(e) => setFormData({...formData, categoria: e.target.value})} 
                                size="small" className="tasy-compact-input" sx={{ width: 180 }}
                            >
                                {CATEGORIAS.map(cat => <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>)}
                            </TextField>
                            <TextField 
                                label="Valor Particular" type="number" value={formData.valor_particular} onChange={(e) => setFormData({...formData, valor_particular: e.target.value})} 
                                size="small" className="tasy-compact-input" InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }} sx={{ width: 150 }} 
                            />
                        </Box>
                    </Paper>

                    {isEditing ? (
                        <Paper className="tasy-flat-panel" sx={{ p: 2 }}>
                            <div className="tasy-section-header" style={{ margin: '-16px -16px 16px -16px', display:'flex', justifyContent:'space-between' }}>
                                <span>Tabela de Planos de Saúde</span>
                                <span style={{fontSize:'0.65rem', fontWeight:'normal', textTransform:'none'}}>O sistema sempre usará este valor em agendamentos de convênio.</span>
                            </div>
                            
                            {/* CAIXA DE EDIÇÃO/CRIAÇÃO DE CONVÊNIO */}
                            <Box sx={{ display: 'flex', gap: 1, mb: 2, p: 1.5, bgcolor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 1 }}>
                                <TextField 
                                    select label="Selecione o Convênio/Plano" value={planoSelecionadoId} onChange={(e) => setPlanoSelecionadoId(e.target.value)} 
                                    size="small" className="tasy-compact-input" sx={{ flex: 2 }}
                                >
                                    {planosDisponiveis.map(p => <MenuItem key={p.id} value={p.id}><strong>{p.convenio_nome}</strong> &nbsp;—&nbsp; {p.nome}</MenuItem>)}
                                </TextField>
                                <TextField 
                                    label="Valor Repasse (R$)" type="number" value={valorConvenio} onChange={(e) => setValorConvenio(e.target.value)} 
                                    size="small" className="tasy-compact-input" sx={{ width: 140 }} 
                                />
                                <Button 
                                    onClick={handleAddPrecoConvenio} variant="contained" color="success" disabled={isSubmitting} 
                                    sx={{ fontWeight: 'bold', textTransform: 'none', px: 3, borderRadius: 1 }}
                                >
                                    Salvar/Atualizar
                                </Button>
                            </Box>

                            <List dense sx={{ border: '1px solid #dee2e6', borderRadius: 1, maxHeight: 180, overflow: 'auto', p: 0, bgcolor: 'white' }}>
                                {valoresConvenio.length === 0 ? (
                                    <ListItem><ListItemText secondary={<Typography variant="caption">Nenhum valor de convênio cadastrado.</Typography>} /></ListItem>
                                ) : valoresConvenio.map(item => (
                                    <ListItem key={item.id} divider sx={{ '&:hover': { bgcolor: '#f8f9fa' } }}>
                                        <ListItemText 
                                            primary={<Typography variant="body2" fontWeight="600" color="#343a40">{item.plano_convenio?.convenio_nome} - {item.plano_convenio?.nome}</Typography>} 
                                        />
                                        <Typography variant="body2" color="success.main" fontWeight="bold" sx={{ mr: 2 }}>
                                            R$ {item.valor}
                                        </Typography>
                                        <Tooltip title="Alterar Valor">
                                            <IconButton size="small" onClick={() => handleEditPreco(item)} sx={{ color: '#1565c0' }}>
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>
                    ) : (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 4 }}>
                            A tabela de convênios será liberada após você salvar o exame pela primeira vez.
                        </Typography>
                    )}
                </TabPanel>

                {/* ABA 2: REGRAS DE AGENDA */}
                <TabPanel value={tabValue} index={1}>
                    <Paper className="tasy-flat-panel" sx={{ p: 2, mb: 2 }}>
                        <div className="tasy-section-header" style={{ margin: '-16px -16px 16px -16px' }}>Requisitos Operacionais</div>
                        <Box display="flex" gap={2}>
                            <TextField 
                                label="Duração Padrão (minutos)" type="number" value={configAgenda.duracao_padrao} onChange={(e) => setConfigAgenda({...configAgenda, duracao_padrao: e.target.value})} 
                                size="small" className="tasy-compact-input" sx={{ width: 200 }} 
                            />
                            <TextField 
                                label="Equipamento Exigido (Tag da Sala)" value={configAgenda.equipamento_obrigatorio} onChange={(e) => setConfigAgenda({...configAgenda, equipamento_obrigatorio: e.target.value.toUpperCase()})} 
                                size="small" className="tasy-compact-input" sx={{ flexGrow: 1 }} placeholder="Ex: SAMSUNG_V7 (Deixe em branco se livre)"
                            />
                        </Box>
                    </Paper>

                    <Paper className="tasy-flat-panel" sx={{ p: 2 }}>
                        <div className="tasy-section-header" style={{ margin: '-16px -16px 16px -16px', display:'flex', justifyContent:'space-between' }}>
                            <span>Dias e Horários Autorizados</span>
                            <span style={{fontSize:'0.65rem', fontWeight:'normal', textTransform:'none'}}>O chatbot só ofertará vagas que caiam nestes dias/horários.</span>
                        </div>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2, p: 1.5, bgcolor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 1, alignItems: 'center' }}>
                            <TextField 
                                select label="Dia da Semana" value={novoDia.dia_semana} onChange={(e) => setNovoDia({...novoDia, dia_semana: e.target.value})} 
                                size="small" className="tasy-compact-input" sx={{ flexGrow: 1 }}
                            >
                                {DIAS_SEMANA.map(dia => <MenuItem key={dia.value} value={dia.value}>{dia.label}</MenuItem>)}
                            </TextField>
                            <TextField label="Início" type="time" size="small" className="tasy-compact-input" value={novoDia.hora_inicio} onChange={(e) => setNovoDia({...novoDia, hora_inicio: e.target.value})} InputLabelProps={{ shrink: true }} sx={{ width: 120 }} />
                            <TextField label="Fim" type="time" size="small" className="tasy-compact-input" value={novoDia.hora_fim} onChange={(e) => setNovoDia({...novoDia, hora_fim: e.target.value})} InputLabelProps={{ shrink: true }} sx={{ width: 120 }} />
                            <Button onClick={handleAddDia} variant="outlined" color="primary" sx={{ height: 38, minWidth: 40, p: 0, borderRadius: 1 }}><AddCircle /></Button>
                        </Box>

                        <Stack spacing={1}>
                            {configAgenda.dias_funcionamento.length === 0 ? (
                                <Typography variant="caption" color="text.secondary" align="center" sx={{ py: 2 }}>
                                    Nenhuma regra configurada. Este exame NÃO será ofertado automaticamente.
                                </Typography>
                            ) : configAgenda.dias_funcionamento.map((dia) => (
                                <Box key={dia.dia_semana} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, border: '1px solid #dee2e6', borderRadius: 1, bgcolor: 'white' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Chip label={DIAS_SEMANA.find(d => d.value === dia.dia_semana)?.label} color="primary" variant="outlined" size="small" sx={{ fontWeight: 'bold', width: 110 }} />
                                        <Typography variant="body2" sx={{ color: '#495057' }}>
                                            Permitido entre <strong>{dia.hora_inicio}</strong> e <strong>{dia.hora_fim}</strong>
                                        </Typography>
                                    </Box>
                                    <IconButton size="small" color="error" onClick={() => handleRemoveDia(dia.dia_semana)}><Delete fontSize="small" /></IconButton>
                                </Box>
                            ))}
                        </Stack>
                    </Paper>
                </TabPanel>
            </DialogContent>
            
            <DialogActions sx={{ justifyContent: 'space-between', p: 2, bgcolor: '#f8f9fa', borderTop: '1px solid #dee2e6' }}>
                <Box>
                    {isEditing && (
                        <Button color="error" onClick={handleDelete} disabled={isSubmitting} sx={{ fontWeight: 'bold', textTransform: 'none' }}>
                            Excluir Procedimento
                        </Button>
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button onClick={onClose} disabled={isSubmitting} sx={{ color: '#495057' }}>Cancelar</Button>
                    <Button 
                        variant="contained" color="primary"
                        startIcon={isSubmitting ? <CircularProgress size={16} color="inherit"/> : <Save />}
                        onClick={handleSaveData} disabled={isSubmitting}
                        sx={{ fontWeight: 'bold', px: 3, borderRadius: 1 }}
                    >
                        Salvar e Fechar
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
}