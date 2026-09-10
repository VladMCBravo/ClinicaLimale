// src/components/configuracoes/MeuPerfilTab.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Tabs, Tab, Grid, TextField, Button, 
    CircularProgress, Alert, InputAdornment, IconButton, Typography
} from '@mui/material';
import { 
    Person, LocationOn, Security, Visibility, VisibilityOff, Lock, Fingerprint
} from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';
import { TextMaskCEP, TextMaskTelefone } from '../common/MaskedInput';

// Importante: certifique-se de que o atendimento.css está importado no app ou no arquivo pai
import '../../atendimento.css';

function TabPanel({ children, value, index, ...other }) {
    return (
        <div role="tabpanel" hidden={value !== index} {...other} style={{ width: '100%' }}>
            {value === index && <Box sx={{ py: 2, px: 3 }}>{children}</Box>}
        </div>
    );
}

export default function MeuPerfilTab() {
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [savingInfo, setSavingInfo] = useState(false);
    const [feedback, setFeedback] = useState({ show: false, message: '', type: 'success' });

    const [perfil, setPerfil] = useState({
        first_name: '', last_name: '', telefone: '', username: '',
        logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '',
        cargo: '', crm: '', medico_especialidades: [], password: '' 
    });

    const [showSenha, setShowSenha] = useState(false);

    useEffect(() => { carregarDadosPerfil(); }, []);

    const carregarDadosPerfil = async () => {
        try {
            const res = await apiClient.get('/usuarios/me/');
            setPerfil({
                ...res.data,
                username: res.data.username || '',
                password: '',
                medico_especialidades: res.data.medico_especialidades || [] 
            });
        } catch (error) { mostrarFeedback('Erro ao carregar perfil.', 'error'); } 
        finally { setLoading(false); }
    };

    const handleChange = (e) => setPerfil({ ...perfil, [e.target.name]: e.target.value });
    
    const mostrarFeedback = (message, type = 'success') => {
        setFeedback({ show: true, message, type });
        setTimeout(() => setFeedback({ show: false, message: '', type: 'success' }), 5000);
    };

    const handleCepBlur = async (e) => {
        const cepDigitado = e.target.value.replace(/\D/g, ''); 
        if (cepDigitado.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cepDigitado}/json/`);
                const data = await response.json();
                
                if (!data.erro) {
                    setPerfil(prev => ({
                        ...prev,
                        logradouro: data.logradouro || prev.logradouro,
                        bairro: data.bairro || prev.bairro,
                        cidade: data.localidade || prev.cidade,
                        uf: data.uf || prev.uf
                    }));
                    mostrarFeedback('Endereço preenchido automaticamente!', 'info');
                } else {
                    mostrarFeedback('CEP não encontrado.', 'warning');
                }
            } catch (error) {
                mostrarFeedback('Erro ao buscar o CEP.', 'error');
            }
        }
    };

    const handleSalvarPerfil = async (e) => {
        e.preventDefault();
        setSavingInfo(true);
        try {
            const payload = { ...perfil };
            if (!payload.password) delete payload.password;
            
            await apiClient.patch('/usuarios/me/', payload);
            mostrarFeedback('Informações atualizadas com sucesso!');
            setPerfil(prev => ({ ...prev, password: '' }));
        } catch (error) { mostrarFeedback('Erro ao atualizar perfil.', 'error'); } 
        finally { setSavingInfo(false); }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

    return (
        <Box>
            {feedback.show && <Alert severity={feedback.type} sx={{ mb: 2, borderRadius: 0 }}>{feedback.message}</Alert>}
            
            <div className="tasy-flat-panel">
                <Box sx={{ borderBottom: '1px solid #e9ecef', bgcolor: '#f8f9fa' }}>
                    <Tabs value={tab} onChange={(e, v) => setTab(v)} textColor="primary" indicatorColor="primary" sx={{ minHeight: 40 }}>
                        <Tab icon={<Person sx={{mr:1, mb:0}}/>} iconPosition="start" label="Pessoais" sx={{ minHeight: 40, fontSize: '12px', fontWeight: 600 }} />
                        <Tab icon={<LocationOn sx={{mr:1, mb:0}}/>} iconPosition="start" label="Endereço" sx={{ minHeight: 40, fontSize: '12px', fontWeight: 600 }} />
                        <Tab icon={<Lock sx={{mr:1, mb:0}}/>} iconPosition="start" label="Acesso" sx={{ minHeight: 40, fontSize: '12px', fontWeight: 600 }} />
                        {['medico', 'admin_medico'].includes(perfil.cargo) && <Tab icon={<Security sx={{mr:1, mb:0}}/>} iconPosition="start" label="Assinatura" sx={{ minHeight: 40, fontSize: '12px', fontWeight: 600 }} />}
                    </Tabs>
                </Box>

                <Box sx={{ p: 0 }}>
                    {/* ABA 0: PESSOAIS */}
                    <TabPanel value={tab} index={0}>
                        <form onSubmit={handleSalvarPerfil}>
                            <div className="tasy-section-header">Dados Pessoais</div>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}><TextField className="tasy-compact-input" fullWidth label="Nome" name="first_name" value={perfil.first_name || ''} onChange={handleChange} required /></Grid>
                                <Grid item xs={12} sm={6}><TextField className="tasy-compact-input" fullWidth label="Sobrenome" name="last_name" value={perfil.last_name || ''} onChange={handleChange} required /></Grid>
                                <Grid item xs={12} sm={4}><TextField className="tasy-compact-input" fullWidth label="Telefone" name="telefone" value={perfil.telefone || ''} onChange={handleChange} InputProps={{ inputComponent: TextMaskTelefone }} /></Grid>
                                <Grid item xs={12} sm={4}><TextField className="tasy-compact-input" fullWidth label="Cargo" value={(perfil.cargo || '').toUpperCase()} disabled /></Grid>
                                {['medico', 'admin_medico'].includes(perfil.cargo) && <Grid item xs={12} sm={4}><TextField className="tasy-compact-input" fullWidth label="CRM" value={perfil.crm || 'Não informado'} disabled /></Grid>}
                            </Grid>
                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button type="submit" variant="contained" disableElevation sx={{bgcolor: '#1c7ed6'}} disabled={savingInfo}>{savingInfo ? 'Salvando...' : 'Salvar Dados'}</Button>
                            </Box>
                        </form>
                    </TabPanel>

                    {/* ABA 1: ENDEREÇO */}
                    <TabPanel value={tab} index={1}>
                        <form onSubmit={handleSalvarPerfil}>
                            <div className="tasy-section-header">Endereço Residencial</div>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={3}>
                                    <TextField 
                                        className="tasy-compact-input" fullWidth label="CEP" name="cep" 
                                        value={perfil.cep || ''} onChange={handleChange} onBlur={handleCepBlur} 
                                        InputProps={{ inputComponent: TextMaskCEP }} 
                                    />
                                </Grid>
                                <Grid item xs={12} sm={7}><TextField className="tasy-compact-input" fullWidth label="Logradouro" name="logradouro" value={perfil.logradouro || ''} onChange={handleChange} /></Grid>
                                <Grid item xs={12} sm={2}><TextField className="tasy-compact-input" fullWidth label="Número" name="numero" value={perfil.numero || ''} onChange={handleChange} /></Grid>
                                <Grid item xs={12} sm={6}><TextField className="tasy-compact-input" fullWidth label="Complemento" name="complemento" value={perfil.complemento || ''} onChange={handleChange} /></Grid>
                                <Grid item xs={12} sm={6}><TextField className="tasy-compact-input" fullWidth label="Bairro" name="bairro" value={perfil.bairro || ''} onChange={handleChange} /></Grid>
                                <Grid item xs={12} sm={9}><TextField className="tasy-compact-input" fullWidth label="Cidade" name="cidade" value={perfil.cidade || ''} onChange={handleChange} /></Grid>
                                <Grid item xs={12} sm={3}><TextField className="tasy-compact-input" fullWidth label="UF" name="uf" value={perfil.uf || ''} onChange={handleChange} /></Grid>
                            </Grid>
                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button type="submit" variant="contained" disableElevation sx={{bgcolor: '#1c7ed6'}} disabled={savingInfo}>{savingInfo ? 'Salvando...' : 'Salvar Endereço'}</Button>
                            </Box>
                        </form>
                    </TabPanel>

                    {/* ABA 2: SEGURANÇA */}
                    <TabPanel value={tab} index={2}>
                        <form onSubmit={handleSalvarPerfil}>
                            <Grid container spacing={4}>
                                <Grid item xs={12} md={6}>
                                    <div className="tasy-section-header">Dados de Acesso</div>
                                    <TextField 
                                        className="tasy-compact-input" fullWidth label="Usuário de Login" name="username" 
                                        value={perfil.username || ''} onChange={handleChange} sx={{ mb: 2 }} required
                                    />
                                    <TextField 
                                        className="tasy-compact-input" fullWidth label="Nova Senha" name="password" 
                                        type={showSenha ? "text" : "password"} value={perfil.password || ''} onChange={handleChange} 
                                        placeholder="Em branco para manter atual"
                                        InputProps={{ endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowSenha(!showSenha)} edge="end">{showSenha ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>) }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <div className="tasy-section-header">Ponto Eletrônico</div>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: '#f8f9fa', border: '1px solid #e9ecef', borderLeft: '4px solid #1c7ed6' }}>
                                        <Fingerprint sx={{ color: '#1c7ed6', fontSize: 40 }} />
                                        <Typography variant="body2" sx={{ color: '#495057' }}>
                                            Para cadastrar ou atualizar sua biometria de acesso ao ponto eletrônico, por favor dirija-se à administração da clínica.
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button type="submit" variant="contained" disableElevation sx={{bgcolor: '#1c7ed6'}} disabled={savingInfo}>{savingInfo ? 'Salvando...' : 'Salvar Credenciais'}</Button>
                            </Box>
                        </form>
                    </TabPanel>

                    {/* ABA 3: ASSINATURA */}
                    {['medico', 'admin_medico'].includes(perfil.cargo) && (
                        <TabPanel value={tab} index={3}>
                            <div className="tasy-section-header">Certificado Digital</div>
                           {/* ... Código da assinatura da clínica vai aqui, recomendo encapsular num tasy-panel se houver cards */}
                        </TabPanel>
                    )}
                </Box>
            </div>
        </Box>
    );
}