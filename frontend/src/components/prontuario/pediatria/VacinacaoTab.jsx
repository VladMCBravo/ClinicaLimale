// src/components/prontuario/pediatria/VacinacaoTab.jsx
// NOVO COMPONENTE (Aba 4)

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, Box, CircularProgress,
    TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
    TextField, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import apiClient from '../../../api/axiosConfig'

// 1. Dados da tabela, baseados no PNI 2025 do seu PDF
const pniSchedule = [
    { idade: 'Ao nascer', vacinas: [
        { id: 'bcg', nome: 'BCG', dose: 'Dose Única' },
        { id: 'hep_b_0', nome: 'Hepatite B', dose: '1ª Dose (ao nascer)' }
    ]},
    { idade: '2 meses', vacinas: [
        { id: 'penta_1', nome: 'Pentavalente', dose: '1ª Dose' },
        { id: 'vip_1', nome: 'VIP (Pólio)', dose: '1ª Dose' },
        { id: 'rota_1', nome: 'Rotavírus', dose: '1ª Dose' },
        { id: 'pneumo_1', nome: 'Pneumo 10', dose: '1ª Dose' }
    ]},
    { idade: '3 meses', vacinas: [
        { id: 'meno_acwy_1', nome: 'Meningocócica ACWY', dose: '1ª Dose' }
    ]},
    { idade: '4 meses', vacinas: [
        { id: 'penta_2', nome: 'Pentavalente', dose: '2ª Dose' },
        { id: 'vip_2', nome: 'VIP (Pólio)', dose: '2ª Dose' },
        { id: 'rota_2', nome: 'Rotavírus', dose: '2ª Dose' },
        { id: 'pneumo_2', nome: 'Pneumo 10', dose: '2ª Dose' }
    ]},
    { idade: '5 meses', vacinas: [
        { id: 'meno_acwy_2', nome: 'Meningocócica ACWY', dose: '2ª Dose' }
    ]},
    { idade: '6 meses', vacinas: [
        { id: 'penta_3', nome: 'Pentavalente', dose: '3ª Dose' },
        { id: 'vip_3', nome: 'VIP (Pólio)', dose: '3ª Dose' }
    ]},
    { idade: '9 meses', vacinas: [
        { id: 'febre_amarela', nome: 'Febre Amarela', dose: 'Dose Inicial' }
    ]},
    { idade: '12 meses', vacinas: [
        { id: 'triplice_1', nome: 'Tríplice Viral', dose: '1ª Dose' },
        { id: 'pneumo_r', nome: 'Pneumo 10', dose: 'Reforço' },
        { id: 'meno_acwy_r', nome: 'Meningo ACWY', dose: 'Reforço' }
    ]}
];

