// src/components/prontuario/pediatria/VacinacaoTab.jsx
// ATUALIZADO: Adiciona Meningo B e Dropdown Pneumo (10/13/15/20)

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, Box, CircularProgress,
    TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
    TextField, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import apiClient from '../../../api/axiosConfig'

// --- ALTERAÇÃO 1: pniSchedule ATUALIZADO ---
const pniSchedule = [
    { idade: 'Ao nascer', vacinas: [
        { id: 'bcg', nome: 'BCG', dose: 'Dose Única' },
        { id: 'hep_b_0', nome: 'Hepatite B', dose: '1ª Dose (ao nascer)' }
    ]},
    { idade: '2 meses', vacinas: [
        { id: 'penta_1', nome: 'Pentavalente', dose: '1ª Dose' },
        { id: 'vip_1', nome: 'VIP (Pólio)', dose: '1ª Dose' },
        { id: 'rota_1', nome: 'Rotavírus', dose: '1ª Dose' },
        { id: 'pneumo_1', nome: 'Pneumocócica', dose: '1ª Dose', 
          type: 'select', 
          options: ['Pneumo 10', 'Pneumo 13', 'Pneumo 15', 'Pneumo 20'],
          defaultName: 'Pneumo 10' // Valor padrão se não salvo
        }
    ]},
    { idade: '3 meses', vacinas: [
        { id: 'meno_acwy_1', nome: 'Meningocócica ACWY', dose: '1ª Dose' },
        { id: 'meno_b_1', nome: 'Meningocócica B', dose: '1ª Dose' } // <-- NOVO
    ]},
    { idade: '4 meses', vacinas: [
        { id: 'penta_2', nome: 'Pentavalente', dose: '2ª Dose' },
        { id: 'vip_2', nome: 'VIP (Pólio)', dose: '2ª Dose' },
        { id: 'rota_2', nome: 'Rotavírus', dose: '2ª Dose' },
        { id: 'pneumo_2', nome: 'Pneumocócica', dose: '2ª Dose',
          type: 'select', 
          options: ['Pneumo 10', 'Pneumo 13', 'Pneumo 15', 'Pneumo 20'],
          defaultName: 'Pneumo 10'
        }
    ]},
    { idade: '5 meses', vacinas: [
        { id: 'meno_acwy_2', nome: 'Meningocócica ACWY', dose: '2ª Dose' },
        { id: 'meno_b_2', nome: 'Meningocócica B', dose: '2ª Dose' } // <-- NOVO
    ]},
    { idade: '6 meses', vacinas: [
        { id: 'penta_3', nome: 'Pentavalente', dose: '3ª Dose' },
        { id: 'vip_3', nome: 'VIP (Pólio)', dose: '3ª Dose' },
        { id: 'influenza_1', nome: 'Influenza (Gripe)', dose: '1ª Dose (Campanha)' },
        { id: 'covid_1', nome: 'COVID-19', dose: '1ª Dose' }
    ]},
    { idade: '7 meses', vacinas: [
        { id: 'influenza_2', nome: 'Influenza (Gripe)', dose: '2ª Dose (se primovacinação)' }, 
        { id: 'covid_2', nome: 'COVID-19', dose: '2ª Dose' }
    ]},
     { idade: '9 meses', vacinas: [
        { id: 'febre_amarela', nome: 'Febre Amarela', dose: 'Dose Inicial' },
        { id: 'covid_3', nome: 'COVID-19', dose: '3ª Dose' }
    ]},
    { idade: '12 meses', vacinas: [
        { id: 'triplice_1', nome: 'Tríplice Viral', dose: '1ª Dose' },
        { id: 'pneumo_r', nome: 'Pneumocócica', dose: 'Reforço',
          type: 'select', 
          options: ['Pneumo 10', 'Pneumo 13', 'Pneumo 15', 'Pneumo 20'],
          defaultName: 'Pneumo 10'
        },
        { id: 'meno_acwy_r', nome: 'Meningo ACWY', dose: 'Reforço' },
        { id: 'meno_b_r', nome: 'Meningo B', dose: 'Reforço' } // <-- NOVO
    ]},
    { idade: '15 meses', vacinas: [
        { id: 'dtp_r1', nome: 'DTP (Tríplice Bact.)', dose: '1º Reforço' },
        { id: 'vop_r1', nome: 'VOP (Pólio Oral)', dose: '1º Reforço' },
        { id: 'hep_a', nome: 'Hepatite A', dose: 'Dose Única' },
        { id: 'tetra_viral', nome: 'Tetra Viral', dose: 'Dose Única' }
    ]},
    { idade: '4 anos', vacinas: [
        { id: 'dtp_r2', nome: 'DTP (Tríplice Bact.)', dose: '2º Reforço' },
        { id: 'vop_r2', nome: 'VOP (Pólio Oral)', dose: '2º Reforço' },
        { id: 'varicela_r', nome: 'Varicela', dose: 'Reforço/2ª Dose' },
        { id: 'febre_amarela_r', nome: 'Febre Amarela', dose: 'Reforço' }
    ]},
    { idade: 'Anual', vacinas: [
        { id: 'influenza_anual', nome: 'Influenza (Gripe)', dose: 'Dose Anual' }
    ]}
];

