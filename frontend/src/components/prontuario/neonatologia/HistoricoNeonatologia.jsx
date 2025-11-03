// src/components/prontuario/neonatologia/HistoricoNeonatologia.jsx
// VERSÃO FINAL (Implementa lógica dos vídeos e corrige bugs)

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, TextField, Box, Button, CircularProgress, Grid, Divider,
    FormGroup, FormControlLabel, Checkbox, FormControl, InputLabel, Select, MenuItem, FormLabel,
    Tooltip, IconButton
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import apiClient from '../../../api/axiosConfig';

// --- Opções para ComboBoxes ---
const preNatalOptions = ['Adequado', 'Inadequado', 'Sem PN', 'Ignorado'];
const gestacaoTipoOptions = ['Única', 'Gemelar', 'Trigemelar'];
const simNaoOptions = ['Sim', 'Não'];
const simNaoNaoSeAplicaOptions = ['Sim', 'Não', 'Não se aplica']; //
const simNaoIgnoradoOptions = ['Sim', 'Não', 'Ignorado'];
const partoTipoOptions = ['Normal', 'Cesárea', 'Fórceps', 'Vácuo-extrator'];
const bolsaRotaOptions = ['Integra', 'Rota <18h', 'Rota ≥18h'];
const liquidoAmnioticoOptions = ['Claro', 'Meconial', 'Fisiometria alterada'];
const apgarScoreOptions = Array.from({ length: 11 }, (_, i) => i); // Gera [0, 1, ... 10]
const igClassOptions = ['RNPTE (<28s)', 'RNPT Moderado (28-33+6s)', 'RNPT Tardio (34-36+6s)', 'A termo (37-41+6s)', 'Pós-termo (≥42s)'];
const pesoClassOptions = ['BP <2500g', 'MBP <1500g', 'EBP <1000g', 'EBPext <750g'];
const pesoAdequacaoOptions = ['PIG', 'AIG', 'GIG'];
const sorologiaStatusOptions = ['Não reagente', 'Reagente', 'Imune', 'Suscetível'];
const comorbidadesOptions = [
    { id: 'DMG', label: 'DMG' }, { id: 'DHEG_HAC', label: 'DHEG/HAC' }, { id: 'Hipotireoidismo', label: 'Hipotireoidismo' },
    { id: 'Obesidade', label: 'Obesidade' }, { id: 'TB', label: 'TB' }, { id: 'Asma', label: 'Asma' }, { id: 'Depressao', label: 'Depressão' },
    { id: 'Cardiopatias', label: 'Cardiopatias' }, { id: 'Outras', label: 'Outras' }
];
const viciosOptions = [
    { id: 'Alcool', label: 'Álcool' }, { id: 'Tabaco', label: 'Tabaco' }, { id: 'Drogas', label: 'Drogas' }, { id: 'Outros', label: 'Outros' }
];
const reanimacaoOptions = [
    { id: 'O2', label: 'O2 Inalatório' }, //
    { id: 'VPP', label: 'VPP' }, { id: 'Intubacao', label: 'Intubação' },
    { id: 'Massagem', label: 'Massagem' }, { id: 'Adrenalina', label: 'Adrenalina' },
];
const examesHospOptions = [ //
    { id: 'us_tf', label: 'US Transfontanelar' }, { id: 'eco', label: 'Ecocardiograma' },
    { id: 'fundo_olho', label: 'Fundo de olho' },
];
const triagensOptions = [
    { id: 'pezinho', label: 'Pezinho' }, { id: 'orelhinha', label: 'Orelhinha' },
    { id: 'olhinho', label: 'Olhinho' }, { id: 'coracaozinho', label: 'Coraçãozinho' },
    { id: 'linguinha', label: 'Linguinha' },
];

