// src/pages/ProntuarioPage.jsx - VERSÃO COM PAINEL INTEGRADO

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { Box, CircularProgress, Typography, Modal, Divider } from '@mui/material';

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
    const [anamnese, setAnamnese] = useState(undefined); // Inicia como undefined para diferenciar de 'null' (sem anamnese)
    const [isLoading, setIsLoading] = useState(true);
    const [refreshConsultas, setRefreshConsultas] = useState(0);
    const [modalContent, setModalContent] = useState(null);

    const handleOpenModal = (contentComponent) => setModalContent(contentComponent);
    const handleCloseModal = () => setModalContent(null);

    // Esta função será chamada pelo AnamneseTab quando for salva com sucesso
    const recarregarAnamneseEAlertas = useCallback(async () => {
        try {
            const anamneseRes = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            setAnamnese(anamneseRes.data);
        } catch (err) {
            setAnamnese(null); // Define como null se não encontrar após a tentativa de salvar
        }
    }, [pacienteId]);

    // Busca os dados iniciais do paciente e da anamnese
    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const pacientePromise = apiClient.get(`/pacientes/${pacienteId}/`);
                const anamnesePromise = apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);

                const [pacienteRes] = await Promise.all([pacientePromise]);
                setPaciente(pacienteRes.data);

                try {
                    const anamneseRes = await anamnesePromise;
                    setAnamnese(anamneseRes.data);
                } catch (anamneseErr) {
                    if (anamneseErr.response && anamneseErr.response.status === 404) {
                        setAnamnese(null); // Paciente existe, mas não tem anamnese
                    }
                }
            } catch (err) {
                console.error("Erro ao buscar dados do prontuário:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [pacienteId]);


    if (isLoading || paciente === null) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }
    
    return (
        <Box> 
            <PatientHeader paciente={paciente} />
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, p: 2, gap: 2 }}>
                
                {/* === COLUNA DA ESQUERDA === */}
                <Box sx={{ width: { xs: '100%', lg: '25%' }, order: { xs: 2, lg: 1 } }}>
                    <AlertasClinicos anamnese={anamnese} />
                    <HistoricoConsultas pacienteId={pacienteId} key={refreshConsultas} />
                </Box>

                {/* === COLUNA CENTRAL === */}
                <Box sx={{ width: { xs: '100%', lg: '50%' }, order: { xs: 1, lg: 2 } }}>
                    {/* Lógica de exibição: Se não houver anamnese, mostra o formulário dela. Se houver, mostra o atendimento. */}
                    {anamnese === null && (
                        <>
                            <Typography variant="h6" color="primary" gutterBottom>Primeiro Passo: Cadastrar Anamnese</Typography>
                            <AnamneseTab pacienteId={pacienteId} onAnamneseSalva={recarregarAnamneseEAlertas} />
                            <Divider sx={{ my: 3 }} />
                        </>
                    )}
                    
                    {/* O AtendimentoTab só aparece se a anamnese já existir */}
                    {anamnese && (
                       <AtendimentoTab pacienteId={pacienteId} onEvolucaoSalva={() => setRefreshConsultas(prev => prev + 1)} />
                    )}
                </Box>

                {/* === COLUNA DA DIREITA === */}
                <Box sx={{ width: { xs: '100%', lg: '25%' }, order: { xs: 3, lg: 3 } }}>
                    <PainelAcoes 
                        onNovaPrescricao={() => handleOpenModal(<PrescricoesTab pacienteId={pacienteId} />)}
                        onEmitirAtestado={() => handleOpenModal(<AtestadosTab pacienteId={pacienteId} />)}
                        onAnexarDocumento={() => handleOpenModal(<AnexosTab pacienteId={pacienteId} />)}
                    />
                </Box>
            </Box>

            {/* Modal genérico para exibir os formulários */}
            <Modal open={!!modalContent} onClose={handleCloseModal}>
                <Box sx={modalStyle}>
                    {modalContent}
                </Box>
            </Modal>
        </Box>
    );
}