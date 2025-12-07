// src/components/prontuario/LaudosTab.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Paper, Typography, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, IconButton, Chip, 
    Button, CircularProgress, Alert
} from '@mui/material';
import { FaPrint, FaEye, FaPlus } from 'react-icons/fa';
import apiClient from '../../api/axiosConfig';

const LaudosTab = ({ pacienteId }) => {
    const [laudos, setLaudos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState(null);

    useEffect(() => {
        if (!pacienteId) return;

        const fetchLaudos = async () => {
            setLoading(true);
            try {
                // Endpoint alinhado com o que foi definido em core/urls.py
                const response = await apiClient.get('/prontuario/laudos/', {
                    params: { paciente: pacienteId }
                });
                setLaudos(response.data);
                setErro(null);
            } catch (error) {
                console.error("Erro ao buscar laudos:", error);
                setErro("Não foi possível carregar o histórico de laudos.");
            } finally {
                setLoading(false);
            }
        };

        fetchLaudos();
    }, [pacienteId]);

    const handleImprimir = (laudoId) => {
        console.log("Imprimir laudo", laudoId);
        alert("Funcionalidade de reimpressão em desenvolvimento.");
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    if (erro) {
        return <Alert severity="error">{erro}</Alert>;
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" color="primary">Histórico de Laudos</Typography>
                <Button 
                    variant="contained" 
                    color="secondary" 
                    startIcon={<FaPlus />}
                    onClick={() => alert("Para criar um novo, vá para a página principal de Laudos.")}
                >
                    Novo Laudo
                </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>Data</strong></TableCell>
                            <TableCell><strong>Exame</strong></TableCell>
                            <TableCell><strong>Título</strong></TableCell>
                            <TableCell><strong>Médico</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell align="center"><strong>Ações</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {laudos.length > 0 ? (
                            laudos.map((laudo) => (
                                <TableRow key={laudo.id} hover>
                                    <TableCell>{new Date(laudo.data_criacao).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell>{laudo.tipo_exame}</TableCell>
                                    <TableCell>{laudo.titulo}</TableCell>
                                    <TableCell>{laudo.medico_nome}</TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={laudo.status} 
                                            size="small" 
                                            color={laudo.status === 'FINALIZADO' ? 'success' : 'warning'} 
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton size="small" color="primary" onClick={() => handleImprimir(laudo.id)}><FaPrint /></IconButton>
                                        <IconButton size="small" onClick={() => console.log('Ver', laudo)}><FaEye /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                    <Typography variant="body2" color="textSecondary">Nenhum laudo encontrado.</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default LaudosTab;