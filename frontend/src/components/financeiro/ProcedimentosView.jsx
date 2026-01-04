// src/components/financeiro/ProcedimentosView.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    CircularProgress, IconButton, Button, TextField, InputAdornment, Chip, Tooltip
} from '@mui/material';
import { Edit, CloudUpload, Add, Search } from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { faturamentoService } from '../../services/faturamentoService';
import ProcedimentoModal from './ProcedimentoModal';

// Mapeamento de cores para categorias
const CAT_COLORS = {
    'US_GERAL': 'primary',
    'MED_FETAL': 'secondary',
    'ECOCARDIOGRAMA': 'error',
    'MUSCULO': 'warning',
    'DOPPLER': 'info',
    'OUTROS': 'default'
};

const CAT_LABELS = {
    'US_GERAL': 'Geral',
    'MED_FETAL': 'Fetal',
    'ECOCARDIOGRAMA': 'Eco',
    'MUSCULO': 'Músculo',
    'DOPPLER': 'Doppler',
    'OUTROS': 'Outros'
};

export default function ProcedimentosView() {
    const [procedimentos, setProcedimentos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();
    
    // Estados de Controle
    const [isUploading, setIsUploading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [procedimentoSelecionado, setProcedimentoSelecionado] = useState(null); // null = criar novo
    
    // Filtro
    const [searchTerm, setSearchTerm] = useState('');

    const fetchProcedimentos = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await faturamentoService.getProcedimentos();
            // Ordena por nome
            const sorted = response.data.sort((a, b) => a.descricao.localeCompare(b.descricao));
            setProcedimentos(sorted);
        } catch (error) {
            showSnackbar('Erro ao carregar procedimentos.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchProcedimentos();
    }, [fetchProcedimentos]);

    // Filtragem Local
    const filteredList = useMemo(() => {
        if (!searchTerm) return procedimentos;
        const lowerTerm = searchTerm.toLowerCase();
        return procedimentos.filter(p => 
            p.descricao.toLowerCase().includes(lowerTerm) || 
            (p.codigo_tuss && p.codigo_tuss.includes(lowerTerm))
        );
    }, [procedimentos, searchTerm]);

    const handleOpenModal = (procedimento = null) => {
        setProcedimentoSelecionado(procedimento); // Se null, modal abre em modo "Novo"
        setIsModalOpen(true);
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('arquivo_tuss', file);

        try {
            await faturamentoService.uploadTuss(formData); 
            showSnackbar('Arquivo TUSS processado com sucesso!', 'success');
            fetchProcedimentos(); 
        } catch (error) {
            showSnackbar('Erro no upload do arquivo.', 'error');
        } finally {
            setIsUploading(false);
            event.target.value = null; // Limpa input
        }
    };

    return (
        <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* TOPO: Título e Botões */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h6" fontWeight="bold" color="#1a233b">Tabela de Preços & Procedimentos</Typography>
                    <Typography variant="body2" color="text.secondary">Gerencie exames, valores particulares e acordos com convênios.</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        component="label"
                        startIcon={isUploading ? <CircularProgress size={20} /> : <CloudUpload />}
                        disabled={isUploading}
                    >
                        {isUploading ? 'Enviando...' : 'Importar TUSS'}
                        <input type="file" accept=".csv, .txt" hidden onChange={handleFileUpload} />
                    </Button>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<Add />}
                        onClick={() => handleOpenModal(null)} // Abre modal limpo
                        sx={{ bgcolor: '#1a233b' }}
                    >
                        Novo Exame
                    </Button>
                </Box>
            </Box>

            {/* BARRA DE PESQUISA */}
            <Paper elevation={0} sx={{ p: 1.5, mb: 2, bgcolor: '#f5f5f5', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Search color="action" />
                <TextField 
                    placeholder="Buscar por nome do exame ou código TUSS..." 
                    variant="standard" 
                    fullWidth 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{ disableUnderline: true }}
                />
            </Paper>

            {/* TABELA */}
            <TableContainer component={Paper} elevation={1} sx={{ flexGrow: 1 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Código TUSS</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Categoria</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Descrição</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Valor Particular</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Editar</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} align="center"><CircularProgress sx={{mt:2}} /></TableCell></TableRow>
                        ) : filteredList.length > 0 ? (
                            filteredList.map((proc) => (
                                <TableRow key={proc.id} hover>
                                    <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                        {proc.codigo_tuss || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={CAT_LABELS[proc.categoria] || proc.categoria} 
                                            size="small" 
                                            color={CAT_COLORS[proc.categoria] || 'default'} 
                                            variant="outlined"
                                            sx={{ fontSize: '0.7rem', height: 20 }}
                                        />
                                    </TableCell>
                                    <TableCell>{proc.descricao}</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                                        {proc.valor_particular ? `R$ ${proc.valor_particular}` : '-'}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Editar Preços e Dados">
                                            <IconButton onClick={() => handleOpenModal(proc)} size="small">
                                                <Edit fontSize="small" color="primary" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>Nenhum procedimento encontrado.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* MODAL UNIFICADO */}
            <ProcedimentoModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchProcedimentos}
                procedimento={procedimentoSelecionado}
            />
        </Box>
    );
}