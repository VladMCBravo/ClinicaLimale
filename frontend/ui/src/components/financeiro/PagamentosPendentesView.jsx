// src/components/financeiro/PagamentosPendentesView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, CircularProgress, Typography, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import apiClient from '../../api/axiosConfig';
// --- ATIVADO: Importe o modal que acabamos de criar ---
import PagamentoModal from './PagamentoModal'; 

export default function PagamentosPendentesView() {
    const [pendentes, setPendentes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // --- ATIVADO: Estados para o modal de pagamento ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAgendamento, setSelectedAgendamento] = useState(null);

    const fetchPendentes = useCallback(async () => {
        // Não mostra o loading em recargas, apenas na primeira vez
        if (pendentes.length === 0) setIsLoading(true);
        try {
            const response = await apiClient.get('/agendamentos/nao-pagos/');
            setPendentes(response.data);
        } catch (error) {
            console.error("Erro ao buscar pagamentos pendentes:", error);
        } finally {
            setIsLoading(false);
        }
    }, [pendentes.length]);

    useEffect(() => {
        fetchPendentes();
    }, [fetchPendentes]);

    // --- ATIVADO: Função para abrir o modal ---
    const handleOpenModal = (agendamento) => {
        setSelectedAgendamento(agendamento);
        setIsModalOpen(true);
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Agendamentos com Pagamento Pendente</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Data da Consulta</TableCell>
                            <TableCell>Paciente</TableCell>
                            <TableCell>Tipo da Consulta</TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {pendentes.length > 0 ? (
                            pendentes.map((ag) => (
                                <TableRow key={ag.id}>
                                    <TableCell>{new Date(ag.data_hora_inicio).toLocaleString('pt-BR')}</TableCell>
                                    <TableCell>{ag.paciente}</TableCell>
                                    <TableCell>{ag.tipo_consulta}</TableCell>
                                    <TableCell align="right">
                                        <Button 
                                            variant="contained" 
                                            size="small"
                                            // --- ATIVADO: Ação de clique no botão ---
                                            onClick={() => handleOpenModal(ag)}
                                        >
                                            Registrar Pagamento
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    Não há pagamentos pendentes.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            
            {/* --- ATIVADO: Renderização do modal --- */}
            <PagamentoModal 
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchPendentes}
                agendamento={selectedAgendamento}
            />
        </Box>
    );
}