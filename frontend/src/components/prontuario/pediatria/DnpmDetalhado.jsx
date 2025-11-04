// src/components/prontuario/pediatria/DnpmDetalhado.jsx
// VERSÃO ATUALIZADA: Troca Checkbox por Select (Dropdown) Sim/Não/Pendente

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, Box, Button, CircularProgress,
    TextField, FormControlLabel, FormGroup, FormLabel, FormControl,
    Checkbox,
    Accordion, AccordionSummary, AccordionDetails, Grid,
    // --- ALTERAÇÃO 1: NOVOS IMPORTS ---
    Select, MenuItem, InputLabel
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
// Caminho corrigido para 3 níveis (src/components/prontuario/pediatria -> src/contexts)
import { useSnackbar } from '../../../contexts/SnackbarContext'; 
import apiClient from '../../../api/axiosConfig';

// (definição de marcosPorIdade omitida para brevidade)
const marcosPorIdade = [
    { idade: '1m', motorGrosso: { id: '1m_motor_grosso', desc: 'Sustenta parcial cabeça' }, motorFino: { id: '1m_motor_fino', desc: 'Reflexo palmar' }, linguagem: { id: '1m_linguagem', desc: 'Reage a som forte' }, social: { id: '1m_social', desc: 'Olhar fixo no rosto' } },
    { idade: '2m', motorGrosso: { id: '2m_motor_grosso', desc: 'Controle cefálico melhor' }, motorFino: { id: '2m_motor_fino', desc: 'Abre mãos' }, linguagem: { id: '2m_linguagem', desc: 'Vocaliza vogais' }, social: { id: '2m_social', desc: 'Sorriso social' } },
    { idade: '3m', motorGrosso: { id: '3m_motor_grosso', desc: 'Apoia antebraços' }, motorFino: { id: '3m_motor_fino', desc: 'Segura chocalho' }, linguagem: { id: '3m_linguagem', desc: 'Balbucia' }, social: { id: '3m_social', desc: 'Reage à voz' } },
    { idade: '4m', motorGrosso: { id: '4m_motor_grosso', desc: 'Cabeça firme' }, motorFino: { id: '4m_motor_fino', desc: 'Mãos à linha média' }, linguagem: { id: '4m_linguagem', desc: 'Ri alto' }, social: { id: '4m_social', desc: 'Procura sons' } },
    { idade: '5m', motorGrosso: { id: '5m_motor_grosso', desc: 'Apoia mãos sentado' }, motorFino: { id: '5m_motor_fino', desc: 'Pega voluntária' }, linguagem: { id: '5m_linguagem', desc: 'Brinca com voz' }, social: { id: '5m_social', desc: 'Reconhece cuidadores' } },
    { idade: '6m', motorGrosso: { id: '6m_motor_grosso', desc: 'Senta com apoio' }, motorFino: { id: '6m_motor_fino', desc: 'Transfere objetos' }, linguagem: { id: '6m_linguagem', desc: 'Sons variados' }, social: { id: '6m_social', desc: 'Estranheza leve' } },
    { idade: '7m', motorGrosso: { id: '7m_motor_grosso', desc: 'Senta sem apoio' }, motorFino: { id: '7m_motor_fino', desc: 'Pinça grosseira' }, linguagem: { id: '7m_linguagem', desc: 'Balbucio repetido' }, social: { id: '7m_social', desc: 'Responde ao nome' } },
    { idade: '8m', motorGrosso: { id: '8m_motor_grosso', desc: 'Engatinha' }, motorFino: { id: '8m_motor_fino', desc: 'Solta objetos' }, linguagem: { id: '8m_linguagem', desc: 'Imita entonações' }, social: { id: '8m_social', desc: 'Estranha pessoas' } },
    { idade: '9m', motorGrosso: { id: '9m_motor_grosso', desc: 'Põe-se em pé c/ apoio' }, motorFino: { id: '9m_motor_fino', desc: 'Pinça fina inicial' }, linguagem: { id: '9m_linguagem', desc: 'Entende "não"' }, social: { id: '9m_social', desc: 'Imitativo' } },
    { idade: '10m', motorGrosso: { id: '10m_motor_grosso', desc: 'Anda com apoio' }, motorFino: { id: '10m_motor_fino', desc: 'Pinça fina precisa' }, linguagem: { id: '10m_linguagem', desc: 'Imita sons/gestos' }, social: { id: '10m_social', desc: 'Acena' } },
    { idade: '11m', motorGrosso: { id: '11m_motor_grosso', desc: 'Passos com apoio' }, motorFino: { id: '11m_motor_fino', desc: 'Manipula bilateral' }, linguagem: { id: '11m_linguagem', desc: '1-2 palavras' }, social: { id: '11m_social', desc: 'Imita gestos' } },
    { idade: '12m', motorGrosso: { id: '12m_motor_grosso', desc: 'Anda sozinho' }, motorFino: { id: '12m_motor_fino', desc: 'Empilha 2 blocos' }, linguagem: { id: '12m_linguagem', desc: '2-3 palavras' }, social: { id: '12m_social', desc: 'Bate palmas, tchau' } },
];
const dnpmOptions = [
    { id: 'dnpm_normal_idade', label: 'DNPM adequado para idade' },
    { id: 'dnpm_sinais_alerta', label: 'Sinais de Alerta' },
    { id: 'dnpm_atraso', label: 'Atraso no DNPM' },
];

