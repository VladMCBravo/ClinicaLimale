// src/components/painel/TabelaValoresModal.jsx
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Typography, Box, CircularProgress, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, TextField, InputAdornment
} from '@mui/material';
import { Print, Close, Search } from '@mui/icons-material';

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
    
    // Dados Originais
    const [especialidades, setEspecialidades] = useState([]);
    const [procedimentos, setProcedimentos] = useState([]);
    
    // Filtro de Busca
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (open) {
            carregarDados();
            setSearchTerm(''); // Limpa a busca ao abrir o modal
        }
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
        
        // Enviamos os dados ORIGINAIS (sem filtro) para o PDF sair completo
        gerarPdfTabelaValores(especialidades, procedimentos, async (blob) => {
            try {
                const formData = new FormData();
                formData.append('arquivo_pdf', blob, 'tabela_valores.pdf');

                // Busca os nomes de tokens mais comuns. (Adicionado access_token)
                const token = localStorage.getItem('access') || 
                              localStorage.getItem('token') || 
                              localStorage.getItem('access_token') || 
                              sessionStorage.getItem('token'); 

                // Configuração flexível: suporta Token e Cookies
                const config = {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    responseType: 'blob',
                    withCredentials: true // Fundamental se a sua API usar cookies para login
                };

                if (token) {
                    config.headers['Authorization'] = `Bearer ${token}`;
                }

                const response = await axios.post(
                    `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/prontuario/aplicar-mascara/`, 
                    formData, 
                    config
                );

                const fileURL = URL.createObjectURL(response.data);
                window.open(fileURL, '_blank');
                
            } catch (error) {
                console.error("Erro ao aplicar máscara no PDF", error);
                if (error.response && error.response.status === 401) {
                    alert("A sua sessão expirou ou não tem permissão. Atualize a página e faça login novamente.");
                } else {
                    alert("Ocorreu um erro ao gerar o PDF com o timbre. Verifique a conexão.");
                }
            } finally {
                setIsGerandoPdf(false);
            }
        });
    };

    const formatMoney = (val) => {
        if (!val || Number(val) === 0) return 'Sob consulta';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    // --- LÓGICA DE FILTRAGEM ---
    const lowerSearch = searchTerm.toLowerCase();
    
    const especialidadesFiltradas = especialidades.filter(esp => 
        esp.nome.toLowerCase().includes(lowerSearch)
    );

    const procedimentosFiltrados = procedimentos.filter(proc => 
        proc.descricao.toLowerCase().includes(lowerSearch)
    );

    const procsPorCategoria = procedimentosFiltrados.reduce((acc, proc) => {
        const cat = proc.categoria || 'OUTROS';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(proc);
        return acc;
    }, {});

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Typography variant="h6" fontWeight="bold">Tabela de Valores</Typography>
                
                {/* CAMPO DE BUSCA ADICIONADO */}
                <TextField
                    size="small"
                    placeholder="Buscar exame ou consulta..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search sx={{ color: 'gray', fontSize: 20 }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ width: 280, bgcolor: 'white' }}
                />
            </DialogTitle>

            <DialogContent dividers sx={{ p: { xs: 2, md: 4 }, bgcolor: '#fbfbfb' }}>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : (
                    <Box>
                        {/* Renderiza Consultas só se a busca encontrar algo */}
                        {especialidadesFiltradas.length > 0 && (
                            <>
                                <Typography variant="h6" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>Consultas Médicas</Typography>
                                <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, bgcolor: '#fff' }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Especialidade</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold', width: '180px' }}>Valor Particular</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {especialidadesFiltradas.map(esp => (
                                                <TableRow key={esp.id} hover>
                                                    <TableCell>{esp.nome}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600, color: '#2e7d32' }}>{formatMoney(esp.valor_consulta)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </>
                        )}

                        {/* Renderiza Procedimentos só se a busca encontrar algo */}
                        {Object.keys(procsPorCategoria).length > 0 && (
                            <>
                                <Typography variant="h6" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>Procedimentos e Exames</Typography>
                                {Object.entries(procsPorCategoria).map(([categoria, procs]) => (
                                    <Box key={categoria} sx={{ mb: 3 }}>
                                        <Typography variant="subtitle2" sx={{ bgcolor: '#e0e0e0', px: 2, py: 0.5, fontWeight: 'bold', borderRadius: '4px 4px 0 0', textTransform: 'uppercase' }}>
                                            {CAT_LABELS[categoria] || categoria.replace('_', ' ')}
                                        </Typography>
                                        <TableContainer component={Paper} variant="outlined" sx={{ borderTop: 'none', borderRadius: '0 0 4px 4px', bgcolor: '#fff' }}>
                                            <Table size="small">
                                                <TableBody>
                                                    {procs.map(proc => (
                                                        <TableRow key={proc.id} hover>
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
                            </>
                        )}

                        {/* Mensagem caso a busca não retorne nada */}
                        {especialidadesFiltradas.length === 0 && Object.keys(procsPorCategoria).length === 0 && (
                            <Typography textAlign="center" color="text.secondary" sx={{ py: 4 }}>
                                Nenhum item encontrado para "{searchTerm}"
                            </Typography>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} color="inherit" startIcon={<Close />}>
                    Fechar
                </Button>
                <Button 
                    onClick={handleGerarPdfComMascara} 
                    variant="contained" 
                    color="primary" 
                    startIcon={isGerandoPdf ? <CircularProgress size={20} color="inherit" /> : <Print />} 
                    disabled={isLoading || isGerandoPdf}
                >
                    {isGerandoPdf ? 'A Gerar Documento...' : 'Gerar PDF'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}