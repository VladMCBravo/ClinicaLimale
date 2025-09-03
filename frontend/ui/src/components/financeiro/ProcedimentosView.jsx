// src/components/financeiro/ProcedimentosView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { faturamentoService } from '../../services/faturamentoService';
import ProcedimentoModal from './ProcedimentoModal';

export default function ProcedimentosView() {
    const [procedimentos, setProcedimentos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();
    const [isUploading, setIsUploading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [procedimentoSelecionado, setProcedimentoSelecionado] = useState(null);

    const fetchProcedimentos = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await faturamentoService.getProcedimentos();
            setProcedimentos(response.data);
        } catch (error) {
            showSnackbar('Erro ao carregar procedimentos.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchProcedimentos();
    }, [fetchProcedimentos]);
    
    const handleOpenModal = (procedimento) => {
        setProcedimentoSelecionado(procedimento);
        setIsModalOpen(true);
    };

    if (isLoading) return <CircularProgress />;

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('arquivo_tuss', file);

        try {
            // Nota: Precisaremos criar 'uploadTuss' em nosso faturamentoService
            const response = await faturamentoService.uploadTuss(formData); 
            showSnackbar(`${response.data.criados} novos procedimentos criados, ${response.data.atualizados} atualizados.`, 'success');
            fetchProcedimentos(); // Recarrega a lista
        } catch (error) {
            showSnackbar('Erro no upload do arquivo.', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Procedimentos e Tabela de Preços</Typography>
                <Button
                    variant="contained"
                    component="label"
                    disabled={isUploading}
                >
                    {isUploading ? <CircularProgress size={24} /> : 'Upload Tabela TUSS'}
                    <input type="file" accept=".csv" hidden onChange={handleFileUpload} />
                </Button>
            </Box>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Código TUSS</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell>Valor Particular (R$)</TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {procedimentos.map((proc) => (
                            <TableRow key={proc.id} hover>
                                <TableCell>{proc.codigo_tuss}</TableCell>
                                <TableCell>{proc.descricao}</TableCell>
                                <TableCell>{proc.valor_particular}</TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => handleOpenModal(proc)} title="Editar Preços de Convênios">
                                        <EditIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {procedimentoSelecionado && (
                <ProcedimentoModal
                    open={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={fetchProcedimentos}
                    procedimento={procedimentoSelecionado}
                />
            )}
        </Box>
    );
}