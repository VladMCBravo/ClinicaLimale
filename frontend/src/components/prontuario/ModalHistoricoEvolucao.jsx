/// src/components/prontuario/ModalHistoricoEvolucao.jsx
// VERSÃO CORRIGIDA:
// 1. Mapa da Cardiologia corrigido (para 'historico_familiar')
// 2. Lógica de detecção de especialidade corrigida

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions,
    Typography, Box, CircularProgress, Divider, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Button
} from '@mui/material';
import apiClient from '../../api/axiosConfig.js';
import { useSnackbar } from '../../contexts/SnackbarContext.js';

// Componente simples para renderizar seções
const SecaoRelatorio = ({ titulo, data, renderFunc }) => {
    // Adicionada checagem para objeto vazio
    if (!data || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && Object.keys(data).length === 0)) {
        return null;
    }
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

// --- MAPAS DE LABELS ---

// MAPA 1: Labels de Pediatria (Correto)
const pedsLabelMap = {
    tipo_parto: 'Parto',
    idade_gestacional: 'Idade Gestacional',
    peso_nascimento: 'Peso ao Nascer (g)',
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

// ★★★ CORREÇÃO 1: MAPA 2: Labels de Cardiologia ★★★
// Os nomes agora batem com o models.py e o HistoricoCardiologia.jsx
const cardioLabelMap = {
    fatores_risco: 'Fatores de Risco CV',
    historico_familiar: 'Histórico Familiar (Cardio)',         // ANTES: hist_familiar_cardio
    cirurgias_cardiacas_previas: 'Cirurgias/Procedimentos Prévios' // ANTES: cirurgias_previas_cardio
};

// MAPA 3: Labels de Neonatologia (Correto)
const neoLabelMap = {
    pre_natal: 'Pré-Natal',
    tipo_gestacao: 'Tipo Gestação',
    corticoterapia: 'Corticoterapia',
    neuroprotecao_mg: 'Neuroproteção MgSO4',
    comorbidades_outras_desc: 'Outras Comorbidades',
    vicios_outros_desc: 'Outros Vícios',
    tipo_sanguineo_mae: 'TS Mãe',
    rh_mae: 'Rh Mãe',
    coombs_indireto: 'Coombs Ind.',
    anti_d: 'Recebeu Anti-D?',
    tipo_sanguineo_rn: 'TS RN',
    rh_rn: 'Rh RN',
    coombs_direto_rn: 'Coombs Dir.',
    eluato: 'Eluato',
    tipo_parto: 'Tipo de Parto',
    bolsa_rota: 'Bolsa AmniótICA',
    profilaxia_bolsa: 'Profilaxia Bolsa Rota',
    liquido_amniotico: 'Líquido Amniótico',
    peso_nascimento: 'Peso Nasc. (g)',
    comprimento: 'Compr. (cm)',
    pc_nascimento: 'PC (cm)',
    reanimacao_obs: 'Intercorrências Parto/Reanimação',
    peso_adequacao: 'Adequação Peso/IG',
    tempo_internacao: 'Tempo Internação (dias)',
    suporte_ventilatorio: 'Suporte Ventilatório',
    fototerapia: 'Fototerapia',
    npp: 'NPP',
    antibioticos: 'Antibióticos',
    diagnosticos_principais: 'Diagnósticos Principais (Alta)',
};

// MAPA 4: Labels de Ginecologia (Correto)
const ginecoLabelMap = {
    menarca_idade: 'Idade da Menarca',
    ciclo_regular: 'Ciclo Regular',
    ciclo_intervalo: 'Intervalo do Ciclo',
    ciclo_duracao: 'Duração do Ciclo',
    dismenorreia: 'Dismenorreia',
    ultimo_preventivo_resultado: 'Último Preventivo',
    ultima_mamografia_resultado: 'Última Mamografia',
    mac_atual: 'Método Contraceptivo Atual',
    hists_ists: 'Histórico de ISTs',
};

// MAPA 5: Labels de Ortopedia (Correto)
const ortoLabelMap = {
    antecedentes: 'Antecedentes Ortopédicos',
    ex_local: 'Local Afetado / Articulação',
    ex_inspecao: 'Inspeção',
    ex_palpacao: 'Palpação',
    ex_adm: 'Amplitude de Movimento (ADM)',
    ex_forca: 'Força Muscular (0-5)',
    ex_neurovascular: 'Exame Neurovascular',
    ex_testes: 'Testes Especiais',
};

// MAPA 6: Labels de Clínica Geral (Correto)
const clinicaGeralLabelMap = {
    hmp: 'Histórico Médico Pregresso',
    habitos_sociais: 'Hábitos e Histórico Social',
    vacina_adulto_status: 'Status Vacinal (Adulto)',
};
// --- FIM DOS MAPAS ---


// --- HELPERS ---
const isFilled = (value) => {
    if (value === 0) return true; 
    if (value === true) return true;
    if (value === null || value === undefined || value === "") return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
};
const formatValue = (key, value) => {
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (key === 'peso_nascimento') return `${value}g`;
    if (key === 'comprimento' || key === 'pc_nascimento') return `${value}cm`;
    // Formata datas que podem vir do backend
    if (key.includes('data') || key === 'dum') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            // Adiciona 1 dia para corrigir fuso horário (comum em JS)
            date.setDate(date.getDate() + 1);
            return date.toLocaleDateString('pt-BR');
        }
    }
    return String(value);
};
// --- FIM HELPERS ---


