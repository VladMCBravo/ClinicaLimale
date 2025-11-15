// src/components/prontuario/ModalHistoricoEvolucao.jsx
// VERSÃO CORRIGIDA: Não quebra a Pediatria e esconde seções vazias.

import React, { useState, useEffect } from 'react'; // Removidos imports não usados
import { 
    Dialog, DialogTitle, DialogContent, DialogActions,
    Typography, Box, CircularProgress, Divider, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Button 
} from '@mui/material';
// Usando os caminhos relativos corretos (sem jsconfig.json)
import apiClient from '../../api/axiosConfig.js';
import { useSnackbar } from '../../contexts/SnackbarContext.js';

// Componente simples para renderizar seções
const SecaoRelatorio = ({ titulo, data, renderFunc }) => {
    
    // ★★★ CORREÇÃO AQUI (Bug #2) ★★★
    // Renderiza o conteúdo em memória primeiro
    const renderedContent = renderFunc(data);

    // Se a função de renderização retornar null, não renderiza a seção inteira
    if (renderedContent === null) {
        return null;
    }
    
    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'primary.main' }}>
                {titulo}
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            {renderedContent} {/* <-- Usa o conteúdo já renderizado */}
        </Box>
    );
};

// Funções de "Tradução" para os campos JSON (Pediatria)
// ★★★ CONSTANTES RESTAURADAS ★★★
const labelMap = {
    tipo_parto: 'Parto',
    idade_gestacional: 'Idade Gestacional',
    peso_nascimento: 'Peso ao Nascer',
    intercorrencias_gestacao_parto: 'Intercorrências Gestação/Parto',
    tipo_aleitamento: 'Aleitamento (0-6m)',
    pega: 'Pega (0-6m)',
    succao: 'Sucção (0-6m)',
    diurese: 'Diurese (0-6m)',
    evacuacao: 'Evacuação (0-6m)',
    vitamina_d: 'Supl. Vitamina D (0-6m)',
    ferro: 'Supl. Ferro (0-6m)',
    alimentacao_0_6m_obs: 'Obs. Alim. (0-6m)',
    tipo_alimentacao: 'Alimentação (6-12m)',
    refeicoes_dia: 'Refeições/dia (6-12m)',
    textura: 'Textura (6-12m)',
    aceitacao: 'Aceitação (6-12m)',
    agua: 'Água (6-12m)',
    aceitacao_geral: 'Aceitação Geral (6-12m)',
    metodo_ia: 'Método IA',
    copo_transicao: 'Copo de Transição',
    alimentacao_6_12m_obs: 'Obs. Alim. (6-12m)',
    sono_diurno: 'Sono Diurno',
    sono_noturno: 'Sono Noturno',
    colica: 'Cólica',
    choro: 'Choro',
    vinculo: 'Vínculo',
    sono_comportamento_obs: 'Obs. Sono/Comp.',
};


