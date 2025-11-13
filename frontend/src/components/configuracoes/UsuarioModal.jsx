// 1. IMPORTAR OS COMPONENTES DE MÁSCARA E MAIS DO MUI
import React, { useState, useEffect, useCallback } from 'react'; // Adicionar useCallback
import {
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Button, CircularProgress, Box, FormControl, InputLabel, Select,
    MenuItem, FormControlLabel, Switch, OutlinedInput, Chip, 
    Typography, Grid, InputAdornment // Adicionar InputAdornment
} from '@mui/material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { configuracoesService } from '../../services/configuracoesService';
// Importar as máscaras
import { TextMaskCPF, TextMaskTelefone, TextMaskCEP } from '../common/MaskedInput';

// 2. initialState (COMPLETO)
const initialState = {
    username: '', password: '', first_name: '', last_name: '',
    cargo: 'recepcao', is_active: true,
    genero: '', data_nascimento: '', telefone: '', cpf: '', email: '',
    crm: '', rqe: '',
    logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '',
};

export default function UsuarioModal({ open, onClose, onSave, usuarioParaEditar }) {
    const { showSnackbar } = useSnackbar();
    const [formData, setFormData] = useState(initialState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [especialidadesDisponiveis, setEspecialidadesDisponiveis] = useState([]);
    const [selectedEspecialidades, setSelectedEspecialidades] = useState([]);
    const [isCepLoading, setIsCepLoading] = useState(false);

    // ==================================================================
    // === A CORREÇÃO ESTÁ AQUI ===
    // Este useEffect busca a lista de especialidades
    useEffect(() => {
        if (open) {
            configuracoesService.getEspecialidades()
                .then(response => setEspecialidadesDisponiveis(response.data))
                .catch(() => showSnackbar('Erro ao carregar especialidades.', 'error'));
        }
    }, [open, showSnackbar]);
    // ==================================================================

    // 3. useEffect (COMPLETO)
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
                rqe: usuarioParaEditar.rqe || '',
                logradouro: usuarioParaEditar.logradouro || '',
                numero: usuarioParaEditar.numero || '',
                complemento: usuarioParaEditar.complemento || '',
                bairro: usuarioParaEditar.bairro || '',
                cidade: usuarioParaEditar.cidade || '',
                uf: usuarioParaEditar.uf || '',
                cep: usuarioParaEditar.cep || '',
                password: '', // Senha fica vazia
            });
            setSelectedEspecialidades(usuarioParaEditar.especialidades || []);
        } else {
            setFormData(initialState);
            setSelectedEspecialidades([]);
        }
    }, [usuarioParaEditar, open]);

    const handleClose = () => {
        onClose();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };
    
    const handleEspecialidadesChange = (event) => {
        const { target: { value } } = event;
        setSelectedEspecialidades(typeof value === 'string' ? value.split(',') : value);
    };

    const handleSwitchChange = (e) => {
        setFormData(prevState => ({ ...prevState, is_active: e.target.checked }));
    };

    const handleMaskedChange = (event) => {
        const { name, value } = event.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };

    // --- NOVO: FUNÇÃO DE BUSCA DO VIACEP ---
    const handleCepBlur = useCallback(async () => {
        const cep = formData.cep?.replace(/[^0-9]/g, ''); // Limpa a máscara

        if (cep && cep.length === 8) {
            setIsCepLoading(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                if (!response.ok) throw new Error('CEP não encontrado');
                
                const data = await response.json();
                
                if (data.erro) {
                    throw new Error('CEP não localizado');
                }

                // Preenche o formulário com os dados
                setFormData(prev => ({
                    ...prev,
                    logradouro: data.logradouro,
                    bairro: data.bairro,
                    cidade: data.localidade,
                    uf: data.uf,
                    complemento: data.complemento,
                }));
                showSnackbar('Endereço preenchido!', 'success');

            } catch (error) {
                showSnackbar(error.message || 'Erro ao buscar CEP.', 'error');
            } finally {
                setIsCepLoading(false);
            }
        }
    }, [formData.cep, showSnackbar]);
    // --- FIM DA FUNÇÃO VIACEP ---

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const dataToSend = {
            ...formData,
            especialidades: selectedEspecialidades,
        };
        
        if (!dataToSend.password) {
            delete dataToSend.password;
        }

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
                            <Grid item xs={12} sm={6}>
                                <TextField name="cpf" label="CPF" value={formData.cpf || ''} onChange={handleMaskedChange} fullWidth
                                    InputProps={{ inputComponent: TextMaskCPF }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField name="telefone" label="Telefone / Celular" value={formData.telefone || ''} onChange={handleMaskedChange} fullWidth
                                    InputProps={{ inputComponent: TextMaskTelefone }}
                                />
                            </Grid>
                        </Grid>

                        <Typography variant="h6" sx={{ color: 'text.secondary', mt: 2 }}>Endereço</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <TextField 
                                    name="cep" 
                                    label="CEP" 
                                    value={formData.cep || ''} 
                                    onChange={handleMaskedChange}
                                    onBlur={handleCepBlur}
                                    fullWidth
                                    InputProps={{ 
                                        inputComponent: TextMaskCEP,
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                {isCepLoading && <CircularProgress size={20} />}
                                            </InputAdornment>
                                        )
                                    }}
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
                            <Grid item xs={12} sm={6}><TextField name="email" label="E-mail" type="email" value={formData.email || ''} onChange={handleChange} required fullWidth /></Grid>
                            <Grid item xs={12} sm={6}><TextField name="username" label="Usuário (login)" value={formData.username} onChange={handleChange} required fullWidth /></Grid>
                            <Grid item xs={12} sm={6}><TextField name="password" label={usuarioParaEditar ? "Nova Senha (deixe em branco para não alterar)" : "Senha"} type="password" onChange={handleChange} required={!usuarioParaEditar} fullWidth /></Grid>
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
                        </Grid>
                        
                        {/* Campos de Médico */}
                        {formData.cargo === 'medico' && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="h6" sx={{ color: 'text.secondary' }}>Dados Médicos</Typography>
                                <Grid container spacing={2} sx={{ pt: 2 }}>
                                    <Grid item xs={12} sm={6}><TextField name="crm" label="CRM" value={formData.crm || ''} onChange={handleChange} fullWidth /></Grid>
                                    <Grid item xs={12} sm={6}><TextField name="rqe" label="RQE" value={formData.rqe || ''} onChange={handleChange} fullWidth /></Grid>
                                    
                                    {/* ======================================================= */}
                                    {/* O "Grid item" aqui garante que o campo não "esmague" */}
                                    <Grid item xs={12}>
                                    {/* ======================================================= */}
                                        <FormControl fullWidth>
                                            <InputLabel>Especialidades</InputLabel>
                                            <Select multiple value={selectedEspecialidades} onChange={handleEspecialidadesChange}
                                                input={<OutlinedInput label="Especialidades" />}
                                                renderValue={(selected) => (
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                        {selected.map((id) => {
                                                            // Agora 'find' vai funcionar
                                                            const esp = especialidadesDisponiveis.find(e => e.id === id);
                                                            return <Chip key={id} label={esp ? esp.nome : `ID ${id}`} />;
                                                        })}
                                                    </Box>
                                                )}>
                                                {/* E o .map aqui também vai funcionar */}
                                                {especialidadesDisponiveis.map((especialidade) => (
                                                    <MenuItem key={especialidade.id} value={especialidade.id}>
                                                        {especialidade.nome}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
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
                        {(isSubmitting || isCepLoading) ? <CircularProgress size={24} /> : 'Salvar'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}