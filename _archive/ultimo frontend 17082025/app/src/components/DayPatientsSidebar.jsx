import React, { useEffect } from 'react';
import { useDailyAppointments } from '../contexts/DailyAppointmentsContext';
import { 
  Drawer, 
  Toolbar, 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Divider, 
  CircularProgress, 
  Tooltip
} from '@mui/material';

// Ícones
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import StarIcon from '@mui/icons-material/Star';

const drawerWidth = 240;

// Função para retornar um ícone com base no status do agendamento
const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case 'confirmado':
    case 'atendido':
      return <Tooltip title={status}><CheckCircleIcon color="success" fontSize="small" /></Tooltip>;
    case 'aguardando':
      return <Tooltip title={status}><RadioButtonUncheckedIcon color="action" fontSize="small" /></Tooltip>;
    default:
      return <Tooltip title={status || 'Status desconhecido'}><HelpOutlineIcon color="disabled" fontSize="small" /></Tooltip>;
  }
};

export default function DayPatientsSidebar() {
  const { dayPatients, isLoading, error, fetchDayPatients } = useDailyAppointments();

  useEffect(() => {
    // Busca os pacientes do dia quando o componente é montado
    fetchDayPatients();
  }, [fetchDayPatients]);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      {/* Esta Toolbar agora serve apenas como um espaçador para alinhar com o conteúdo principal */}
      <Toolbar />
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">Pacientes do Dia</Typography>
        <Typography variant="caption" color="textSecondary">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Typography>
      </Box>
      
      {/* Lógica para exibir loading, erro, lista vazia ou a lista de pacientes */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}><CircularProgress size={24} /></Box>
      ) : error ? (
        <Typography sx={{ p: 2 }} color="error">{error}</Typography>
      ) : dayPatients.length === 0 ? (
        <Typography sx={{ p: 2 }} color="textSecondary">Nenhum paciente agendado para hoje.</Typography>
      ) : (
        <List dense>
          {dayPatients.map(ag => (
            <ListItem 
              key={ag.id} 
              secondaryAction={getStatusIcon(ag.status)}
            >
              <ListItemText 
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {ag.primeira_consulta && <Tooltip title="Primeira Consulta"><StarIcon sx={{ fontSize: 16, color: 'orange' }} /></Tooltip>}
                    {ag.pago && <Tooltip title="Consulta Paga"><MonetizationOnIcon sx={{ fontSize: 16, color: 'green' }} /></Tooltip>}
                    <span>{ag.paciente}</span>
                  </Box>
                } 
                secondary={new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} 
              />
            </ListItem>
          ))}
        </List>
      )}
    </Drawer>
  );
}