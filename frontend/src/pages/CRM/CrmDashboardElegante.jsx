import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { crmService } from '../../services/crmService';

const CORES_PIZZA = ['#1C2E4A', '#3D5A80', '#98C1D9', '#EE6C4D', '#293241', '#E0FBFC'];

export default function CrmDashboardElegante({ macroArea }) { // Adicione a prop
    const [dadosBI, setDadosBI] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true); // Garante o loading ao trocar de aba
        crmService.getPainelExecutivo(macroArea).then(res => { // Passe a prop
            setDadosBI(res.data);
            setLoading(false);
        }).catch(err => {
            console.error("Erro ao carregar Dashboard", err);
            setLoading(false);
        });
    }, [macroArea]); // Adicione ao array de dependências

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5, height: '100%', alignItems: 'center' }}><CircularProgress /></Box>;
    if (!dadosBI) return <Typography>Erro ao carregar os dados de inteligência.</Typography>;

    const { inteligencia_negocio, funil } = dadosBI;
    
    const dadosFunil = [
        { etapa: '1. Entrada', total: funil.entradas },
        { etapa: '2. Conversão', total: funil.conversao },
        { etapa: '3. Pós-Exame', total: funil.pos_exame },
        { etapa: '4. Retenção', total: funil.retencao }
    ];

    // Checagem para evitar gráficos totalmente em branco
    const semOrigem = !inteligencia_negocio?.origem_captacao || inteligencia_negocio.origem_captacao.length === 0;
    const semObjetoes = !inteligencia_negocio?.motivos_abandono || inteligencia_negocio.motivos_abandono.length === 0;

    return (
        // O Box principal com height 100% garante que ele preencha a tela perfeitamente
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
            
            {/* LINHA SUPERIOR (Divide a tela 50% / 50%) */}
            <Box sx={{ display: 'flex', gap: 1.5, flex: 1, minHeight: 0 }}>
                
                {/* GRÁFICO 1: ORIGEM */}
                <Paper sx={{ flex: 1, p: 2, borderRadius: 2, display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(28,46,74,0.05)' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1C2E4A', mb: 1 }}>Origem dos Pacientes</Typography>
                    <Box sx={{ flexGrow: 1, position: 'relative' }}>
                        {semOrigem ? (
                            <Typography sx={{ color: '#aaa', fontSize: '0.8rem', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>Aguardando captação de dados...</Typography>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={inteligencia_negocio.origem_captacao} innerRadius="50%" outerRadius="80%" paddingAngle={4} dataKey="quantidade" nameKey="origem" stroke="none" label>
                                        {inteligencia_negocio.origem_captacao.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CORES_PIZZA[index % CORES_PIZZA.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} itemStyle={{ fontWeight: 'bold', color: '#1C2E4A', fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </Box>
                </Paper>

                {/* GRÁFICO 2: GARGALOS */}
                <Paper sx={{ flex: 1, p: 2, borderRadius: 2, display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(28,46,74,0.05)' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1C2E4A', mb: 1 }}>Gargalos de Venda (Objeções)</Typography>
                    <Box sx={{ flexGrow: 1, position: 'relative' }}>
                        {semObjetoes ? (
                            <Typography sx={{ color: '#aaa', fontSize: '0.8rem', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>Nenhuma objeção registrada...</Typography>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={inteligencia_negocio.motivos_abandono} layout="vertical" margin={{ left: 20, right: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="motivo" type="category" axisLine={false} tickLine={false} tick={{ fill: '#6c757d', fontSize: 11, fontWeight: 600 }} width={100} />
                                    <Tooltip cursor={{fill: 'rgba(28,46,74,0.04)'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                                    <Bar dataKey="quantidade" fill="#EE6C4D" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Box>
                </Paper>
            </Box>

            {/* LINHA INFERIOR (Ocupa os outros 50% da tela perfeitamente) */}
            <Paper sx={{ flex: 1, p: 2, borderRadius: 2, display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(28,46,74,0.05)', minHeight: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1C2E4A', mb: 1 }}>Saúde do Funil (Volume de Pacientes por Fase)</Typography>
                <Box sx={{ flexGrow: 1 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dadosFunil} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="corFunil" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#1C2E4A" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#1C2E4A" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="etapa" axisLine={false} tickLine={false} tick={{ fill: '#1C2E4A', fontWeight: 'bold', fontSize: 11 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                            <Area type="monotone" dataKey="total" stroke="#1C2E4A" strokeWidth={3} fillOpacity={1} fill="url(#corFunil)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </Box>
            </Paper>

        </Box>
    );
}