const initialState = {
    gpa_g: '', gpa_p: '', gpa_a: '',
    pre_natal: '', tipo_gestacao: '', corticoterapia: '', neuroprotecao_mg: '',
    condicoes_maternas: '', comorbidades_detalhes: {}, intercorrencias_gestacao: '',
    vicios: '', vicios_detalhes: {},
    tipo_sanguineo_mae: '', coombs_indireto: '', tipo_sanguineo_rn: '', coombs_direto_rn: '',
    sorologias: { // Estado inicial para sorologias
        sifilis_status: 'Não reagente', sifilis_titulo: '', sifilis_parceiro: '',
        toxo_status: 'Não reagente', toxo_igm: '', toxo_igg: '',
        hiv_status: 'Não reagente', hiv_cv: '',
        hep_b_status: 'Não reagente', hep_b_conduta: '',
        outras_inf_status: 'Não reagente',
    },
    tipo_parto: '', bolsa_rota: '', profilaxia_bolsa: '', liquido_amniotico: '',
    apgar_1: '', apgar_5: '', apgar_10: '',
    peso_nascimento: '', comprimento: '', pc_nascimento: '',
    reanimacao_status: 'Não', reanimacao_opcoes: {}, reanimacao_obs: '',
    ig_semanas: '', ig_dias: '', peso_adequacao: '',
    tempo_internacao: '',
    suporte_ventilatorio: 'Não aplicável', suporte_vm_d: '', suporte_cpap_d: '', suporte_o2_d: '',
    fototerapia: 'Não', fototerapia_d: '',
    npp: 'Não', npp_d: '',
    antibioticos: 'Não', antibioticos_d: '', antibioticos_esquema: '',
    diagnosticos_principais: '',
    exames_realizados: {},
    outros_exames: [], //
    triagens: {},
};

