// src/components/configuracoes/MeuPerfilTab.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Tabs, Tab, Grid, TextField, Button, 
    CircularProgress, Alert, InputAdornment, IconButton, Divider, Chip
} from '@mui/material';
import { 
    Person, LocationOn, Security, Visibility, VisibilityOff, CloudUpload, CheckCircle, Lock, Fingerprint
} from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';

function TabPanel({ children, value, index, ...other }) {
    return (
        <div role="tabpanel" hidden={value !== index} {...other} style={{ width: '100%' }}>
            {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
        </div>
    );
}

export default function MeuPerfilTab() {
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [savingInfo, setSavingInfo] = useState(false);
    const [testingCert, setTestingCert] = useState(false);
    const [uploadingCert, setUploadingCert] = useState(false);
    const [feedback, setFeedback] = useState({ show: false, message: '', type: 'success' });

    const [perfil, setPerfil] = useState({
        first_name: '', last_name: '', telefone: '', username: '',
        logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '',
        cargo: '', crm: '', medico_especialidades: [], password: '' 
    });

    const [certStatus, setCertStatus] = useState(false);
    const [certFile, setCertFile] = useState(null);
    const [certSenha, setCertSenha] = useState('');
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
            setCertStatus(res.data.tem_certificado_valido); 
        } catch (error) { mostrarFeedback('Erro ao carregar perfil.', 'error'); } 
        finally { setLoading(false); }
    };

    const handleChange = (e) => setPerfil({ ...perfil, [e.target.name]: e.target.value });
    const mostrarFeedback = (message, type = 'success') => {
        setFeedback({ show: true, message, type });
        setTimeout(() => setFeedback({ show: false, message: '', type: 'success' }), 5000);
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
        <Box className="tasy-workspace">
            {feedback.show && <Alert severity={feedback.type} sx={{ mb: 1.5, py: 0 }}>{feedback.message}</Alert>}
            
            <div className="tasy-flat-panel">
                <Box sx={{ borderBottom: 1, borderColor: '#e9ecef', bgcolor: '#f8f9fa' }}>
                    <Tabs value={tab} onChange={(e, v) => setTab(v)} textColor="primary" indicatorColor="primary" sx={{ minHeight: 40 }}>
                        <Tab icon={<Person sx={{mr:1, mb:0}}/>} iconPosition="start" label="Pessoais" sx={{ minHeight: 40, fontSize: '13px' }} />
                        <Tab icon={<LocationOn sx={{mr:1, mb:0}}/>} iconPosition="start" label="Endereço" sx={{ minHeight: 40, fontSize: '13px' }} />
                        <Tab icon={<Lock sx={{mr:1, mb:0}}/>} iconPosition="start" label="Acesso" sx={{ minHeight: 40, fontSize: '13px' }} />
                        {perfil.cargo === 'medico' && <Tab icon={<Security sx={{mr:1, mb:0}}/>} iconPosition="start" label="Assinatura" sx={{ minHeight: 40, fontSize: '13px' }} />}
                    </Tabs>
                </Box>

                <Box sx={{ p: 2 }}>
                    {/* ABA 0 E 1 CONTINUAM IGUAIS... OMITIDO PARA ENCURTAR A RESPOSTA */}
                    <TabPanel value={tab} index={0}>
                        <form onSubmit={handleSalvarPerfil}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}><TextField className="tasy-compact-input" fullWidth label="Nome" name="first_name" value={perfil.first_name || ''} onChange={handleChange} required /></Grid>
                                <Grid item xs={12} sm={6}><TextField className="tasy-compact-input" fullWidth label="Sobrenome" name="last_name" value={perfil.last_name || ''} onChange={handleChange} required /></Grid>
                                <Grid item xs={12} sm={4}><TextField className="tasy-compact-input" fullWidth label="Telefone" name="telefone" value={perfil.telefone || ''} onChange={handleChange} /></Grid>
                                <Grid item xs={12} sm={4}><TextField className="tasy-compact-input" fullWidth label="Cargo" value={(perfil.cargo || '').toUpperCase()} disabled /></Grid>
                                {perfil.cargo === 'medico' && <Grid item xs={12} sm={4}><TextField className="tasy-compact-input" fullWidth label="CRM" value={perfil.crm || 'Não informado'} disabled /></Grid>}
                            </Grid>
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button type="submit" variant="contained" disableElevation size="small" sx={{bgcolor: '#1c7ed6'}} disabled={savingInfo}>{savingInfo ? 'Salvando...' : 'Salvar Dados'}</Button>
                            </Box>
                        </form>
                    </TabPanel>

                    <TabPanel value={tab} index={1}>
                        <form onSubmit={handleSalvarPerfil}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={3}><TextField className="tasy-compact-input" fullWidth label="CEP" name="cep" value={perfil.cep || ''} onChange={handleChange} /></Grid>
                                <Grid item xs={12} sm={7}><TextField className="tasy-compact-input" fullWidth label="Logradouro" name="logradouro" value={perfil.logradouro || ''} onChange={handleChange} /></Grid>
                                <Grid item xs={12} sm={2}><TextField className="tasy-compact-input" fullWidth label="Número" name="numero" value={perfil.numero || ''} onChange={handleChange} /></Grid>
                                <Grid item xs={12} sm={6}><TextField className="tasy-compact-input" fullWidth label="Complemento" name="complemento" value={perfil.complemento || ''} onChange={handleChange} /></Grid>
                                <Grid item xs={12} sm={6}><TextField className="tasy-compact-input" fullWidth label="Bairro" name="bairro" value={perfil.bairro || ''} onChange={handleChange} /></Grid>
                                <Grid item xs={12} sm={9}><TextField className="tasy-compact-input" fullWidth label="Cidade" name="cidade" value={perfil.cidade || ''} onChange={handleChange} /></Grid>
                                <Grid item xs={12} sm={3}><TextField className="tasy-compact-input" fullWidth label="UF" name="uf" value={perfil.uf || ''} onChange={handleChange} /></Grid>
                            </Grid>
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button type="submit" variant="contained" disableElevation size="small" sx={{bgcolor: '#1c7ed6'}} disabled={savingInfo}>{savingInfo ? 'Salvando...' : 'Salvar Endereço'}</Button>
                            </Box>
                        </form>
                    </TabPanel>

                    {/* ABA 2: SEGURANÇA E ACESSO ATUALIZADA (Sem PIN, Com Usuário) */}
                    <TabPanel value={tab} index={2}>
                        <form onSubmit={handleSalvarPerfil}>
                            <Grid container spacing={3}>
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
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, bgcolor: '#e7f5ff', borderLeft: '3px solid #1c7ed6', height: '100px' }}>
                                        <Fingerprint color="primary" fontSize="large" />
                                        <Typography variant="body2" sx={{ color: '#0b508a' }}>
                                            Para cadastrar ou atualizar sua biometria de acesso ao ponto eletrônico, por favor dirija-se à administração da clínica.
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button type="submit" variant="contained" disableElevation size="small" sx={{bgcolor: '#1c7ed6'}} disabled={savingInfo}>{savingInfo ? 'Salvando...' : 'Salvar Credenciais'}</Button>
                            </Box>
                        </form>
                    </TabPanel>

                    {/* ABA 3: ASSINATURA OMITIDA PARA ENCURTAR A RESPOSTA (Mas continua igual a anterior) */}
                    {perfil.cargo === 'medico' && (
                        <TabPanel value={tab} index={3}>
                           {/* ... Código da assinatura mantido ... */}
                        </TabPanel>
                    )}
                </Box>
            </div>
        </Box>
    );
}