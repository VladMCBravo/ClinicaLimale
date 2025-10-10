// src/components/prontuario/ProntuarioCompleto.jsx - VERSÃO COM LAYOUT REFINADO

import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosConfig';
import { useAuth } from '../../hooks/useAuth';
import { Box, CircularProgress, Typography, Modal, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Importe TODOS os seus componentes
import AtendimentoCardiologia from './AtendimentoCardiologia';
import AtendimentoGeral from './AtendimentoGeral';
import PatientHeader from './PatientHeader';
import AlertasClinicos from './AlertasClinicos';
// HISTÓRICO DE CONSULTAS FOI REMOVIDO DAQUI
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
    const { user } = useAuth();
    const [paciente, setPaciente] = useState(null);
    const [anamnese, setAnamnese] = useState(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [modalContent, setModalContent] = useState(null);

    const handleOpenModal = (contentComponent) => setModalContent(contentComponent);
    const handleCloseModal = () => setModalContent(null);

    const forceRefresh = () => setRefreshKey(prev => prev + 1);

    useEffect(() => {
        const fetchAllData = async () => {
            if (!pacienteId) return; // Não faz nada se o ID for nulo
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

    const renderAtendimentoPorEspecialidade = () => {
        const especialidadePrincipal = user?.especialidades_detalhes?.[0]?.nome;

        switch (especialidadePrincipal) {
            case 'Cardiologia':
                return <AtendimentoCardiologia pacienteId={pacienteId} onEvolucaoSalva={forceRefresh} especialidade={especialidadePrincipal} />;
            default:
                return <AtendimentoGeral pacienteId={pacienteId} onEvolucaoSalva={forceRefresh} />;
        }
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}> 
            <PatientHeader paciente={paciente} />

            {/* ALERTAS CLÍNICOS AGORA FICAM EM DESTAQUE LOGO ABAIXO DO CABEÇALHO */}
            <Box sx={{ px: 2, pt: 1 }}>
                <AlertasClinicos anamnese={anamnese} />
            </Box>

            {/* NOVO LAYOUT PRINCIPAL COM DUAS COLUNAS */}
            <Box sx={{ display: 'flex', flexGrow: 1, p: 2, gap: 2, minHeight: 0 }}>
                
                {/* COLUNA CENTRAL (AGORA MAIOR) PARA ANAMNESE E EVOLUÇÃO */}
                <Box sx={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
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
                                especialidade={user?.especialidades_detalhes?.[0]?.nome}
                            />
                        </AccordionDetails>
                    </Accordion>
                    
                    {renderAtendimentoPorEspecialidade()}
                </Box>

                {/* COLUNA DA DIREITA PARA AÇÕES RÁPIDAS */}
                <Box sx={{ flex: 1, minWidth: '250px' }}>
                    <PainelAcoes 
                        onNovaPrescricao={() => handleOpenModal(<PrescricoesTab pacienteId={pacienteId} />)}
                        onEmitirAtestado={() => handleOpenModal(<AtestadosTab pacienteId={pacenteId} />)}
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