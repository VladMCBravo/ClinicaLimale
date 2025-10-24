// src/components/prontuario/AtendimentoCardiologia.jsx - VERSÃO INTERATIVA

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, CircularProgress, Grid, TextField, Typography, Paper, FormGroup, FormControlLabel, Checkbox, Divider } from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// 1. Lógica de 'Sintomas' copiada do seu AnamneseCardiologia.jsx
const sintomasOpcoes = [
  { id: 'dor_toracica', label: 'Dor torácica' },
  { id: 'dispneia', label: 'Dispneia' },
  { id: 'palpitacoes', label: 'Palpitações' },
  { id: 'sincope_tontura', label: 'Síncope / Tontura' },
  { id: 'edema_membros', label: 'Edema de MMII' },
];

// 2. Templates de texto (simplificados para o relatório de evolução)
const sintomaTemplates = {
  dor_toracica: "Refere dor torácica (descrever).",
  dispneia: "Refere dispneia (descrever).",
  palpitacoes: "Refere palpitações (descrever).",
  sincope_tontura: "Refere síncope/tontura (descrever).",
  edema_membros: "Refere edema de MMII (descrever).",
};

// 3. Adicionamos checkboxes para o Exame Físico
const exameFisicoOpcoes = [
    { id: 'brnf', label: 'BRNF 2T' },
    { id: 'sem_sopros', label: 'Sem Sopros' },
    { id: 'mv_presente', label: 'MV presente s/ RA' },
    { id: 'sem_edema', label: 'Sem Edema MMII' },
];

const exameFisicoTemplates = {
    brnf: "ACV: BRNF em 2T.",
    sem_sopros: "Sem sopros audíveis.",
    mv_presente: "AR: MV presente universalmente, sem ruídos adventícios.",
    sem_edema: "MMII: Sem edema, panturrilhas livres.",
};

export default function AtendimentoCardiologia({ pacienteId, onEvolucaoSalva }) {
    const [sintomas, setSintomas] = useState({});
    const [exameFisico, setExameFisico] = useState({});
    const [formData, setFormData] = useState({
        notas_subjetivas: '',
        notas_objetivas: 'PA: \nFC: \n',
        avaliacao: '',
        plano: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSnackbar } = useSnackbar();

    // 4. Funções para gerar o texto dos relatórios
    const generateHda = useCallback(() => {
        const hda = sintomasOpcoes
            .filter(opt => sintomas[opt.id])
            .map(opt => sintomaTemplates[opt.id])
            .join('\n');
        return hda || ''; // Retorna string vazia se nada for selecionado
    }, [sintomas]);

    const generateExame = useCallback(() => {
        const exame = exameFisicoOpcoes
            .filter(opt => exameFisico[opt.id])
            .map(opt => exameFisicoTemplates[opt.id])
            .join('\n');
        return "PA: \nFC: \n" + exame; // Sempre inclui PA e FC
    }, [exameFisico]);

    // 5. Efeito que atualiza os campos SOAP
    useEffect(() => {
        const hdaText = generateHda();
        setFormData(prev => ({ ...prev, notas_subjetivas: hdaText }));
    }, [sintomas, generateHda]);

    useEffect(() => {
        const exameText = generateExame();
        setFormData(prev => ({ ...prev, notas_objetivas: exameText }));
    }, [exameFisico, generateExame]);

    // Handlers
    const handleSintomasChange = (e) => setSintomas(prev => ({ ...prev, [e.target.name]: e.target.checked }));
    const handleExameChange = (e) => setExameFisico(prev => ({ ...prev, [e.target.name]: e.target.checked }));
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    // 6. Botão de Normalidade
    const preencherNormalidade = () => {
        setSintomas({}); // Limpa sintomas
        setExameFisico({ // Marca exames normais
            brnf: true,
            sem_sopros: true,
            mv_presente: true,
            sem_edema: true,
        });
        setFormData({
            notas_subjetivas: 'Paciente nega dor torácica, dispneia, palpitações ou síncope. Refere bom estado geral.',
            notas_objetivas: 'PA: ___x___ mmHg\nFC: ___ bpm\nACV: BRNF em 2T.\nSem sopros audíveis.\nAR: MV presente universalmente, sem ruídos adventícios.\nMMII: Sem edema, panturrilhas livres.',
            avaliacao: 'Paciente estável, sem sinais de descompensação cardiovascular.',
            plano: 'Mantenho conduta. Orientações gerais.'
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, formData);
            showSnackbar('Evolução salva com sucesso!', 'success');
            setFormData({ notas_subjetivas: '', notas_objetivas: 'PA: \nFC: \n', avaliacao: '', plano: '' });
            setSintomas({});
            setExameFisico({});
            if(onEvolucaoSalva) onEvolucaoSalva();
        } catch (error) {
            showSnackbar('Erro ao salvar evolução.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom>Evolução do Dia (Cardiologia)</Typography>
                <Button variant="outlined" size="small" onClick={preencherNormalidade}>Preencher Normalidade</Button>
            </Box>
            
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Queixa Atual (S)</Typography>
            <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                {sintomasOpcoes.map(opt => (
                    <FormControlLabel key={opt.id} control={<Checkbox checked={sintomas[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={opt.label} />
                ))}
            </FormGroup>
            <TextField name="notas_subjetivas" label="Subjetivo (HDA gerada)" multiline rows={4} fullWidth value={formData.notas_subjetivas || ''} onChange={handleChange} size="small" sx={{mt: 1}} />

            <Divider sx={{ my: 2 }} />

            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
            <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                {exameFisicoOpcoes.map(opt => (
                    <FormControlLabel key={opt.id} control={<Checkbox checked={exameFisico[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={opt.label} />
                ))}
            </FormGroup>
            <TextField name="notas_objetivas" label="Objetivo (Exame Físico gerado)" multiline rows={4} fullWidth value={formData.notas_objetivas || ''} onChange={handleChange} size="small" sx={{mt: 1}} />

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
                <Grid item xs={12}><TextField name="avaliacao" label="Avaliação / Hipóteses" multiline rows={2} fullWidth value={formData.avaliacao || ''} onChange={handleChange} size="small" /></Grid>
                <Grid item xs={12}><TextField name="plano" label="Plano / Conduta" multiline rows={2} fullWidth value={formData.plano || ''} onChange={handleChange} size="small" /></Grid>
                <Grid item xs={12} sx={{ textAlign: 'right' }}>
                    <Button type="submit" variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Evolução'}
                    </Button>
                </Grid>
            </Grid>
        </Paper>
    );
}