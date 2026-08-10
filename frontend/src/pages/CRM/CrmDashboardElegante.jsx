import React, { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { crmService } from '../../services/crmService';

const CORES_PIZZA = ['#1C2E4A', '#3D5A80', '#98C1D9', '#EE6C4D', '#293241', '#E0FBFC'];

export default function CrmDashboardElegante() {
    const [dadosBI, setDadosBI] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        crmService.getPainelExecutivo().then(res => {
            setDadosBI(res.data);
            setLoading(false);
        }).catch(err => {
            console.error("Erro ao carregar Dashboard", err);
            setLoading(false);
        });
    }, []);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
    if (!dadosBI) return <Typography>Erro ao carregar os dados de inteligência.</Typography>;

    const { inteligencia_negocio, funil } = dadosBI;
    
    // Converte o objeto de funil do backend para o gráfico
    const dadosFunil = [
        { etapa: '1. Entrada', total: funil.entradas },
        { etapa: '2. Conversão', total: funil.conversao },
        { etapa: '3. Pós-Exame', total: funil.pos_exame },
        { etapa: '4. Retenção', total: funil.retencao }
    ];

    return (
        <Grid container spacing={3}>
            {/* GRÁFICO 1: ORIGEM DE CAPTAÇÃO */}
            <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 8px 24px rgba(28,46,74,0.06)', height: 340, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1C2E4A', mb: 2 }}>Origem dos Pacientes</Typography>
                    <Box sx={{ flexGrow: 1 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={inteligencia_negocio?.origem_captacao || []} 
                                    innerRadius={70} outerRadius={110} 
                                    paddingAngle={4} dataKey="quantidade" nameKey="origem" stroke="none" label
                                >
                                    {(inteligencia_negocio?.origem_captacao || []).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CORES_PIZZA[index % CORES_PIZZA.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} itemStyle={{ fontWeight: 'bold', color: '#1C2E4A' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>
            </Grid>

            {/* GRÁFICO 2: MOTIVOS DE ABANDONO */}
            <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 8px 24px rgba(28,46,74,0.06)', height: 340, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1C2E4A', mb: 2 }}>Gargalos de Venda (Objeções)</Typography>
                    <Box sx={{ flexGrow: 1 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={inteligencia_negocio?.motivos_abandono || []} layout="vertical" margin={{ left: 20, right: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="motivo" type="category" axisLine={false} tickLine={false} tick={{ fill: '#6c757d', fontSize: 12, fontWeight: 600 }} width={110} />
                                <Tooltip cursor={{fill: 'rgba(28,46,74,0.04)'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="quantidade" fill="#EE6C4D" radius={[0, 8, 8, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>
            </Grid>

            {/* GRÁFICO 3: SAÚDE DO FUNIL DE VENDAS */}
            <Grid item xs={12}>
                <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 8px 24px rgba(28,46,74,0.06)', height: 300, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1C2E4A', mb: 2 }}>Saúde do Funil (Volume de Pacientes por Fase)</Typography>
                    <Box sx={{ flexGrow: 1 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dadosFunil}>
                                <defs>
                                    <linearGradient id="corFunil" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1C2E4A" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#1C2E4A" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="etapa" axisLine={false} tickLine={false} tick={{ fill: '#1C2E4A', fontWeight: 'bold' }} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="total" stroke="#1C2E4A" strokeWidth={3} fillOpacity={1} fill="url(#corFunil)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>
            </Grid>
        </Grid>
    );
}