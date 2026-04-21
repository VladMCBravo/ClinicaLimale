// src/components/painel/TabelaValoresModal.jsx
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Typography, Box, CircularProgress, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';

import axios from 'axios';

import { configuracoesService } from '../../services/configuracoesService';
import { faturamentoService } from '../../services/faturamentoService';
import { gerarPdfTabelaValores } from '../../utils/tabelaValoresPdfGenerator';

const CAT_LABELS = {
    'US_GERAL': 'Ultrassom Geral',
    'MED_FETAL': 'Medicina Fetal',
    'ECOCARDIOGRAMA': 'Ecocardiograma',
    'MUSCULO': 'Musculoesquelético',
    'DOPPLER': 'Doppler',
    'OUTROS': 'Outros'
};

export default function TabelaValoresModal({ open, onClose }) {
    const [isLoading, setIsLoading] = useState(false);
    const [isGerandoPdf, setIsGerandoPdf] = useState(false);
    const [especialidades, setEspecialidades] = useState([]);
    const [procedimentos, setProcedimentos] = useState([]);

    useEffect(() => {
        if (open) carregarDados();
    }, [open]);

    const carregarDados = async () => {
        setIsLoading(true);
        try {
            const [resEsp, resProc] = await Promise.all([
                configuracoesService.getEspecialidades(),
                faturamentoService.getProcedimentos()
            ]);
            setEspecialidades(resEsp.data || []);
            const procsOrdenados = (resProc.data || []).sort((a, b) => {
                if (a.categoria < b.categoria) return -1;
                if (a.categoria > b.categoria) return 1;
                return a.descricao.localeCompare(b.descricao);
            });
            setProcedimentos(procsOrdenados);
        } catch (error) {
            console.error("Erro ao carregar tabela", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGerarPdfComMascara = () => {
        setIsGerandoPdf(true);
        
        gerarPdfTabelaValores(especialidades, procedimentos, async (blob) => {
            try {
                const formData = new FormData();
                formData.append('arquivo_pdf', blob, 'tabela_valores.pdf');

                // Pegamos o token de segurança que o seu sistema já guarda no login
                const token = localStorage.getItem('token') || sessionStorage.getItem('token'); 

                // Faz a requisição enviando o token no cabeçalho
                const response = await axios.post(
                    `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/prontuario/aplicar-mascara/`, 
                    formData, 
                    {
                        headers: { 
                            'Content-Type': 'multipart/form-data',
                            'Authorization': `Bearer ${token}` // <--- Autenticação aqui
                        },
                        responseType: 'blob'
                    }
                );

                const fileURL = URL.createObjectURL(response.data);
                window.open(fileURL, '_blank');
                
            } catch (error) {
                console.error("Erro ao aplicar máscara no PDF", error);
                alert("Ocorreu um erro ao gerar o PDF com o timbre da clínica. Verifique sua conexão.");
            } finally {
                setIsGerandoPdf(false);
            }
        });
    };

    const formatMoney = (val) => {
        if (!val || Number(val) === 0) return 'Sob consulta';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const procsPorCategoria = procedimentos.reduce((acc, proc) => {
        const cat = proc.categoria || 'OUTROS';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(proc);
        return acc;
    }, {});

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="bold">Tabela de Valores</Typography>
            </DialogTitle>

            <DialogContent dividers sx={{ p: { xs: 2, md: 4 } }}>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : (
                    <Box>
                        <Typography variant="h6" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>Consultas Médicas</Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Especialidade</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold', width: '180px' }}>Valor Particular</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {especialidades.map(esp => (
                                        <TableRow key={esp.id}>
                                            <TableCell>{esp.nome}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, color: '#2e7d32' }}>{formatMoney(esp.valor_consulta)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Typography variant="h6" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>Procedimentos e Exames</Typography>
                        {Object.entries(procsPorCategoria).map(([categoria, procs]) => (
                            <Box key={categoria} sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" sx={{ bgcolor: '#e0e0e0', px: 2, py: 0.5, fontWeight: 'bold', borderRadius: '4px 4px 0 0', textTransform: 'uppercase' }}>
                                    {CAT_LABELS[categoria] || categoria.replace('_', ' ')}
                                </Typography>
                                <TableContainer component={Paper} variant="outlined" sx={{ borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
                                    <Table size="small">
                                        <TableBody>
                                            {procs.map(proc => (
                                                <TableRow key={proc.id}>
                                                    <TableCell>{proc.descricao}</TableCell>
                                                    <TableCell align="right" sx={{ width: '180px', fontWeight: 600, color: proc.valor_particular ? '#2e7d32' : 'text.secondary' }}>
                                                        {formatMoney(proc.valor_particular)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        ))}
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} color="inherit" startIcon={<CloseIcon />}>
                    Fechar
                </Button>
                <Button 
                    onClick={handleGerarPdfComMascara} 
                    variant="contained" 
                    color="primary" 
                    startIcon={isGerandoPdf ? <CircularProgress size={20} color="inherit" /> : <PrintIcon />} 
                    disabled={isLoading || isGerandoPdf}
                >
                    {isGerandoPdf ? 'A Gerar Documento...' : 'Gerar PDF com Timbre'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}