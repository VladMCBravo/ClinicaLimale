/// src/components/prontuario/ModalHistoricoEvolucao.jsx
// VERSÃO TOTALMENTE REFEITA: Agora busca e exibe TUDO (SOAP, Anamnese, DNPM, Vacinas)

import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, Button, 
    Typography, Box, CircularProgress, Divider, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import apiClient from '../../api/axiosConfig.js';
import { useSnackbar } from '../../contexts/SnackbarContext.js';

// Componente simples para renderizar seções
const SecaoRelatorio = ({ titulo, data, renderFunc }) => {
    if (!data) return null;
    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'primary.main' }}>
                {titulo}
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            {renderFunc(data)}
        </Box>
    );
};

export default function ModalHistoricoEvolucao({ pacienteId, evolucaoId, onClose }) {
    const [relatorioData, setRelatorioData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        if (pacienteId && evolucaoId) {
            setIsLoading(true);
            setRelatorioData(null); 
            
            const fetchTudo = async () => {
                try {
                    // 1. Busca a Evolução (SOAP)
                    const resEvolucao = await apiClient.get(`/prontuario/pacientes/${pacienteId}/evolucoes/${evolucaoId}/`);
                    
                    // 2. Busca a Anamnese (Histórico Pediátrico)
                    const resAnamnese = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
                    
                    // 3. Busca o DNPM (Marcos)
                    const resDnpm = await apiClient.get(`/prontuario/pacientes/${pacienteId}/marcos-dnpm/`);
                    
                    // 4. Busca as Vacinas
                    const resVacinas = await apiClient.get(`/prontuario/pacientes/${pacienteId}/vacinas/`);

                    // 5. Junta tudo
                    setRelatorioData({
                        evolucao: resEvolucao.data,
                        anamnese: resAnamnese.data.pediatrica,
                        dnpm: resDnpm.data,
                        vacinas: resVacinas.data
                    });
                } catch (err) {
                    showSnackbar('Erro ao buscar o relatório completo da consulta.', 'error');
                    console.error("Erro ao buscar relatório completo:", err);
                    onClose();
                } finally {
                    setIsLoading(false);
                }
            };

            fetchTudo();
        }
    }, [pacienteId, evolucaoId, onClose, showSnackbar]);
    
    // A função de Gerar PDF continua igual, ela já busca tudo no backend
    const handleDownloadPdf = async () => {
        if (!evolucaoId) return;
        try {
            const response = await apiClient.get(
                `/pdf/evolucao/${evolucaoId}/`, // Esta URL já gera o "SUPER PDF"
                { responseType: 'blob' } 
            );
            const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(pdfBlob);
            window.open(url, '_blank');
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            showSnackbar('Erro ao gerar o PDF completo.', 'error');
        }
    };

    return (
        <Dialog open={!!evolucaoId} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Relatório da Consulta</DialogTitle>
            <DialogContent dividers>
                {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
                {relatorioData && (
                    <Box>
                        {/* 1. SEÇÃO DO SOAP (EVOLUÇÃO) */}
                        <SecaoRelatorio 
                            titulo={`Consulta do Dia (${new Date(relatorioData.evolucao.data_atendimento).toLocaleString('pt-BR')} - ${relatorioData.evolucao.medico_nome || ''})`}
                            data={relatorioData.evolucao}
                            renderFunc={(data) => (
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>Subjetivo (S)</Typography>
                                    <Typography variant="body2" paragraph style={{ whiteSpace: 'pre-wrap' }}>{data.notas_subjetivas || 'N/A'}</Typography>
                                    
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>Objetivo (O)</Typography>
                                    <Typography variant="body2" paragraph style={{ whiteSpace: 'pre-wrap' }}>{data.notas_objetivas || 'N/A'}</Typography>
                                    
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>Avaliação (A)</Typography>
                                    <Typography variant="body2" paragraph style={{ whiteSpace: 'pre-wrap' }}>{data.avaliacao || 'N/A'}</Typography>
                                    
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>Plano (P)</Typography>
                                    <Typography variant="body2" paragraph style={{ whiteSpace: 'pre-wrap' }}>{data.plano || 'N/A'}</Typography>
                                </Box>
                            )}
                        />
                        
                        {/* 2. SEÇÃO DA ANAMNESE (HISTÓRICO) */}
                        <SecaoRelatorio 
                            titulo="Resumo do Histórico Pediátrico (Cadastro Mestre)"
                            data={relatorioData.anamnese}
                            renderFunc={(data) => (
    <Typography variant="body2" paragraph style={{ whiteSpace: 'pre-wrap' }}>
        {`Parto: ${data.tipo_parto || 'N/I'}`}
        {`\nIG: ${data.idade_gestacional || 'N/I'}`}
        {`\nPeso Nasc.: ${data.peso_nascimento || 'N/I'}g`}
        {`\nAPGAR: ${data.apgar_1 || 'N/I'} / ${data.apgar_5 || 'N/I'} / ${data.apgar_10 || 'N/I'}`}
        {`\nTriagens: ${data.triagens?.pezinho_status || 'N/I'}`}
    </Typography>
)}
                        />
                        
                        {/* 3. SEÇÃO DO DNPM (MARCOS) */}
                        <SecaoRelatorio 
                            titulo="Resumo do DNPM (Cadastro Mestre)"
                            data={relatorioData.dnpm.filter(m => m.alcançado !== true)} // Mostra marcos Ausentes (false) ou Pendentes (null) 
                            renderFunc={(data) => (
                                data.length > 0 ? (
                                    <ul>
                                        {data.map(marco => (
                                            <li key={marco.id}>
                                                <Typography variant="body2">
                                                    <strong>{marco.idade_marco}:</strong> {marco.marco_descricao} (Status: {marco.alcançado ? 'Alcançado' : 'Ausente/Alerta'})
                                                </Typography>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <Typography variant="body2">Todos os marcos registrados estão alcançados.</Typography>
                                )
                            )}
                        />

                        {/* 4. SEÇÃO DE VACINAS */}
                        <SecaoRelatorio 
                            titulo="Resumo da Vacinação (Cadastro Mestre)"
                            data={relatorioData.vacinas.filter(v => v.status !== 'Pendente')} // Mostra tudo que foi preenchido
                            renderFunc={(data) => (
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Vacina</TableCell>
                                                <TableCell>Dose</TableCell>
                                                <TableCell>Data Aplicação</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {data.map(vacina => (
                                                <TableRow key={vacina.id}>
                                                    <TableCell>{vacina.nome_vacina}</TableCell>
                                                    <TableCell>{vacina.dose}</TableCell>
                                                    <TableCell>{vacina.data_aplicacao ? new Date(vacina.data_aplicacao).toLocaleDateString('pt-BR') : 'Sem data'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        />
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleDownloadPdf} variant="outlined" disabled={!relatorioData || isLoading}>Gerar PDF Completo</Button>
                <Button onClick={onClose} variant="contained">Fechar</Button>
            </DialogActions>
        </Dialog>
    );
}