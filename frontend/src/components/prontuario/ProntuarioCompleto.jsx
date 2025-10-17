// src/components/prontuario/ProntuarioCompleto.jsx - VERSÃO FINAL CORRIGIDA

import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosConfig';
import { useAuth } from '../../hooks/useAuth';
import { Box, CircularProgress, Typography, Modal, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Seus componentes
import PatientHeader from '../PatientHeader'; 
import VideoCallView from '../telemedicina/VideoCallView';
import DetalheConsultaModal from './DetalheConsultaModal';
import AnamneseTab from './AnamneseTab';
import EvolucoesTab from './EvolucoesTab';
import PainelAcoes from './PainelAcoes';
import PrescricoesTab from './PrescricoesTab';
import AtestadosTab from './AtestadosTab';
import AnexosTab from './AnexosTab';
import ExamesDicomTab from './ExamesDicomTab';
import AlertasClinicos from './AlertasClinicos';

const modalStyle = {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)', width: '80%',
    maxWidth: '800px', bgcolor: 'background.paper',
    border: '1px solid #000', boxShadow: 24, p: 4,
    maxHeight: '90vh', overflowY: 'auto'
};

// 1. O componente agora recebe as props para controlar o modal de histórico
export default function ProntuarioCompleto({ agendamento, modalHistoricoId, onCloseHistoricoModal }) {  
    const { showSnackbar } = useSnackbar();
    const { user } = useAuth();
    const [paciente, setPaciente] = useState(null);
    const [anamnese, setAnamnese] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isTelemedicinaActive, setIsTelemedicinaActive] = useState(false);
    
    // Estado para o modal de AÇÕES (o de histórico foi removido daqui)
    const [modalAcoes, setModalAcoes] = useState(null);
    
    const pacienteId = agendamento?.paciente;
    
    const forceRefresh = () => setRefreshKey(prev => prev + 1);

    useEffect(() => {
        const fetchAllData = async () => {
            if (!pacienteId) { setIsLoading(false); return; }
            setIsLoading(true);
            try {
                const [pacienteRes, anamneseRes] = await Promise.all([
                    apiClient.get(`/pacientes/${pacienteId}/`),
                    apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`).catch(() => ({ data: null }))
                ]);
                setPaciente(pacienteRes.data);
                setAnamnese(anamneseRes.data);
            } catch (err) {
                console.error("Erro ao buscar dados do prontuário:", err);
                showSnackbar('Erro ao carregar dados do paciente.', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, [pacienteId, refreshKey, showSnackbar]);

    const handleStartTelemedicina = () => {
        if (agendamento?.link_telemedicina) setIsTelemedicinaActive(true);
        else showSnackbar('A sala de telemedicina ainda não foi criada.', 'warning');
    };
    const handleCloseTelemedicina = () => setIsTelemedicinaActive(false);

    const handleOpenAcoesModal = (content) => setModalAcoes(content);
    const handleCloseAcoesModal = () => setModalAcoes(null);
    
    // 2. AS FUNÇÕES DUPLICADAS E O ESTADO DO MODAL DE HISTÓRICO FORAM REMOVIDOS DESTE ARQUIVO

    if (isLoading || !user) {
        return <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}><CircularProgress /></Box>;
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

   // --- LAYOUT DO PRONTUÁRIO (SEM A COLUNA ESQUERDA) ---
    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}> 
            <PatientHeader 
                paciente={paciente} 
                agendamento={agendamento} 
                onStartTelemedicina={handleStartTelemedicina}
            />
            
            <Box sx={{ display: 'flex', flexGrow: 1, p: 2, gap: 2, minHeight: 0 }}>
                {/* Coluna Central: Anamnese e Evolução do Dia */}
                <Box sx={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
                    <AlertasClinicos anamnese={anamnese} />
                    <Accordion defaultExpanded={!anamnese}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Anamnese Geral</Typography>
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
                    <EvolucoesTab pacienteId={pacienteId} onEvolucaoSalva={forceRefresh} />
                </Box>

                {/* Coluna Direita: Ações Rápidas */}
                <Box sx={{ flex: 1.5, minWidth: '280px' }}>
                    <PainelAcoes 
                        onNovaPrescricao={() => handleOpenAcoesModal(<PrescricoesTab pacienteId={pacienteId} />)}
                        onEmitirAtestado={() => handleOpenAcoesModal(<AtestadosTab pacienteId={pacienteId} />)}
                        onAnexarDocumento={() => handleOpenAcoesModal(<AnexosTab pacienteId={pacienteId} />)}
                        onVerExames={() => handleOpenAcoesModal(<ExamesDicomTab pacienteId={pacienteId} />)}
                    />
                </Box>
            </Box>

            {/* Modal para Ações Rápidas */}
            <Modal open={!!modalAcoes} onClose={handleCloseAcoesModal}>
                <Box sx={modalStyle}>{modalAcoes}</Box>
            </Modal>
            
            {/* 3. Modal para o Histórico de Consultas (agora controlado por props) */}
            <Modal open={!!modalHistoricoId} onClose={onCloseHistoricoModal}>
                <Box sx={modalStyle}>
                    <DetalheConsultaModal pacienteId={pacienteId} evolucaoId={modalHistoricoId} />
                </Box>
            </Modal>
        </Box>
    );
}