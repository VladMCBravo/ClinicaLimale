// src/components/prontuario/pediatria/HistoricoPediatrico.jsx
// VERSÃO ATUALIZADA (Tudo ComboBox + Remoção do Painel 5)

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider, RadioGroup, Radio,
    FormControl, InputLabel, Select, MenuItem, Box, Button, CircularProgress,
    Accordion, AccordionSummary, AccordionDetails, FormLabel 
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; 
import { useSnackbar } from '../../../contexts/SnackbarContext';
import apiClient from '../../../api/axiosConfig';

// --- 1. NOVAS OPÇÕES PARA O PAINEL 1 ---
const tipoPartoOptions = ['Vaginal', 'Fórceps', 'Cesárea'];
const igOptions = ['Pré-termo (<37s)', 'Termo (37-41s)', 'Pós-termo (>42s)'];
const pesoNascerOptions = ['Baixo peso (<2500g)', 'Peso adequado (2500-3999g)', 'Macrossômico (>=4000g)'];
const apgarOptions = ['10/10/10', '9/10/10', '8/9/10', '<8 (descrever)'];

// --- OPÇÕES (Convertidas para Select) ---
const alimentacao06Options = {
    tipo_aleitamento: [{value: 'AME', label: 'AME'}, {value: 'Misto', label: 'Misto'}, {value: 'Formula', label: 'Fórmula'}],
    pega: [{value: 'Boa', label: 'Boa'}, {value: 'Parcial', label: 'Parcial'}, {value: 'Ruim', label: 'Ruim'}],
    succao: [{value: 'Eficaz', label: 'Eficaz'}, {value: 'Fraca', label: 'Fraca'}, {value: 'Ausente', label: 'Ausente'}],
    diurese: [{value: 'Adequada', label: 'Adequada'}, {value: 'Reduzida', label: 'Reduzida'}],
    evacuacao: [{value: 'Normal', label: 'Normal'}, {value: 'Ressecada', label: 'Ressecada'}, {value: 'Diarreica', label: 'Diarreica'}],
    suplementacao: [{id: 'vitamina_d', label: 'Vit D'}, {id: 'ferro', label: 'Ferro'}], // Este deixaremos Checkbox, pois pode ser ambos
};
const alimentacao612Options = {
    tipo_alimentacao: [{value: 'Mantem AM', label: 'Mantém AM'}, {value: 'Formula', label: 'Fórmula'}, {value: 'Ambos', label: 'Ambos'}],
    refeicoes_dia: [{value: '2', label: '2'}, {value: '3', label: '3'}, {value: '>3', label: '>3'}],
    textura: [{value: 'Amassada', label: 'Amassada'}, {value: 'Picada', label: 'Picada'}, {value: 'Pedaços', label: 'Pedaços'}],
    aceitacao: [{value: 'Boa', label: 'Boa'}, {value: 'Parcial', label: 'Parcial'}, {value: 'Ruim', label: 'Ruim'}],
    agua: [{value: 'Adequada', label: 'Adequada'}, {value: 'Baixa', label: 'Baixa'}],
    suplementacao: [{id: 'vitamina_d', label: 'Vit D'}, {id: 'ferro', label: 'Ferro'}], // Este deixaremos Checkbox
    aceitacao_geral: [{value: 'Adequada', label: 'Adequada'}, {value: 'Seletiva', label: 'Seletiva'}, {value: 'Dificuldade Textura', label: 'Dificuldade Textura'}],
};
const metodoIAOptions = ['Tradicional', 'BLW', 'BLISS', 'Misto'];
const copoTransicaoOptions = ['Copo 360', 'Canudo Curto', 'Bico Rígido', 'Aberto Pequeno', 'Não usa / Mamadeira'];

const sonoComportamentoOptions = {
    sono_diurno: [{value: 'Adequado', label: 'Adequado'}, {value: 'Alterado', label: 'Alterado'}],
    sono_noturno: [{value: 'Adequado', label: 'Adequado'}, {value: 'Alterado', label: 'Alterado'}],
    colica: [{value: 'Adequado', label: 'Adequado'}, {value: 'Alterado', label: 'Alterado'}],
    choro: [{value: 'Adequado', label: 'Adequado'}, {value: 'Alterado', label: 'Alterado'}],
    vinculo: [{value: 'Adequado', label: 'Adequado'}, {value: 'Alterado', label: 'Alterado'}],
};
const triagensOptions = [
    { id: 'pezinho', label: 'Pezinho' }, { id: 'orelhinha', label: 'Orelhinha' },
    { id: 'olhinho', label: 'Olhinho' }, { id: 'coracaozinho', label: 'Coraçãozinho' },
    { id: 'linguinha', label: 'Linguinha' },
];

