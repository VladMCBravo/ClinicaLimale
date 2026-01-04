// src/components/configuracoes/ConveniosTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ConvenioModal from './ConvenioModal';

export default function ConveniosTab() {
    const [convenios, setConvenios] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [convenioParaEditar, setConvenioParaEditar] = useState(null);

    const fetchConvenios = useCallback(async () => {
        try {
            const response = await apiClient.get('/faturamento/convenios/');
            setConvenios(response.data);
        } catch (error) { showSnackbar('Erro ao carregar convênios.', 'error'); } 
        finally { setIsLoading(false); }
    }, [showSnackbar]);

    useEffect(() => { fetchConvenios(); }, [fetchConvenios]);
    
    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza? Isso deletará todos os planos do convênio.')) {
            try { await apiClient.delete(`/faturamento/convenios/${id}/`); fetchConvenios(); } 
            catch { showSnackbar('Erro ao deletar.', 'error'); }
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" onClick={() => { setConvenioParaEditar(null); setIsModalOpen(true); }} sx={{bgcolor: '#1a233b'}}>Novo Convênio</Button>
            </Box>
            
            {isLoading ? <CircularProgress /> : convenios.map(convenio => (
                <Accordion key={convenio.id} disableGutters elevation={0} sx={{ border: '1px solid #ddd', mb: 1, borderRadius: 1, '&:before': {display: 'none'} }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#fafafa' }}>
                        <Typography sx={{ flexGrow: 1, fontWeight: 'bold' }}>{convenio.nome}</Typography>
                        <IconButton size="small" sx={{ mr: 1 }} onClick={(e) => { e.stopPropagation(); setConvenioParaEditar(convenio); setIsModalOpen(true); }}><EditIcon fontSize="small"/></IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(convenio.id); }}><DeleteIcon fontSize="small" color="error"/></IconButton>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="caption" color="text.secondary">Planos Associados:</Typography>
                        <List dense>
                            {convenio.planos && convenio.planos.length > 0 ? (
                                convenio.planos.map(plano => (
                                    <ListItem key={plano.id} divider>
                                        <ListItemText primary={plano.nome} secondary={plano.descricao} />
                                    </ListItem>
                                ))
                            ) : <Typography variant="body2" sx={{p:1}}>Nenhum plano cadastrado.</Typography>}
                        </List>
                    </AccordionDetails>
                </Accordion>
            ))}
            <ConvenioModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={fetchConvenios} convenioParaEditar={convenioParaEditar} />
        </Box>
    );
}