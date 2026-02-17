// src/components/Navbar.jsx
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
    FaUserFriends,
    FaFileInvoiceDollar,
    FaCog,
    FaSignOutAlt,
    FaTachometerAlt,
    FaVideo,
    FaStethoscope,
    FaFileMedical,
    FaRobot,         // <--- NOVO
    FaCheckCircle    // <--- NOVO
} from 'react-icons/fa';
import { 
    IconButton, 
    Badge,           // <--- NOVO
    Popover,         // <--- NOVO
    Box,             // <--- NOVO
    Typography,      // <--- NOVO
    List,            // <--- NOVO
    ListItem,        // <--- NOVO
    ListItemText,    // <--- NOVO
    Divider          // <--- NOVO
} from '@mui/material';
import apiClient from '../api/axiosConfig'; // <--- NOVO (Para buscar dados do robô)
import logoImage from '../assets/logo.png';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useAuth();

    // --- ESTADOS DO ROBÔ DE SINCRONIZAÇÃO ---
    const [roboHistory, setRoboHistory] = useState([]);
    const [roboStatus, setRoboStatus] = useState('carregando'); // 'online', 'offline', 'ocioso'
    const [anchorElRobo, setAnchorElRobo] = useState(null);

    // --- VERIFICADOR DO ROBÔ (A CADA 15 SEGUNDOS) ---
    useEffect(() => {
        if (!user) return; // Só checa se estiver logado

        const fetchRobo = async () => {
            try {
                const res = await apiClient.get('/exames/recentes/');
                setRoboHistory(res.data);
                
                if (res.data.length > 0) {
                    setRoboStatus('online'); 
                } else {
                    setRoboStatus('ocioso');
                }
            } catch (e) {
                console.error("Erro ao checar robô", e);
                setRoboStatus('offline');
            }
        };

        fetchRobo();
        const interval = setInterval(fetchRobo, 15000);
        return () => clearInterval(interval);
    }, [user]);

    const renderPrincipalLink = () => {
        if (user.isRecepcao || user.isAdmin) {
            return (
                <NavLink to="/painel">
                    <FaTachometerAlt /> <span>Painel</span>
                </NavLink>
            );
        }
        if (user.isMedico) {
            return (
                <NavLink to="/" end>
                    <FaStethoscope /> <span>Atendimento</span>
                </NavLink>
            );
        }
        return null;
    };

    const formatarSaudacao = (user) => {
        if (user.isMedico) {
            if (user.genero === 'F') return 'Dra.';
            if (user.genero === 'M') return 'Dr.';
            return 'Dr(a).';
        }
        return '';
    };

    return (
        <header className="main-header">
            <div className="nav-left">
                <img src={logoImage} alt="Clínica Limalé" className="logo-image" />

                {user && (
                    <nav className="main-nav">
                        {renderPrincipalLink()}

                        <NavLink to="/telemedicina">
                            <FaVideo /> <span>Telemedicina</span>
                        </NavLink>
                        
                        <NavLink to="/laudos">
                            <FaFileMedical /> <span>Laudos</span>
                        </NavLink>
                        
                        <NavLink to="/pacientes">
                            <FaUserFriends /> <span>Pacientes</span>
                        </NavLink>

                        {/* CRM Operacional: Acessível para quem atende */}
                        <NavLink to="/crm/kanban">
                            <FaUserFriends /> <span>Funil CRM</span>
                        </NavLink>

                        {/* Itens Exclusivos de Admin */}
                        {user.isAdmin && (
                            <>
                                <NavLink to="/financeiro">
                                    <FaFileInvoiceDollar /> <span>Financeiro</span>
                                </NavLink>

                                <NavLink to="/crm/executivo">
                                    <FaTachometerAlt /> <span>Painel Executivo</span>
                                </NavLink>
                            </>
                        )}
                    </nav>
                )}
            </div>

            {user && (
                <div className="nav-right">
                    {/* --- INDICADOR DO ROBÔ AQUI --- */}
                    <Box 
                        onClick={(e) => setAnchorElRobo(e.currentTarget)}
                        sx={{ 
                            display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', 
                            background: 'rgba(255,255,255,0.08)', padding: '6px 12px', 
                            borderRadius: '20px', transition: '0.2s',
                            '&:hover': { background: 'rgba(255,255,255,0.15)'} 
                        }}
                        title="Histórico de envio da Máquina de Ultrassom"
                    >
                        <Badge 
                            color={roboStatus === 'online' ? 'success' : roboStatus === 'offline' ? 'error' : 'default'} 
                            variant="dot"
                            sx={{ 
                                '& .MuiBadge-badge': { 
                                    animation: roboStatus === 'online' ? 'pulse-green 1.5s infinite' : 'none',
                                    backgroundColor: roboStatus === 'online' ? '#4CAF50' : undefined
                                } 
                            }}
                        >
                            <FaRobot size={16} color={roboStatus === 'online' ? '#4CAF50' : '#9e9e9e'} />
                        </Badge>
                        <span style={{ fontSize: '0.75rem', color: '#e0e0e0', fontWeight: 600 }}>
                            {roboStatus === 'carregando' ? 'Checando...' :
                             roboStatus === 'online' && roboHistory.length > 0 ? `USG: ${roboHistory[0].paciente.split(' ')[0]}` :
                             'USG Ocioso'}
                        </span>
                    </Box>

                    {/* MINI MODAL DO ROBÔ (HISTÓRICO) */}
                    <Popover
                        open={Boolean(anchorElRobo)}
                        anchorEl={anchorElRobo}
                        onClose={() => setAnchorElRobo(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                        sx={{ mt: 1 }}
                    >
                        <Box sx={{ p: 2, width: 320 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: '#1C2E4A', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <FaRobot /> Últimos Exames da Máquina
                            </Typography>
                            <Divider sx={{ mb: 1 }} />
                            
                            {roboStatus === 'offline' && (
                                <Typography variant="caption" color="error">⚠️ Falha de conexão com o servidor.</Typography>
                            )}

                            <List dense>
                                {roboHistory.length === 0 ? (
                                    <Typography variant="caption" color="textSecondary">Nenhum exame enviado recentemente.</Typography>
                                ) : (
                                    roboHistory.map((item, idx) => (
                                        <ListItem key={idx} sx={{ borderBottom: '1px solid #f0f0f0', px: 0 }}>
                                            <ListItemText 
                                                primary={<span style={{fontSize: '11px', fontWeight: 'bold'}}>{item.paciente}</span>}
                                                secondary={<span style={{fontSize: '10px'}}>{item.data_envio} - Pasta: {item.nome_pasta}</span>}
                                            />
                                            <FaCheckCircle color="#4CAF50" size={14} />
                                        </ListItem>
                                    ))
                                )}
                            </List>
                        </Box>
                    </Popover>

                    <span className="user-greeting">
                        Olá, {formatarSaudacao(user)} {user.first_name || ''}
                    </span>
                    <div className="user-actions">
                        {user.isAdmin && (
                            <IconButton component={Link} to="/configuracoes" title="Configurações" className="icon-button" sx={{ color: '#ffffff' }}>
                                <FaCog />
                            </IconButton>
                        )}

                        <IconButton onClick={logout} className="icon-button" title="Sair" sx={{ color: '#ffffff' }}>
                            <FaSignOutAlt />
                        </IconButton>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Navbar;