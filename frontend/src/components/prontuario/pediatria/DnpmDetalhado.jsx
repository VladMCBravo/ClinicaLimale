// src/components/prontuario/pediatria/DnpmDetalhado.jsx
// VERSÃO REATORADA: Salva apenas quando o PAI (AtendimentoPediatria) mandar.

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
    Paper, Typography, Box, CircularProgress,
    TextField, FormControlLabel, FormGroup, FormLabel, FormControl,
    Checkbox,
    Accordion, AccordionSummary, AccordionDetails, Grid,
    Select, MenuItem, InputLabel
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
const dnpmStatusOptions = [
    { value: 'Pendente', label: 'Pendente' },
    { value: 'Presente', label: 'Presente' },
    { value: 'Ausente', label: 'Ausente (Alerta)' },
];

// --- 1. Envolver componente com forwardRef ---
const DnpmDetalhado = forwardRef(({ pacienteId, onDataChange }, ref) => {
    const { showSnackbar } = useSnackbar();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // 2. State de Submissão
    const [marcosSalvos, setMarcosSalvos] = useState({});
    // const [observacoes, setObservacoes] = useState(""); // Este state não parece estar sendo usado
    const [dnpmResumo, setDnpmResumo] = useState({});
    const [expanded, setExpanded] = useState(false);
    
    // Este estado é usado para comparar o que mudou
    const [marcosIniciais, setMarcosIniciais] = useState({});

    const handleAccordionChange = (panel) => (event, isExpanded) => {
        setExpanded(isExpanded ? panel : false);
    };

    // --- fetchData (Sem alteração, mas agora também guarda o estado inicial) ---
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        console.log(`[DEBUG DNPM]  fetching... pacienteId: ${pacienteId}`);
        try {
            const resMarcos = await apiClient.get(`/prontuario/pacientes/${pacienteId}/marcos-dnpm/`);
            const resAnamnese = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            
            console.log('[DEBUG DNPM] 📦 Dados BRUTOS recebidos:', { 
                marcos: resMarcos.data, 
                anamnese: resAnamnese.data 
            });

            const mapaMarcos = resMarcos.data.reduce((acc, marco) => {
                let status;
                if (marco.alcançado === true) status = 'Presente';
                else if (marco.alcançado === false) status = 'Ausente';
                else status = 'Pendente';
                
                acc[marco.marco_id] = { 
                    ...marco, 
                    status: status, 
                    observacao: marco.observacao || ''
                };
                return acc;
            }, {});
            
            setMarcosSalvos(mapaMarcos);
            setMarcosIniciais(JSON.parse(JSON.stringify(mapaMarcos))); // Guarda cópia profunda inicial

            if (resAnamnese.data && resAnamnese.data.pediatrica && resAnamnese.data.pediatrica.dnpm) {
                setDnpmResumo(resAnamnese.data.pediatrica.dnpm);
            }
             console.log('[DEBUG DNPM] 🏁 Estado final (mapaMarcos):', mapaMarcos);
        } catch (err) { 
            console.error("[DEBUG DNPM] ❌ Erro no fetchData:", err);
            showSnackbar('Erro ao carregar dados de DNPM.', 'error'); 
        }
        finally { setIsLoading(false); }
    }, [pacienteId, showSnackbar]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // --- 3. Função de MUDANÇA (NÃO SALVA MAIS) ---
    // (antiga 'saveMarco')
    const handleMarcoChange = (marco_id, payload) => {
        console.log(`[DEBUG DNPM] ✍️  Mudança local... marco_id: ${marco_id}`, 'payload:', payload);
        
        const marcoExistente = marcosSalvos[marco_id];
        
        // --- Atualização do ESTADO LOCAL ---
        const optimisticData = {
            ...(marcoExistente || { 
                marco_id: marco_id, 
                // (descrição e idade serão adicionados no save real)
                status: 'Pendente',
                observacao: ''
            }),
            ...payload // Aplica as novas mudanças (ex: {alcançado: false} ou {observacao: '...'})
        };
        
        // Se 'alcançado' foi mudado (payload), atualiza o 'status' local
        if (payload.alcançado === true) optimisticData.status = 'Presente';
        else if (payload.alcançado === false) optimisticData.status = 'Ausente';
        else if (payload.alcançado === null) optimisticData.status = 'Pendente';

        setMarcosSalvos(prev => ({ ...prev, [marco_id]: optimisticData }));
        // --- Fim da Atualização ---
    };

    // --- 4. Função de MUDANÇA do Resumo (NÃO SALVA MAIS) ---
    const handleResumoChange = (event) => {
        const { name, checked } = event.target;
        const newResumo = { ...dnpmResumo, [name]: checked };
        setDnpmResumo(newResumo);
        
        console.log(`[DEBUG DNPM] ✍️  Mudança local (Resumo)...`, newResumo);
        // NENHUMA CHAMADA DE API AQUI
    };


    // --- 5. NOVA FUNÇÃO DE SALVAR (Chamada pelo PAI) ---
    const saveData = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        console.log('[SAVE DATA - DNPM] Iniciando salvamento...');

        const savePromises = [];

        // 1. Salvar o Resumo (sempre envia, API é idempotente)
        savePromises.push(
            apiClient.patch(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                pediatrica: { dnpm: dnpmResumo }
            })
        );
        
        // Mapeia todos os marcos das constantes para fácil acesso
        const allMarcosInfo = marcosPorIdade.flatMap(g => [g.motorGrosso, g.motorFino, g.linguagem, g.social]);

        // 2. Salvar os Marcos (apenas os alterados ou novos)
        for (const marco_id in marcosSalvos) {
            const localMarco = marcosSalvos[marco_id];
            const marcoInicial = marcosIniciais[marco_id];

            // Compara o estado atual com o inicial
            if (JSON.stringify(localMarco) === JSON.stringify(marcoInicial)) {
                continue; // Pula este marco, não mudou
            }

            console.log(`[SAVE DATA - DNPM] Alteração detectada em: ${marco_id}`);
            
            const marcoInfo = allMarcosInfo.find(m => m.id === marco_id);
            if (!marcoInfo) {
                console.error(`[SAVE DATA - DNPM] Marco ${marco_id} não encontrado nas constantes!`);
                continue;
            }

            // Prepara o payload completo
            const payload = {
                marco_id: marco_id,
                marco_descricao: marcoInfo.desc,
                idade_marco: marco_id.split('_')[0],
                alcançado: localMarco.status === 'Presente' ? true : (localMarco.status === 'Ausente' ? false : null),
                observacao: localMarco.observacao || ''
            };

            // Decide se é POST (novo) ou PATCH (existente)
            if (localMarco.id) { // 'id' é o ID do banco de dados
                savePromises.push(
                    apiClient.patch(`/prontuario/pacientes/${pacienteId}/marcos-dnpm/${localMarco.id}/`, payload)
                );
            } else {
                savePromises.push(
                    apiClient.post(`/prontuario/pacientes/${pacienteId}/marcos-dnpm/`, payload)
                );
            }
        }

        try {
            await Promise.all(savePromises);
            console.log('[SAVE DATA - DNPM] Salvo com sucesso!');
            // Opcional: Re-fetch para atualizar os estados iniciais e IDs
            // await fetchData(); 
            // O PAI dará o snackbar de sucesso
        } catch (err) {
            console.error("[SAVE DATA - DNPM] ❌ Erro ao salvar:", err);
            showSnackbar('Erro ao salvar dados do DNPM.', 'error');
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


    // (useEffect de expansão... sem alterações)
    useEffect(() => {
        if (!isLoading && Object.keys(marcosSalvos).length > 0) {
            const primeiroPendente = marcosPorIdade.find(grupo => {
                const mg_status = marcosSalvos[grupo.motorGrosso.id]?.status || 'Pendente';
                const mf_status = marcosSalvos[grupo.motorFino.id]?.status || 'Pendente';
                const ling_status = marcosSalvos[grupo.linguagem.id]?.status || 'Pendente';
                const soc_status = marcosSalvos[grupo.social.id]?.status || 'Pendente';
                return (mg_status !== 'Presente' || mf_status !== 'Presente' || ling_status !== 'Presente' || soc_status !== 'Presente'); 
            });
            if (primeiroPendente) setExpanded(primeiroPendente.idade);
            else if (marcosPorIdade.length > 0) setExpanded(marcosPorIdade[marcosPorIdade.length - 1].idade);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading]);


    // --- 7. Componente MarcoAvaliacao (Atualizado) ---
    const MarcoAvaliacao = ({ marco }) => {
        if (!marco) return null;

        const salvo = marcosSalvos[marco.id];
        const currentStatus = salvo?.status || 'Pendente';
        const currentObs = salvo?.observacao || '';
        
        return (
            <Box>
                {/* O Dropdown (Select) */}
                <FormControl size="small" fullWidth sx={{ mb: 1, minWidth: '200px' }}>
                    <InputLabel id={`label-${marco.id}`}>{marco.desc}</InputLabel>
                    <Select
                        labelId={`label-${marco.id}`}
                        id={`select-${marco.id}`}
                        value={currentStatus}
                        label={marco.desc}
                        onChange={(e) => {
                            const newStatus = e.target.value;
                            let alcançado_payload;
                            if (newStatus === 'Presente') alcançado_payload = true;
                            else if (newStatus === 'Ausente') alcançado_payload = false;
                            else alcançado_payload = null;
                            
                            // Chama a função que SÓ MUDA O ESTADO
                            handleMarcoChange(marco.id, { alcançado: alcançado_payload });
                        }}
                    >
                        {dnpmStatusOptions.map(opt => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                
                {/* O Campo "Descrever" (Condicional) */}
                {currentStatus === 'Ausente' && (
                    <TextField
                        label="Descrever"
                        size="small"
                        fullWidth
                        value={currentObs}
                        onChange={(e) => {
                            // Apenas atualiza o estado local (otimismo)
                            const newObs = e.target.value;
                            setMarcosSalvos(prev => ({
                                ...prev,
                                [marco.id]: { ...(prev[marco.id] || {}), observacao: newObs }
                            }));
                        }}
                        onBlur={() => {
                            // Chama a função que SÓ MUDA O ESTADO
                            handleMarcoChange(marco.id, { observacao: currentObs });
                        }}
                        sx={{ mb: 1 }}
                    />
                )}
            </Box>
        );
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // --- 8. JSX (com indicador de loading) ---
    return (
        <React.Fragment>
            {/* Bloco de Resumo (sem alteração) */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: 'grey.400' }}>
                <FormControl component="fieldset" size="small" sx={{width: '100%'}}>
                    <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <FormLabel component="legend" sx={{fontSize: '0.9rem', fontWeight: 500}}>Resumo da Avaliação</FormLabel>
                        {isSubmitting && <CircularProgress size={20} />}
                    </Box>
                    <FormGroup sx={{ display: 'flex', flexDirection: 'row' }}>
                         {dnpmOptions.map(opt => (
                            <FormControlLabel
                                key={opt.id}
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={dnpmResumo[opt.id] || false}
                                        onChange={handleResumoChange} // Chama a função que SÓ MUDA O ESTADO
                                        name={opt.id}
                                    />
                                }
                                label={opt.label}
                            />
                        ))}
                    </FormGroup>
                </FormControl>
            </Paper>
            
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
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <FormLabel sx={{fontSize: '0.8rem', fontWeight: 500, mb: 0.5, display: 'block'}}>Motor Grosso</FormLabel>
                                    <MarcoAvaliacao marco={linha.motorGrosso} />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <FormLabel sx={{fontSize: '0.8rem', fontWeight: 500, mb: 0.5, display: 'block'}}>Motor Fino</FormLabel>
                                    <MarcoAvaliacao marco={linha.motorFino} />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <FormLabel sx={{fontSize: '0.8rem', fontWeight: 500, mb: 0.5, display: 'block'}}>Linguagem/Audição</FormLabel>
                                    <MarcoAvaliacao marco={linha.linguagem} />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <FormLabel sx={{fontSize: '0.8rem', fontWeight: 500, mb: 0.5, display: 'block'}}>Social/Afetivo</FormLabel>
                                    <MarcoAvaliacao marco={linha.social} />
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Box>
        </React.Fragment>
    );
}); // --- Fim do forwardRef ---

export default DnpmDetalhado;