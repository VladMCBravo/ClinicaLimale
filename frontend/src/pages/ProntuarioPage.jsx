// src/pages/ProntuarioPage.jsx - VERSÃO REESTRUTURADA

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { Box, CircularProgress, Typography, Modal } from '@mui/material';

// Importe TODOS os seus componentes
import PatientHeader from '../components/PatientHeader';
import AlertasClinicos from '../components/prontuario/AlertasClinicos';
import HistoricoConsultas from '../components/prontuario/HistoricoConsultas';
import AtendimentoTab from '../components/prontuario/AtendimentoTab';
import PainelAcoes from '../components/prontuario/PainelAcoes';
import AnamneseTab from '../components/prontuario/AnamneseTab'; // <-- Importante
import PrescricoesTab from '../components/prontuario/PrescricoesTab'; // <-- Importante
import AtestadosTab from '../components/prontuario/AtestadosTab';   // <-- Importante
import AnexosTab from '../components/prontuario/AnexosTab';       // <-- Importante

// Estilo para os Modais
const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  maxWidth: '800px',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

export default function ProntuarioPage() {
    const { pacienteId } = useParams();
    const [paciente, setPaciente] = useState(null);
    const [anamnese, setAnamnese] = useState(null);
    const [precisaCriarAnamnese, setPrecisaCriarAnamnese] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshConsultas, setRefreshConsultas] = useState(0);

    // Estados para controlar os modais
    const [modalContent, setModalContent] = useState(null);

    const handleOpenModal = (contentComponent) => setModalContent(contentComponent);
    const handleCloseModal = () => setModalContent(null);

    // Função para recarregar a anamnese (será usada pelo AnamneseTab)
    const fetchAnamnese = useCallback(async () => {
        try {
            const anamneseRes = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            setAnamnese(anamneseRes.data);
            setPrecisaCriarAnamnese(false); // Já existe, não precisa criar
        } catch (err) {
            if (err.response && err.response.status === 404) {
                setAnamnese(null);
                setPrecisaCriarAnamnese(true); // NÃO EXISTE, precisa criar
            }
        }
    }, [pacienteId]);


    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const pacienteRes = await apiClient.get(`/pacientes/${pacienteId}/`);
                setPaciente(pacienteRes.data);
                await fetchAnamnese(); // Tenta buscar a anamnese
            } catch (err) {
                console.error("Erro ao buscar dados do paciente:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [pacienteId, fetchAnamnese]);

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    if (!paciente) {
        return <Typography sx={{ p: 3 }}>Paciente não encontrado.</Typography>;
    }
    
    // SE PRECISA CRIAR ANAMNESE, MOSTRA SÓ A TELA DE ANAMNESE
    if (precisaCriarAnamnese) {
        return (
            <Box>
                <PatientHeader paciente={paciente} />
                <Box sx={{ p: 2 }}>
                    <Typography variant="h5" color="error" gutterBottom>Primeiro Passo: Cadastrar Anamnese</Typography>
                    <Typography paragraph>Este paciente ainda não possui uma anamnese. Por favor, preencha os dados abaixo para continuar.</Typography>
                    {/* Passamos a função para recarregar os dados quando salvar */}
                    <AnamneseTab pacienteId={pacienteId} onAnamneseSalva={fetchAnamnese} />
                </Box>
            </Box>
        );
    }

    // SE A ANAMNESE JÁ EXISTE, MOSTRA O PAINEL COMPLETO
    return (
        <Box> 
            <PatientHeader paciente={paciente} />
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, p: 2, gap: 2 }}>
                {/* === COLUNA DA ESQUERDA === */}
                <Box sx={{ width: { xs: '100%', lg: '25%' }, flexShrink: 0 }}>
                    <AlertasClinicos anamnese={anamnese} />
                    <HistoricoConsultas pacienteId={pacienteId} key={refreshConsultas} />
                </Box>

                {/* === COLUNA CENTRAL === */}
                <Box sx={{ width: { xs: '100%', lg: '50%' }, flexGrow: 1 }}>
                    <AtendimentoTab pacienteId={pacienteId} onEvolucaoSalva={() => setRefreshConsultas(prev => prev + 1)} />
                </Box>

                {/* === COLUNA DA DIREITA === */}
                <Box sx={{ width: { xs: '100%', lg: '25%' }, flexShrink: 0 }}>
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