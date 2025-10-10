// src/pages/ProntuarioPage.jsx - VERSÃO FINAL COM LAYOUT DENSO

import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosConfig';
import { useAuth } from '../../hooks/useAuth'; // 1. IMPORTE O useAuth
import { Box, CircularProgress, Typography, Modal, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Importe TODOS os seus componentes
import AtendimentoCardiologia from './AtendimentoCardiologia';
import AtendimentoGeral from './AtendimentoGeral';
import PatientHeader from '../PatientHeader';
import AlertasClinicos from './AlertasClinicos';
import HistoricoConsultas from './HistoricoConsultas';
import PainelAcoes from './PainelAcoes';
import AnamneseTab from './AnamneseTab';
import PrescricoesTab from './PrescricoesTab';
import AtestadosTab from './AtestadosTab';
import AnexosTab from './AnexosTab';
import ExamesDicomTab from './ExamesDicomTab';
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

export default function ProntuarioCompleto({ pacienteId }) { 
    const { user } = useAuth(); // 3. OBTENHA O USUÁRIO LOGADO
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

    // 4. CRIE UMA FUNÇÃO PARA RENDERIZAR O COMPONENTE CERTO
    const renderAtendimentoPorEspecialidade = () => {
        // Usa a especialidade do usuário logado para decidir
        const especialidade = user?.especialidade;

        switch (especialidade) {
            case 'Cardiologia':
                return <AtendimentoCardiologia pacienteId={pacienteId} onEvolucaoSalva={forceRefresh} />;
            // No futuro, adicionaremos outros casos aqui
            // case 'Ginecologia':
            //     return <AtendimentoGinecologia pacienteId={pacienteId} onEvolucaoSalva={forceRefresh} />;
            default:
                // Para todas as outras especialidades, mostra o formulário geral
                return <AtendimentoGeral pacienteId={pacienteId} onEvolucaoSalva={forceRefresh} />;
        }
    };

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
        <AnamneseTab 
            pacienteId={pacienteId} 
            initialAnamnese={anamnese} 
            onAnamneseSalva={forceRefresh}
            
            // ▼▼▼ ADICIONE ESTA LINHA ▼▼▼
            especialidade={user?.especialidade}
        />
    </AccordionDetails>
                    </Accordion>
                    {/* 5. SUBSTITUA A CHAMADA DIRETA PELA NOVA FUNÇÃO */}
                    {renderAtendimentoPorEspecialidade()}
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