export default function HistoricoNeonatologia({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [anamneseData, setAnamneseData] = useState(initialState);
    
    // Estados separados para os JSONFields (Checkboxes)
    const [comorbidades, setComorbidades] = useState({});
    const [vicios, setVicios] = useState({});
    const [reanimacao, setReanimacao] = useState({});
    const [examesHosp, setExamesHosp] = useState({});
    const [triagens, setTriagens] = useState({});
    const [outrosExames, setOutrosExames] = useState([]);

    // Função de Fetch (Corrigida para o loop e para setar os estados dos checkboxes)
    const fetchAnamnese = useCallback(async () => {
        if (!pacienteId) return;
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            if (res.data && res.data.neonatologia) {
                const data = res.data.neonatologia;
                setAnamneseData(data);
                // Seta os estados dos checkboxes/JSONs
                setComorbidades(data.comorbidades_detalhes || {});
                setVicios(data.vicios_detalhes || {});
                setReanimacao(data.reanimacao_opcoes || {});
                setExamesHosp(data.exames_realizados || {});
                setOutrosExames(data.outros_exames || []);
                setTriagens(data.triagens || {});
            } else {
                setAnamneseData(initialState);
                setComorbidades({});
                setVicios({});
                setReanimacao({});
                setExamesHosp({});
                setOutrosExames([]);
                setTriagens({});
            }
        } catch (err) {
            if (err.response && err.response.status !== 404) {
                showSnackbar('Erro ao carregar histórico neonatal.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    }, [pacienteId]); // Removido 'showSnackbar' para parar o loop

    useEffect(() => {
        fetchAnamnese();
    }, [fetchAnamnese]);

    // Handlers
    const handleChange = (e) => {
        const { name, value } = e.target;
        setAnamneseData(prev => ({ ...prev, [name]: value }));
    };
    
    // Handler para os checkboxes de JSON
    const handleCheckboxChange = (setter) => (e) => {
        setter(prev => ({ ...prev, [e.target.name]: e.target.checked }));
    };

    // Handler para os campos de Sorologia (que estão aninhados)
    const handleSorologiaChange = (e) => {
        const { name, value } = e.target;
        setAnamneseData(prev => ({
            ...prev,
            sorologias: {
                ...prev.sorologias,
                [name]: value
            }
        }));
    };
    
    // Botão "Normal" das Sorologias
    const handleNormalidadeSorologias = () => {
        setAnamneseData(prev => ({
            ...prev,
            sorologias: {
                ...prev.sorologias, // Mantém outros campos como titulação, etc.
                sifilis_status: 'Não reagente',
                toxo_status: 'Não reagente',
                hiv_status: 'Não reagente',
                hep_b_status: 'Não reagente',
                outras_inf_status: 'Não reagente',
            }
        }));
        showSnackbar('Sorologias marcadas como "Não reagente".', 'info');
    };

    // Handlers para "Outros Exames"
    const handleOutroExameChange = (index, event) => {
        const { name, value } = event.target;
        const list = [...outrosExames];
        list[index][name] = value;
        setOutrosExames(list);
    };
    const handleAddOutroExame = () => {
        setOutrosExames([...outrosExames, { nome: '', data: '', resultado: '' }]);
    };
    const handleRemoveOutroExame = (index) => {
        const list = [...outrosExames];
        list.splice(index, 1);
        setOutrosExames(list);
    };

    // Salvar
    const handleSaveAnamnese = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);

        const payload = {
            ...anamneseData,
            comorbidades_detalhes: comorbidades,
            vicios_detalhes: vicios,
            reanimacao_opcoes: reanimacao,
            exames_realizados: examesHosp,
            outros_exames: outrosExames,
            triagens: triagens,
        };

        try {
            // Usamos PATCH para salvar (view foi corrigida para get_or_create)
            await apiClient.patch(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                neonatologia: payload
            });
            showSnackbar('Histórico neonatal salvo com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao salvar anamnese neonatal:", error.response?.data);
            showSnackbar('Erro ao salvar histórico.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Normalidade
    const preencherNormalidade = () => {
        setAnamneseData(prev => ({
            ...prev,
            gpa_g: '1', gpa_p: '1', gpa_a: '0',
            pre_natal: 'Adequado',
            tipo_gestacao: 'Única',
            corticoterapia: 'Não',
            neuroprotecao_mg: 'Não se aplica',
            condicoes_maternas: 'Não',
            vicios: 'Não',
            tipo_sanguineo_mae: 'O+',
            coombs_indireto: 'Negativo',
            sorologias: {
                sifilis_status: 'Não reagente', toxo_status: 'Imune', hiv_status: 'Não reagente',
                hep_b_status: 'Não reagente', outras_inf_status: 'Não reagente',
            },
            tipo_parto: 'Normal',
            bolsa_rota: 'Rota <18h',
            profilaxia_bolsa: 'Sim',
            liquido_amniotico: 'Claro',
            apgar_1: 9, apgar_5: 10, apgar_10: 10,
            reanimacao_status: 'Não',
            ig_semanas: '39', ig_dias: '0',
            peso_adequacao: 'AIG',
            tempo_internacao: '2',
            suporte_ventilatorio: 'Não aplicável',
            fototerapia: 'Não',
            npp: 'Não',
            antibioticos: 'Não',
            diagnosticos_principais: 'RN A Termo, AIG, sem intercorrências.',
        }));
        setComorbidades({});
        setVicios({});
        setReanimacao({});
        setExamesHosp({ us_tf: true, eco: true, fundo_olho: true });
        setTriagens({ pezinho: true, orelhinha: true, olhinho: true, coracaozinho: true, linguinha: true });
        setOutrosExames([]);
        showSnackbar('Histórico preenchido com dados normais.', 'info');
    };
    
    // Limpar
    const handleLimpar = () => {
        setAnamneseData(initialState);
        setComorbidades({});
        setVicios({});
        setReanimacao({});
        setExamesHosp({});
        setOutrosExames([]);
        setTriagens({});
        showSnackbar('Campos do histórico limpos.', 'info');
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // --- JSX (Mapeado do PDF com Lógica Condicional) ---
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 0 }}>
                    Histórico Neonatal (Anamnese)
                </Typography>
                <Box>
                    <Button size="small" variant="outlined" onClick={handleLimpar} sx={{mr: 1}}>Limpar</Button>
                    <Button size="small" variant="outlined" onClick={preencherNormalidade}>Preencher Normalidade</Button>
                </Box>
            </Box>

            {/* --- 1. HISTÓRIA PRÉ-NATAL --- */}
            <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>1. História Pré-Natal</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.5, alignItems: 'center' }}>
                <TextField label="Gesta (G)" name="gpa_g" size="small" sx={{minWidth: 80, flex: '1 1 80px'}}
                    value={anamneseData.gpa_g || ''} onChange={handleChange} type="number" />
                <TextField label="Para (P)" name="gpa_p" size="small" sx={{minWidth: 80, flex: '1 1 80px'}}
                    value={anamneseData.gpa_p || ''} onChange={handleChange} type="number" />
                <TextField label="Aborto (A)" name="gpa_a" size="small" sx={{minWidth: 80, flex: '1 1 80px'}}
                    value={anamneseData.gpa_a || ''} onChange={handleChange} type="number" />
                <TextField select label="Pré-Natal" name="pre_natal" value={anamneseData.pre_natal || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {preNatalOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Tipo Gestação" name="tipo_gestacao" value={anamneseData.tipo_gestacao || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {gestacaoTipoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Corticoterapia" name="corticoterapia" value={anamneseData.corticoterapia || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {simNaoNaoSeAplicaOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Neuroproteção MgSO4" name="neuroprotecao_mg" value={anamneseData.neuroprotecao_mg || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {simNaoIgnoradoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
            </Box>
            
            {/* Lógica Condicional: Condições Maternas */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                <TextField select label="Condições Maternas" name="condicoes_maternas" value={anamneseData.condicoes_maternas || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    <MenuItem value="Não">Sem Comorbidades</MenuItem>
                    <MenuItem value="Sim">Com Comorbidades</MenuItem>
                </TextField>
            </Box>
            {anamneseData.condicoes_maternas === 'Sim' && (
                <FormControl component="fieldset" size="small" sx={{mt: 1.5, ml: 1, width: '100%'}}>
                    <FormLabel component="legend" sx={{fontSize: '0.9rem'}}>Comorbidades:</FormLabel>
                    <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                        {comorbidadesOptions.map(opt => (
                            <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={comorbidades[opt.id] || false} onChange={handleCheckboxChange(setComorbidades)} name={opt.id} />} label={opt.label} />
                        ))}
                    </FormGroup>
                </FormControl>
            )}

            {/* Lógica Condicional: Vícios */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                <TextField select label="Vícios" name="vicios" value={anamneseData.vicios || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    <MenuItem value="Não">Não</MenuItem>
                    <MenuItem value="Sim">Sim</MenuItem>
                </TextField>
            </Box>
            {anamneseData.vicios === 'Sim' && (
                 <FormControl component="fieldset" size="small" sx={{mt: 1.5, ml: 1, width: '100%'}}>
                    <FormLabel component="legend" sx={{fontSize: '0.9rem'}}>Vícios:</FormLabel>
                    <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                        {viciosOptions.map(opt => (
                            <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={vicios[opt.id] || false} onChange={handleCheckboxChange(setVicios)} name={opt.id} />} label={opt.label} />
                        ))}
                    </FormGroup>
                </FormControl>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                <TextField label="TS Mãe" name="tipo_sanguineo_mae" size="small" sx={{minWidth: 120, flex: '1 1 120px'}}
                    value={anamneseData.tipo_sanguineo_mae || ''} onChange={handleChange} placeholder="Ex: O+"/>
                <TextField label="Coombs Ind." name="coombs_indireto" size="small" sx={{minWidth: 120, flex: '1 1 120px'}}
                    value={anamneseData.coombs_indireto || ''} onChange={handleChange} placeholder="Neg/Pos"/>
                <TextField label="TS RN" name="tipo_sanguineo_rn" size="small" sx={{minWidth: 120, flex: '1 1 120px'}}
                    value={anamneseData.tipo_sanguineo_rn || ''} onChange={handleChange} placeholder="Ex: A+"/>
                <TextField label="Coombs Dir." name="coombs_direto_rn" size="small" sx={{minWidth: 120, flex: '1 1 120px'}}
                    value={anamneseData.coombs_direto_rn || ''} onChange={handleChange} placeholder="Neg/Pos"/>
            </Box>

            {/* --- 2. SOROLOGIAS MATERNAS --- */}
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>2. Sorologias Maternas</Typography>
                <Button size="small" variant="outlined" onClick={handleNormalidadeSorologias}>Marcar Todas "Não Reagente"</Button>
            </Box>
            
            {/* Sífilis */}
            <Grid container spacing={2} sx={{mt: 0.5}} alignItems="center">
                <Grid item xs={12} sm={4}>
                    <TextField select label="Sífilis" name="sifilis_status" value={anamneseData.sorologias.sifilis_status || ''} onChange={handleSorologiaChange} size="small" fullWidth>
                        {sorologiaStatusOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </TextField>
                </Grid>
                {anamneseData.sorologias.sifilis_status === 'Reagente' && (
                    <>
                    <Grid item xs={6} sm={4}>
                        <TextField label="Titulação VDRL" name="sifilis_titulo" value={anamneseData.sorologias.sifilis_titulo || ''} onChange={handleSorologiaChange} size="small" fullWidth placeholder="Ex: 1:2"/>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <TextField select label="Parceiro Tratado?" name="sifilis_parceiro" value={anamneseData.sorologias.sifilis_parceiro || ''} onChange={handleSorologiaChange} size="small" fullWidth>
                            <MenuItem value="Sim">Sim</MenuItem>
                            <MenuItem value="Não">Não</MenuItem>
                        </TextField>
                    </Grid>
                    </>
                )}
            </Grid>
            
            {/* Toxoplasmose */}
            <Grid container spacing={2} sx={{mt: 0.5}} alignItems="center">
                <Grid item xs={12} sm={4}>
                    <TextField select label="Toxoplasmose" name="toxo_status" value={anamneseData.sorologias.toxo_status || ''} onChange={handleSorologiaChange} size="small" fullWidth>
                        {sorologiaStatusOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </TextField>
                </Grid>
                {anamneseData.sorologias.toxo_status === 'Reagente' && (
                    <>
                    <Grid item xs={6} sm={4}>
                        <TextField label="IgM" name="toxo_igm" value={anamneseData.sorologias.toxo_igm || ''} onChange={handleSorologiaChange} size="small" fullWidth placeholder="Valor ou Pos/Neg"/>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <TextField label="IgG" name="toxo_igg" value={anamneseData.sorologias.toxo_igg || ''} onChange={handleSorologiaChange} size="small" fullWidth placeholder="Valor ou Pos/Neg"/>
                    </Grid>
                    </>
                )}
            </Grid>

            {/* HIV */}
            <Grid container spacing={2} sx={{mt: 2}} alignItems="center">
                <Grid item xs={12} sm={4}>
                    <TextField select label="HIV" name="hiv_status" value={anamneseData.sorologias.hiv_status || ''} onChange={handleSorologiaChange} size="small" fullWidth>
                        {sorologiaStatusOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </TextField>
                </Grid>
                {anamneseData.sorologias.hiv_status === 'Reagente' && (
                    <Grid item xs={12} sm={8}>
                        <TextField label="Carga Viral (cópias/mL)" name="hiv_cv" value={anamneseData.sorologias.hiv_cv || ''} onChange={handleSorologiaChange} size="small" fullWidth />
                    </Grid>
                )}
            </Grid>

            {/* Hepatite B */}
            <Grid container spacing={2} sx={{mt: 2}} alignItems="center">
                <Grid item xs={12} sm={4}>
                    <TextField select label="Hepatite B" name="hep_b_status" value={anamneseData.sorologias.hep_b_status || ''} onChange={handleSorologiaChange} size="small" fullWidth>
                        {sorologiaStatusOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </TextField>
                </Grid>
                {anamneseData.sorologias.hep_b_status === 'Reagente' && (
                    <Grid item xs={12} sm={8}>
                        <TextField label="Conduta Neonatal" name="hep_b_conduta" value={anamneseData.sorologias.hep_b_conduta || ''} onChange={handleSorologiaChange} size="small" fullWidth placeholder="Ex: Recebeu Ig + Vacina em 12h"/>
                    </Grid>
                )}
            </Grid>
            
            {/* Outras */}
            <Grid container spacing={2} sx={{mt: 2}} alignItems="center">
                <Grid item xs={12} sm={4}>
                     <TextField select label="Outras (HCV, CMV, Zika)" name="outras_inf_status" value={anamneseData.sorologias.outras_inf_status || ''} onChange={handleSorologiaChange} size="small" fullWidth>
                        <MenuItem value="Não reagente">Não reagente</MenuItem>
                        <MenuItem value="Reagente">Reagente (Descrever)</MenuItem>
                    </TextField>
                </Grid>
                {anamneseData.sorologias.outras_inf_status === 'Reagente' && (
                     <Grid item xs={12} sm={8}>
                        <TextField label="Descrever Outras Infecções" name="outras_inf_detalhes" value={anamneseData.sorologias.outras_inf_detalhes || ''} onChange={handleSorologiaChange} size="small" fullWidth />
                    </Grid>
                )}
            </Grid>


            {/* --- 3. NASCIMENTO E PARTO --- */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>3. Nascimento e Histórico do Parto</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.5 }}>
                <TextField select label="Tipo de Parto" name="tipo_parto" value={anamneseData.tipo_parto || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {partoTipoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Bolsa Amniótica" name="bolsa_rota" value={anamneseData.bolsa_rota || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {bolsaRotaOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                {anamneseData.bolsa_rota === 'Rota ≥18h' && (
                     <TextField select label="Profilaxia Adequada?" name="profilaxia_bolsa" value={anamneseData.profilaxia_bolsa || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                        {simNaoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </TextField>
                )}
                <TextField select label="Líquido Amniótico" name="liquido_amniotico" value={anamneseData.liquido_amniotico || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {liquidoAmnioticoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                <TextField select label="Apgar 1'" name="apgar_1" value={anamneseData.apgar_1 || ''} onChange={handleChange} size="small" sx={{minWidth: 80, flex: '1 1 80px'}}>
                    {apgarScoreOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Apgar 5'" name="apgar_5" value={anamneseData.apgar_5 || ''} onChange={handleChange} size="small" sx={{minWidth: 80, flex: '1 1 80px'}}>
                    {apgarScoreOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Apgar 10'" name="apgar_10" value={anamneseData.apgar_10 || ''} onChange={handleChange} size="small" sx={{minWidth: 80, flex: '1 1 80px'}}>
                     <MenuItem value="">-</MenuItem>
                    {apgarScoreOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                <TextField label="Peso Nasc. (g)" name="peso_nascimento" type="number" value={anamneseData.peso_nascimento || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}/>
                <TextField label="Compr. (cm)" name="comprimento" type="number" value={anamneseData.comprimento || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}/>
                <TextField label="PC (cm)" name="pc_nascimento" type="number" value={anamneseData.pc_nascimento || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}/>
            </Box>
            
            {/* Lógica Condicional: Reanimação */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                <TextField select label="Reanimação" name="reanimacao_status" value={anamneseData.reanimacao_status || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    <MenuItem value="Não">Não</MenuItem>
                    <MenuItem value="Sim">Sim</MenuItem>
                </TextField>
            </Box>
            {anamneseData.reanimacao_status === 'Sim' && (
                <>
                <FormControl component="fieldset" size="small" sx={{mt: 2, ml: 1, width: '100%'}}>
                    <FormLabel component="legend" sx={{fontSize: '0.9rem', fontWeight: 'medium'}}>Manobras Realizadas:</FormLabel>
                    <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                        {reanimacaoOptions.map(opt => (
                            <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={reanimacao[opt.id] || false} onChange={handleCheckboxChange(setReanimacao)} name={opt.id} />} label={opt.label} />
                        ))}
                    </FormGroup>
                </FormControl>
                <TextField label="Intercorrências do Parto/Reanimação" name="reanimacao_obs" multiline rows={2} fullWidth size="small" sx={{mt: 1.5}}
                    value={anamneseData.reanimacao_obs || ''} onChange={handleChange} placeholder="Observações sobre reanimação, circular de cordão, etc." />
                </>
            )}

            {/* --- 4. HISTÓRICO HOSPITALAR --- */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>4. Histórico Neonatal e Evolução Hospitalar</Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.5, alignItems: 'center' }}>
                <TextField label="IG (Semanas)" name="ig_semanas" type="number" value={anamneseData.ig_semanas || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}/>
                <TextField label="IG (Dias)" name="ig_dias" type="number" value={anamneseData.ig_dias || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}/>
                <Tooltip title={`Classificações: ${igClassOptions.join(', ')}`} placement="top">
                    <IconButton size="small"><InfoOutlinedIcon fontSize="small" /></IconButton>
                </Tooltip>
                
                <TextField label="Peso na Alta (g)" name="peso_alta" type="number" value={anamneseData.peso_alta || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}/>
                <Tooltip title={`Classificações: ${pesoClassOptions.join(', ')}`} placement="top">
                    <IconButton size="small"><InfoOutlinedIcon fontSize="small" /></IconButton>
                </Tooltip>

                <TextField select label="Adequação Peso/IG" name="peso_adequacao" value={anamneseData.peso_adequacao || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {pesoAdequacaoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField label="Tempo Internação (dias)" name="tempo_internacao" value={anamneseData.tempo_internacao || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}/>
            </Box>

            {/* Lógica Condicional: Suporte Ventilatório */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, alignItems: 'center' }}>
                <TextField select label="Suporte Ventilatório" name="suporte_ventilatorio" value={anamneseData.suporte_ventilatorio || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {simNaoNaoSeAplicaOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                {anamneseData.suporte_ventilatorio === 'Sim' && (
                    <>
                    <TextField label="VM (dias)" name="suporte_vm_d" type="number" value={anamneseData.suporte_vm_d || ''} onChange={handleChange} size="small" sx={{minWidth: 80, flex: '1 1 80px'}}/>
                    <TextField label="CPAP (dias)" name="suporte_cpap_d" type="number" value={anamneseData.suporte_cpap_d || ''} onChange={handleChange} size="small" sx={{minWidth: 80, flex: '1 1 80px'}}/>
                    <TextField label="O2 (dias)" name="suporte_o2_d" type="number" value={anamneseData.suporte_o2_d || ''} onChange={handleChange} size="small" sx={{minWidth: 80, flex: '1 1 80px'}}/>
                    </>
                )}
            </Box>

            {/* Lógica Condicional: Fototerapia, NPP, Antibióticos */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, alignItems: 'center' }}>
                <TextField select label="Fototerapia" name="fototerapia" value={anamneseData.fototerapia || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {simNaoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                {anamneseData.fototerapia === 'Sim' && (
                    <TextField label="Fototerapia (dias)" name="fototerapia_d" type="number" value={anamneseData.fototerapia_d || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}/>
                )}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, alignItems: 'center' }}>
                <TextField select label="NPP" name="npp" value={anamneseData.npp || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {simNaoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                {anamneseData.npp === 'Sim' && (
                     <TextField label="NPP (dias)" name="npp_d" type="number" value={anamneseData.npp_d || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}/>
                )}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, alignItems: 'center' }}>
                <TextField select label="Antibióticos" name="antibioticos" value={anamneseData.antibioticos || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {simNaoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                {anamneseData.antibioticos === 'Sim' && (
                    <>
                    <TextField label="ATB (dias)" name="antibioticos_d" type="number" value={anamneseData.antibioticos_d || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}/>
                    <TextField label="Esquema" name="antibioticos_esquema" value={anamneseData.antibioticos_esquema || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}/>
                    </>
                )}
            </Box>

            <TextField label="Diagnósticos Principais (Alta)" name="diagnosticos_principais" multiline rows={2} fullWidth size="small" sx={{mt: 2}}
                value={anamneseData.diagnosticos_principais || ''} onChange={handleChange} placeholder="Ex: Icterícia neonatal, Sepse precoce, Hipoglicemia..."/>

            {/* Exames Realizados */}
            <FormControl component="fieldset" size="small" sx={{mt: 2, width: '100%'}}>
                <FormLabel component="legend" sx={{fontSize: '0.9rem', fontWeight: 'medium'}}>Exames Hospitalares Principais (Data e Resultado):</FormLabel>
                <FormGroup sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                    {examesHospOptions.map(opt => (
                        <Box key={opt.id} sx={{display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap'}}>
                            <FormControlLabel 
                                control={<Checkbox size="small" checked={examesHosp[opt.id] || false} onChange={handleCheckboxChange(setExamesHosp)} name={opt.id} />} 
                                label={opt.label}
                                sx={{minWidth: 180}}
                            />
                            {examesHosp[opt.id] && (
                                <>
                                <TextField type="date" name={`${opt.id}_data`} value={anamneseData[`${opt.id}_data`] || ''} onChange={handleChange} size="small" InputLabelProps={{ shrink: true }} sx={{minWidth: 150, flex: '1 1 150px'}}/>
                                <TextField label="Resultado" name={`${opt.id}_resultado`} value={anamneseData[`${opt.id}_resultado`] || ''} onChange={handleChange} size="small" sx={{minWidth: 200, flex: '2 1 200px'}}/>
                                </>
                            )}
                        </Box>
                    ))}
                </FormGroup>
            </FormControl>

            {/* Outros Exames (Dinâmico) */}
            <FormControl component="fieldset" size="small" sx={{mt: 2, width: '100%'}}>
                 <FormLabel component="legend" sx={{fontSize: '0.9rem', fontWeight: 'medium'}}>Outros Exames Hospitalares:</FormLabel>
                 <Box sx={{display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1}}>
                    {outrosExames.map((exame, index) => (
                        <Box key={index} sx={{display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap'}}>
                            <TextField label="Nome do Exame" name="nome" value={exame.nome} onChange={(e) => handleOutroExameChange(index, e)} size="small" sx={{minWidth: 180, flex: '1 1 180px'}}/>
                            <TextField type="date" name="data" value={exame.data} onChange={(e) => handleOutroExameChange(index, e)} size="small" InputLabelProps={{ shrink: true }} sx={{minWidth: 150, flex: '1 1 150px'}}/>
                            <TextField label="Resultado" name="resultado" value={exame.resultado} onChange={(e) => handleOutroExameChange(index, e)} size="small" sx={{minWidth: 200, flex: '2 1 200px'}}/>
                            <IconButton onClick={() => handleRemoveOutroExame(index)} color="error" size="small">
                                <RemoveCircleOutlineIcon />
                            </IconButton>
                        </Box>
                    ))}
                    <Button
                        size="small"
                        startIcon={<AddCircleOutlineIcon />}
                        onClick={handleAddOutroExame}
                        sx={{ mt: 1, alignSelf: 'flex-start' }}
                    >
                        Adicionar Exame
                    </Button>
                 </Box>
            </FormControl>


            {/* --- 5. TRIAGENS --- */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>5. Triagens e Testes Neonatais</Typography>
            <FormControl component="fieldset" size="small" sx={{mt: 1, width: '100%'}}>
                <FormLabel component="legend" sx={{fontSize: '0.9rem'}}>Status (Marcados = Realizados e Normais):</FormLabel>
                <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                    {triagensOptions.map(opt => (
                        <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={triagens[opt.id] || false} onChange={handleCheckboxChange(setTriagens)} name={opt.id} />} label={opt.label} />
                    ))}
                </FormGroup>
            </FormControl>

            {/* Botões Salvar/Limpar */}
            <Box sx={{ textAlign: 'right', mt: 3, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button onClick={handleLimpar} variant="outlined" color="secondary" disabled={isSubmitting}>
                    Limpar Histórico
                </Button>
                <Button onClick={handleSaveAnamnese} variant="contained" color="primary" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Histórico'}
                </Button>
            </Box>
        </Paper>
    );
}