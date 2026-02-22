import React from 'react';
import { Grid, Paper, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

export default function GraficosView({ rawData, PHASES }) {
  // Prepara dados do Funil
  const dadosFunil = PHASES.map(phase => ({
    name: phase.title,
    pacientes: rawData[phase.id]?.length || 0,
    receita: rawData[phase.id]?.reduce((acc, i) => acc + (parseFloat(i.receita_acumulada) || 0), 0) || 0,
    color: phase.border
  }));

  // Prepara dados da Pizza (Alertas)
  const alertasCount = { 'Normal': 0, 'Aviso': 0, 'Alta': 0, 'Urgente': 0 };
  Object.values(rawData).flat().forEach(paciente => {
    if (!paciente.alerta_clinico) alertasCount['Normal']++;
    else {
       const p = paciente.alerta_clinico.prioridade;
       if (p === 'urgente') alertasCount['Urgente']++;
       else if (p === 'alta') alertasCount['Alta']++;
       else alertasCount['Aviso']++;
    }
  });

  const dadosPizza = [
    { name: 'Normal', value: alertasCount['Normal'], color: '#4caf50' },
    { name: 'Aviso Leve', value: alertasCount['Aviso'], color: '#ffb300' },
    { name: 'Prioridade Alta', value: alertasCount['Alta'], color: '#f4511e' },
    { name: 'Urgente', value: alertasCount['Urgente'], color: '#d32f2f' },
  ].filter(item => item.value > 0);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2, height: 400, bgcolor: '#fff' }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Desempenho do Funil</Typography>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={dadosFunil} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="name" tick={{fontSize: 12}} />
              <YAxis yAxisId="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tickFormatter={(v) => `R$ ${v/1000}k`} />
              <Tooltip formatter={(value, name) => name === 'receita' ? [formatMoney(value), 'Receita'] : [value, 'Pacientes']} />
              <Legend />
              <Bar yAxisId="left" dataKey="pacientes" name="Quantidade" fill="#8884d8">
                {dadosFunil.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Bar>
              <Bar yAxisId="right" dataKey="receita" name="Receita" fill="#82ca9d" opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, height: 400, bgcolor: '#fff' }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Termômetro Clínico</Typography>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie data={dadosPizza} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>
                {dadosPizza.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
    </Grid>
  );
}