// src/pages/ConveniosPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Button, CircularProgress, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import apiClient from '../api/axiosConfig';
import { useSnackbar } from '../contexts/SnackbarContext';
// --- 1. IMPORTE O NOVO MODAL ---
import ConvenioModal from '../components/configuracoes/ConvenioModal';

export default function ConveniosPage() {
    const [convenios, setConvenios] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();

    // --- 2. ATIVE OS ESTADOS DO MODAL ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [convenioParaEditar, setConvenioParaEditar] = useState(null);

    const fetchConvenios = useCallback(async () => {
        try {
            const response = await apiClient.get('/faturamento/convenios/');
            setConvenios(response.data);
        } catch (error) {
            showSnackbar('Erro ao carregar convênios.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchConvenios();
    }, [fetchConvenios]);
    
    // --- 3. ATIVE A FUNÇÃO PARA ABRIR O MODAL ---
    const handleOpenModal = (convenio = null) => {
        setConvenioParaEditar(convenio);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza? Deletar um convênio também deletará todos os seus planos associados.')) {
            try {
                await apiClient.delete(`/faturamento/convenios/${id}/`);
                showSnackbar('Convênio deletado com sucesso!', 'success');
                fetchConvenios();
            } catch (error) {
                showSnackbar('Erro ao deletar convênio.', 'error');
            }
        }
    };

    if (isLoading) return <CircularProgress />;

    return (
        <Paper sx={{ p: 2, margin: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Gestão de Convênios e Planos</Typography>
                {/* 4. ATIVE O BOTÃO "NOVO CONVÊNIO" */}
                <Button variant="contained" onClick={() => handleOpenModal()}>Novo Convênio</Button>
            </Box>
            
            {convenios.map(convenio => (
                <Accordion key={convenio.id}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ flexGrow: 1, fontWeight: 'bold' }}>{convenio.nome}</Typography>
                        {/* 5. ATIVE O BOTÃO DE EDIÇÃO */}
                        <IconButton size="small" sx={{ mr: 1 }} onClick={(e) => { e.stopPropagation(); handleOpenModal(convenio); }}><EditIcon /></IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(convenio.id); }}><DeleteIcon color="error" /></IconButton>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="subtitle2">Planos Cadastrados:</Typography>
                        <List dense>
                            {convenio.planos && convenio.planos.length > 0 ? (
                                convenio.planos.map(plano => (
                                    <ListItem key={plano.id}>
                                        <ListItemText primary={plano.nome} secondary={plano.descricao} />
                                    </ListItem>
                                ))
                            ) : (
                                <ListItem><ListItemText primary="Nenhum plano cadastrado para este convênio." /></ListItem>
                            )}
                        </List>
                    </AccordionDetails>
                </Accordion>
            ))}
            
            {/* 6. ATIVE O MODAL */}
            <ConvenioModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={fetchConvenios} convenioParaEditar={convenioParaEditar} />
        </Paper>
    );
}