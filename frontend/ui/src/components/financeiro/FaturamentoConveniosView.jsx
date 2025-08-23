// src/components/financeiro/FaturamentoConveniosView.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, CircularProgress, Typography, Paper, Grid, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function FaturamentoConveniosView() {
    // Estados para controlar o formulário e os dados
    const [convenios, setConvenios] = useState([]);
    const [selectedConvenio, setSelectedConvenio] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date()); // Usaremos um seletor de mês/ano
    const [agendamentosFaturaveis, setAgendamentosFaturaveis] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { showSnackbar } = useSnackbar();

    // Efeito para buscar a lista de todos os convênios para o seletor
    useEffect(() => {
        apiClient.get('/faturamento/convenios/')
            .then(response => {
                setConvenios(response.data);
            })
            .catch(error => {
                console.error("Erro ao buscar convênios:", error);
                showSnackbar("Não foi possível carregar a lista de convênios.", 'error');
            });
    }, [showSnackbar]);

    // Função para buscar os agendamentos faturáveis
    const handleBuscar = async () => {
        if (!selectedConvenio || !selectedDate) {
            showSnackbar("Por favor, selecione um convênio e um mês/ano.", 'warning');
            return;
        }
        
        setIsLoading(true);
        setAgendamentosFaturaveis([]); // Limpa a lista anterior
        
        const mes = selectedDate.getMonth() + 1; // JS os meses são de 0-11
        const ano = selectedDate.getFullYear();

        try {
            const response = await apiClient.get(`/faturamento/agendamentos-faturaveis/?convenio_id=${selectedConvenio}&ano=${ano}&mes=${mes}`);
            setAgendamentosFaturaveis(response.data);
            if (response.data.length === 0) {
                showSnackbar("Nenhum agendamento para faturar encontrado para este período.", 'info');
            }
        } catch (error) {
            console.error("Erro ao buscar agendamentos faturáveis:", error);
            showSnackbar("Erro ao buscar agendamentos.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Faturamento de Convênios</Typography>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                            <InputLabel>Convênio</InputLabel>
                            <Select
                                value={selectedConvenio}
                                label="Convênio"
                                onChange={(e) => setSelectedConvenio(e.target.value)}
                            >
                                {convenios.map((conv) => (
                                    <MenuItem key={conv.id} value={conv.id}>{conv.nome}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        {/* Aqui podemos colocar um seletor de mês/ano mais robusto no futuro */}
                        <Typography>Mês/Ano: (Seletor a ser implementado)</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Button variant="contained" onClick={handleBuscar} disabled={isLoading}>
                            {isLoading ? <CircularProgress size={24} /> : 'Buscar Agendamentos'}
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Aqui entrará a tabela com os resultados */}
            <Typography>Tabela de resultados aparecerá aqui...</Typography>
        </Box>
    );
}