// src/pages/TelemedicinaPage.jsx - VERSÃO FINAL E FUNCIONAL
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Paper, Typography, CircularProgress, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Button, Link
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import LinkIcon from '@mui/icons-material/Link';
import apiClient from '../api/axiosConfig';
import { useSnackbar } from '../contexts/SnackbarContext';

export default function TelemedicinaPage() {
    const [consultas, setConsultas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();

    const fetchConsultas = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get('/agendamentos/telemedicina/');
            setConsultas(response.data);
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Erro ao carregar as consultas de telemedicina.";
            showSnackbar(errorMessage, "error");
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchConsultas();
    }, [fetchConsultas]);

    const handleCriarSala = async (agendamentoId) => {
        try {
            await apiClient.post(`/agendamentos/${agendamentoId}/criar-telemedicina/`);
            showSnackbar("Sala criada com sucesso!", "success");
            fetchConsultas(); // Atualiza a lista para mostrar o novo link
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Erro ao criar a sala de telemedicina.";
            showSnackbar(errorMessage, "error");
        }
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ p: 2 }}>
            <Paper sx={{ p: 2 }}>
                <Typography variant="h5" gutterBottom>
                    Consultas de Telemedicina
                </Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Data e Hora</TableCell>
                                <TableCell>Paciente</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="center">Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {consultas.length > 0 ? (
                                consultas.map((ag) => (
                                    <TableRow key={ag.id}>
                                        <TableCell>{new Date(ag.data_hora_inicio).toLocaleString('pt-BR')}</TableCell>
                                        <TableCell>{ag.paciente_nome}</TableCell>
                                        <TableCell>{ag.status}</TableCell>
                                        <TableCell align="center">
                                            {ag.link_telemedicina ? (
                                                <Button
                                                    variant="contained" color="success"
                                                    startIcon={<LinkIcon />} component={Link} href={ag.link_telemedicina}
                                                    target="_blank"
                                                >
                                                    Aceder à Sala
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outlined" startIcon={<VideocamIcon />}
                                                    onClick={() => handleCriarSala(ag.id)}
                                                >
                                                    Criar Sala
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">
                                        Não há consultas de telemedicina agendadas.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}