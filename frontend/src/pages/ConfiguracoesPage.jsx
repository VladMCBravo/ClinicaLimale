// src/pages/ConfiguracoesPage.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, CircularProgress, List, ListItemButton, 
    ListItemIcon, ListItemText, useTheme 
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
import ProcedimentosView from '../components/configuracoes/ProcedimentosView';
import EspecialidadesPage from '../components/configuracoes/EspecialidadesPage'; 
import ConveniosTab from '../components/configuracoes/ConveniosTab';
import SalasTab from '../components/configuracoes/SalasTab';
import DadosClinicaTab from '../components/configuracoes/DadosClinicaTab';
import RelatorioPontoTab from '../components/configuracoes/RelatorioPontoTab';

import '../atendimento.css'; // Garantindo a importação do CSS

export default function ConfiguracoesPage() {
    const theme = useTheme();
    const [activeView, setActiveView] = useState('perfil');
    
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
                console.error("Erro ao carregar configurações da clínica", error);
            } finally {
                setLoadingConfig(false);
            }
        };
        fetchConfig();
    }, []);

    const verEquipe = isAdmin || (isRecepcao && configClinica?.recepcao_ve_equipe);
    const verClinica = isAdmin || (isRecepcao && configClinica?.recepcao_ve_clinica);
    const verFinanceiro = isAdmin || (isRecepcao && configClinica?.recepcao_ve_financeiro);

    // Proteção de rotas caso o usuário perca a permissão dinamicamente
    useEffect(() => {
        if (!loadingConfig) {
            const equipeViews = ['usuarios', 'jornadas', 'ponto'];
            const clinicaViews = ['dados_clinica', 'procedimentos', 'especialidades', 'convenios', 'salas'];
            const financeiroViews = ['categorias'];

            if (!verEquipe && equipeViews.includes(activeView)) setActiveView('perfil');
            if (!verClinica && clinicaViews.includes(activeView)) setActiveView('perfil');
            if (!verFinanceiro && financeiroViews.includes(activeView)) setActiveView('perfil');
        }
    }, [verEquipe, verClinica, verFinanceiro, activeView, loadingConfig]);

    if (loadingConfig) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#f1f3f5' }}>
                <CircularProgress />
            </Box>
        );
    }

    // Componente auxiliar para padronizar os itens do menu
    const MenuItem = ({ id, icon, label }) => {
        const isSelected = activeView === id;
        return (
            <ListItemButton 
                selected={isSelected} 
                onClick={() => setActiveView(id)}
                sx={{ 
                    borderRadius: '4px', 
                    mb: 0.5,
                    py: 0.5,
                    px: 1.5,
                    '&.Mui-selected': { 
                        bgcolor: 'rgba(28, 126, 214, 0.08)', // Fundo sutil azul
                        color: theme.palette.primary.main 
                    },
                    '&:hover': { bgcolor: '#e9ecef' }
                }}
            >
                <ListItemIcon sx={{ minWidth: 32, color: isSelected ? theme.palette.primary.main : '#6c757d' }}>
                    {React.cloneElement(icon, { sx: { fontSize: 18 } })}
                </ListItemIcon>
                <ListItemText 
                    primary={label} 
                    primaryTypographyProps={{ 
                        fontSize: '13px', 
                        fontWeight: isSelected ? 600 : 500,
                        color: isSelected ? theme.palette.primary.main : '#495057'
                    }} 
                />
            </ListItemButton>
        );
    };

    // Renderizador do Conteúdo Principal
    const renderContent = () => {
        switch (activeView) {
            case 'perfil': return <MeuPerfilTab />;
            
            // Equipe
            case 'usuarios': return <UsuariosTab />;
            case 'jornadas': return <JornadasTab />;
            case 'ponto': return <RelatorioPontoTab />;
            
            // Clínica
            case 'dados_clinica': return <DadosClinicaTab />;
            case 'procedimentos': return <ProcedimentosView />;
            case 'especialidades': return <EspecialidadesPage />;
            case 'convenios': return <ConveniosTab />;
            case 'salas': return <SalasTab />;
            
            // Financeiro
            case 'categorias': return <CategoriasTab />;
            
            default: return <MeuPerfilTab />;
        }
    };

    return (
        // A classe tasy-workspace engloba tudo para aplicar o scrollbar personalizado
        <Box className="tasy-workspace" sx={{ 
            display: 'flex', 
            height: 'calc(100vh - 64px)', 
            overflow: 'hidden', 
            bgcolor: '#f1f3f5' 
        }}>
            
            {/* BARRA LATERAL FINA (SIDEBAR) */}
            <Box sx={{ 
                width: 220, 
                flexShrink: 0, 
                bgcolor: '#f8f9fa', 
                borderRight: '1px solid #dee2e6',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto'
            }}>
                <Box sx={{ p: 2 }}>
                    
                    {/* Seção: Conta */}
                    <Typography className="tasy-section-header" sx={{ mx: -2, mt: -2 }}>Minha Conta</Typography>
                    <List component="nav" sx={{ p: 0, mb: 2 }}>
                        <MenuItem id="perfil" icon={<AccountCircle />} label="Meu Perfil" />
                    </List>

                    {/* Seção: Equipe */}
                    {verEquipe && (
                        <>
                            <Typography className="tasy-section-header" sx={{ mx: -2 }}>Equipe</Typography>
                            <List component="nav" sx={{ p: 0, mb: 2 }}>
                                <MenuItem id="usuarios" icon={<Badge />} label="Usuários" />
                                <MenuItem id="jornadas" icon={<AccessTime />} label="Jornadas" />
                                <MenuItem id="ponto" icon={<Fingerprint />} label="Relatório de Ponto" />
                            </List>
                        </>
                    )}

                    {/* Seção: Clínica */}
                    {verClinica && (
                        <>
                            <Typography className="tasy-section-header" sx={{ mx: -2 }}>Clínica</Typography>
                            <List component="nav" sx={{ p: 0, mb: 2 }}>
                                <MenuItem id="dados_clinica" icon={<Map />} label="Dados da Clínica" />
                                <MenuItem id="procedimentos" icon={<ListAlt />} label="Procedimentos" />
                                <MenuItem id="especialidades" icon={<LocalHospital />} label="Especialidades" />
                                <MenuItem id="convenios" icon={<CardMembership />} label="Convênios" />
                                <MenuItem id="salas" icon={<MeetingRoom />} label="Salas" />
                            </List>
                        </>
                    )}

                    {/* Seção: Financeiro */}
                    {verFinanceiro && (
                        <>
                            <Typography className="tasy-section-header" sx={{ mx: -2 }}>Financeiro</Typography>
                            <List component="nav" sx={{ p: 0, mb: 2 }}>
                                <MenuItem id="categorias" icon={<AttachMoney />} label="Categorias" />
                            </List>
                        </>
                    )}
                </Box>
            </Box>

            {/* ÁREA PRINCIPAL DE CONTEÚDO */}
            <Box sx={{ 
                flexGrow: 1, 
                overflow: 'hidden', 
                display: 'flex', 
                flexDirection: 'column',
                p: 2 // Padding global para distanciar os painéis da borda da tela
            }}>
                {renderContent()}
            </Box>

        </Box>
    );
}