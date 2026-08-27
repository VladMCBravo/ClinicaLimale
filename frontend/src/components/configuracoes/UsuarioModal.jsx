// src/components/configuracoes/UsuarioModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Button, CircularProgress, Box, FormControl, InputLabel, Select,
    MenuItem, FormControlLabel, Switch, Typography, Grid, 
    InputAdornment, IconButton, List, ListItem, ListItemText, Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
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
    const [isCepLoading, setIsCepLoading] = useState(false);

    const [medicoEspecialidades, setMedicoEspecialidades] = useState([]);
    const [novaEsp, setNovaEsp] = useState('');
    const [novoRqe, setNovoRqe] = useState('');

    // --- ESTADOS DA BIOMETRIA ---
    const [isCapturingDigital, setIsCapturingDigital] = useState(false);
    const [statusDigital, setStatusDigital] = useState('');

    useEffect(() => {
        if (open) {
            configuracoesService.getEspecialidades()
                .then(response => setEspecialidadesDisponiveis(response.data))
                .catch(() => showSnackbar('Erro ao carregar especialidades.', 'error'));
        }
    }, [open, showSnackbar]);

    useEffect(() => {
        if (open && usuarioParaEditar) {
            setFormData({
                ...initialState, ...usuarioParaEditar, password: '' 
            });
            setMedicoEspecialidades(usuarioParaEditar.medico_especialidades || []);
            setStatusDigital(''); // Reseta o status da biometria
        } else {
            setFormData(initialState);
            setMedicoEspecialidades([]);
            setStatusDigital('');
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

    const handleCepBlur = useCallback(async () => {
        const cep = formData.cep?.replace(/[^0-9]/g, '');
        if (cep && cep.length === 8) {
            setIsCepLoading(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();
                if (data.erro) throw new Error('CEP não localizado');
                setFormData(prev => ({
                    ...prev, logradouro: data.logradouro, bairro: data.bairro,
                    cidade: data.localidade, uf: data.uf, complemento: data.complemento,
                }));
            } catch (error) {
                showSnackbar(error.message || 'Erro ao buscar CEP.', 'error');
            } finally { setIsCepLoading(false); }
        }
    }, [formData.cep, showSnackbar]);

    // --- FUNÇÃO DE CAPTURA BIOMÉTRICA (INTEGRAÇÃO PYTHON + DJANGO) ---
    const handleCapturarDigital = async () => {
        if (!usuarioParaEditar?.id) return;
        
        setIsCapturingDigital(true);
        setStatusDigital('Acendendo leitor. Coloque o dedo...');

        try {
            // 1. Chama o servidor Flask local rodando no Windows
            const resLocal = await fetch('http://localhost:8080/api/capturar-template');
            const dataLocal = await resLocal.json();

            if (dataLocal.status !== 'sucesso') throw new Error("Falha no leitor USB.");
            
            setStatusDigital('Template gerado. Salvando no servidor...');

            // 2. Envia a String gerada para o Django (usando a nova rota que criamos)
            await apiClient.post(`/usuarios/ponto/cadastrar-biometria/${usuarioParaEditar.id}/`, {
                template_b64: dataLocal.template_b64
            });

            setStatusDigital('✅ Digital cadastrada com sucesso!');
            showSnackbar('Biometria cadastrada no banco de dados!', 'success');
        } catch (error) {
            setStatusDigital('❌ Erro na captura.');
            showSnackbar('Certifique-se de que o middleware da Futronic está rodando.', 'error');
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

    return (
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
                                                <MenuItem value="admin">Administrador</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    {/* SEÇÃO DA BIOMETRIA Ocupando metade da tela ao lado do cargo */}
                                    <Grid item xs={12} sm={6}>
                                        {usuarioParaEditar ? (
                                            <Box sx={{ border: '1px solid #1c7ed6', bgcolor: '#e7f5ff', p: 1, textAlign: 'center' }}>
                                                <Button 
                                                    variant="contained" 
                                                    disableElevation 
                                                    fullWidth 
                                                    size="small"
                                                    color="primary"
                                                    startIcon={isCapturingDigital ? <CircularProgress size={16} color="inherit" /> : <FingerprintIcon />}
                                                    onClick={handleCapturarDigital}
                                                    disabled={isCapturingDigital}
                                                >
                                                    {isCapturingDigital ? 'Capturando...' : 'Cadastrar Digital Biométrica'}
                                                </Button>
                                                {statusDigital && <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5, fontWeight: 'bold' }}>{statusDigital}</Typography>}
                                            </Box>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                                                * Salve o usuário primeiro para habilitar o cadastro da digital biométrica.
                                            </Typography>
                                        )}
                                    </Grid>
                                </Grid>
                            </div>
                        </div>

                        {formData.cargo === 'medico' && (
                            <div className="tasy-panel theme-purple">
                                <div className="tasy-panel-body">
                                    <div className="tasy-section-header">Dados Médicos (Somente Médicos)</div>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={4}>
                                            <TextField className="tasy-compact-input" name="crm" label="CRM" value={formData.crm || ''} onChange={handleChange} fullWidth />
                                        </Grid>
                                        
                                        <Grid item xs={12} sm={8}>
                                            <Box sx={{ border: '1px solid #dee2e6', p: 1.5, bgcolor: '#fff' }}>
                                                <Grid container spacing={1} alignItems="center">
                                                    <Grid item xs={12} sm={6}>
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
                                                        <TextField className="tasy-compact-input" fullWidth label="RQE (Opcional)" value={novoRqe} onChange={(e) => setNovoRqe(e.target.value)} />
                                                    </Grid>
                                                    <Grid item xs={12} sm={2}>
                                                        <Button variant="contained" disableElevation fullWidth onClick={handleAddEspecialidade} disabled={!novaEsp} sx={{ bgcolor: '#7048e8' }}>Add</Button>
                                                    </Grid>
                                                </Grid>

                                                {medicoEspecialidades.length > 0 && (
                                                    <List dense sx={{ mt: 1, borderTop: '1px solid #eee' }}>
                                                        {medicoEspecialidades.map((item, index) => {
                                                            const espNome = especialidadesDisponiveis.find(e => e.id === item.especialidade)?.nome || 'Desconhecida';
                                                            return (
                                                                <ListItem key={index} divider sx={{ px: 0, py: 0.5 }}>
                                                                    <ListItemText primary={espNome} secondary={item.rqe ? `RQE: ${item.rqe}` : 'Sem RQE'} primaryTypographyProps={{ fontSize: '13px', fontWeight: 'bold' }} />
                                                                    <IconButton edge="end" color="error" size="small" onClick={() => handleRemoveEspecialidade(index)}><DeleteIcon fontSize="small" /></IconButton>
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
    );
}