export default function VacinacaoTab({ pacienteId, onDataChange }) {
    const { showSnackbar } = useSnackbar();
    const [isLoading, setIsLoading] = useState(true);
    const [vacinasSalvas, setVacinasSalvas] = useState({});

    // --- ALTERAÇÃO 2: fetchVacinas usa 'vacina_id' como chave ---
    const fetchVacinas = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/vacinas/`);
            // Mapeia usando o 'vacina_id' (que é o 'id' do pniSchedule)
            const mapaVacinas = res.data.reduce((acc, vacina) => {
                if (vacina.vacina_id) {
                    acc[vacina.vacina_id] = vacina;
                }
                return acc;
            }, {});
            setVacinasSalvas(mapaVacinas);
        } catch (err) {
            if (err.response && err.response.status !== 404) {
                showSnackbar('Erro ao carregar caderneta de vacinação.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    }, [pacienteId, showSnackbar]);

    useEffect(() => {
        fetchVacinas();
    }, [fetchVacinas]);

    // --- ALTERAÇÃO 3: handleVacinaChange ATUALIZADO ---
    const handleVacinaChange = async (vacinaInfo, field, newValue) => {
        const { id, nome, dose, idade, defaultName } = vacinaInfo;
        const key = id; // Usa o 'id' do pniSchedule como chave
        const vacinaExistente = vacinasSalvas[key];
        
        // Determina o nome final da vacina
        let nomeVacinaFinal;
        if (field === 'nome_vacina') {
            nomeVacinaFinal = newValue; // Se o campo alterado é o nome (dropdown)
        } else if (vacinaExistente?.nome_vacina) {
            nomeVacinaFinal = vacinaExistente.nome_vacina; // Se já existe salvo
        } else {
            nomeVacinaFinal = defaultName || nome; // Se é novo, usa o padrão ou o nome base
        }
        
        const payload = {
            vacina_id: key, // Chave estável
            nome_vacina: nomeVacinaFinal, // Nome (pode ser do dropdown)
            dose: dose,
            idade_recomendada: idade,
            ...(vacinaExistente || {}), // Pega dados existentes
            [field]: newValue // Aplica a mudança
        };
        
        // Remove 'id' da API do payload para evitar conflito
        delete payload.id; 

        const oldState = vacinasSalvas;
        
        // Atualização Otimista
        setVacinasSalvas(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                ...payload
            }
        }));

        try {
            if (vacinaExistente) {
                // Atualiza (PATCH) usando o ID do banco
                await apiClient.patch(`/prontuario/pacientes/${pacienteId}/vacinas/${vacinaExistente.id}/`, payload);
            } else {
                // Cria (POST)
                const res = await apiClient.post(`/prontuario/pacientes/${pacienteId}/vacinas/`, payload);
                setVacinasSalvas(prev => ({ ...prev, [key]: res.data })); // Atualiza com o ID do banco
            }
            
            if (onDataChange) {
                onDataChange();
            }
        } catch (err) {
            showSnackbar('Erro ao salvar vacina.', 'error');
            setVacinasSalvas(oldState); // Reverte
        }
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // --- ALTERAÇÃO 4: JSX Render (dentro do TableBody) ---
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
                        {pniSchedule.map((grupo) => (
                            <React.Fragment key={grupo.idade}>
                                {grupo.vacinas.map((vacina, vacIndex) => {
                                    
                                    const key = vacina.id; // Chave Única
                                    const dadosSalvos = vacinasSalvas[key] || {};
                                    // Passa todas as infos da vacina para o handler
                                    const vacinaInfo = { ...vacina };

                                    return (
                                        <TableRow key={key}>
                                            {vacIndex === 0 ? (
                                                <TableCell rowSpan={grupo.vacinas.length} sx={{ fontWeight: 'bold', verticalAlign: 'top' }}>
                                                    {grupo.idade}
                                                </TableCell>
                                            ) : null}
                                            
                                            <TableCell>
                                                {/* CONDIÇÃO PARA RENDERIZAR O DROPDOWN */}
                                                {vacina.type === 'select' ? (
                                                    <FormControl size="small" fullWidth sx={{minWidth: '150px'}}>
                                                        <InputLabel id={`nome-vacina-label-${key}`}>{vacina.nome}</InputLabel>
                                                        <Select
                                                            labelId={`nome-vacina-label-${key}`}
                                                            label={vacina.nome}
                                                            value={dadosSalvos.nome_vacina || vacina.defaultName}
                                                            onChange={(e) => handleVacinaChange(vacinaInfo, 'nome_vacina', e.target.value)}
                                                        >
                                                            {vacina.options.map(opt => (
                                                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>
                                                ) : (
                                                    <>
                                                        <Typography variant="body2" sx={{fontWeight: '500'}}>{vacina.nome}</Typography>
                                                        <Typography variant="caption" color="textSecondary">{vacina.dose}</Typography>
                                                    </>
                                                )}
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
                                                    // Usamos onBlur para não salvar a cada tecla
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