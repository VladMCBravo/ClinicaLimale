import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, LinearProgress, TextField, InputAdornment, Paper, Grid } from '@mui/material';
import { FaSearch } from 'react-icons/fa';
import FichaPacienteDrawer from './FichaPacienteDrawer'; // A grande mudança aqui
import { crmService } from '../../services/crmService';
import TableView from './TableView';
import '../../atendimento.css';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

const PHASES = [
  { id: 'F1', title: '1. Novos Leads', color: '#e3f2fd', border: '#90caf9' },
  { id: 'F2', title: '2. Agendados', color: '#e8f5e9', border: '#a5d6a7' },
  { id: 'F3', title: '3. Pós-Atendimento', color: '#fff3e0', border: '#ffcc80' },
  { id: 'F4', title: '4. Retenção / Retorno', color: '#f3e5f5', border: '#ce93d8' },
  { id: 'F5', title: '5. Recuperação', color: '#ffebee', border: '#ef5350' }
];

export default function CRMKanbanPage() {
  const [rawData, setRawData] = useState({ F1: [], F2: [], F3: [], F4: [], F5: [] });
  const [activePhase, setActivePhase] = useState('F2'); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Controle do novo Drawer Lateral
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCicloId, setSelectedCicloId] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await crmService.getKanban();
      const sortCronologico = (lista) => lista.sort((a, b) => {
          const dateA = a.dados_agendamento?.data ? new Date(a.dados_agendamento.data) : new Date(a.data_inicio || 0);
          const dateB = b.dados_agendamento?.data ? new Date(b.dados_agendamento.data) : new Date(b.data_inicio || 0);
          return dateB - dateA; 
      });

      setRawData({
        F1: sortCronologico(response.data.F1 || []),
        F2: sortCronologico(response.data.F2 || []),
        F3: sortCronologico(response.data.F3 || []),
        F4: sortCronologico(response.data.F4 || []),
        F5: sortCronologico(response.data.F5 || [])
      });
    } catch (error) {
      console.error("Erro ao carregar CRM", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchTerm) return;
    const lowerSearch = searchTerm.toLowerCase();
    for (const phase of PHASES) {
      const cards = rawData[phase.id] || [];
      const found = cards.some(c => 
        c.paciente_nome?.toLowerCase().includes(lowerSearch) || 
        c.tipo?.toLowerCase().includes(lowerSearch) ||
        c.dados_agendamento?.procedimento?.toLowerCase().includes(lowerSearch)
      );
      if (found) { setActivePhase(phase.id); break; }
    }
  }, [searchTerm, rawData]);

  // ABRE O DRAWER EM VEZ DO MODAL
  const handleOpenDetalhes = (cicloId) => { setSelectedCicloId(cicloId); setDrawerOpen(true); };

  const handleWhatsappClick = (e, numero, nome, mensagemCustomizada) => {
    e.stopPropagation();
    if (!numero) return alert("Paciente sem número cadastrado");
    const cleanNum = numero.replace(/\D/g, '');
    const primeiroNome = nome.split(' ')[0];
    const textoBase = mensagemCustomizada || `Olá ${primeiroNome}, tudo bem? Aqui é da Clínica Limalé.`;
    window.open(`https://wa.me/55${cleanNum}?text=${encodeURIComponent(textoBase)}`, '_blank');
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* BARRA DE PESQUISA INTERNA DO FUNIL */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <TextField 
            size="small" placeholder="Pesquisar paciente..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
            sx={{ width: '300px', bgcolor: 'white' }} 
            InputProps={{ startAdornment: <InputAdornment position="start"><FaSearch size={12} color="#adb5bd" /></InputAdornment> }} 
          />
      </Box>

      <Grid container spacing={1} sx={{ mb: 2, flexShrink: 0 }}>
        {PHASES.map((phase) => {
          const totalPacientes = rawData[phase.id]?.length || 0;
          const receitaFase = rawData[phase.id]?.reduce((acc, i) => acc + (parseFloat(i.receita_acumulada) || 0), 0) || 0;
          return (
            <Grid item xs={12} sm={6} md={2.4} key={phase.id}>
              <Paper 
                elevation={activePhase === phase.id ? 2 : 0} onClick={() => setActivePhase(phase.id)} 
                sx={{ 
                  px: 1.5, py: 1, cursor: 'pointer', bgcolor: activePhase === phase.id ? phase.color : 'white', 
                  borderTop: `4px solid ${phase.border}`, transition: '0.2s',
                  '&:hover': { bgcolor: activePhase === phase.id ? phase.color : '#f8f9fa' }
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#495057', fontSize: '11px', textTransform: 'uppercase' }}>{phase.title}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mt: 0.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1, color: '#212529' }}>{totalPacientes}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '11px', color: '#6c757d' }}>{formatMoney(receitaFase)}</Typography>
                </Box>
              </Paper>
            </Grid>
          )
        })}
      </Grid>

      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <TableView displayedCards={displayedCards} handleOpenDetalhes={handleOpenDetalhes} handleWhatsappClick={handleWhatsappClick} />
      </Box>

      {/* O NOVO PAINEL LATERAL (Substitui o Modal) */}
      <FichaPacienteDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} cicloId={selectedCicloId} onUpdate={loadData} />
    </Box>
  );
}