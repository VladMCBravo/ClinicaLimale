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

// Imports dos componentes
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

// TabPanel agora usa string no "index"
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
                <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden', p: 1 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function SubTabs({ value, onChange, tabs }) {
    const theme = useTheme();
    return (
        <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 0.5, display: 'inline-flex', bgcolor: '#f8f9fa', mb: 1, flexShrink: 0 }}>
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
    // 💡 O TRUQUE: O estado inicial agora é uma STRING, não um número (0)
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

    // 💡 AVALIAÇÃO GRANULAR DE PERMISSÕES
    const verEquipe = isAdmin || (isRecepcao && configClinica?.recepcao_ve_equipe);
    const verClinica = isAdmin || (isRecepcao && configClinica?.recepcao_ve_clinica);
    const verFinanceiro = isAdmin || (isRecepcao && configClinica?.recepcao_ve_financeiro);

    // Se o admin desligar a chave enquanto a recepção estiver na aba, expulsa de volta pro perfil
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
        <Container maxWidth="xl" sx={{ pt: 1, pb: 1, height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                
                {/* Abas Principais Fixas - 💡 Usando 'value' explícito nas Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fff', flexShrink: 0 }}>
                    <Tabs value={mainTab} onChange={(e, v) => setMainTab(v)} textColor="primary" indicatorColor="primary">
                        
                        <Tab value="perfil" icon={<AccountCircle sx={{ fontSize: 20 }}/>} iconPosition="start" label="Meu Perfil" />
                        
                        {verEquipe && <Tab value="equipe" icon={<People sx={{ fontSize: 20 }}/>} iconPosition="start" label="Equipe" />}
                        {verClinica && <Tab value="clinica" icon={<Business sx={{ fontSize: 20 }}/>} iconPosition="start" label="Clínica" />}
                        {verFinanceiro && <Tab value="financeiro" icon={<AttachMoney sx={{ fontSize: 20 }}/>} iconPosition="start" label="Financeiro" />}
                    </Tabs>
                </Box>

                {/* Área de Conteúdo */}
                <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
                    
                    {/* === ABA PERFIL (index string "perfil") === */}
                    <TabPanel value={mainTab} index="perfil">
                        <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: 'white', flexGrow: 1, overflowY: 'auto' }}>
                            <MeuPerfilTab />
                        </Paper>
                    </TabPanel>
                         
                    {/* === ABA EQUIPE === */}
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
                            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: 'white', flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                                {equipeTab === 0 && <UsuariosTab />}
                                {equipeTab === 1 && <JornadasTab />}
                                {equipeTab === 2 && <RelatorioPontoTab />}
                            </Paper>
                        </TabPanel>
                    )}

                    {/* === ABA CLÍNICA === */}
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
                            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: 'white', flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                                {servicosTab === 0 && <DadosClinicaTab />}
                                {servicosTab === 1 && <ProcedimentosView />}
                                {servicosTab === 2 && <EspecialidadesPage />}
                                {servicosTab === 3 && <ConveniosTab />}
                                {servicosTab === 4 && <SalasTab />}
                            </Paper>
                        </TabPanel>
                    )}

                    {/* === ABA FINANCEIRO === */}
                    {verFinanceiro && (
                        <TabPanel value={mainTab} index="financeiro">
                            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: 'white', flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <Typography variant="subtitle1" sx={{mb: 1, fontWeight: 'bold', flexShrink: 0}}>Categorias Financeiras</Typography>
                                <Divider sx={{mb: 2, flexShrink: 0}} />
                                <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                                    <CategoriasTab />
                                </Box>
                            </Paper>
                        </TabPanel>
                    )}
                </Box>
            </Paper>
        </Container>
    );
}