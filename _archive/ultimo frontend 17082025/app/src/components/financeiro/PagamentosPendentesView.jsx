// src/components/financeiro/PagamentosPendentesView.jsx

import React, { useState, useEffect } from 'react';
import PagamentoModal from '../PagamentoModal'; // Assumindo que o modal está em src/components/
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Button } from '@mui/material';

const formatarData = (dataString) => new Date(dataString).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function PagamentosPendentesView() {
  const [agendamentosNaoPagos, setAgendamentosNaoPagos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);

  const fetchNaoPagos = async () => {
    setIsLoading(true);
    const token = sessionStorage.getItem('authToken');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/agendamentos/nao-pagos/', { headers: { 'Authorization': `Token ${token}` } });
      if (!response.ok) throw new Error('Falha ao buscar dados financeiros.');
      const data = await response.json();
      setAgendamentosNaoPagos(data);
    } catch (err) { setError(err.message); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchNaoPagos(); }, []);

  const handleOpenModal = (agendamento) => { setAgendamentoSelecionado(agendamento); setIsModalOpen(true); };
  const handleCloseModal = () => { setAgendamentoSelecionado(null); setIsModalOpen(false); };
  const handleSavePayment = () => { handleCloseModal(); fetchNaoPagos(); };

    if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if (error) return <Typography color="error">Erro: {error}</Typography>;

  return (
    <Box>
      <Typography variant="h5" component="h2" sx={{ mb: 2 }}>Pagamentos Pendentes</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Paciente</TableCell>
              <TableCell>Data e Hora</TableCell>
              <TableCell>Procedimento</TableCell>
              <TableCell align="right">Valor (R$)</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {agendamentosNaoPagos.length > 0 ? (
              agendamentosNaoPagos.map((ag) => (
                <TableRow key={ag.id}>
                  <TableCell>{ag.paciente_nome || ag.paciente}</TableCell>
                  <TableCell>{formatarData(ag.data_hora_inicio)}</TableCell>
                  <TableCell>{ag.tipo_consulta || 'Não especificado'}</TableCell>
                  <TableCell align="right">{parseFloat(ag.valor_consulta || 0).toFixed(2)}</TableCell>
                  <TableCell align="center"><Button variant="contained" size="small" onClick={() => handleOpenModal(ag)}>Registrar Pagamento</Button></TableCell>
                </TableRow>
              ))
            ) : ( <TableRow><TableCell colSpan={5} align="center">Nenhum pagamento pendente.</TableCell></TableRow> )}
          </TableBody>
        </Table>
      </TableContainer>
      <PagamentoModal open={isModalOpen} onClose={handleCloseModal} onSave={handleSavePayment} agendamento={agendamentoSelecionado} />
    </Box>
  );
}