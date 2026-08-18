import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import { FaTrophy, FaUserMd, FaClock } from 'react-icons/fa';
import { crmService } from '../../services/crmService';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function CrmRentabilidade({ macroArea }) {
    const [dados, setDados] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        crmService.getRentabilidade(macroArea).then(res => {
            setDados(res.data);
            setLoading(false);
        }).catch(err => {
            console.error("Erro ao carregar rentabilidade", err);
            setLoading(false);
        });
    }, [macroArea]);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5, height: '100%', alignItems: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
            <Paper sx={{ p: 2, borderRadius: 2, boxShadow: '0 4px 12px rgba(28,46,74,0.05)' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1C2E4A', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FaTrophy color="#FFD700" /> Ranking de Rentabilidade (Lucro Líquido)
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
                    Calculado com base na Receita Bruta subtraindo o Custo por Médico.
                </Typography>

                <TableContainer sx={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 800, color: '#495057', bgcolor: '#f8f9fa' }}>Exame / Procedimento</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#495057', bgcolor: '#f8f9fa' }}>Médico</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#495057', bgcolor: '#f8f9fa' }}>Turno</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: '#495057', bgcolor: '#f8f9fa' }}>Volume Realizado</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, color: '#495057', bgcolor: '#f8f9fa' }}>Lucro Líquido</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {dados.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: '#868e96' }}>Nenhum dado financeiro processado para este filtro.</TableCell>
                                </TableRow>
                            ) : dados.map((row, idx) => (
                                <TableRow key={idx} hover>
                                    <TableCell sx={{ fontWeight: 600, color: '#1C2E4A' }}>{row.exame}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.85rem' }}>
                                            <FaUserMd color="#adb5bd" /> {row.medico}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            icon={<FaClock size={10} />} 
                                            label={row.turno} 
                                            size="small" 
                                            sx={{ 
                                                fontSize: '10px', fontWeight: 'bold', height: '20px',
                                                bgcolor: row.turno === 'Manhã' ? '#e3f2fd' : row.turno === 'Tarde' ? '#fff3e0' : '#f3e5f5',
                                                color: row.turno === 'Manhã' ? '#1565c0' : row.turno === 'Tarde' ? '#e65100' : '#6a1b9a'
                                            }} 
                                        />
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 500 }}>{row.exames_realizados}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#2e7d32' }}>
                                        {formatMoney(row.rentabilidade)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}