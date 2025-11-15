// src/components/prontuario/pediatria/VacinacaoTab.jsx
// VERSÃO REATORADA: Salva apenas quando o PAI (AtendimentoPediatria) mandar.

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
    Paper, Typography, Box, CircularProgress,
    TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
    TextField, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import apiClient from '../../../api/axiosConfig'

// (pniSchedule omitido para brevidade... sem alterações)
const pniSchedule = [
    { idade: 'Ao nascer', vacinas: [
        { id: 'bcg', nome: 'BCG', dose: 'Dose Única' },
        { id: 'hep_b_0', nome: 'Hepatite B', dose: '1ª Dose (ao nascer)' }
    ]},
    { idade: '2 meses', vacinas: [
        { id: 'penta_1', nome: 'Pentavalente', dose: '1ª Dose' },
        { id: 'vip_1', nome: 'VIP (Pólio)', dose: '1ª Dose' },
        { id: 'rota_1', nome: 'Rotavírus', dose: '1ª Dose' },
        { id: 'pneumo_1', nome: 'Pneumocócica', dose: '1ª Dose', 
          type: 'select', 
          options: ['Pneumo 10', 'Pneumo 13', 'Pneumo 15', 'Pneumo 20'],
          defaultName: 'Pneumo 10'
        }
    ]},
    { idade: '3 meses', vacinas: [
        { id: 'meno_acwy_1', nome: 'Meningocócica ACWY', dose: '1ª Dose' },
        { id: 'meno_b_1', nome: 'Meningocócica B', dose: '1ª Dose' }
    ]},
    { idade: '4 meses', vacinas: [
        { id: 'penta_2', nome: 'Pentavalente', dose: '2ª Dose' },
        { id: 'vip_2', nome: 'VIP (Pólio)', dose: '2ª Dose' },
        { id: 'rota_2', nome: 'Rotavírus', dose: '2ª Dose' },
        { id: 'pneumo_2', nome: 'Pneumocócica', dose: '2ª Dose',
          type: 'select', 
          options: ['Pneumo 10', 'Pneumo 13', 'Pneumo 15', 'Pneumo 20'],
          defaultName: 'Pneumo 10'
        }
    ]},
    { idade: '5 meses', vacinas: [
        { id: 'meno_acwy_2', nome: 'Meningocócica ACWY', dose: '2ª Dose' },
        { id: 'meno_b_2', nome: 'Meningocócica B', dose: '2ª Dose' }
    ]},
    { idade: '6 meses', vacinas: [
        { id: 'penta_3', nome: 'Pentavalente', dose: '3ª Dose' },
        { id: 'vip_3', nome: 'VIP (Pólio)', dose: '3ª Dose' },
        { id: 'influenza_1', nome: 'Influenza (Gripe)', dose: '1ª Dose (Campanha)' },
        { id: 'covid_1', nome: 'COVID-19', dose: '1ª Dose' }
    ]},
    { idade: '7 meses', vacinas: [
        { id: 'influenza_2', nome: 'Influenza (Gripe)', dose: '2ª Dose (se primovacinação)' }, 
        { id: 'covid_2', nome: 'COVID-19', dose: '2ª Dose' }
    ]},
     { idade: '9 meses', vacinas: [
        { id: 'febre_amarela', nome: 'Febre Amarela', dose: 'Dose Inicial' },
        { id: 'covid_3', nome: 'COVID-19', dose: '3ª Dose' }
    ]},
    { idade: '12 meses', vacinas: [
        { id: 'triplice_1', nome: 'Tríplice Viral', dose: '1ª Dose' },
        { id: 'pneumo_r', nome: 'Pneumocócica', dose: 'Reforço',
          type: 'select', 
          options: ['Pneumo 10', 'Pneumo 13', 'Pneumo 15', 'Pneumo 20'],
          defaultName: 'Pneumo 10'
        },
        { id: 'meno_acwy_r', nome: 'Meningo ACWY', dose: 'Reforço' },
        { id: 'meno_b_r', nome: 'Meningo B', dose: 'Reforço' }
    ]},
    { idade: '15 meses', vacinas: [
        { id: 'dtp_r1', nome: 'DTP (Tríplice Bact.)', dose: '1º Reforço' },
        { id: 'vop_r1', nome: 'VOP (Pólio Oral)', dose: '1º Reforço' },
        { id: 'hep_a', nome: 'Hepatite A', dose: 'Dose Única' },
        { id: 'tetra_viral', nome: 'Tetra Viral', dose: 'Dose Única' }
    ]},
    { idade: '4 anos', vacinas: [
        { id: 'dtp_r2', nome: 'DTP (Tríplice Bact.)', dose: '2º Reforço' },
        { id: 'vop_r2', nome: 'VOP (Pólio Oral)', dose: '2º Reforço' },
        { id: 'varicela_r', nome: 'Varicela', dose: 'Reforço/2ª Dose' },
        { id: 'febre_amarela_r', nome: 'Febre Amarela', dose: 'Reforço' }
    ]},
    { idade: 'Anual', vacinas: [
        { id: 'influenza_anual', nome: 'Influenza (Gripe)', dose: 'Dose Anual' }
    ]}
];

