// src/components/prontuario/pediatria/DnpmDetalhado.jsx
// VERSÃO REVISADA E FUNCIONAL (Com Resumo)

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, Box, Button, CircularProgress,
    TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
    Checkbox, TextField, FormControlLabel, FormGroup, FormLabel, FormControl
} from '@mui/material';
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

export default function DnpmDetalhado({ pacienteId, onDataChange }) {
    const { showSnackbar } = useSnackbar();
    const [isLoading, setIsLoading] = useState(true);
    const [marcosSalvos, setMarcosSalvos] = useState({});
    const [observacoes, setObservacoes] = useState("");
    
    // 1. ADICIONAR ESTADO PARA O RESUMO
    const [dnpmResumo, setDnpmResumo] = useState({
        dnpm_normal_idade: false,
        dnpm_sinais_alerta: false,
        dnpm_atraso: false
    });
    
    // 2. ATUALIZAR FUNÇÃO DE FETCH (agora busca marcos E resumo)
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // 2a. Busca os marcos detalhados (lógica existente)
            const resMarcos = await apiClient.get(`/prontuario/pacientes/${pacienteId}/marcos-dnpm/`);
            const mapaMarcos = resMarcos.data.reduce((acc, marco) => {
                acc[marco.marco_id] = marco;
                return acc;
            }, {});
            setMarcosSalvos(mapaMarcos);

            // 2b. Busca os dados da anamnese para o resumo
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
        fetchData(); // 3. Chama a nova função
    }, [fetchData]);

    // Handler de salvamento para os MARCOS (lógica existente)
    const handleToggleMarco = async (marco, checked) => {
        const { id: marco_id, desc: marco_descricao } = marco;
        const marcoExistente = marcosSalvos[marco_id];
        
        setMarcosSalvos(prev => ({
            ...prev,
            [marco_id]: {
                ...(prev[marco_id] || {}),
                alcançado: checked,
                marco_id: marco_id,
            }
        }));

        try {
            if (marcoExistente) {
                await apiClient.patch(`/prontuario/pacientes/${pacienteId}/marcos-dnpm/${marcoExistente.id}/`, {
                    alcançado: checked
                });
            } else {
                const res = await apiClient.post(`/prontuario/pacientes/${pacienteId}/marcos-dnpm/`, {
                    marco_id: marco_id,
                    marco_descricao: marco_descricao,
                    idade_marco: marco_id.split('_')[0],
                    alcançado: checked
                });
                setMarcosSalvos(prev => ({ ...prev, [marco_id]: res.data }));
            }
            if (onDataChange) {
                onDataChange();
            }
        } catch (err) {
            showSnackbar('Erro ao salvar marco.', 'error');
            setMarcosSalvos(prev => ({
                ...prev,
                [marco_id]: {
                    ...prev[marco_id],
                    alcançado: !checked,
                }
            }));
        }
    };

    // 4. NOVO HANDLER para salvar o RESUMO
    const handleResumoChange = async (event) => {
        const { name, checked } = event.target;
        
        // Atualiza o estado local (otimismo)
        const newResumo = {
            ...dnpmResumo,
            [name]: checked
        };
        setDnpmResumo(newResumo);

        try {
            // Salva o resumo (PATCH) na Anamnese
            // (Note que estamos salvando o objeto 'pediatrica' aninhado)
            await apiClient.patch(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                pediatrica: {
                    dnpm: newResumo
                }
            });
            
            // Atualiza o indicador no cabeçalho
            if (onDataChange) {
                onDataChange();
            }
            showSnackbar('Resumo do DNPM atualizado!', 'success');
        } catch (err) {
            showSnackbar('Erro ao salvar resumo do DNPM.', 'error');
            // Reverte em caso de erro
            setDnpmResumo(prev => ({...prev, [name]: !checked}));
        }
    };
    
    // Componente de Checkbox (sem alteração)
    const MarcoCheckbox = ({ marco }) => {
        if (!marco) return <TableCell />;
        const salvo = marcosSalvos[marco.id];
        const isChecked = salvo ? salvo.alcançado : false;
        
        return (
            <TableCell>
                <FormControlLabel
                    control={
                        <Checkbox
                            size="small"
                            checked={isChecked}
                            onChange={(e) => handleToggleMarco(marco, e.target.checked)}
                        />
                    }
                    label={marco.desc}
                />
            </TableCell>
        );
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // 5. JSX REVISADO (Com <React.Fragment> e handlers)
    return (
        <React.Fragment> {/* <-- 5a. Adicionado Fragmento para envolver os dois Papers */}
            
            {/* Bloco de Resumo (agora funcional) */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: 'grey.400' }}>
                <FormControl component="fieldset" size="small">
                    <FormLabel component="legend" sx={{fontWeight: 'bold', color: 'text.primary'}}>
                        Resumo do DNPM (para indicador)
                    </FormLabel>
                    <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
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
            
            {/* Bloco de Marcos Detalhados (sem alteração) */}
            <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Marcos do Desenvolvimento Neuropsicomotor (DNPM)
                </Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{fontWeight: 'bold'}}>Idade</TableCell>
                                <TableCell sx={{fontWeight: 'bold'}}>Motor Grosso</TableCell>
                                <TableCell sx={{fontWeight: 'bold'}}>Motor Fino</TableCell>
                                <TableCell sx={{fontWeight: 'bold'}}>Linguagem/Audição</TableCell>
                                <TableCell sx={{fontWeight: 'bold'}}>Social/Afetivo</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {marcosPorIdade.map((linha) => (
                                <TableRow key={linha.idade}>
                                    <TableCell sx={{fontWeight: 'bold'}}>{linha.idade}</TableCell>
                                    <MarcoCheckbox marco={linha.motorGrosso} />
                                    <MarcoCheckbox marco={linha.motorFino} />
                                    <MarcoCheckbox marco={linha.linguagem} />
                                    <MarcoCheckbox marco={linha.social} />
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TextField
                    label="Observações gerais do desenvolvimento"
                    multiline
                    rows={3}
                    fullWidth
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    size="small"
                    sx={{ mt: 2 }}
                />
            </Paper>
            
        </React.Fragment> // <-- 5b. Fechamento do Fragmento
    );
}