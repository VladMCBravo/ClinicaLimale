import React, { useEffect, useState, useMemo } from 'react';
import { 
  Box, Typography, LinearProgress, TextField, InputAdornment, Grid, Paper, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import { FaSearch, FaThLarge, FaListUl, FaChartBar } from 'react-icons/fa';
import CicloDetalhesModal from './CicloDetalhesModal';
import { crmService } from '../../services/crmService';

// IMPORTANDO OS COMPONENTES FILHOS QUE ACABAMOS DE CRIAR
import TableView from './TableView';
import KanbanView from './KanbanView';
import GraficosView from './GraficosView';

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
  const [viewMode, setViewMode] = useState('table'); 
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCicloId, setSelectedCicloId] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await crmService.getKanban();
      const sortCronologico = (lista) => lista.sort((a, b) => {
          const dateA = a.dados_agendamento?.data ? new Date(a.dados_agendamento.data) : new Date(a.data_inicio || 0);
          const dateB = b.dados_agendamento?.data ? new Date(b.dados_agendamento.data) : new Date(b.data_inicio || 0);
          return dateA - dateB; 
      });

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

  // --- NOVA INTELIGÊNCIA DE BUSCA GLOBAL ---
  // Observa o que você digita e pula para a coluna certa
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
      
      if (found) {
        setActivePhase(phase.id);
        break; // Achou o paciente, muda para a aba dele e para a busca
      }
    }
  }, [searchTerm, rawData]);
  // -----------------------------------------

  const handleOpenDetalhes = (cicloId) => { setSelectedCicloId(cicloId); setModalOpen(true); };

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

  // Descobre a cor da borda da fase atual para passar para o Kanban
  const activePhaseBorder = PHASES.find(p => p.id === activePhase)?.border || '#ccc';

  return (
    <Box sx={{ p: 1, minHeight: '100vh', bgcolor: '#f4f5f7' }}>
      
      {/* BARRA SUPERIOR ULTRA COMPACTA */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#333' }}>Gestão de Pacientes</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <ToggleButtonGroup value={viewMode} exclusive onChange={(e, n) => n && setViewMode(n)} size="small" sx={{ bgcolor: 'white', height: 32 }}>
            <ToggleButton value="table" sx={{ py: 0, px: 1, fontSize: '0.75rem' }}><FaListUl style={{ marginRight: '4px' }} /> Tabela</ToggleButton>
            <ToggleButton value="kanban" sx={{ py: 0, px: 1, fontSize: '0.75rem' }}><FaThLarge style={{ marginRight: '4px' }} /> Kanban</ToggleButton>
            <ToggleButton value="graficos" sx={{ py: 0, px: 1, fontSize: '0.75rem' }}><FaChartBar style={{ marginRight: '4px' }} /> Gráficos</ToggleButton>
          </ToggleButtonGroup>
          <TextField size="small" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ bgcolor: 'white', borderRadius: 1, width: '180px', '& .MuiInputBase-root': { height: 32, fontSize: '0.8rem' } }} InputProps={{ startAdornment: <InputAdornment position="start"><FaSearch size={10} /></InputAdornment> }} />
        </Box>
      </Box>

      {/* CABEÇALHOS DO FUNIL MAIS FINOS */}
      <Grid container spacing={1} sx={{ mb: 1.5 }}>
        {PHASES.map((phase) => (
          <Grid item xs={12} sm={6} md={2.4} key={phase.id}>
            <Paper elevation={activePhase === phase.id ? 2 : 0} onClick={() => setActivePhase(phase.id)} sx={{ px: 1, py: 0.5, cursor: 'pointer', bgcolor: activePhase === phase.id ? phase.color : 'white', borderTop: `3px solid ${phase.border}`, borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #e0e0e0', borderLeft: '1px solid #e0e0e0' }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#555', fontSize: '0.65rem' }}>{phase.title}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>{rawData[phase.id]?.length || 0}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#777' }}>{formatMoney(rawData[phase.id]?.reduce((acc, i) => acc + (parseFloat(i.receita_acumulada) || 0), 0))}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* RENDERIZAÇÃO DAS ABAS */}
      {viewMode === 'table' && <TableView displayedCards={displayedCards} handleOpenDetalhes={handleOpenDetalhes} handleWhatsappClick={handleWhatsappClick} />}
      {viewMode === 'kanban' && <KanbanView displayedCards={displayedCards} activePhaseBorder={activePhaseBorder} handleOpenDetalhes={handleOpenDetalhes} handleWhatsappClick={handleWhatsappClick} />}
      {viewMode === 'graficos' && <GraficosView rawData={rawData} PHASES={PHASES} />}

      <CicloDetalhesModal open={modalOpen} onClose={() => setModalOpen(false)} cicloId={selectedCicloId} onUpdate={loadData} />
    </Box>
  );
}