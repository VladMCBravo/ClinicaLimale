// src/components/prontuario/AtendimentoPediatria.jsx - VERSÃO CORRIGIDA E INTERATIVA

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, CircularProgress, Grid, TextField, Typography, Paper, FormGroup, FormControlLabel, Checkbox, Divider } from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// 1. COPIAMOS A LÓGICA DE TEMPLATES DO AnamnesePediatria.jsx
const sintomasOptions = [
    { id: 'febre', label: 'Febre' },
    { id: 'tosse', label: 'Tosse' },
    { id: 'coriza', label: 'Coriza' },
    { id: 'vomitos', label: 'Vômitos' },
    { id: 'diarreia', label: 'Diarreia' },
    { id: 'irritabilidade', label: 'Irritabilidade / Choro' },
    { id: 'prostracao', label: 'Prostração / Sonolência' },
    { id: 'exantema', label: 'Exantema (Manchas)' },
];

const sintomaTemplates = {
  febre: "Febre: Início há X dias, T. máx X°C. Responde (bem/mal) a antitérmicos.",
  tosse: "Tosse: Início há X dias, (seca/produtiva). Piora (dia/noite).",
  coriza: "Coriza: Início há X dias, (hialina/amarelada/esverdeada).",
  vomitos: "Vômitos: X episódios hoje. (alimentar/bilioso).",
  diarreia: "Diarreia: X episódios hoje. Fezes (líquidas/pastosas), (sem/com) muco/sangue.",
  irritabilidade: "Irritabilidade / Choro intenso. Não cede ao colo.",
  prostracao: "Prostração / Sonolência. Hipoativo, pouca aceitação de líquidos.",
  exantema: "Exantema: Início há X dias. (macular/papular). Local: ",
};
// (Você pode usar seus templates mais completos do AnamnesePediatria.jsx)

export default function AtendimentoPediatria({ pacienteId, onEvolucaoSalva }) {
    // 2. Estado para os checkboxes e para os campos do SOAP
    const [sintomas, setSintomas] = useState({});
    const [formData, setFormData] = useState({
        notas_subjetivas: '',
        notas_objetivas: 'BEG, corado, hidratado, eupneico. Oroscopia sem alterações. ACV: BRNF 2T, sem sopros. AR: MVU presente, sem RA. Abdome: Flácido, indolor, RHA+.',
        avaliacao: '',
        plano: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSnackbar } = useSnackbar();

    // 3. Função que gera o texto da Queixa (Sintomas)
    const generateHda = useCallback(() => {
        return sintomasOptions
            .filter(opt => sintomas[opt.id])
            .map(opt => sintomaTemplates[opt.id])
            .join('\n');
    }, [sintomas]);

    // 4. Atualiza a 'notas_subjetivas' sempre que os checkboxes mudam
    useEffect(() => {
        const hdaText = generateHda();
        setFormData(prev => ({
            ...prev,
            notas_subjetivas: hdaText || prev.notas_subjetivas // Mantém o que foi digitado
        }));
    }, [sintomas, generateHda]);

    const handleSintomasChange = (event) => {
        const { name, checked } = event.target;
        setSintomas(prev => ({ ...prev, [name]: checked }));
    };

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // 5. Botão de Normalidade
    const preencherNormalidade = () => {
        setSintomas({}); // Limpa os sintomas
        setFormData({
            notas_subjetivas: 'Mãe nega queixas. Criança ativa, reativa, alimentando-se bem (SME), diurese e evacuações presentes.',
            notas_objetivas: 'BEG, corado, hidratado, eupneico. Fontanela normotensa. Oroscopia sem alterações. Ausculta cardíaca e pulmonar normais. Abdome flácido, indolor.',
            avaliacao: 'Criança hígida, sem sinais de alarme. Desenvolvimento adequado para a idade.',
            plano: 'Sigo com orientações gerais, manutenção do aleitamento materno. Alta da consulta.'
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            // Salva os dados do SOAP no endpoint de EVOLUÇÃO
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, formData);
            showSnackbar('Evolução salva com sucesso!', 'success');
            setFormData({
                notas_subjetivas: '',
                notas_objetivas: 'BEG, corado, hidratado, eupneico. Oroscopia sem alterações. ACV: BRNF 2T, sem sopros. AR: MVU presente, sem RA. Abdome: Flácido, indolor, RHA+.',
                avaliacao: '',
                plano: ''
            });
            setSintomas({});
            if(onEvolucaoSalva) onEvolucaoSalva();
        } catch (error) {
            showSnackbar('Erro ao salvar evolução.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, mb: 2 }}>
            {/* O cabeçalho com o botão 'Preencher Normalidade' está correto */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Evolução do Dia (Pediatria/Neonatologia)
                </Typography>
                 <Button variant="outlined" size="small" onClick={preencherNormalidade}>
                    Preencher Normalidade
                </Button>
            </Box>
            
            {/* Os checkboxes 'Queixa Atual (S)' estão corretos */}
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Queixa Atual (S)</Typography>
            <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                {sintomasOptions.map(opt => (
                <FormControlLabel key={opt.id} control={<Checkbox checked={sintomas[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={opt.label} />
                ))}
            </FormGroup>

            {/* --- AQUI ESTÁ A CORREÇÃO DE LAYOUT: Trocamos <Grid> por <Box> --- */}
            <Box sx={{
                display: 'flex',
                flexDirection: 'column', // Força os campos a ficarem um embaixo do outro
                gap: 2, // Adiciona espaçamento (o 'spacing={2}' do Grid)
                mt: 1  // Adiciona a margem
            }}>
                <TextField 
                    name="notas_subjetivas" 
                    label="Subjetivo (HDA gerada pelos cliques)" 
                    multiline rows={4} fullWidth 
                    value={formData.notas_subjetivas || ''} 
                    onChange={handleChange} size="small" 
                />
                <TextField 
                    name="notas_objetivas" 
                    label="Objetivo (Exame Físico)" 
                    multiline rows={4} fullWidth 
                    value={formData.notas_objetivas || ''} 
                    onChange={handleChange} size="small" 
                />
                <TextField 
                    name="avaliacao" 
                    label="Avaliação / Hipóteses Diagnósticas" 
                    multiline rows={3} fullWidth 
                    value={formData.avaliacao || ''} 
                    onChange={handleChange} size="small" 
                />
                <TextField 
                    name="plano" 
                    label="Plano / Conduta" 
                    multiline rows={3} fullWidth 
                    value={formData.plano || ''} 
                    onChange={handleChange} size="small" 
                />
                <Box sx={{ textAlign: 'right' }}>
                    <Button type="submit" variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Evolução'}
                    </Button>
                </Box>
            </Box>
            {/* --- FIM DA CORREÇÃO DE LAYOUT --- */}
        </Paper>
    );
}