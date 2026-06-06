// src/components/prontuario/LayoutEvolucaoPadrao.jsx

import React, { useState } from 'react';
import { Box, Typography, Button, CircularProgress, Tabs, Tab } from '@mui/material';

export default function LayoutEvolucaoPadrao({
    titulo,
    indicadoresExtras = null, 
    botaoNormalidade = null,
    onLimpar,
    onSalvar,
    isSubmitting,
    textoBotaoSalvar = 'Salvar Atendimento',
    abasApoio = [], // <-- 1. Agora o layout recebe as abas
    formularioSOAP
}) {
    const [abaAtiva, setAbaAtiva] = useState(0); // 2. Estado para controlar a aba atual

    return (
        // Aplicamos a classe tasy-workspace para herdar o CSS global das barras de rolagem
        <Box className="tasy-workspace" sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            
            {/* CABEÇALHO DO FORMULÁRIO (Fixo) */}
            <Box sx={{ 
                display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', 
                p: 2, borderBottom: '1px solid #e0e0e0', bgcolor: '#ffffff', flexShrink: 0 
            }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1976d2', textTransform: 'uppercase' }}>
                        {titulo}
                    </Typography>
                    {indicadoresExtras}
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {botaoNormalidade}
                    <Button onClick={onLimpar} variant="outlined" size="small" disabled={isSubmitting} sx={{ borderRadius: 0 }}>
                        Limpar
                    </Button>
                    <Button onClick={onSalvar} variant="contained" size="small" disabled={isSubmitting} sx={{ borderRadius: 0, boxShadow: 'none' }}>
                        {isSubmitting ? <CircularProgress size={20} color="inherit" /> : textoBotaoSalvar}
                    </Button>
                </Box>
            </Box>

            {/* BARRA DE NAVEGAÇÃO DAS ABAS */}
            {/* Só renderiza a barra se houver abas de apoio passadas pelo componente pai */}
            {abasApoio.length > 0 && (
                <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fafafa', px: 2, flexShrink: 0 }}>
                    <Tabs 
                        value={abaAtiva} 
                        onChange={(e, val) => setAbaAtiva(val)} 
                        indicatorColor="primary" 
                        textColor="primary"
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{ minHeight: '40px' }}
                    >
                        <Tab label="Evolução (SOAP)" sx={{ minHeight: '40px', py: 0, fontSize: '0.8rem' }} />
                        {abasApoio.map((aba, index) => (
                            <Tab key={index} label={aba.label} sx={{ minHeight: '40px', py: 0, fontSize: '0.8rem' }} />
                        ))}
                    </Tabs>
                </Box>
            )}

            {/* ÁREA DO FORMULÁRIO (Rolável e Persistente) */}
            <Box className="tasy-compact-input" sx={{ flexGrow: 1, overflowY: 'auto', p: 3, bgcolor: '#ffffff' }}>
                
                {/* Aba 0: Formulário Principal (SOAP) */}
                <Box sx={{ display: abaAtiva === 0 ? 'block' : 'none', height: '100%' }}>
                    {formularioSOAP}
                </Box>
                
                {/* Abas Dinâmicas de Apoio (Histórico, DNPM, Vacinas, etc.) */}
                {abasApoio.map((aba, index) => (
                    <Box 
                        key={index + 1} 
                        sx={{ 
                            display: abaAtiva === (index + 1) ? 'block' : 'none', 
                            height: '100%' 
                        }}
                    >
                        {aba.component}
                    </Box>
                ))}

            </Box>
            
        </Box>
    );
}