import React from 'react';
import { Box, Grid, Paper, Typography, Stack } from '@mui/material';
import { Warning } from '@mui/icons-material';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import dayjs from 'dayjs';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function FinanceiroDashboardView({ lancamentos, despesas, projectionData }) {
    return (
        <Box sx={{ mt: 1 }}>
            <Grid container spacing={1.5}>
                {/* 1. GRÁFICO PRINCIPAL: FLUXO MENSAL */}
                <Grid item xs={12} md={7}>
                    <Paper variant="outlined" sx={{ p: 1.5, height: 280, borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 1 }}>
                            FLUXO DE CAIXA MENSAL (ENTRADAS VS SAÍDAS)
                        </Typography>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={projectionData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${v}`} />
                                <RechartsTooltip />
                                <Bar dataKey="entradas" fill="#1976d2" radius={[3, 3, 0, 0]} barSize={25} />
                                <Bar dataKey="saidas" fill="#d32f2f" radius={[3, 3, 0, 0]} barSize={25} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* 2. MINI INDICADORES */}
                <Grid item xs={12} md={5}>
                    <Grid container spacing={1.5}>
                        <Grid item xs={6}>
                            <Paper variant="outlined" sx={{ p: 1.5, height: 132, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">TICKETS PENDENTES</Typography>
                                <Typography variant="h5" color="warning.main" fontWeight="bold" sx={{ mt: 1 }}>
                                    {lancamentos.filter(l => l.status === 'Pendente').length}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">Total a cobrar</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6}>
                            <Paper variant="outlined" sx={{ p: 1.5, height: 132, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">CONVERSÃO PAGOS</Typography>
                                <Typography variant="h5" color="success.main" fontWeight="bold" sx={{ mt: 1 }}>
                                    {lancamentos.length > 0 ? ((lancamentos.filter(l => l.status === 'Pago').length / lancamentos.length) * 100).toFixed(0) : 0}%
                                </Typography>
                                <Typography variant="caption" color="text.secondary">Taxa de recebimento</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12}>
                             <Paper variant="outlined" sx={{ p: 1.5, height: 132, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight="bold">DÉBITOS ATRASADOS</Typography>
                                    <Typography variant="h5" color="error.main" fontWeight="bold">
                                        {formatMoney(lancamentos.filter(l => l.status === 'Pendente' && dayjs(l.data_vencimento).isBefore(dayjs(), 'day')).reduce((acc, i) => acc + Number(i.valor), 0))}
                                    </Typography>
                                </Box>
                                <Warning color="error" sx={{ opacity: 0.2, fontSize: 40 }} />
                             </Paper>
                        </Grid>
                    </Grid>
                </Grid>

                {/* 3. DISTRIBUIÇÃO DE DESPESAS */}
                <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 1.5, height: 220, borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 1 }}>
                            DISTRIBUIÇÃO DE DESPESAS (FIXAS VS VARIÁVEIS)
                        </Typography>
                        <ResponsiveContainer width="100%" height="85%">
                            <BarChart layout="vertical" data={[
                                { name: 'Fixas', valor: despesas.filter(d => d.categoria_tipo === 'Fixa').reduce((acc, i) => acc + Number(i.valor), 0) },
                                { name: 'Variáveis', valor: despesas.filter(d => d.categoria_tipo !== 'Fixa').reduce((acc, i) => acc + Number(i.valor), 0) }
                            ]}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tick={{fontSize: 11}} width={70} />
                                <RechartsTooltip />
                                <Bar dataKey="valor" fill="#455a64" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* 4. ATIVIDADE RECENTE */}
                <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 1.5, height: 220, borderRadius: 2, overflow: 'hidden' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 1 }}>
                            ÚLTIMOS LANÇAMENTOS
                        </Typography>
                        <Stack spacing={0.5}>
                            {lancamentos.slice(0, 5).map(l => (
                                <Box key={l.id} sx={{ display: 'flex', justifyContent: 'space-between', p: 0.5, borderBottom: '1px dashed #eee' }}>
                                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 600 }}>{l.paciente_nome?.substring(0, 20)}...</Typography>
                                    <Typography sx={{ fontSize: '0.7rem', color: l.status === 'Pago' ? 'green' : 'orange', fontWeight: 'bold' }}>{formatMoney(l.valor)}</Typography>
                                </Box>
                            ))}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}