export default function VacinacaoTab({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const [isLoading, setIsLoading] = useState(true);
    // Armazena os registros do backend, mapeados por 'nome_vacina' + 'dose'
    const [vacinasSalvas, setVacinasSalvas] = useState({});

    // 2. Função para buscar os dados
    const fetchVacinas = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/vacinas/`);
            // Transforma o array em um mapa [nome_vacina + dose] -> {objeto_vacina}
            const mapaVacinas = res.data.reduce((acc, vacina) => {
                const key = `${vacina.nome_vacina}_${vacina.dose}`;
                acc[key] = vacina;
                return acc;
            }, {});
            setVacinasSalvas(mapaVacinas);
        } catch (err) {
            showSnackbar('Erro ao carregar caderneta de vacinação.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [pacienteId, showSnackbar]);

    useEffect(() => {
        fetchVacinas();
    }, [fetchVacinas]);

    // 3. Função de "on change" (Cria ou Atualiza)
    const handleVacinaChange = async (vacinaInfo, field, newValue) => {
        const { nome, dose, idade } = vacinaInfo;
        const key = `${nome}_${dose}`;
        const vacinaExistente = vacinasSalvas[key];

        // Cria o payload (só com o campo que mudou)
        const payload = { [field]: newValue };
        
        // Otimismo: Atualiza o estado local imediatamente
        const oldState = vacinasSalvas; // Guarda estado anterior p/ reverter
        setVacinasSalvas(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] || { 
                    nome_vacina: nome, 
                    dose: dose, 
                    idade_recomendada: idade 
                }),
                ...payload // Aplica a mudança
            }
        }));

        try {
            if (vacinaExistente) {
                // Atualiza (PATCH) registro existente
                await apiClient.patch(`/prontuario/pacientes/${pacienteId}/vacinas/${vacinaExistente.id}/`, payload);
            } else {
                // Cria (POST) novo registro
                const res = await apiClient.post(`/prontuario/pacientes/${pacienteId}/vacinas/`, {
                    nome_vacina: nome,
                    dose: dose,
                    idade_recomendada: idade,
                    ...payload // Adiciona o campo que mudou (ex: status: 'Aplicada')
                });
                // Atualiza o estado local com o ID do DB
                setVacinasSalvas(prev => ({ ...prev, [key]: res.data }));
            }
            // showSnackbar('Registro de vacina salvo!', 'success'); // (Opcional: pode poluir)
        } catch (err) {
            showSnackbar('Erro ao salvar vacina.', 'error');
            setVacinasSalvas(oldState); // Reverte o estado em caso de erro
        }
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // 4. Renderização da Tabela
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Caderneta de Vacinação (PNI 2025)
            </Typography>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{fontWeight: 'bold'}}>Idade</TableCell>
                            <TableCell sx={{fontWeight: 'bold'}}>Vacina</TableCell>
                            <TableCell sx={{fontWeight: 'bold'}}>Status</TableCell>
                            <TableCell sx={{fontWeight: 'bold'}}>Data Aplicação</TableCell>
                            <TableCell sx={{fontWeight: 'bold', minWidth: '150px'}}>Observações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {pniSchedule.map((grupo, index) => (
                            // Usamos Fragment para agrupar as linhas de uma idade
                            <React.Fragment key={grupo.idade}>
                                {grupo.vacinas.map((vacina, vacIndex) => {
                                    const key = `${vacina.nome}_${vacina.dose}`;
                                    const dadosSalvos = vacinasSalvas[key] || {};
                                    const vacinaInfo = { nome: vacina.nome, dose: vacina.dose, idade: grupo.idade };

                                    return (
                                        <TableRow key={key}>
                                            {/* Célula da Idade (só aparece na 1ª linha do grupo) */}
                                            {vacIndex === 0 ? (
                                                <TableCell rowSpan={grupo.vacinas.length} sx={{ fontWeight: 'bold', verticalAlign: 'top' }}>
                                                    {grupo.idade}
                                                </TableCell>
                                            ) : null}
                                            
                                            {/* Célula da Vacina */}
                                            <TableCell>
                                                <Typography variant="body2" sx={{fontWeight: '500'}}>{vacina.nome}</Typography>
                                                <Typography variant="caption" color="textSecondary">{vacina.dose}</Typography>
                                            </TableCell>
                                            
                                            {/* Célula do Status */}
                                            <TableCell>
                                                <FormControl size="small" fullWidth sx={{minWidth: '120px'}}>
                                                    <InputLabel id={`status-label-${key}`}>Status</InputLabel>
                                                    <Select
                                                        labelId={`status-label-${key}`}
                                                        label="Status"
                                                        value={dadosSalvos.status || 'Pendente'}
                                                        onChange={(e) => handleVacinaChange(vacinaInfo, 'status', e.target.value)}
                                                    >
                                                        <MenuItem value="Pendente">Pendente</MenuItem>
                                                        <MenuItem value="Aplicada">Aplicada</MenuItem>
                                                        <MenuItem value="Atrasada">Atrasada</MenuItem>
                                                        <MenuItem value="Não se aplica">Não se aplica</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </TableCell>

                                            {/* Célula da Data */}
                                            <TableCell>
                                                <TextField
                                                    type="date"
                                                    size="small"
                                                    InputLabelProps={{ shrink: true }}
                                                    value={dadosSalvos.data_aplicacao || ''}
                                                    onChange={(e) => handleVacinaChange(vacinaInfo, 'data_aplicacao', e.target.value || null)}
                                                />
                                            </TableCell>

                                            {/* Célula de Observações */}
                                            <TableCell>
                                                <TextField
                                                    placeholder="Lote, clínica, etc."
                                                    size="small"
                                                    fullWidth
                                                    defaultValue={dadosSalvos.observacao || ''}
                                                    // Usamos onBlur para salvar ao sair do campo
                                                    onBlur={(e) => handleVacinaChange(vacinaInfo, 'observacao', e.target.value)}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}