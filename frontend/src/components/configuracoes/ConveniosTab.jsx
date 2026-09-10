// src/components/configuracoes/ConveniosTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Typography, Button, CircularProgress, Accordion, AccordionSummary, 
    AccordionDetails, List, ListItem, ListItemText, IconButton, Chip 
} from '@mui/material';
import { 
    ExpandMore as ExpandMoreIcon, 
    Edit as EditIcon, 
    Delete as DeleteIcon, 
    Add as AddIcon 
} from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ConvenioModal from './ConvenioModal';

import '../../atendimento.css';

export default function ConveniosTab() {
    const [convenios, setConvenios] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [convenioParaEditar, setConvenioParaEditar] = useState(null);

    const fetchConvenios = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get('/faturamento/convenios/');
            setConvenios(response.data);
        } catch (error) { showSnackbar('Erro ao carregar convênios.', 'error'); } 
        finally { setIsLoading(false); }
    }, [showSnackbar]);

    useEffect(() => { fetchConvenios(); }, [fetchConvenios]);
    
    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza? Isso deletará todos os planos vinculados a este convênio.')) {
            try { 
                await apiClient.delete(`/faturamento/convenios/${id}/`); 
                showSnackbar('Convênio deletado com sucesso.', 'success');
                fetchConvenios(); 
            } catch { showSnackbar('Erro ao deletar.', 'error'); }
        }
    };

    return (
        <Box className="tasy-flat-panel tasy-workspace" sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#f1f3f5' }}>
            
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #e9ecef', bgcolor: '#fff' }}>
                <Typography sx={{ fontWeight: 600, color: '#495057', fontSize: '13px', textTransform: 'uppercase' }}>
                    Gestão de Convênios
                </Typography>
                <Button 
                    variant="contained" 
                    disableElevation
                    size="small"
                    startIcon={<AddIcon sx={{ fontSize: '16px' }}/>}
                    onClick={() => { setConvenioParaEditar(null); setIsModalOpen(true); }} 
                    sx={{ bgcolor: '#1c7ed6', fontSize: '12px', fontWeight: 600 }}
                >
                    Novo Convênio
                </Button>
            </Box>
            
            {/* Área da Lista */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: '#ffffff' }}>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : convenios.length > 0 ? (
                    convenios.map(convenio => (
                        <Accordion 
                            key={convenio.id} 
                            disableGutters 
                            elevation={0} 
                            sx={{ 
                                border: '1px solid #e9ecef', mb: 1.5, borderRadius: '4px', overflow: 'hidden',
                                '&:before': { display: 'none' } 
                            }}
                        >
                            <AccordionSummary 
                                expandIcon={<ExpandMoreIcon sx={{ color: '#868e96' }} />} 
                                sx={{ 
                                    bgcolor: '#f8f9fa', borderBottom: '1px solid #e9ecef', minHeight: 44,
                                    '& .MuiAccordionSummary-content': { alignItems: 'center', my: 1 } 
                                }}
                            >
                                <Typography sx={{ flexGrow: 1, fontWeight: 600, color: '#343a40', fontSize: '13px' }}>
                                    {convenio.nome}
                                </Typography>
                                
                                <Chip 
                                    label={`${convenio.planos?.length || 0} planos`} 
                                    size="small" 
                                    sx={{ mr: 2, height: 20, fontSize: '10px', fontWeight: 600, bgcolor: '#e7f5ff', color: '#1c7ed6', borderRadius: '4px' }} 
                                />
                                
                                <IconButton size="small" sx={{ mr: 1, color: '#868e96', '&:hover': { color: '#1c7ed6' } }} onClick={(e) => { e.stopPropagation(); setConvenioParaEditar(convenio); setIsModalOpen(true); }}>
                                    <EditIcon fontSize="small"/>
                                </IconButton>
                                <IconButton size="small" sx={{ color: '#868e96', '&:hover': { color: '#e03131' } }} onClick={(e) => { e.stopPropagation(); handleDelete(convenio.id); }}>
                                    <DeleteIcon fontSize="small"/>
                                </IconButton>
                            </AccordionSummary>
                            
                            <AccordionDetails sx={{ p: 0, bgcolor: '#ffffff' }}>
                                <List dense sx={{ p: 0 }}>
                                    {convenio.planos && convenio.planos.length > 0 ? (
                                        convenio.planos.map(plano => (
                                            <ListItem key={plano.id} divider sx={{ px: 3, py: 1, '&:hover': { bgcolor: '#f8f9fa' } }}>
                                                <ListItemText 
                                                    primary={<Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#495057' }}>{plano.nome}</Typography>} 
                                                    secondary={<Typography sx={{ fontSize: '12px', color: '#868e96' }}>{plano.descricao || 'Sem descrição adicional'}</Typography>} 
                                                />
                                            </ListItem>
                                        ))
                                    ) : (
                                        <Typography sx={{ fontSize: '12px', color: '#868e96', p: 3, textAlign: 'center' }}>
                                            Nenhum plano cadastrado neste convênio.
                                        </Typography>
                                    )}
                                </List>
                            </AccordionDetails>
                        </Accordion>
                    ))
                ) : (
                    <Typography sx={{ fontSize: '13px', color: '#868e96', textAlign: 'center', py: 4 }}>
                        Nenhum convênio cadastrado.
                    </Typography>
                )}
            </Box>

            <ConvenioModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={fetchConvenios} convenioParaEditar={convenioParaEditar} />
        </Box>
    );
}