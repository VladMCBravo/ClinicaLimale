import React, { useEffect, useState, useMemo } from 'react';
import { 
  Box, Typography, Card, CardContent, Chip, Avatar, LinearProgress, IconButton, 
  Grid, TextField, InputAdornment, Paper, Button
} from '@mui/material';
import { FaWhatsapp, FaExclamationTriangle, FaRegCalendarAlt, FaSearch, FaFilter } from 'react-icons/fa';
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
  const [activePhase, setActivePhase] = useState('F2'); // Começa mostrando os Agendados
  const [searchTerm, setSearchTerm] = useState('');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCicloId, setSelectedCicloId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await crmService.getKanban();
      setRawData({
        F1: response.data.F1 || [],
        F2: response.data.F2 || [],
        F3: response.data.F3 || [],
        F4: response.data.F4 || [],
        F5: response.data.F5 || []
      });
    } catch (error) {
      console.error("Erro ao carregar CRM", error);
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

  // Filtra os cards da fase ativa baseada na pesquisa de texto
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
    <Box sx={{ p: 2, minHeight: '100vh', bgcolor: '#f4f5f7' }}>
      
      {/* CABEÇALHO E FILTROS */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>
          Gestão de Pacientes (CRM)
        </Typography>
        <TextField 
          size="small"
          placeholder="Buscar paciente ou especialidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ bgcolor: 'white', borderRadius: 1, width: '300px' }}
          InputProps={{ startAdornment: <InputAdornment position="start"><FaSearch color="#999" /></InputAdornment> }}
        />
      </Box>

      {/* DASHBOARD DE FASES (Botões clicáveis) */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {PHASES.map((phase) => {
          const count = rawData[phase.id]?.length || 0;
          const totalValue = rawData[phase.id]?.reduce((acc, item) => acc + (parseFloat(item.receita_acumulada) || 0), 0) || 0;
          const isActive = activePhase === phase.id;

          return (
            <Grid item xs={12} sm={6} md={2.4} key={phase.id}>
              <Paper 
                elevation={isActive ? 6 : 1}
                onClick={() => setActivePhase(phase.id)}
                sx={{ 
                  p: 2, 
                  cursor: 'pointer', 
                  bgcolor: isActive ? phase.color : 'white',
                  borderTop: `4px solid ${phase.border}`,
                  transition: '0.2s',
                  transform: isActive ? 'scale(1.02)' : 'none'
                }}
              >
                <Typography variant="subtitle2" sx={{ color: '#555', fontWeight: 'bold' }}>{phase.title}</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1, color: '#333' }}>{count}</Typography>
                <Typography variant="caption" sx={{ color: '#666', fontWeight: 600 }}>
                  Previsão: {formatMoney(totalValue)}
                </Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* LISTA DE CARDS DA FASE SELECIONADA */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#444' }}>
        {PHASES.find(p => p.id === activePhase)?.title} ({displayedCards.length})
      </Typography>

      <Grid container spacing={2}>
        {displayedCards.map((ciclo) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={ciclo.id}>
            <Card 
              elevation={1} 
              sx={{ borderRadius: 2, borderLeft: `4px solid ${PHASES.find(p=>p.id === activePhase).border}`, cursor: 'pointer', '&:hover': { boxShadow: 3 } }}
              onClick={() => handleOpenDetalhes(ciclo.id)}
            >
              <CardContent sx={{ p: '12px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: '#eee', color: '#333', width: 28, height: 28, mr: 1, fontWeight: 'bold', fontSize: '0.9rem' }}>
                    {ciclo.paciente_nome?.charAt(0)}
                  </Avatar>
                  <Typography variant="subtitle1" noWrap sx={{ fontWeight: 'bold', flexGrow: 1, lineHeight: 1.1 }}>
                    {ciclo.paciente_nome}
                  </Typography>
                  <IconButton size="small" sx={{ bgcolor: '#e8f5e9' }} onClick={(e) => handleWhatsappClick(e, ciclo.paciente_whatsapp, ciclo.paciente_nome)}>
                    <FaWhatsapp color="#25D366" size={14} />
                  </IconButton>
                </Box>

                {/* VOLTA DA TAG DE GESTAÇÃO (Semanas + Dias) */}
                {ciclo.tipo === 'GESTACAO' && ciclo.idade_gestacional && (
                  <Box sx={{ mb: 1 }}>
                    <Chip 
                      label={ciclo.idade_gestacional} 
                      size="small" 
                      sx={{ bgcolor: '#ffe0b2', color: '#e65100', fontWeight: 'bold', borderRadius: 1 }} 
                    />
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, color: '#666' }}>
                  {ciclo.dados_agendamento ? (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FaRegCalendarAlt size={12} />
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                          {new Date(ciclo.dados_agendamento.data).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                        </Typography>
                      </Box>
                      <Typography noWrap sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#333', maxWidth: '60%' }}>
                        {ciclo.dados_agendamento.procedimento || ciclo.tipo}
                      </Typography>
                    </>
                  ) : (
                    <Chip label="Sem Agendamento" size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                  )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, pt: 1, borderTop: '1px dashed #ddd', color: ciclo.proxima_acao_imediata?.atrasada ? '#d32f2f' : '#1976d2' }}>
                  {ciclo.proxima_acao_imediata?.atrasada && <FaExclamationTriangle size={12} />}
                  <Typography noWrap sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    {ciclo.proxima_acao_imediata?.descricao || "Sem próxima ação definida"}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {displayedCards.length === 0 && (
          <Box sx={{ p: 4, width: '100%', textAlign: 'center', color: '#999' }}>
            Nenhum paciente encontrado nesta fase.
          </Box>
        )}
      </Grid>

      <CicloDetalhesModal open={modalOpen} onClose={() => setModalOpen(false)} cicloId={selectedCicloId} onUpdate={loadData} />
    </Box>
  );
}