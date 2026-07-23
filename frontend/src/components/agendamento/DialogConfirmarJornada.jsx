// src/components/agendamento/DialogConfirmarJornada.jsx
// Aviso de "fora da jornada de trabalho do médico", com opção de forçar o agendamento
// como exceção. Extraído do AgendamentoModal.jsx sem mudar visual ou comportamento.
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button } from '@mui/material';

export default function DialogConfirmarJornada({ open, onClose, dataInicioVisual, dataFimVisual, nomeMedico, onForcar }) {
    // Formata o horário final com segurança contra null/undefined
    const horaFimFormatada = typeof dataFimVisual === 'string' && dataFimVisual.length >= 16 
        ? dataFimVisual.substring(11, 16) 
        : '';

    return (
        <Dialog open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: 2, minWidth: 400 } }}>
            <DialogTitle sx={{ color: 'warning.main', fontWeight: 'bold' }}>Aviso de Fora de Jornada</DialogTitle>
            <DialogContent dividers>
                <Typography>
                    O horário selecionado (<strong>{dataInicioVisual || '--/--/---- --:--'} às {horaFimFormatada || '--:--'}</strong>) está <strong>fora da jornada de trabalho</strong> cadastrada para o(a) Dr(a). {nomeMedico || 'Selecionado'}.
                </Typography>
                <Typography sx={{ mt: 2 }}>Deseja forçar este agendamento como uma exceção?</Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit">Cancelar</Button>
                <Button onClick={onForcar} variant="contained" color="warning">Sim, Forçar</Button>
            </DialogActions>
        </Dialog>
    );
}