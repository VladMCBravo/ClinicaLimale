import React, { useState, useEffect, useCallback } from 'react';
import { Box, Drawer } from '@mui/material';
import { agendamentoService } from '../services/agendamentoService';

// --- COMPONENTES ---
import AgendaPrincipal from '../components/agenda/AgendaPrincipal';
import PacientesDoDiaSidebar from '../components/agenda/PacientesDoDiaSidebar';
import ListaEspera from '../components/painel/ListaEspera';
import VerificadorDisponibilidade from '../components/painel/VerificadorDisponibilidade';
import TabelaValoresModal from '../components/painel/TabelaValoresModal'; // Ajuste o caminho conforme criou
import ChatbotStatusModal from '../components/painel/ChatbotStatusModal'; // Ajuste o caminho

// --- MODAIS ---
import PacienteModal from '../components/PacienteModal';
import AgendamentoModal from '../components/AgendamentoModal';

export default function PainelRecepcaoPage() {
    // --- ESTADOS ---
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [salas, setSalas] = useState([]);

    // <--- ADICIONADO AQUI: Estado para guardar o dia clicado
    const [dataSidebar, setDataSidebar] = useState(new Date());

    // Filtros que a página segura para passar para a Agenda
    const [medicoFiltro, setMedicoFiltro] = useState('');
    const [especialidadeFiltro, setEspecialidadeFiltro] = useState('');

    const [kpis, setKpis] = useState({ hoje: 0, novos: 0, confirmar: 0 });
    const [loadingKpis, setLoadingKpis] = useState(true);

    // Modais
    const [isPacienteModalOpen, setIsPacienteModalOpen] = useState(false);
    const [isAgendamentoModalOpen, setIsAgendamentoModalOpen] = useState(false);
    const [isCaixaModalOpen, setIsCaixaModalOpen] = useState(false);
    const [isDispoOpen, setIsDispoOpen] = useState(false);
    const [isValoresModalOpen, setIsValoresModalOpen] = useState(false);

    const [editingEvent, setEditingEvent] = useState(null);
    const [initialData, setInitialData] = useState(null);
    const [nomeNovoPaciente, setNomeNovoPaciente] = useState('');
    const [isChatbotModalOpen, setIsChatbotModalOpen] = useState(false);

    // Carrega SALAS
    useEffect(() => {
        agendamentoService.getSalas()
            .then(res => setSalas(res.data))
            .catch(err => console.error("Falha ao buscar salas", err));
    }, []);

    // Carrega KPIs (Números do Topo) - CORREÇÃO AQUI
    useEffect(() => {
        setLoadingKpis(true);
        agendamentoService.getDashboardKPIs()
            .then(res => {
                // Mapeia os nomes que vêm do backend para os nomes usados no layout
                setKpis({
                    hoje: res.data.agendamentos_hoje_count || res.data.hoje || 0,
                    novos: res.data.pacientes_novos_mes_count || res.data.novos || 0,
                    confirmar: res.data.consultas_a_confirmar_count || res.data.confirmar || 0
                });
            })
            .catch(err => console.error("Erro ao carregar KPIs:", err))
            .finally(() => setLoadingKpis(false));
    }, [refreshTrigger]);

    const forceRefresh = () => setRefreshTrigger(prev => prev + 1);

    // Handlers
    const handleCloseAgendamentoModal = () => { setIsAgendamentoModalOpen(false); setEditingEvent(null); setInitialData(null); };
    const handleAgendamentoSave = () => { handleCloseAgendamentoModal(); forceRefresh(); };
    
    const handleDateClick = (arg) => { 
        setDataSidebar(arg.date); // <--- ADICIONADO AQUI
        setEditingEvent(null); 
        setInitialData({ start: arg.date, resource: arg.resource }); 
        setIsAgendamentoModalOpen(true); 
    };
    
    // Este handler é chamado quando clicamos em "Editar" no menu do card
    const handleEventClick = (clickInfo) => { 
    // Trocamos o nome da variável de "event" para "eventoSelecionado"
    const eventoSelecionado = clickInfo.event || clickInfo;
    
    // Fallback: Se não achar o start, tenta usar a string que vem da API, ou a data atual
    const dataParaSidebar = eventoSelecionado.start || new Date(eventoSelecionado.data_hora_inicio || Date.now());
    
    setDataSidebar(dataParaSidebar);
    setInitialData(null); 
    setEditingEvent(eventoSelecionado); 
    setIsAgendamentoModalOpen(true); 
};

// NOVO HANDLER BLINDADO CONTRA LOOP INFINITO
    const handleDatesSet = useCallback((dateInfo) => {
        const novaData = dateInfo.view.currentStart;
        
        setDataSidebar((dataAntiga) => {
        // --- NOVA BLINDAGEM: Se dataAntiga for null/undefined, apenas assume a nova data ---
        if (!dataAntiga) return novaData;

        // O Freio: Se o dia for exatamente o mesmo, aborta a atualização!
        if (dataAntiga.toDateString() === novaData.toDateString()) {
            return dataAntiga; // Mantém o estado intacto, evitando re-render
        }
        return novaData; // Se mudou o dia, aí sim ele atualiza
    });
}, []);

    const handleFiltroChange = (filtros) => { setMedicoFiltro(filtros.medicoId); setEspecialidadeFiltro(filtros.especialidadeId); };

    // --- FUNÇÃO ATUALIZADA PARA RECEBER OS DADOS DO NOVO DRAWER ---
    const handleSlotSelect = (payload) => {
        setIsDispoOpen(false); // 1. Fecha o menu lateral
        
        // 2. Preenche o initialData EXATAMENTE com as chaves que o Drawer enviou
        setInitialData({
             start: payload.start, 
             medicoId: payload.medicoId,
             especialidadeId: payload.especialidadeId
        });
        
        // 3. Abre o modal (que agora vai ler esse medicoId e puxar os dados)
        setIsAgendamentoModalOpen(true);
    };

    const handleAbrirNovoPaciente = (nomeDigitado) => {
    setNomeNovoPaciente(nomeDigitado);
    setIsPacienteModalOpen(true);
    };

    return (
        <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', p: 1, gap: 1, backgroundColor: '#f4f6f8', overflow: 'hidden' }}>
            
            {/* --- LATERAL ESQUERDA (Listas) --- */}
            <Box sx={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
                <Box sx={{ flex: 1.5, minHeight: 0, overflow: 'hidden' }}>
                    {/* <--- ADICIONADO AQUI: Passando a dataSidebar como prop */}
                    <PacientesDoDiaSidebar refreshTrigger={refreshTrigger} medicoFiltro={medicoFiltro} dataSelecionada={dataSidebar} />
                </Box>
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <ListaEspera refreshTrigger={refreshTrigger} onAgendamentoSelect={handleEventClick} />
                </Box>
            </Box>

            {/* --- ÁREA PRINCIPAL --- */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

                {/* ================================================================================
                    AGENDA — navegação, KPIs, filtros e ações, tudo numa barra só dentro do AgendaPrincipal
                    ================================================================================
                */}
                <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden', borderRadius: '8px', border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', bgcolor: '#fff' }}>
                    <AgendaPrincipal
                        medicoFiltro={medicoFiltro}
                        especialidadeFiltro={especialidadeFiltro}
                        onDateClick={handleDateClick}
                        onEventClick={handleEventClick}
                        onDatesSet={handleDatesSet}  // <--- ADICIONE ESTA LINHA AQUI
                        salas={salas}
                        refreshTrigger={refreshTrigger}
                        onFiltroChange={handleFiltroChange}
                        kpis={kpis}
                        loadingKpis={loadingKpis}
                        onNovoPaciente={() => setIsPacienteModalOpen(true)}
                        onBuscarHorario={() => setIsDispoOpen(true)}
                        onTabelaPrecos={() => setIsValoresModalOpen(true)}
                        onStatusWhatsapp={() => setIsChatbotModalOpen(true)}
                        onEditarPaciente={(pacienteId) => {
                            // Lógica para abrir o seu PacienteModal em modo de edição
                            setPacienteSelecionadoId(pacienteId);
                            setOpenPacienteModal(true);
                        }}
                    />
                </Box>
            </Box>
            
            {/* --- MODAIS INVISÍVEIS --- */}
            <Drawer anchor="left" open={isDispoOpen} onClose={() => setIsDispoOpen(false)}>
                <Box sx={{ width: 350, p: 2, height: '100%', bgcolor: '#f5f5f5' }}>
                    <VerificadorDisponibilidade onSlotSelect={handleSlotSelect} />
                </Box>
            </Drawer>
            <PacienteModal 
                open={isPacienteModalOpen} 
                onClose={() => {
                    setIsPacienteModalOpen(false);
                    setNomeNovoPaciente(''); // Limpa o nome ao fechar
                }} 
                onSave={() => { setIsPacienteModalOpen(false); forceRefresh(); setNomeNovoPaciente(''); }} 
                pacienteParaEditar={null} 
                nomeInicial={nomeNovoPaciente} // <--- A MÁGICA AQUI
            />
            <AgendamentoModal 
                open={isAgendamentoModalOpen} 
                onClose={handleCloseAgendamentoModal} 
                onSave={handleAgendamentoSave} 
                initialData={initialData} 
                editingEvent={editingEvent}
                onAbrirNovoPaciente={handleAbrirNovoPaciente} 
                refreshTrigger={refreshTrigger} // <--- ADICIONE APENAS ESTA LINHA AQUI
            />

            {/* NOVO MODAL */}
            <TabelaValoresModal 
                open={isValoresModalOpen} 
                onClose={() => setIsValoresModalOpen(false)} 
            />
            {/* MODAL DO QR CODE DO WHATSAPP */}
            <ChatbotStatusModal
                open={isChatbotModalOpen}
                onClose={() => setIsChatbotModalOpen(false)}
            />
        </Box>
    );
}