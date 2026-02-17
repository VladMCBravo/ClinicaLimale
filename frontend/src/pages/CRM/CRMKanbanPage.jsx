import React, { useEffect, useState, useMemo } from 'react';
import { 
  Box, Typography, Card, CardContent, Chip, Avatar, LinearProgress, IconButton, 
  Grid, TextField, InputAdornment, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import { FaWhatsapp, FaExclamationTriangle, FaRegCalendarAlt, FaSearch, FaThLarge, FaListUl } from 'react-icons/fa';
import CicloDetalhesModal from './CicloDetalhesModal';
import { crmService } from '../../services/crmService';

const PHASES = [
  { id: 'F1', title: '1. Novos Leads', color: '#e3f2fd', border: '#90caf9' },
  { id: 'F2', title: '2. Agendados', color: '#e8f5e9', border: '#a5d6a7' },
  { id: 'F3', title: '3. Pós-Atendimento', color: '#fff3e0', border: '#ffcc80' },
  { id: 'F4', title: '4. Retenção / Retorno', color: '#f3e5f5', border: '#ce93d8' },
  { id: 'F5', title: '5. Recuperação', color: '#ffebee', border: '#ef5350' }
];

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

export default function CRMKanbanPage() {
  const [rawData, setRawData] = useState({ F1: [], F2: [], F3: [], F4: [], F5: [] });
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState('F2'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table'); // Padrão agora é Tabela
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCicloId, setSelectedCicloId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await crmService.getKanban();
      const sortCronologico = (lista) => {
        return lista.sort((a, b) => {
          const dateA = a.dados_agendamento?.data ? new Date(a.dados_agendamento.data) : new Date(a.data_inicio || 0);
          const dateB = b.dados_agendamento?.data ? new Date(b.dados_agendamento.data) : new Date(b.data_inicio || 0);
          return dateA - dateB; 
        });
      };

      setRawData({
        F1: sortCronologico(response.data.F1 || []),
        F2: sortCronologico(response.data.F2 || []),
        F3: sortCronologico(response.data.F3 || []),
        F4: sortCronologico(response.data.F4 || []),
        F5: sortCronologico(response.data.F5 || [])
      });
    } catch (error) {
      console.error("❌ Erro ao carregar CRM", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetalhes = (cicloId) => {
    setSelectedCicloId(cicloId);
    setModalOpen(true);
  };

  const handleWhatsappClick = (e, numero, nome) => {
    e.stopPropagation();
    if (!numero) return alert("Paciente sem número cadastrado");
    const cleanNum = numero.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanNum}?text=Olá ${nome}, tudo bem? Falamos da Clínica Limalé.`, '_blank');
  };

  const displayedCards = useMemo(() => {
    const cards = rawData[activePhase] || [];
    if (!searchTerm) return cards;
    const lowerSearch = searchTerm.toLowerCase();
    return cards.filter(c => 
      c.paciente_nome?.toLowerCase().includes(lowerSearch) || 
      c.tipo?.toLowerCase().includes(lowerSearch) ||
      c.dados_agendamento?.procedimento?.toLowerCase().includes(lowerSearch)
    );
  }, [rawData, activePhase, searchTerm]);

  if (loading) return <LinearProgress />;

  return (
    <Box sx={{ p: 1.5, minHeight: '100vh', bgcolor: '#f4f5f7' }}>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333' }}>
          Gestão de Pacientes (CRM)
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, next) => next && setViewMode(next)}
            size="small"
            sx={{ bgcolor: 'white' }}
          >
            <ToggleButton value="table"><FaListUl style={{ marginRight: '5px' }} /> Tabela</ToggleButton>
            <ToggleButton value="kanban"><FaThLarge style={{ marginRight: '5px' }} /> Kanban</ToggleButton>
          </ToggleButtonGroup>

          <TextField 
            size="small"
            placeholder="Buscar paciente ou exame..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ bgcolor: 'white', borderRadius: 1, width: '250px', '& .MuiInputBase-input': { p: 1, fontSize: '0.8rem' } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><FaSearch size={12} color="#999" /></InputAdornment> }}
          />
        </Box>
      </Box>

      {/* Cabeçalho de Fases (KPIs) */}
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {PHASES.map((phase) => {
          const count = rawData[phase.id]?.length || 0;
          const totalValue = rawData[phase.id]?.reduce((acc, item) => acc + (parseFloat(item.receita_acumulada) || 0), 0) || 0;
          const isActive = activePhase === phase.id;

          return (
            <Grid item xs={12} sm={6} md={2.4} key={phase.id}>
              <Paper 
                elevation={isActive ? 4 : 1}
                onClick={() => setActivePhase(phase.id)}
                sx={{ 
                  p: 1, 
                  cursor: 'pointer', 
                  bgcolor: isActive ? phase.color : 'white',
                  borderTop: `4px solid ${phase.border}`,
                  transition: '0.2s',
                  opacity: isActive ? 1 : 0.8
                }}
              >
                <Typography noWrap variant="subtitle2" sx={{ color: '#555', fontWeight: 'bold', fontSize: '0.75rem' }}>{phase.title}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', my: 0.5, color: '#333', lineHeight: 1 }}>{count}</Typography>
                <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, fontSize: '0.65rem' }}>
                  Previsão: {formatMoney(totalValue)}
                </Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {viewMode === 'kanban' ? (
        /* VISÃO EM CARDS (KANBAN) */
        <Grid container spacing={1}>
          {displayedCards.map((ciclo) => (
            <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={ciclo.id}>
              <Card 
                elevation={1} 
                sx={{ borderRadius: 1, borderLeft: `4px solid ${PHASES.find(p=>p.id === activePhase).border}`, cursor: 'pointer', bgcolor: ciclo.proxima_acao_imediata?.atrasada ? '#fffbfa' : 'white' }}
                onClick={() => handleOpenDetalhes(ciclo.id)}
              >
                <CardContent sx={{ p: '8px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Avatar sx={{ bgcolor: '#eee', width: 22, height: 22, mr: 0.5, fontSize: '0.7rem' }}>{ciclo.paciente_nome?.charAt(0)}</Avatar>
                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 'bold', flexGrow: 1, fontSize: '0.75rem' }}>{ciclo.paciente_nome}</Typography>
                    <IconButton size="small" onClick={(e) => handleWhatsappClick(e, ciclo.paciente_whatsapp, ciclo.paciente_nome)}><FaWhatsapp color="#25D366" size={12} /></IconButton>
                  </Box>

                  {ciclo.alerta_clinico && (
                    <Box sx={{ bgcolor: '#fff3e0', color: '#e65100', borderRadius: 1, px: 0.8, py: 0.4, mb: 1, fontSize: '0.7rem', fontWeight: 'bold' }}>
                      {ciclo.alerta_clinico.semanas}s + {ciclo.alerta_clinico.dias}d • {ciclo.alerta_clinico.texto}
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#666' }}>
                    <span>{ciclo.dados_agendamento ? new Date(ciclo.dados_agendamento.data).toLocaleDateString('pt-BR') : 'Sem data'}</span>
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
      ) : (
        /* VISÃO EM TABELA OPERACIONAL */
        <TableContainer component={Paper} sx={{ borderRadius: 1, boxShadow: 1, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8f9fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Paciente</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Idade Gestacional & Alerta Clínico</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Data</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Procedimento</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Próxima Ação (CRM)</TableCell>
                <TableCell align="right"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedCards.map((ciclo) => {
                const isAtrasado = ciclo.proxima_acao_imediata?.atrasada;
                return (
                  <TableRow 
                    key={ciclo.id} 
                    hover 
                    onClick={() => handleOpenDetalhes(ciclo.id)}
                    sx={{ 
                      cursor: 'pointer',
                      bgcolor: isAtrasado ? '#fff5f5' : 'inherit', // Linha avermelhada para atrasados
                      '&:hover': { bgcolor: isAtrasado ? '#fee2e2 !important' : '#f1f5f9 !important' }
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{ciclo.paciente_nome?.charAt(0)}</Avatar>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{ciclo.paciente_nome}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {ciclo.alerta_clinico ? (
                        <Box sx={{ display: 'inline-flex', bgcolor: '#fff3e0', color: '#e65100', px: 1, py: 0.2, borderRadius: 1, fontSize: '0.7rem', fontWeight: 'bold' }}>
                          {ciclo.alerta_clinico.semanas}s + {ciclo.alerta_clinico.dias}d • {ciclo.alerta_clinico.texto}
                        </Box>
                      ) : <Typography sx={{ fontSize: '0.7rem', color: '#999' }}>--</Typography>}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>
                      {ciclo.dados_agendamento ? new Date(ciclo.dados_agendamento.data).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                      {ciclo.dados_agendamento?.procedimento || ciclo.tipo}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: isAtrasado ? '#d32f2f' : '#1976d2' }}>
                        {isAtrasado && <FaExclamationTriangle size={12} />}
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          {ciclo.proxima_acao_imediata?.descricao || "Definir próxima ação"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={(e) => handleWhatsappClick(e, ciclo.paciente_whatsapp, ciclo.paciente_nome)}>
                        <FaWhatsapp color="#25D366" size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {displayedCards.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center', color: '#999' }}>Nenhum registro encontrado nesta fase.</Box>
          )}
        </TableContainer>
      )}

      <CicloDetalhesModal open={modalOpen} onClose={() => setModalOpen(false)} cicloId={selectedCicloId} onUpdate={loadData} />
    </Box>
  );
}