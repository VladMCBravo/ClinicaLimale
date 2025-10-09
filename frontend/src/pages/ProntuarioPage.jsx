// src/pages/ProntuarioPage.jsx - VERSÃO FINAL COM LAYOUT DENSO

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { Box, CircularProgress, Typography, Modal, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Importe TODOS os seus componentes
import PatientHeader from '../components/PatientHeader';
import AlertasClinicos from '../components/prontuario/AlertasClinicos';
import HistoricoConsultas from '../components/prontuario/HistoricoConsultas';
import AtendimentoTab from '../components/prontuario/AtendimentoTab';
import PainelAcoes from '../components/prontuario/PainelAcoes';
import AnamneseTab from '../components/prontuario/AnamneseTab';
import PrescricoesTab from '../components/prontuario/PrescricoesTab';
import AtestadosTab from '../components/prontuario/AtestadosTab';
import AnexosTab from '../components/prontuario/AnexosTab';
import ExamesDicomTab from '../components/prontuario/ExamesDicomTab';
const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  maxWidth: '800px',
  bgcolor: 'background.paper',
  border: '1px solid #000',
  boxShadow: 24,
  p: 4,
  maxHeight: '90vh',
  overflowY: 'auto'
};

export default function ProntuarioPage() {
    const { pacienteId } = useParams();
    const [paciente, setPaciente] = useState(null);
    const [anamnese, setAnamnese] = useState(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0); // Chave para forçar refresh
    const [modalContent, setModalContent] = useState(null);

    const handleOpenModal = (contentComponent) => setModalContent(contentComponent);
    const handleCloseModal = () => setModalContent(null);

    const forceRefresh = () => setRefreshKey(prev => prev + 1);

    useEffect(() => {
        const fetchAllData = async () => {
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

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box> 
            <PatientHeader paciente={paciente} />
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, p: 2, gap: 2 }}>
                
                <Box sx={{ width: { xs: '100%', lg: '25%' }, order: { xs: 2, lg: 1 } }}>
                    <AlertasClinicos anamnese={anamnese} />
                    <HistoricoConsultas pacienteId={pacienteId} key={`hist-${refreshKey}`} />
                </Box>

                <Box sx={{ width: { xs: '100%', lg: '50%' }, order: { xs: 1, lg: 2 } }}>
                    {/* NOVO: Anamnese dentro de um Accordion (Sanfona) */}
                    <Accordion defaultExpanded={!anamnese} sx={{ mb: 2 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Anamnese</Typography>
                            {!anamnese && <Typography color="error" sx={{ml:1}}>(Pendente)</Typography>}
                        </AccordionSummary>
                        <AccordionDetails>
                            {/* Passamos os dados da anamnese para o componente filho */}
                            <AnamneseTab pacienteId={pacienteId} initialAnamnese={anamnese} onAnamneseSalva={forceRefresh} />
                        </AccordionDetails>
                    </Accordion>
                    
                    {/* O formulário de Atendimento/Evolução agora está sempre visível */}
                    <AtendimentoTab pacienteId={pacienteId} onEvolucaoSalva={forceRefresh} />
                </Box>

                <Box sx={{ width: { xs: '100%', lg: '25%' }, order: { xs: 3, lg: 3 } }}>
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