/// src/components/prontuario/ModalHistoricoEvolucao.jsx
// VERSÃO GENÉRICA (PEDIATRIA + CARDIOLOGIA)
// 1. Detecta a especialidade da consulta (evolucao.especialidade).
// 2. Busca dados-mestre específicos (ex: DNPM/Vacinas para Peds).
// 3. Renderiza o resumo correto.

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions,
    Typography, Box, CircularProgress, Divider, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Button
} from '@mui/material';
import apiClient from '../../api/axiosConfig.js';
import { useSnackbar } from '../../contexts/SnackbarContext.js';

// Componente simples para renderizar seções (sem alteração)
const SecaoRelatorio = ({ titulo, data, renderFunc }) => {
    if (!data || (Array.isArray(data) && data.length === 0)) return null;
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

// Funções de "Tradução" para os campos JSON
const labelMap = {
    // Gestacional
    tipo_parto: 'Parto',
    idade_gestacional: 'Idade Gestacional',
    peso_nascimento: 'Peso ao Nascer',
    intercorrencias_gestacao_parto: 'Intercorrências Gestação/Parto',
    // Triagens (tratado separadamente)
    // Alim 0-6m
    tipo_aleitamento: 'Aleitamento (0-6m)',
    pega: 'Pega (0-6m)',
    succao: 'Sucção (0-6m)',
    diurese: 'Diurese (0-6m)',
    evacuacao: 'Evacuação (0-6m)',
    vitamina_d: 'Supl. Vitamina D (0-6m)',
    ferro: 'Supl. Ferro (0-6m)',
    alimentacao_0_6m_obs: 'Obs. Alim. (0-6m)',
    // Alim 6-12m
    tipo_alimentacao: 'Alimentação (6-12m)',
    refeicoes_dia: 'Refeições/dia (6-12m)',
    textura: 'Textura (6-12m)',
    aceitacao: 'Aceitação (6-12m)',
    agua: 'Água (6-12m)',
    aceitacao_geral: 'Aceitação Geral (6-12m)',
    metodo_ia: 'Método IA',
    copo_transicao: 'Copo de Transição',
    alimentacao_6_12m_obs: 'Obs. Alim. (6-12m)',
    // Sono
    sono_diurno: 'Sono Diurno',
    sono_noturno: 'Sono Noturno',
    colica: 'Cólica',
    choro: 'Choro',
    vinculo: 'Vínculo',
    sono_comportamento_obs: 'Obs. Sono/Comp.',
};

// ★★★ NOVO: MAPA 2: Labels de Cardiologia ★★★
const cardioLabelMap = {
    fatores_risco: 'Fatores de Risco CV',
    hist_familiar_cardio: 'Histórico Familiar (Cardio)',
    cirurgias_previas_cardio: 'Cirurgias/Procedimentos Prévios'
};

export default function ModalHistoricoEvolucao({ pacienteId, evolucaoId, onClose }) {
    const [relatorioData, setRelatorioData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { showSnackbar } = useSnackbar();

    // ★★★ useEffect TOTALMENTE REESCRITO ★★★
    useEffect(() => {
        if (pacienteId && evolucaoId) {
            setIsLoading(true);
            setRelatorioData(null); 
            
            console.log(`[DEBUG MODAL] 🕵️‍♂️ Buscando dados para Evolução ID: ${evolucaoId}`);
            const cacheBuster = `?_=${new Date().getTime()}`;

            const fetchTudo = async () => {
                try {
                    // --- ESTÁGIO 1: Buscar a Evolução para descobrir a Especialidade ---
                    const resEvolucao = await apiClient.get(`/prontuario/pacientes/${pacienteId}/evolucoes/${evolucaoId}/${cacheBuster}`);
                    const evolucao = resEvolucao.data;

                    // ★★★ ASSUMPÇÃO CRÍTICA ★★★
                    // O seu objeto 'evolucao' DEVE ter um campo 'especialidade'
                    // Ex: { id: 123, notas_subjetivas: "...", especialidade: "cardiologia" }
                    // Se não tiver, ele sempre cairá no 'pediatria'
                    const especialidade = evolucao.especialidade || 'pediatria';
                    
                    console.log(`[DEBUG MODAL] Especialidade detectada: ${especialidade}`);

                    const dadosBrutos = {
                        evolucao: evolucao,
                        especialidade: especialidade, // Guarda a especialidade
                        anamnese: null, // Vai guardar {pediatrica:..., cardiologica:...}
                        dnpm: null,
                        vacinas: null,
                        // ecg: null, // Exemplo futuro
                    };

                    // --- ESTÁGIO 2: Buscar dados-mestre em paralelo ---
                    
                    // 2a. Busca a anamnese completa (que contém TODAS as especialidades)
                    const anamnesePromise = apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/${cacheBuster}`);
                    
                    const promises = [anamnesePromise];

                    // 2b. Adiciona buscas específicas de PEDIATRIA
                    if (especialidade === 'pediatria') {
                        console.log("[DEBUG MODAL] Adicionando buscas de Pediatria (DNPM, Vacinas)...");
                        promises.push(apiClient.get(`/prontuario/pacientes/${pacienteId}/marcos-dnpm/${cacheBuster}`));
                        promises.push(apiClient.get(`/prontuario/pacientes/${pacienteId}/vacinas/${cacheBuster}`));
                    }
                    // 2c. Adiciona buscas específicas de CARDIOLOGIA (ex: exames)
                    else if (especialidade === 'cardiologia') {
                        // Exemplo: se você tivesse uma API de exames
                        // promises.push(apiClient.get(`/prontuario/pacientes/${pacienteId}/exames-ecg/${cacheBuster}`));
                    }
                    // ... (outras especialidades)

                    const responses = await Promise.all(promises);
                    
                    dadosBrutos.anamnese = responses[0].data; // Anamnese completa

                    if (especialidade === 'pediatria') {
                        dadosBrutos.dnpm = responses[1].data;
                        dadosBrutos.vacinas = responses[2].data;
                    }
                    // else if (especialidade === 'cardiologia') {
                    //    dadosBrutos.ecg = responses[1].data;
                    // }

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

    // ★★★ FUNÇÃO DE FILTRO TOTALMENTE REESCRITA ★★★
    
    // Helper para checar se um valor foi preenchido
    const isFilled = (value) => {
        if (value === 0) return true; // 0 é um valor válido (ex: APGAR)
        if (value === true) return true; // true é um valor válido (ex: checkboxes)
        if (value === null || value === undefined || value === "") return false;
        return true;
    };
    
    // Helper para formatar o valor
    const formatValue = (key, value) => {
        if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
        if (key === 'peso_nascimento') return `${value}g`;
        return value;
    }

    // ★★★ 1. RENDER PEDIATRIA (O seu `renderAnamnese` original) ★★★
    // Esta função lê os dados de Pediatria
    const renderAnamnesePediatrica = (data) => {
        // 'data' aqui é relatorioData.anamnese.pediatrica
        if (!data) return <Typography variant="body2">Nenhum dado de anamnese pediátrica encontrado.</Typography>;
        
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

        console.log('[DEBUG MODAL] 📋 Itens FILTRADOS da Anamnese (PEDIATRIA):', itensPreenchidos);
        if (itensPreenchidos.length === 0) {
            return <Typography variant="body2">Nenhum dado relevante preenchido no Histórico Pediátrico.</Typography>;
        }

        // Renderiza a lista (sem alteração)
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
    
    // ★★★ 2. NOVO RENDER: CARDIOLOGIA ★★★
    // Esta função lê os dados de Cardiologia
    const renderAnamneseCardiologica = (data) => {
        // 'data' aqui é relatorioData.anamnese.cardiologica
        if (!data) return <Typography variant="body2">Nenhum dado de anamnese cardiológica encontrado.</Typography>;

        const itensPreenchidos = [];
        
        // Itera sobre os dados da anamnese cardiológica
        Object.entries(data).forEach(([key, value]) => {
            const label = cardioLabelMap[key]; // Usa o NOVO labelMap de Cardiologia
            if (label && isFilled(value)) { // Usa o helper isFilled (genérico)
                itensPreenchidos.push({ label, value: formatValue(key, value) }); // Usa o helper formatValue (genérico)
            }
        });

        console.log('[DEBUG MODAL] 📋 Itens FILTRADOS da Anamnese (CARDIOLOGIA):', itensPreenchidos);

        if (itensPreenchidos.length === 0) {
            return <Typography variant="body2">Nenhum dado relevante preenchido no Histórico Cardiológico.</Typography>;
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


    // ★★★ JSX (RENDERIZAÇÃO) ATUALIZADO ★★★
    return (
        <Dialog open={!!evolucaoId} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Relatório da Consulta</DialogTitle>
            <DialogContent dividers>
                {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
                
                {/* Só renderiza quando os dados chegarem */}
                {relatorioData && (
                    <Box>
                        {/* 1. SEÇÃO DO SOAP (EVOLUÇÃO) - Genérico, sem alteração */}
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
                        
                        {/* ★★★ 2. SEÇÃO DA ANAMNESE (CONDICIONAL) ★★★ */}
                        
                        {/* Se for Pediatria, renderiza o histórico pediátrico */}
                        {relatorioData.especialidade === 'pediatria' && (
                            <SecaoRelatorio 
                                titulo="Resumo do Histórico Pediátrico (Cadastro Mestre)"
                                data={relatorioData.anamnese.pediatrica} // Passa os dados pediátricos
                                renderFunc={renderAnamnesePediatrica} // Usa o render pediátrico
                            />
                        )}
                        
                        {/* Se for Cardiologia, renderiza o histórico cardiológico */}
                        {relatorioData.especialidade === 'cardiologia' && (
                            <SecaoRelatorio 
                                titulo="Resumo do Histórico Cardiológico (Cadastro Mestre)"
                                data={relatorioData.anamnese.cardiologica} // Passa os dados cardiológicos
                                renderFunc={renderAnamneseCardiologica} // Usa o render cardiológico
                            />
                        )}
                        
                        {/* ... (Adicione 'else if' para outras especialidades aqui) ... */}
                        

                        {/* ★★★ 3. SEÇÃO DO DNPM (CONDICIONAL - SÓ PEDIATRIA) ★★★ */}
                        {relatorioData.especialidade === 'pediatria' && relatorioData.dnpm && (
                            <SecaoRelatorio 
                                titulo="Resumo do DNPM (Cadastro Mestre)"
                                data={relatorioData.dnpm.filter(m => m.alcançado !== null)} 
                                renderFunc={(data) => {
                                    // ... (Sua lógica original de renderização do DNPM, sem alteração) ...
                                    console.log('[DEBUG MODAL] 🎯 Marcos DNPM FILTRADOS:', data);
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
                        )}

                        {/* ★★★ 4. SEÇÃO DE VACINAS (CONDICIONAL - SÓ PEDIATRIA) ★★★ */}
                        {relatorioData.especialidade === 'pediatria' && relatorioData.vacinas && (
                            <SecaoRelatorio 
                                titulo="Resumo da Vacinação (Cadastro Mestre)"
                                data={relatorioData.vacinas.filter(v => v.status !== 'Pendente')} 
                                renderFunc={(data) => {
                                    // ... (Sua lógica original de renderização das Vacinas, sem alteração) ...
                                    console.log('[DEBUG MODAL] 💉 Vacinas FILTRADAS:', data);
                                    return data.length > 0 ? (
                                        <TableContainer component={Paper} variant="outlined">
                                            {/* ... (Table Head/Body, sem alteração) ... */}
                                        </TableContainer>
                                    ) : (
                                        <Typography variant="body2">Nenhuma vacina (Aplicada, Atrasada, etc.) registrada.</Typography>
                                    )
                                }}
                            />
                        )}
                        
                        {/* ★★★ 5. SEÇÃO DE EXAMES (EXEMPLO FUTURO PARA CARDIO) ★★★ */}
                        {/*
                        {relatorioData.especialidade === 'cardiologia' && relatorioData.ecg && (
                             <SecaoRelatorio 
                                titulo="Exames (ECG)"
                                data={relatorioData.ecg}
                                renderFunc={(data) => ( 
                                    <Typography>Exame ECG realizado em XX/XX/XXXX.</Typography>
                                )}
                             />
                        )}
                        */}

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