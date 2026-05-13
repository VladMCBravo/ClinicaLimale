// src/components/configuracoes/MeuPerfilTab.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Tabs, Tab, Grid, TextField, Button, 
    CircularProgress, Alert, InputAdornment, IconButton, Divider, Chip
} from '@mui/material';
import { 
    Person, LocationOn, Security, Visibility, VisibilityOff, CloudUpload, CheckCircle
} from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';

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
    const [testingCert, setTestingCert] = useState(false);
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

    const token = sessionStorage.getItem('authToken'); // Troque localStorage por sessionStorage
    const API_URL = 'http://localhost:8000/api'; 

    useEffect(() => {
        carregarDadosPerfil();
    }, []);

    const carregarDadosPerfil = async () => {
        try {
            const res = await apiClient.get('/usuarios/me/'); 
            setPerfil(res.data);
            // CORREÇÃO AQUI: Lendo a variável exata que o backend envia
            setCertStatus(res.data.tem_certificado_valido); 
        } catch (error) {
            mostrarFeedback('Erro ao carregar perfil.', 'error');
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
    const cepLimpo = perfil.cep?.replace(/[^0-9]/g, '');
    if (cepLimpo?.length !== 8) return;
    
    try {
        const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await res.json();
        if (!data.erro) {
            setPerfil(prev => ({
                ...prev,
                logradouro: data.logradouro,
                bairro: data.bairro,
                cidade: data.localidade,
                uf: data.uf
            }));
        }
    } catch (error) { console.error("Erro no CEP"); }
};

// E o handleSalvarPerfil para usar o apiClient:
const handleSalvarPerfil = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
        const payload = {
            first_name: perfil.first_name, 
            last_name: perfil.last_name, 
            telefone: perfil.telefone,
            logradouro: perfil.logradouro, 
            numero: perfil.numero, 
            complemento: perfil.complemento,
            bairro: perfil.bairro, 
            cidade: perfil.cidade, 
            uf: perfil.uf, 
            cep: perfil.cep
        };
        // O apiClient já tem o Token e a BASE_URL configurados
        await apiClient.patch('/usuarios/me/', payload);
        mostrarFeedback('Perfil atualizado com sucesso!');
    } catch (error) {
        mostrarFeedback('Erro ao atualizar perfil.', 'error');
    } finally {
        setSavingInfo(false);
    }
};

// E esta função de teste:
const handleTestarAssinatura = async () => {
    setTestingCert(true);
    try {
        const res = await apiClient.get('/usuarios/me/certificado/verificar/');
        mostrarFeedback(res.data.detail, 'success');
    } catch (error) {
        const msg = error.response?.data?.detail || 'Erro ao validar certificado.';
        mostrarFeedback(msg, 'error');
    } finally {
        setTestingCert(false);
    }
};

    const handleUploadCertificado = async (e) => {
        e.preventDefault();
        if (!certFile || !certSenha) return mostrarFeedback('Selecione arquivo e senha.', 'error');
        
        setUploadingCert(true);
        const formData = new FormData();
        formData.append('arquivo_p12', certFile);
        formData.append('senha', certSenha);

        try {
            // Usando o apiClient! Ele já coloca o Token e aponta para a URL base correta
            const res = await apiClient.post('/usuarios/me/certificado/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            mostrarFeedback('Certificado validado com sucesso!');
            setCertFile(null); 
            setCertSenha('');
            carregarDadosPerfil(); // Recarrega para atualizar o status para true
            
        } catch (error) { 
            // Captura o erro customizado do backend
            const msg = error.response?.data?.detail || 'Senha ou arquivo inválido.';
            mostrarFeedback(msg, 'error'); 
        } finally { 
            setUploadingCert(false); 
        }
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

            {/* --- ABA 3: SEGURANÇA E ASSINATURA (SÓ PARA MÉDICOS) --- */}
            {perfil.cargo === 'medico' && (
                <TabPanel value={tab} index={2}>
                    {/* Quadro de Status Atual */}
                    <Box sx={{ p: 2, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#f8f9fa' }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Status da Assinatura Digital</Typography>
                        {certStatus ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckCircle color="success" />
                                <Typography variant="body2" sx={{ color: 'success.main' }}>
                                    Certificado salvo no sistema. Teste abaixo para validar a assinatura.
                                </Typography>
                            </Box>
                        ) : (
                            <Typography variant="body2" color="text.secondary">Nenhum certificado configurado.</Typography>
                        )}
                    </Box>

                    {/* Bloco de Teste (Mostra se o certStatus for true) */}
                    {certStatus && (
                        <Box sx={{ mb: 3, p: 2, border: '1px dashed #4CAF50', borderRadius: 2, textAlign: 'center', bgcolor: '#f1f8e9' }}>
                            <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary', fontWeight: 500 }}>
                                Deseja confirmar se sua senha e arquivo estão prontos para uso?
                            </Typography>
                            <Button 
                                variant="outlined" 
                                color="success" 
                                size="small"
                                startIcon={testingCert ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
                                onClick={handleTestarAssinatura}
                                disabled={testingCert}
                                sx={{ fontWeight: 'bold' }}
                            >
                                {testingCert ? 'Verificando...' : 'Testar Assinatura Agora'}
                            </Button>
                        </Box>
                    )}
                    {/* >>> FIM DO BLOCO DE TESTE <<< */}

                    <Divider sx={{ mb: 3 }} />

                    {/* Formulário de Upload (Já existe abaixo) */}
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