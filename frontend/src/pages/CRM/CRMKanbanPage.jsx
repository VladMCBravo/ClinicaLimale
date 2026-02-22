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
    <Box sx={{ p: 1.5, minHeight: '100vh', bgcolor: '#f4f5f7' }}>
      
      {/* BARRA SUPERIOR DE CONTROLES */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333' }}>Gestão de Pacientes (CRM)</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup value={viewMode} exclusive onChange={(e, n) => n && setViewMode(n)} size="small" sx={{ bgcolor: 'white' }}>
            <ToggleButton value="table"><FaListUl style={{ marginRight: '5px' }} /> Tabela</ToggleButton>
            <ToggleButton value="kanban"><FaThLarge style={{ marginRight: '5px' }} /> Kanban</ToggleButton>
            <ToggleButton value="graficos"><FaChartBar style={{ marginRight: '5px' }} /> Gráficos</ToggleButton>
          </ToggleButtonGroup>
          <TextField size="small" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ bgcolor: 'white', borderRadius: 1, width: '220px' }} InputProps={{ startAdornment: <InputAdornment position="start"><FaSearch size={12} /></InputAdornment> }} />
        </Box>
      </Box>

      {/* CABEÇALHOS DAS COLUNAS (O FUNIL) */}
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {PHASES.map((phase) => (
          <Grid item xs={12} sm={6} md={2.4} key={phase.id}>
            <Paper elevation={activePhase === phase.id ? 4 : 1} onClick={() => setActivePhase(phase.id)} sx={{ p: 1, cursor: 'pointer', bgcolor: activePhase === phase.id ? phase.color : 'white', borderTop: `4px solid ${phase.border}` }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666' }}>{phase.title}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', lineHeight: 1, my: 0.5 }}>{rawData[phase.id]?.length || 0}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>Previsão: {formatMoney(rawData[phase.id]?.reduce((acc, i) => acc + (parseFloat(i.receita_acumulada) || 0), 0))}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* O MAESTRO TRABALHANDO: Renderiza apenas a aba selecionada */}
      {viewMode === 'table' && (
        <TableView 
          displayedCards={displayedCards} 
          handleOpenDetalhes={handleOpenDetalhes} 
          handleWhatsappClick={handleWhatsappClick} 
        />
      )}

      {viewMode === 'kanban' && (
        <KanbanView 
          displayedCards={displayedCards} 
          activePhaseBorder={activePhaseBorder}
          handleOpenDetalhes={handleOpenDetalhes} 
          handleWhatsappClick={handleWhatsappClick} 
        />
      )}

      {viewMode === 'graficos' && (
        <GraficosView 
          rawData={rawData} 
          PHASES={PHASES} 
        />
      )}

      {/* MODAL MANTIDO NO PAI */}
      <CicloDetalhesModal open={modalOpen} onClose={() => setModalOpen(false)} cicloId={selectedCicloId} onUpdate={loadData} />
    </Box>
  );
}