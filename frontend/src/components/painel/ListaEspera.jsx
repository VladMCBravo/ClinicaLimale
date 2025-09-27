// src/components/painel/ListaEspera.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, Button, Chip
} from '@mui/material';
import { agendamentoService } from '../../services/agendamentoService';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// Função para calcular o tempo de espera
const calcularTempoEspera = (horaChegada) => {
    const agora = new Date();
    const chegada = new Date(horaChegada);
    const diffMs = agora - chegada;
    const diffMins = Math.round(diffMs / 60000);
    return `${diffMins} min`;
};

export default function ListaEspera() {
    const [lista, setLista] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchListaEspera = useCallback(async () => {
        // Não reseta o loading em atualizações automáticas para uma experiência mais suave
        try {
            const response = await agendamentoService.getListaEspera();
            setLista(response.data);
        } catch (error) {
            console.error("Erro ao buscar lista de espera:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchListaEspera(); // Busca inicial
        const intervalId = setInterval(fetchListaEspera, 30000); // Atualiza a cada 30 segundos
        return () => clearInterval(intervalId); // Limpa o intervalo quando o componente é desmontado
    }, [fetchListaEspera]);

    if (isLoading) {
        return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />;
    }

    return (
        <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Lista de Espera</Typography>
            {lista.length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="text.secondary">Nenhum paciente aguardando no momento.</Typography>
                </Box>
            ) : (
                <TableContainer>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Paciente</TableCell>
                                <TableCell>Médico</TableCell>
                                <TableCell>Horário</TableCell>
                                <TableCell>Tempo de Espera</TableCell>
                                <TableCell align="right">Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lista.map((ag) => (
                                <TableRow key={ag.id} hover>
                                    <TableCell>{ag.paciente_nome}</TableCell>
                                    <TableCell>{ag.medico_nome}</TableCell>
                                    <TableCell>{new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                                    <TableCell>
                                        <Chip 
                                            icon={<AccessTimeIcon />} 
                                            label={calcularTempoEspera(ag.hora_chegada)} // Assumindo que a API retorna 'hora_chegada'
                                            variant="outlined" 
                                            size="small" 
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button size="small" variant="outlined">Iniciar Atendimento</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
    );
}