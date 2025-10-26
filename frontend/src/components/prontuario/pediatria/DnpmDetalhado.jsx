// src/components/prontuario/pediatria/DnpmDetalhado.jsx
// NOVO COMPONENTE (Aba 3)

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, Box, Button, CircularProgress,
    TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
    Checkbox, TextField, FormControlLabel
} from '@mui/material';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import apiClient from '../../../api/axiosConfig'

// 1. Dados da tabela, baseados no PDF (pág. 2)
// Usamos o 'id' como chave única para a API
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

export default function DnpmDetalhado({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const [isLoading, setIsLoading] = useState(true);
    // Armazena os marcos salvos no backend, mapeados por 'marco_id'
    const [marcosSalvos, setMarcosSalvos] = useState({});
    // Armazena as observações
    const [observacoes, setObservacoes] = useState("");
    
    // 2. Função para buscar os dados
    const fetchMarcos = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/marcos-dnpm/`);
            // Transforma o array em um mapa [marco_id] -> {objeto_marco}
            const mapaMarcos = res.data.reduce((acc, marco) => {
                acc[marco.marco_id] = marco;
                return acc;
            }, {});
            setMarcosSalvos(mapaMarcos);
            // (Futuramente, podemos carregar a observação geral também)
        } catch (err) {
            showSnackbar('Erro ao carregar marcos de DNPM.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [pacienteId, showSnackbar]);

    useEffect(() => {
        fetchMarcos();
    }, [fetchMarcos]);

    // 3. Função de "clique" no checkbox (Cria ou Atualiza)
    const handleToggleMarco = async (marco, checked) => {
        const { id: marco_id, desc: marco_descricao } = marco;
        const marcoExistente = marcosSalvos[marco_id];
        
        // Atualiza o estado local imediatamente para feedback visual
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
                // Atualiza (PATCH) marco existente
                await apiClient.patch(`/prontuario/pacientes/${pacienteId}/marcos-dnpm/${marcoExistente.id}/`, {
                    alcançado: checked
                });
            } else {
                // Cria (POST) novo marco
                const res = await apiClient.post(`/prontuario/pacientes/${pacienteId}/marcos-dnpm/`, {
                    marco_id: marco_id,
                    marco_descricao: marco_descricao,
                    idade_marco: marco_id.split('_')[0], // ex: '1m'
                    alcançado: checked
                });
                // Atualiza o estado local com o objeto completo (incluindo o 'id')
                setMarcosSalvos(prev => ({ ...prev, [marco_id]: res.data }));
            }
            // showSnackbar(`Marco '${marco_descricao}' salvo!`, 'success');
        } catch (err) {
            showSnackbar('Erro ao salvar marco.', 'error');
            // Reverte o estado local em caso de erro
            setMarcosSalvos(prev => ({
                ...prev,
                [marco_id]: {
                    ...prev[marco_id],
                    alcançado: !checked,
                }
            }));
        }
    };
    
    // 4. Componente de Checkbox reutilizável
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

    // 5. Renderização da Tabela
    return (
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
            {/* <Button variant="contained" sx={{mt: 1, float: 'right'}}>Salvar Observações</Button> */}
        </Paper>
    );
}