// src/pages/PainelMedico/ProntuarioContainer.jsx

import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, CircularProgress, Tabs, Tab } from '@mui/material';

// Importe seus componentes de prontuário existentes
import AlertasClinicos from '../../components/prontuario/AlertasClinicos';
import HistoricoConsultas from '../../components/prontuario/HistoricoConsultas';
import AtendimentoGeral from '../../components/prontuario/AtendimentoGeral';

// Vamos precisar de um service para o prontuário. (Ver Passo 5)
import { prontuarioService } from '../../services/prontuarioService'; 

// Componente para o conteúdo de cada aba
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

export default function ProntuarioContainer({ agendamentoSelecionado }) {
    const [prontuarioData, setProntuarioData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        // Se um novo agendamento for selecionado, busca os dados.
        if (agendamentoSelecionado) {
            const fetchProntuario = async () => {
                setIsLoading(true);
                setProntuarioData(null); // Limpa dados antigos
                try {
                    // Usaremos uma função do service para buscar tudo de uma vez
                    const response = await prontuarioService.getAnamnese(agendamentoSelecionado.paciente.id);
                    setProntuarioData(response.data);
                } catch (error) {
                    console.error("Erro ao buscar dados do prontuário:", error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchProntuario();
        } else {
            setProntuarioData(null); // Limpa se nenhum paciente estiver selecionado
        }
    }, [agendamentoSelecionado]); // Este efeito roda toda vez que 'agendamentoSelecionado' muda

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    // Se nenhum agendamento foi selecionado, mostra tela inicial.
    if (!agendamentoSelecionado) {
        return (
            <Paper variant="outlined" sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                    Selecione um paciente para iniciar o atendimento
                </Typography>
            </Paper>
        );
    }

    // Se estiver carregando os dados, mostra um spinner.
    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    // Se os dados foram carregados, mostra o prontuário.
    return (
        <Paper variant="outlined" sx={{ height: '100%', overflowY: 'auto' }}>
            {/* Cabeçalho com Nome e Alertas Clínicos */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h5">{agendamentoSelecionado.paciente_nome}</Typography>
                {prontuarioData && <AlertasClinicos anamnese={prontuarioData} />}
            </Box>

            {/* Abas para organizar o conteúdo */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={handleTabChange}>
                    <Tab label="Atendimento Atual" />
                    <Tab label="Histórico" />
                    <Tab label="Prescrições" />
                    <Tab label="Atestados" />
                </Tabs>
            </Box>

            {/* Conteúdo das Abas */}
            <TabPanel value={activeTab} index={0}>
                <AtendimentoGeral pacienteId={agendamentoSelecionado.paciente.id} />
                {/* Futuramente, aqui entrará a lógica para carregar AtendimentoCardiologia, etc. */}
            </TabPanel>
            <TabPanel value={activeTab} index={1}>
                <HistoricoConsultas pacienteId={agendamentoSelecionado.paciente.id} />
            </TabPanel>
            <TabPanel value={activeTab} index={2}>
                <Typography>Área de Prescrições (a ser construída)</Typography>
            </TabPanel>
            <TabPanel value={activeTab} index={3}>
                <Typography>Área de Atestados (a ser construída)</Typography>
            </TabPanel>
        </Paper>
    );
}