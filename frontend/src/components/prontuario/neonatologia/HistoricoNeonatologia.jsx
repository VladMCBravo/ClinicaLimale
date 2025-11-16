// src/components/prontuario/neonatologia/HistoricoNeonatologia.jsx

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import {
    Paper, Typography, TextField, Box, Button, CircularProgress, Grid, Divider,
    FormGroup, FormControlLabel, Checkbox, FormControl, InputLabel, Select, MenuItem, FormLabel,
    Tooltip, IconButton
} from '@mui/material';
// Correção do import do ícone:
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'; 
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import apiClient from '../../../api/axiosConfig';

// --- (Constantes de Opções omitidas para brevidade) ---
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

const HistoricoNeonatologia = forwardRef(({ pacienteId }, ref) => {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [anamneseData, setAnamneseData] = useState(initialState);
    
    const [comorbidades, setComorbidades] = useState({});
    const [vicios, setVicios] = useState({});
    const [reanimacao, setReanimacao] = useState({});
    const [examesHosp, setExamesHosp] = useState({});
    const [triagens, setTriagens] = useState(initialState.triagens);
    const [outrosExames, setOutrosExames] = useState([]);

    const showSnackbarRef = useRef(showSnackbar);
    useEffect(() => {
        showSnackbarRef.current = showSnackbar;
    }, [showSnackbar]);

    // ... (fetchAnamnese, useEffect, Handlers... todos inalterados)
    const fetchAnamnese = useCallback(async () => {
        if (!pacienteId) return;
        setIsLoading(true);
        try {
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
                showSnackbarRef.current('Erro ao carregar histórico neonatal.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    }, [pacienteId]); 

    useEffect(() => {
        fetchAnamnese();
    }, [fetchAnamnese]);

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

    // --- Lógica de Salvar (inalterada) ---
    const handleSaveManual = async () => {
        if (isSubmitting) return; 
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
            await apiClient.patch(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                neonatologia: payload
            });
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
            throw error; 
        } finally {
            setIsSubmitting(false);
        }
    };

    useImperativeHandle(ref, () => ({
        saveData: async () => {
            await handleSaveManual();
        }
    }));
    
    // --- Funções de Botão (Normalidade, Limpar) ---
    const preencherNormalidade = () => {
        // ... (lógica inalterada)
        setAnamneseData(prev => ({
            // ★★★ ESTA É A CORREÇÃO ★★★
            // Troque "...initialState" por "...prev"
            // para mesclar os dados de normalidade sem apagar o estado existente.
            ...prev,
            // Dados da normalidade (o resto da função permanece igual)
            gpa_g: '1', gpa_p: '1', gpa_a: '0', pre_natal: 'Adequado', tipo_gestacao: 'Única',
            corticoterapia: 'Não', neuroprotecao_mg: 'Não se aplica', condicoes_maternas: 'Não', vicios: 'Não',
            tipo_sanguineo_mae: 'O', rh_mae: '+', coombs_indireto: 'Negativo', anti_d: 'Não se aplica',
            tipo_sanguineo_rn: 'O', rh_rn: '+', coombs_direto_rn: 'Negativo', eluato: 'Negativo',
            sorologias: {
                // ...prev.sorologias, // Mantém sorologias não listadas
                hiv_status: 'Não reagente', sifilis_status: 'Não reagente', toxo_status: 'Imune',
                hep_b_status: 'Não reagente', outras_inf_status: 'Não reagente',
                
                // Garante que campos reativos sejam limpos se o status mudar
                hiv_cv: '', hiv_outros: '',
                sifilis_tr: '', vdrl_1: '', vdrl_2: '', vdrl_3: '',
                tratamento_penicilina: '', dose_1: null, dose_2: null, dose_3: null, 
                tratamento_2_penicilina: '', dose_2_1: null, dose_2_2: null, dose_2_3: null,
                parceiro_tratado: '',
                toxo_igm: '', toxo_igg: '',
                hep_b_conduta: '',
                outras_inf_detalhes: '',
            },
            tipo_parto: 'Normal', bolsa_rota: 'Rota <18h', profilaxia_bolsa: 'Sim', liquido_amniotico: 'Claro',
            apgar_1: 9, apgar_5: 10, apgar_10: 10,
            reanimacao_status: 'Não',
            ig_semanas: '39', ig_dias: '0', peso_adequacao: 'AIG', tempo_internacao: '2',
            suporte_ventilatorio: 'Não aplicável', fototerapia: 'Não', npp: 'Não', antibioticos: 'Não',
            diagnosticos_principais: 'RN A Termo, AIG, sem intercorrências.',
            
            // Zera campos de exames (data/resultado) que não são parte do estado 'examesHosp'
            us_tf_data: '', us_tf_resultado: '',
            eco_data: '', eco_resultado: '',
            fundo_olho_data: '', fundo_olho_resultado: '',
        }));
        
        // O restante das funções está correto, pois definem os outros estados
        setComorbidades({});
        setVicios({});
        setReanimacao({});
        setExamesHosp({ us_tf: true, eco: true, fundo_olho: true }); // Define normalidade para este estado
        setOutrosExames([]);
        setTriagens({ // Define normalidade para o estado de triagens
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

    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 0 }}>
                        Histórico Neonatal (Anamnese)
                    </Typography>
                    {isSubmitting && <CircularProgress size={24} />}
                </Box>
                <Box>
                    <Button size="small" variant="outlined" onClick={handleLimpar} sx={{mr: 1}} type="button">
                        Limpar
                    </Button>
                    <Button size="small" variant="outlined" onClick={preencherNormalidade} type="button">
                        Preencher Normalidade
                    </Button>
                </Box>
            </Box>
            
            {/* --- JSX RESTAURADO --- */}
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

            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>2. Sorologias Maternas</Typography>
                <Button size="small" variant="outlined" onClick={handleNormalidadeSorologias} type="button">
                    Marcar Todas "Não Reagente"
                </Button>
            </Box>
            
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
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <TextField select label="TR (Teste Rápido)" name="sifilis_tr" value={anamneseData.sorologias.sifilis_tr || ''} onChange={handleSorologiaChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                            <MenuItem value="Reagente">Reagente</MenuItem>
                            <MenuItem value="Não reagente">Não reagente</MenuItem>
                        </TextField>
                        <TextField select label="VDRL 1ª Titulação" name="vdrl_1" value={anamneseData.sorologias.vdrl_1 || ''} onChange={handleSorologiaChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                            {vdrlTituloOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </TextField>
                        <TextField select label="VDRL 2ª Titulação" name="vdrl_2" value={anamneseData.sorologias.vdrl_2 || ''} onChange={handleSorologiaChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                            <MenuItem value="">-</MenuItem>
                            {vdrlTituloOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </TextField>
                         <TextField select label="VDRL 3ª Titulação" name="vdrl_3" value={anamneseData.sorologias.vdrl_3 || ''} onChange={handleSorologiaChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                            <MenuItem value="">-</MenuItem>
                            {vdrlTituloOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </TextField>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                        <TextField select label="Tratamento (Penicilina)" name="tratamento_penicilina" value={anamneseData.sorologias.tratamento_penicilina || ''} onChange={handleSorologiaChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                            {simNaoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </TextField>
                        {anamneseData.sorologias.tratamento_penicilina === 'Sim' && (
                            <>
                            <TextField label="Dose 1 (Data)" name="dose_1" type="date" value={anamneseData.sorologias.dose_1 || ''} onChange={handleSorologiaChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}} InputLabelProps={{ shrink: true }}/>
                            <TextField label="Dose 2 (Data)" name="dose_2" type="date" value={anamneseData.sorologias.dose_2 || ''} onChange={handleSorologiaChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}} InputLabelProps={{ shrink: true }}/>
                            <TextField label="Dose 3 (Data)" name="dose_3" type="date" value={anamneseData.sorologias.dose_3 || ''} onChange={handleSorologiaChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}} InputLabelProps={{ shrink: true }}/>
                            </>
                        )}
                    </Box>
                     <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                        <TextField select label="Parceiro Tratado?" name="parceiro_tratado" value={anamneseData.sorologias.parceiro_tratado || ''} onChange={handleSorologiaChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                            {simNaoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </TextField>
                    </Box>
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
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                <TextField select label="Reanimação" name="reanimacao_status" value={anamneseData.reanimacao_status || 'Não'} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    <MenuItem value="Não">Não</MenuItem>
                    <MenuItem value="Sim">Sim</MenuItem>
                </TextField>
            </Box>
            {anamneseData.reanimacao_status === 'Sim' && (
                <Box sx={{pl: 2, borderLeft: '2px solid', borderColor: 'divider', mt: 1.5, pb: 0.5}}>
                <FormControl component="fieldset" size="small" sx={{width: '100%'}}>
                    <FormLabel component="legend" sx={{fontSize: '0.9rem', fontWeight: 'medium'}}>Manobras Realizadas:</FormLabel>
                    <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                        {reanimacaoOptions.map(opt => (
                            <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={reanimacao[opt.id] || false} onChange={handleCheckboxChange(setReanimacao)} name={opt.id} />} label={opt.label} />
                        ))}
                    </FormGroup>
                </FormControl>
                <TextField label="Intercorrências do Parto/Reanimação" name="reanimacao_obs" multiline rows={2} fullWidth size="small" sx={{mt: 1.5}}
                    value={anamneseData.reanimacao_obs || ''} onChange={handleChange} placeholder="Observações sobre reanimação, circular de cordão, etc." />
                </Box>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>4. Histórico Neonatal e Evolução Hospitalar</Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.5, alignItems: 'center' }}>
                <TextField label="IG (Semanas)" name="ig_semanas" type="number" value={anamneseData.ig_semanas || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}/>
                <TextField label="IG (Dias)" name="ig_dias" type="number" value={anamneseData.ig_dias || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}/>
                <Tooltip title={igClassInfo} placement="top">
                    <IconButton size="small"><InfoOutlinedIcon fontSize="small" /></IconButton>
                </Tooltip>
                
                <TextField label="Peso na Alta (g)" name="peso_alta" type="number" value={anamneseData.peso_alta || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}/>
                <Tooltip title={pesoClassInfo} placement="top">
                    <IconButton size="small"><InfoOutlinedIcon fontSize="small" /></IconButton>
                </Tooltip>

                <TextField select label="Adequação Peso/IG" name="peso_adequacao" value={anamneseData.peso_adequacao || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {pesoAdequacaoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField label="Tempo Internação (dias)" name="tempo_internacao" value={anamneseData.tempo_internacao || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}/>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, alignItems: 'center' }}>
                <TextField select label="Suporte Ventilatório" name="suporte_ventilatorio" value={anamneseData.suporte_ventilatorio || 'Não aplicável'} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
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

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, alignItems: 'center' }}>
                <TextField select label="Fototerapia" name="fototerapia" value={anamneseData.fototerapia || 'Não'} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {simNaoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                {anamneseData.fototerapia === 'Sim' && (
                    <TextField label="Fototerapia (dias)" name="fototerapia_d" type="number" value={anamneseData.fototerapia_d || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}/>
                )}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, alignItems: 'center' }}>
                <TextField select label="NPP" name="npp" value={anamneseData.npp || 'Não'} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {simNaoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                {anamneseData.npp === 'Sim' && (
                     <TextField label="NPP (dias)" name="npp_d" type="number" value={anamneseData.npp_d || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}/>
                )}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, alignItems: 'center' }}>
                <TextField select label="Antibióticos" name="antibioticos" value={anamneseData.antibioticos || 'Não'} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
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
                        type="button"
                    >
                        Adicionar Exame
                    </Button>
                 </Box>
            </FormControl>

            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>5. Triagens e Testes Neonatais</Typography>
            
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={4} md={3}>
                    <TextField select label="Teste do Pezinho" name="pezinho_status" value={triagens.pezinho_status || ''} onChange={handleTriagensChange} size="small" fullWidth>
                        {normalAlteradoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </TextField>
                </Grid>
                {triagens.pezinho_status === 'Alterado' && (
                    <Grid item xs={12} sm={8} md={9}>
                        <TextField label="Descrever (Pezinho)" name="pezinho_desc" value={triagens.pezinho_desc || ''} onChange={handleTriagensChange} size="small" fullWidth/>
                    </Grid>
                )}

                <Grid item xs={12} sm={4} md={3}>
                    <TextField select label="Teste da Orelhinha (EOAT)" name="orelhinha_eoat_status" value={triagens.orelhinha_eoat_status || ''} onChange={handleTriagensChange} size="small" fullWidth>
                        {eoatOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </TextField>
                </Grid>
                {triagens.orelhinha_eoat_status === 'Alterado' && (
                    <Grid item xs={12} sm={8} md={9}>
                        <TextField label="Descrever (EOAT)" name="orelhinha_eoat_desc" value={triagens.orelhinha_eoat_desc || ''} onChange={handleTriagensChange} size="small" fullWidth/>
                    </Grid>
                )}

                <Grid item xs={12} sm={4} md={3}>
                    <TextField select label="BERA" name="orelhinha_bera_status" value={triagens.orelhinha_bera_status || ''} onChange={handleTriagensChange} size="small" fullWidth>
                        {normalAlteradoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </TextField>
                </Grid>
                {triagens.orelhinha_bera_status === 'Alterado' && (
                    <Grid item xs={12} sm={8} md={9}>
                        <TextField label="Descrever (BERA)" name="orelhinha_bera_desc" value={triagens.orelhinha_bera_desc || ''} onChange={handleTriagensChange} size="small" fullWidth/>
                    </Grid>
                )}

                <Grid item xs={12} sm={4} md={3}>
                    <TextField select label="Teste do Olhinho (Refl. Verm.)" name="olhinho_status" value={triagens.olhinho_status || ''} onChange={handleTriagensChange} size="small" fullWidth>
                        {presenteAlteradoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </TextField>
                </Grid>
                {triagens.olhinho_status === 'Alterado' && (
                    <Grid item xs={12} sm={8} md={9}>
                        <TextField label="Descrever (Olhinho)" name="olhinho_desc" value={triagens.olhinho_desc || ''} onChange={handleTriagensChange} size="small" fullWidth/>
                    </Grid>
                )}

                <Grid item xs={12} sm={4} md={3}>
                    <TextField select label="Teste do Coraçãozinho" name="coracaozinho_status" value={triagens.coracaozinho_status || ''} onChange={handleTriagensChange} size="small" fullWidth>
                        {normalAlteradoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </TextField>
                </Grid>
                {triagens.coracaozinho_status === 'Alterado' && (
                    <Grid item xs={12} sm={8} md={9}>
                        <TextField label="Descrever (Coraçãozinho)" name="coracaozinho_desc" value={triagens.coracaozinho_desc || ''} onChange={handleTriagensChange} size="small" fullWidth/>
                    </Grid>
                )}
                
                 <Grid item xs={12} sm={4} md={3}>
                    <TextField select label="Teste da Linguinha" name="linguinha_status" value={triagens.linguinha_status || ''} onChange={handleTriagensChange} size="small" fullWidth>
                        {normalAlteradoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </TextField>
                </Grid>
                {triagens.linguinha_status === 'Alterado' && (
                    <Grid item xs={12} sm={8} md={9}>
                        <TextField label="Descrever (Linguinha)" name="linguinha_desc" value={triagens.linguinha_desc || ''} onChange={handleTriagensChange} size="small" fullWidth/>
                    </Grid>
                )}
            </Grid>
            
        </Paper>
    );
});

export default HistoricoNeonatologia;