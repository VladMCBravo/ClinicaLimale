import React from 'react';
import { Paper, Typography, Box, Divider } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export default function AlertasClinicos({ anamnese }) {
    if (!anamnese || (!anamnese.alergias && !anamnese.historico_medico_pregresso)) return null;
    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
    <WarningAmberIcon color="warning" />
    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}> {/* <-- MUDANÇA AQUI */}
        Alertas Clínicos
    </Typography>
</Box>
            <Divider />
            <Box sx={{ pt: 1.5 }}>
                {anamnese.alergias && (<Box sx={{ mb: 1 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Alergias:</Typography><Typography variant="body2">{anamnese.alergias}</Typography></Box>)}
                {anamnese.historico_medico_pregresso && (<Box><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Comorbidades:</Typography><Typography variant="body2">{anamnese.historico_medico_pregresso}</Typography></Box>)}
            </Box>
        </Paper>
    );
}