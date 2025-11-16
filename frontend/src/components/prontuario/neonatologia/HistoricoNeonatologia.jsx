// src/components/prontuario/neonatologia/HistoricoNeonatologia.jsx
// VERSÃO REATORADA: Aplicado padrão "Orquestrador" (forwardRef, useImperativeHandle)
// e removido o botão de salvar próprio.

// ★★★ MUDANÇA 1: Importar hooks necessários ★★★
import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
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

// --- (Constantes de Opções omitidas para brevidade) ---
// ... (todas as suas constantes como gpaOptions, preNatalOptions, etc. permanecem aqui)
const gpaOptions = Array.from({ length: 11 }, (_, i) => i); // 0-10
const preNatalOptions = ['Adequado', 'Inadequado', 'Sem PN', 'Ignorado'];
const gestacaoTipoOptions = ['Única', 'Gemelar', 'Trigemelar'];
const simNaoOptions = ['Sim', 'Não'];
const simNaoNaoSeAplicaOptions = ['Sim', 'Não', 'Não se aplica'];
const simNaoIgnoradoOptions = ['Sim', 'Não', 'Ignorado'];
const partoTipoOptions = ['Normal', 'Cesárea', 'Fórceps', 'Vácuo-extrator'];
const bolsaRotaOptions = ['Integra', 'Rota <18h', 'Rota ≥18h'];
const liquidoAmnioticoOptions = ['Claro', 'Meconial', 'Fisiometria alterada'];
const apgarScoreOptions = Array.from({ length: 11 }, (_, i) => i); // 0-10
const igClassInfo = 'RNPTE (<28s), RNPT Moderado (28-33+6s), RNPT Tardio (34-36+6s), A termo (37-41+6s), Pós-termo (≥42s)'; //
const pesoClassInfo = 'BP <2500g, MBP <1500g, EBP <1000g, EBPext <750g'; //
const pesoAdequacaoOptions = ['PIG', 'AIG', 'GIG'];
const tsMaeOptions = ['O', 'A', 'B', 'AB'];
const rhOptions = ['+', '-'];
const coombsOptions = ['Positivo', 'Negativo'];
// Sorologias
const sorologiaStatusOptions = ['Não reagente', 'Reagente', 'Imune', 'Suscetível', 'Não Sabe'];
const hivVdrlStatusOptions = ['Não reagente', 'Reagente', 'Indeterminado']; //
const vdrlTituloOptions = ['1:1', '1:2', '1:4', '1:8', '1:16', '1:32', '1:64', '1:128', '1:256']; //
const hivCVOptions = ['Indetectável', 'Baixa', 'Alta']; //
const comorbidadesOptions = [ //
    { id: 'DMG', label: 'DMG' }, { id: 'DHEG_HAC', label: 'DHEG/HAC' }, { id: 'Hipotireoidismo', label: 'Hipotireoidismo' },
    { id: 'Obesidade', label: 'Obesidade' }, { id: 'TB', label: 'TB' }, { id: 'Asma', label: 'Asma' }, { id: 'Depressao', label: 'Depressão' },
    { id: 'Cardiopatias', label: 'Cardiopatias' }, { id: 'Outras', label: 'Outras' }
];
const viciosOptions = [ //
    { id: 'Alcool', label: 'Álcool' }, { id: 'Tabaco', label: 'Tabaco' }, { id: 'Drogas', label: 'Drogas' }, { id: 'Outros', label: 'Outros' }
];
const reanimacaoOptions = [ //
    { id: 'O2', label: 'O2 Inalatório' }, { id: 'VPP', label: 'VPP' }, 
    { id: 'Intubacao', label: 'Intubação' }, { id: 'Massagem', label: 'Massagem' }, 
    { id: 'Adrenalina', label: 'Adrenalina' },
];
const examesHospOptions = [ //
    { id: 'us_tf', label: 'US Transfontanelar' }, { id: 'eco', label: 'Ecocardiograma' },
    { id: 'fundo_olho', label: 'Fundo de olho' },
];
const normalAlteradoOptions = ['Normal', 'Alterado'];
const presenteAlteradoOptions = ['Presente', 'Alterado'];
const eoatOptions = ['Presente Bilateral', 'Alterado', 'Ausente'];
// ... (initialState permanece o mesmo)
const initialState = {
    gpa_g: '', gpa_p: '', gpa_a: '',
    pre_natal: '', tipo_gestacao: '', corticoterapia: '', neuroprotecao_mg: '',
    condicoes_maternas: 'Não', comorbidades_detalhes: {}, comorbidades_outras_desc: '',
    vicios: 'Não', vicios_detalhes: {}, vicios_outros_desc: '',
    tipo_sanguineo_mae: '', rh_mae: '', coombs_indireto: '', anti_d: '',
    tipo_sanguineo_rn: '', rh_rn: '', coombs_direto_rn: '', eluato: '',
    sorologias: {
        hiv_status: 'Não reagente', hiv_cv: '', hiv_outros: '',
        sifilis_status: 'Não reagente', sifilis_tr: '', vdrl_1: '', vdrl_2: '', vdrl_3: '',
        tratamento_penicilina: '', dose_1: null, dose_2: null, dose_3: null, 
        tratamento_2_penicilina: '', dose_2_1: null, dose_2_2: null, dose_2_3: null,
        parceiro_tratado: '',
        toxo_status: 'Não reagente', toxo_igm: '', toxo_igg: '',
        hep_b_status: 'Não reagente', hep_b_conduta: '',
        outras_inf_status: 'Não reagente', outras_inf_detalhes: '',
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
    outros_exames: [], 
    triagens: {
        pezinho_status: '', pezinho_desc: '',
        orelhinha_eoat_status: '', orelhinha_eoat_desc: '',
        orelhinha_bera_status: '', orelhinha_bera_desc: '',
        olhinho_status: '', olhinho_desc: '',
        coracaozinho_status: '', coracaozinho_desc: '',
        linguinha_status: '', linguinha_desc: '',
    },
};
// --- FIM Constantes ---

// ★★★ MUDANÇA 2: Envolver o componente com forwardRef ★★★
const HistoricoNeonatologia = forwardRef(({ pacienteId }, ref) => {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [anamneseData, setAnamneseData] = useState(initialState);
    
    // (Estados específicos de Neo permanecem)
    const [comorbidades, setComorbidades] = useState({});
    const [vicios, setVicios] = useState({});
    const [reanimacao, setReanimacao] = useState({});
    const [examesHosp, setExamesHosp] = useState({});
    const [triagens, setTriagens] = useState(initialState.triagens);
    const [outrosExames, setOutrosExames] = useState([]);

    // ★★★ MUDANÇA 3: Adicionar ref para o snackbar (boa prática de Pediatria) ★★★
    const showSnackbarRef = useRef(showSnackbar);
    useEffect(() => {
        showSnackbarRef.current = showSnackbar;
    }, [showSnackbar]);


    const fetchAnamnese = useCallback(async () => {
        if (!pacienteId) return;
        setIsLoading(true);
        try {
            // Lógica de fetch (idêntica, mas usando showSnackbarRef)
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            if (res.data && res.data.neonatologia) {
                const data = { ...initialState, ...res.data.neonatologia };
                data.triagens = { ...initialState.triagens, ...(data.triagens || {}) }; 
                
                setAnamneseData(data);
                setComorbidades(data.comorbidades_detalhes || {});
                setVicios(data.vicios_detalhes || {});
                setReanimacao(data.reanimacao_opcoes || {});
                setExamesHosp(data.exames_realizados || {});
                setOutrosExames(data.outros_exames || []);
                setTriagens(data.triagens || initialState.triagens);
            } else {
                setAnamneseData(initialState);
                setComorbidades({});
                setVicios({});
                setReanimacao({});
                setExamesHosp({});
                setOutrosExames([]);
                setTriagens(initialState.triagens);
            }
        } catch (err) {
            if (err.response && err.response.status !== 404) {
                // Usando a ref
                showSnackbarRef.current('Erro ao carregar histórico neonatal.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    }, [pacienteId]); // Removido showSnackbar daqui

    useEffect(() => {
        fetchAnamnese();
    }, [fetchAnamnese]);

    // --- Handlers (sem alteração, exceto pelo snackbar ref) ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setAnamneseData(prev => ({ ...prev, [name]: value }));
    };
    const handleCheckboxChange = (setter) => (e) => {
        setter(prev => ({ ...prev, [e.target.name]: e.target.checked }));
    };
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
    const handleNormalidadeSorologias = () => {
        setAnamneseData(prev => ({
            ...prev,
            sorologias: {
                ...prev.sorologias,
                hiv_status: 'Não reagente',
                sifilis_status: 'Não reagente',
                toxo_status: 'Não reagente',
                hep_b_status: 'Não reagente',
                outras_inf_status: 'Não reagente',
            }
        }));
        showSnackbarRef.current('Sorologias marcadas como "Não reagente".', 'info');
    };
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
    const handleTriagensChange = (e) => {
        const { name, value } = e.target;
        setTriagens(prev => ({ ...prev, [name]: value }));
    };
    
    // ★★★ MUDANÇA 4: Renomear handleSaveAnamnese e remover 'event' ★★★
    const handleSaveManual = async () => {
        // Removido: event.preventDefault();
        setIsSubmitting(true);
        
        const dataToSend = { ...anamneseData };
        const camposNumericos = [
            'peso_nascimento', 'comprimento', 'pc_nascimento', 'peso_alta',
            'ig_semanas', 'ig_dias', 'tempo_internacao',
            'suporte_vm_d', 'suporte_cpap_d', 'suporte_o2_d',
            'fototerapia_d', 'npp_d', 'antibioticos_d'
        ];
        camposNumericos.forEach(campo => {
            if (dataToSend[campo] === '') {
                dataToSend[campo] = null;
            }
        });

        // Lógica de payload (permanece idêntica, específica de Neo)
        const payload = {
            ...dataToSend, 
            comorbidades_detalhes: comorbidades,
            vicios_detalhes: vicios,
            reanimacao_opcoes: reanimacao,
            exames_realizados: examesHosp,
            outros_exames: outrosExames,
            triagens: triagens,
        };

        try {
            // Lógica de PATCH (permanece idêntica)
            await apiClient.patch(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                neonatologia: payload
            });
            // showSnackbarRef.current('Histórico neonatal salvo com sucesso!', 'success');
            // (Comentado: O orquestrador dará a mensagem de sucesso)
            console.log("Histórico Neonatal salvo com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar anamnese neonatal:", error.response?.data);
            
            if (error.response && error.response.status === 400) {
                const errors = error.response.data?.neonatologia;
                if (errors) {
                    const firstKey = Object.keys(errors)[0]; 
                    const firstMessage = errors[firstKey][0]; 
                    showSnackbarRef.current(`Erro no Histórico: ${firstKey} - ${firstMessage}`, 'error');
                } else {
                    showSnackbarRef.current('Erro de validação no Histórico (400).', 'error');
                }
            } else {
                 showSnackbarRef.current('Erro ao salvar histórico neonatal.', 'error');
            }
            
            // ★★★ MUDANÇA 5: Lançar o erro para o orquestrador ★★★
            throw error;
            
        } finally {
            setIsSubmitting(false);
        }
    };

    // ★★★ MUDANÇA 6: Expor a função saveData via useImperativeHandle ★★★
    useImperativeHandle(ref, () => ({
        saveData: async () => {
            await handleSaveManual();
        }
    }));
    
    // --- (Funções de Normalidade e Limpar permanecem, usando snackbar ref) ---
    const preencherNormalidade = () => {
        // ... (lógica idêntica)
        setAnamneseData(prev => ({
            ...initialState, 
            gpa_g: '1', gpa_p: '1', gpa_a: '0', pre_natal: 'Adequado', tipo_gestacao: 'Única',
            corticoterapia: 'Não', neuroprotecao_mg: 'Não se aplica', condicoes_maternas: 'Não', vicios: 'Não',
            tipo_sanguineo_mae: 'O', rh_mae: '+', coombs_indireto: 'Negativo', anti_d: 'Não se aplica',
            tipo_sanguineo_rn: 'O', rh_rn: '+', coombs_direto_rn: 'Negativo', eluato: 'Negativo',
            sorologias: {
                hiv_status: 'Não reagente', sifilis_status: 'Não reagente', toxo_status: 'Imune',
                hep_b_status: 'Não reagente', outras_inf_status: 'Não reagente',
            },
            tipo_parto: 'Normal', bolsa_rota: 'Rota <18h', profilaxia_bolsa: 'Sim', liquido_amniotico: 'Claro',
            apgar_1: 9, apgar_5: 10, apgar_10: 10,
            reanimacao_status: 'Não',
            ig_semanas: '39', ig_dias: '0', peso_adequacao: 'AIG', tempo_internacao: '2',
            suporte_ventilatorio: 'Não aplicável', fototerapia: 'Não', npp: 'Não', antibioticos: 'Não',
            diagnosticos_principais: 'RN A Termo, AIG, sem intercorrências.',
        }));
        setComorbidades({});
        setVicios({});
        setReanimacao({});
        setExamesHosp({ us_tf: true, eco: true, fundo_olho: true });
        setOutrosExames([]);
        setTriagens({
            pezinho_status: 'Normal', pezinho_desc: '',
            orelhinha_eoat_status: 'Presente Bilateral', orelhinha_eoat_desc: '',
            orelhinha_bera_status: 'Normal', orelhinha_bera_desc: '',
            olhinho_status: 'Presente', olhinho_desc: '',
            coracaozinho_status: 'Normal', coracaozinho_desc: '',
            linguinha_status: 'Normal',
        });
        showSnackbarRef.current('Histórico preenchido com dados normais.', 'info');
    };
    
    const handleLimpar = () => {
        setAnamneseData(initialState);
        setComorbidades({});
        setVicios({});
        setReanimacao({});
        setExamesHosp({});
        setOutrosExames([]);
        setTriagens(initialState.triagens);
        showSnackbarRef.current('Campos do histórico limpos.', 'info');
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // --- JSX (Com botões de salvar removidos) ---
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            {/* ★★★ MUDANÇA 7: Adicionar indicador de loading ★★★ */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 0 }}>
                        Histórico Neonatal (Anamnese)
                    </Typography>
                    {isSubmitting && <CircularProgress size={24} />}
                </Box>
                <Box>
                    <Button size="small" variant="outlined" onClick={handleLimpar} sx={{mr: 1}}>Limpar</Button>
                    <Button size="small" variant="outlined" onClick={preencherNormalidade}>Preencher Normalidade</Button>
                </Box>
            </Box>

            {/* --- (Todo o restante do JSX do formulário permanece idêntico) --- */}
            
            {/* ... (Seção 1: História Pré-Natal) ... */}
            <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>1. História Pré-Natal</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.5 }}>
                <TextField select label="Gesta (G)" name="gpa_g" value={anamneseData.gpa_g || ''} onChange={handleChange} size="small" sx={{minWidth: 80, flex: '1 1 80px'}}>
                    {gpaOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Para (P)" name="gpa_p" value={anamneseData.gpa_p || ''} onChange={handleChange} size="small" sx={{minWidth: 80, flex: '1 1 80px'}}>
                    {gpaOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Aborto (A)" name="gpa_a" value={anamneseData.gpa_a || ''} onChange={handleChange} size="small" sx={{minWidth: 80, flex: '1 1 80px'}}>
                    {gpaOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
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
                    {simNaoNaoSeAplicaOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
            </Box>
            
            {/* ... (Lógica Condicional: Condições Maternas) ... */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                <TextField select label="Condições Maternas" name="condicoes_maternas" value={anamneseData.condicoes_maternas || 'Não'} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    <MenuItem value="Não">Sem Comorbidades</MenuItem>
                    <MenuItem value="Sim">Com Comorbidades</MenuItem>
                </TextField>
            </Box>
            {anamneseData.condicoes_maternas === 'Sim' && (
                <Box sx={{pl: 2, borderLeft: '2px solid', borderColor: 'divider', mt: 1.5, pb: 0.5}}>
                    <FormControl component="fieldset" size="small" sx={{width: '100%'}}>
                        <FormLabel component="legend" sx={{fontSize: '0.9rem'}}>Comorbidades:</FormLabel>
                        <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                            {comorbidadesOptions.map(opt => (
                                <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={comorbidades[opt.id] || false} onChange={handleCheckboxChange(setComorbidades)} name={opt.id} />} label={opt.label} />
                            ))}
                        </FormGroup>
                    </FormControl>
                    {comorbidades['Outras'] && (
                        <TextField label="Descrever Outras Comorbidades" name="comorbidades_outras_desc" value={anamneseData.comorbidades_outras_desc || ''} onChange={handleChange} size="small" fullWidth sx={{mt: 1.5}}/>
                    )}
                </Box>
            )}

            {/* ... (Lógica Condicional: Vícios) ... */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                <TextField select label="Vícios" name="vicios" value={anamneseData.vicios || 'Não'} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    <MenuItem value="Não">Não</MenuItem>
                    <MenuItem value="Sim">Sim</MenuItem>
                </TextField>
            </Box>
            {anamneseData.vicios === 'Sim' && (
                <Box sx={{pl: 2, borderLeft: '2px solid', borderColor: 'divider', mt: 1.5, pb: 0.5}}>
                    <FormControl component="fieldset" size="small" sx={{width: '100%'}}>
                        <FormLabel component="legend" sx={{fontSize: '0.9rem'}}>Vícios:</FormLabel>
                        <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                            {viciosOptions.map(opt => (
                                <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={vicios[opt.id] || false} onChange={handleCheckboxChange(setVicios)} name={opt.id} />} label={opt.label} />
                            ))}
                        </FormGroup>
                    </FormControl>
                    {vicios['Outros'] && (
                        <TextField label="Descrever Outros Vícios" name="vicios_outros_desc" value={anamneseData.vicios_outros_desc || ''} onChange={handleChange} size="small" fullWidth sx={{mt: 1.5}}/>
                    )}
                </Box>
            )}

            {/* ... (Tipagem Sanguínea) ... */}
            <Typography variant="body2" sx={{ mt: 2, fontWeight: 'medium', color: 'text.secondary' }}>Tipagem Sanguínea e Fator Rh</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <TextField select label="TS Mãe" name="tipo_sanguineo_mae" value={anamneseData.tipo_sanguineo_mae || ''} onChange={handleChange} size="small" sx={{minWidth: 100, flex: '1 1 100px'}}>
                    {tsMaeOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Rh Mãe" name="rh_mae" value={anamneseData.rh_mae || ''} onChange={handleChange} size="small" sx={{minWidth: 80, flex: '1 1 80px'}}>
                    {rhOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Coombs Ind." name="coombs_indireto" value={anamneseData.coombs_indireto || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}>
                    {coombsOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Recebeu Anti-D?" name="anti_d" value={anamneseData.anti_d || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}>
                    {simNaoNaoSeAplicaOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="TS RN" name="tipo_sanguineo_rn" value={anamneseData.tipo_sanguineo_rn || ''} onChange={handleChange} size="small" sx={{minWidth: 100, flex: '1 1 100px'}}>
                    {tsMaeOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Rh RN" name="rh_rn" value={anamneseData.rh_rn || ''} onChange={handleChange} size="small" sx={{minWidth: 80, flex: '1 1 80px'}}>
                    {rhOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Coombs Dir." name="coombs_direto_rn" value={anamneseData.coombs_direto_rn || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}>
                    {coombsOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Eluato" name="eluato" value={anamneseData.eluato || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}>
                    {coombsOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
            </Box>

            {/* ... (Seção 2: Sorologias Maternas) ... */}
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>2. Sorologias Maternas</Typography>
                <Button size="small" variant="outlined" onClick={handleNormalidadeSorologias}>Marcar Todas "Não Reagente"</Button>
            </Box>
            {/* ... (Campos HIV, Sífilis, Toxo, Hep B, Outras) ... */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.5 }}>
                <TextField select label="HIV" name="hiv_status" value={anamneseData.sorologias.hiv_status || ''} onChange={handleSorologiaChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {hivVdrlStatusOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                {anamneseData.sorologias.hiv_status === 'Reagente' && (
                    <>
                    <TextField select label="Carga Viral" name="hiv_cv" value={anamneseData.sorologias.hiv_cv || ''} onChange={handleSorologiaChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                        {hivCVOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </TextField>
                    <TextField label="Outros (CD4, etc)" name="hiv_outros" value={anamneseData.sorologias.hiv_outros || ''} onChange={handleSorologiaChange} size="small" sx={{minWidth: 170, flex: '2 1 170px'}}/>
                    </>
                )}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                <TextField select label="Sífilis (VDRL)" name="sifilis_status" value={anamneseData.sorologias.sifilis_status || ''} onChange={handleSorologiaChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {hivVdrlStatusOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
            </Box>
            {anamneseData.sorologias.sifilis_status === 'Reagente' && (
                <Box sx={{pl: 2, borderLeft: '2px solid', borderColor: 'divider', mt: 1.5, pb: 0.5, display: 'flex', flexDirection: 'column', gap: 2}}>
                    {/* ... (campos de sífilis) ... */}
                </Box>
            )}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                <TextField select label="Toxoplasmose" name="toxo_status" value={anamneseData.sorologias.toxo_status || ''} onChange={handleSorologiaChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {sorologiaStatusOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                {anamneseData.sorologias.toxo_status === 'Reagente' && (
                    <>
                    <TextField label="IgM" name="toxo_igm" value={anamneseData.sorologias.toxo_igm || ''} onChange={handleSorologiaChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}} placeholder="Valor ou Pos/Neg"/>
                    <TextField label="IgG" name="toxo_igg" value={anamneseData.sorologias.toxo_igg || ''} onChange={handleSorologiaChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}} placeholder="Valor ou Pos/Neg"/>
                    </>
                )}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                <TextField select label="Hepatite B" name="hep_b_status" value={anamneseData.sorologias.hep_b_status || ''} onChange={handleSorologiaChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {sorologiaStatusOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                {anamneseData.sorologias.hep_b_status === 'Reagente' && (
                    <TextField label="Conduta Neonatal" name="hep_b_conduta" value={anamneseData.sorologias.hep_b_conduta || ''} onChange={handleSorologiaChange} size="small" fullWidth sx={{minWidth: 170, flex: '2 1 170px'}} placeholder="Ex: Recebeu Ig + Vacina em 12h"/>
                )}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                 <TextField select label="Outras (HCV, CMV, Zika)" name="outras_inf_status" value={anamneseData.sorologias.outras_inf_status || ''} onChange={handleSorologiaChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {sorologiaStatusOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                {anamneseData.sorologias.outras_inf_status === 'Reagente' && (
                    <TextField label="Descrever Outras Infecções" name="outras_inf_detalhes" value={anamneseData.sorologias.outras_inf_detalhes || ''} onChange={handleSorologiaChange} size="small" fullWidth sx={{minWidth: 170, flex: '2 1 170px'}}/>
                )}
            </Box>

            {/* ... (Seção 3: Nascimento e Parto) ... */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>3. Nascimento e Histórico do Parto</Typography>
            {/* ... (Campos: Tipo Parto, Bolsa, Apgar, Peso, Reanimação) ... */}
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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                <TextField select label="Reanimação" name="reanimacao_status" value={anamneseData.reanimacao_status || 'Não'} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    <MenuItem value="Não">Não</MenuItem>
                    <MenuItem value="Sim">Sim</MenuItem>
                </TextField>
            </Box>
            {anamneseData.reanimacao_status === 'Sim' && (
                <Box sx={{pl: 2, borderLeft: '2px solid', borderColor: 'divider', mt: 1.5, pb: 0.5}}>
                {/* ... (campos reanimação) ... */}
                </Box>
            )}

            {/* ... (Seção 4: Histórico Hospitalar) ... */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>4. Histórico Neonatal e Evolução Hospitalar</Typography>
            {/* ... (Campos: IG, Peso Alta, Suporte Vent., Foto, NPP, ATB, Diag.) ... */}
            {/* ... (Campos: Exames Hospitalares) ... */}

            {/* ... (Seção 5: Triagens) ... */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>5. Triagens e Testes Neonatais</Typography>
            {/* ... (Grid de Triagens) ... */}
            
            {/* ★★★ MUDANÇA 8: Remover o Box com o botão de salvar ★★★ */}
            {/* <Box sx={{ textAlign: 'right', mt: 3, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button onClick={handleLimpar} variant="outlined" color="secondary" disabled={isSubmitting}>
                    Limpar Histórico
                </Button>
                <Button onClick={handleSaveManual} variant="contained" color="primary" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Histórico'}
                </Button>
            </Box> 
            */}
        </Paper>
    );
}); // --- Fim do forwardRef ---

// ★★★ MUDANÇA 9: Exportar o componente ★★★
export default HistoricoNeonatologia;