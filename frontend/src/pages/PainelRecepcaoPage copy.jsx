// src/pages/PainelRecepcaoPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, CircularProgress, Drawer } from '@mui/material';
import apiClient from '../api/axiosConfig';

// Importações
import BarraStatus from '../components/painel/BarraStatus';
import AgendaPrincipal from '../components/agenda/AgendaPrincipal';
import PacientesDoDiaSidebar from '../components/agenda/PacientesDoDiaSidebar';
import ListaEspera from '../components/painel/ListaEspera';
import ChatPanel from '../components/chat/ChatPanel'; // <-- IMPORTE SEU NOVO COMPONENTE
import PacienteModal from '../components/PacienteModal';
import AgendamentoModal from '../components/AgendamentoModal';
import VerificadorDisponibilidade from '../components/painel/VerificadorDisponibilidade';
import LancamentoCaixaModal from '../components/financeiro/LancamentoCaixaModal'; // <-- ESTA LINHA ESTAVA FALTANDO
import ControlesAgenda from '../components/painel/ControlesAgenda';

export default function PainelRecepcaoPage() {
    // --- ESTADOS GERAIS ---
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshSidebar, setRefreshSidebar] = useState(0);

    // --- ESTADOS DOS FILTROS ---
    const [medicoFiltro, setMedicoFiltro] = useState('');
    const [especialidadeFiltro, setEspecialidadeFiltro] = useState('');

    // --- ESTADOS DOS MODAIS E DRAWERS ---
    const [isListaEsperaOpen, setIsListaEsperaOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false); // <-- ADICIONE ESTA LINHA
    const [isPacienteModalOpen, setIsPacienteModalOpen] = useState(false);
    const [isAgendamentoModalOpen, setIsAgendamentoModalOpen] = useState(false);
    const [agendamentoInitialData, setAgendamentoInitialData] = useState(null);
    const [isCaixaModalOpen, setIsCaixaModalOpen] = useState(false);

    // --- HANDLERS E FUNÇÕES ---
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get('/dashboard/');
            setData(response.data);
        } catch (error) {
            console.error("Erro ao carregar dados do painel:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleFiltroChange = (filtros) => {
        setMedicoFiltro(filtros.medicoId);
        setEspecialidadeFiltro(filtros.especialidadeId);
    };

    const handleModalSave = () => {
        setIsPacienteModalOpen(false);
        setIsAgendamentoModalOpen(false);
        fetchData(); 
        setRefreshSidebar(prev => prev + 1);
    };
    
    const handleSlotSelect = (data) => {
        setAgendamentoInitialData({
            start: data.data_hora_inicio.toDate(),
            medico: data.medico,
            especialidade: data.especialidade,
        });
        setIsAgendamentoModalOpen(true);
    };

    if (isLoading || !data) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ p: 3, backgroundColor: '#f4f6f8', height: 'calc(100vh - 64px)', display: 'flex', gap: 3, overflow: 'hidden' }}>
            
            {/* Coluna da Esquerda agora mais compacta */}
            <Box sx={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                
                {/* SUBSTITUÍMOS OS DOIS COMPONENTES ANTIGOS PELO NOVO */}
                <ControlesAgenda
                    onNovoPacienteClick={() => setIsPacienteModalOpen(true)}
                    onCaixaClick={() => setIsCaixaModalOpen(true)}
                    onFiltroChange={handleFiltroChange}
                />
                
                {/* Este Box agora tem mais espaço vertical disponível */}
                <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                    <PacientesDoDiaSidebar 
                        refreshTrigger={refreshSidebar} 
                        medicoFiltro={medicoFiltro}
                    />
                </Box>
            </Box>

            <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <VerificadorDisponibilidade onSlotSelect={handleSlotSelect} />
                <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                    <AgendaPrincipal medicoFiltro={medicoFiltro} especialidadeFiltro={especialidadeFiltro} onSave={handleModalSave} />
                </Box>
            </Box>

            <Box sx={{ flexShrink: 0 }}>
                <BarraStatus
                    data={data}
                    onListaEsperaClick={() => setIsListaEsperaOpen(false)}
                    onChatClick={() => setIsChatOpen(true)} // <-- ADICIONE ESTA LINHA
                />
            </Box>
            
            <Drawer anchor="right" open={isListaEsperaOpen} onClose={() => setIsListaEsperaOpen(false)}>
                <Box sx={{ width: 400, p: 2 }}><ListaEspera /></Box>
            </Drawer>
                {/* ADICIONE O NOVO DRAWER DO CHAT AQUI */}
            <Drawer anchor="right" open={isChatOpen} onClose={() => setIsChatOpen(false)}>
                <Box sx={{ width: 450, height: '100%' }}>
                    <ChatPanel />
                </Box>
            </Drawer>
            <PacienteModal
                open={isPacienteModalOpen}
                onClose={() => setIsPacienteModalOpen(false)}
                onSave={handleModalSave}
                pacienteParaEditar={null}
            />

            <AgendamentoModal
                open={isAgendamentoModalOpen}
                onClose={() => setIsAgendamentoModalOpen(false)}
                onSave={handleModalSave}
                initialData={agendamentoInitialData}
            />
            
            <LancamentoCaixaModal 
                open={isCaixaModalOpen} 
                onClose={() => setIsCaixaModalOpen(false)} 
            />
        </Box>
    );
}