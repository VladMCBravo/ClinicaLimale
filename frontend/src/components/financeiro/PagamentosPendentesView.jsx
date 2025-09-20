// src/components/financeiro/PagamentosPendentesView.jsx - VERSÃO CORRIGIDA E ORGANIZADA
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, CircularProgress, Typography, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';

import { faturamentoService } from '../../services/faturamentoService'; // <-- IMPORTAMOS O SERVIÇO
import PagamentoModal from './PagamentoModal'; 
import { useSnackbar } from '../../contexts/SnackbarContext'; // Para dar feedback ao usuário

export default function PagamentosPendentesView() {
    // 1. Nomenclatura atualizada para clareza
    const [pagamentosPendentes, setPagamentosPendentes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPagamento, setSelectedPagamento] = useState(null); // Agora selecionamos um pagamento
    const { showSnackbar } = useSnackbar();

    const fetchPendentes = useCallback(async () => {
        if (pagamentosPendentes.length === 0) setIsLoading(true);
        try {
            // A MÁGICA ACONTECE AQUI: Usamos a função do serviço
            const response = await faturamentoService.getPagamentosPendentes();
            setPagamentosPendentes(response.data);
        } catch (error) {
            console.error("Erro ao buscar pagamentos pendentes:", error);
            showSnackbar("Erro ao carregar pagamentos pendentes.", 'error');
        } finally {
            setIsLoading(false);
        }
    }, [pagamentosPendentes.length, showSnackbar]);

    useEffect(() => {
        fetchPendentes();
    }, [fetchPendentes]);

    const handleOpenModal = (pagamento) => {
        setSelectedPagamento(pagamento); // Passa o objeto de pagamento
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedPagamento(null);
    }

    const handleSavePagamento = () => {
        handleCloseModal();
        fetchPendentes(); // Recarrega a lista após salvar
    }

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
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
                        {pagamentosPendentes.length > 0 ? (
                            pagamentosPendentes.map((pag) => (
                                <TableRow key={pag.id}>
                                    {/* --- A CORREÇÃO ESTÁ AQUI --- */}
                                    {/* Usamos 'pag.agendamento?.' para aceder com segurança. Se pag.agendamento for nulo, não quebra. */}
                                    <TableCell>
                                        {pag.agendamento ? new Date(pag.agendamento.data_hora_inicio).toLocaleString('pt-BR') : 'Agendamento Removido'}
                                    </TableCell>
                                    <TableCell>{pag.paciente_nome}</TableCell>
                                    <TableCell>
                                        {pag.agendamento ? pag.agendamento.tipo_consulta : 'N/A'}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button 
                                            variant="contained" 
                                            size="small"
                                            onClick={() => handleOpenModal(pag)}
                                        >
                                            Registar Pagamento
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
            
            {/* 4. Passa o objeto de pagamento para o modal */}
            {selectedPagamento && (
                <PagamentoModal 
                    open={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSavePagamento}
                    pagamento={selectedPagamento} // A prop agora é 'pagamento'
                />
            )}
        </Box>
    );
}