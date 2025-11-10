/// src/components/prontuario/pediatria/HistoricoPediatrico.jsx
// ATUALIZADO: APGAR (3 campos) e Triagens (detalhado) conforme vídeo

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider,
    FormControl, InputLabel, Select, MenuItem, Box, Button, CircularProgress,
    Accordion, AccordionSummary, AccordionDetails, FormLabel 
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; 
import { useSnackbar } from '../../../contexts/SnackbarContext';
import apiClient from '../../../api/axiosConfig';

// --- Opções para ComboBoxes ---
const tipoPartoOptions = ['Vaginal', 'Fórceps', 'Cesárea'];
const igOptions = ['Pré-termo (<37s)', 'Termo (37-41s)', 'Pós-termo (>42s)'];
const pesoNascerOptions = ['Baixo peso (<2500g)', 'Peso adequado (2500-3999g)', 'Macrossômico (>=4000g)'];
// --- ALTERAÇÃO 1: APGAR ---
// Removido apgarOptions
const apgarScoreOptions = Array.from({ length: 11 }, (_, i) => i); // 0-10
// --- FIM ALTERAÇÃO ---

const alimentacao06Options = {
    tipo_aleitamento: [{value: 'AME', label: 'AME'}, {value: 'Misto', label: 'Misto'}, {value: 'Formula', label: 'Fórmula'}],
    pega: [{value: 'Boa', label: 'Boa'}, {value: 'Parcial', label: 'Parcial'}, {value: 'Ruim', label: 'Ruim'}],
    succao: [{value: 'Eficaz', label: 'Eficaz'}, {value: 'Fraca', label: 'Fraca'}, {value: 'Ausente', label: 'Ausente'}],
    diurese: [{value: 'Adequada', label: 'Adequada'}, {value: 'Reduzida', label: 'Reduzida'}],
    evacuacao: [{value: 'Normal', label: 'Normal'}, {value: 'Ressecada', label: 'Ressecada'}, {value: 'Diarreica', label: 'Diarreica'}],
    suplementacao: [{id: 'vitamina_d', label: 'Vit D'}, {id: 'ferro', label: 'Ferro'}],
};
const alimentacao612Options = {
    tipo_alimentacao: [{value: 'Mantem AM', label: 'Mantém AM'}, {value: 'Formula', label: 'Fórmula'}, {value: 'Ambos', label: 'Ambos'}],
    refeicoes_dia: [{value: '2', label: '2'}, {value: '3', label: '3'}, {value: '>3', label: '>3'}],
    textura: [{value: 'Amassada', label: 'Amassada'}, {value: 'Picada', label: 'Picada'}, {value: 'Pedaços', label: 'Pedaços'}],
    aceitacao: [{value: 'Boa', label: 'Boa'}, {value: 'Parcial', label: 'Parcial'}, {value: 'Ruim', label: 'Ruim'}],
    agua: [{value: 'Adequada', label: 'Adequada'}, {value: 'Baixa', label: 'Baixa'}],
    suplementacao: [{id: 'vitamina_d', label: 'Vit D'}, {id: 'ferro', label: 'Ferro'}],
    aceitacao_geral: [{value: 'Adequada', label: 'Adequada'}, {value: 'Seletiva', label: 'Seletiva'}, {value: 'Dificuldade Textura', label: 'Dificuldade Textura'}],
};
const metodoIAOptions = ['Tradicional', 'BLW', 'BLISS', 'Misto'];
const copoTransicaoOptions = ['Copo 360', 'Canudo Curto', 'Bico Rígido', 'Aberto Pequeno', 'Não usa / Mamadeira'];

const sonoComportamentoOptions = {
    sono_diurno: [{value: 'Adequado', label: 'Adequado'}, {value: 'Alterado', label: 'Alterado'}],
    sono_noturno: [{value: 'Adequado', label: 'Adequado'}, {value: 'Alterado', label: 'Alterado'}],
    colica: [{value: 'Presente', label: 'Presente'}, {value: 'Ausente', label: 'Ausente'}], // <-- Modificado
    choro: [{value: 'Adequado', label: 'Adequado'}, {value: 'Alterado', label: 'Alterado'}],
    vinculo: [{value: 'Adequado', label: 'Adequado'}, {value: 'Alterado', label: 'Alterado'}],
};

// --- ALTERAÇÃO 2: TRIAGENS ---
// Removido triagensOptions (checkbox)
const normalAlteradoOptions = ['Normal', 'Alterado'];
const presenteAlteradoOptions = ['Presente', 'Alterado'];
const eoatOptions = ['Presente Bilateral', 'Alterado', 'Ausente'];
// --- FIM ALTERAÇÃO ---

