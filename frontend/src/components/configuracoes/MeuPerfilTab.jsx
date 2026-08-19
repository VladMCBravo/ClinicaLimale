// src/components/configuracoes/MeuPerfilTab.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Tabs, Tab, Grid, TextField, Button, 
    CircularProgress, Alert, InputAdornment, IconButton, Divider, Chip
} from '@mui/material';
import { 
    Person, LocationOn, Security, Visibility, VisibilityOff, CloudUpload, CheckCircle, Lock
} from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';

function TabPanel({ children, value, index, ...other }) {
    return (
        <div role="tabpanel" hidden={value !== index} {...other} style={{ width: '100%' }}>
            {value === index && <Box sx={{ py: 1.5, px: 2 }}>{children}</Box>}
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
        cargo: '', crm: '', pin_ponto: '', medico_especialidades: [],
        password: '' // <-- ADICIONADO: controle da nova senha
    });

    const [certStatus, setCertStatus] = useState(false);
    const [certFile, setCertFile] = useState(null);
    const [certSenha, setCertSenha] = useState('');
    const [showSenha, setShowSenha] = useState(false);
    const [showPin, setShowPin] = useState(false); 

    useEffect(() => {
        carregarDadosPerfil();
    }, []);

    const carregarDadosPerfil = async () => {
        try {
            const res = await apiClient.get('/usuarios/me/');
            setPerfil({
                ...res.data,
                pin_ponto: res.data.pin_ponto || '',
                password: '', // Reseta a senha ao carregar
                medico_especialidades: res.data.medico_especialidades || [] 
            });
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
                    ...prev, logradouro: data.logradouro, bairro: data.bairro,
                    cidade: data.localidade, uf: data.uf
                }));
            }
        } catch (error) { console.error("Erro no CEP"); }
    };

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
                cep: perfil.cep,
                pin_ponto: perfil.pin_ponto 
            };
            
            // Só envia a senha de login se o usuário tiver digitado uma nova
            if (perfil.password) {
                payload.password = perfil.password;
            }
            
            await apiClient.patch('/usuarios/me/', payload);
            mostrarFeedback('Informações atualizadas com sucesso!');
            
            // Limpa o campo de senha da tela por segurança após salvar
            setPerfil(prev => ({ ...prev, password: '' }));
        } catch (error) {
            mostrarFeedback('Erro ao atualizar perfil.', 'error');
        } finally {
            setSavingInfo(false);
        }
    };

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
            await apiClient.post('/usuarios/me/certificado/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            mostrarFeedback('Certificado validado com sucesso!');
            setCertFile(null); 
            setCertSenha('');
            carregarDadosPerfil();
        } catch (error) { 
            const msg = error.response?.data?.detail || 'Senha ou arquivo inválido.';
            mostrarFeedback(msg, 'error'); 
        } finally { 
            setUploadingCert(false); 
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

    const gridTamanho = perfil.cargo === 'medico' ? 4 : 6;

    return (
        <Box>
            {feedback.show && <Alert severity={feedback.type} sx={{ mb: 1.5, py: 0 }}>{feedback.message}</Alert>}
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
                <Tabs value={tab} onChange={(e, v) => setTab(v)} textColor="primary" indicatorColor="primary" sx={{ minHeight: 40 }}>
                    <Tab icon={<Person sx={{mr:1, mb:0}}/>} iconPosition="start" label="Dados Pessoais" sx={{ minHeight: 40 }} />
                    <Tab icon={<LocationOn sx={{mr:1, mb:0}}/>} iconPosition="start" label="Endereço" sx={{ minHeight: 40 }} />
                    <Tab icon={<Lock sx={{mr:1, mb:0}}/>} iconPosition="start" label="Segurança e Acesso" sx={{ minHeight: 40 }} />
                    {perfil.cargo === 'medico' && <Tab icon={<Security sx={{mr:1, mb:0}}/>} iconPosition="start" label="Assinatura Digital" sx={{ minHeight: 40 }} />}
                </Tabs>
            </Box>

            {/* ABA 0: DADOS PESSOAIS */}
            <TabPanel value={tab} index={0}>
                <form onSubmit={handleSalvarPerfil}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Nome" name="first_name" value={perfil.first_name || ''} onChange={handleChange} required /></Grid>
                        <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Sobrenome" name="last_name" value={perfil.last_name || ''} onChange={handleChange} required /></Grid>
                        
                        <Grid item xs={12} sm={gridTamanho}><TextField size="small" fullWidth label="Telefone" name="telefone" value={perfil.telefone || ''} onChange={handleChange} /></Grid>
                        <Grid item xs={12} sm={gridTamanho}><TextField size="small" fullWidth label="Cargo" value={(perfil.cargo || '').toUpperCase()} disabled /></Grid>
                        {perfil.cargo === 'medico' && <Grid item xs={12} sm={gridTamanho}><TextField size="small" fullWidth label="CRM" value={perfil.crm || 'Não informado'} disabled /></Grid>}

                        {perfil.cargo === 'medico' && perfil.medico_especialidades.length > 0 && (
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, color: 'text.secondary' }}>Minhas Especialidades / RQEs</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {perfil.medico_especialidades.map((item, idx) => (
                                        <Chip 
                                            key={idx} color="primary" variant="outlined" 
                                            label={`${item.especialidade_nome || 'Especialidade'} ${item.rqe ? ` - RQE: ${item.rqe}` : ''}`} 
                                        />
                                    ))}
                                </Box>
                                <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5, display: 'block' }}>
                                    *A alteração de especialidades é gerida pela administração.
                                </Typography>
                            </Grid>
                        )}
                    </Grid>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="submit" variant="contained" size="small" disabled={savingInfo}>{savingInfo ? <CircularProgress size={20} /> : 'Salvar Dados'}</Button>
                    </Box>
                </form>
            </TabPanel>

            {/* ABA 1: ENDEREÇO */}
            <TabPanel value={tab} index={1}>
                <form onSubmit={handleSalvarPerfil}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={3}><TextField size="small" fullWidth label="CEP" name="cep" value={perfil.cep || ''} onChange={handleChange} onBlur={buscarCep} /></Grid>
                        <Grid item xs={12} sm={7}><TextField size="small" fullWidth label="Logradouro" name="logradouro" value={perfil.logradouro || ''} onChange={handleChange} /></Grid>
                        <Grid item xs={12} sm={2}><TextField size="small" fullWidth label="Número" name="numero" value={perfil.numero || ''} onChange={handleChange} /></Grid>
                        <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Complemento" name="complemento" value={perfil.complemento || ''} onChange={handleChange} /></Grid>
                        <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Bairro" name="bairro" value={perfil.bairro || ''} onChange={handleChange} /></Grid>
                        <Grid item xs={12} sm={9}><TextField size="small" fullWidth label="Cidade" name="cidade" value={perfil.cidade || ''} onChange={handleChange} /></Grid>
                        <Grid item xs={12} sm={3}><TextField size="small" fullWidth label="UF" name="uf" value={perfil.uf || ''} onChange={handleChange} /></Grid>
                    </Grid>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="submit" variant="contained" size="small" disabled={savingInfo}>{savingInfo ? <CircularProgress size={20} /> : 'Salvar Endereço'}</Button>
                    </Box>
                </form>
            </TabPanel>

            {/* ABA 2: SEGURANÇA E ACESSO (NOVA ABA) */}
            <TabPanel value={tab} index={2}>
                <form onSubmit={handleSalvarPerfil}>
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Senha de Acesso ao Sistema</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Esta é a senha utilizada para entrar no sistema com o seu usuário ({perfil.username}).
                            </Typography>
                            <TextField 
                                size="small" fullWidth label="Nova Senha de Login" name="password" 
                                type={showSenha ? "text" : "password"} 
                                value={perfil.password || ''} onChange={handleChange} 
                                placeholder="Deixe em branco para manter a atual"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setShowSenha(!showSenha)} edge="end">
                                                {showSenha ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>PIN do Ponto Eletrônico</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Código numérico utilizado exclusivamente para registrar entradas e saídas no relógio de ponto.
                            </Typography>
                            <TextField 
                                size="small" fullWidth label="PIN (4 a 6 dígitos)" name="pin_ponto" 
                                type={showPin ? "text" : "password"} 
                                value={perfil.pin_ponto || ''} onChange={handleChange} 
                                inputProps={{ maxLength: 6 }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setShowPin(!showPin)} edge="end">
                                                {showPin ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="submit" variant="contained" size="small" disabled={savingInfo}>{savingInfo ? <CircularProgress size={20} /> : 'Salvar Credenciais'}</Button>
                    </Box>
                </form>
            </TabPanel>

            {/* ABA 3: ASSINATURA DIGITAL (MUDOU O INDEX DE 2 PARA 3) */}
            {perfil.cargo === 'medico' && (
                <TabPanel value={tab} index={3}>
                    <Box sx={{ p: 1.5, mb: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#f8f9fa' }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 'bold' }}>Status da Assinatura Digital</Typography>
                        {certStatus ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckCircle color="success" fontSize="small" />
                                <Typography variant="body2" sx={{ color: 'success.main' }}>
                                    Certificado salvo no sistema. Teste abaixo para validar a assinatura.
                                </Typography>
                            </Box>
                        ) : (
                            <Typography variant="body2" color="text.secondary">Nenhum certificado configurado.</Typography>
                        )}
                    </Box>

                    {certStatus && (
                        <Box sx={{ mb: 2, p: 1.5, border: '1px dashed #4CAF50', borderRadius: 2, textAlign: 'center', bgcolor: '#f1f8e9' }}>
                            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 500 }}>
                                Deseja confirmar se sua senha e arquivo estão prontos para uso?
                            </Typography>
                            <Button 
                                variant="outlined" color="success" size="small"
                                startIcon={testingCert ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
                                onClick={handleTestarAssinatura} disabled={testingCert} sx={{ fontWeight: 'bold' }}
                            >
                                {testingCert ? 'Verificando...' : 'Testar Assinatura Agora'}
                            </Button>
                        </Box>
                    )}

                    {!certStatus && <Divider sx={{ mb: 2 }} />}

                    <form onSubmit={handleUploadCertificado}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6}>
                                <Button variant="outlined" component="label" fullWidth size="small" startIcon={<CloudUpload />} sx={{ height: '40px' }}>
                                    {certFile ? certFile.name : 'Selecionar .p12'}
                                    <input type="file" hidden accept=".p12,.pfx" onChange={(e) => setCertFile(e.target.files[0])} />
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField 
                                    size="small" fullWidth label="Senha do Certificado" type={showSenha ? "text" : "password"} 
                                    value={certSenha} onChange={(e) => setCertSenha(e.target.value)} required
                                    InputProps={{ endAdornment: (<InputAdornment position="end"><IconButton size="small" onClick={() => setShowSenha(!showSenha)} edge="end">{showSenha ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>) }}
                                />
                            </Grid>
                        </Grid>
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button type="submit" variant="contained" size="small" disabled={uploadingCert}>{uploadingCert ? <CircularProgress size={20} /> : 'Validar e Salvar Certificado'}</Button>
                        </Box>
                    </form>
                </TabPanel>
            )}
        </Box>
    );
}