import React, { useState, useEffect, useMemo } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, Button, 
    TextField, Grid, Typography, Box, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Paper, Alert 
} from '@mui/material';
import { Calculate, Save } from '@mui/icons-material';
import dayjs from 'dayjs';

// Função auxiliar simples de formatação
const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function RenegociacaoModal({ open, onClose, itensSelecionados = [], onConfirm }) {
    // Calcula o total da dívida selecionada
    const totalOriginal = useMemo(() => 
        itensSelecionados.reduce((acc, item) => acc + Number(item.valor || 0), 0), 
    [itensSelecionados]);

    const [config, setConfig] = useState({
        acrescimo: 0,
        desconto: 0,
        qtdParcelas: 1,
        primeiroVencimento: dayjs().add(1, 'month').format('YYYY-MM-DD')
    });

    const [simulacao, setSimulacao] = useState([]);
    const [totalNovo, setTotalNovo] = useState(0);

    // Recalcula sempre que a configuração mudar
    useEffect(() => {
        if (!open) return;

        const valorBase = Number(totalOriginal);
        const acrescimo = Number(config.acrescimo) || 0;
        const desconto = Number(config.desconto) || 0;
        
        const valorFinal = Math.max(0, (valorBase + acrescimo) - desconto);
        setTotalNovo(valorFinal);

        const qtd = Math.max(1, Number(config.qtdParcelas));
        const valorParcela = valorFinal / qtd;
        
        const novas = [];
        for (let i = 0; i < qtd; i++) {
            novas.push({
                numero: i + 1,
                valor: valorParcela,
                vencimento: dayjs(config.primeiroVencimento).add(i, 'month').format('YYYY-MM-DD')
            });
        }
        setSimulacao(novas);

    }, [config, totalOriginal, open]);

    const handleConfirmar = () => {
        // Envia para o pai a lista de novas parcelas e os IDs originais
        onConfirm(simulacao, totalNovo);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ bgcolor: '#1a233b', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Calculate /> Renegociação de Dívida
            </DialogTitle>
            
            <DialogContent sx={{ mt: 2 }}>
                <Grid container spacing={3}>
                    {/* ESQUERDA: CONFIGURAÇÃO */}
                    <Grid item xs={12} md={5}>
                        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#fff3e0' }}>
                            <Typography variant="caption" fontWeight="bold">DÍVIDA ORIGINAL ({itensSelecionados.length} itens)</Typography>
                            <Typography variant="h5" color="error" fontWeight="bold">
                                {formatMoney(totalOriginal)}
                            </Typography>
                        </Paper>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField 
                                label="Acréscimo / Multa (R$)" type="number" size="small" fullWidth
                                value={config.acrescimo}
                                onChange={e => setConfig({...config, acrescimo: e.target.value})}
                            />
                            <TextField 
                                label="Desconto (R$)" type="number" size="small" fullWidth
                                value={config.desconto}
                                onChange={e => setConfig({...config, desconto: e.target.value})}
                            />
                            <TextField 
                                label="Qtd. Parcelas" type="number" size="small" fullWidth
                                value={config.qtdParcelas}
                                onChange={e => setConfig({...config, qtdParcelas: e.target.value})}
                            />
                            <TextField 
                                label="1º Vencimento" type="date" size="small" fullWidth
                                value={config.primeiroVencimento}
                                onChange={e => setConfig({...config, primeiroVencimento: e.target.value})}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>

                        <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: '#e8f5e9' }}>
                            <Typography variant="caption" fontWeight="bold">NOVO TOTAL A RECEBER</Typography>
                            <Typography variant="h5" color="success.main" fontWeight="bold">
                                {formatMoney(totalNovo)}
                            </Typography>
                        </Paper>
                    </Grid>

                    {/* DIREITA: SIMULAÇÃO */}
                    <Grid item xs={12} md={7}>
                        <Typography variant="subtitle2" gutterBottom>Prévia do Novo Parcelamento:</Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>#</TableCell>
                                        <TableCell>Vencimento</TableCell>
                                        <TableCell align="right">Valor</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {simulacao.map((p) => (
                                        <TableRow key={p.numero}>
                                            <TableCell>{p.numero}</TableCell>
                                            <TableCell>{dayjs(p.vencimento).format('DD/MM/YYYY')}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                {formatMoney(p.valor)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        
                        {config.desconto > 0 && (
                            <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
                                Atenção: Você está concedendo um desconto de {formatMoney(config.desconto)}.
                            </Alert>
                        )}
                    </Grid>
                </Grid>
            </DialogContent>
            
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit">Cancelar</Button>
                <Button 
                    variant="contained" color="primary" 
                    onClick={handleConfirmar}
                    startIcon={<Save />}
                >
                    Confirmar Renegociação
                </Button>
            </DialogActions>
        </Dialog>
    );
}