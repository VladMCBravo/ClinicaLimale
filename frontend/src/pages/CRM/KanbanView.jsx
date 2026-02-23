import React from 'react';
import { Grid, Card, CardContent, Box, Avatar, Typography, IconButton } from '@mui/material';
import { FaWhatsapp, FaExclamationTriangle } from 'react-icons/fa';

export default function KanbanView({ displayedCards, activePhaseBorder, handleOpenDetalhes, handleWhatsappClick }) {
  if (!displayedCards || displayedCards.length === 0) return <Typography sx={{ p: 2 }}>Nenhum paciente nesta coluna.</Typography>;

  return (
    <Grid container spacing={1}>
      {displayedCards.map((ciclo) => (
        <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={ciclo.id}>
          <Card onClick={() => handleOpenDetalhes(ciclo.id)} sx={{ borderRadius: 1, borderLeft: `4px solid ${activePhaseBorder}`, cursor: 'pointer', bgcolor: ciclo.proxima_acao_imediata?.atrasada ? '#fffbfa' : 'white' }}>
            <CardContent sx={{ p: '8px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Avatar sx={{ width: 22, height: 22, mr: 0.5, fontSize: '0.7rem' }}>{ciclo.paciente_nome?.charAt(0)}</Avatar>
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 'bold', flexGrow: 1, fontSize: '0.75rem' }}>{ciclo.paciente_nome}</Typography>
                <IconButton size="small" onClick={(e) => handleWhatsappClick(e, ciclo.paciente_whatsapp, ciclo.paciente_nome, ciclo.alerta_whatsapp?.mensagem)}>
                  <FaWhatsapp color="#25D366" size={14} />
                </IconButton>
              </Box>

              {ciclo.alerta_whatsapp && (
                <Box sx={{ bgcolor: '#e3f2fd', color: '#1565c0', borderRadius: 1, px: 0.8, py: 0.4, mb: 1, fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #90caf9' }}>
                  🔔 Lembrete: {ciclo.alerta_whatsapp.tipo_alerta} para o {ciclo.alerta_whatsapp.exame_alvo}.
                </Box>
              )}
              {ciclo.alerta_clinico && (
                <Box sx={{ bgcolor: '#fff3e0', color: '#e65100', borderRadius: 1, px: 0.8, py: 0.4, mb: 1, fontSize: '0.7rem', fontWeight: 'bold' }}>
                  {ciclo.alerta_clinico.semanas}s + {ciclo.alerta_clinico.dias}d • {ciclo.alerta_clinico.texto}
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#666' }}>
                <span>
                  {ciclo.dados_agendamento ? (
                    new Date(ciclo.dados_agendamento.data).toLocaleDateString('pt-BR')
                  ) : (
                    <span style={{ color: '#9e9e9e', fontStyle: 'italic' }}>sem agendamento</span>
                  )}
                </span>
                <span style={{ fontWeight: 'bold' }}>{ciclo.dados_agendamento?.procedimento}</span>
              </Box>
              <Box sx={{ mt: 0.5, pt: 0.5, borderTop: '1px dashed #ddd', display: 'flex', alignItems: 'center', gap: 0.5, color: ciclo.proxima_acao_imediata?.atrasada ? '#d32f2f' : '#1976d2' }}>
                {ciclo.proxima_acao_imediata?.atrasada && <FaExclamationTriangle size={10} />}
                <Typography noWrap sx={{ fontSize: '0.65rem', fontWeight: 600 }}>{ciclo.proxima_acao_imediata?.descricao || "Definir ação"}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}