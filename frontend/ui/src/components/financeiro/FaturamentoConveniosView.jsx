// src/components/financeiro/FaturamentoConveniosView.jsx - VERSÃO COM IMPORT CORRIGIDO

import React, { useState, useEffect } from 'react';
import {
    Box, Button, CircularProgress, Typography, Paper, Grid, Select, MenuItem, FormControl,
    InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox,
    TextField // <-- 1. A IMPORTAÇÃO QUE FALTAVA ESTÁ AQUI
} from '@mui/material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Função para formatar a data para o formato YYYY-MM
const getYearMonthString = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
};

export default function FaturamentoConveniosView() {
    // Estados para controlar o formulário e os dados
    const [convenios, setConvenios] = useState([]);
    const [selectedConvenio, setSelectedConvenio] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(getYearMonthString(new Date()));
    const [agendamentosFaturaveis, setAgendamentosFaturaveis] = useState([]);
    const [selectedAgendamentos, setSelectedAgendamentos] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { showSnackbar } = useSnackbar();

    // Efeito para buscar a lista de todos os convênios
    useEffect(() => {
        apiClient.get('/faturamento/convenios/')
            .then(response => { setConvenios(response.data); })
            .catch(error => {
                console.error("Erro ao buscar convênios:", error);
                showSnackbar("Não foi possível carregar a lista de convênios.", 'error');
            });
    }, [showSnackbar]);

    // Função para buscar os agendamentos faturáveis
    const handleBuscar = async () => {
        if (!selectedConvenio || !selectedMonth) {
            showSnackbar("Por favor, selecione um convênio e um mês/ano.", 'warning');
            return;
        }
        
        setIsLoading(true);
        setAgendamentosFaturaveis([]);
        setSelectedAgendamentos([]);
        
        const [ano, mes] = selectedMonth.split('-');

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
    
    // Funções para gerir a seleção na tabela
    const handleSelectAll = (event) => {
        if (event.target.checked) {
            const allIds = agendamentosFaturaveis.map((ag) => ag.id);
            setSelectedAgendamentos(allIds);
            return;
        }
        setSelectedAgendamentos([]);
    };

    const handleSelectOne = (event, id) => {
        const selectedIndex = selectedAgendamentos.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selectedAgendamentos, id);
        } else if (selectedIndex >= 0) {
            newSelected = selectedAgendamentos.filter(selectedId => selectedId !== id);
        }
        setSelectedAgendamentos(newSelected);
    };

    // Função para criar o lote
    const handleGerarLote = async () => {
    if (selectedAgendamentos.length === 0) {
        showSnackbar("Nenhum agendamento selecionado.", 'warning');
        return;
    }

    setIsLoading(true); // Ativa o estado de carregamento
    try {
        const payload = {
            convenio_id: selectedConvenio,
            mes_referencia: selectedMonth, // 'YYYY-MM'
            agendamento_ids: selectedAgendamentos
        };

        await apiClient.post('/faturamento/gerar-lote/', payload);

        showSnackbar(`Lote com ${selectedAgendamentos.length} agendamentos gerado com sucesso!`, 'success');

        // Limpa a tela e busca novamente (os agendamentos faturados irão desaparecer da lista)
        handleBuscar(); 

    } catch (error) {
        console.error("Erro ao gerar lote de faturamento:", error);
        showSnackbar("Erro ao gerar lote.", 'error');
    } finally {
        setIsLoading(false); // Desativa o estado de carregamento
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
                            <Select value={selectedConvenio} label="Convênio" onChange={(e) => setSelectedConvenio(e.target.value)}>
                                {convenios.map((conv) => (
                                    <MenuItem key={conv.id} value={conv.id}>{conv.nome}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            label="Mês/Ano de Referência"
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Button variant="contained" onClick={handleBuscar} disabled={isLoading}>
                            {isLoading ? <CircularProgress size={24} /> : 'Buscar Agendamentos'}
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={selectedAgendamentos.length > 0 && selectedAgendamentos.length < agendamentosFaturaveis.length}
                                    checked={agendamentosFaturaveis.length > 0 && selectedAgendamentos.length === agendamentosFaturaveis.length}
                                    onChange={handleSelectAll}
                                />
                            </TableCell>
                            <TableCell>Data</TableCell>
                            <TableCell>Paciente</TableCell>
                            <TableCell>Tipo da Consulta</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={4} align="center"><CircularProgress /></TableCell></TableRow>
                        ) : agendamentosFaturaveis.map((ag) => {
                            const isSelected = selectedAgendamentos.indexOf(ag.id) !== -1;
                            return (
                                <TableRow key={ag.id} hover selected={isSelected}>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={isSelected}
                                            onChange={(event) => handleSelectOne(event, ag.id)}
                                        />
                                    </TableCell>
                                    <TableCell>{new Date(ag.data_hora_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                                    <TableCell>{ag.paciente_nome}</TableCell>
                                    <TableCell>{ag.tipo_consulta}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {selectedAgendamentos.length > 0 && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" color="success" onClick={handleGerarLote}>
                        Gerar Lote de Faturamento ({selectedAgendamentos.length} selecionados)
                    </Button>
                </Box>
            )}
        </Box>
    );
}