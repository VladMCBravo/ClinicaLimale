import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, CircularProgress, Alert } from '@mui/material'; // Adicionado Alert e CircularProgress
import { Line } from 'react-chartjs-2';
import { faturamentoService } from '../../services/faturamentoService'; // Importe o serviço
import { 
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler 
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function ProjecaoCaixaView() {
    const [chartData, setChartData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        // Busca os dados reais do backend
        faturamentoService.getProjecaoFinanceira()
            .then(response => {
                const apiData = response.data;
                
                setChartData({
                    labels: apiData.labels,
                    datasets: [
                        {
                            label: 'Saldo Projetado (Caixa)',
                            data: apiData.saldo_projetado,
                            borderColor: 'rgb(53, 162, 235)',
                            backgroundColor: 'rgba(53, 162, 235, 0.5)',
                            tension: 0.3,
                            fill: true
                        },
                        {
                            label: 'Contas a Pagar (Dia)',
                            data: apiData.despesas_previstas, // Mostra picos de despesa
                            borderColor: 'rgba(255, 99, 132, 0.8)',
                            backgroundColor: 'rgba(255, 99, 132, 0.5)',
                            borderDash: [5, 5],
                            type: 'bar', // Misto: Linha de saldo + Barra de despesas
                            yAxisID: 'y1' // Eixo secundário para despesas não achatarem o saldo
                        }
                    ]
                });
            })
            .catch(err => {
                console.error("Erro na projeção:", err);
                setError(true);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const options = {
        responsive: true,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Fluxo de Caixa: Realizado + Futuro (30 Dias)' },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: { display: true, text: 'Saldo Acumulado' }
            },
            y1: { // Eixo secundário para as barras de despesa
                type: 'linear',
                display: true,
                position: 'right',
                grid: { drawOnChartArea: false },
                title: { display: true, text: 'Despesa do Dia' },
                min: 0
            },
        }
    };

    if (isLoading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">Não foi possível calcular a projeção financeira.</Alert>;
    if (!chartData) return null;

    return (
        <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom>Inteligência Financeira: O Futuro</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                O gráfico abaixo combina seu saldo atual com as receitas de agendamentos futuros e as parcelas de despesas cadastradas.
            </Typography>
            <Box sx={{ height: 400 }}>
                <Line data={chartData} options={options} />
            </Box>
        </Paper>
    );
}