// src/components/prontuario/pediatria/HistoricoPediatrico.jsx
// VERSÃO ATUALIZADA COM SEÇÕES DETALHADAS

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider, RadioGroup, Radio,
    FormControl, InputLabel, Select, MenuItem, Box, Button, CircularProgress,
    Accordion, AccordionSummary, AccordionDetails, FormLabel // 1. IMPORTAR ACCORDION
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; // Ícone para Accordion
import { useSnackbar } from '../../../contexts/SnackbarContext';
import apiClient from '../../../api/axiosConfig';

// --- NOVAS OPÇÕES PARA ALIMENTAÇÃO E SONO ---
const alimentacao06Options = {
    tipo_aleitamento: [{value: 'AME', label: 'AME'}, {value: 'Misto', label: 'Misto'}, {value: 'Formula', label: 'Fórmula'}],
    pega: [{value: 'Boa', label: 'Boa'}, {value: 'Parcial', label: 'Parcial'}, {value: 'Ruim', label: 'Ruim'}],
    succao: [{value: 'Eficaz', label: 'Eficaz'}, {value: 'Fraca', label: 'Fraca'}, {value: 'Ausente', label: 'Ausente'}],
    diurese: [{value: 'Adequada', label: 'Adequada'}, {value: 'Reduzida', label: 'Reduzida'}],
    evacuacao: [{value: 'Normal', label: 'Normal'}, {value: 'Ressecada', label: 'Ressecada'}, {value: 'Diarreica', label: 'Diarreica'}],
    suplementacao: [{id: 'vitamina_d', label: 'Vit D'}, {id: 'ferro', label: 'Ferro'}], // Checkboxes
};
const alimentacao612Options = {
    tipo_alimentacao: [{value: 'Mantem AM', label: 'Mantém AM'}, {value: 'Formula', label: 'Fórmula'}, {value: 'Ambos', label: 'Ambos'}],
    refeicoes_dia: [{value: '2', label: '2'}, {value: '3', label: '3'}, {value: '>3', label: '>3'}],
    textura: [{value: 'Amassada', label: 'Amassada'}, {value: 'Picada', label: 'Picada'}, {value: 'Pedaços', label: 'Pedaços'}],
    aceitacao: [{value: 'Boa', label: 'Boa'}, {value: 'Parcial', label: 'Parcial'}, {value: 'Ruim', label: 'Ruim'}],
    agua: [{value: 'Adequada', label: 'Adequada'}, {value: 'Baixa', label: 'Baixa'}],
    suplementacao: [{id: 'vitamina_d', label: 'Vit D'}, {id: 'ferro', label: 'Ferro'}], // Checkboxes
    aceitacao_geral: [{value: 'Adequada', label: 'Adequada'}, {value: 'Seletiva', label: 'Seletiva'}, {value: 'Dificuldade Textura', label: 'Dificuldade Textura'}],
};
const metodoIAOptions = ['Tradicional', 'BLW', 'BLISS', 'Misto'];
const copoTransicaoOptions = ['Copo 360', 'Canudo Curto', 'Bico Rígido', 'Aberto Pequeno', 'Não usa / Mamadeira'];
const sonoComportamentoOptions = {
    sono_diurno: [{value: 'Adequado', label: 'Adequado'}, {value: 'Alterado', label: 'Alterado'}],
    sono_noturno: [{value: 'Adequado', label: 'Adequado'}, {value: 'Alterado', label: 'Alterado'}],
    colica: [{value: 'Adequado', label: 'Adequado'}, {value: 'Alterado', label: 'Alterado'}], // Ou Sim/Não? PDF não claro
    choro: [{value: 'Adequado', label: 'Adequado'}, {value: 'Alterado', label: 'Alterado'}],
    vinculo: [{value: 'Adequado', label: 'Adequado'}, {value: 'Alterado', label: 'Alterado'}],
};
// --- OPÇÕES PARA TRIAGENS ---
const triagensOptions = [
    { id: 'pezinho', label: 'Pezinho' }, { id: 'orelhinha', label: 'Orelhinha' },
    { id: 'olhinho', label: 'Olhinho' }, { id: 'coracaozinho', label: 'Coraçãozinho' },
    { id: 'linguinha', label: 'Linguinha' },
];
// 4. ADICIONE A DEFINIÇÃO FALTANTE AQUI
const dnpmOptions = [
    { id: 'dnpm_normal_idade', label: 'DNPM adequado para idade' },
    { id: 'dnpm_sinais_alerta', label: 'Sinais de Alerta' },
    { id: 'dnpm_atraso', label: 'Atraso no DNPM' },
    // (Você pode adicionar outros marcos principais se quiser, como:)
    // { id: 'dnpm_sentou', label: 'Sentou s/ apoio (~7m)' },
    // { id: 'dnpm_andou', label: 'Andou sozinho (~12m)' },
];
// --- FIM NOVAS OPÇÕES ---