// --- ALTERAÇÃO 2: OPÇÕES PARA O DROPDOWN ---
const dnpmStatusOptions = [
    { value: 'Pendente', label: 'Pendente' },
    { value: 'Sim', label: 'Sim (Alcançado)' },
    { value: 'Não', label: 'Não (Alerta)' },
];

export default function DnpmDetalhado({ pacienteId, onDataChange }) {
    const { showSnackbar } = useSnackbar();
    const [isLoading, setIsLoading] = useState(true);
    const [marcosSalvos, setMarcosSalvos] = useState({});
    const [observacoes, setObservacoes] = useState("");
    const [dnpmResumo, setDnpmResumo] = useState({});
    const [expanded, setExpanded] = useState(false);

    const handleAccordionChange = (panel) => (event, isExpanded) => {
        setExpanded(isExpanded ? panel : false);
    };

    // --- ALTERAÇÃO 3: FETCHDATA ATUALIZADO (Traduz alcançado -> status) ---
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const resMarcos = await apiClient.get(`/prontuario/pacientes/${pacienteId}/marcos-dnpm/`);
            
            // Converte a resposta da API (alcançado: true/false/null) 
            // para um estado local (status: 'Sim'/'Não'/'Pendente')
            const mapaMarcos = resMarcos.data.reduce((acc, marco) => {
                let status;
                if (marco.alcançado === true) status = 'Sim';
                else if (marco.alcançado === false) status = 'Não';
                else status = 'Pendente'; // Se for null ou undefined
                
                acc[marco.marco_id] = { ...marco, status: status }; // Adiciona o status local
                return acc;
            }, {});
            setMarcosSalvos(mapaMarcos);

            const resAnamnese = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            if (resAnamnese.data && resAnamnese.data.pediatrica && resAnamnese.data.pediatrica.dnpm) {
                setDnpmResumo(resAnamnese.data.pediatrica.dnpm);
            }

        } catch (err) {
            showSnackbar('Erro ao carregar dados de DNPM.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [pacienteId, showSnackbar]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- ALTERAÇÃO 4: NOVA FUNÇÃO DE SALVAMENTO (Traduz status -> alcançado) ---
    const handleMarcoChange = async (marco, newStatus) => {
        const { id: marco_id, desc: marco_descricao } = marco;
        const marcoExistente = marcosSalvos[marco_id];
        const oldState = marcosSalvos; // Guarda estado anterior para reverter em caso de erro

        // 1. Traduz o status do dropdown (string) para o que a API espera (boolean/null)
        let alcançado_payload;
        if (newStatus === 'Sim') alcançado_payload = true;
        else if (newStatus === 'Não') alcançado_payload = false;
        else alcançado_payload = null; // 'Pendente'

        // 2. Atualização Otimista da UI
        setMarcosSalvos(prev => ({
            ...prev,
            [marco_id]: {
                ...(prev[marco_id] || { 
                    marco_id: marco_id, 
                    marco_descricao: marco_descricao,
                    idade_marco: marco_id.split('_')[0]
                }),
                status: newStatus, // Atualiza o status (string) local
                alcançado: alcançado_payload // Atualiza o alcançado (bool) local
            }
        }));

        // 3. Chamada de API
        try {
            const payload = { alcançado: alcançado_payload }; // Envia apenas o bool/null

            if (marcoExistente?.id) { // Se já existe no banco (tem ID)
                await apiClient.patch(`/prontuario/pacientes/${pacienteId}/marcos-dnpm/${marcoExistente.id}/`, payload);
            } else { // Se é novo (não tem ID)
                const res = await apiClient.post(`/prontuario/pacientes/${pacienteId}/marcos-dnpm/`, {
                    marco_id: marco_id,
                    marco_descricao: marco_descricao,
                    idade_marco: marco_id.split('_')[0],
                    ...payload
                });
                // Atualiza o estado local com os dados do novo item (incluindo o ID)
                setMarcosSalvos(prev => ({ ...prev, [marco_id]: { ...res.data, status: newStatus } }));
            }
            if (onDataChange) {
                onDataChange();
            }
        } catch (err) {
            showSnackbar('Erro ao salvar marco.', 'error');
            setMarcosSalvos(oldState); // Reverte a UI em caso de erro
        }
    };

    // Handler do Resumo (sem alteração)
    const handleResumoChange = async (event) => {
        const { name, checked } = event.target;
        const newResumo = { ...dnpmResumo, [name]: checked };
        setDnpmResumo(newResumo);
        try {
            await apiClient.patch(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                pediatrica: { dnpm: newResumo }
            });
            if (onDataChange) onDataChange();
            showSnackbar('Resumo do DNPM atualizado!', 'success');
        } catch (err) {
            showSnackbar('Erro ao salvar resumo do DNPM.', 'error');
            setDnpmResumo(prev => ({...prev, [name]: !checked}));
        }
    };

    // --- ALTERAÇÃO 5: LÓGICA DE EXPANSÃO (Verifica 'status' em vez de 'alcançado') ---
    useEffect(() => {
        if (!isLoading && Object.keys(marcosSalvos).length > 0) {
            
            const primeiroPendente = marcosPorIdade.find(grupo => {
                // Pega o status de cada marco (ou 'Pendente' se não existir)
                const mg_status = marcosSalvos[grupo.motorGrosso.id]?.status || 'Pendente';
                const mf_status = marcosSalvos[grupo.motorFino.id]?.status || 'Pendente';
                const ling_status = marcosSalvos[grupo.linguagem.id]?.status || 'Pendente';
                const soc_status = marcosSalvos[grupo.social.id]?.status || 'Pendente';
                
                // Retorna true (para o 'find') se QUALQUER marco não for 'Sim'
                return (mg_status !== 'Sim' || mf_status !== 'Sim' || ling_status !== 'Sim' || soc_status !== 'Sim'); 
            });

            if (primeiroPendente) {
                setExpanded(primeiroPendente.idade);
            } else if (marcosPorIdade.length > 0) {
                setExpanded(marcosPorIdade[marcosPorIdade.length - 1].idade);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, marcosSalvos]); // Roda após o fetch dos dados


    // --- ALTERAÇÃO 6: NOVO COMPONENTE (MarcoSelect) ---
    const MarcoSelect = ({ marco }) => {
        if (!marco) return null;

        const salvo = marcosSalvos[marco.id];
        // O valor padrão é 'Pendente' se não houver 'status' salvo
        const currentStatus = salvo?.status || 'Pendente'; 
        
        return (
            // Renderiza um FormControl completo com Label e Select
            <FormControl size="small" fullWidth sx={{ mb: 1, minWidth: '220px' }}>
                <InputLabel id={`label-${marco.id}`}>{marco.desc}</InputLabel>
                <Select
                    labelId={`label-${marco.id}`}
                    id={`select-${marco.id}`}
                    value={currentStatus}
                    label={marco.desc} // Importante para o layout do label
                    onChange={(e) => handleMarcoChange(marco, e.target.value)}
                >
                    {dnpmStatusOptions.map(opt => (
                        <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        );
    };


    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    return (
        <React.Fragment>
            {/* Bloco de Resumo */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: 'grey.400' }}>
                <FormControl component="fieldset" size="small">
                    <FormLabel component="legend" sx={{fontSize: '0.9rem', fontWeight: 500}}>Resumo da Avaliação</FormLabel>
                    <FormGroup sx={{ display: 'flex', flexDirection: 'row' }}>
                         {dnpmOptions.map(opt => (
                            <FormControlLabel
                                key={opt.id}
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={dnpmResumo[opt.id] || false}
                                        onChange={handleResumoChange}
                                        name={opt.id}
                                    />
                                }
                                label={opt.label}
                            />
                        ))}
                    </FormGroup>
                </FormControl>
            </Paper>
            
            {/* Bloco de Marcos Detalhados (Accordion) */}
            <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', px: 1, mb: 1 }}>
                    Marcos do Desenvolvimento Neuropsicomotor (DNPM)
                </Typography>

                {marcosPorIdade.map((linha) => (
                    <Accordion 
                        key={linha.idade} 
                        expanded={expanded === linha.idade} 
                        onChange={handleAccordionChange(linha.idade)}
                        sx={expanded === linha.idade ? { border: '1px solid', borderColor: 'primary.main' } : {}}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls={`panel-${linha.idade}-content`}
                            id={`panel-${linha.idade}-header`}
                        >
                            <Typography sx={{ fontWeight: 'bold', width: '33%', flexShrink: 0 }}>
                                {linha.idade}
                            </Typography>
                            <Typography sx={{ color: 'text.secondary' }}>
                                {linha.motorGrosso.desc}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {/* --- ALTERAÇÃO 7: JSX ATUALIZADO (Usa MarcoSelect) --- */}
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <MarcoSelect marco={linha.motorGrosso} />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <MarcoSelect marco={linha.motorFino} />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <MarcoSelect marco={linha.linguagem} />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <MarcoSelect marco={linha.social} />
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Box>

            {/* Bloco de Observações */}
            <Paper variant="outlined" sx={{ p: 2, mt: 2, borderColor: 'grey.400' }}>
                <TextField
                    label="Observações gerais do desenvolvimento"
                    multiline
                    rows={3}
                    fullWidth
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    size="small"
                />
            </Paper>
            
        </React.Fragment>
    );
}