export default function ModalHistoricoEvolucao({ pacienteId, evolucaoId, onClose }) {
    const [relatorioData, setRelatorioData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { showSnackbar } = useSnackbar();

    // useEffect para buscar dados (sem alterações)
    useEffect(() => {
        if (pacienteId && evolucaoId) {
            setIsLoading(true);
            setRelatorioData(null); 
            const cacheBuster = `?_=${new Date().getTime()}`;

            const fetchTudo = async () => {
                try {
                    const resEvolucao = await apiClient.get(`/prontuario/pacientes/${pacienteId}/evolucoes/${evolucaoId}/${cacheBuster}`);
                    const resAnamnese = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/${cacheBuster}`);
                    const resDnpm = await apiClient.get(`/prontuario/pacientes/${pacienteId}/marcos-dnpm/${cacheBuster}`);
                    const resVacinas = await apiClient.get(`/prontuario/pacientes/${pacienteId}/vacinas/${cacheBuster}`);
                    
                    const dadosBrutos = {
                        evolucao: resEvolucao.data,
                        anamnese: resAnamnese.data, 
                        dnpm: resDnpm.data,
                        vacinas: resVacinas.data
                    };
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
    
    // (handleDownloadPdf - sem alterações)
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

    // (isFilled e formatValue - sem alterações)
    const isFilled = (value) => {
        if (value === 0) return true;
        if (value === true) return true;
        if (value === null || value === undefined || value === "") return false;
        return true;
    };
    const formatValue = (key, value) => {
        if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
        if (key === 'peso_nascimento') return `${value}g`;
        return value;
    };
    
    // --- FUNÇÃO DE RENDER PEDIATRIA ---
    // ★★★ CORRIGIDA PARA RETORNAR NULL SE VAZIA ★★★
    const renderAnamnese = (data) => {
        if (!data) return null; // Não renderiza nada se não houver dados pediátricos
        
        const itensPreenchidos = [];
        
        // 1. Dados Gestacionais
        const apgar = [data.apgar_1, data.apgar_5, data.apgar_10].filter(isFilled).join(' / ');
        if (isFilled(apgar)) {
            itensPreenchidos.push({ label: 'APGAR (1/5/10)', value: apgar });
        }
        
        // 2. Todos os outros campos (exceto JSONs)
        Object.entries(data).forEach(([key, value]) => {
            const label = labelMap[key];
            if (label && isFilled(value)) {
                itensPreenchidos.push({ label, value: formatValue(key, value) });
            }
        });

        // 3. Campos JSON (Triagens)
        Object.entries(data.triagens || {}).forEach(([key, value]) => {
            if (key.endsWith('_status') && isFilled(value)) {
                const label = key.replace('_status', '').replace('orelhinha_', '').replace('pezinho', 'Pezinho').replace('olhinho', 'Olhinho').replace('coracaozinho', 'Coraçãozinho').replace('linguinha', 'Linguinha');
                let displayValue = value;
                if (value === 'Alterado') {
                    const descKey = key.replace('_status', '_desc');
                    const desc = data.triagens[descKey];
                    if (isFilled(desc)) {
                        displayValue = `Alterado (${desc})`;
                    }
                }
                itensPreenchidos.push({ label: `Triagem ${label}`, value: displayValue });
            }
        });
        
        // 4. Campos JSON (Alimentação 0-6m)
        Object.entries(data.alimentacao_0_6m || {}).forEach(([key, value]) => {
            const label = labelMap[key];
            if (label && isFilled(value)) {
                 itensPreenchidos.push({ label, value: formatValue(key, value) });
            }
        });
        
        // 5. Campos JSON (Alimentação 6-12m)
        Object.entries(data.alimentacao_6_12m || {}).forEach(([key, value]) => {
            const label = labelMap[key];
            if (label && isFilled(value)) {
                 itensPreenchidos.push({ label, value: formatValue(key, value) });
            }
        });
        
        // 6. Campos JSON (Sono/Comportamento)
        Object.entries(data.sono_comportamento || {}).forEach(([key, value]) => {
            const label = labelMap[key];
            if (label && isFilled(value)) {
                 itensPreenchidos.push({ label, value: formatValue(key, value) });
            }
        });

        if (itensPreenchidos.length === 0) {
            return null; // Retorna nulo se NADA foi preenchido
        }

        return (
             <ul>
                {itensPreenchidos.map((item, index) => (
                    <li key={index}>
                        <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                            <strong>{item.label}:</strong> {item.value}
                        </Typography>
                    </li>
                ))}
            </ul>
        );
    }; // <-- FIM DE renderAnamnese

    // --- FUNÇÃO DE RENDER CARDIOLOGIA ---
    // ★★★ CORRIGIDA PARA MOSTRAR TODOS OS CAMPOS E RETORNAR NULL SE VAZIA ★★★
    const renderCardiologia = (data) => {
        if (!data || Object.keys(data).length === 0) {
            return null; // Não renderiza nada se não houver dados cardiológicos
        }

        const itensPreenchidos = Object.entries(data)
            .filter(([key, value]) => isFilled(value)) // Esta é a lógica que pega TODOS os campos
            .map(([key, value]) => ({
                label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                value: value
            }));

        if (itensPreenchidos.length === 0) {
            return null; // Retorna nulo se NADA foi preenchido
        }

        return (
            <ul>
                {itensPreenchidos.map((item, index) => (
                    <li key={index}>
                        <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                            <strong>{item.label}:</strong> {item.value}
                        </Typography>
                    </li>
                ))}
            </ul>
        );
    }; // <-- FIM DE renderCardiologia

    // ★★★ RETURN PRINCIPAL (ESTAVA FALTANDO NO ARQUIVO ANTERIOR) ★★★
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
                        
                        {/* 2A. SEÇÃO DA ANAMNESE (PEDIATRIA) */}
                        <SecaoRelatorio 
                            titulo="Resumo do Histórico Pediátrico (Cadastro Mestre)"
                            data={relatorioData.anamnese.pediatrica}
                            renderFunc={renderAnamnese}
                        />
                        
                        {/* 2B. SEÇÃO DA ANAMNESE (CARDIOLOGIA) */}
                        <SecaoRelatorio 
                            titulo="Resumo do Histórico Cardiológico (Cadastro Mestre)"
                            data={relatorioData.anamnese.cardiologica}
                            renderFunc={renderCardiologia}
                        />
                        
                        {/* 3. SEÇÃO DO DNPM (MARCOS) */}
                        {/* ★★★ CÓDIGO RESTAURADO ★★★ */}
                        <SecaoRelatorio 
                            titulo="Resumo do DNPM (Cadastro Mestre)"
                            data={relatorioData.dnpm ? relatorioData.dnpm.filter(m => m.alcançado !== null) : []} 
                            renderFunc={(data) => {
                                if (!data || data.length === 0) return null;
                                return (
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
                                )
                            }}
                        />

                        {/* 4. SEÇÃO DE VACINAS */}
                        {/* ★★★ CÓDIGO RESTAURADO ★★★ */}
                        <SecaoRelatorio 
                            titulo="Resumo da Vacinação (Cadastro Mestre)"
                            data={relatorioData.vacinas ? relatorioData.vacinas.filter(v => v.status !== 'Pendente') : []} 
                            renderFunc={(data) => {
                                if (!data || data.length === 0) return null;
                                return (
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