// --- 1. Envolver componente com forwardRef ---
const VacinacaoTab = forwardRef(({ pacienteId, onDataChange }, ref) => {
    const { showSnackbar } = useSnackbar();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // 2. State de Submissão
    const [vacinasSalvas, setVacinasSalvas] = useState({});
    const [vacinasIniciais, setVacinasIniciais] = useState({}); // 3. State Inicial
    // const [loadingVacinas, setLoadingVacinas] = useState({}); // Removido

    const fetchVacinas = useCallback(async () => {
        setIsLoading(true);
        console.log(`[DEBUG VACINAS]  fetching... pacienteId: ${pacienteId}`);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/vacinas/`);
            console.log('[DEBUG VACINAS] 📦 Dados BRUTOS recebidos da API:', res.data);
            
            const mapaVacinas = res.data.reduce((acc, vacina) => {
                if (vacina.vacina_id) {
                    if (vacina.data_aplicacao) {
                        vacina.data_aplicacao = vacina.data_aplicacao.split('T')[0];
                    }
                    acc[vacina.vacina_id] = vacina;
                }
                return acc;
            }, {});
            
            setVacinasSalvas(mapaVacinas);
            setVacinasIniciais(JSON.parse(JSON.stringify(mapaVacinas))); // Guarda cópia profunda inicial
            
            console.log('[DEBUG VACINAS] 🏁 Estado final (mapaVacinas):', mapaVacinas);
        } catch (err) {
            if (err.response && err.response.status !== 404) {
                console.error("[DEBUG VACINAS] ❌ Erro no fetch:", err);
                showSnackbar('Erro ao carregar caderneta de vacinação.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    }, [pacienteId, showSnackbar]);

    useEffect(() => {
        fetchVacinas();
    }, [fetchVacinas]);

    // --- 4. Função de MUDANÇA (NÃO SALVA MAIS) ---
    const handleLocalVacinaChange = (vacinaInfo, field, newValue) => {
        const { id, nome, dose, idade, defaultName } = vacinaInfo;
        const key = id;
        
        console.log(`[DEBUG VACINAS] ✍️  Mudança local... ID: ${key}, Campo: ${field}, Valor: ${newValue}`);
        
        const savedData = vacinasSalvas[key] || {};

        let nomeVacinaFinal;
        if (field === 'nome_vacina') {
            nomeVacinaFinal = newValue;
        } else if (savedData.nome_vacina) {
            nomeVacinaFinal = savedData.nome_vacina;
        } else {
            nomeVacinaFinal = defaultName || nome;
        }
        
        const payload = {
            ...(savedData.id && { id: savedData.id }), // Mantém o ID do banco, se existir
            vacina_id: key,
            nome_vacina: nomeVacinaFinal,
            dose: dose,
            idade_recomendada: idade,
            status: savedData.status || 'Pendente', 
            data_aplicacao: savedData.data_aplicacao || null,
            observacao: savedData.observacao || '',
            [field]: newValue,
        };
        
        // Lógica inteligente
        if (field === 'status' && newValue === 'Aplicada' && !payload.data_aplicacao) {
            payload.data_aplicacao = new Date().toISOString().split('T')[0];
        }
        if (field === 'data_aplicacao' && newValue) {
            payload.status = 'Aplicada';
        }
        if (field === 'data_aplicacao' && !newValue) {
            payload.data_aplicacao = null;
            payload.status = 'Pendente';
        }
        
        // Apenas atualiza o estado local
        setVacinasSalvas(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                ...payload 
            }
        }));
    };

    // --- 5. NOVA FUNÇÃO DE SALVAR (Chamada pelo PAI) ---
    const saveData = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        console.log('[SAVE DATA - VACINAS] Iniciando salvamento...');

        const savePromises = [];

        // Itera sobre o estado local
        for (const vacina_id in vacinasSalvas) {
            const localVacina = vacinasSalvas[vacina_id];
            const vacinaInicial = vacinasIniciais[vacina_id];

            // Compara com o estado inicial
            if (JSON.stringify(localVacina) === JSON.stringify(vacinaInicial)) {
                continue; // Pula, sem mudanças
            }

            console.log(`[SAVE DATA - VACINAS] Alteração detectada em: ${vacina_id}`);

            // O 'localVacina' já é o payload completo, graças ao handleLocalVacinaChange
            const payload = localVacina;

            // Decide se é POST (novo) ou PATCH (existente)
            if (localVacina.id) { // 'id' é o ID do banco de dados
                savePromises.push(
                    apiClient.patch(`/prontuario/pacientes/${pacienteId}/vacinas/${localVacina.id}/`, payload)
                );
            } else {
                savePromises.push(
                    apiClient.post(`/prontuario/pacientes/${pacienteId}/vacinas/`, payload)
                );
            }
        }

        try {
            await Promise.all(savePromises);
            console.log('[SAVE DATA - VACINAS] Salvo com sucesso!');
            
            // Re-fetch para atualizar os estados iniciais e IDs
            await fetchVacinas(); 
            
            // Chama o onDataChange (para os badges do pai)
            if (onDataChange) onDataChange();

        } catch (err) {
            console.error("[SAVE DATA - VACINAS] ❌ Erro ao salvar:", err);
            showSnackbar('Erro ao salvar dados de Vacinação.', 'error');
            throw err; // Re-lança o erro para o Promise.all do pai
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- 6. Expor a função de salvar para o PAI ---
    useImperativeHandle(ref, () => ({
        saveData: async () => {
            await saveData();
        }
    }));


    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // --- 7. JSX (com indicador de loading) ---
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 0 }}>
                    Caderneta de Vacinação (PNI 2025)
                </Typography>
                {isSubmitting && <CircularProgress size={20} sx={{ ml: 2 }} />}
            </Box>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{fontWeight: 'bold'}}>Idade</TableCell>
                            <TableCell sx={{fontWeight: 'bold'}}>Vacina</TableCell>
                            <TableCell sx={{fontWeight: 'bold'}}>Status</TableCell>
                            <TableCell sx={{fontWeight: 'bold'}}>Data Aplicação</TableCell>
                            <TableCell sx={{fontWeight: 'bold', minWidth: '150px'}}>Observações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {pniSchedule.map((grupo) => (
                            <React.Fragment key={grupo.idade}>
                                {grupo.vacinas.map((vacina, vacIndex) => {
                                    
                                    const key = vacina.id;
                                    const dadosSalvos = vacinasSalvas[key] || {};
                                    const vacinaInfo = { ...vacina, idade: grupo.idade };

                                    return (
                                        <TableRow key={key}>
                                            {vacIndex === 0 ? (
                                                <TableCell rowSpan={grupo.vacinas.length} sx={{ fontWeight: 'bold', verticalAlign: 'top' }}>
                                                    {grupo.idade}
                                                </TableCell>
                                            ) : null}
                                            
                                            <TableCell>
                                                {vacina.type === 'select' ? (
                                                    <FormControl size="small" fullWidth sx={{minWidth: '150px'}}>
                                                        <InputLabel id={`nome-vacina-label-${key}`}>{vacina.nome}</InputLabel>
                                                        <Select
                                                            labelId={`nome-vacina-label-${key}`}
                                                            label={vacina.nome}
                                                            value={dadosSalvos.nome_vacina || vacina.defaultName}
                                                            onChange={(e) => handleLocalVacinaChange(vacinaInfo, 'nome_vacina', e.target.value)}
                                                        >
                                                            {vacina.options.map(opt => (
                                                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>
                                                ) : (
                                                    <>
                                                        <Typography variant="body2" sx={{fontWeight: '500'}}>{vacina.nome}</Typography>
                                                        <Typography variant="caption" color="textSecondary">{vacina.dose}</Typography>
                                                    </>
                                                )}
                                            </TableCell>
                                            
                                            <TableCell>
                                                <FormControl size="small" fullWidth sx={{minWidth: '120px'}}>
                                                    <InputLabel id={`status-label-${key}`}>Status</InputLabel>
                                                    <Select
                                                        labelId={`status-label-${key}`}
                                                        label="Status"
                                                        value={dadosSalvos.status || 'Pendente'}
                                                        onChange={(e) => handleLocalVacinaChange(vacinaInfo, 'status', e.target.value)}
                                                    >
                                                        <MenuItem value="Pendente">Pendente</MenuItem>
                                                        <MenuItem value="Aplicada">Aplicada</MenuItem>
                                                        <MenuItem value="Atrasada">Atrasada</MenuItem>
                                                        <MenuItem value="Não se aplica">Não se aplica</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </TableCell>

                                            <TableCell>
                                                <TextField
                                                    type="date"
                                                    size="small"
                                                    InputLabelProps={{ shrink: true }}
                                                    value={dadosSalvos.data_aplicacao || ''}
                                                    onChange={(e) => handleLocalVacinaChange(vacinaInfo, 'data_aplicacao', e.target.value || null)}
                                                />
                                            </TableCell>

                                            <TableCell>
                                                <TextField
                                                    placeholder="Lote, clínica, etc."
                                                    size="small"
                                                    fullWidth
                                                    // Usamos 'value' para garantir que o estado local seja a fonte da verdade
                                                    value={dadosSalvos.observacao || ''}
                                                    // onChange é mais reativo que onBlur para estado local
                                                    onChange={(e) => handleLocalVacinaChange(vacinaInfo, 'observacao', e.target.value)}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}); // --- Fim do forwardRef ---

export default VacinacaoTab;