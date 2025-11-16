// src/components/prontuario/neonatologia/HistoricoNeonatologia.jsx
// VERSÃO CORRIGIDA: Adicionado type="button" a todos os botões
// auxiliares para evitar a submissão acidental do formulário pai.

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import {
    Paper, Typography, TextField, Box, Button, CircularProgress, Grid, Divider,
    FormGroup, FormControlLabel, Checkbox, FormControl, InputLabel, Select, MenuItem, FormLabel,
    Tooltip, IconButton
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-infoOutlined';
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

    return (
        // ★★★ CORREÇÃO 1: Removido component="form" daqui ★★★
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 0 }}>
                        Histórico Neonatal (Anamnese)
                    </Typography>
                    {isSubmitting && <CircularProgress size={24} />}
                </Box>
                <Box>
                    {/* ★★★ CORREÇÃO 2: Adicionado type="button" ★★★ */}
                    <Button size="small" variant="outlined" onClick={handleLimpar} sx={{mr: 1}} type="button">
                        Limpar
                    </Button>
                    <Button size="small" variant="outlined" onClick={preencherNormalidade} type="button">
                        Preencher Normalidade
                    </Button>
                </Box>
            </Box>
            
            <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>1. História Pré-Natal</Typography>
            {/* ... (Campos Pré-Natal) ... */}
            
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>2. Sorologias Maternas</Typography>
                {/* ★★★ CORREÇÃO 3: Adicionado type="button" ★★★ */}
                <Button size="small" variant="outlined" onClick={handleNormalidadeSorologias} type="button">
                    Marcar Todas "Não Reagente"
                </Button>
            </Box>
            {/* ... (Campos Sorologias) ... */}

            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>3. Nascimento e Histórico do Parto</Typography>
            {/* ... (Campos Nascimento/Parto) ... */}

            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>4. Histórico Neonatal e Evolução Hospitalar</Typography>
            {/* ... (Campos Histórico Hospitalar) ... */}

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
                    {/* ★★★ CORREÇÃO 4: Adicionado type="button" ★★★ */}
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
            {/* ... (Campos Triagens) ... */}
            
            {/* Botão de salvar removido */}
        </Paper>
    );
});

export default HistoricoNeonatologia;