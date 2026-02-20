// src/pages/ConfiguracoesPage.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Tabs, Tab, Paper, Container, Divider, useTheme
} from '@mui/material';
import { 
    People, Business, AttachMoney, AccessTime, Badge, 
    ListAlt, LocalHospital, MeetingRoom, CardMembership, AccountCircle
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

// Imports dos seus componentes
import MeuPerfilTab from '../components/configuracoes/MeuPerfilTab'; // <-- NOSSO NOVO COMPONENTE
import UsuariosTab from '../components/configuracoes/UsuariosTab';
import JornadasTab from '../components/configuracoes/JornadasTab';
import CategoriasTab from '../components/configuracoes/CategoriasTab';
import ProcedimentosView from '../components/financeiro/ProcedimentosView';
import EspecialidadesPage from './EspecialidadesPage'; 
import ConveniosTab from '../components/configuracoes/ConveniosTab';
import SalasTab from '../components/configuracoes/SalasTab';

// ... (Mantenha as funções TabPanel e SubTabs originais que você já tinha no arquivo)
function TabPanel({ children, value, index, ...other }) {
    return (
        <div role="tabpanel" hidden={value !== index} {...other} style={{ width: '100%' }}>
            {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
        </div>
    );
}

function SubTabs({ value, onChange, tabs }) {
    const theme = useTheme();
    return (
        <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 0.5, display: 'inline-flex', bgcolor: '#f8f9fa', mb: 2 }}>
            <Tabs 
                value={value} onChange={onChange}
                sx={{ 
                    minHeight: 32,
                    '& .MuiTab-root': { minHeight: 32, borderRadius: 1.5, zIndex: 1, px: 2, py: 0.5, textTransform: 'none', fontWeight: 600, fontSize: '0.85rem', minWidth: 'auto' },
                    '& .Mui-selected': { bgcolor: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.08)', color: theme.palette.primary.main },
                    '& .MuiTabs-indicator': { display: 'none' }
                }}
            >
                {tabs.map((t, i) => <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" sx={{ '& .MuiSvgIcon-root': { fontSize: 18, mb: '0px !important', mr: 1 } }} />)}
            </Tabs>
        </Paper>
    );
}

export default function ConfiguracoesPage() {
    const [mainTab, setMainTab] = useState(0);
    const [equipeTab, setEquipeTab] = useState(0);
    const [servicosTab, setServicosTab] = useState(0);

    // Lógica para pegar o cargo do usuário (Ajuste para como você salva no seu app)
    // Pode ser do localStorage, de um Context, etc. Assumindo que você grava no localStorage ao logar:
    const { user } = useAuth(); 
    const isAdmin = user?.isAdmin || false; // Puxa a propriedade isAdmin que você já tem no seu sistema

    // Se o usuário tentar acessar uma aba que não tem permissão via mudança de estado, resetamos
    useEffect(() => {
        if (!isAdmin && mainTab !== 0) {
            setMainTab(0);
        }
    }, [isAdmin, mainTab]);

    return (
        <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
            
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a233b', letterSpacing: '-0.5px', fontSize: '1.5rem' }}>
                        Configurações
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                        {isAdmin ? "Gestão unificada do sistema e do seu perfil." : "Gerencie suas informações pessoais e de acesso."}
                    </Typography>
                </Box>
            </Box>
            
            <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fff' }}>
                    <Tabs 
                        value={mainTab} onChange={(e, v) => setMainTab(v)} 
                        textColor="primary" indicatorColor="primary"
                        sx={{ 
                            minHeight: 48,
                            '& .MuiTab-root': { fontWeight: 600, minHeight: 48, textTransform: 'none', fontSize: '0.95rem', px: 3 } 
                        }}
                    >
                        {/* A primeira aba SEMPRE é o perfil, visível para TODOS */}
                        <Tab icon={<AccountCircle sx={{ fontSize: 20, mb: 0, mr: 1 }}/>} iconPosition="start" label="Meu Perfil" />
                        
                        {/* Abas exclusivas de Admin */}
                        {isAdmin && <Tab icon={<People sx={{ fontSize: 20, mb: 0, mr: 1 }}/>} iconPosition="start" label="Equipe" />}
                        {isAdmin && <Tab icon={<Business sx={{ fontSize: 20, mb: 0, mr: 1 }}/>} iconPosition="start" label="Clínica" />}
                        {isAdmin && <Tab icon={<AttachMoney sx={{ fontSize: 20, mb: 0, mr: 1 }}/>} iconPosition="start" label="Financeiro" />}
                    </Tabs>
                </Box>

                <Box sx={{ p: 2, minHeight: 400, bgcolor: '#fafafa' }}>
                    
                    {/* === ABA 0: MEU PERFIL (Visível para todos) === */}
                    <TabPanel value={mainTab} index={0}>
                        <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: 'white' }}>
                            <MeuPerfilTab />
                        </Paper>
                    </TabPanel>

                    {/* === ABAS DO ADMIN === */}
                    {isAdmin && (
                        <>
                            {/* ABA 1: EQUIPE */}
                            <TabPanel value={mainTab} index={1}>
                                <SubTabs 
                                    value={equipeTab} onChange={(e, v) => setEquipeTab(v)}
                                    tabs={[ { label: 'Usuários', icon: <Badge /> }, { label: 'Jornadas', icon: <AccessTime /> } ]}
                                />
                                <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: 'white' }}>
                                    {equipeTab === 0 && <UsuariosTab />}
                                    {equipeTab === 1 && <JornadasTab />}
                                </Paper>
                            </TabPanel>

                            {/* ABA 2: CLÍNICA */}
                            <TabPanel value={mainTab} index={2}>
                                <SubTabs 
                                    value={servicosTab} onChange={(e, v) => setServicosTab(v)}
                                    tabs={[ { label: 'Procedimentos', icon: <ListAlt /> }, { label: 'Especialidades', icon: <LocalHospital /> }, { label: 'Convênios', icon: <CardMembership /> }, { label: 'Salas', icon: <MeetingRoom /> } ]}
                                />
                                <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: 'white' }}>
                                    {servicosTab === 0 && <ProcedimentosView />}
                                    {servicosTab === 1 && <EspecialidadesPage />}
                                    {servicosTab === 2 && <ConveniosTab />}
                                    {servicosTab === 3 && <SalasTab />}
                                </Paper>
                            </TabPanel>

                            {/* ABA 3: FINANCEIRO */}
                            <TabPanel value={mainTab} index={3}>
                                <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: 'white' }}>
                                    <Typography variant="subtitle1" sx={{mb: 1, fontWeight: 'bold'}}>Categorias Financeiras</Typography>
                                    <Divider sx={{mb: 2}} />
                                    <CategoriasTab />
                                </Paper>
                            </TabPanel>
                        </>
                    )}
                </Box>
            </Paper>
        </Container>
    );
}