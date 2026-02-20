// src/components/configuracoes/MeuPerfilTab.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Tabs, Tab, Grid, TextField, Button, 
    CircularProgress, Alert, InputAdornment, IconButton, Divider, Chip
} from '@mui/material';
import { 
    Person, LocationOn, Security, Visibility, VisibilityOff, CloudUpload, CheckCircle
} from '@mui/icons-material';

function TabPanel({ children, value, index, ...other }) {
    return (
        <div role="tabpanel" hidden={value !== index} {...other} style={{ width: '100%' }}>
            {value === index && <Box sx={{ py: 3, px: 2 }}>{children}</Box>}
        </div>
    );
}

export default function MeuPerfilTab() {
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [savingInfo, setSavingInfo] = useState(false);
    const [uploadingCert, setUploadingCert] = useState(false);
    const [feedback, setFeedback] = useState({ show: false, message: '', type: 'success' });

    const [perfil, setPerfil] = useState({
        first_name: '', last_name: '', telefone: '',
        logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '',
        cargo: '', crm: ''
    });

    const [certStatus, setCertStatus] = useState(null);
    const [certFile, setCertFile] = useState(null);
    const [certSenha, setCertSenha] = useState('');
    const [showSenha, setShowSenha] = useState(false);

    const token = localStorage.getItem('token'); 
    const API_URL = 'http://localhost:8000/api'; 

    useEffect(() => {
        carregarDadosPerfil();
    }, []);

    const carregarDadosPerfil = async () => {
        try {
            const res = await fetch(`${API_URL}/usuarios/me/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPerfil(prev => ({ ...prev, ...data }));
                if (data.certificado_detalhes) setCertStatus(data.certificado_detalhes);
            }
        } catch (error) {
            mostrarFeedback('Erro ao carregar dados do perfil.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => setPerfil({ ...perfil, [e.target.name]: e.target.value });

    const mostrarFeedback = (message, type = 'success') => {
        setFeedback({ show: true, message, type });
        setTimeout(() => setFeedback({ show: false, message: '', type: 'success' }), 5000);
    };

    const buscarCep = async () => {
        const cepLimpo = perfil.cep.replace(/\D/g, '');
        if (cepLimpo.length !== 8) return;
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await res.json();
            if (!data.erro) {
                setPerfil(prev => ({ ...prev, logradouro: data.logradouro, bairro: data.bairro, cidade: data.localidade, uf: data.uf }));
            }
        } catch (error) { console.error("Erro ao buscar CEP", error); }
    };

    const handleSalvarPerfil = async (e) => {
        e.preventDefault();
        setSavingInfo(true);
        try {
            const payload = {
                first_name: perfil.first_name, last_name: perfil.last_name, telefone: perfil.telefone,
                logradouro: perfil.logradouro, numero: perfil.numero, complemento: perfil.complemento,
                bairro: perfil.bairro, cidade: perfil.cidade, uf: perfil.uf, cep: perfil.cep
            };
            const res = await fetch(`${API_URL}/usuarios/me/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) mostrarFeedback('Perfil atualizado com sucesso!');
            else mostrarFeedback('Erro ao atualizar perfil.', 'error');
        } catch (error) { mostrarFeedback('Erro de conexão.', 'error'); } 
        finally { setSavingInfo(false); }
    };

    const handleUploadCertificado = async (e) => {
        e.preventDefault();
        if (!certFile || !certSenha) return mostrarFeedback('Selecione arquivo e senha.', 'error');
        
        setUploadingCert(true);
        const formData = new FormData();
        formData.append('arquivo_p12', certFile);
        formData.append('senha', certSenha);

        try {
            const res = await fetch(`${API_URL}/usuarios/me/certificado/`, {
                method: 'POST',
                headers: { 'Authorization': `Token ${token}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                mostrarFeedback('Certificado validado com sucesso!');
                setCertFile(null); setCertSenha('');
                carregarDadosPerfil();
            } else mostrarFeedback(data.detail || 'Senha ou arquivo inválido.', 'error');
        } catch (error) { mostrarFeedback('Erro ao enviar.', 'error'); } 
        finally { setUploadingCert(false); }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

    return (
        <Box>
            {feedback.show && <Alert severity={feedback.type} sx={{ mb: 2 }}>{feedback.message}</Alert>}
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={tab} onChange={(e, v) => setTab(v)} textColor="primary" indicatorColor="primary">
                    <Tab icon={<Person sx={{mr:1, mb:0}}/>} iconPosition="start" label="Dados Pessoais" />
                    <Tab icon={<LocationOn sx={{mr:1, mb:0}}/>} iconPosition="start" label="Endereço" />
                    {perfil.cargo === 'medico' && <Tab icon={<Security sx={{mr:1, mb:0}}/>} iconPosition="start" label="Assinatura Digital" />}
                </Tabs>
            </Box>

            <TabPanel value={tab} index={0}>
                <form onSubmit={handleSalvarPerfil}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}><TextField fullWidth label="Nome" name="first_name" value={perfil.first_name || ''} onChange={handleChange} required /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth label="Sobrenome" name="last_name" value={perfil.last_name || ''} onChange={handleChange} required /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth label="Telefone" name="telefone" value={perfil.telefone || ''} onChange={handleChange} /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth label="Cargo" value={(perfil.cargo || '').toUpperCase()} disabled /></Grid>
                        {perfil.cargo === 'medico' && <Grid item xs={12} sm={6}><TextField fullWidth label="CRM" value={perfil.crm || 'Não informado'} disabled /></Grid>}
                    </Grid>
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="submit" variant="contained" disabled={savingInfo}>{savingInfo ? <CircularProgress size={24} /> : 'Salvar Alterações'}</Button>
                    </Box>
                </form>
            </TabPanel>

            <TabPanel value={tab} index={1}>
                <form onSubmit={handleSalvarPerfil}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}><TextField fullWidth label="CEP" name="cep" value={perfil.cep || ''} onChange={handleChange} onBlur={buscarCep} /></Grid>
                        <Grid item xs={12} sm={8}><TextField fullWidth label="Logradouro" name="logradouro" value={perfil.logradouro || ''} onChange={handleChange} /></Grid>
                        <Grid item xs={12} sm={4}><TextField fullWidth label="Número" name="numero" value={perfil.numero || ''} onChange={handleChange} /></Grid>
                        <Grid item xs={12} sm={8}><TextField fullWidth label="Complemento" name="complemento" value={perfil.complemento || ''} onChange={handleChange} /></Grid>
                        <Grid item xs={12} sm={5}><TextField fullWidth label="Bairro" name="bairro" value={perfil.bairro || ''} onChange={handleChange} /></Grid>
                        <Grid item xs={12} sm={5}><TextField fullWidth label="Cidade" name="cidade" value={perfil.cidade || ''} onChange={handleChange} /></Grid>
                        <Grid item xs={12} sm={2}><TextField fullWidth label="UF" name="uf" value={perfil.uf || ''} onChange={handleChange} /></Grid>
                    </Grid>
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="submit" variant="contained" disabled={savingInfo}>{savingInfo ? <CircularProgress size={24} /> : 'Salvar Endereço'}</Button>
                    </Box>
                </form>
            </TabPanel>

            {perfil.cargo === 'medico' && (
                <TabPanel value={tab} index={2}>
                    <Box sx={{ p: 2, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#f8f9fa' }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Status da Assinatura Digital</Typography>
                        {certStatus?.possui_arquivo ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {certStatus.expirado ? <Chip color="error" label="Certificado Expirado" /> : <><CheckCircle color="success" /><Typography variant="body2" sx={{ color: 'success.main' }}>Válido (Expira em {certStatus.dias_para_expirar} dias)</Typography></>}
                            </Box>
                        ) : <Typography variant="body2" color="text.secondary">Nenhum certificado configurado.</Typography>}
                    </Box>
                    <Divider sx={{ mb: 3 }} />
                    <form onSubmit={handleUploadCertificado}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6}>
                                <Button variant="outlined" component="label" fullWidth startIcon={<CloudUpload />} sx={{ height: '56px' }}>
                                    {certFile ? certFile.name : 'Selecionar .p12'}
                                    <input type="file" hidden accept=".p12,.pfx" onChange={(e) => setCertFile(e.target.files[0])} />
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField 
                                    fullWidth label="Senha do Certificado" type={showSenha ? "text" : "password"} 
                                    value={certSenha} onChange={(e) => setCertSenha(e.target.value)} required
                                    InputProps={{ endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowSenha(!showSenha)} edge="end">{showSenha ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>) }}
                                />
                            </Grid>
                        </Grid>
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button type="submit" variant="contained" disabled={uploadingCert}>{uploadingCert ? <CircularProgress size={24} /> : 'Validar e Salvar Certificado'}</Button>
                        </Box>
                    </form>
                </TabPanel>
            )}
        </Box>
    );
}