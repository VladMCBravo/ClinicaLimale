import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, Avatar, Typography, IconButton, TableSortLabel } from '@mui/material';
import { FaWhatsapp, FaExclamationTriangle } from 'react-icons/fa';

export default function TableView({ displayedCards, handleOpenDetalhes, handleWhatsappClick }) {
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('data');

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Lógica de ordenação dinâmica das colunas
  const sortedCards = useMemo(() => {
    return [...displayedCards].sort((a, b) => {
      let valA, valB;

      if (orderBy === 'data') {
        valA = a.dados_agendamento ? new Date(a.dados_agendamento.data).getTime() : 0;
        valB = b.dados_agendamento ? new Date(b.dados_agendamento.data).getTime() : 0;
      } else if (orderBy === 'paciente') {
        valA = a.paciente_nome?.toLowerCase() || '';
        valB = b.paciente_nome?.toLowerCase() || '';
      } else if (orderBy === 'ig') {
        valA = a.alerta_clinico ? (a.alerta_clinico.semanas * 7 + a.alerta_clinico.dias) : 0;
        valB = b.alerta_clinico ? (b.alerta_clinico.semanas * 7 + b.alerta_clinico.dias) : 0;
      } else if (orderBy === 'procedimento') {
        valA = a.dados_agendamento?.procedimento?.toLowerCase() || '';
        valB = b.dados_agendamento?.procedimento?.toLowerCase() || '';
      }

      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [displayedCards, order, orderBy]);

  if (!displayedCards || displayedCards.length === 0) return <Typography sx={{ p: 2 }}>Nenhum paciente encontrado.</Typography>;

  return (
    <TableContainer component={Paper} sx={{ borderRadius: 1 }}>
      <Table size="small">
        <TableHead sx={{ bgcolor: '#f8f9fa' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
              <TableSortLabel active={orderBy === 'data'} direction={orderBy === 'data' ? order : 'asc'} onClick={() => handleRequestSort('data')}>
                Data
              </TableSortLabel>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
              <TableSortLabel active={orderBy === 'paciente'} direction={orderBy === 'paciente' ? order : 'asc'} onClick={() => handleRequestSort('paciente')}>
                Paciente
              </TableSortLabel>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
              <TableSortLabel active={orderBy === 'ig'} direction={orderBy === 'ig' ? order : 'asc'} onClick={() => handleRequestSort('ig')}>
                IG & Alerta Clínico
              </TableSortLabel>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
              <TableSortLabel active={orderBy === 'procedimento'} direction={orderBy === 'procedimento' ? order : 'asc'} onClick={() => handleRequestSort('procedimento')}>
                Procedimento
              </TableSortLabel>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Próxima Ação</TableCell>
            <TableCell align="right"></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedCards.map((ciclo) => {
            const isAtrasado = ciclo.proxima_acao_imediata?.atrasada;
            let rowBgColor = 'inherit';
            if (ciclo.alerta_whatsapp?.tipo_alerta === '7 Dias') rowBgColor = '#ffebee';
            else if (ciclo.alerta_whatsapp?.tipo_alerta === '15 Dias') rowBgColor = '#fff3e0';
            else if (isAtrasado) rowBgColor = '#fff5f5';

            const alertTextColor = ciclo.alerta_whatsapp?.tipo_alerta === '7 Dias' ? '#d32f2f' : '#ef6c00';

            return (
              <TableRow key={ciclo.id} hover onClick={() => handleOpenDetalhes(ciclo.id)} sx={{ cursor: 'pointer', bgcolor: rowBgColor }}>
                <TableCell sx={{ fontSize: '0.75rem' }}>{ciclo.dados_agendamento ? new Date(ciclo.dados_agendamento.data).toLocaleDateString('pt-BR') : '--'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{ciclo.paciente_nome?.charAt(0)}</Avatar>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{ciclo.paciente_nome}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {ciclo.alerta_clinico ? (
                    <Box sx={{ display: 'inline-flex', bgcolor: '#ffffff80', color: '#e65100', px: 1, borderRadius: 1, fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #ffcc80' }}>
                      {ciclo.alerta_clinico.semanas}s + {ciclo.alerta_clinico.dias}d • {ciclo.alerta_clinico.texto}
                    </Box>
                  ) : '--'}
                </TableCell>
                <TableCell sx={{ fontSize: '0.75rem' }}>
                  {ciclo.dados_agendamento?.procedimento || '--'}
                  {ciclo.alerta_whatsapp && (
                    <Box sx={{ mt: 0.5, color: alertTextColor, fontSize: '0.65rem', fontWeight: 'bold' }}>
                      🔔 {ciclo.alerta_whatsapp.tipo_alerta} para agendar
                    </Box>
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: isAtrasado ? '#d32f2f' : '#1976d2' }}>
                    {isAtrasado && <FaExclamationTriangle size={12} />}
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{ciclo.proxima_acao_imediata?.descricao || "Definir próxima ação"}</Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={(e) => handleWhatsappClick(e, ciclo.paciente_whatsapp, ciclo.paciente_nome, ciclo.alerta_whatsapp?.mensagem)}>
                    <FaWhatsapp color="#25D366" size={16} />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}