export default function HistoricoPediatrico({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    // Estado principal agora reflete a nova estrutura do modelo
    const [anamneseData, setAnamneseData] = useState({
        // Campos existentes
        tipo_parto: '', idade_gestacional: '', peso_nascimento: '', apgar: '', intercorrencias_gestacao_parto: '',
        vacinacao: '', vacinacao_obs: '', dnpm: {}, triagens: {},
        // Novos campos JSON (inicializados como objetos vazios)
        alimentacao_0_6m: {}, alimentacao_6_12m: {}, sono_comportamento: {},
        // Novos campos string/text
        alimentacao_0_6m_obs: '', metodo_ia: '', copo_transicao: '', alimentacao_6_12m_obs: '', sono_comportamento_obs: '',
    });

    // 2. FUNÇÃO DE CARREGAMENTO ATUALIZADA
    const fetchAnamnese = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            if (res.data && res.data.pediatrica) {
                // Preenche o estado com os dados do backend, garantindo objetos vazios para JSONFields nulos
                setAnamneseData({
                    ...(res.data.pediatrica || {}), // Pega todos os campos retornados
                    dnpm: res.data.pediatrica.dnpm || {}, // Garante que dnpm seja um objeto
                    alimentacao_0_6m: res.data.pediatrica.alimentacao_0_6m || {},
                    alimentacao_6_12m: res.data.pediatrica.alimentacao_6_12m || {},
                    sono_comportamento: res.data.pediatrica.sono_comportamento || {},
                    triagens: res.data.pediatrica.triagens || {}, // 2. Carregar triagens
                });
            } else {
                 setAnamneseData({ // Reset inclui triagens
                    tipo_parto: '', idade_gestacional: '', peso_nascimento: '', apgar: '', intercorrencias_gestacao_parto: '',
                    vacinacao: '', vacinacao_obs: '', dnpm: {}, triagens: {}, // Reset triagens
                    alimentacao_0_6m: {}, alimentacao_6_12m: {}, sono_comportamento: {},
                    alimentacao_0_6m_obs: '', metodo_ia: '', copo_transicao: '', alimentacao_6_12m_obs: '', sono_comportamento_obs: '',
                });
            }
        } catch (err) {
            if (err.response && err.response.status !== 404) {
                showSnackbar('Erro ao carregar histórico de anamnese.', 'error');
            }
            // Se for 404, apenas deixamos os campos vazios (normal)
        } finally {
            setIsLoading(false);
        }
    }, [pacienteId, showSnackbar]);

    useEffect(() => {
        fetchAnamnese();
    }, [fetchAnamnese]);

    // 3. HANDLERS ATUALIZADOS
    // Handler genérico para campos string/number diretos
    const handleChange = (e) => {
        setAnamneseData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    // Handler para RadioGroups dentro dos JSONFields
    const handleJsonRadioChange = (jsonField, key, value) => {
        setAnamneseData(prev => ({
            ...prev,
            [jsonField]: { ...(prev[jsonField] || {}), [key]: value }
        }));
    };
    // Handler para Checkboxes dentro dos JSONFields
    const handleJsonCheckboxChange = (jsonField, key, checked) => {
         setAnamneseData(prev => ({
            ...prev,
            [jsonField]: { ...(prev[jsonField] || {}), [key]: checked }
        }));
    };
     // Handler para checkboxes do DNPM (resumo)
    const handleDnpmChange = (event) => {
        const { name, checked } = event.target;
        setAnamneseData(prev => ({ ...prev, dnpm: { ...prev.dnpm, [name]: checked } }));
    };
    const handleTriagensChange = (event) => {
        handleJsonCheckboxChange('triagens', event.target.name, event.target.checked);
    };


    // Função de Salvar (Payload agora inclui 'triagens')
    const handleSaveAnamnese = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            // O payload é o estado completo, que já inclui 'triagens' atualizado
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                pediatrica: anamneseData
            });
            showSnackbar('Histórico pediátrico salvo com sucesso!', 'success');
        } catch (error) { /* ... */ }
        finally { setIsSubmitting(false); }
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // 5. JSX ATUALIZADO COM ACCORDIONS
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Histórico Pediátrico (Anamnese)
            </Typography>

            {/* Usaremos Accordions para organizar as seções */}
            <Box sx={{ mt: 2 }}>
                {/* Accordion: Gestacional/Nascimento ATUALIZADO */}
                <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontWeight: 'medium' }}>Histórico Gestacional, Nascimento e Triagens</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* ... (Campos tipo_parto, idade_gestacional, peso_nascimento - sem alterações) ... */}
                            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                                 <TextField label="Peso ao nascer (g)" name="peso_nascimento" type="number" value={anamneseData.peso_nascimento || ''} onChange={handleChange} fullWidth size="small"/>
                                 {/* 4. Campo APGAR com Placeholder atualizado */}
                                 <TextField
                                     label="APGAR (1'/5'/10')"
                                     name="apgar"
                                     value={anamneseData.apgar || ''}
                                     onChange={handleChange}
                                     fullWidth
                                     size="small"
                                     placeholder="Ex: 8/9/10" // Guia para o formato
                                 />
                            </Box>
                            <TextField label="Intercorrências na gestação ou parto" name="intercorrencias_gestacao_parto" value={anamneseData.intercorrencias_gestacao_parto || ''} onChange={handleChange} multiline rows={2} fullWidth size="small" />

                             {/* 5. NOVA SEÇÃO DE TRIAGENS */}
                            <FormControl component="fieldset" size="small" sx={{mt: 1}}>
                                <FormLabel component="legend" sx={{fontSize: '0.9rem', fontWeight: 'medium'}}>Triagens Neonatais Realizadas</FormLabel>
                                <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                                    {triagensOptions.map(opt => (
                                        <FormControlLabel
                                            key={opt.id}
                                            control={<Checkbox
                                                size="small"
                                                checked={anamneseData.triagens[opt.id] || false}
                                                onChange={handleTriagensChange} // Usa o handler específico
                                                name={opt.id}
                                            />}
                                            label={opt.label}
                                        />
                                    ))}
                                </FormGroup>
                            </FormControl>
                        </Box>
                    </AccordionDetails>
                </Accordion>

                {/* Accordion: Alimentação 0-6m */}
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontWeight: 'medium' }}>Alimentação (0-6 Meses)</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                         <Grid container spacing={2}>
                            {/* Tipo, Pega, Sucção */}
                            <Grid item xs={12} sm={4}> <FormControl component="fieldset" size="small"> <FormLabel>Tipo</FormLabel> <RadioGroup row name="tipo_aleitamento" value={anamneseData.alimentacao_0_6m.tipo_aleitamento || ''} onChange={(e) => handleJsonRadioChange('alimentacao_0_6m', 'tipo_aleitamento', e.target.value)}> {alimentacao06Options.tipo_aleitamento.map(o => <FormControlLabel key={o.value} value={o.value} control={<Radio size="small"/>} label={o.label}/>)} </RadioGroup> </FormControl> </Grid>
                            <Grid item xs={12} sm={4}> <FormControl component="fieldset" size="small"> <FormLabel>Pega</FormLabel> <RadioGroup row name="pega" value={anamneseData.alimentacao_0_6m.pega || ''} onChange={(e) => handleJsonRadioChange('alimentacao_0_6m', 'pega', e.target.value)}> {alimentacao06Options.pega.map(o => <FormControlLabel key={o.value} value={o.value} control={<Radio size="small"/>} label={o.label}/>)} </RadioGroup> </FormControl> </Grid>
                            <Grid item xs={12} sm={4}> <FormControl component="fieldset" size="small"> <FormLabel>Sucção</FormLabel> <RadioGroup row name="succao" value={anamneseData.alimentacao_0_6m.succao || ''} onChange={(e) => handleJsonRadioChange('alimentacao_0_6m', 'succao', e.target.value)}> {alimentacao06Options.succao.map(o => <FormControlLabel key={o.value} value={o.value} control={<Radio size="small"/>} label={o.label}/>)} </RadioGroup> </FormControl> </Grid>
                             {/* Diurese, Evacuação */}
                             <Grid item xs={12} sm={4}> <FormControl component="fieldset" size="small"> <FormLabel>Diurese</FormLabel> <RadioGroup row name="diurese" value={anamneseData.alimentacao_0_6m.diurese || ''} onChange={(e) => handleJsonRadioChange('alimentacao_0_6m', 'diurese', e.target.value)}> {alimentacao06Options.diurese.map(o => <FormControlLabel key={o.value} value={o.value} control={<Radio size="small"/>} label={o.label}/>)} </RadioGroup> </FormControl> </Grid>
                             <Grid item xs={12} sm={4}> <FormControl component="fieldset" size="small"> <FormLabel>Evacuação</FormLabel> <RadioGroup row name="evacuacao" value={anamneseData.alimentacao_0_6m.evacuacao || ''} onChange={(e) => handleJsonRadioChange('alimentacao_0_6m', 'evacuacao', e.target.value)}> {alimentacao06Options.evacuacao.map(o => <FormControlLabel key={o.value} value={o.value} control={<Radio size="small"/>} label={o.label}/>)} </RadioGroup> </FormControl> </Grid>
                             {/* Suplementação */}
                             <Grid item xs={12} sm={4}> <FormControl component="fieldset" size="small"> <FormLabel>Suplementação</FormLabel> <FormGroup row> {alimentacao06Options.suplementacao.map(o => <FormControlLabel key={o.id} control={<Checkbox size="small" checked={anamneseData.alimentacao_0_6m[o.id] || false} onChange={(e) => handleJsonCheckboxChange('alimentacao_0_6m', o.id, e.target.checked)} name={o.id} />} label={o.label}/>)} </FormGroup> </FormControl> </Grid>
                             {/* Observações */}
                              <Grid item xs={12}> <TextField label="Observações Alimentação 0-6m" name="alimentacao_0_6m_obs" multiline rows={2} fullWidth size="small" value={anamneseData.alimentacao_0_6m_obs || ''} onChange={handleChange} /> </Grid>
                         </Grid>
                    </AccordionDetails>
                </Accordion>

                {/* Accordion: Alimentação 6-12m */}
                 <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontWeight: 'medium' }}>Alimentação (6-12+ Meses)</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                         <Grid container spacing={2}>
                             {/* Tipo, Refeições, Textura, Aceitação, Água */}
                             <Grid item xs={12} sm={4}> <FormControl component="fieldset" size="small"> <FormLabel>Tipo</FormLabel> <RadioGroup row name="tipo_alimentacao" value={anamneseData.alimentacao_6_12m.tipo_alimentacao || ''} onChange={(e) => handleJsonRadioChange('alimentacao_6_12m', 'tipo_alimentacao', e.target.value)}> {alimentacao612Options.tipo_alimentacao.map(o => <FormControlLabel key={o.value} value={o.value} control={<Radio size="small"/>} label={o.label}/>)} </RadioGroup> </FormControl> </Grid>
                             {/* ... Adicionar RadioGroups para refeicoes_dia, textura, aceitacao, agua ... */}

                             {/* Suplementação, Aceitação Geral */}
                              <Grid item xs={12} sm={4}> <FormControl component="fieldset" size="small"> <FormLabel>Suplementação</FormLabel> <FormGroup row> {alimentacao612Options.suplementacao.map(o => <FormControlLabel key={o.id} control={<Checkbox size="small" checked={anamneseData.alimentacao_6_12m[o.id] || false} onChange={(e) => handleJsonCheckboxChange('alimentacao_6_12m', o.id, e.target.checked)} name={o.id} />} label={o.label}/>)} </FormGroup> </FormControl> </Grid>
                              <Grid item xs={12} sm={8}> <FormControl component="fieldset" size="small"> <FormLabel>Aceitação Geral</FormLabel> <RadioGroup row name="aceitacao_geral" value={anamneseData.alimentacao_6_12m.aceitacao_geral || ''} onChange={(e) => handleJsonRadioChange('alimentacao_6_12m', 'aceitacao_geral', e.target.value)}> {alimentacao612Options.aceitacao_geral.map(o => <FormControlLabel key={o.value} value={o.value} control={<Radio size="small"/>} label={o.label}/>)} </RadioGroup> </FormControl> </Grid>

                            {/* Método IA e Copo */}
                             <Grid item xs={12} sm={6}> <TextField select label="Método Introdução Alimentar" name="metodo_ia" value={anamneseData.metodo_ia || ''} onChange={handleChange} fullWidth size="small"> {metodoIAOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)} </TextField> </Grid>
                             <Grid item xs={12} sm={6}> <TextField select label="Copo de Transição" name="copo_transicao" value={anamneseData.copo_transicao || ''} onChange={handleChange} fullWidth size="small"> {copoTransicaoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)} </TextField> </Grid>

                             {/* Observações */}
                              <Grid item xs={12}> <TextField label="Observações Alimentação 6-12m" name="alimentacao_6_12m_obs" multiline rows={2} fullWidth size="small" value={anamneseData.alimentacao_6_12m_obs || ''} onChange={handleChange} /> </Grid>
                         </Grid>
                    </AccordionDetails>
                </Accordion>

                {/* Accordion: Sono/Comportamento */}
                 <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontWeight: 'medium' }}>Sono / Cólicas / Comportamento</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                            {/* Sono Diurno, Noturno, Cólica, Choro, Vínculo */}
                            {Object.entries(sonoComportamentoOptions).map(([key, options]) => (
                                <Grid item xs={12} sm={6} md={4} key={key}>
                                    <FormControl component="fieldset" size="small">
                                        <FormLabel sx={{textTransform: 'capitalize'}}>{key.replace('_', ' ')}</FormLabel>
                                        <RadioGroup row name={key} value={anamneseData.sono_comportamento[key] || ''} onChange={(e) => handleJsonRadioChange('sono_comportamento', key, e.target.value)}>
                                            {options.map(o => <FormControlLabel key={o.value} value={o.value} control={<Radio size="small"/>} label={o.label}/>)}
                                        </RadioGroup>
                                    </FormControl>
                                </Grid>
                            ))}
                             {/* Observações */}
                              <Grid item xs={12}> <TextField label="Observações Sono/Comportamento" name="sono_comportamento_obs" multiline rows={2} fullWidth size="small" value={anamneseData.sono_comportamento_obs || ''} onChange={handleChange} /> </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>

                {/* Accordion: Vacinação e DNPM (Resumos) */}
                <Accordion>
                     <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontWeight: 'medium' }}>Vacinação e DNPM (Resumos)</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                             <Grid item xs={12} sm={6}>
                                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Vacinação (Resumo)</Typography>
                                <RadioGroup row name="vacinacao" value={anamneseData.vacinacao || ''} onChange={handleChange}>
                                    <FormControlLabel value="Em dia" control={<Radio size="small" />} label="Em dia" />
                                    <FormControlLabel value="Atrasada" control={<Radio size="small" />} label="Atrasada" />
                                </RadioGroup>
                                <TextField label="Observações sobre vacinação" name="vacinacao_obs" value={anamneseData.vacinacao_obs || ''} onChange={handleChange} fullWidth size="small" sx={{mt: 1}}/>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>DNPM (Resumo)</Typography>
                                <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                                    {dnpmOptions.map(opt => (
                                        <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={anamneseData.dnpm[opt.id] || false} onChange={handleDnpmChange} name={opt.id} />} label={opt.label} />
                                    ))}
                                </FormGroup>
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>

            </Box>

            {/* Botão Salvar */}
            <Box sx={{ textAlign: 'right', mt: 3 }}>
                <Button onClick={handleSaveAnamnese} variant="contained" color="primary" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Histórico'}
                </Button>
            </Box>
        </Paper>
    );
}