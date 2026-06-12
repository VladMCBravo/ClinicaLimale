// src/components/configuracoes/DadosClinicaTab.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, TextField, Button, Grid, Divider, Alert, InputAdornment, CircularProgress
} from '@mui/material';
import { Save, GpsFixed, LocationCity, Business } from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext'; 

export default function DadosClinicaTab() {
    const { showSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [clinica, setClinica] = useState({
        razao_social: '',
        nome_fantasia: '',
        cnpj: '',
        inscricao_estadual: '',
        telefone: '',
        email: '',
        cep: '',
        logradouro: '',
        numero: '',
        bairro: '',
        cidade: '',
        uf: '',
        raio_metros: 150,
        latitude: '',
        longitude: ''
    });

    // 1. Busca os dados no backend ao abrir a tela
    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            const response = await apiClient.get('/usuarios/clinica/configuracao/');
            const data = response.data;
            // Atualiza o estado evitando nulls que quebram os inputs do React
            setClinica(prev => ({
                ...prev,
                ...data,
                razao_social: data.razao_social || '',
                nome_fantasia: data.nome_fantasia || '',
                cnpj: data.cnpj || '',
                latitude: data.latitude || '',
                longitude: data.longitude || '',
                raio_metros: data.raio_metros || 150
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

    // 2. Envia os dados para o backend via PATCH
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
        <Box>
            <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Business color="primary" /> Dados Cadastrais
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Razão Social" name="razao_social" value={clinica.razao_social} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Nome Fantasia" name="nome_fantasia" value={clinica.nome_fantasia} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={4}>
                    <TextField fullWidth label="CNPJ" name="cnpj" value={clinica.cnpj} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Inscrição Estadual" name="inscricao_estadual" value={clinica.inscricao_estadual} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Telefone Principal" name="telefone" value={clinica.telefone} onChange={handleChange} />
                </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationCity color="primary" /> Endereço e Localização
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} md={2}>
                    <TextField fullWidth label="CEP" name="cep" value={clinica.cep} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={8}>
                    <TextField fullWidth label="Logradouro" name="logradouro" value={clinica.logradouro} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={2}>
                    <TextField fullWidth label="Número" name="numero" value={clinica.numero} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={5}>
                    <TextField fullWidth label="Bairro" name="bairro" value={clinica.bairro} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={5}>
                    <TextField fullWidth label="Cidade" name="cidade" value={clinica.cidade} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={2}>
                    <TextField fullWidth label="UF" name="uf" value={clinica.uf} onChange={handleChange} />
                </Grid>
            </Grid>

            <Alert severity="info" sx={{ mb: 3 }}>
                <strong>Configuração do Ponto Eletrônico:</strong> Defina abaixo o raio de alcance em que seus funcionários têm permissão para bater o ponto via GPS.
            </Alert>
            
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                    <TextField 
                        fullWidth 
                        label="Raio Permitido (Tolerância)" 
                        type="number" 
                        name="raio_metros" 
                        value={clinica.raio_metros} 
                        onChange={handleChange}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">metros</InputAdornment>,
                        }}
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Latitude (Central)" name="latitude" type="number" value={clinica.latitude} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Longitude (Central)" name="longitude" type="number" value={clinica.longitude} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={2}>
                    <Button variant="outlined" color="secondary" fullWidth sx={{ height: '56px' }} onClick={capturarGPSAtual} startIcon={<GpsFixed />}>
                        Pegar GPS
                    </Button>
                </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" color="primary" size="large" startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />} onClick={handleSave} disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar Dados da Clínica'}
                </Button>
            </Box>
        </Box>
    );
}