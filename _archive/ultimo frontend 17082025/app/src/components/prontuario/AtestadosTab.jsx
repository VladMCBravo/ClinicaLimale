import React, { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { 
    Box, Button, CircularProgress, Paper, TextField, Typography, 
    FormControl, InputLabel, Select, MenuItem, Tooltip, IconButton
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';

const formatarData = (dataString) => new Date(dataString).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });

export default function AtestadosTab({ pacienteId }) {
    const [atestados, setAtestados] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPrintingId, setIsPrintingId] = useState(null);
    const { showSnackbar } = useSnackbar();

    // Estados para o formulário de novo atestado
    const [tipoAtestado, setTipoAtestado] = useState('');
    const [observacoes, setObservacoes] = useState('');

    const fetchAtestados = useCallback(async () => {
        setIsLoading(true);
        const token = sessionStorage.getItem('authToken');
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/pacientes/${pacienteId}/atestados/`, {
                headers: { 'Authorization': `Token ${token}` },
            });
            if (!response.ok) throw new Error('Falha ao buscar atestados.');
            const data = await response.json();
            setAtestados(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [pacienteId]);

    useEffect(() => {
        fetchAtestados();
    }, [fetchAtestados]);

    const resetForm = () => {
        setTipoAtestado('');
        setObservacoes('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!tipoAtestado || !observacoes) {
            showSnackbar('Por favor, preencha todos os campos.', 'warning');
            return;
        }
        const token = sessionStorage.getItem('authToken');
        const atestadoData = { tipo_atestado: tipoAtestado, observacoes };

        try {
            const response = await fetch(`http://127.0.0.1:8000/api/pacientes/${pacienteId}/atestados/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
                body: JSON.stringify(atestadoData),
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(JSON.stringify(errData));
            }
            showSnackbar('Atestado gerado com sucesso!', 'success');
            resetForm();
            fetchAtestados();
        } catch (err) {
            showSnackbar(`Erro ao salvar: ${err.message}`, 'error');
        }
    };

    const handlePrint = async (atestadoId) => {
        setIsPrintingId(atestadoId);
        const token = sessionStorage.getItem('authToken');
        const url = `http://127.0.0.1:8000/api/atestados/${atestadoId}/pdf/`;
        try {
            const response = await fetch(url, { headers: { 'Authorization': `Token ${token}` } });
            if (!response.ok) throw new Error('Não foi possível gerar o PDF do atestado.');
            const pdfBlob = await response.blob();
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, '_blank');
        } catch (err) {
            showSnackbar(err.message, 'error');
        } finally {
            setIsPrintingId(null);
        }
    };

        if (isLoading) return (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Box>
        );
        if (error) return <Typography color="error">Erro: {error}</Typography>;

    return (
        <Box>
            {/* FORMULÁRIO PARA NOVO ATESTADO */}
            <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, mb: 4 }}>
                <Typography variant="h6" gutterBottom>Gerar Novo Atestado</Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="tipo-atestado-label">Tipo de Atestado</InputLabel>
                    <Select
                        labelId="tipo-atestado-label"
                        value={tipoAtestado}
                        label="Tipo de Atestado"
                        onChange={(e) => setTipoAtestado(e.target.value)}
                    >
                        <MenuItem value="Comparecimento">Comparecimento</MenuItem>
                        <MenuItem value="Afastamento">Afastamento</MenuItem>
                        <MenuItem value="Aptidao">Aptidão Física</MenuItem>
                    </Select>
                </FormControl>
                <TextField 
                    label="Texto / Observações" 
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    multiline 
                    rows={5} 
                    fullWidth 
                />
                <Button type="submit" variant="contained" sx={{ mt: 2 }}>Gerar Atestado</Button>
            </Paper>

            {/* HISTÓRICO DE ATESTADOS */}
            <Typography variant="h6" gutterBottom>Histórico de Atestados</Typography>
            {atestados.length === 0 ? (
                <Typography>Nenhum atestado registrado para este paciente.</Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {atestados.map(att => (
                        <Paper key={att.id} variant="outlined" sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle2" color="textSecondary">
                                    {formatarData(att.data_emissao)} - Dr(a). {att.medico_nome || 'Não informado'}
                                </Typography>
                                <Tooltip title="Imprimir Atestado">
                                    <IconButton
                                        onClick={() => handlePrint(att.id)}
                                        color="primary"
                                        disabled={isPrintingId === att.id}
                                    >
                                        {isPrintingId === att.id ? <CircularProgress size={24} /> : <PrintIcon />}
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Typography variant="body1" sx={{ mt: 1 }}>
                                <b>Tipo:</b> {att.tipo_atestado_display}
                            </Typography>
                            <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                                {att.observacoes}
                            </Typography>
                        </Paper>
                    ))}
                </Box>
            )}
        </Box>
    );
}