import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, Typography, IconButton, TableSortLabel, Chip } from '@mui/material';
import { FaWhatsapp, FaExclamationTriangle } from 'react-icons/fa';
import '../../atendimento.css';

export default function TableView({ displayedCards, handleOpenDetalhes, handleWhatsappClick }) {
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('data');

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedCards = useMemo(() => {
    return [...displayedCards].sort((a, b) => {
      let valA, valB;

      if (orderBy === 'data') {
        valA = a.dados_agendamento ? new Date(a.dados_agendamento.data).getTime() : 0;
        valB = b.dados_agendamento ? new Date(b.dados_agendamento.data).getTime() : 0;
      } else if (orderBy === 'paciente') {
        valA = a.paciente_nome?.toLowerCase() || '';
        valB = b.paciente_nome?.toLowerCase() || '';
      } else if (orderBy === 'fase') {
        valA = a.fase_atual || '';
        valB = b.fase_atual || '';
      }

      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [displayedCards, order, orderBy]);

  if (!displayedCards || displayedCards.length === 0) return <Typography sx={{ p: 2, fontSize: '13px', color: '#666' }}>Nenhum dado localizado.</Typography>;

  return (
    <TableContainer component={Paper} className="tasy-flat-panel" sx={{ height: '100%', overflow: 'auto' }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: '600', fontSize: '12px', bgcolor: '#f8f9fa', color: '#495057' }}>
              <TableSortLabel active={orderBy === 'data'} direction={orderBy === 'data' ? order : 'asc'} onClick={() => handleRequestSort('data')}>
                Data/Contato
              </TableSortLabel>
            </TableCell>
            
            <TableCell sx={{ fontWeight: '600', fontSize: '12px', bgcolor: '#f8f9fa', color: '#495057' }}>
              <TableSortLabel active={orderBy === 'paciente'} direction={orderBy === 'paciente' ? order : 'asc'} onClick={() => handleRequestSort('paciente')}>
                Paciente
              </TableSortLabel>
            </TableCell>

            <TableCell sx={{ fontWeight: '600', fontSize: '12px', bgcolor: '#f8f9fa', color: '#495057' }}>
              <TableSortLabel active={orderBy === 'fase'} direction={orderBy === 'fase' ? order : 'asc'} onClick={() => handleRequestSort('fase')}>
                Fase (Funil)
              </TableSortLabel>
            </TableCell>

            <TableCell sx={{ fontWeight: '600', fontSize: '12px', bgcolor: '#f8f9fa', color: '#495057' }}>
              Origem
            </TableCell>

            <TableCell sx={{ fontWeight: '600', fontSize: '12px', bgcolor: '#f8f9fa', color: '#495057' }}>
              Idade Gestacional / Procedimento
            </TableCell>
            
            <TableCell sx={{ fontWeight: '600', fontSize: '12px', bgcolor: '#f8f9fa', color: '#495057' }}>Ação e Alertas</TableCell>
            <TableCell align="right" sx={{ bgcolor: '#f8f9fa' }}></TableCell>
          </TableRow>
        </TableHead>
        
        <TableBody>
          {sortedCards.map((ciclo) => {
            const isAtrasado = ciclo.proxima_acao_imediata?.atrasada;
            let rowStyle = { cursor: 'pointer', borderBottom: '1px solid #e9ecef' };
            if (isAtrasado) rowStyle.backgroundColor = '#fff5f5';

            return (
              <TableRow key={ciclo.id} hover onClick={() => handleOpenDetalhes(ciclo.id)} sx={rowStyle}>
                
                <TableCell sx={{ fontSize: '13px', color: '#495057', py: 1 }}>
                  {ciclo.dados_agendamento ? (
                    new Date(ciclo.dados_agendamento.data).toLocaleDateString('pt-BR')
                  ) : (
                    <span style={{ color: '#868e96' }}>{ciclo.data_inicio && new Date(ciclo.data_inicio).toLocaleDateString('pt-BR')} (1º ctt)</span>
                  )}
                </TableCell>

                <TableCell sx={{ fontSize: '13px', color: '#212529', fontWeight: 500 }}>
                  {ciclo.paciente_nome}
                </TableCell>

                <TableCell>
                    <Chip label={ciclo.fase_atual} size="small" sx={{ height: '20px', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px' }} />
                </TableCell>

                <TableCell sx={{ fontSize: '13px' }}>
                  {ciclo.comportamento_resumo?.origem && ciclo.comportamento_resumo.origem !== "Não Informado" ? (
                    <span style={{ color: '#495057' }}>{ciclo.comportamento_resumo.origem}</span>
                  ) : (
                    <span style={{ color: '#ced4da' }}>--</span>
                  )}
                </TableCell>

                <TableCell>
                  {ciclo.alerta_clinico ? (
                    <Box sx={{ fontSize: '12px', color: '#e65100', fontWeight: '600' }}>
                      {ciclo.alerta_clinico.semanas}s + {ciclo.alerta_clinico.dias}d • {ciclo.alerta_clinico.texto}
                    </Box>
                  ) : (
                    <Box sx={{ fontSize: '12px', color: '#495057' }}>{ciclo.dados_agendamento?.procedimento || '--'}</Box>
                  )}
                </TableCell>
                
                <TableCell sx={{ py: 1 }}>
                  {ciclo.alerta_operacional && (
                    <Typography sx={{ color: ciclo.alerta_operacional.cor, fontSize: '11px', fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                      {ciclo.alerta_operacional.icone} {ciclo.alerta_operacional.texto}
                    </Typography>
                  )}
                  {ciclo.proxima_acao_imediata?.descricao && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: isAtrasado ? '#d32f2f' : '#1976d2' }}>
                      {isAtrasado && <FaExclamationTriangle size={11} />}
                      <Typography sx={{ fontSize: '12px' }}>
                        {ciclo.proxima_acao_imediata.descricao}
                      </Typography>
                    </Box>
                  )}
                </TableCell>
                
                <TableCell align="right" sx={{ py: 0.5 }}>
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