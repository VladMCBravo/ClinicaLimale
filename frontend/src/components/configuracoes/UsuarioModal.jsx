// src/components/configuracoes/UsuarioModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Button, CircularProgress, Box, FormControl, InputLabel, Select,
    MenuItem, FormControlLabel, Switch, Typography, Grid, 
    IconButton, List, ListItem, ListItemText
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { configuracoesService } from '../../services/configuracoesService';
import { TextMaskCPF, TextMaskTelefone, TextMaskCEP } from '../common/MaskedInput'; 

const initialState = {
    username: '', password: '', first_name: '', last_name: '',
    cargo: 'recepcao', is_active: true,
    genero: '', data_nascimento: '', telefone: '', cpf: '', email: '',
    crm: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: ''
};

export default function UsuarioModal({ open, onClose, onSave, usuarioParaEditar }) {
    const { showSnackbar } = useSnackbar();
    const [formData, setFormData] = useState(initialState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [especialidadesDisponiveis, setEspecialidadesDisponiveis] = useState([]);

    const [medicoEspecialidades, setMedicoEspecialidades] = useState([]);
    const [novaEsp, setNovaEsp] = useState('');
    const [novoRqe, setNovoRqe] = useState('');

    // --- ESTADOS DA BIOMETRIA ---
    const [modalBioOpen, setModalBioOpen] = useState(false);
    const [isCapturingDigital, setIsCapturingDigital] = useState(false);
    const [bioImage, setBioImage] = useState(null);
    const [bioQualityText, setBioQualityText] = useState('');
    const [bioQualityGood, setBioQualityGood] = useState(false);
    const [bioTemplateTemp, setBioTemplateTemp] = useState(null);
    const [statusGeralDigital, setStatusGeralDigital] = useState('');

    useEffect(() => {
        if (open) {
            configuracoesService.getEspecialidades()
                .then(response => {
                    const dadosLimpos = response.data.results || response.data || [];
                    setEspecialidadesDisponiveis(dadosLimpos);
                })
                .catch(() => showSnackbar('Erro ao carregar especialidades.', 'error'));
        }
    }, [open, showSnackbar]);

    useEffect(() => {
        if (open && usuarioParaEditar) {
            setFormData({ ...initialState, ...usuarioParaEditar, password: '' });
            setMedicoEspecialidades(usuarioParaEditar.medico_especialidades || []);
            setStatusGeralDigital('');
        } else {
            setFormData(initialState);
            setMedicoEspecialidades([]);
            setStatusGeralDigital('');
        }
    }, [usuarioParaEditar, open]);

    const handleClose = () => {
        setNovaEsp(''); setNovoRqe(''); onClose();
    };

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSwitchChange = (e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }));
    const handleMaskedChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleAddEspecialidade = () => {
        if (!novaEsp) return;
        if (medicoEspecialidades.find(item => item.especialidade === novaEsp)) {
            return showSnackbar('Especialidade já adicionada!', 'warning');
        }
        setMedicoEspecialidades(prev => [...prev, { especialidade: novaEsp, rqe: novoRqe }]);
        setNovaEsp(''); setNovoRqe('');
    };

    const handleRemoveEspecialidade = (index) => {
        setMedicoEspecialidades(prev => prev.filter((_, i) => i !== index));
    };

    const handleAbrirCaptura = () => {
        setModalBioOpen(true);
        executarCapturaLocal();
    };

    const executarCapturaLocal = async () => {
        setIsCapturingDigital(true);
        setBioImage(null);
        setBioTemplateTemp(null);
        setBioQualityText('Aguardando dedo... Por favor, pressione firmemente sobre a luz vermelha.');

        try {
            const resLocal = await fetch('http://localhost:8080/api/capturar-template');
            const dataLocal = await resLocal.json();

            if (dataLocal.status !== 'sucesso') {
                throw new Error(dataLocal.mensagem || "Falha ao ler dispositivo.");
            }
            
            // Exibe a imagem retornada pela câmera do leitor
            setBioImage(dataLocal.imagem_png_b64);
            
            // 👇 NOVAS TRAVAS DE SEGURANÇA 👇
            const atingiuScore = dataLocal.pontos >= 45;
            const isCorrompido = dataLocal.template_b64.startsWith('AAAAAAAAAAAA');

            if (isCorrompido) {
                setBioQualityGood(false);
                setBioQualityText('❌ Leitor falhou (Falha de permissão USB do Windows). Reinicie o leitor.');
                setBioTemplateTemp(null);
            } 
            else if (!atingiuScore) {
                setBioQualityGood(false);
                setBioQualityText(`⚠️ Apenas ${dataLocal.pontos} pontos (Mínimo exigido: 45). Limpe o sensor e tente novamente.`);
                setBioTemplateTemp(null);
            } 
            else {
                setBioQualityGood(true);
                setBioQualityText(`✅ ${dataLocal.pontos} pontos encontrados. Qualidade excelente!`);
                setBioTemplateTemp(dataLocal.template_b64);
            }

        } catch (error) {
            setBioQualityGood(false);
            setBioQualityText(`❌ Falha: ${error.message}`);
        } finally {
            setIsCapturingDigital(false);
        }
    };

    const handleCepBlur = async (e) => {
        const cepDigitado = e.target.value.replace(/\D/g, '');
        
        if (cepDigitado.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cepDigitado}/json/`);
                const data = await response.json();
                
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        logradouro: data.logradouro || prev.logradouro,
                        bairro: data.bairro || prev.bairro,
                        cidade: data.localidade || prev.cidade,
                        uf: data.uf || prev.uf
                    }));
                    showSnackbar('Endereço preenchido automaticamente!', 'info'); 
                } else {
                    showSnackbar('CEP não encontrado.', 'warning');
                }
            } catch (error) {
                showSnackbar('Erro ao buscar o CEP.', 'error');
            }
        }
    };

    const handleSalvarBiometriaNuvem = async () => {
        if (!bioTemplateTemp || !usuarioParaEditar?.id) return;
        setIsCapturingDigital(true);
        
        try {
            await apiClient.post(`/usuarios/ponto/cadastrar-biometria/${usuarioParaEditar.id}/`, {
                template_b64: bioTemplateTemp
            });
            showSnackbar('Biometria salva no servidor!', 'success');
            setModalBioOpen(false);
            setStatusGeralDigital('✅ Digital registrada com sucesso!');
        } catch (error) {
            showSnackbar('Erro ao salvar biometria na nuvem.', 'error');
        } finally {
            setIsCapturingDigital(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const dataToSend = { ...formData, medico_especialidades: medicoEspecialidades };
        if (!dataToSend.password) delete dataToSend.password;

        try {
            if (usuarioParaEditar) {
                await apiClient.patch(`/usuarios/usuarios/${usuarioParaEditar.id}/`, dataToSend);
                showSnackbar('Usuário atualizado com sucesso!', 'success');
            } else {
                await apiClient.post('/usuarios/usuarios/', dataToSend);
                showSnackbar('Usuário criado com sucesso!', 'success');
            }
            onSave();
            handleClose();
        } catch (error) {
            showSnackbar('Erro ao salvar usuário.', 'error');
        } finally { setIsSubmitting(false); }
    };

    // 👇 VARIAVEL MAGICA: Libera o painel de especialidades para médicos E admins-médicos 👇
    const isMedico = ['medico', 'admin_medico'].includes(formData.cargo);

    return (
        <>
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg" PaperProps={{ sx: { borderRadius: 0 } }}>
                <DialogTitle className="tasy-panel-header" sx={{ fontWeight: 'bold' }}>
                    {usuarioParaEditar ? 'Editar Usuário' : 'Criar Novo Usuário'}
                </DialogTitle>
                <form onSubmit={handleSubmit} className="tasy-workspace">
                    <DialogContent dividers sx={{ bgcolor: '#f4f6f8' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            
                            <div className="tasy-panel theme-blue">
                                <div className="tasy-panel-body">
                                    <div className="tasy-section-header">Dados Pessoais</div>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}><TextField className="tasy-compact-input" name="first_name" label="Nome" value={formData.first_name} onChange={handleChange} required fullWidth /></Grid>
                                        <Grid item xs={12} sm={6}><TextField className="tasy-compact-input" name="last_name" label="Sobrenome" value={formData.last_name} onChange={handleChange} required fullWidth /></Grid>
                                        <Grid item xs={12} sm={4}><TextField className="tasy-compact-input" name="data_nascimento" label="Data de Nascimento" type="date" value={formData.data_nascimento || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
                                        <Grid item xs={12} sm={4}>
                                            <FormControl fullWidth className="tasy-compact-input">
                                                <InputLabel>Gênero</InputLabel>
                                                <Select name="genero" value={formData.genero || ''} label="Gênero" onChange={handleChange}>
                                                    <MenuItem value=""><em>Não informar</em></MenuItem>
                                                    <MenuItem value="M">Masculino</MenuItem>
                                                    <MenuItem value="F">Feminino</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} sm={4}><TextField className="tasy-compact-input" name="cpf" label="CPF" value={formData.cpf || ''} onChange={handleMaskedChange} fullWidth InputProps={{ inputComponent: TextMaskCPF }} /></Grid>
                                        <Grid item xs={12} sm={4}><TextField className="tasy-compact-input" name="telefone" label="Telefone" value={formData.telefone || ''} onChange={handleMaskedChange} fullWidth InputProps={{ inputComponent: TextMaskTelefone }} /></Grid>
                                    </Grid>
                                </div>
                            </div>

                            <div className="tasy-panel theme-blue">
                                <div className="tasy-panel-body">
                                    <div className="tasy-section-header">Acesso e Biometria</div>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid item xs={12} sm={4}><TextField className="tasy-compact-input" name="email" label="E-mail" type="email" value={formData.email || ''} onChange={handleChange} required fullWidth /></Grid>
                                        <Grid item xs={12} sm={4}><TextField className="tasy-compact-input" name="username" label="Usuário (login)" value={formData.username} onChange={handleChange} required fullWidth /></Grid>
                                        <Grid item xs={12} sm={4}><TextField className="tasy-compact-input" name="password" label={usuarioParaEditar ? "Nova Senha (opcional)" : "Senha"} type="password" onChange={handleChange} required={!usuarioParaEditar} fullWidth /></Grid>
                                        
                                        <Grid item xs={12} sm={6}>
                                            <FormControl fullWidth required className="tasy-compact-input">
                                                <InputLabel>Cargo</InputLabel>
                                                <Select name="cargo" value={formData.cargo} label="Cargo" onChange={handleChange}>
                                                    <MenuItem value="recepcao">Recepção</MenuItem>
                                                    <MenuItem value="medico">Médico(a)</MenuItem>
                                                    <MenuItem value="admin_medico">Médico Sócio (Admin/Médico)</MenuItem>
                                                    <MenuItem value="admin">Administrador</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            {usuarioParaEditar ? (
                                                <Box sx={{ border: '1px solid #1c7ed6', bgcolor: '#e7f5ff', p: 1, textAlign: 'center' }}>
                                                    <Button 
                                                        variant="contained" disableElevation fullWidth size="small" color="primary"
                                                        startIcon={<FingerprintIcon />}
                                                        onClick={handleAbrirCaptura}
                                                    >
                                                        Cadastrar Digital Biométrica
                                                    </Button>
                                                    {statusGeralDigital && <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5, fontWeight: 'bold' }}>{statusGeralDigital}</Typography>}
                                                </Box>
                                            ) : (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                                                    * Salve o usuário primeiro para habilitar o cadastro biométrico.
                                                </Typography>
                                            )}
                                        </Grid>
                                    </Grid>
                                </div>
                            </div>

                            <div className="tasy-panel theme-blue">
                                <div className="tasy-panel-body">
                                    <div className="tasy-section-header">Endereço</div>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={3}>
                                            <TextField 
                                                className="tasy-compact-input" name="cep" label="CEP" 
                                                value={formData.cep || ''} onChange={handleMaskedChange} 
                                                onBlur={handleCepBlur} fullWidth 
                                                InputProps={{ inputComponent: TextMaskCEP }} 
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={7}>
                                            <TextField className="tasy-compact-input" name="logradouro" label="Logradouro" value={formData.logradouro || ''} onChange={handleChange} fullWidth />
                                        </Grid>
                                        <Grid item xs={12} sm={2}>
                                            <TextField className="tasy-compact-input" name="numero" label="Número" value={formData.numero || ''} onChange={handleChange} fullWidth />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField className="tasy-compact-input" name="complemento" label="Complemento" value={formData.complemento || ''} onChange={handleChange} fullWidth />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField className="tasy-compact-input" name="bairro" label="Bairro" value={formData.bairro || ''} onChange={handleChange} fullWidth />
                                        </Grid>
                                        <Grid item xs={12} sm={9}>
                                            <TextField className="tasy-compact-input" name="cidade" label="Cidade" value={formData.cidade || ''} onChange={handleChange} fullWidth />
                                        </Grid>
                                        <Grid item xs={12} sm={3}>
                                            <TextField className="tasy-compact-input" name="uf" label="UF" value={formData.uf || ''} onChange={handleChange} fullWidth />
                                        </Grid>
                                    </Grid>
                                </div>
                            </div>

                            {/* 👇 PAINEL DE DADOS MÉDICOS RESTAURADO 👇 */}
                            {isMedico && (
                                <div className="tasy-panel theme-blue">
                                    <div className="tasy-panel-body">
                                        <div className="tasy-section-header">Dados Profissionais (Médico)</div>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={4}>
                                                <TextField 
                                                    className="tasy-compact-input" 
                                                    name="crm" 
                                                    label="CRM" 
                                                    value={formData.crm || ''} 
                                                    onChange={handleChange} 
                                                    fullWidth 
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={8}>
                                                <Box sx={{ p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fff' }}>
                                                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#495057' }}>Adicionar Especialidade</Typography>
                                                    <Grid container spacing={1} alignItems="center">
                                                        <Grid item xs={12} sm={5}>
                                                            <FormControl fullWidth size="small" className="tasy-compact-input">
                                                                <InputLabel>Especialidade</InputLabel>
                                                                <Select value={novaEsp} label="Especialidade" onChange={(e) => setNovaEsp(e.target.value)}>
                                                                    {especialidadesDisponiveis.map(esp => (
                                                                        <MenuItem key={esp.id} value={esp.id}>{esp.nome}</MenuItem>
                                                                    ))}
                                                                </Select>
                                                            </FormControl>
                                                        </Grid>
                                                        <Grid item xs={12} sm={4}>
                                                            <TextField size="small" className="tasy-compact-input" label="RQE (Opcional)" value={novoRqe} onChange={(e) => setNovoRqe(e.target.value)} fullWidth />
                                                        </Grid>
                                                        <Grid item xs={12} sm={3}>
                                                            <Button variant="outlined" color="primary" onClick={handleAddEspecialidade} fullWidth size="small">Adicionar</Button>
                                                        </Grid>
                                                    </Grid>

                                                    {medicoEspecialidades.length > 0 && (
                                                        <List dense sx={{ mt: 2, bgcolor: '#f8f9fa', borderRadius: 1, border: '1px solid #e9ecef' }}>
                                                            {medicoEspecialidades.map((item, index) => {
                                                                const espNome = especialidadesDisponiveis.find(e => e.id === item.especialidade)?.nome || item.especialidade;
                                                                return (
                                                                    <ListItem key={index} divider secondaryAction={
                                                                        <IconButton edge="end" color="error" size="small" onClick={() => handleRemoveEspecialidade(index)}>
                                                                            <DeleteIcon fontSize="small" />
                                                                        </IconButton>
                                                                    }>
                                                                        <ListItemText 
                                                                            primary={<Typography variant="body2" fontWeight="bold">{espNome}</Typography>} 
                                                                            secondary={<Typography variant="caption" color="text.secondary">{item.rqe ? `RQE: ${item.rqe}` : 'Sem RQE vinculado'}</Typography>} 
                                                                        />
                                                                    </ListItem>
                                                                );
                                                            })}
                                                        </List>
                                                    )}
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </div>
                                </div>
                            )}

                            <FormControlLabel control={<Switch checked={formData.is_active} onChange={handleSwitchChange} color="primary" />} label="Permitir acesso ao sistema (Usuário Ativo)" />
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ bgcolor: '#fff', borderTop: '1px solid #e9ecef', p: 2 }}>
                        <Button onClick={handleClose} sx={{ color: '#495057' }}>Cancelar</Button>
                        <Button type="submit" variant="contained" disableElevation sx={{ bgcolor: '#1c7ed6' }} disabled={isSubmitting}>
                            {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Usuário'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            <Dialog open={modalBioOpen} onClose={() => !isCapturingDigital && setModalBioOpen(false)} maxWidth="xs" fullWidth>
                {/* ... (mantido biometria) ... */}
                <DialogTitle sx={{ textAlign: 'center', bgcolor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                    Leitura de Biometria
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
                    {isCapturingDigital && !bioImage ? (
                        <Box sx={{ textAlign: 'center', py: 3 }}>
                            <CircularProgress size={60} thickness={3} sx={{ mb: 2, color: '#ff4b4b' }} />
                            <Typography variant="subtitle1" fontWeight="bold">Luz acesa!</Typography>
                            <Typography color="text.secondary">{bioQualityText}</Typography>
                        </Box>
                    ) : bioImage ? (
                        <Box sx={{ textAlign: 'center', py: 1 }}>
                            <img src={`data:image/png;base64,${bioImage}`} alt="Digital" style={{ maxWidth: '150px', border: `3px solid ${bioQualityGood ? '#40c057' : '#fa5252'}`, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2, gap: 1 }}>
                                {bioQualityGood ? <CheckCircleIcon color="success" /> : <ErrorIcon color="error" />}
                                <Typography fontWeight="bold" color={bioQualityGood ? 'success.main' : 'error.main'}>{bioQualityText}</Typography>
                            </Box>
                        </Box>
                    ) : (
                        <Typography color="error.main" sx={{ py: 3, textAlign: 'center' }}>{bioQualityText}</Typography>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, justifyContent: 'center', gap: 1, borderTop: '1px solid #dee2e6' }}>
                    <Button onClick={() => setModalBioOpen(false)} disabled={isCapturingDigital} color="inherit">Cancelar</Button>
                    <Button onClick={executarCapturaLocal} disabled={isCapturingDigital} variant="outlined">Tentar Novamente</Button>
                    <Button onClick={handleSalvarBiometriaNuvem} disabled={!bioQualityGood || isCapturingDigital} variant="contained" color="success" disableElevation>Aprovar e Salvar</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}