// --- 2. ESTADO INICIAL ATUALIZADO (removido vacinacao/dnpm) ---
const initialState = {
    tipo_parto: '', idade_gestacional: '', peso_nascimento: '', apgar: '', intercorrencias_gestacao_parto: '',
    triagens: {},
    alimentacao_0_6m: {}, alimentacao_6_12m: {}, sono_comportamento: {},
    alimentacao_0_6m_obs: '', metodo_ia: '', copo_transicao: '', alimentacao_6_12m_obs: '', sono_comportamento_obs: '',
};

export default function HistoricoPediatrico({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    const [expanded, setExpanded] = useState('panel1');
    const handleAccordionChange = (panel) => (event, isExpanded) => {
        setExpanded(isExpanded ? panel : false);
    };

    const [anamneseData, setAnamneseData] = useState(initialState);

    // FUNÇÃO DE CARREGAMENTO (Atualizada)
    const fetchAnamnese = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            if (res.data && res.data.pediatrica) {
                setAnamneseData({
                    ...(res.data.pediatrica || {}),
                    // Garante que os objetos JSON existam
                    alimentacao_0_6m: res.data.pediatrica.alimentacao_0_6m || {},
                    alimentacao_6_12m: res.data.pediatrica.alimentacao_6_12m || {},
                    sono_comportamento: res.data.pediatrica.sono_comportamento || {},
                    triagens: res.data.pediatrica.triagens || {},
                });
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
    }, [pacienteId]); 

    useEffect(() => {
        fetchAnamnese();
    }, [fetchAnamnese]);

    // --- 3. HANDLERS ATUALIZADOS ---
    const handleChange = (e) => {
        setAnamneseData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Handler universal para ComboBoxes dentro de campos JSON (ex: alimentacao_0_6m.tipo_aleitamento)
    const handleJsonChange = (jsonField, key, value) => {
        setAnamneseData(prev => ({
            ...prev,
            [jsonField]: { ...(prev[jsonField] || {}), [key]: value }
        }));
    };
    
    // Handler para Checkboxes dentro de campos JSON (ex: alimentacao_0_6m.ferro)
    const handleJsonCheckboxChange = (jsonField, key, checked) => {
         setAnamneseData(prev => ({
            ...prev,
            [jsonField]: { ...(prev[jsonField] || {}), [key]: checked }
        }));
    };
    
    // Handler para Checkboxes no nível raiz (ex: triagens)
    const handleTriagensChange = (event) => {
        handleJsonCheckboxChange('triagens', event.target.name, event.target.checked);
    };
    // --- FIM DOS HANDLERS ---

    // --- 4. HANDLERS DE NORMALIDADE ATUALIZADOS ---
    const handleNormalidadeGestacional = () => {
        setAnamneseData(prev => ({
            ...prev,
            tipo_parto: 'Vaginal',
            idade_gestacional: 'Termo (37-41s)',
            peso_nascimento: 'Peso adequado (2500-3999g)',
            apgar: '9/10/10',
            triagens: { pezinho: true, orelhinha: true, olhinho: true, coracaozinho: true, linguinha: true },
        }));
        showSnackbar('Dados gestacionais e triagens preenchidos.', 'info');
    };

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
                colica: 'Adequado',
                choro: 'Adequado',
                vinculo: 'Adequado'
            },
        }));
        showSnackbar('Sono/Comportamento preenchidos como "Adequado".', 'info');
    };

    // Função 'handleNormalidadeVacinacao' removida

    const handleLimparHistorico = () => {
        setAnamneseData(initialState);
        showSnackbar('Campos do histórico limpos.', 'info');
    };
    // --- FIM HANDLERS DE NORMALIDADE ---

    // Função de Salvar (Sem alterações)
    const handleSaveAnamnese = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
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

    // --- 5. JSX ATUALIZADO (ComboBoxes e Painel 5 removido) ---
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
                        <Grid container spacing={2}>
                            {/* LINHA 1 */}
                            <Grid item xs={12} sm={6}>
                                <TextField select label="Tipo do Parto" name="tipo_parto" value={anamneseData.tipo_parto || ''} onChange={handleChange} fullWidth size="small"> 
                                    {tipoPartoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)} 
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField select label="Idade Gestacional" name="idade_gestacional" value={anamneseData.idade_gestacional || ''} onChange={handleChange} fullWidth size="small"> 
                                    {igOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)} 
                                </TextField>
                            </Grid>
                            {/* LINHA 2 */}
                             <Grid item xs={12} sm={6}>
                                <TextField select label="Peso ao nascer" name="peso_nascimento" value={anamneseData.peso_nascimento || ''} onChange={handleChange} fullWidth size="small"> 
                                    {pesoNascerOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)} 
                                </TextField>
                            </Grid>
                             <Grid item xs={12} sm={6}>
                                <TextField select label="APGAR (1'/5'/10')" name="apgar" value={anamneseData.apgar || ''} onChange={handleChange} fullWidth size="small"> 
                                    {apgarOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)} 
                                </TextField>
                            </Grid>
                            {/* LINHA 3 */}
                            <Grid item xs={12}>
                                <TextField label="Intercorrências na gestação ou parto" name="intercorrencias_gestacao_parto" value={anamneseData.intercorrencias_gestacao_parto || ''} onChange={handleChange} multiline rows={2} fullWidth size="small" />
                            </Grid>
                            {/* LINHA 4 */}
                            <Grid item xs={12}>
                                <FormControl component="fieldset" size="small" sx={{mt: 1}}>
                                    <FormLabel component="legend" sx={{fontSize: '0.9rem', fontWeight: 'medium'}}>Triagens Neonatais Realizadas</FormLabel>
                                    <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                                        {triagensOptions.map(opt => (
                                            <FormControlLabel
                                                key={opt.id}
                                                control={<Checkbox size="small" checked={anamneseData.triagens[opt.id] || false} onChange={handleTriagensChange} name={opt.id} />}
                                                label={opt.label}
                                            />
                                        ))}
                                    </FormGroup>
                                </FormControl>
                            </Grid>
                        </Grid>
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
                         <Grid container spacing={2}>
                            {/* Mapeia os ComboBoxes */}
                            {Object.entries(alimentacao06Options).filter(([key]) => key !== 'suplementacao').map(([key, options]) => (
                                <Grid item xs={12} sm={4} key={key}>
                                    <TextField 
                                        select 
                                        label={key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                                        name={key}
                                        value={anamneseData.alimentacao_0_6m[key] || ''}
                                        onChange={(e) => handleJsonChange('alimentacao_0_6m', key, e.target.value)}
                                        fullWidth 
                                        size="small"
                                    >
                                        {options.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                                    </TextField>
                                </Grid>
                            ))}
                             {/* Checkbox de Suplementação */}
                             <Grid item xs={12} sm={4}> 
                                <FormControl component="fieldset" size="small"> 
                                    <FormLabel>Suplementação</FormLabel> 
                                    <FormGroup row> 
                                        {alimentacao06Options.suplementacao.map(o => <FormControlLabel key={o.id} control={<Checkbox size="small" checked={anamneseData.alimentacao_0_6m[o.id] || false} onChange={(e) => handleJsonCheckboxChange('alimentacao_0_6m', o.id, e.target.checked)} name={o.id} />} label={o.label}/>)} 
                                    </FormGroup> 
                                </FormControl> 
                            </Grid>
                         </Grid>
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
                         <Grid container spacing={2}>
                            {/* Mapeia os ComboBoxes */}
                             {Object.entries(alimentacao612Options).filter(([key]) => key !== 'suplementacao').map(([key, options]) => (
                                <Grid item xs={12} sm={4} key={key}>
                                    <TextField 
                                        select 
                                        label={key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                                        name={key}
                                        value={anamneseData.alimentacao_6_12m[key] || ''}
                                        onChange={(e) => handleJsonChange('alimentacao_6_12m', key, e.target.value)}
                                        fullWidth 
                                        size="small"
                                    >
                                        {options.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                                    </TextField>
                                </Grid>
                            ))}
                             {/* Checkbox de Suplementação */}
                            <Grid item xs={12} sm={4}> 
                                <FormControl component="fieldset" size="small"> 
                                    <FormLabel>Suplementação</FormLabel> 
                                    <FormGroup row> 
                                        {alimentacao612Options.suplementacao.map(o => <FormControlLabel key={o.id} control={<Checkbox size="small" checked={anamneseData.alimentacao_6_12m[o.id] || false} onChange={(e) => handleJsonCheckboxChange('alimentacao_6_12m', o.id, e.target.checked)} name={o.id} />} label={o.label}/>)} 
                                    </FormGroup> 
                                </FormControl> 
                            </Grid>
                         </Grid>
                         {/* Linha separada para Método IA e Copo Transição */}
                         <Grid container spacing={2} sx={{ mt: 0 }}> {/* mt: 0 pois já tem o spacing do grid de cima */}
                            <Grid item xs={12} sm={6}> 
                                <TextField select label="Método Introdução Alimentar" name="metodo_ia" value={anamneseData.metodo_ia || ''} onChange={handleChange} fullWidth size="small"> 
                                    {metodoIAOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)} 
                                </TextField> 
                            </Grid>
                            <Grid item xs={12} sm={6}> 
                                <TextField select label="Copo de Transição" name="copo_transicao" value={anamneseData.copo_transicao || ''} onChange={handleChange} fullWidth size="small"> 
                                    {copoTransicaoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)} 
                                </TextField> 
                            </Grid>
                         </Grid>
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
                        <Grid container spacing={2}>
                            {Object.entries(sonoComportamentoOptions).map(([key, options]) => (
                                <Grid item xs={12} sm={6} md={4} key={key}>
                                     <TextField 
                                        select 
                                        label={key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                                        name={key}
                                        value={anamneseData.sono_comportamento[key] || ''}
                                        onChange={(e) => handleJsonChange('sono_comportamento', key, e.target.value)}
                                        fullWidth 
                                        size="small"
                                    >
                                        {options.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                                    </TextField>
                                </Grid>
                            ))}
                        </Grid>
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