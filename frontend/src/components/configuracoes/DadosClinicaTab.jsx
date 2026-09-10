// src/components/configuracoes/DadosClinicaTab.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, TextField, Button, Grid, Alert, InputAdornment, CircularProgress,
    FormGroup, FormControlLabel, Checkbox, Typography
} from '@mui/material';
import { Save, GpsFixed } from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext'; 

// Importante: certifique-se de que o atendimento.css está importado no app
import '../../atendimento.css';

export default function DadosClinicaTab() {
    const { showSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [clinica, setClinica] = useState({
        razao_social: '', nome_fantasia: '', cnpj: '', inscricao_estadual: '',
        telefone: '', email: '', cep: '', logradouro: '', numero: '',
        bairro: '', cidade: '', uf: '', raio_metros: 150, latitude: '', longitude: '',
        recepcao_ve_equipe: false, recepcao_ve_clinica: false, recepcao_ve_financeiro: false
    });

    useEffect(() => { carregarDados(); }, []);

    const carregarDados = async () => {
        try {
            const response = await apiClient.get('/usuarios/clinica/configuracao/');
            const data = response.data;
            setClinica(prev => ({
                ...prev,
                ...data,
                raio_metros: data.raio_metros || 150,
                recepcao_ve_equipe: data.recepcao_ve_equipe || false,
                recepcao_ve_clinica: data.recepcao_ve_clinica || false,
                recepcao_ve_financeiro: data.recepcao_ve_financeiro || false
            }));
        } catch (error) {
            showSnackbar('Erro ao carregar as configurações da clínica.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setClinica({ ...clinica, [e.target.name]: e.target.value });
    };

    const capturarGPSAtual = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setClinica({
                    ...clinica,
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                });
                showSnackbar("Coordenadas capturadas! Clique em salvar.", "info");
            }, () => {
                showSnackbar("Erro ao capturar GPS. Verifique as permissões do navegador.", "error");
            });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiClient.patch('/usuarios/clinica/configuracao/', clinica);
            showSnackbar('Dados da clínica salvos com sucesso!', 'success');
        } catch (error) {
            showSnackbar('Erro ao salvar os dados da clínica.', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box className="tasy-flat-panel" sx={{ p: 3 }}>
            
            {/* SEÇÃO 1: DADOS CADASTRAIS */}
            <div className="tasy-section-header">Dados Cadastrais da Clínica</div>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} md={6}><TextField className="tasy-compact-input" fullWidth label="Razão Social" name="razao_social" value={clinica.razao_social || ''} onChange={handleChange} /></Grid>
                <Grid item xs={12} md={6}><TextField className="tasy-compact-input" fullWidth label="Nome Fantasia" name="nome_fantasia" value={clinica.nome_fantasia || ''} onChange={handleChange} /></Grid>
                <Grid item xs={12} md={4}><TextField className="tasy-compact-input" fullWidth label="CNPJ" name="cnpj" value={clinica.cnpj || ''} onChange={handleChange} /></Grid>
                <Grid item xs={12} md={4}><TextField className="tasy-compact-input" fullWidth label="Inscrição Estadual" name="inscricao_estadual" value={clinica.inscricao_estadual || ''} onChange={handleChange} /></Grid>
                <Grid item xs={12} md={4}><TextField className="tasy-compact-input" fullWidth label="Telefone Principal" name="telefone" value={clinica.telefone || ''} onChange={handleChange} /></Grid>
            </Grid>

            {/* SEÇÃO 2: ENDEREÇO */}
            <div className="tasy-section-header">Endereço e Localização</div>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} md={2}><TextField className="tasy-compact-input" fullWidth label="CEP" name="cep" value={clinica.cep || ''} onChange={handleChange} /></Grid>
                <Grid item xs={12} md={8}><TextField className="tasy-compact-input" fullWidth label="Logradouro" name="logradouro" value={clinica.logradouro || ''} onChange={handleChange} /></Grid>
                <Grid item xs={12} md={2}><TextField className="tasy-compact-input" fullWidth label="Número" name="numero" value={clinica.numero || ''} onChange={handleChange} /></Grid>
                <Grid item xs={12} md={5}><TextField className="tasy-compact-input" fullWidth label="Bairro" name="bairro" value={clinica.bairro || ''} onChange={handleChange} /></Grid>
                <Grid item xs={12} md={5}><TextField className="tasy-compact-input" fullWidth label="Cidade" name="cidade" value={clinica.cidade || ''} onChange={handleChange} /></Grid>
                <Grid item xs={12} md={2}><TextField className="tasy-compact-input" fullWidth label="UF" name="uf" value={clinica.uf || ''} onChange={handleChange} /></Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 2 }}>
                {/* SEÇÃO 3: PONTO ELETRÔNICO (GPS) */}
                <Grid item xs={12} md={6}>
                    <div className="tasy-section-header">Ponto Eletrônico (Geolocalização)</div>
                    <Typography variant="body2" sx={{ color: '#6c757d', mb: 2 }}>
                        Defina as coordenadas centrais e o raio de tolerância onde os colaboradores têm permissão para registrar o ponto pelo aplicativo.
                    </Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={4}>
                            <TextField 
                                className="tasy-compact-input" fullWidth label="Raio (Tolerância)" type="number" 
                                name="raio_metros" value={clinica.raio_metros || ''} onChange={handleChange}
                                InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}><TextField className="tasy-compact-input" fullWidth label="Latitude" name="latitude" type="number" value={clinica.latitude || ''} onChange={handleChange} /></Grid>
                        <Grid item xs={12} sm={4}><TextField className="tasy-compact-input" fullWidth label="Longitude" name="longitude" type="number" value={clinica.longitude || ''} onChange={handleChange} /></Grid>
                    </Grid>
                    <Button variant="outlined" disableElevation size="small" sx={{ mt: 2, color: '#495057', borderColor: '#ced4da' }} onClick={capturarGPSAtual} startIcon={<GpsFixed />}>
                        Capturar Coordenadas Atuais
                    </Button>
                </Grid>

                {/* SEÇÃO 4: PERMISSÕES DA RECEPÇÃO */}
                <Grid item xs={12} md={6}>
                    <div className="tasy-section-header">Permissões de Acesso (Recepção)</div>
                    <Typography variant="body2" sx={{ color: '#6c757d', mb: 2 }}>
                        Selecione as áreas do menu de Configurações que os usuários com perfil de Recepção podem visualizar e gerenciar.
                    </Typography>
                    <Box sx={{ border: '1px solid #e9ecef', borderRadius: 1, p: 1, bgcolor: '#f8f9fa' }}>
                        <FormGroup>
                            <FormControlLabel 
                                control={<Checkbox size="small" checked={clinica.recepcao_ve_equipe} onChange={(e) => setClinica({...clinica, recepcao_ve_equipe: e.target.checked})} />} 
                                label={<Typography variant="body2" sx={{ color: '#495057' }}>Aba Equipe (Usuários e Ponto)</Typography>} 
                            />
                            <FormControlLabel 
                                control={<Checkbox size="small" checked={clinica.recepcao_ve_clinica} onChange={(e) => setClinica({...clinica, recepcao_ve_clinica: e.target.checked})} />} 
                                label={<Typography variant="body2" sx={{ color: '#495057' }}>Aba Clínica (Dados e Estrutura)</Typography>} 
                            />
                            <FormControlLabel 
                                control={<Checkbox size="small" checked={clinica.recepcao_ve_financeiro} onChange={(e) => setClinica({...clinica, recepcao_ve_financeiro: e.target.checked})} />} 
                                label={<Typography variant="body2" sx={{ color: '#495057' }}>Aba Financeiro (Categorias)</Typography>} 
                            />
                        </FormGroup>
                    </Box>
                </Grid>
            </Grid>

            {/* AÇÕES */}
            <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" disableElevation sx={{ bgcolor: '#1c7ed6' }} startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />} onClick={handleSave} disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
            </Box>
        </Box>
    );
}