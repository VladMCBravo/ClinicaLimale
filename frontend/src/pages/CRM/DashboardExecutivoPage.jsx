import React, { useEffect, useState } from 'react';
import { 
  Grid, Paper, Typography, Box, Card, CardContent, 
  LinearProgress, Chip, Alert, IconButton 
} from '@mui/material';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { FaSyncAlt } from 'react-icons/fa';
import crmService from '../../services/crmService';

// Cores do tema Limalé (Baseado nos prints)
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function DashboardExecutivoPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await crmService.getPainelExecutivo(); // <--- Alterado
      setData(response.data); // <--- Adicionado .data
    } catch (error) {
      console.error("Erro ao carregar dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading || !data) return <LinearProgress />;

  const { kpis_financeiros, kpis_estrategicos, riscos, funil, graficos } = data;

  return (
    <Box sx={{ p: 3, backgroundColor: '#1e1e2f', minHeight: '100vh', color: '#fff' }}>
      {/* CABEÇALHO */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Painel Executivo Limalé</Typography>
        <IconButton onClick={fetchData} sx={{ color: '#fff' }}><FaSyncAlt /></IconButton>
      </Box>

      {/* BLOC0 1: KPI CARDS (TOPO) */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <KPICard title="Receita Mensal" value={kpis_financeiros.receita_mensal} prefix="R$ " color="#4caf50" />
        <KPICard title="Margem Líquida" value={`${kpis_financeiros.margem_percentual}%`} sub={`R$ ${kpis_financeiros.margem_liquida}`} color="#2196f3" />
        <KPICard title="CAC (Custo Aquisição)" value={kpis_estrategicos.cac} prefix="R$ " color="#ff9800" />
        <KPICard title="LTV (Valor Vitalício)" value={kpis_estrategicos.ltv} prefix="R$ " color="#9c27b0" />
        <KPICard title="Risco Operacional" value={riscos.nivel_alto} sub="Pacientes Críticos" color="#f44336" isAlert />
      </Grid>

      {/* BLOCO 2: GRÁFICOS E FUNIL */}
      <Grid container spacing={3}>
        {/* Gráfico de Evolução (Linha) */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 400, backgroundColor: '#27293d', color: '#fff' }}>
            <Typography variant="h6" gutterBottom>Evolução de Receita (Real vs Projeção)</Typography>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graficos.evolucao_receita}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="data" stroke="#fff" />
                <YAxis stroke="#fff" />
                <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
                <Line type="monotone" dataKey="receita" stroke="#00d2ff" strokeWidth={3} dot={{r: 4}} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Gráfico de Origem (Pizza) */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 400, backgroundColor: '#27293d', color: '#fff' }}>
            <Typography variant="h6" gutterBottom>Origem de Receita</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie
                  data={graficos.origem_pie_chart}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="receita"
                >
                  {graficos.origem_pie_chart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* BLOCO 3: FUNIL DE VENDAS */}
      <Box sx={{ mt: 3 }}>
        <Paper sx={{ p: 3, backgroundColor: '#27293d', color: '#fff' }}>
          <Typography variant="h6" gutterBottom>Funil de Conversão (Snapshot)</Typography>
          <Grid container spacing={2} textAlign="center">
            <FunnelStep label="Entradas (F1)" value={funil.entradas} color="#90caf9" />
            <FunnelStep label="Conversão (F2)" value={funil.conversao} color="#64b5f6" />
            <FunnelStep label="Pós-Exame (F3)" value={funil.pos_exame} color="#42a5f5" />
            <FunnelStep label="Retenção (F4)" value={funil.retencao} color="#2196f3" />
          </Grid>
        </Paper>
      </Box>
    </Box>
  );
}

// Subcomponentes para limpeza do código
const KPICard = ({ title, value, sub, prefix = "", color, isAlert }) => (
  <Grid item xs={12} sm={6} md={2.4}>
    <Card sx={{ backgroundColor: isAlert ? '#ffebee' : '#27293d', color: isAlert ? '#c62828' : '#fff', height: '100%' }}>
      <CardContent>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>{title}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: color }}>
          {prefix}{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </Typography>
        {sub && <Typography variant="body2" sx={{ opacity: 0.8 }}>{sub}</Typography>}
      </CardContent>
    </Card>
  </Grid>
);

const FunnelStep = ({ label, value, color }) => (
  <Grid item xs={3}>
    <Box sx={{ p: 2, borderBottom: `4px solid ${color}`, backgroundColor: 'rgba(255,255,255,0.05)' }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{value}</Typography>
      <Typography variant="body2">{label}</Typography>
    </Box>
  </Grid>
);