export default function ModalHistoricoEvolucao({ pacienteId, evolucaoId, onClose }) {
    const [relatorioData, setRelatorioData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { showSnackbar } = useSnackbar();

    // ★★★ useEffect (CORRIGIDO) ★★★
    useEffect(() => {
        if (pacienteId && evolucaoId) {
            setIsLoading(true);
            setRelatorioData(null); 
            const cacheBuster = `?_=${new Date().getTime()}`;

            const fetchTudo = async () => {
                try {
                    // ESTÁGIO 1: Buscar a Evolução
                    const resEvolucao = await apiClient.get(`/prontuario/pacientes/${pacienteId}/evolucoes/${evolucaoId}/${cacheBuster}`);
                    const evolucao = resEvolucao.data;
                    
                    // ★★★ LÓGICA DE ESPECIALIDADE CORRIGIDA (FINAL) ★★★
                    // 1. O backend agora envia 'especialidade_nome' (ex: "Cardiologia")
                    // 2. Se for nulo (consulta antiga, antes da v2), usamos 'pediatria' como padrão.
                    // 3. NUNCA usamos 'evolucao.especialidade' (que é um ID)
                    const especialidadeLimpa = (evolucao.especialidade_nome || 'pediatria').toLowerCase();
                    // ★★★ FIM DA CORREÇÃO ★★★
                    
                    console.log(`[DEBUG MODAL] Especialidade detectada: ${especialidadeLimpa}`);

                    const dadosBrutos = {
                        evolucao: evolucao,
                        especialidade: especialidadeLimpa, // Usa o nome em minúsculo
                        anamnese: null, dnpm: null, vacinas: null,
                    };
                    
                    // ESTÁGIO 2: Buscar dados-mestre
                    const anamnesePromise = apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/${cacheBuster}`);
                    const promises = [anamnesePromise];

                    // PediATRIA e NeoNATOLOGIA carregam as abas de DNPM e Vacinas
                    if (especialidadeLimpa === 'pediatria' || especialidadeLimpa === 'neonatologia') {
                        console.log(`[DEBUG MODAL] Adicionando buscas de ${especialidadeLimpa} (DNPM, Vacinas)...`);
                        promises.push(apiClient.get(`/prontuario/pacientes/${pacienteId}/marcos-dnpm/${cacheBuster}`));
                        promises.push(apiClient.get(`/prontuario/pacientes/${pacienteId}/vacinas/${cacheBuster}`));
                    }

                    const responses = await Promise.all(promises);
                    dadosBrutos.anamnese = responses[0].data; 

                    if (especialidadeLimpa === 'pediatria' || especialidadeLimpa === 'neonatologia') {
                        dadosBrutos.dnpm = responses[1].data;
                        dadosBrutos.vacinas = responses[2].data;
                    }

                    console.log('[DEBUG MODAL] 📦 Dados BRUTOS recebidos:', dadosBrutos);
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

    // --- FUNÇÕES DE RENDERIZAÇÃO DE ANAMNESE (Sem alterações) ---

    // Função genérica
    const renderAnamneseGenerica = (data, labelMap, titulo) => {
        if (!data) return <Typography variant="body2">Nenhum dado de {titulo} encontrado.</Typography>;
        
        const itensPreenchidos = [];
        Object.entries(data).forEach(([key, value]) => {
            const label = labelMap[key];
            if (label && isFilled(value)) {
                itensPreenchidos.push({ label, value: formatValue(key, value) });
            }
        });

        if (itensPreenchidos.length === 0) {
            return <Typography variant="body2">Nenhum dado relevante preenchido no {titulo}.</Typography>;
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

    // Helper de Triagens
    const renderTriagens = (triagensData) => {
        const itensTriagem = [];
        Object.entries(triagensData || {}).forEach(([key, value]) => {
            if (key.endsWith('_status') && isFilled(value)) {
                const label = key.replace('_status', '').replace('orelhinha_', '').replace('pezinho', 'Pezinho').replace('olhinho', 'Olhinho').replace('coracaozinho', 'Coraçãozinho').replace('linguinha', 'Linguinha');
                let displayValue = value;
                if (value === 'Alterado') {
                    const descKey = key.replace('_status', '_desc');
                    const desc = triagensData[descKey];
                    if (isFilled(desc)) { displayValue = `Alterado (${desc})`; }
                }
                itensTriagem.push({ label: `Triagem ${label}`, value: displayValue });
            }
        });
        return itensTriagem;
    };

    // 1. RENDER PEDIATRIA (Customizado)
    const renderAnamnesePediatrica = (data) => {
        if (!data) return <Typography variant="body2">Nenhum dado de anamnese pediátrica encontrado.</Typography>;
        
        let itensPreenchidos = [];
        
        const apgar = [data.apgar_1, data.apgar_5, data.apgar_10].filter(isFilled).join(' / ');
        if (isFilled(apgar)) {
            itensPreenchidos.push({ label: 'APGAR (1/5/10)', value: apgar });
        }
        
        Object.entries(data).forEach(([key, value]) => {
            const label = pedsLabelMap[key];
            if (label && isFilled(value)) {
                itensPreenchidos.push({ label, value: formatValue(key, value) });
            }
        });

        itensPreenchidos = itensPreenchidos.concat(renderTriagens(data.triagens));
        
        Object.entries(data.alimentacao_0_6m || {}).forEach(([key, value]) => {
            const label = pedsLabelMap[key];
            if (label && isFilled(value)) { itensPreenchidos.push({ label, value: formatValue(key, value) }); }
        });
        Object.entries(data.alimentacao_6_12m || {}).forEach(([key, value]) => {
            const label = pedsLabelMap[key];
            if (label && isFilled(value)) { itensPreenchidos.push({ label, value: formatValue(key, value) }); }
        });
        Object.entries(data.sono_comportamento || {}).forEach(([key, value]) => {
            const label = pedsLabelMap[key];
            if (label && isFilled(value)) { itensPreenchidos.push({ label, value: formatValue(key, value) }); }
        });

        if (itensPreenchidos.length === 0) {
            return <Typography variant="body2">Nenhum dado relevante preenchido no Histórico Pediátrico.</Typography>;
        }

        return (
            <ul>
                {itensPreenchidos.map((item, index) => (
                    <li key={index}> <Typography variant="body2"> <strong>{item.label}:</strong> {String(item.value)} </Typography> </li>
                ))}
            </ul>
        );
    };
    
    // 3. RENDER NEONATOLOGIA (Customizado)
    const renderAnamneseNeonatologia = (data) => {
        if (!data) return <Typography variant="body2">Nenhum dado de anamnese neonatal encontrado.</Typography>;
        
        let itensPreenchidos = [];

        // Lógica Customizada
        const gpa = [data.gpa_g, data.gpa_p, data.gpa_a].filter(isFilled).join(' / ');
        if (isFilled(gpa)) {
            itensPreenchidos.push({ label: 'G/P/A', value: gpa });
        }
        const apgar = [data.apgar_1, data.apgar_5, data.apgar_10].filter(isFilled).join(' / ');
        if (isFilled(apgar)) {
            itensPreenchidos.push({ label: 'APGAR (1/5/10)', value: apgar });
        }
        let ig = '';
        if (isFilled(data.ig_semanas)) ig += `${data.ig_semanas}s`;
        if (isFilled(data.ig_dias)) ig += ` ${data.ig_dias}d`;
        if (isFilled(ig)) {
            itensPreenchidos.push({ label: 'Idade Gestacional', value: ig.trim() });
        }

        // Outros campos (via neoLabelMap)
        Object.entries(data).forEach(([key, value]) => {
            const label = neoLabelMap[key];
            if (label && isFilled(value)) {
                itensPreenchidos.push({ label, value: formatValue(key, value) });
            }
        });

        // Lógica Customizada para JSONs
        if (data.condicoes_maternas === 'Sim' && isFilled(data.comorbidades_detalhes)) {
            const comorbidades = Object.keys(data.comorbidades_detalhes).filter(k => data.comorbidades_detalhes[k] === true).join(', ');
            if (isFilled(comorbidades)) { itensPreenchidos.push({ label: 'Comorbidades', value: comorbidades }); }
        }
        if (data.reanimacao_status === 'Sim' && isFilled(data.reanimacao_opcoes)) {
            const reanimacao = Object.keys(data.reanimacao_opcoes).filter(k => data.reanimacao_opcoes[k] === true).join(', ');
            if (isFilled(reanimacao)) { itensPreenchidos.push({ label: 'Reanimação', value: reanimacao }); }
        }
        
        // Triagens (usando o helper)
        itensPreenchidos = itensPreenchidos.concat(renderTriagens(data.triagens));
        
        if (itensPreenchidos.length === 0) {
            return <Typography variant="body2">Nenhum dado relevante preenchido no Histórico Neonatal.</Typography>;
        }

        return (
            <ul>
                {itensPreenchidos.map((item, index) => (
                    <li key={index}> <Typography variant="body2"> <strong>{item.label}:</strong> {String(item.value)} </Typography> </li>
                ))}
            </ul>
        );
    };

    // --- JSX (RENDERIZAÇÃO ATUALIZADO) ---
    return (
        <Dialog open={!!evolucaoId} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Relatório da Consulta</DialogTitle>
            <DialogContent dividers>
                {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
                
                {relatorioData && (
                    <Box>
                        {/* 1. SEÇÃO DO SOAP (EVOLUÇÃO) - Genérico */}
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
                        
                        {/* 2. SEÇÃO DA ANAMNESE (AGORA COMPLETA) */}
                        
                        {relatorioData.especialidade === 'pediatria' && (
                            <SecaoRelatorio 
                                titulo="Resumo do Histórico Pediátrico"
                                data={relatorioData.anamnese?.pediatrica}
                                renderFunc={renderAnamnesePediatrica}
                            />
                        )}
                        {relatorioData.especialidade === 'neonatologia' && (
                            <SecaoRelatorio 
                                titulo="Resumo do Histórico Neonatal"
                                data={relatorioData.anamnese?.neonatologia}
                                renderFunc={renderAnamneseNeonatologia}
                            />
                        )}
                        {relatorioData.especialidade === 'cardiologia' && (
                            <SecaoRelatorio 
                                titulo="Resumo do Histórico Cardiológico"
                                data={relatorioData.anamnese?.cardiologica}
                                renderFunc={(data) => renderAnamneseGenerica(data, cardioLabelMap, "Histórico Cardiológico")}
                            />
                        )}
                        {relatorioData.especialidade === 'ginecologia' && (
                            <SecaoRelatorio 
                                titulo="Resumo do Histórico Ginecológico"
                                data={relatorioData.anamnese?.ginecologica}
                                renderFunc={(data) => renderAnamneseGenerica(data, ginecoLabelMap, "Histórico Ginecológico")}
                            />
                        )}
                        {relatorioData.especialidade === 'ortopedia' && (
                            <SecaoRelatorio 
                                titulo="Resumo do Histórico Ortopédico"
                                data={relatorioData.anamnese?.ortopedica}
                                renderFunc={(data) => renderAnamneseGenerica(data, ortoLabelMap, "Histórico Ortopédico")}
                            />
                        )}
                        {relatorioData.especialidade === 'clinica_geral' && (
                            <SecaoRelatorio 
                                titulo="Resumo do Histórico de Clínica Geral"
                                data={relatorioData.anamnese?.clinica_geral}
                                renderFunc={(data) => renderAnamneseGenerica(data, clinicaGeralLabelMap, "Histórico de Clínica Geral")}
                            />
                        )}
                        {/* (Seções para Neuro, Obste, etc. podem ser adicionadas aqui) */}
                        

                        {/* 3. SEÇÃO DO DNPM (Mostra para Peds e Neo) */}
{(relatorioData.especialidade === 'pediatria' || relatorioData.especialidade === 'neonatologia') && relatorioData.dnpm && (
    <SecaoRelatorio 
        titulo="Resumo do DNPM (Cadastro Mestre)"
        data={relatorioData.dnpm} // <-- 1. Passe a lista COMPLETA
        renderFunc={(data) => {
            // 2. Mova o filtro para DENTRO da função
            const marcosRegistrados = data.filter(m => m.alcançado !== null);
            
            // 3. Verifique a lista filtrada aqui
            return marcosRegistrados.length > 0 ? (
                <ul>
                    {/* 4. Mapeie a lista FILTRADA */}
                    {marcosRegistrados.map(marco => ( 
                        <li key={marco.id}>
                            <Typography variant="body2" color={marco.alcançado ? 'text.primary' : 'error'}>
                                <strong>{marco.idade_marco} ({marco.marco_descricao}):</strong> 
                                {marco.alcançado ? ' Alcançado' : ' Ausente (Alerta)'}
                                {marco.observacao ? ` - ${marco.observacao}` : ''}
                            </Typography>
                        </li>
                    ))}
                </ul>
            ) : ( <Typography variant="body2">Nenhum marco (Presente ou Ausente) registrado.</Typography> )
        }}
    />
)}

                        {/* 4. SEÇÃO DE VACINAS (Mostra para Peds e Neo) */}
                        {(relatorioData.especialidade === 'pediatria' || relatorioData.especialidade === 'neonatologia') && relatorioData.vacinas && (
                            <SecaoRelatorio 
                                titulo="Resumo da Vacinação (Cadastro Mestre)"
                                data={relatorioData.vacinas.filter(v => v.status !== 'Pendente')} 
                                renderFunc={(data) => {
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
                                                            <TableCell sx={{color: vacina.status === 'Atrasada' ? 'error.main' : 'primary.main'}}>
                                                                {vacina.status}
                                                            </TableCell>
                                                            <TableCell>{vacina.data_aplicacao ? new Date(vacina.data_aplicacao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    ) : ( <Typography variant="body2">Nenhuma vacina (Aplicada, Atrasada, etc.) registrada.</Typography> )
                                }}
                            />
                        )}
                        
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