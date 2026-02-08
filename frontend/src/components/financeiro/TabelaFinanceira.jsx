// src/components/financeiro/TabelaFinanceira.jsx
import React from 'react';
import { 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Paper, Chip, IconButton, Stack, Typography, Box 
} from '@mui/material';
import { Edit, Delete, CheckCircle, Warning } from '@mui/icons-material';
import dayjs from 'dayjs';
import { formatMoney, formatDate } from '../../utils/format'; // Usando o utilitário

export default function TabelaFinanceira({ 
    dados, 
    loading, 
    tipo = 'receita', // 'receita' ou 'despesa'
    onEdit, 
    onDelete, 
    onBaixa 
}) {
    if (loading) return <Box sx={{ p: 2 }}>Carregando...</Box>;
    if (!dados.length) return <Box sx={{ p: 2 }}>Nenhum registro encontrado.</Box>;

    return (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 600 }}>
            <Table stickyHeader size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Vencimento</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{tipo === 'receita' ? 'Paciente / Descrição' : 'Descrição / Categoria'}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Valor</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {dados.map((row) => {
                        const isAtrasado = !row.pago && dayjs(row.data_vencimento).isBefore(dayjs(), 'day');
                        const corStatus = row.pago ? 'success' : isAtrasado ? 'error' : 'warning';
                        const textoStatus = row.pago ? 'Pago' : isAtrasado ? 'Atrasado' : 'Pendente';

                        return (
                            <TableRow key={row.id} hover sx={{ bgcolor: isAtrasado ? '#fff5f5' : 'inherit' }}>
                                <TableCell>{formatDate(row.data_vencimento)}</TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="bold">
                                        {row.paciente_nome || row.descricao}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        {tipo === 'despesa' ? row.categoria_nome : row.forma_pagamento}
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: tipo === 'receita' ? 'green' : 'red' }}>
                                    {formatMoney(row.valor)}
                                </TableCell>
                                <TableCell>
                                    <Chip label={textoStatus} color={corStatus} size="small" sx={{ fontWeight: 'bold', height: 20 }} />
                                </TableCell>
                                <TableCell align="right">
                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                        {!row.pago && (
                                            <IconButton size="small" color="success" onClick={() => onBaixa(row)} title="Baixar">
                                                <CheckCircle fontSize="small" />
                                            </IconButton>
                                        )}
                                        <IconButton size="small" color="primary" onClick={() => onEdit(row)}>
                                            <Edit fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" color="error" onClick={() => onDelete(row.id)}>
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}