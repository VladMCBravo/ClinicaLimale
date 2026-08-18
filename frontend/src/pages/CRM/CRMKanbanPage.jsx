import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, TextField, InputAdornment, Paper, CircularProgress } from '@mui/material';
import { FaSearch } from 'react-icons/fa';
import FichaPacienteDrawer from './FichaPacienteDrawer'; 
import { crmService } from '../../services/crmService';
import TableView from './TableView';
import '../../atendimento.css';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

const PHASES = [
  { id: 'F1', title: '1. Novos', color: '#e3f2fd', border: '#90caf9' },
  { id: 'F2', title: '2. Agendados', color: '#e8f5e9', border: '#a5d6a7' },
  { id: 'F3', title: '3. Pós-Exame', color: '#fff3e0', border: '#ffcc80' },
  { id: 'F4', title: '4. Retenção', color: '#f3e5f5', border: '#ce93d8' },
  { id: 'F5', title: '5. Recuperação', color: '#ffebee', border: '#ef5350' }
];

export default function CRMKanbanPage({ macroArea }) { // Adicione a prop
  const [rawData, setRawData] = useState({ F1: [], F2: [], F3: [], F4: [], F5: [] });
  const [activePhase, setActivePhase] = useState('F2'); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCicloId, setSelectedCicloId] = useState(null);

  useEffect(() => { loadData(); }, [macroArea]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await crmService.getKanban(macroArea);
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* 
        NOVA LINHA SUPER COMPACTA 
        Pesquisa e os 5 Cards dividem a mesma linha para poupar 100% do espaço perdido 
      */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center', overflowX: 'auto', flexShrink: 0, pb: 0.5 }}>
          
          {/* Barra de Pesquisa */}
          <TextField 
            variant="outlined"
            placeholder="Buscar paciente..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
            sx={{ 
                width: '180px', flexShrink: 0, bgcolor: 'white', 
                '& .MuiInputBase-root': { height: '42px', borderRadius: 2, fontSize: '12px' } 
            }} 
            InputProps={{ startAdornment: <InputAdornment position="start"><FaSearch size={12} color="#adb5bd" /></InputAdornment> }} 
          />

          {/* Micro-Cards do Funil */}
          {PHASES.map((phase) => {
            const totalPacientes = rawData[phase.id]?.length || 0;
            const receitaFase = rawData[phase.id]?.reduce((acc, i) => acc + (parseFloat(i.receita_acumulada) || 0), 0) || 0;
            return (
              <Paper 
                key={phase.id} elevation={activePhase === phase.id ? 2 : 0} onClick={() => setActivePhase(phase.id)} 
                sx={{ 
                  flex: 1, minWidth: '120px', px: 1.5, py: 0.5, cursor: 'pointer', borderRadius: 2,
                  bgcolor: activePhase === phase.id ? phase.color : 'white', 
                  borderTop: `3px solid ${phase.border}`, transition: '0.1s',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '42px'
                }}
              >
                <Typography sx={{ fontWeight: 800, color: '#495057', fontSize: '9px', textTransform: 'uppercase', mb: 0.2 }}>{phase.title}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontWeight: 800, lineHeight: 1, color: '#212529', fontSize: '15px' }}>{totalPacientes}</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '9px', color: '#6c757d' }}>{formatMoney(receitaFase)}</Typography>
                </Box>
              </Paper>
            )
          })}
      </Box>

      {/* 
        ÁREA DA TABELA 
        Agora ela ocupa todo o restante da tela livremente.
        O loading fica por cima dela de forma translúcida, não travando a tela toda. 
      */}
      <Box sx={{ flexGrow: 1, minHeight: 0, position: 'relative', border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
        
        {loading && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.6)', zIndex: 10 }}>
                <CircularProgress size={30} />
            </Box>
        )}
        
        <TableView displayedCards={displayedCards} handleOpenDetalhes={handleOpenDetalhes} handleWhatsappClick={handleWhatsappClick} />
      
      </Box>

      {/* Drawer preservado, cumprindo o papel do antigo Modal */}
      <FichaPacienteDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} cicloId={selectedCicloId} onUpdate={loadData} />
    </Box>
  );
}