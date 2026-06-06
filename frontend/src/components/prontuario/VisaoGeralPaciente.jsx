// src/components/prontuario/VisaoGeralPaciente.jsx

import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Paper, CircularProgress, Divider, 
    IconButton, Tooltip, Chip 
} from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import DescriptionIcon from '@mui/icons-material/Description';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function VisaoGeralPaciente({ pacienteId }) {
    const [eventos, setEventos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        const fetchTimeline = async () => {
            if (!pacienteId) return;
            setIsLoading(true);
            try {
                // Busca tudo em paralelo para máxima velocidade
                const [resEvolucoes, resPrescricoes, resAtestados, resRelatorios] = await Promise.all([
                    apiClient.get(`/prontuario/pacientes/${pacienteId}/evolucoes/`).catch(() => ({ data: [] })),
                    apiClient.get(`/prontuario/pacientes/${pacienteId}/prescricoes/`).catch(() => ({ data: [] })),
                    apiClient.get(`/prontuario/pacientes/${pacienteId}/atestados/`).catch(() => ({ data: [] })),
                    apiClient.get(`/prontuario/pacientes/${pacienteId}/relatorios/`).catch(() => ({ data: [] }))
                ]);

                // 1. Mapear Evoluções
                const evos = resEvolucoes.data.map(item => ({
                    id: `evo-${item.id}`,
                    tipo: 'EVOLUÇÃO',
                    data: new Date(item.data_atendimento),
                    titulo: `Consulta - ${item.especialidade?.nome || 'Geral'}`,
                    medico: item.medico_nome || 'Não informado',
                    detalhes: item.avaliacoes || item.notas_subjetivas || 'Atendimento realizado.',
                    pdfUrl: `/pdf/evolucao/${item.id}/`,
                    cor: 'primary',
                    icon: <LocalHospitalIcon fontSize="small" />
                }));

                // 2. Mapear Prescrições
                const prescs = resPrescricoes.data.map(item => ({
                    id: `presc-${item.id}`,
                    tipo: 'PRESCRIÇÃO',
                    data: new Date(item.data_prescricao),
                    titulo: `Prescrição Médica (${item.itens?.length || 0} itens)`,
                    medico: item.medico_nome || 'Não informado',
                    detalhes: item.itens?.map(i => i.medicamento).join(', ') || 'Sem medicamentos listados.',
                    pdfUrl: `/pdf/prescricao/${item.id}/`,
                    cor: 'secondary',
                    icon: <LocalPharmacyIcon fontSize="small" />
                }));

                // 3. Mapear Atestados
                const atests = resAtestados.data.map(item => ({
                    id: `atest-${item.id}`,
                    tipo: 'ATESTADO',
                    data: new Date(item.data_emissao),
                    titulo: `Atestado Médico (${item.dias_afastamento} dias)`,
                    medico: item.medico_nome || 'Não informado',
                    detalhes: `CID: ${item.cid || 'Não informado'}`,
                    pdfUrl: `/pdf/atestado/${item.id}/`,
                    cor: 'error',
                    icon: <DescriptionIcon fontSize="small" />
                }));

                // 4. Mapear Relatórios Salvos
                const relats = resRelatorios.data.map(item => ({
                    id: `relat-${item.id}`,
                    tipo: 'RELATÓRIO',
                    data: new Date(item.data_criacao),
                    titulo: item.titulo || 'Relatório Médico',
                    medico: item.medico_nome || 'Não informado',
                    detalhes: 'Documento gerado e arquivado.',
                    pdfUrl: `/pdf/relatorio/${item.id}/`,
                    cor: 'info',
                    icon: <AssignmentIcon fontSize="small" />
                }));

                // Junta tudo e ordena do mais recente (topo) para o mais antigo (fundo)
                const todosEventos = [...evos, ...prescs, ...atests, ...relats];
                todosEventos.sort((a, b) => b.data - a.data);

                setEventos(todosEventos);
            } catch (error) {
                console.error("Erro ao buscar timeline:", error);
                showSnackbar("Erro ao carregar histórico do paciente.", "error");
            } finally {
                setIsLoading(false);
            }
        };

        fetchTimeline();
    }, [pacienteId, showSnackbar]);

    const handleDownloadPdf = async (url) => {
        try {
            const response = await apiClient.get(url, { responseType: 'blob' });
            const fileURL = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            window.open(fileURL, '_blank');
            setTimeout(() => URL.revokeObjectURL(fileURL), 100);
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            showSnackbar('Erro ao gerar o documento PDF. Verifique se a rota existe.', 'error');
        }
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '800px', margin: '0 auto' }}>
            <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold', color: '#495057' }}>
                Histórico Clínico Consolidado
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Linha do tempo contendo evoluções, prescrições, atestados e relatórios arquivados.
            </Typography>

            {eventos.length === 0 ? (
                <Paper className="tasy-flat-panel" sx={{ p: 4, textAlign: 'center', bgcolor: '#f8f9fa' }}>
                    <Typography color="text.secondary">Nenhum registro encontrado para este paciente.</Typography>
                </Paper>
            ) : (
                <Box>
                    {eventos.map((evento, index) => (
                        <Box key={evento.id} sx={{ display: 'flex', mb: 0 }}>
                            
                            {/* Coluna da Esquerda (Ícone e Linha Conectora) */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 2, minWidth: '40px' }}>
                                <Box sx={{ 
                                    width: 36, height: 36, borderRadius: '50%', 
                                    bgcolor: `${evento.cor}.light`, color: `${evento.cor}.main`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '2px solid #fff', boxShadow: '0 0 0 1px #dee2e6', zIndex: 1
                                }}>
                                    {evento.icon}
                                </Box>
                                {/* Esconde a linha no último item para não sobrar um "rabo" */}
                                {index !== eventos.length - 1 && (
                                    <Box sx={{ width: '2px', flexGrow: 1, bgcolor: '#dee2e6', my: 0.5 }} />
                                )}
                            </Box>

                            {/* Coluna da Direita (Card de Conteúdo) */}
                            <Box sx={{ flexGrow: 1, pb: 4 }}>
                                <Paper className="tasy-flat-panel" sx={{ p: 2, '&:hover': { borderColor: '#adb5bd' }, transition: 'all 0.2s' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                <Chip label={evento.tipo} color={evento.cor} size="small" sx={{ fontWeight: 'bold', fontSize: '0.65rem', height: '20px' }} />
                                                <Typography variant="subtitle2" fontWeight="bold">
                                                    {evento.titulo}
                                                </Typography>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">
                                                {evento.data.toLocaleDateString('pt-BR')} às {evento.data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})} • Dr(a). {evento.medico}
                                            </Typography>
                                        </Box>
                                        
                                        {/* Botão de Imprimir/PDF */}
                                        {evento.pdfUrl && (
                                            <Tooltip title={`Imprimir ${evento.tipo.toLowerCase()}`}>
                                                <IconButton onClick={() => handleDownloadPdf(evento.pdfUrl)} size="small" color={evento.cor}>
                                                    <PictureAsPdfIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                    
                                    <Divider sx={{ my: 1 }} />
                                    
                                    <Typography variant="body2" color="text.primary" sx={{ 
                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' 
                                    }}>
                                        {evento.detalhes}
                                    </Typography>
                                </Paper>
                            </Box>

                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}