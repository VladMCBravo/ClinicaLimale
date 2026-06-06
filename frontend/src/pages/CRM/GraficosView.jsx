import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

export default function GraficosView({ rawData, PHASES }) {
  const todosPacientes = Object.values(rawData).flat();

  // 1. Dados do Funil
  const dadosFunil = PHASES.map(phase => ({
    name: phase.title.split('.')[0], 
    fullName: phase.title,
    pacientes: rawData[phase.id]?.length || 0,
    receita: rawData[phase.id]?.reduce((acc, i) => acc + (parseFloat(i.receita_acumulada) || 0), 0) || 0,
    color: phase.border
  }));

  // 2. Dados de Marketing (Origem de Aquisição) - NOVO!
  const origemCount = {};
  todosPacientes.forEach(p => {
      const origem = p.comportamento_resumo?.origem || 'Não Informado';
      origemCount[origem] = (origemCount[origem] || 0) + 1;
  });

  const coresMarketing = ['#1976d2', '#e91e63', '#fbc02d', '#4caf50', '#9c27b0', '#ff9800', '#607d8b'];
  const dadosOrigem = Object.keys(origemCount).map((key, index) => ({
      name: key,
      value: origemCount[key],
      color: coresMarketing[index % coresMarketing.length]
  })).filter(item => item.value > 0);

  // 3. Dados Operacional
  let semAgendamento = 0; let atrasados = 0; let agendadosNormais = 0;
  todosPacientes.forEach(p => {
    if (!p.dados_agendamento) semAgendamento++; else agendadosNormais++;
    if (p.proxima_acao_imediata?.atrasada) atrasados++;
  });
  const dadosOperacional = [
    { name: 'Em dia', value: agendadosNormais, color: '#2196f3' },
    { name: 'Sem Agendamento', value: semAgendamento, color: '#9e9e9e' },
    { name: 'Ações Atrasadas', value: atrasados, color: '#e53935' },
  ].filter(item => item.value > 0);

  const chartHeight = 260; 

  return (
    <Grid container spacing={1.5} sx={{ pb: 4 }}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 1.5, height: 320, bgcolor: '#fff', borderRadius: 1 }} className="print-card">
          <Typography variant="subtitle2" fontWeight="bold" color="#444" gutterBottom>Conversão e Receita</Typography>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={dadosFunil} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value, name, props) => name === 'receita' ? [formatMoney(value), 'Receita'] : [value, props.payload.fullName]} />
              <Bar yAxisId="left" dataKey="pacientes" name="Pacientes" fill="#8884d8" radius={[2, 2, 0, 0]}>
                {dadosFunil.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* NOVO: GRÁFICO DE MARKETING */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 1.5, height: 320, bgcolor: '#fff', borderRadius: 1 }} className="print-card">
          <Typography variant="subtitle2" fontWeight="bold" color="#444" gutterBottom>Origem de Mídia / Campanhas</Typography>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie data={dadosOrigem} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" label={({name, value}) => `${name} (${value})`} labelLine={true}>
                {dadosOrigem.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }}/>
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 1.5, height: 320, bgcolor: '#fff', borderRadius: 1 }} className="print-card">
          <Typography variant="subtitle2" fontWeight="bold" color="#444" gutterBottom>Fuga Operacional</Typography>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie data={dadosOperacional} cx="50%" cy="50%" innerRadius={0} outerRadius={80} dataKey="value" label={({value}) => value} labelLine={false}>
                {dadosOperacional.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }}/>
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
    </Grid>
  );
}