// src/contexts/SnackbarContext.js
import React, { createContext, useState, useContext } from 'react';
import { Snackbar, Alert } from '@mui/material';

const SnackbarContext = createContext();

export const useSnackbar = () => {
    return useContext(SnackbarContext);
};

export const SnackbarProvider = ({ children }) => {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [severity, setSeverity] = useState('success'); // 'success', 'error', 'warning', 'info'
    const [duration, setDuration] = useState(6000); // Estado para o tempo

    const showSnackbar = (msg, sev = 'success') => {
        setMessage(msg);
        setSeverity(sev);
        // Se for erro, fica 12 segundos. Se for sucesso, apenas 5 segundos.
        setDuration(sev === 'error' ? 12000 : 5000);
        setOpen(true);
    };
  
    return (
        <SnackbarContext.Provider value={{ showSnackbar }}>
            {children}
            <Snackbar open={open} autoHideDuration={duration} onClose={() => setOpen(false)}>
                <Alert severity={severity} sx={{ width: '100%' }}>{message}</Alert>
            </Snackbar>
        </SnackbarContext.Provider>
    );
};