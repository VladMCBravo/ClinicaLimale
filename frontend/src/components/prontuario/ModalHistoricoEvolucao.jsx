/// src/components/prontuario/ModalHistoricoEvolucao.jsx
// VERSÃO ATUALIZADA: Adiciona headers de cache-control para buscar dados novos

import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, Button, 
    Typography, Box, CircularProgress, Divider, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import apiClient from '../../api/axiosConfig.js';
import { useSnackbar } from '../../contexts/SnackbarContext.js';

// Componente simples para renderizar seções (sem alteração)
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
            
            console.log(`[DEBUG MODAL] 🕵️‍♂️ Buscando dados para Evolução ID: ${evolucaoId}, Paciente ID: ${pacienteId}`);

            // ★★★ CORREÇÃO AQUI ★★★
            // Em vez de headers, adicionamos um parâmetro único à URL para
            // garantir que o navegador não use uma resposta em cache.
            const cacheBuster = `?_=${new Date().getTime()}`;
            // ★★★ FIM DA CORREÇÃO ★★★

            const fetchTudo = async () => {
                try {
                    // ★★★ CORREÇÃO AQUI ★★★
                    // Concatenamos a string 'cacheBuster' ao final da URL
                    
                    const resEvolucao = await apiClient.get(`/prontuario/pacientes/${pacienteId}/evolucoes/${evolucaoId}/${cacheBuster}`);
                    const resAnamnese = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/${cacheBuster}`);
                    const resDnpm = await apiClient.get(`/prontuario/pacientes/${pacienteId}/marcos-dnpm/${cacheBuster}`);
                    const resVacinas = await apiClient.get(`/prontuario/pacientes/${pacienteId}/vacinas/${cacheBuster}`);

                    // ★★★ FIM DA CORREÇÃO ★★★

                    const dadosBrutos = {
                        evolucao: resEvolucao.data,
                        anamnese: resAnamnese.data.pediatrica,
                        dnpm: resDnpm.data,
                        vacinas: resVacinas.data
                    };
                    
                    console.log('[DEBUG MODAL] 📦 Dados BRUTOS recebidos da API:', dadosBrutos);
                    setRelatorioData(dadosBrutos);
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
    
    // (handleDownloadPdf... sem alterações)
    const handleDownloadPdf = async () => {
        if (!evolucaoId) return;
        try {
            const response = await apiClient.get(
                `/pdf/evolucao/${evolucaoId}/`, 
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

    // (Funções de Render e Filtro... sem alterações)
    const isFilled = (value) => {
        if (value === 0) return true;
        if (value === null || value === undefined || value === "") return false;
        return true;
    };

    const renderAnamnese = (data) => {
        if (!data) return <Typography variant="body2">Nenhum dado de anamnese encontrado.</Typography>;
        
        const itensPreenchidos = [];
        
        const addItem = (label, value, formatter = (v) => v) => {
            if (isFilled(value)) {
                itensPreenchidos.push({ label, value: formatter(value) });
            }
        };

        // 1. Dados Gestacionais
        addItem('Parto', data.tipo_parto);
        addItem('Idade Gestacional', data.idade_gestacional);
        addItem('Peso ao Nascer', data.peso_nascimento, (v) => `${v}g`);
        
        const apgar = [data.apgar_1, data.apgar_5, data.apgar_10].filter(isFilled).join(' / ');
        addItem('APGAR (1/5/10)', apgar); 
        
        addItem('Intercorrências Gestação/Parto', data.intercorrencias_gestacao_parto);

        // 2. Triagens
        Object.entries(data.triagens || {}).forEach(([key, value]) => {
            if (key.endsWith('_status') && isFilled(value) && value !== 'Normal' && value !== 'Presente' && value !== 'Presente Bilateral') {
                const descKey = key.replace('_status', '_desc');
                const desc = data.triagens[descKey] || 'Sem descrição';
                const label = key.replace('_status', '').replace('orelhinha_', '').replace('pezinho', 'Pezinho').replace('olhinho', 'Olhinho').replace('coracaozinho', 'Coraçãozinho').replace('linguinha', 'Linguinha');
                addItem(`Triagem ${label} (${value})`, desc);
            }
        });

        // 3. Observações
        addItem('Obs. Alim. 0-6m', data.alimentacao_0_6m_obs);
        addItem('Obs. Alim. 6-12m', data.alimentacao_6_12m_obs);
        addItem('Obs. Sono/Comp.', data.sono_comportamento_obs);
        
        // 4. Outros
        addItem('Método IA', data.metodo_ia);
        addItem('Copo de Transição', data.copo_transicao);

        console.log('[DEBUG MODAL] 📋 Itens FILTRADOS da Anamnese:', itensPreenchidos);

        if (itensPreenchidos.length === 0) {
            return <Typography variant="body2">Nenhum dado relevante preenchido no Histórico Pediátrico.</Typography>;
        }

        return (
            <ul>
                {itensPreenchidos.map((item, index) => (
                    <li key={index}>
                        <Typography variant="body2">
                            <strong>{item.label}:</strong> {item.value}
                        </Typography>
                    </li>
                ))}
            </ul>
        );
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
                            renderFunc={renderAnamnese}
                        />
                        
                        {/* 3. SEÇÃO DO DNPM (MARCOS) */}
                        <SecaoRelatorio 
                            titulo="Resumo do DNPM (Cadastro Mestre)"
                            data={relatorioData.dnpm.filter(m => m.alcançado !== null)} 
                            renderFunc={(data) => {
                                console.log('[DEBUG MODAL] 🎯 Marcos DNPM FILTRADOS (Pendente=null removidos):', data);
                                
                                return data.length > 0 ? (
                                    <ul>
                                        {data.map(marco => (
                                            <li key={marco.id}>
                                                <Typography variant="body2" color={marco.alcançado ? 'text.primary' : 'error'}>
                                                    <strong>{marco.idade_marco} ({marco.marco_descricao}):</strong> 
                                                    {marco.alcançado ? ' Alcançado' : ' Ausente (Alerta)'}
                                                    {marco.observacao ? ` - ${marco.observacao}` : ''}
                                                </Typography>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <Typography variant="body2">Nenhum marco (Presente ou Ausente) registrado.</Typography>
                                )
                            }}
                        />

                        {/* 4. SEÇÃO DE VACINAS */}
                        <SecaoRelatorio 
                            titulo="Resumo da Vacinação (Cadastro Mestre)"
                            data={relatorioData.vacinas.filter(v => v.status !== 'Pendente')} 
                            renderFunc={(data) => {
                                console.log('[DEBUG MODAL] 💉 Vacinas FILTRADAS (Pendente removidas):', data);

                                return data.length > 0 ? (
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Vacina</TableCell>
                                                    <TableCell>Dose</TableCell>
                                                    <TableCell>Status</TableCell>
                                                    <TableCell>Data Aplicação</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {data.map(vacina => (
                                                    <TableRow key={vacina.id}>
                                                        <TableCell>{vacina.nome_vacina}</TableCell>
                                                        <TableCell>{vacina.dose}</TableCell>
                                                        <TableCell sx={{color: vacina.status === 'Atrasada' ? 'error.main' : 'text.primary'}}>
                                                            {vacina.status}
                                                        </TableCell>
                                                        <TableCell>{vacina.data_aplicacao ? new Date(vacina.data_aplicacao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography variant="body2">Nenhuma vacina (Aplicada, Atrasada, etc.) registrada.</Typography>
                                )
                            }}
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