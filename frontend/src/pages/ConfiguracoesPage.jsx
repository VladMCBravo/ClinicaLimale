// src/pages/ConfiguracoesPage.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Tabs, Tab, Paper, Container, Divider, useTheme, CircularProgress
} from '@mui/material';
import { 
    People, Business, AttachMoney, AccessTime, Badge, 
    ListAlt, LocalHospital, MeetingRoom, CardMembership, AccountCircle,
    Map, Fingerprint
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/axiosConfig';

import MeuPerfilTab from '../components/configuracoes/MeuPerfilTab';
import UsuariosTab from '../components/configuracoes/UsuariosTab';
import JornadasTab from '../components/configuracoes/JornadasTab';
import CategoriasTab from '../components/configuracoes/CategoriasTab';
import ProcedimentosView from '../components/financeiro/ProcedimentosView';
import EspecialidadesPage from './EspecialidadesPage'; 
import ConveniosTab from '../components/configuracoes/ConveniosTab';
import SalasTab from '../components/configuracoes/SalasTab';
import DadosClinicaTab from '../components/configuracoes/DadosClinicaTab';
import RelatorioPontoTab from '../components/configuracoes/RelatorioPontoTab';

function TabPanel({ children, value, index, ...other }) {
    return (
        <div 
            role="tabpanel" 
            hidden={value !== index} 
            {...other} 
            style={{ 
                width: '100%', height: '100%', 
                display: value === index ? 'flex' : 'none',
                flexDirection: 'column', overflow: 'hidden' 
            }}
        >
            {value === index && (
                // Removido o padding p: 1 daqui para expandir o conteúdo
                <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden', p: 0 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function SubTabs({ value, onChange, tabs }) {
    const theme = useTheme();
    return (
        // Transformado em uma barra flat, sem bordas arredondadas grossas
        <Paper elevation={0} sx={{ borderBottom: '1px solid #dee2e6', borderRadius: 0, p: 0, display: 'flex', bgcolor: '#f8f9fa', flexShrink: 0 }}>
            <Tabs 
                value={value} onChange={onChange}
                sx={{ 
                    minHeight: 36,
                    '& .MuiTab-root': { minHeight: 36, py: 0, px: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.80rem', color: '#6c757d' },
                    '& .Mui-selected': { color: theme.palette.primary.main, bgcolor: '#ffffff', borderTop: `2px solid ${theme.palette.primary.main}`, borderRight: '1px solid #dee2e6', borderLeft: '1px solid #dee2e6' },
                    '& .MuiTabs-indicator': { display: 'none' }
                }}
            >
                {tabs.map((t, i) => <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" sx={{ '& .MuiSvgIcon-root': { fontSize: 16, mr: 0.5 } }} />)}
            </Tabs>
        </Paper>
    );
}

export default function ConfiguracoesPage() {
    const [mainTab, setMainTab] = useState('perfil');
    const [equipeTab, setEquipeTab] = useState(0);
    const [servicosTab, setServicosTab] = useState(0);
    
    const [configClinica, setConfigClinica] = useState(null);
    const [loadingConfig, setLoadingConfig] = useState(true);

    const { user } = useAuth(); 
    const isAdmin = user?.isAdmin || false;
    const isRecepcao = user?.cargo === 'recepcao';

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await apiClient.get('/usuarios/clinica/configuracao/');
                setConfigClinica(response.data);
            } catch (error) {
                console.error("Erro ao carregar permissões", error);
            } finally {
                setLoadingConfig(false);
            }
        };
        fetchConfig();
    }, []);

    const verEquipe = isAdmin || (isRecepcao && configClinica?.recepcao_ve_equipe);
    const verClinica = isAdmin || (isRecepcao && configClinica?.recepcao_ve_clinica);
    const verFinanceiro = isAdmin || (isRecepcao && configClinica?.recepcao_ve_financeiro);

    useEffect(() => {
        if (!loadingConfig) {
            if (mainTab === 'equipe' && !verEquipe) setMainTab('perfil');
            if (mainTab === 'clinica' && !verClinica) setMainTab('perfil');
            if (mainTab === 'financeiro' && !verFinanceiro) setMainTab('perfil');
        }
    }, [verEquipe, verClinica, verFinanceiro, mainTab, loadingConfig]);

    if (loadingConfig) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }

    return (
        // Removido pt: 1, pb: 1 para ocupar toda a tela
        <Container maxWidth={false} disableGutters sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#f1f3f5' }}>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fff', flexShrink: 0, px: 2 }}>
                <Tabs value={mainTab} onChange={(e, v) => setMainTab(v)} textColor="primary" indicatorColor="primary" sx={{ minHeight: 48 }}>
                    <Tab value="perfil" icon={<AccountCircle sx={{ fontSize: 20 }}/>} iconPosition="start" label="Meu Perfil" sx={{ minHeight: 48 }} />
                    {verEquipe && <Tab value="equipe" icon={<People sx={{ fontSize: 20 }}/>} iconPosition="start" label="Equipe" sx={{ minHeight: 48 }} />}
                    {verClinica && <Tab value="clinica" icon={<Business sx={{ fontSize: 20 }}/>} iconPosition="start" label="Clínica" sx={{ minHeight: 48 }} />}
                    {verFinanceiro && <Tab value="financeiro" icon={<AttachMoney sx={{ fontSize: 20 }}/>} iconPosition="start" label="Financeiro" sx={{ minHeight: 48 }} />}
                </Tabs>
            </Box>

            <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                
                <TabPanel value={mainTab} index="perfil">
                    <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto' }}>
                        <MeuPerfilTab />
                    </Box>
                </TabPanel>
                     
                {verEquipe && (
                    <TabPanel value={mainTab} index="equipe">
                        <SubTabs 
                            value={equipeTab} onChange={(e, v) => setEquipeTab(v)}
                            tabs={[ 
                                { label: 'Usuários', icon: <Badge /> }, 
                                { label: 'Jornadas', icon: <AccessTime /> },
                                { label: 'Relatório de Ponto', icon: <Fingerprint /> }
                            ]}
                        />
                        <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {equipeTab === 0 && <UsuariosTab />}
                            {equipeTab === 1 && <JornadasTab />}
                            {equipeTab === 2 && <RelatorioPontoTab />}
                        </Box>
                    </TabPanel>
                )}

                {verClinica && (
                    <TabPanel value={mainTab} index="clinica">
                        <SubTabs 
                            value={servicosTab} onChange={(e, v) => setServicosTab(v)}
                            tabs={[ 
                                { label: 'Dados da Clínica', icon: <Map /> },
                                { label: 'Procedimentos', icon: <ListAlt /> }, 
                                { label: 'Especialidades', icon: <LocalHospital /> }, 
                                { label: 'Convênios', icon: <CardMembership /> }, 
                                { label: 'Salas', icon: <MeetingRoom /> } 
                            ]}
                        />
                        <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {servicosTab === 0 && <Box sx={{p: 2, overflowY: 'auto'}}><DadosClinicaTab /></Box>}
                            {servicosTab === 1 && <ProcedimentosView />}
                            {servicosTab === 2 && <EspecialidadesPage />}
                            {servicosTab === 3 && <Box sx={{p: 2, overflowY: 'auto'}}><ConveniosTab /></Box>}
                            {servicosTab === 4 && <Box sx={{p: 2, overflowY: 'auto'}}><SalasTab /></Box>}
                        </Box>
                    </TabPanel>
                )}

                {verFinanceiro && (
                    <TabPanel value={mainTab} index="financeiro">
                        <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <CategoriasTab />
                        </Box>
                    </TabPanel>
                )}
            </Box>
        </Container>
    );
}