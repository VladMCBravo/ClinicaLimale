// src/pages/ConfiguracoesPage.jsx
import React, { useState } from 'react';
import { 
    Box, Typography, Tabs, Tab, Paper, Container, Divider, useTheme
} from '@mui/material';
import { 
    ManageAccounts, // Ícone para Usuários
    MedicalServices, // Ícone para Serviços
    AttachMoney, // Ícone para Financeiro
    ListAlt, // Ícone para Lista
    LocalHospital // Ícone para Hospital
} from '@mui/icons-material';

// --- IMPORTS DOS SEUS COMPONENTES ---
// Ajuste os caminhos conforme sua estrutura de pastas
import UsuariosTab from '../components/configuracoes/UsuariosTab'; // (Assumindo que você extraiu o código antigo para este componente)
import CategoriasTab from '../components/configuracoes/CategoriasTab'; // (Assumindo que você extraiu o código antigo)
import ProcedimentosView from '../components/financeiro/ProcedimentosView';
import EspecialidadesPage from './EspecialidadesPage'; // Ou '../components/configuracoes/EspecialidadesList'

// Componente auxiliar para o conteúdo das abas
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other} style={{ width: '100%' }}>
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
}

export default function ConfiguracoesPage() {
    const theme = useTheme();
    const [mainTab, setMainTab] = useState(0);
    const [medicalTab, setMedicalTab] = useState(0); // Controle da sub-aba (Procedimentos vs Especialidades)

    const handleMainTabChange = (event, newValue) => setMainTab(newValue);
    const handleMedicalTabChange = (event, newValue) => setMedicalTab(newValue);

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* CABEÇALHO */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a233b', letterSpacing: '-0.5px' }}>
                    Configurações
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Gerencie o sistema, serviços médicos e parâmetros financeiros.
                </Typography>
            </Box>
            
            <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                {/* ABAS PRINCIPAIS */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8f9fa' }}>
                    <Tabs 
                        value={mainTab} 
                        onChange={handleMainTabChange} 
                        textColor="primary"
                        indicatorColor="primary"
                        sx={{ 
                            '& .MuiTab-root': { 
                                fontWeight: 600, 
                                minHeight: 64,
                                textTransform: 'none',
                                fontSize: '1rem'
                            } 
                        }}
                    >
                        <Tab icon={<ManageAccounts />} iconPosition="start" label="Usuários e Acesso" />
                        <Tab icon={<MedicalServices />} iconPosition="start" label="Serviços Médicos" />
                        <Tab icon={<AttachMoney />} iconPosition="start" label="Financeiro" />
                    </Tabs>
                </Box>

                {/* CONTEÚDO */}
                <Box sx={{ p: 3, minHeight: 400 }}>
                    
                    {/* ABA 0: USUÁRIOS (Seu código existente) */}
                    <TabPanel value={mainTab} index={0}>
                         {/* Se você ainda não extraiu o código da versão anterior para um arquivo separado, 
                             pode colar o componente <UsuariosTab /> aqui ou importá-lo. */}
                         <UsuariosTab />
                    </TabPanel>

                    {/* ABA 1: SERVIÇOS MÉDICOS (UNIFICADA) */}
                    <TabPanel value={mainTab} index={1}>
                        <Box sx={{ mb: 3 }}>
                            {/* Toggle Switch para Sub-abas (Estilo "Pill") */}
                            <Paper 
                                elevation={0} 
                                sx={{ 
                                    border: '1px solid #ddd', 
                                    borderRadius: 3, 
                                    p: 0.5, 
                                    display: 'inline-flex', 
                                    bgcolor: '#f5f5f5' 
                                }}
                            >
                                <Tabs 
                                    value={medicalTab} 
                                    onChange={handleMedicalTabChange}
                                    sx={{ 
                                        minHeight: 40,
                                        '& .MuiTab-root': { 
                                            minHeight: 40, 
                                            borderRadius: 2.5, 
                                            zIndex: 1, 
                                            px: 3,
                                            textTransform: 'none',
                                            fontWeight: 600
                                        },
                                        '& .Mui-selected': { 
                                            bgcolor: 'white', 
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            color: theme.palette.primary.main
                                        },
                                        '& .MuiTabs-indicator': { display: 'none' }
                                    }}
                                >
                                    <Tab label="Procedimentos & TUSS" icon={<ListAlt fontSize="small" sx={{mr: 1}}/>} iconPosition="start"/>
                                    <Tab label="Especialidades" icon={<LocalHospital fontSize="small" sx={{mr: 1}}/>} iconPosition="start"/>
                                </Tabs>
                            </Paper>
                        </Box>

                        {medicalTab === 0 && (
                            <Box className="animate-fade-in">
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="h6" fontWeight="bold">Tabela de Procedimentos</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Gerencie códigos TUSS, valores particulares e preços por convênio.
                                    </Typography>
                                </Box>
                                <Divider sx={{ mb: 3 }} />
                                {/* Aqui entra o componente que você já tinha, com o Modal corrigido */}
                                <ProcedimentosView /> 
                            </Box>
                        )}

                        {medicalTab === 1 && (
                            <Box className="animate-fade-in">
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="h6" fontWeight="bold">Especialidades Médicas</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Cadastre as especialidades atendidas na clínica e seus valores base de consulta.
                                    </Typography>
                                </Box>
                                <Divider sx={{ mb: 3 }} />
                                {/* Importando a página de especialidades como componente */}
                                <EspecialidadesPage />
                            </Box>
                        )}
                    </TabPanel>

                    {/* ABA 2: FINANCEIRO (Categorias) */}
                    <TabPanel value={mainTab} index={2}>
                        <CategoriasTab />
                    </TabPanel>
                </Box>
            </Paper>
        </Container>
    );
}