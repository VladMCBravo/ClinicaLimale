import React, { useEffect, useState, useMemo } from 'react';
import { 
  Box, Typography, LinearProgress, TextField, InputAdornment, Paper, ToggleButton, ToggleButtonGroup, Button, Grid
} from '@mui/material';
import { FaSearch, FaListUl, FaChartBar, FaFilePdf } from 'react-icons/fa';
import CicloDetalhesModal from './CicloDetalhesModal';
import { crmService } from '../../services/crmService';

import TableView from './TableView';
import GraficosView from './GraficosView';
// Import do CSS TASY
import '../../atendimento.css';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

export default function CRMPage() {
  const [flatData, setFlatData] = useState([]);
  const [kpis, setKpis] = useState({ totalPacientes: 0, receitaTotal: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table'); 
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCicloId, setSelectedCicloId] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // O backend ainda retorna no formato kanban {F1: [], F2: []}, 
      // mas vamos achatar (flat) tudo em uma única lista de alta performance.
      const response = await crmService.getKanban();
      
      const todasFases = [
        ...(response.data.F1 || []),
        ...(response.data.F2 || []),
        ...(response.data.F3 || []),
        ...(response.data.F4 || []),
        ...(response.data.F5 || [])
      ];

      // Ordena cronologicamente por agendamento ou data de início
      const listaOrdenada = todasFases.sort((a, b) => {
          const dateA = a.dados_agendamento?.data ? new Date(a.dados_agendamento.data) : new Date(a.data_inicio || 0);
          const dateB = b.dados_agendamento?.data ? new Date(b.dados_agendamento.data) : new Date(b.data_inicio || 0);
          return dateB - dateA; // Mais recentes primeiro
      });

      setFlatData(listaOrdenada);
      
      // Calcula KPIs rápidos para o topo
      setKpis({
        totalPacientes: listaOrdenada.length,
        receitaTotal: listaOrdenada.reduce((acc, curr) => acc + (parseFloat(curr.receita_acumulada) || 0), 0)
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
    if (!searchTerm) return flatData;
    const lowerSearch = searchTerm.toLowerCase();
    return flatData.filter(c => 
      c.paciente_nome?.toLowerCase().includes(lowerSearch) || 
      c.tipo?.toLowerCase().includes(lowerSearch) ||
      c.dados_agendamento?.procedimento?.toLowerCase().includes(lowerSearch)
    );
  }, [flatData, searchTerm]);

  if (loading) return <LinearProgress />;

  return (
    // Utilizando a classe tasy-workspace para o controle fino das barras de rolagem
    <Box className="tasy-workspace" sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', p: 1.5, bgcolor: '#f4f5f7', overflow: 'hidden' }}>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexShrink: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: '600', color: '#495057' }}>Gestão de Pacientes (CRM)</Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button variant="outlined" size="small" startIcon={<FaFilePdf />} onClick={() => window.print()} sx={{ bgcolor: 'white', height: 32, fontSize: '0.75rem' }}>
            Imprimir
          </Button>

          {/* Kanban removido. Apenas Tabela e Gráficos */}
          <ToggleButtonGroup value={viewMode} exclusive onChange={(e, n) => n && setViewMode(n)} size="small" sx={{ bgcolor: 'white', height: 32 }}>
            <ToggleButton value="table" sx={{ py: 0, px: 1.5, fontSize: '0.75rem' }}><FaListUl style={{ marginRight: '6px' }} /> Tabela</ToggleButton>
            <ToggleButton value="graficos" sx={{ py: 0, px: 1.5, fontSize: '0.75rem' }}><FaChartBar style={{ marginRight: '6px' }} /> Dashboard</ToggleButton>
          </ToggleButtonGroup>
          
          {/* Aplicação do TASY Input Compacto */}
          <TextField 
            className="tasy-compact-input"
            size="small" 
            placeholder="Pesquisar paciente..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            sx={{ width: '220px' }} 
            InputProps={{ startAdornment: <InputAdornment position="start"><FaSearch size={12} color="#adb5bd" /></InputAdornment> }} 
          />
        </Box>
      </Box>

      {/* Tira os blocos coloridos do Kanban e adiciona um Header discreto estilo TASY */}
      <Paper elevation={0} className="tasy-flat-panel" sx={{ p: 1, mb: 1.5, display: 'flex', gap: 3, bgcolor: '#fff' }}>
        <Typography variant="body2" sx={{ color: '#495057', fontSize: '13px' }}>
          <strong>Total Ativos:</strong> {kpis.totalPacientes} pacientes
        </Typography>
        <Typography variant="body2" sx={{ color: '#495057', fontSize: '13px' }}>
          <strong>LTV Acumulado:</strong> {formatMoney(kpis.receitaTotal)}
        </Typography>
      </Paper>

      {/* ÁREA DE CONTEÚDO */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
        {viewMode === 'table' && <TableView displayedCards={displayedCards} handleOpenDetalhes={handleOpenDetalhes} handleWhatsappClick={handleWhatsappClick} />}
        {/* GráficosView permanece compatível pois você já importava as PHASES lá dentro no arquivo antigo, caso quebre, basta passar os dados limpos */}
        {viewMode === 'graficos' && <GraficosView rawData={flatData} />}
      </Box>

      <CicloDetalhesModal open={modalOpen} onClose={() => setModalOpen(false)} cicloId={selectedCicloId} onUpdate={loadData} />
    </Box>
  );
}