import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, MenuItem, Box, FormControlLabel, Checkbox, Typography, CircularProgress, Grid
} from '@mui/material';
import apiClient from '../../api/axiosConfig';

export default function AtestadoModal({ open, onClose, paciente, medicoNome, medicoCrm, usaAssinaturaDigital }) {
    const hojeISO = new Date().toISOString().split('T')[0];
    
    const [dataAtestado, setDataAtestado] = useState(hojeISO);
    const [tipo, setTipo] = useState('Comparecimento');
    const [observacoes, setObservacoes] = useState('');
    const [cid, setCid] = useState('');
    const [autorizouCid, setAutorizouCid] = useState(false);
    const [dias, setDias] = useState('1');
    const [horaInicio, setHoraInicio] = useState('');
    const [horaFim, setHoraFim] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Estados para emissão de Atestado de Acompanhante
    const [isAcompanhante, setIsAcompanhante] = useState(false);
    const [nomeAcompanhante, setNomeAcompanhante] = useState('');
    const [rgAcompanhante, setRgAcompanhante] = useState('');

    // Gera o texto automático baseado na data, tipo, regras gramaticais e se há acompanhante
    useEffect(() => {
        if (!paciente) return;
        
        // Formata a data (YYYY-MM-DD para DD/MM/YYYY) de forma segura contra fuso-horário
        const [ano, mes, dia] = dataAtestado.split('-');
        const dataBR = `${dia}/${mes}/${ano}`;
        
        // 1. Identificação dinâmica de gênero com base no cadastro do paciente
        const genero = (paciente.genero || paciente.sexo || '').toUpperCase();
        
        let artigo = 'o(a)';
        let portador = 'portador(a)';
        let cadastrado = 'cadastrado(a)';
        let submetido = 'submetido(a)';
        let apto = 'apto(a)';

        if (genero === 'M' || genero === 'MASCULINO') {
            artigo = 'o';
            portador = 'portador';
            cadastrado = 'cadastrado';
            submetido = 'submetido';
            apto = 'apto';
        } else if (genero === 'F' || genero === 'FEMININO') {
            artigo = 'a';
            portador = 'portadora';
            cadastrado = 'cadastrada';
            submetido = 'submetida';
            apto = 'apta';
        }

        // 2. Geração do texto final considerando se é Acompanhante ou o Próprio Paciente
        let texto = '';

        if (isAcompanhante) {
            const identificacaoAcompanhante = nomeAcompanhante ? nomeAcompanhante.toUpperCase() : '_______________________';
            const rgTexto = rgAcompanhante ? `, portador(a) do RG nº ${rgAcompanhante},` : '';

            if (tipo === 'Comparecimento') {
                texto = `Atesto para os devidos fins que o(a) Sr(a). ${identificacaoAcompanhante}${rgTexto} esteve presente nesta clínica médica nesta data (${dataBR}) no período das ${horaInicio || '___'} às ${horaFim || '___'}, acompanhando ${artigo} paciente ${paciente.nome_completo || paciente.nome}, que foi submetido(a) a consulta/exames médicos.`;
            } else if (tipo === 'Afastamento') {
                texto = `Atesto para os devidos fins que o(a) Sr(a). ${identificacaoAcompanhante}${rgTexto} esteve presente nesta clínica médica nesta data (${dataBR}), necessitando de ${dias} dia(s) de repouso e afastamento de suas atividades laborais para acompanhar e prestar cuidados ${artigo} paciente ${paciente.nome_completo || paciente.nome}, que se encontra sob cuidados médicos.`;
            } else {
                texto = `Atesto para os devidos fins que o(a) Sr(a). ${identificacaoAcompanhante}${rgTexto} esteve presente acompanhando ${artigo} paciente ${paciente.nome_completo || paciente.nome} nesta data (${dataBR}).`;
            }
        } else {
            // Lógica original para o próprio paciente
            if (tipo === 'Comparecimento') {
                texto = `Atesto para os devidos fins que ${artigo} paciente ${paciente.nome_completo || paciente.nome}, compareceu a esta clínica médica nesta data (${dataBR}) no período das ${horaInicio || '___'} às ${horaFim || '___'}.`;
            } else if (tipo === 'Afastamento') {
                texto = `Atesto para os devidos fins que ${artigo} paciente ${paciente.nome_completo || paciente.nome}, foi ${submetido} a atendimento médico nesta data (${dataBR}), necessitando de ${dias} dia(s) de repouso e afastamento de suas atividades laborais.`;
            } else {
                texto = `Atesto para os devidos fins que ${artigo} paciente ${paciente.nome_completo || paciente.nome}, encontra-se ${apto} para a realização de suas atividades a partir desta data (${dataBR}).`;
            }
        }
        
        setObservacoes(texto);
    // Incluídas as variáveis do acompanhante no array de dependências para o texto atualizar ao digitar!
    }, [tipo, dias, horaInicio, horaFim, paciente, dataAtestado, isAcompanhante, nomeAcompanhante, rgAcompanhante]);

    const handleSalvar = async () => {
        setLoading(true);
        try {
            const payload = {
                tipo_atestado: tipo,
                observacoes: observacoes,
                cid: cid,
                paciente_autorizou_cid: autorizouCid,
                // Passa dados extras se for acompanhante para fins de payload (opcional para o backend registrar no banco se suportado)
                is_acompanhante: isAcompanhante,
                nome_acompanhante: isAcompanhante ? nomeAcompanhante : null,
                rg_acompanhante: isAcompanhante ? rgAcompanhante : null,
                data_emissao: `${dataAtestado}T12:00:00Z` 
            };

            const res = await apiClient.post(`/prontuario/pacientes/${paciente.id}/atestados/`, payload);
            const atestadoId = res.data.id;

            try {
                const pdfRes = await apiClient.get(`/pdf/atestado/${atestadoId}/`, { responseType: 'blob' });
                const fileURL = URL.createObjectURL(new Blob([pdfRes.data], { type: 'application/pdf' }));
                window.open(fileURL, '_blank');
            } catch (pdfErr) {
                const pdfResAlt = await apiClient.get(`/prontuario/atestados/${atestadoId}/pdf/`, { responseType: 'blob' });
                const fileURLAlt = URL.createObjectURL(new Blob([pdfResAlt.data], { type: 'application/pdf' }));
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
                    
                    <Grid container spacing={2}>
                        <Grid item xs={7}>
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
                        </Grid>
                        <Grid item xs={5}>
                            <TextField 
                                label="Data do Documento" 
                                type="date" 
                                value={dataAtestado} 
                                onChange={(e) => setDataAtestado(e.target.value)} 
                                fullWidth 
                                size="small" 
                            />
                        </Grid>
                    </Grid>

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
                        rows={5}
                        fullWidth
                        size="small"
                        helperText="Você pode editar o texto gerado livremente antes de imprimir."
                    />

                    {/* Caixa de Opções para o Acompanhante */}
                    <Box sx={{ mt: 1, mb: 1, p: 2, border: '1px dashed #ccc', borderRadius: '8px', bgcolor: '#fbfbfb' }}>
                        <FormControlLabel
                            control={
                                <Checkbox 
                                    checked={isAcompanhante} 
                                    onChange={(e) => {
                                        setIsAcompanhante(e.target.checked);
                                        if(!e.target.checked) {
                                            setNomeAcompanhante('');
                                            setRgAcompanhante('');
                                        }
                                    }} 
                                    color="primary"
                                />
                            }
                            label={<Typography fontWeight="bold" variant="body2">Emitir Atestado para Acompanhante?</Typography>}
                        />

                        {isAcompanhante && (
                            <Grid container spacing={2} sx={{ mt: 0.5 }}>
                                <Grid item xs={12} sm={7}>
                                    <TextField
                                        label="Nome do Acompanhante"
                                        fullWidth
                                        size="small"
                                        value={nomeAcompanhante}
                                        onChange={(e) => setNomeAcompanhante(e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={5}>
                                    <TextField
                                        label="RG do Acompanhante"
                                        fullWidth
                                        size="small"
                                        value={rgAcompanhante}
                                        onChange={(e) => setRgAcompanhante(e.target.value)}
                                        placeholder="Opcional"
                                    />
                                </Grid>
                            </Grid>
                        )}
                    </Box>

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