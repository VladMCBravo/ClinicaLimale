// src/components/laudos/TermoConsentimentoModal.jsx
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, CircularProgress
} from '@mui/material';
import apiClient from '../../api/axiosConfig';

export default function TermoConsentimentoModal({ open, onClose, paciente, medicoNome, medicoCrm }) {
    const [loading, setLoading] = useState(false);
    
    const handleImprimir = async () => {
        if (!paciente || !paciente.id) {
            alert("Erro: Nenhum paciente selecionado.");
            return;
        }

        setLoading(true);
        try {
            // AQUI: Ajuste a URL para a rota real que você criar no seu backend Django
            // Pode ser um POST enviando os dados do médico no corpo da requisição
            const payload = {
                medico_nome: medicoNome,
                medico_crm: medicoCrm
            };

            const res = await apiClient.post(`/prontuario/pacientes/${paciente.id}/termo-pdf/`, payload, { 
                responseType: 'blob' 
            });
            
            // Cria o link temporário para o PDF gerado pelo backend e abre na nova aba
            const fileURL = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            window.open(fileURL, '_blank');
            
            onClose();
        } catch (error) {
            console.error("Erro ao gerar o Termo de Consentimento", error);
            alert("Erro ao gerar o documento. Verifique a conexão com o servidor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 'bold', color: '#1C2E4A', borderBottom: '1px solid #eee' }}>
                Imprimir Termo
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                        Deseja gerar o Termo de Consentimento para Uso de Imagem para o paciente <strong>{paciente?.nome_completo || 'Selecionado'}</strong>?
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                        O documento será processado no padrão da clínica e aberto em formato PDF pronto para impressão.
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
                <Button onClick={onClose} color="inherit" disabled={loading}>Cancelar</Button>
                <Button 
                    onClick={handleImprimir} 
                    variant="contained" 
                    sx={{ background: '#1C2E4A' }}
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Imprimir Termo'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}