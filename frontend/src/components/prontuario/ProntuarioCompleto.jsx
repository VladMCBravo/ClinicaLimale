// src/components/prontuario/ProntuarioCompleto.jsx - VERSÃO FINAL E CORRIGIDA

import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosConfig';
import { useAuth } from '../../hooks/useAuth';
import { Box, CircularProgress, Typography, Modal, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Seus componentes
import PatientHeader from '../PatientHeader'; 
import VideoCallView from '../telemedicina/VideoCallView';
import AlertasClinicos from './AlertasClinicos';
import PainelAcoes from './PainelAcoes';
import AnamneseTab from './AnamneseTab';
import EvolucoesTab from './EvolucoesTab';
import PrescricoesTab from './PrescricoesTab';
import AtestadosTab from './AtestadosTab';
import AnexosTab from './AnexosTab';
import ExamesDicomTab from './ExamesDicomTab';

const modalStyle = {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)', width: '80%',
    maxWidth: '800px', bgcolor: 'background.paper',
    border: '1px solid #000', boxShadow: 24, p: 4,
    maxHeight: '90vh', overflowY: 'auto'
};

export default function ProntuarioCompleto({ agendamento }) {  
    const { showSnackbar } = useSnackbar();
    const { user } = useAuth();
    const [paciente, setPaciente] = useState(null);
    const [anamnese, setAnamnese] = useState(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [modalContent, setModalContent] = useState(null);
    const [isTelemedicinaActive, setIsTelemedicinaActive] = useState(false);
    
    const pacienteId = agendamento?.paciente;

    const handleOpenModal = (contentComponent) => setModalContent(contentComponent);
    const handleCloseModal = () => setModalContent(null);
    const forceRefresh = () => setRefreshKey(prev => prev + 1);

    useEffect(() => {
        const fetchAllData = async () => {
            if (!pacienteId) { setIsLoading(false); return; }
            setIsLoading(true);
            try {
                const pacientePromise = apiClient.get(`/pacientes/${pacienteId}/`);
                const anamnesePromise = apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`).catch(() => ({ data: null }));
                const [pacienteRes, anamneseRes] = await Promise.all([pacientePromise, anamnesePromise]);
                
                setPaciente(pacienteRes.data);
                setAnamnese(anamneseRes.data);
            } catch (err) {
                console.error("Erro ao buscar dados do prontuário:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, [pacienteId, refreshKey]);

    const handleStartTelemedicina = () => {
        if (agendamento?.link_telemedicina) {
            setIsTelemedicinaActive(true);
        } else {
            showSnackbar('A sala de telemedicina ainda não foi criada.', 'warning');
        }
    };
    const handleCloseTelemedicina = () => setIsTelemedicinaActive(false);

    if (isLoading || !user) {
        return <CircularProgress />;
    }

    // --- LAYOUT DE TELEMEDICINA (LIMPO E FUNCIONAL) ---
    if (isTelemedicinaActive) {
        return (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <PatientHeader paciente={paciente} agendamento={agendamento} onStartTelemedicina={() => {}} isTelemedicinaActive={true} />
                <Box sx={{ display: 'flex', flexGrow: 1, gap: 2, p: 2, minHeight: 0 }}>
                    <Box sx={{ flex: 1 }}>
                        <VideoCallView roomUrl={agendamento.link_telemedicina} onClose={handleCloseTelemedicina} />
                    </Box>
                    <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Em telemedicina, o foco é a evolução do dia */}
                        <EvolucoesTab pacienteId={pacienteId} />
                    </Box>
                </Box>
            </Box>
        );
    } 

    // --- LAYOUT NORMAL (LIMPO E FUNCIONAL) ---
    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}> 
            <PatientHeader paciente={paciente} agendamento={agendamento} onStartTelemedicina={handleStartTelemedicina} />

            <Box sx={{ px: 2, pt: 1 }}>
                <AlertasClinicos anamnese={anamnese} />
            </Box>

            <Box sx={{ display: 'flex', flexGrow: 1, p: 2, gap: 2, minHeight: 0 }}>
                {/* Coluna Central do Prontuário */}
                <Box sx={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    
                    {/* 1. Anamnese (recolhida se já existir) */}
                    <Accordion defaultExpanded={!anamnese}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Anamnese</Typography>
                            {!anamnese && <Typography color="error" sx={{ml:1}}>(Pendente)</Typography>}
                        </AccordionSummary>
                        <AccordionDetails>
                            <AnamneseTab 
                                pacienteId={pacienteId} 
                                initialAnamnese={anamnese}
                                onAnamneseSalva={forceRefresh}
                                especialidade={agendamento?.especialidade_nome || user?.especialidades_detalhes?.[0]?.nome}
                            />
                        </AccordionDetails>
                    </Accordion>

                    {/* 2. Evolução do Dia (Formulário limpo + Histórico) */}
                    <EvolucoesTab pacienteId={pacienteId} />
                </Box>

                {/* Coluna Direita de Ações Rápidas */}
                <Box sx={{ flex: 1, minWidth: '250px' }}>
                    <PainelAcoes 
                        onNovaPrescricao={() => handleOpenModal(<PrescricoesTab pacienteId={pacienteId} />)}
                        onEmitirAtestado={() => handleOpenModal(<AtestadosTab pacienteId={pacienteId} />)}
                        onAnexarDocumento={() => handleOpenModal(<AnexosTab pacienteId={pacienteId} />)}
                        onVerExames={() => handleOpenModal(<ExamesDicomTab pacienteId={pacienteId} />)}
                    />
                </Box>
            </Box>

            <Modal open={!!modalContent} onClose={handleCloseModal}>
                <Box sx={modalStyle}>{modalContent}</Box>
            </Modal>
        </Box>
    );
}