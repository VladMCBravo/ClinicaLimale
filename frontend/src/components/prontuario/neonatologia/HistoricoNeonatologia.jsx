// src/components/prontuario/neonatologia/HistoricoNeonatologia.jsx
// VERSÃO COMPLETA (Baseada no PDF )

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, TextField, Box, Button, CircularProgress, Grid, Divider,
    FormGroup, FormControlLabel, Checkbox, FormControl, InputLabel, Select, MenuItem, FormLabel
} from '@mui/material';
import { useSnackbar } from '../../../contexts/SnackbarContext'; // Deve ser ../../../
import apiClient from '../../../api/axiosConfig'; // Deve ser ../../../

// --- Opções para os novos ComboBoxes ---
const preNatalOptions = ['Adequado', 'Inadequado', 'Sem PN', 'Ignorado']; // [cite: 8, 9]
const gestacaoTipoOptions = ['Única', 'Gemelar', 'Trigemelar']; // [cite: 10]
const simNaoOptions = ['Sim', 'Não']; // [cite: 11]
const simNaoIgnoradoOptions = ['Sim', 'Não', 'Ignorado']; // [cite: 12]
const partoTipoOptions = ['Normal', 'Cesárea', 'Fórceps', 'Vácuo-extrator']; // [cite: 65, 70]
const bolsaRotaOptions = ['Integra', 'Rota <18h', 'Rota ≥18h']; // [cite: 66, 71, 75]
const liquidoAmnioticoOptions = ['Claro', 'Meconial', 'Fisiometria alterada']; // [cite: 66, 71, 75]
const igClassOptions = ['RNPTE (<28s)', 'RNPT Moderado (28-33+6s)', 'RNPT Tardio (34-36+6s)', 'A termo (37-41+6s)', 'Pós-termo (≥42s)']; // [cite: 82]
const pesoClassOptions = ['BP <2500g', 'MBP <1500g', 'EBP <1000g', 'EBPext <750g']; // [cite: 84]
const pesoAdequacaoOptions = ['PIG', 'AIG', 'GIG']; // [cite: 85]
const simNaoAplicavelOptions = ['Sim', 'Não', 'Não aplicável']; // [cite: 87, 90]

const sorologiasOptions = [ // [cite: 26-60]
    { id: 'sifilis_status', label: 'Sífilis' }, { id: 'toxo_status', label: 'Toxoplasmose' },
    { id: 'hiv_status', label: 'HIV' }, { id: 'hep_b_status', label: 'Hepatite B' },
    { id: 'hep_c_status', label: 'Hepatite C' }, { id: 'hsv_status', label: 'HSV' },
    { id: 'rubeola_status', label: 'Rubéola' }, { id: 'cmv_status', label: 'CMV' },
    { id: 'zika_status', label: 'Zika' },
];
const reanimacaoOptions = [ // [cite: 74, 76]
    { id: 'vpp', label: 'VPP' }, { id: 'intubacao', label: 'Intubação' },
    { id: 'massagem', label: 'Massagem' }, { id: 'adrenalina', label: 'Adrenalina' },
];
const examesHospOptions = [ // [cite: 94-100]
    { id: 'us_tf', label: 'US Transfontanelar' }, { id: 'eco', label: 'Ecocardiograma' },
    { id: 'oae_peate', label: 'OAE/PEATE' }, { id: 'us_abd_quadril', label: 'US Abdome/Quadril' },
    { id: 'fundo_olho', label: 'Fundo de olho' }, { id: 'tc_rm', label: 'TC/RM' },
];
const triagensOptions = [ // [cite: 110-116]
    { id: 'pezinho', label: 'Pezinho' }, { id: 'orelhinha', label: 'Orelhinha' },
    { id: 'olhinho', label: 'Olhinho' }, { id: 'coracaozinho', label: 'Coraçãozinho' },
    { id: 'linguinha', label: 'Linguinha' },
];

const initialState = {
    sorologias: {}, triagens: {}, reanimacao_opcoes: {}, exames_realizados: {},
};

