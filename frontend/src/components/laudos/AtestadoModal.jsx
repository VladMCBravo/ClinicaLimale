import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, MenuItem, Box, FormControlLabel, Checkbox, Typography, CircularProgress, Grid
} from '@mui/material';
import apiClient from '../../api/axiosConfig';

export default function AtestadoModal({ open, onClose, paciente, medicoNome, medicoCrm, usaAssinaturaDigital }) {
    const [tipo, setTipo] = useState('Comparecimento');
    const [observacoes, setObservacoes] = useState('');
    const [cid, setCid] = useState('');
    const [autorizouCid, setAutorizouCid] = useState(false);
    const [dias, setDias] = useState('1');
    const [horaInicio, setHoraInicio] = useState('');
    const [horaFim, setHoraFim] = useState('');
    const [loading, setLoading] = useState(false);

    // Gera o texto automático com base no tipo selecionado
    useEffect(() => {
        if (!paciente) return;
        const hoje = new Date().toLocaleDateString('pt-BR');
        let texto = '';
        const docInfo = paciente.cpf ? `portador(a) do CPF nº ${paciente.cpf}` : `cadastrado(a) sob o ID ${paciente.id}`;

        if (tipo === 'Comparecimento') {
            texto = `Atesto para os devidos fins que o(a) paciente ${paciente.nome_completo}, ${docInfo}, compareceu a esta clínica médica nesta data (${hoje}) no período das ${horaInicio || '___'} às ${horaFim || '___'}.`;
        } else if (tipo === 'Afastamento') {
            texto = `Atesto para os devidos fins que o(a) paciente ${paciente.nome_completo}, ${docInfo}, foi submetido(a) a atendimento médico nesta data (${hoje}), necessitando de ${dias} dia(s) de repouso e afastamento de suas atividades laborais.`;
        } else {
            texto = `Atesto para os devidos fins que o(a) paciente ${paciente.nome_completo}, ${docInfo}, encontra-se apto(a) para a realização de suas atividades.`;
        }
        setObservacoes(texto);
    }, [tipo, dias, horaInicio, horaFim, paciente]);

    const handleSalvar = async () => {
        setLoading(true);
        try {
            const payload = {
                tipo_atestado: tipo,
                observacoes: observacoes,
                cid: cid,
                paciente_autorizou_cid: autorizouCid
            };

            // 1. Salva Oficialmente no Prontuário do Backend (Auditoria e Vínculo)
            const res = await apiClient.post(`/prontuario/pacientes/${paciente.id}/atestados/`, payload);
            const atestadoId = res.data.id;

            // 2. Busca o PDF Oficial (com Máscara da Clínica e Assinatura Digital)
            try {
                // Tenta a rota de PDF (usada na aba de Relatórios)
                const pdfRes = await apiClient.get(`/pdf/atestado/${atestadoId}/`, { responseType: 'blob' });
                const fileURL = URL.createObjectURL(new Blob([pdfRes.data], { type: 'application/pdf' }));
                window.open(fileURL, '_blank');
            } catch (pdfErr) {
                console.error("Falha ao buscar PDF, verificando rota alternativa...", pdfErr);
                // Caso sua rota de PDF esteja estruturada diferente
                const pdfResAlt = await apiClient.get(`/prontuario/atestados/${atestadoId}/pdf/`, { responseType: 'blob' });
                const fileURLAlt = URL.createObjectURL(new Blob([pdfResAltAlt.data], { type: 'application/pdf' }));
                window.open(fileURLAlt, '_blank');
            }

            onClose();
        } catch (error) {
            console.error("Erro ao salvar Documento", error);
            alert("Erro ao gerar o documento. Verifique a conexão com o servidor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 'bold', color: '#1C2E4A', borderBottom: '1px solid #eee' }}>
                Atestado / Declaração
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                    <TextField
                        select
                        label="Tipo de Documento"
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value)}
                        fullWidth
                        size="small"
                    >
                        <MenuItem value="Afastamento">Atestado de Afastamento</MenuItem>
                        <MenuItem value="Comparecimento">Declaração de Comparecimento</MenuItem>
                        <MenuItem value="Aptidao">Atestado de Aptidão Física</MenuItem>
                    </TextField>

                    {tipo === 'Comparecimento' && (
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField label="Hora Início (Ex: 14:00)" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} fullWidth size="small" />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField label="Hora Fim (Ex: 15:30)" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} fullWidth size="small" />
                            </Grid>
                        </Grid>
                    )}

                    {tipo === 'Afastamento' && (
                        <TextField label="Dias de Afastamento" type="number" value={dias} onChange={(e) => setDias(e.target.value)} fullWidth size="small" />
                    )}

                    <TextField
                        label="Texto do Documento"
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        multiline
                        rows={4}
                        fullWidth
                        size="small"
                        helperText="Você pode editar o texto gerado livremente antes de imprimir."
                    />

                    <Box sx={{ border: '1px solid #e0e0e0', p: 1.5, borderRadius: 1, bgcolor: '#fafafa' }}>
                        <TextField
                            label="Diagnóstico / CID-10 (Opcional)"
                            value={cid}
                            onChange={(e) => setCid(e.target.value)}
                            fullWidth
                            size="small"
                            sx={{ mb: 1 }}
                        />
                        <FormControlLabel
                            control={<Checkbox size="small" checked={autorizouCid} onChange={(e) => setAutorizouCid(e.target.checked)} disabled={!cid} />}
                            label={<Typography variant="caption" color="text.secondary">O paciente autoriza a inserção do CID neste documento.</Typography>}
                        />
                    </Box>
                    
                    {usaAssinaturaDigital && (
                        <Typography variant="caption" sx={{ color: '#2E7D32', fontWeight: 'bold' }}>
                            ✓ Este documento será salvo no histórico e receberá sua Assinatura Digital ICP-Brasil.
                        </Typography>
                    )}

                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
                <Button onClick={onClose} color="inherit">Cancelar</Button>
                <Button
                    onClick={handleSalvar}
                    variant="contained"
                    sx={{ background: '#1C2E4A' }}
                    disabled={loading || !paciente}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Salvar no Prontuário e Imprimir'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}