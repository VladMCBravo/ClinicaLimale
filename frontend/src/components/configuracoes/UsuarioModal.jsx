import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Button, CircularProgress, Box, FormControl, InputLabel, Select,
    MenuItem, FormControlLabel, Switch, Chip, Typography, Grid, 
    InputAdornment, IconButton, List, ListItem, ListItemText
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { configuracoesService } from '../../services/configuracoesService';
import { TextMaskCPF, TextMaskTelefone, TextMaskCEP } from '../common/MaskedInput';

const initialState = {
    username: '', password: '', first_name: '', last_name: '',
    cargo: 'recepcao', is_active: true,
    genero: '', data_nascimento: '', telefone: '', cpf: '', email: '',
    crm: '', 
    logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '',
    pin_ponto: '',
};

export default function UsuarioModal({ open, onClose, onSave, usuarioParaEditar }) {
    const { showSnackbar } = useSnackbar();
    const [formData, setFormData] = useState(initialState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [especialidadesDisponiveis, setEspecialidadesDisponiveis] = useState([]);
    const [isCepLoading, setIsCepLoading] = useState(false);

    // --- NOVOS ESTADOS PARA ESPECIALIDADES COM RQE ---
    const [medicoEspecialidades, setMedicoEspecialidades] = useState([]);
    const [novaEsp, setNovaEsp] = useState('');
    const [novoRqe, setNovoRqe] = useState('');

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
                username: usuarioParaEditar.username || '',
                first_name: usuarioParaEditar.first_name || '',
                last_name: usuarioParaEditar.last_name || '',
                cargo: usuarioParaEditar.cargo || 'recepcao',
                is_active: usuarioParaEditar.is_active,
                genero: usuarioParaEditar.genero || '',
                data_nascimento: usuarioParaEditar.data_nascimento || '',
                telefone: usuarioParaEditar.telefone || '',
                cpf: usuarioParaEditar.cpf || '',
                email: usuarioParaEditar.email || '',
                crm: usuarioParaEditar.crm || '',
                logradouro: usuarioParaEditar.logradouro || '',
                numero: usuarioParaEditar.numero || '',
                complemento: usuarioParaEditar.complemento || '',
                bairro: usuarioParaEditar.bairro || '',
                cidade: usuarioParaEditar.cidade || '',
                uf: usuarioParaEditar.uf || '',
                cep: usuarioParaEditar.cep || '',
                pin_ponto: usuarioParaEditar.pin_ponto || '',
                password: '', 
            });
            // Carrega a nova estrutura de relacionamento do backend
            setMedicoEspecialidades(usuarioParaEditar.medico_especialidades || []);
        } else {
            setFormData(initialState);
            setMedicoEspecialidades([]);
        }
    }, [usuarioParaEditar, open]);

    const handleClose = () => {
        setNovaEsp('');
        setNovoRqe('');
        onClose();
    };

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSwitchChange = (e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }));
    const handleMaskedChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    // --- FUNÇÕES DE MANIPULAÇÃO DA LISTA DE ESPECIALIDADES ---
    const handleAddEspecialidade = () => {
        if (!novaEsp) return;
        // Evita duplicar a mesma especialidade
        if (medicoEspecialidades.find(item => item.especialidade === novaEsp)) {
            return showSnackbar('Especialidade já adicionada!', 'warning');
        }
        
        setMedicoEspecialidades(prev => [...prev, { especialidade: novaEsp, rqe: novoRqe }]);
        setNovaEsp('');
        setNovoRqe('');
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
                if (!response.ok) throw new Error('CEP não encontrado');
                const data = await response.json();
                if (data.erro) throw new Error('CEP não localizado');
                setFormData(prev => ({
                    ...prev, logradouro: data.logradouro, bairro: data.bairro,
                    cidade: data.localidade, uf: data.uf, complemento: data.complemento,
                }));
                showSnackbar('Endereço preenchido!', 'success');
            } catch (error) {
                showSnackbar(error.message || 'Erro ao buscar CEP.', 'error');
            } finally {
                setIsCepLoading(false);
            }
        }
    }, [formData.cep, showSnackbar]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        // Agora enviamos a lista de objetos no padrão que o Django vai entender
        const dataToSend = {
            ...formData,
            medico_especialidades: medicoEspecialidades, 
        };
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
            const errorData = error.response?.data;
            const errorMsg = typeof errorData === 'object' ? Object.values(errorData).flat()[0] : 'Erro ao salvar usuário.';
            showSnackbar(errorMsg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
            <DialogTitle>{usuarioParaEditar ? 'Editar Usuário' : 'Criar Novo Usuário'}</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                        
                        <Typography variant="h6" sx={{ color: 'text.secondary', mt: 1 }}>Dados Pessoais</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}><TextField name="first_name" label="Nome" value={formData.first_name} onChange={handleChange} required fullWidth /></Grid>
                            <Grid item xs={12} sm={6}><TextField name="last_name" label="Sobrenome" value={formData.last_name} onChange={handleChange} required fullWidth /></Grid>
                            <Grid item xs={12} sm={6}><TextField name="data_nascimento" label="Data de Nascimento" type="date" value={formData.data_nascimento || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Gênero</InputLabel>
                                    <Select name="genero" value={formData.genero || ''} label="Gênero" onChange={handleChange}>
                                        <MenuItem value=""><em>Não informar</em></MenuItem>
                                        <MenuItem value="M">Masculino</MenuItem>
                                        <MenuItem value="F">Feminino</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}><TextField name="cpf" label="CPF" value={formData.cpf || ''} onChange={handleMaskedChange} fullWidth InputProps={{ inputComponent: TextMaskCPF }} /></Grid>
                            <Grid item xs={12} sm={6}><TextField name="telefone" label="Telefone / Celular" value={formData.telefone || ''} onChange={handleMaskedChange} fullWidth InputProps={{ inputComponent: TextMaskTelefone }} /></Grid>
                        </Grid>

                        <Typography variant="h6" sx={{ color: 'text.secondary', mt: 2 }}>Endereço</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <TextField name="cep" label="CEP" value={formData.cep || ''} onChange={handleMaskedChange} onBlur={handleCepBlur} fullWidth
                                    InputProps={{ inputComponent: TextMaskCEP, endAdornment: (<InputAdornment position="end">{isCepLoading && <CircularProgress size={20} />}</InputAdornment>)}}
                                />
                            </Grid>
                            <Grid item xs={12} sm={8}><TextField name="logradouro" label="Logradouro" value={formData.logradouro || ''} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                            <Grid item xs={12} sm={4}><TextField name="numero" label="Número" value={formData.numero || ''} onChange={handleChange} fullWidth /></Grid>
                            <Grid item xs={12} sm={8}><TextField name="complemento" label="Complemento" value={formData.complemento || ''} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                            <Grid item xs={12} sm={4}><TextField name="bairro" label="Bairro" value={formData.bairro || ''} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                            <Grid item xs={12} sm={5}><TextField name="cidade" label="Cidade" value={formData.cidade || ''} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                            <Grid item xs={12} sm={3}><TextField name="uf" label="UF" value={formData.uf || ''} onChange={handleChange} inputProps={{ maxLength: 2 }} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                        </Grid>

                        <Typography variant="h6" sx={{ color: 'text.secondary', mt: 2 }}>Dados de Acesso e Cargo</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}><TextField name="email" label="E-mail" type="email" value={formData.email || ''} onChange={handleChange} required fullWidth /></Grid>
                            <Grid item xs={12} sm={4}><TextField name="username" label="Usuário (login)" value={formData.username} onChange={handleChange} required fullWidth /></Grid>
                            <Grid item xs={12} sm={4}><TextField name="password" label={usuarioParaEditar ? "Nova Senha (opcional)" : "Senha"} type="password" onChange={handleChange} required={!usuarioParaEditar} fullWidth /></Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth required>
                                    <InputLabel>Cargo</InputLabel>
                                    <Select name="cargo" value={formData.cargo} label="Cargo" onChange={handleChange}>
                                        <MenuItem value="recepcao">Recepção</MenuItem>
                                        <MenuItem value="medico">Médico(a)</MenuItem>
                                        <MenuItem value="admin">Administrador</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField name="pin_ponto" label="PIN do Ponto Eletrônico" type="password" value={formData.pin_ponto || ''} onChange={handleChange} fullWidth inputProps={{ maxLength: 6 }} placeholder="Senha numérica (4 a 6 dígitos)" />
                            </Grid>
                        </Grid>
                        
                        {/* NOVO LAYOUT PARA DADOS MÉDICOS E RQE */}
                        {formData.cargo === 'medico' && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="h6" sx={{ color: 'text.secondary' }}>Dados Médicos</Typography>
                                <Grid container spacing={2} sx={{ pt: 1 }}>
                                    <Grid item xs={12} sm={4}>
                                        <TextField name="crm" label="CRM" value={formData.crm || ''} onChange={handleChange} fullWidth />
                                    </Grid>
                                    
                                    <Grid item xs={12} sm={8}>
                                        <Box sx={{ border: '1px solid #ddd', borderRadius: 1, p: 2, bgcolor: '#fbfbfb' }}>
                                            <Typography variant="subtitle2" sx={{ mb: 2 }}>Gerenciar Especialidades e RQEs</Typography>
                                            
                                            <Grid container spacing={1} alignItems="center">
                                                <Grid item xs={12} sm={6}>
                                                    <FormControl fullWidth size="small">
                                                        <InputLabel>Especialidade</InputLabel>
                                                        <Select value={novaEsp} label="Especialidade" onChange={(e) => setNovaEsp(e.target.value)}>
                                                            {especialidadesDisponiveis.map(esp => (
                                                                <MenuItem key={esp.id} value={esp.id}>{esp.nome}</MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>
                                                </Grid>
                                                <Grid item xs={12} sm={4}>
                                                    <TextField size="small" fullWidth label="RQE (Opcional)" value={novoRqe} onChange={(e) => setNovoRqe(e.target.value)} />
                                                </Grid>
                                                <Grid item xs={12} sm={2}>
                                                    <Button variant="contained" fullWidth onClick={handleAddEspecialidade} disabled={!novaEsp}>
                                                        Add
                                                    </Button>
                                                </Grid>
                                            </Grid>

                                            {medicoEspecialidades.length > 0 && (
                                                <List dense sx={{ mt: 2, bgcolor: '#fff', border: '1px solid #eee', borderRadius: 1 }}>
                                                    {medicoEspecialidades.map((item, index) => {
                                                        const espNome = especialidadesDisponiveis.find(e => e.id === item.especialidade)?.nome || 'Desconhecida';
                                                        return (
                                                            <ListItem key={index} divider sx={{ pr: 0 }}>
                                                                <ListItemText 
                                                                    primary={espNome} 
                                                                    secondary={item.rqe ? `RQE: ${item.rqe}` : 'Sem RQE'} 
                                                                    primaryTypographyProps={{ fontWeight: 'bold' }}
                                                                />
                                                                <IconButton edge="end" color="error" onClick={() => handleRemoveEspecialidade(index)} sx={{ mr: 1 }}>
                                                                    <DeleteIcon />
                                                                </IconButton>
                                                            </ListItem>
                                                        );
                                                    })}
                                                </List>
                                            )}
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Box>
                        )}

                        <FormControlLabel control={<Switch checked={formData.is_active} onChange={handleSwitchChange} />} label="Usuário Ativo" sx={{ mt: 1 }} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting || isCepLoading}>
                        {(isSubmitting || isCepLoading) ? <CircularProgress size={24} /> : 'Salvar Usuário'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}