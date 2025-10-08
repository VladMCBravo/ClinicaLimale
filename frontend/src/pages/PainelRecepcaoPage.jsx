// src/pages/PainelRecepcaoPage.jsx
import React, { useState } from 'react';
import { Box } from '@mui/material';

// Importações dos componentes
import AgendaPrincipal from '../components/agenda/AgendaPrincipal';
import PacientesDoDiaSidebar from '../components/agenda/PacientesDoDiaSidebar';
import ListaEspera from '../components/painel/ListaEspera';
import ControlesAgenda from '../components/painel/ControlesAgenda';

// Importações dos Modais
import PacienteModal from '../components/PacienteModal';
import AgendamentoModal from '../components/AgendamentoModal'; // O modal já está na AgendaPrincipal

export default function PainelRecepcaoPage() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [medicoFiltro, setMedicoFiltro] = useState('');
    const [especialidadeFiltro, setEspecialidadeFiltro] = useState('');
    const [isPacienteModalOpen, setIsPacienteModalOpen] = useState(false);

    const handleFiltroChange = (filtros) => {
        setMedicoFiltro(filtros.medicoId);
        setEspecialidadeFiltro(filtros.especialidadeId);
    };

    const handleModalSave = () => {
        setIsPacienteModalOpen(false);
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <Box sx={{ 
            height: 'calc(100vh - 64px)', 
            display: 'flex', 
            gap: 2, 
            p: 2,
            backgroundColor: '#f4f6f8' 
        }}>
            
            {/* COLUNA DA ESQUERDA (SIDEBAR) */}
            <Box sx={{
                width: 350,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 2
            }}>
                <ControlesAgenda
                    onNovoPacienteClick={() => setIsPacienteModalOpen(true)}
                    onFiltroChange={handleFiltroChange}
                />
                
                <Box sx={{ flex: 1, minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
                    <PacientesDoDiaSidebar 
                        refreshTrigger={refreshTrigger} 
                        medicoFiltro={medicoFiltro}
                    />
                </Box>

                <Box sx={{ flex: 1, minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
                     <ListaEspera />
                </Box>
            </Box>

            {/* COLUNA DIREITA (AGENDA PRINCIPAL) */}
            <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                <AgendaPrincipal 
                    medicoFiltro={medicoFiltro} 
                    especialidadeFiltro={especialidadeFiltro} 
                    onSave={handleModalSave} 
                />
            </Box>

            {/* MODAIS GLOBAIS DA PÁGINA */}
            <PacienteModal
                open={isPacienteModalOpen}
                onClose={() => setIsPacienteModalOpen(false)}
                onSave={handleModalSave}
                pacienteParaEditar={null}
            />
        </Box>
    );
}