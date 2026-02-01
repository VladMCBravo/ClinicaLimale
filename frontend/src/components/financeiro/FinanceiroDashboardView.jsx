import React from 'react';
import { Box, Grid, Paper, Typography, Stack, Divider } from '@mui/material';
import { Warning } from '@mui/icons-material';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import dayjs from 'dayjs';

// Função de formatação para moeda brasileira
const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
}).format(val);

// Formatador curto para os eixos (ex: 1k em vez de 1000)
const formatAxis = (value) => {
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
    return `R$ ${value}`;
};

export default function FinanceiroDashboardView({ lancamentos, despesas, projectionData }) {
    return (
        <Box sx={{ mt: 0.5, overflow: 'hidden' }}>
            <Grid container spacing={1}>
                {/* 1. FLUXO MENSAL - Reduzido para 240px */}
                <Grid item xs={12} md={8}>
                    <Paper variant="outlined" sx={{ p: 1, height: 240, borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', ml: 1 }}>
                            FLUXO DE CAIXA MENSAL
                        </Typography>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={projectionData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 9}} axisLine={false} tickLine={false} tickFormatter={formatAxis} />
                                <RechartsTooltip formatter={(val) => formatMoney(val)} labelStyle={{ fontSize: 11 }} />
                                <Bar dataKey="entradas" fill="#1976d2" radius={[2, 2, 0, 0]} barSize={20} name="Entradas" />
                                <Bar dataKey="saidas" fill="#d32f2f" radius={[2, 2, 0, 0]} barSize={20} name="Saídas" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* 2. MINI CARDS - Mais densos */}
                <Grid item xs={12} md={4}>
                    <Grid container spacing={1}>
                        <Grid item xs={6}>
                            <Paper variant="outlined" sx={{ p: 1, height: 115, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', fontWeight: 800 }}>TICKETS PENDENTES</Typography>
                                <Typography variant="h5" color="warning.main" sx={{ fontWeight: 800, mt: 0.5 }}>
                                    {lancamentos.filter(l => l.status === 'Pendente').length}
                                </Typography>
                                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>Em aberto</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6}>
                            <Paper variant="outlined" sx={{ p: 1, height: 115, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', fontWeight: 800 }}>CONVERSÃO</Typography>
                                <Typography variant="h5" color="success.main" sx={{ fontWeight: 800, mt: 0.5 }}>
                                    {lancamentos.length > 0 ? ((lancamentos.filter(l => l.status === 'Pago').length / lancamentos.length) * 100).toFixed(0) : 0}%
                                </Typography>
                                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>Taxa de recebimento</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12}>
                             <Paper variant="outlined" sx={{ p: 1, height: 115, display: 'flex', alignItems: 'center', bgcolor: '#fff5f5' }}>
                                <Box sx={{ flex: 1, pl: 1 }}>
                                    <Typography variant="caption" color="error" sx={{ fontSize: '0.6rem', fontWeight: 800 }}>DÉBITOS ATRASADOS</Typography>
                                    <Typography variant="h5" color="error.main" sx={{ fontWeight: 800 }}>
                                        {formatMoney(lancamentos.filter(l => l.status === 'Pendente' && dayjs(l.data_vencimento).isBefore(dayjs(), 'day')).reduce((acc, i) => acc + Number(i.valor), 0))}
                                    </Typography>
                                </Box>
                                <Warning color="error" sx={{ opacity: 0.15, fontSize: 35, pr: 1 }} />
                             </Paper>
                        </Grid>
                    </Grid>
                </Grid>

                {/* 3. DISTRIBUIÇÃO E ÚLTIMOS - Reduzidos para 200px */}
                <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 1, height: 200, borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', ml: 1 }}>DISTRIBUIÇÃO DE DESPESAS</Typography>
                        <ResponsiveContainer width="100%" height="85%">
                            <BarChart layout="vertical" data={[
                                { name: 'Fixas', valor: despesas.filter(d => d.categoria_tipo === 'Fixa').reduce((acc, i) => acc + Number(i.valor), 0) },
                                { name: 'Variáveis', valor: despesas.filter(d => d.categoria_tipo !== 'Fixa').reduce((acc, i) => acc + Number(i.valor), 0) }
                            ]} margin={{ left: 10, right: 30 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={60} axisLine={false} />
                                <RechartsTooltip formatter={(val) => formatMoney(val)} />
                                <Bar dataKey="valor" fill="#455a64" radius={[0, 2, 2, 0]} barSize={15} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 1, height: 200, borderRadius: 2, overflow: 'hidden' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', ml: 1 }}>ÚLTIMOS LANÇAMENTOS</Typography>
                        <Stack spacing={0.2} sx={{ mt: 1 }}>
                            {lancamentos.slice(0, 6).map(l => (
                                <Box key={l.id} sx={{ display: 'flex', justifyContent: 'space-between', px: 1, py: 0.3, borderBottom: '1px solid #f9f9f9' }}>
                                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 600 }}>{l.paciente_nome?.substring(0, 25)}</Typography>
                                    <Typography sx={{ fontSize: '0.68rem', color: l.status === 'Pago' ? '#2e7d32' : '#ed6c02', fontWeight: 800 }}>{formatMoney(l.valor)}</Typography>
                                </Box>
                            ))}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}