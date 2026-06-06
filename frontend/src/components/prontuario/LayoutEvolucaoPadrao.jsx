// src/components/prontuario/LayoutEvolucaoPadrao.jsx

import React, { useState, Suspense } from 'react';
import { 
    Box, Paper, Typography, Button, CircularProgress, 
    Tabs, Tab, Divider, Tooltip, IconButton 
} from '@mui/material';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';

export default function LayoutEvolucaoPadrao({
    titulo,
    indicadoresExtras = null, 
    botaoNormalidade = null,
    onLimpar,
    onSalvar,
    isSubmitting,
    textoBotaoSalvar = 'Salvar Atendimento',
    formularioSOAP, 
    abasApoio = [] 
}) {
    const [abaLateral, setAbaLateral] = useState(null);

    const handleAbaChange = (event, newValue) => {
        // Alterna a abertura/fechamento do painel lateral
        setAbaLateral(prev => prev === newValue ? null : newValue);
    };

    return (
        <Paper sx={{ mb: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '65vh' }}>
            
            {/* CABEÇALHO */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 1 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ mb: 0 }}>{titulo}</Typography>
                    {indicadoresExtras}
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {botaoNormalidade}
                    <Button onClick={onLimpar} variant="outlined" size="small" disabled={isSubmitting}>
                        Limpar
                    </Button>
                    <Button onClick={onSalvar} variant="contained" size="small" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={20} color="inherit" /> : textoBotaoSalvar}
                    </Button>
                </Box>
            </Box>

            {/* BARRA DE FERRAMENTAS (Só aparece se a especialidade tiver abasExtras) */}
            {abasApoio.length > 0 && (
                <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, display: 'flex', alignItems: 'center', bgcolor: '#fdfdfd' }}>
                     {abaLateral !== null && (
                        <Tooltip title="Fechar painel auxiliar">
                            <IconButton onClick={() => setAbaLateral(null)} size="small" sx={{ mr: 1 }}>
                                <MenuOpenIcon sx={{ transform: 'rotate(180deg)' }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {/* Garantimos que o value seja "false" quando null para o componente Tabs do MUI não reclamar */}
                    <Tabs value={abaLateral !== null ? abaLateral : false} onChange={handleAbaChange} variant="scrollable" scrollButtons="auto">
                        {abasApoio.map((aba, index) => (
                            <Tab key={index} label={aba.label} value={index} />
                        ))}
                    </Tabs>
                </Box>
            )}

            {/* ÁREA DE TRABALHO: SPLIT-PANE */}
            <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
                
                {/* ESQUERDA: Formulário SOAP fixo */}
                <Box sx={{ 
                    flexGrow: 1, 
                    width: abaLateral !== null ? '50%' : '100%', 
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                    overflowY: 'auto', 
                    p: 2 
                }}>
                    {formularioSOAP}
                </Box>

                {/* DIREITA: Painel de Apoio (Abre apenas quando clicado) */}
                {abaLateral !== null && (
                    <>
                        <Divider orientation="vertical" flexItem />
                        <Box sx={{ width: '50%', overflowY: 'auto', bgcolor: '#f4f6f8', p: 2 }}>
                            <Suspense fallback={<Box sx={{p:4, textAlign:'center'}}><CircularProgress /></Box>}>
                                {abasApoio[abaLateral].component}
                            </Suspense>
                        </Box>
                    </>
                )}
            </Box>
        </Paper>
    );
}