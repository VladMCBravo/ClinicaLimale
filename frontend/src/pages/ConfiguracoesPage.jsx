// src/pages/ConfiguracoesPage.jsx
import React, { useState } from 'react';
import { 
    Box, Typography, Tabs, Tab, Paper, Container, Divider, useTheme
} from '@mui/material';
import { 
    People,           // Ícone para Equipe
    Business,         // Ícone para Clínica/Estrutura
    AttachMoney,      // Ícone para Financeiro
    AccessTime,       // Ícone para Jornada
    Badge,            // Ícone para Crachá/Usuário
    ListAlt,
    LocalHospital,
    MeetingRoom,      // Ícone para Salas
    CardMembership    // Ícone para Convênios
} from '@mui/icons-material';

// --- IMPORTS DOS COMPONENTES ---
import UsuariosTab from '../components/configuracoes/UsuariosTab';
import JornadasTab from '../components/configuracoes/JornadasTab'; // Novo (antiga Page)
import CategoriasTab from '../components/configuracoes/CategoriasTab';
import ProcedimentosView from '../components/financeiro/ProcedimentosView';
import EspecialidadesPage from './EspecialidadesPage'; 
import ConveniosTab from '../components/configuracoes/ConveniosTab'; // Novo (antiga Page)
import SalasTab from '../components/configuracoes/SalasTab'; // Novo (antiga Page)

// Componente visual para conteúdo das abas
function TabPanel({ children, value, index, ...other }) {
    return (
        <div role="tabpanel" hidden={value !== index} {...other} style={{ width: '100%' }}>
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
}

// Componente visual para Sub-Abas (Estilo "Pill")
function SubTabs({ value, onChange, tabs }) {
    const theme = useTheme();
    return (
        <Paper elevation={0} sx={{ 
            border: '1px solid #ddd', borderRadius: 3, p: 0.5, display: 'inline-flex', bgcolor: '#f5f5f5', mb: 3 
        }}>
            <Tabs 
                value={value} onChange={onChange}
                sx={{ 
                    minHeight: 40,
                    '& .MuiTab-root': { 
                        minHeight: 40, borderRadius: 2.5, zIndex: 1, px: 3, textTransform: 'none', fontWeight: 600
                    },
                    '& .Mui-selected': { 
                        bgcolor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', color: theme.palette.primary.main
                    },
                    '& .MuiTabs-indicator': { display: 'none' }
                }}
            >
                {tabs.map((t, i) => (
                    <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
                ))}
            </Tabs>
        </Paper>
    );
}

export default function ConfiguracoesPage() {
    const [mainTab, setMainTab] = useState(0);
    const [equipeTab, setEquipeTab] = useState(0);
    const [servicosTab, setServicosTab] = useState(0);

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a233b', letterSpacing: '-0.5px' }}>
                    Configurações
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Gerencie equipe, estrutura da clínica e financeiro em um só lugar.
                </Typography>
            </Box>
            
            <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                {/* ABAS PRINCIPAIS */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8f9fa' }}>
                    <Tabs 
                        value={mainTab} onChange={(e, v) => setMainTab(v)} 
                        textColor="primary" indicatorColor="primary"
                        sx={{ '& .MuiTab-root': { fontWeight: 600, minHeight: 64, textTransform: 'none', fontSize: '1rem' } }}
                    >
                        <Tab icon={<People />} iconPosition="start" label="Gestão de Equipe" />
                        <Tab icon={<Business />} iconPosition="start" label="Clínica e Serviços" />
                        <Tab icon={<AttachMoney />} iconPosition="start" label="Financeiro" />
                    </Tabs>
                </Box>

                <Box sx={{ p: 3, minHeight: 400 }}>
                    
                    {/* === ABA 1: EQUIPE (Usuários + Jornadas) === */}
                    <TabPanel value={mainTab} index={0}>
                        <SubTabs 
                            value={equipeTab} 
                            onChange={(e, v) => setEquipeTab(v)}
                            tabs={[
                                { label: 'Usuários do Sistema', icon: <Badge fontSize="small"/> },
                                { label: 'Jornadas de Trabalho', icon: <AccessTime fontSize="small"/> }
                            ]}
                        />
                        {equipeTab === 0 && <UsuariosTab />}
                        {equipeTab === 1 && <JornadasTab />}
                    </TabPanel>

                    {/* === ABA 2: CLÍNICA E SERVIÇOS === */}
                    <TabPanel value={mainTab} index={1}>
                        <SubTabs 
                            value={servicosTab} 
                            onChange={(e, v) => setServicosTab(v)}
                            tabs={[
                                { label: 'Procedimentos', icon: <ListAlt fontSize="small"/> },
                                { label: 'Especialidades', icon: <LocalHospital fontSize="small"/> },
                                { label: 'Convênios', icon: <CardMembership fontSize="small"/> },
                                { label: 'Salas', icon: <MeetingRoom fontSize="small"/> }
                            ]}
                        />
                        <Box className="animate-fade-in">
                            {servicosTab === 0 && <ProcedimentosView />}
                            {servicosTab === 1 && <EspecialidadesPage />}
                            {servicosTab === 2 && <ConveniosTab />}
                            {servicosTab === 3 && <SalasTab />}
                        </Box>
                    </TabPanel>

                    {/* === ABA 3: FINANCEIRO === */}
                    <TabPanel value={mainTab} index={2}>
                        <Box>
                            <Typography variant="h6" sx={{mb: 2, fontWeight: 'bold'}}>Categorias de Receitas e Despesas</Typography>
                            <Divider sx={{mb:3}} />
                            <CategoriasTab />
                        </Box>
                    </TabPanel>
                </Box>
            </Paper>
        </Container>
    );
}