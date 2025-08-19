// src/components/PagamentoModal.jsx

import React, { useState, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField,
  Select, MenuItem, FormControl, InputLabel, Box, Typography
} from '@mui/material';

export default function PagamentoModal({ open, onClose, onSave, agendamento }) {
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro');
  const [valor, setValor] = useState('');

  useEffect(() => {
    // Preenche o valor do agendamento quando o modal abre
    if (agendamento) {
      setValor(parseFloat(agendamento.valor_consulta || 0).toFixed(2));
      setFormaPagamento('Dinheiro'); // Reseta a forma de pagamento
    }
  }, [agendamento]);

  const handleSubmit = async () => {
    if (!agendamento) return;
    
    // O corpo da requisição só precisa do valor e forma de pagamento,
    // como definido no nosso PagamentoCreateSerializer
    const pagamentoData = {
      valor: valor,
      forma_pagamento: formaPagamento,
    };
    
    const token = sessionStorage.getItem('authToken');
    // A URL agora é específica para o agendamento, como o backend espera
    const url = `http://127.0.0.1:8000/api/agendamentos/${agendamento.id}/pagamentos/`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify(pagamentoData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData.detail || errorData));
      }
      
      onSave(); // Avisa a página financeira para recarregar a lista
      onClose(); // Fecha o modal

    } catch (error) {
      console.error("Falha ao registrar pagamento:", error);
      alert(`Erro ao salvar: ${error.message}`);
    }
  };

  if (!agendamento) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Registrar Pagamento</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography><strong>Paciente:</strong> {agendamento.paciente_nome || agendamento.paciente}</Typography>
          <Typography sx={{mb: 2}}><strong>Consulta:</strong> {new Date(agendamento.data_hora_inicio).toLocaleString('pt-BR')}</Typography>

          <TextField
            label="Valor (R$)"
            type="number"
            fullWidth
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel id="forma-pagamento-label">Forma de Pagamento</InputLabel>
            <Select
              labelId="forma-pagamento-label"
              value={formaPagamento}
              label="Forma de Pagamento"
              onChange={(e) => setFormaPagamento(e.target.value)}
            >
              <MenuItem value="Dinheiro">Dinheiro</MenuItem>
              <MenuItem value="CartaoCredito">Cartão de Crédito</MenuItem>
              <MenuItem value="CartaoDebito">Cartão de Débito</MenuItem>
              <MenuItem value="PIX">PIX</MenuItem>
              <MenuItem value="Convenio">Convênio</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained">Confirmar Pagamento</Button>
      </DialogActions>
    </Dialog>
  );
}