export default function HistoricoNeonatologia({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [anamneseData, setAnamneseData] = useState(initialState);
    
    // Estados separados para os JSONFields (Checkboxes)
    const [sorologias, setSorologias] = useState({});
    const [triagens, setTriagens] = useState({});
    const [reanimacao, setReanimacao] = useState({});
    const [examesHosp, setExamesHosp] = useState({});

    // 1. FUNÇÃO DE CARREGAMENTO (Atualizada)
    // --- ★★★ CORREÇÃO DO LOOP INFINITO ESTÁ AQUI ★★★ ---
    const fetchAnamnese = useCallback(async () => {
        if (!pacienteId) return;
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            if (res.data && res.data.neonatologia) {
                setAnamneseData(res.data.neonatologia);
                setSorologias(res.data.neonatologia.sorologias || {});
                setTriagens(res.data.neonatologia.triagens || {});
                setReanimacao(res.data.neonatologia.reanimacao || {});
                setExamesHosp(res.data.neonatologia.exames_realizados || {});
            } else {
                setAnamneseData(initialState);
                setSorologias({});
                setTriagens({});
                setReanimacao({});
                setExamesHosp({});
            }
        } catch (err) {
            // Este erro é o que estava causando o loop
            if (err.response && err.response.status !== 404) {
                showSnackbar('Erro ao carregar histórico neonatal.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    // Removido 'showSnackbar' da lista de dependências para evitar o loop
    }, [pacienteId]);
    // --- FIM DA CORREÇÃO ---

    useEffect(() => {
        fetchAnamnese();
    }, [fetchAnamnese]);

    // 2. HANDLERS
    const handleChange = (e) => {
        setAnamneseData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    const handleCheckboxChange = (setter) => (e) => {
        setter(prev => ({ ...prev, [e.target.name]: e.target.checked }));
    };

    // 3. FUNÇÃO DE SALVAR (Atualizada)
    const handleSaveAnamnese = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);

        const payload = {
            ...anamneseData,
            sorologias: sorologias,
            triagens: triagens,
            reanimacao: reanimacao, // Salva o JSON de reanimação
            exames_realizados: examesHosp, // Salva o JSON de exames
        };

        try {
            // Usamos POST (ou PATCH) que a view get_or_create suporta
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
    
    // 4. Botão de Normalidade (Preenche os campos do PDF)
    const preencherNormalidade = () => {
        setAnamneseData(prev => ({
            ...prev,
            pre_natal: 'Adequado',
            tipo_gestacao: 'Única',
            corticoterapia: 'Não',
            neuroprotecao_mg: 'Não',
            tipo_parto: 'Normal',
            bolsa_rota: 'Rota <18h',
            liquido_amniotico: 'Claro',
            apgar: '9/10/10',
            reanimacao: {},
            ig_classificacao: 'A termo (37-41+6s)',
            peso_classificacao: 'Peso adequado (2500-3999g)',
            peso_adequacao: 'AIG',
            tempo_internacao: '2 dias',
            suporte_ventilatorio: 'Não aplicável',
            fototerapia: 'Não',
            npp: 'Não',
            antibioticos: 'Não',
        }));
        setSorologias({
            sifilis_status: false, toxo_status: false, hiv_status: false, hep_b_status: false, 
            hep_c_status: false, hsv_status: false, rubeola_status: false, cmv_status: false, zika_status: false
        });
        setTriagens({
            pezinho: true, orelhinha: true, olhinho: true, coracaozinho: true, linguinha: true
        });
        setReanimacao({ vpp: false, intubacao: false, massagem: false, adrenalina: false });
        setExamesHosp({});
        showSnackbar('Histórico preenchido com dados normais.', 'info');
    };
    
    // 5. Botão Limpar
    const handleLimpar = () => {
        setAnamneseData(initialState);
        setSorologias({});
        setTriagens({});
        setReanimacao({});
        setExamesHosp({});
        showSnackbar('Campos do histórico limpos.', 'info');
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // 6. JSX (Mapeado do PDF )
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 0 }}>
                    Histórico Neonatal (Anamnese)
                </Typography>
                <Button size="small" variant="outlined" onClick={preencherNormalidade}>Preencher Normalidade</Button>
            </Box>

            {/* --- I. HISTÓRIA PRÉ-NATAL --- [cite: 2] */}
            <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>1. História Pré-Natal</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.5 }}>
                <TextField label="Gesta (G)" name="gpa_g" size="small" sx={{minWidth: 80, flex: '1 1 80px'}}
                    value={anamneseData.gpa_g || ''} onChange={handleChange} />
                <TextField label="Para (P)" name="gpa_p" size="small" sx={{minWidth: 80, flex: '1 1 80px'}}
                    value={anamneseData.gpa_p || ''} onChange={handleChange} />
                <TextField label="Aborto (A)" name="gpa_a" size="small" sx={{minWidth: 80, flex: '1 1 80px'}}
                    value={anamneseData.gpa_a || ''} onChange={handleChange} />
                <TextField select label="Pré-Natal" name="pre_natal" value={anamneseData.pre_natal || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {preNatalOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Tipo Gestação" name="tipo_gestacao" value={anamneseData.tipo_gestacao || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {gestacaoTipoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Corticoterapia" name="corticoterapia" value={anamneseData.corticoterapia || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {simNaoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Neuroproteção MgSO4" name="neuroprotecao_mg" value={anamneseData.neuroprotecao_mg || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {simNaoIgnoradoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField label="Condições Maternas" name="intercorrencias_gestacao" multiline rows={2} fullWidth size="small"
                    value={anamneseData.intercorrencias_gestacao || ''} onChange={handleChange} placeholder="DMG, DHEG, HAC, etc." />
                <TextField label="Vícios" name="vicios_maternos" fullWidth size="small"
                    value={anamneseData.vicios_maternos || ''} onChange={handleChange} placeholder="Álcool, Tabaco, Drogas..." />
                <TextField label="TS Mãe" name="tipo_sanguineo_mae" size="small" sx={{minWidth: 120, flex: '1 1 120px'}}
                    value={anamneseData.tipo_sanguineo_mae || ''} onChange={handleChange} placeholder="Ex: O+"/>
                <TextField label="Coombs Ind." name="coombs_indireto" size="small" sx={{minWidth: 120, flex: '1 1 120px'}}
                    value={anamneseData.coombs_indireto || ''} onChange={handleChange} placeholder="Neg/Pos"/>
                <TextField label="TS RN" name="tipo_sanguineo_rn" size="small" sx={{minWidth: 120, flex: '1 1 120px'}}
                    value={anamneseData.tipo_sanguineo_rn || ''} onChange={handleChange} placeholder="Ex: A+"/>
                <TextField label="Coombs Dir." name="coombs_direto_rn" size="small" sx={{minWidth: 120, flex: '1 1 120px'}}
                    value={anamneseData.coombs_direto_rn || ''} onChange={handleChange} placeholder="Neg/Pos"/>
            </Box>

            {/* --- II. INFECÇÕES GESTACIONAIS --- [cite: 25] */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>2. Infecções Gestacionais (Status Materno)</Typography>
            <FormControl component="fieldset" size="small" sx={{mt: 1, width: '100%'}}>
                <FormLabel component="legend" sx={{fontSize: '0.9rem'}}>Sorologias:</FormLabel>
                <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                    {sorologiasOptions.map(opt => (
                        <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={sorologias[opt.id] || false} onChange={handleCheckboxChange(setSorologias)} name={opt.id} />} label={opt.label} />
                    ))}
                </FormGroup>
            </FormControl>
            <TextField label="Detalhes Infecções (Tratamento, Títulos, Carga Viral, etc.)" name="infeccoes_detalhes" multiline rows={3} fullWidth size="small" sx={{mt: 1.5}}
                value={anamneseData.infeccoes_detalhes || ''} onChange={handleChange} placeholder="Ex: Sífilis Reagente 1:2, Tto Adequado. HIV indetectável..." />

            {/* --- III. NASCIMENTO E PARTO --- [cite: 64] */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>3. Nascimento e Histórico do Parto</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.5 }}>
                <TextField select label="Tipo de Parto" name="tipo_parto" value={anamneseData.tipo_parto || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {partoTipoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Bolsa Amniótica" name="bolsa_rota" value={anamneseData.bolsa_rota || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {bolsaRotaOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Líquido Amniótico" name="liquido_amniotico" value={anamneseData.liquido_amniotico || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {liquidoAmnioticoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField label="APGAR (1'/5'/10')" name="apgar" value={anamneseData.apgar || ''} onChange={handleChange} size="small" placeholder="Ex: 8/9/10" sx={{minWidth: 170, flex: '1 1 170px'}}/>
                <TextField label="Peso Nasc. (g)" name="peso_nascimento" type="number" value={anamneseData.peso_nascimento || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}/>
                <TextField label="Compr. (cm)" name="comprimento" type="number" value={anamneseData.comprimento || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}/>
                <TextField label="PC (cm)" name="pc_nascimento" type="number" value={anamneseData.pc_nascimento || ''} onChange={handleChange} size="small" sx={{minWidth: 120, flex: '1 1 120px'}}/>
            </Box>
            <FormControl component="fieldset" size="small" sx={{mt: 2, width: '100%'}}>
                <FormLabel component="legend" sx={{fontSize: '0.9rem', fontWeight: 'medium'}}>Reanimação em Sala de Parto:</FormLabel>
                <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                    {reanimacaoOptions.map(opt => (
                        <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={reanimacao[opt.id] || false} onChange={handleCheckboxChange(setReanimacao)} name={opt.id} />} label={opt.label} />
                    ))}
                </FormGroup>
            </FormControl>
            <TextField label="Intercorrências do Parto" name="reanimacao_obs" multiline rows={2} fullWidth size="small" sx={{mt: 1.5}}
                value={anamneseData.reanimacao_obs || ''} onChange={handleChange} placeholder="Observações sobre reanimação, circular de cordão, etc." />

            {/* --- IV. HISTÓRICO HOSPITALAR --- [cite: 78] */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>4. Histórico Neonatal e Evolução Hospitalar</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.5 }}>
                 <TextField select label="Classificação IG" name="ig_classificacao" value={anamneseData.ig_classificacao || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {igClassOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Classificação Peso" name="peso_classificacao" value={anamneseData.peso_classificacao || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {pesoClassOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Adequação Peso/IG" name="peso_adequacao" value={anamneseData.peso_adequacao || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {pesoAdequacaoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                 <TextField label="Tempo Internação (dias)" name="tempo_internacao" value={anamneseData.tempo_internacao || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}/>
                <TextField select label="Suporte Ventilatório" name="suporte_ventilatorio" value={anamneseData.suporte_ventilatorio || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {simNaoAplicavelOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="Fototerapia" name="fototerapia" value={anamneseData.fototerapia || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {simNaoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField select label="NPP" name="npp" value={anamneseData.npp || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}>
                    {simNaoOptions.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <TextField label="Antibióticos (Esquema/dias)" name="antibioticos" value={anamneseData.antibioticos || ''} onChange={handleChange} size="small" sx={{minWidth: 170, flex: '1 1 170px'}}/>
            </Box>
            <FormControl component="fieldset" size="small" sx={{mt: 2, width: '100%'}}>
                <FormLabel component="legend" sx={{fontSize: '0.9rem', fontWeight: 'medium'}}>Exames Realizados na Internação:</FormLabel>
                <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                    {examesHospOptions.map(opt => (
                        <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={examesHosp[opt.id] || false} onChange={handleCheckboxChange(setExamesHosp)} name={opt.id} />} label={opt.label} />
                    ))}
                </FormGroup>
            </FormControl>
            <TextField label="Diagnósticos Principais (Alta)" name="diagnosticos_principais" multiline rows={2} fullWidth size="small" sx={{mt: 1.5}}
                value={anamneseData.diagnosticos_principais || ''} onChange={handleChange} placeholder="Ex: Icterícia neonatal, Sepse precoce, Hipoglicemia..."/>

            {/* --- VI. TRIAGENS --- [cite: 110] (Seção V é da Consulta Atual) */}
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