import React, { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
    Box, Button, CircularProgress, Paper, TextField, Typography,
    Grid, IconButton, List, ListItem, ListItemText, Tooltip
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import PrintIcon from '@mui/icons-material/Print';

const formatarData = (dataString) => new Date(dataString).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });

export default function PrescricoesTab({ pacienteId }) {
    const [prescricoes, setPrescricoes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPrintingId, setIsPrintingId] = useState(null);
    const [error, setError] = useState(null);
    const [itensForm, setItensForm] = useState([{ medicamento: '', dosagem: '', instrucoes: '' }]);
    const { showSnackbar } = useSnackbar();

    const fetchPrescricoes = useCallback(async () => {
        setIsLoading(true);
        const token = sessionStorage.getItem('authToken');
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/pacientes/${pacienteId}/prescricoes/`, {
                headers: { 'Authorization': `Token ${token}` },
            });
            if (!response.ok) throw new Error('Falha ao buscar prescrições.');
            const data = await response.json();
            setPrescricoes(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [pacienteId]);

    useEffect(() => {
        fetchPrescricoes();
    }, [fetchPrescricoes]);

    const handleItemChange = (index, event) => {
        const values = [...itensForm];
        values[index][event.target.name] = event.target.value;
        setItensForm(values);
    };

    const handleAddItem = () => {
        setItensForm([...itensForm, { medicamento: '', dosagem: '', instrucoes: '' }]);
    };

    const handleRemoveItem = (index) => {
        if (itensForm.length > 1) {
            const values = [...itensForm];
            values.splice(index, 1);
            setItensForm(values);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const token = sessionStorage.getItem('authToken');
        const itensValidos = itensForm.filter(item => item.medicamento.trim() !== '');
        if (itensValidos.length === 0) {
            showSnackbar('Adicione pelo menos um medicamento.', 'warning');
            return;
        }

        try {
            const response = await fetch(`http://127.0.0.1:8000/api/pacientes/${pacienteId}/prescricoes/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
                body: JSON.stringify({ itens: itensValidos }),
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(JSON.stringify(errData));
            }
            showSnackbar('Prescrição salva com sucesso!', 'success');
            setItensForm([{ medicamento: '', dosagem: '', instrucoes: '' }]);
            fetchPrescricoes();
        } catch (err) {
            showSnackbar(`Erro ao salvar: ${err.message}`, 'error');
        }
    };
    
    const handlePrint = async (prescricaoId) => {
        setIsPrintingId(prescricaoId);
        const token = sessionStorage.getItem('authToken');
        const url = `http://127.0.0.1:8000/api/prescricoes/${prescricaoId}/pdf/`;

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Token ${token}` },
            });
            if (!response.ok) throw new Error('Não foi possível gerar o PDF.');

            const pdfBlob = await response.blob();
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, '_blank');
        } catch (err) {
            showSnackbar(err.message, 'error');
        } finally {
            setIsPrintingId(null);
        }
    };

    if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
    if (error) return <Typography color="error">Erro: {error}</Typography>;

    return (
        <Box>
            <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, mb: 4 }}>
                <Typography variant="h6" gutterBottom>Criar Nova Prescrição</Typography>
                {itensForm.map((item, index) => (
                    <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2, position: 'relative' }}>
                        <Grid container spacing={2}>
                            <Grid xs={12} sm={4}><TextField name="medicamento" label="Medicamento" value={item.medicamento} onChange={e => handleItemChange(index, e)} fullWidth /></Grid>
                            <Grid xs={12} sm={3}><TextField name="dosagem" label="Dosagem" value={item.dosagem} onChange={e => handleItemChange(index, e)} fullWidth /></Grid>
                            <Grid xs={12} sm={5}><TextField name="instrucoes" label="Instruções" value={item.instrucoes} onChange={e => handleItemChange(index, e)} fullWidth /></Grid>
                        </Grid>
                        {itensForm.length > 1 && (
                            <IconButton onClick={() => handleRemoveItem(index)} size="small" sx={{ position: 'absolute', top: -10, right: -10 }}>
                                <RemoveCircleOutlineIcon color="error" />
                            </IconButton>
                        )}
                    </Paper>
                ))}
                <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAddItem} sx={{ mr: 2 }}>Adicionar Medicamento</Button>
                <Button type="submit" variant="contained">Salvar Prescrição</Button>
            </Paper>

            <Typography variant="h6" gutterBottom>Histórico de Prescrições</Typography>
            {prescricoes.length === 0 ? (
                <Typography>Nenhuma prescrição registrada para este paciente.</Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {prescricoes.map(presc => (
                        <Paper key={presc.id} variant="outlined" sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle2" color="textSecondary">
                                    {formatarData(presc.data_prescricao)} - Dr(a). {presc.medico_nome || 'Não informado'}
                                </Typography>
                                <Tooltip title="Imprimir Prescrição">
                                    <IconButton
                                        onClick={() => handlePrint(presc.id)}
                                        color="primary"
                                        disabled={isPrintingId === presc.id}
                                    >
                                        {isPrintingId === presc.id ? <CircularProgress size={24} /> : <PrintIcon />}
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <List dense>
                                {presc.itens.map(item => (
                                    <ListItem key={item.id}>
                                        <ListItemText primary={`${item.medicamento} (${item.dosagem})`} secondary={item.instrucoes} />
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>
                    ))}
                </Box>
            )}
        </Box>
    );
}