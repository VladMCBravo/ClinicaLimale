// src/components/financeiro/PagarAgendamentoTab.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Autocomplete, TextField, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Typography, Button, CircularProgress
} from '@mui/material';
import { pacienteService } from '../../services/pacienteService';
import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function PagarAgendamentoTab({ onClose }) {
    const [pacientes, setPacientes] = useState([]);
    const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
    const [cobrancas, setCobrancas] = useState([]);
    const [isLoadingCobrancas, setIsLoadingCobrancas] = useState(false);
    const { showSnackbar } = useSnackbar();

    // Efeito para buscar a lista de todos os pacientes para o Autocomplete
    useEffect(() => {
        pacienteService.getPacientes()
            .then(response => setPacientes(response.data))
            .catch(() => showSnackbar('Erro ao carregar lista de pacientes.', 'error'));
    }, [showSnackbar]);

    // Efeito para buscar as cobranças do paciente selecionado
    useEffect(() => {
        if (pacienteSelecionado) {
            setIsLoadingCobrancas(true);
            faturamentoService.getCobrancasPendentes(pacienteSelecionado.id)
                .then(response => setCobrancas(response.data))
                .catch(() => showSnackbar('Erro ao buscar cobranças do paciente.', 'error'))
                .finally(() => setIsLoadingCobrancas(false));
        } else {
            setCobrancas([]); // Limpa a lista se nenhum paciente for selecionado
        }
    }, [pacienteSelecionado, showSnackbar]);

    const handleRegistrarPagamento = async (pagamentoId) => {
        try {
            // Por enquanto, vamos marcar como 'Pago' e 'Dinheiro'.
            // No futuro, podemos abrir outro modal para perguntar a forma de pagamento.
            await faturamentoService.updatePagamento(pagamentoId, {
                status: 'Pago',
                forma_pagamento: 'Dinheiro' 
            });
            showSnackbar('Pagamento registrado com sucesso!', 'success');
            // Atualiza a lista de cobranças para remover a que foi paga
            setCobrancas(prev => prev.filter(c => c.id !== pagamentoId));
        } catch (error) {
            showSnackbar('Erro ao registrar pagamento.', 'error');
        }
    };

    return (
        <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
                Busque por um paciente para ver seus agendamentos com pagamento pendente.
            </Typography>
            <Autocomplete
                options={pacientes}
                getOptionLabel={(option) => option.nome_completo}
                value={pacienteSelecionado}
                onChange={(event, newValue) => setPacienteSelecionado(newValue)}
                renderInput={(params) => <TextField {...params} label="Buscar Paciente" />}
                sx={{ mb: 3 }}
            />

            {isLoadingCobrancas ? <CircularProgress /> : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Data</TableCell>
                                <TableCell>Tipo</TableCell>
                                <TableCell>Valor (R$)</TableCell>
                                <TableCell align="right">Ação</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {cobrancas.length > 0 ? cobrancas.map(cobranca => (
                                <TableRow key={cobranca.id}>
                                    <TableCell>{new Date(cobranca.data_agendamento).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell>{cobranca.tipo_agendamento}</TableCell>
                                    <TableCell>{cobranca.valor}</TableCell>
                                    <TableCell align="right">
                                        <Button 
                                            variant="contained" 
                                            size="small"
                                            onClick={() => handleRegistrarPagamento(cobranca.id)}
                                        >
                                            Registrar Pagamento
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">
                                        {pacienteSelecionado ? "Nenhuma cobrança pendente." : "Selecione um paciente para começar."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}