// --- ALTERAÇÃO 3: initialState (APGAR e Triagens) ---
const initialState = {
    tipo_parto: '', idade_gestacional: '', peso_nascimento: '', 
    // APGAR atualizado
    apgar_1: '', apgar_5: '', apgar_10: '', 
    intercorrencias_gestacao_parto: '',
    // Triagens atualizado
    triagens: {
        pezinho_status: '', pezinho_desc: '',
        orelhinha_eoat_status: '', orelhinha_eoat_desc: '',
        orelhinha_bera_status: '', orelhinha_bera_desc: '',
        olhinho_status: '', olhinho_desc: '',
        coracaozinho_status: '', coracaozinho_desc: '',
        linguinha_status: '', linguinha_desc: '',
    },
    alimentacao_0_6m: {}, alimentacao_6_12m: {}, sono_comportamento: {},
    alimentacao_0_6m_obs: '', metodo_ia: '', copo_transicao: '', alimentacao_6_12m_obs: '', sono_comportamento_obs: '',
};
// --- FIM ALTERAÇÃO ---

export default function HistoricoPediatrico({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    const [expanded, setExpanded] = useState('panel1');
    const handleAccordionChange = (panel) => (event, isExpanded) => {
        setExpanded(isExpanded ? panel : false);
    };

    const [anamneseData, setAnamneseData] = useState(initialState);

    // --- ALTERAÇÃO 4: fetchAnamnese (Deep Merge Triagens) ---
    const fetchAnamnese = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            if (res.data && res.data.pediatrica) {
                // Garante que o estado inicial tenha todas as chaves
                const data = { ...initialState, ...(res.data.pediatrica || {}) };
                // Deep merge para sub-objetos
                data.alimentacao_0_6m = { ...initialState.alimentacao_0_6m, ...(data.alimentacao_0_6m || {}) };
                data.alimentacao_6_12m = { ...initialState.alimentacao_6_12m, ...(data.alimentacao_6_12m || {}) };
                data.sono_comportamento = { ...initialState.sono_comportamento, ...(data.sono_comportamento || {}) };
                data.triagens = { ...initialState.triagens, ...(data.triagens || {}) };
                
                setAnamneseData(data);
            } else {
                 setAnamneseData(initialState);
            }
        } catch (err) {
            if (err.response && err.response.status !== 404) {
                showSnackbar('Erro ao carregar histórico de anamnese.', 'error');
            }
            setAnamneseData(initialState);
        } finally {
            setIsLoading(false);
            setExpanded('panel1'); 
        }
    }, [pacienteId, showSnackbar]); 
    // --- FIM ALTERAÇÃO ---

    useEffect(() => {
        fetchAnamnese();
    }, [fetchAnamnese]);

    // --- Handlers (sem alteração) ---
    const handleChange = (e) => {
        setAnamneseData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    const handleJsonChange = (jsonField, key, value) => {
        setAnamneseData(prev => ({
            ...prev,
            [jsonField]: { ...(prev[jsonField] || {}), [key]: value }
        }));
    };
    const handleJsonCheckboxChange = (jsonField, key, checked) => {
         setAnamneseData(prev => ({
            ...prev,
            [jsonField]: { ...(prev[jsonField] || {}), [key]: checked }
        }));
    };
    // --- ALTERAÇÃO 5: Novo Handler para Triagens ---
    const handleTriagensChange = (e) => {
        const { name, value } = e.target;
        handleJsonChange('triagens', name, value);
    };
    // --- FIM ALTERAÇÃO ---
    // --- Fim Handlers ---

    // --- Handlers de Normalidade ---
    // --- ALTERAÇÃO 6: handleNormalidadeGestacional (APGAR e Triagens) ---
    const handleNormalidadeGestacional = () => {
        setAnamneseData(prev => ({
            ...prev,
            tipo_parto: 'Vaginal',
            idade_gestacional: 'Termo (37-41s)',
            peso_nascimento: 'Peso adequado (2500-3999g)',
            apgar_1: '9', // Atualizado
            apgar_5: '10', // Atualizado
            apgar_10: '10', // Atualizado
            // Triagens atualizado
            triagens: {
                pezinho_status: 'Normal', pezinho_desc: '',
                orelhinha_eoat_status: 'Presente Bilateral', orelhinha_eoat_desc: '',
                orelhinha_bera_status: 'Normal', orelhinha_bera_desc: '',
                olhinho_status: 'Presente', olhinho_desc: '',
                coracaozinho_status: 'Normal', coracaozinho_desc: '',
                linguinha_status: 'Normal', linguinha_desc: '',
            },
        }));
        showSnackbar('Dados gestacionais e triagens preenchidos.', 'info');
    };
    // --- FIM ALTERAÇÃO ---
    const handleNormalidadeAlim06 = () => {
        setAnamneseData(prev => ({
            ...prev,
            alimentacao_0_6m: {
                tipo_aleitamento: 'AME',
                pega: 'Boa',
                succao: 'Eficaz',
                diurese: 'Adequada',
                evacuacao: 'Normal',
                vitamina_d: true,
                ferro: true
            },
        }));
        showSnackbar('Alimentação 0-6m preenchida com padrão normal.', 'info');
    };
    const handleNormalidadeAlim612 = () => {
        setAnamneseData(prev => ({
            ...prev,
            alimentacao_6_12m: {
                tipo_alimentacao: 'Mantem AM',
                refeicoes_dia: '2',
                textura: 'Amassada',
                aceitacao: 'Boa',
                agua: 'Adequada',
                vitamina_d: true,
                ferro: true,
                aceitacao_geral: 'Adequada'
            },
            metodo_ia: 'Tradicional',
            copo_transicao: 'Aberto Pequeno'
        }));
        showSnackbar('Alimentação 6-12m preenchida com padrão normal.', 'info');
    };
    const handleNormalidadeSono = () => {
        setAnamneseData(prev => ({
            ...prev,
            sono_comportamento: {
                sono_diurno: 'Adequado',
                sono_noturno: 'Adequado',
                colica: 'Ausente', // <-- Modificado
                choro: 'Adequado',
                vinculo: 'Adequado'
            },
        }));
        showSnackbar('Sono/Comportamento preenchidos com padrão normal.', 'info'); // <-- Modificado
    };
    const handleLimparHistorico = () => {
        setAnamneseData(initialState);
        showSnackbar('Campos do histórico limpos.', 'info');
    };
    // --- Fim Handlers de Normalidade ---

    // Função de Salvar (Sem alterações)
    const handleSaveAnamnese = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            // A view agora usa get_or_create, então POST ou PATCH funcionariam.
            // Vamos manter o POST para criar/atualizar tudo.
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                pediatrica: anamneseData
            });
            showSnackbar('Histórico pediátrico salvo com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao salvar anamnese:", error.response?.data || error);
            showSnackbar('Erro ao salvar histórico.', 'error');
        }
        finally { setIsSubmitting(false); }
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // --- JSX ATUALIZADO (Layout Corrigido) ---
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Histórico Pediátrico (Anamnese)
            </Typography>

            <Box sx={{ mt: 2 }}>
                {/* Accordion: Gestacional/Nascimento ATUALIZADO */}
                <Accordion 
                    expanded={expanded === 'panel1'} 
                    onChange={handleAccordionChange('panel1')}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontWeight: 'medium' }}>Histórico Gestacional, Nascimento e Triagens</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Button size="small" variant="outlined" onClick={handleNormalidadeGestacional} sx={{mb: 2, float: 'right'}}>Preencher Normalidade</Button>
                        
                        {/* --- ALTERAÇÃO 7: JSX APGAR (3 campos) --- */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            <TextField select label="Tipo do Parto" name="tipo_parto" value={anamneseData.tipo_parto || ''} onChange={handleChange} size="small" sx={{ minWidth: 170, flex: '1 1 170px' }}> 
                                {tipoPartoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)} 
                            </TextField>
                            <TextField select label="Idade Gestacional" name="idade_gestacional" value={anamneseData.idade_gestacional || ''} onChange={handleChange} size="small" sx={{ minWidth: 170, flex: '1 1 170px' }}> 
                                {igOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)} 
                            </TextField>
                            <TextField select label="Peso ao nascer" name="peso_nascimento" value={anamneseData.peso_nascimento || ''} onChange={handleChange} size="small" sx={{ minWidth: 170, flex: '1 1 170px' }}> 
                                {pesoNascerOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)} 
                            </TextField>
                        </Box>
                        
                        <Typography variant="body2" sx={{ mt: 2, fontWeight: 'medium', color: 'text.secondary' }}>APGAR</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                             <TextField select label="1º Minuto" name="apgar_1" value={anamneseData.apgar_1 || ''} onChange={handleChange} size="small" sx={{ minWidth: 100, flex: '1 1 100px' }}> 
                                {apgarScoreOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)} 
                            </TextField>
                             <TextField select label="5º Minuto" name="apgar_5" value={anamneseData.apgar_5 || ''} onChange={handleChange} size="small" sx={{ minWidth: 100, flex: '1 1 100px' }}> 
                                {apgarScoreOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)} 
                            </TextField>
                             <TextField select label="10º Minuto (opc)" name="apgar_10" value={anamneseData.apgar_10 || ''} onChange={handleChange} size="small" sx={{ minWidth: 100, flex: '1 1 100px' }}> 
                                <MenuItem value="">-</MenuItem>
                                {apgarScoreOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)} 
                            </TextField>
                        </Box>
                        {/* --- FIM ALTERAÇÃO APGAR --- */}
                        
                        <TextField 
                            label="Intercorrências na gestação ou parto" 
                            name="intercorrencias_gestacao_parto" 
                            value={anamneseData.intercorrencias_gestacao_parto || ''} 
                            onChange={handleChange} 
                            multiline 
                            rows={2} 
                            fullWidth 
                            size="small" 
                            sx={{ mt: 2 }}
                        />
                        
                        {/* --- CORREÇÃO DO LAYOUT DAS TRIAGENS (Grid -> Box) --- */}
                        <FormControl component="fieldset" size="small" sx={{mt: 2, width: '100%'}}>
                            <FormLabel component="legend" sx={{fontSize: '0.9rem', fontWeight: 'medium'}}>Triagens Neonatais Realizadas</FormLabel>
                            
                            {/* O Grid container foi substituído por um Box */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 0.5 }}>
                                
                                {/* Teste do Pezinho */}
                                <Box sx={{minWidth: 170, flex: '1 1 170px'}}>
                                    <TextField select label="Teste do Pezinho" name="pezinho_status" value={anamneseData.triagens.pezinho_status || ''} onChange={handleTriagensChange} size="small" fullWidth>
                                        {normalAlteradoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                                    </TextField>
                                </Box>
                                {anamneseData.triagens.pezinho_status === 'Alterado' && (
                                    <Box sx={{minWidth: 170, flex: '2 1 200px'}}>
                                        <TextField label="Descrever (Pezinho)" name="pezinho_desc" value={anamneseData.triagens.pezinho_desc || ''} onChange={handleTriagensChange} size="small" fullWidth/>
                                    </Box>
                                )}

                                {/* Teste da Orelhinha (EOAT) */}
                                <Box sx={{minWidth: 170, flex: '1 1 170px'}}>
                                    <TextField select label="Orelhinha (EOAT)" name="orelhinha_eoat_status" value={anamneseData.triagens.orelhinha_eoat_status || ''} onChange={handleTriagensChange} size="small" fullWidth>
                                        {eoatOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                                    </TextField>
                                </Box>
                                {anamneseData.triagens.orelhinha_eoat_status === 'Alterado' && (
                                    <Box sx={{minWidth: 170, flex: '2 1 200px'}}>
                                        <TextField label="Descrever (EOAT)" name="orelhinha_eoat_desc" value={anamneseData.triagens.orelhinha_eoat_desc || ''} onChange={handleTriagensChange} size="small" fullWidth/>
                                    </Box>
                                )}

                                {/* Teste da Orelhinha (BERA) */}
                                <Box sx={{minWidth: 170, flex: '1 1 170px'}}>
                                    <TextField select label="BERA" name="orelhinha_bera_status" value={anamneseData.triagens.orelhinha_bera_status || ''} onChange={handleTriagensChange} size="small" fullWidth>
                                        {normalAlteradoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                                    </TextField>
                                </Box>
                                {anamneseData.triagens.orelhinha_bera_status === 'Alterado' && (
                                    <Box sx={{minWidth: 170, flex: '2 1 200px'}}>
                                        <TextField label="Descrever (BERA)" name="orelhinha_bera_desc" value={anamneseData.triagens.orelhinha_bera_desc || ''} onChange={handleTriagensChange} size="small" fullWidth/>
                                    </Box>
                                )}

                                {/* Teste do Olhinho (Reflexo Vermelho) */}
                                <Box sx={{minWidth: 170, flex: '1 1 170px'}}>
                                    <TextField select label="Olhinho (Refl. Verm.)" name="olhinho_status" value={anamneseData.triagens.olhinho_status || ''} onChange={handleTriagensChange} size="small" fullWidth>
                                        {presenteAlteradoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                                    </TextField>
                                </Box>
                                {anamneseData.triagens.olhinho_status === 'Alterado' && (
                                    <Box sx={{minWidth: 170, flex: '2 1 200px'}}>
                                        <TextField label="Descrever (Olhinho)" name="olhinho_desc" value={anamneseData.triagens.olhinho_desc || ''} onChange={handleTriagensChange} size="small" fullWidth/>
                                    </Box>
                                )}

                                {/* Teste do Coraçãozinho */}
                                <Box sx={{minWidth: 170, flex: '1 1 170px'}}>
                                    <TextField select label="Coraçãozinho" name="coracaozinho_status" value={anamneseData.triagens.coracaozinho_status || ''} onChange={handleTriagensChange} size="small" fullWidth>
                                        {normalAlteradoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                                    </TextField>
                                </Box>
                                {anamneseData.triagens.coracaozinho_status === 'Alterado' && (
                                    <Box sx={{minWidth: 170, flex: '2 1 200px'}}>
                                        <TextField label="Descrever (Coraçãozinho)" name="coracaozinho_desc" value={anamneseData.triagens.coracaozinho_desc || ''} onChange={handleTriagensChange} size="small" fullWidth/>
                                    </Box>
                                )}
                                
                                {/* Teste da Linguinha */}
                                <Box sx={{minWidth: 170, flex: '1 1 170px'}}>
                                    <TextField select label="Linguinha" name="linguinha_status" value={anamneseData.triagens.linguinha_status || ''} onChange={handleTriagensChange} size="small" fullWidth>
                                        {normalAlteradoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                                    </TextField>
                                </Box>
                                {anamneseData.triagens.linguinha_status === 'Alterado' && (
                                    <Box sx={{minWidth: 170, flex: '2 1 200px'}}>
                                        <TextField label="Descrever (Linguinha)" name="linguinha_desc" value={anamneseData.triagens.linguinha_desc || ''} onChange={handleTriagensChange} size="small" fullWidth/>
                                    </Box>
                                )}
                            </Box>
                        </FormControl>
                        {/* --- FIM DA CORREÇÃO --- */}
                    </AccordionDetails>
                </Accordion>

                {/* Accordion: Alimentação 0-6m (ATUALIZADO) */}
                <Accordion 
                    expanded={expanded === 'panel2'} 
                    onChange={handleAccordionChange('panel2')}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontWeight: 'medium' }}>Alimentação (0-6 Meses)</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Button size="small" variant="outlined" onClick={handleNormalidadeAlim06} sx={{mb: 2, float: 'right'}}>Preencher Normalidade</Button>
                         
                         {/* Box flexWrap para os ComboBoxes */}
                         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {Object.entries(alimentacao06Options).filter(([key]) => key !== 'suplementacao').map(([key, options]) => (
                                <TextField 
                                    select 
                                    key={key}
                                    label={key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                                    name={key}
                                    value={anamneseData.alimentacao_0_6m[key] || ''}
                                    onChange={(e) => handleJsonChange('alimentacao_0_6m', key, e.target.value)}
                                    size="small"
                                    sx={{ minWidth: 170, flex: '1 1 170px' }}
                                >
                                    {options.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                                </TextField>
                            ))}
                             {/* Checkbox de Suplementação */}
                             <FormControl component="fieldset" size="small" sx={{ minWidth: 170, flex: '1 1 170px' }}> 
                                <FormLabel sx={{fontSize: '0.9rem'}}>Suplementação</FormLabel> 
                                <FormGroup row> 
                                    {alimentacao06Options.suplementacao.map(o => <FormControlLabel key={o.id} control={<Checkbox size="small" checked={anamneseData.alimentacao_0_6m[o.id] || false} onChange={(e) => handleJsonCheckboxChange('alimentacao_0_6m', o.id, e.target.checked)} name={o.id} />} label={o.label}/>)} 
                                </FormGroup> 
                            </FormControl> 
                         </Box>
                         <TextField 
                            label="Observações Alimentação 0-6m" 
                            name="alimentacao_0_6m_obs" 
                            multiline rows={2} 
                            fullWidth 
                            size="small" 
                            value={anamneseData.alimentacao_0_6m_obs || ''} 
                            onChange={handleChange} 
                            sx={{ mt: 2 }}
                        />
                    </AccordionDetails>
                </Accordion>

                {/* Accordion: Alimentação 6-12m (ATUALIZADO) */}
                 <Accordion 
                    expanded={expanded === 'panel3'} 
                    onChange={handleAccordionChange('panel3')}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontWeight: 'medium' }}>Alimentação (6-12+ Meses)</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Button size="small" variant="outlined" onClick={handleNormalidadeAlim612} sx={{mb: 2, float: 'right'}}>Preencher Normalidade</Button>
                         
                         {/* Box flexWrap para os ComboBoxes */}
                         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                             {Object.entries(alimentacao612Options).filter(([key]) => key !== 'suplementacao').map(([key, options]) => (
                                <TextField 
                                    select 
                                    key={key}
                                    label={key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                                    name={key}
                                    value={anamneseData.alimentacao_6_12m[key] || ''}
                                    onChange={(e) => handleJsonChange('alimentacao_6_12m', key, e.target.value)}
                                    size="small"
                                    sx={{ minWidth: 170, flex: '1 1 170px' }}
                                >
                                    {options.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                                </TextField>
                            ))}
                            {/* Checkbox de Suplementação */}
                            <FormControl component="fieldset" size="small" sx={{ minWidth: 170, flex: '1 1 170px' }}> 
                                <FormLabel sx={{fontSize: '0.9rem'}}>Suplementação</FormLabel> 
                                <FormGroup row> 
                                    {alimentacao612Options.suplementacao.map(o => <FormControlLabel key={o.id} control={<Checkbox size="small" checked={anamneseData.alimentacao_6_12m[o.id] || false} onChange={(e) => handleJsonCheckboxChange('alimentacao_6_12m', o.id, e.target.checked)} name={o.id} />} label={o.label}/>)} 
                                </FormGroup> 
                            </FormControl> 
                            {/* Campos de Método IA e Copo Transição */}
                            <TextField select label="Método Introdução Alimentar" name="metodo_ia" value={anamneseData.metodo_ia || ''} onChange={handleChange} size="small" sx={{ minWidth: 170, flex: '1 1 170px' }}> 
                                {metodoIAOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)} 
                            </TextField> 
                            <TextField select label="Copo de Transição" name="copo_transicao" value={anamneseData.copo_transicao || ''} onChange={handleChange} size="small" sx={{ minWidth: 170, flex: '1 1 170px' }}> 
                                {copoTransicaoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)} 
                            </TextField> 
                         </Box>
                         <TextField 
                            label="Observações Alimentação 6-12m" 
                            name="alimentacao_6_12m_obs" 
                            multiline rows={2} 
                            fullWidth 
                            size="small" 
                            value={anamneseData.alimentacao_6_12m_obs || ''} 
                            onChange={handleChange} 
                            sx={{ mt: 2 }} 
                        />
                    </AccordionDetails>
                </Accordion>

                {/* Accordion: Sono/Comportamento (ATUALIZADO) */}
                 <Accordion 
                    expanded={expanded === 'panel4'} 
                    onChange={handleAccordionChange('panel4')}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontWeight: 'medium' }}>Sono / Cólicas / Comportamento</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Button size="small" variant="outlined" onClick={handleNormalidadeSono} sx={{mb: 2, float: 'right'}}>Preencher Normalidade</Button>
                        
                        {/* Box flexWrap para os ComboBoxes */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {Object.entries(sonoComportamentoOptions).map(([key, options]) => (
                                <TextField 
                                    select 
                                    key={key}
                                    label={key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                                    name={key}
                                    value={anamneseData.sono_comportamento[key] || ''}
                                    onChange={(e) => handleJsonChange('sono_comportamento', key, e.target.value)}
                                    size="small"
                                    sx={{ minWidth: 170, flex: '1 1 170px' }}
                                >
                                    {options.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                                </TextField>
                            ))}
                        </Box>
                         <TextField 
                            label="Observações Sono/Comportamento" 
                            name="sono_comportamento_obs" 
                            multiline rows={2} 
                            fullWidth 
                            size="small" 
                            value={anamneseData.sono_comportamento_obs || ''} 
                            onChange={handleChange} 
                            sx={{ mt: 2 }}
                        />
                    </AccordionDetails>
                </Accordion>

                {/* Accordion 5 (Vacinação/DNPM) foi REMOVIDO */}

            </Box>

            {/* Botões de Ação (Sem alteração) */}
            <Box sx={{ textAlign: 'right', mt: 3, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button onClick={handleLimparHistorico} variant="outlined" color="secondary" disabled={isSubmitting}>
                    Limpar Histórico
                </Button>
                <Button onClick={handleSaveAnamnese} variant="contained" color="primary" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Histórico'}
                </Button>
            </Box>
        </Paper>
    );
}