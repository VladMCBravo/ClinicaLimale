// src/components/configuracoes/DadosClinicaTab.jsx
import React, { useState } from 'react';
import { 
    Box, Typography, TextField, Button, Grid, Divider, Alert, InputAdornment 
} from '@mui/material';
import { Save, GpsFixed, LocationCity, Business } from '@mui/icons-material';

export default function DadosClinicaTab() {
    // Estado inicial. Em breve você preencherá isso fazendo um GET no seu backend
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
        // Dados de Geofencing para o Ponto
        raio_metros: 150,
        latitude: '',
        longitude: ''
    });

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
            }, () => {
                alert("Erro ao capturar GPS. Verifique as permissões do navegador.");
            });
        }
    };

    const handleSave = () => {
        // Futura requisição PUT/POST para o backend salvar os dados da clínica
        console.log("Dados a salvar:", clinica);
        alert("Em breve: Dados salvos no banco de dados!");
    };

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

            {/* SEÇÃO DO GEOFENCING (PONTO ELETRÔNICO) */}
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
                    <TextField fullWidth label="Latitude (Central)" name="latitude" value={clinica.latitude} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Longitude (Central)" name="longitude" value={clinica.longitude} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={2}>
                    <Button variant="outlined" color="secondary" fullWidth sx={{ height: '56px' }} onClick={capturarGPSAtual} startIcon={<GpsFixed />}>
                        Pegar GPS
                    </Button>
                </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" color="primary" size="large" startIcon={<Save />} onClick={handleSave}>
                    Salvar Dados da Clínica
                </Button>
            </Box>
        </Box>
    );
}