// src/components/prontuario/pediatria/VacinacaoTab.jsx
// ATUALIZADO para chamar onDataChange

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, Box, CircularProgress,
    TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
    TextField, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import apiClient from '../../../api/axiosConfig'

// ATUALIZADO com Gripe, COVID, 15 meses e 4 anos
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
        // PNI padrão usa Meningo C. Manter ACWY se for o padrão da clínica.
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
        { id: 'vip_3', nome: 'VIP (Pólio)', dose: '3ª Dose' },
        { id: 'influenza_1', nome: 'Influenza (Gripe)', dose: '1ª Dose (Campanha)' }, //
        { id: 'covid_1', nome: 'COVID-19', dose: '1ª Dose' } //
    ]},
    { idade: '7 meses', vacinas: [
        // A Influenza pode ter a 2ª dose aqui (30 dias após a 1ª) se for a primovacinação
        { id: 'influenza_2', nome: 'Influenza (Gripe)', dose: '2ª Dose (se primovacinação)' }, 
        { id: 'covid_2', nome: 'COVID-19', dose: '2ª Dose' } //
    ]},
     { idade: '9 meses', vacinas: [
        { id: 'febre_amarela', nome: 'Febre Amarela', dose: 'Dose Inicial' },
        { id: 'covid_3', nome: 'COVID-19', dose: '3ª Dose' } //
    ]},
    { idade: '12 meses', vacinas: [
        { id: 'triplice_1', nome: 'Tríplice Viral', dose: '1ª Dose' },
        { id: 'pneumo_r', nome: 'Pneumo 10', dose: 'Reforço' },
        { id: 'meno_acwy_r', nome: 'Meningo ACWY', dose: 'Reforço' }
    ]},
    { idade: '15 meses', vacinas: [ //
        { id: 'dtp_r1', nome: 'DTP (Tríplice Bact.)', dose: '1º Reforço' },
        { id: 'vop_r1', nome: 'VOP (Pólio Oral)', dose: '1º Reforço' }, // Ou VIP, conforme nova recomendação PNI
        { id: 'hep_a', nome: 'Hepatite A', dose: 'Dose Única' },
        { id: 'tetra_viral', nome: 'Tetra Viral', dose: 'Dose Única' } // (Sarampo, Caxumba, Rubéola, Varicela)
    ]},
    { idade: '4 anos', vacinas: [ //
        { id: 'dtp_r2', nome: 'DTP (Tríplice Bact.)', dose: '2º Reforço' },
        { id: 'vop_r2', nome: 'VOP (Pólio Oral)', dose: '2º Reforço' },
        { id: 'varicela_r', nome: 'Varicela', dose: 'Reforço/2ª Dose' }, // (Se não tomou Tetra Viral)
        { id: 'febre_amarela_r', nome: 'Febre Amarela', dose: 'Reforço' } //
    ]},
    { idade: 'Anual', vacinas: [
        { id: 'influenza_anual', nome: 'Influenza (Gripe)', dose: 'Dose Anual' } //
    ]}
];

// 1. ACEITAR A PROP 'onDataChange'
export default function VacinacaoTab({ pacienteId, onDataChange }) {
    const { showSnackbar } = useSnackbar();
    const [isLoading, setIsLoading] = useState(true);
    const [vacinasSalvas, setVacinasSalvas] = useState({});

    const fetchVacinas = useCallback(async () => {
        // ... (lógica de fetch sem alteração)
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/vacinas/`);
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

    const handleVacinaChange = async (vacinaInfo, field, newValue) => {
        const { nome, dose, idade } = vacinaInfo;
        const key = `${nome}_${dose}`;
        const vacinaExistente = vacinasSalvas[key];
        const payload = { [field]: newValue };
        const oldState = vacinasSalvas; 

        setVacinasSalvas(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] || { 
                    nome_vacina: nome, 
                    dose: dose, 
                    idade_recomendada: idade 
                }),
                ...payload
            }
        }));

        try {
            if (vacinaExistente) {
                await apiClient.patch(`/prontuario/pacientes/${pacienteId}/vacinas/${vacinaExistente.id}/`, payload);
            } else {
                const res = await apiClient.post(`/prontuario/pacientes/${pacienteId}/vacinas/`, {
                    nome_vacina: nome,
                    dose: dose,
                    idade_recomendada: idade,
                    ...payload
                });
                setVacinasSalvas(prev => ({ ...prev, [key]: res.data }));
            }
            
            // 2. CHAMAR A FUNÇÃO DO PAI PARA ATUALIZAR O STATUS
            if (onDataChange) {
                onDataChange();
            }
            
        } catch (err) {
            // ... (lógica de erro sem alteração)
            showSnackbar('Erro ao salvar vacina.', 'error');
            setVacinasSalvas(oldState); 
        }
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // ... (Restante do componente: render, etc. sem alterações)
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
                            <React.Fragment key={grupo.idade}>
                                {grupo.vacinas.map((vacina, vacIndex) => {
                                    const key = `${vacina.nome}_${vacina.dose}`;
                                    const dadosSalvos = vacinasSalvas[key] || {};
                                    const vacinaInfo = { nome: vacina.nome, dose: vacina.dose, idade: grupo.idade };

                                    return (
                                        <TableRow key={key}>
                                            {vacIndex === 0 ? (
                                                <TableCell rowSpan={grupo.vacinas.length} sx={{ fontWeight: 'bold', verticalAlign: 'top' }}>
                                                    {grupo.idade}
                                                </TableCell>
                                            ) : null}
                                            
                                            <TableCell>
                                                <Typography variant="body2" sx={{fontWeight: '500'}}>{vacina.nome}</Typography>
                                                <Typography variant="caption" color="textSecondary">{vacina.dose}</Typography>
                                            </TableCell>
                                            
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

                                            <TableCell>
                                                <TextField
                                                    type="date"
                                                    size="small"
                                                    InputLabelProps={{ shrink: true }}
                                                    value={dadosSalvos.data_aplicacao || ''}
                                                    onChange={(e) => handleVacinaChange(vacinaInfo, 'data_aplicacao', e.target.value || null)}
                                                />
                                            </TableCell>

                                            <TableCell>
                                                <TextField
                                                    placeholder="Lote, clínica, etc."
                                                    size="small"
                                                    fullWidth
                                                    defaultValue={dadosSalvos.observacao || ''}
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