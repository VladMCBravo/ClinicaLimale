import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, MenuItem, Box, FormControlLabel, Checkbox, Typography, CircularProgress, Grid
} from '@mui/material';
import apiClient from '../../api/axiosConfig';
import { useAuth } from '../../hooks/useAuth';

// dataInicial/horaInicioInicial/horaFimInicial são opcionais — usados quando o modal é
// aberto a partir de um agendamento já existente (ver EventoAgendaMenu.jsx), pra vir
// pré-preenchido em vez de começar em branco/hoje.
export default function AtestadoModal({ open, onClose, paciente, medicoNome, medicoCrm, usaAssinaturaDigital, onSaveSuccess, dataInicial, horaInicioInicial, horaFimInicial }) {
    const hojeISO = new Date().toISOString().split('T')[0];
    const { user } = useAuth();
    // Atestado de Afastamento/Aptidão são atos privativos de médico (CFM) — o backend já
    // bloqueia isso (CanCreateAtestado), aqui é só pra não oferecer a opção a quem não
    // pode usá-la.
    const ehMedico = Boolean(user?.isMedico);

    const [dataAtestado, setDataAtestado] = useState(dataInicial || hojeISO);
    const [tipo, setTipo] = useState('Comparecimento');
    const [observacoes, setObservacoes] = useState('');
    const [cid, setCid] = useState('');
    const [autorizouCid, setAutorizouCid] = useState(false);
    const [dias, setDias] = useState('1');
    const [horaInicio, setHoraInicio] = useState(horaInicioInicial || '');
    const [horaFim, setHoraFim] = useState(horaFimInicial || '');
    const [loading, setLoading] = useState(false);
    
    // Estados para o Acompanhante (preenchidos quando tipo === 'Acompanhante')
    const [nomeAcompanhante, setNomeAcompanhante] = useState('');
    const [rgAcompanhante, setRgAcompanhante] = useState('');

    // Gera o texto automático baseado na escolha do dropdown e regras gramaticais
    useEffect(() => {
        if (!paciente) return;
        
        // Formata a data (YYYY-MM-DD para DD/MM/YYYY) de forma segura contra fuso-horário
        const [ano, mes, dia] = dataAtestado.split('-');
        const dataBR = `${dia}/${mes}/${ano}`;
        
        // Identificação dinâmica de gênero com base no cadastro do paciente
        const genero = (paciente.genero || paciente.sexo || '').toUpperCase();
        
        let artigo = 'o(a)';
        let submetido = 'submetido(a)';
        let apto = 'apto(a)';

        if (genero === 'M' || genero === 'MASCULINO') {
            artigo = 'o';
            submetido = 'submetido';
            apto = 'apto';
        } else if (genero === 'F' || genero === 'FEMININO') {
            artigo = 'a';
            submetido = 'submetida';
            apto = 'apta';
        }

        let texto = '';

        // Nas Declarações (Comparecimento/Acompanhante), menciona quem atendeu — o
        // documento continua assinado institucionalmente quando emitido pela recepção,
        // mas o texto registra o médico responsável pelo atendimento.
        const infoMedicoAtendimento = medicoNome
            ? ` Atendimento realizado por ${medicoNome}${medicoCrm ? ` — CRM ${medicoCrm}` : ''}.`
            : '';

        // Nova Condicional: Se o tipo selecionado for o Acompanhante
        if (tipo === 'Acompanhante') {
            const identificacaoAcompanhante = nomeAcompanhante ? nomeAcompanhante.toUpperCase() : '_______________________';
            const rgTexto = rgAcompanhante ? `, portador(a) do RG nº ${rgAcompanhante},` : '';

            texto = `Atesto para os devidos fins que o(a) Sr(a). ${identificacaoAcompanhante}${rgTexto} esteve presente nesta clínica médica nesta data (${dataBR}) no período das ${horaInicio || '___'} às ${horaFim || '___'}, acompanhando ${artigo} paciente ${paciente.nome_completo || paciente.nome}, que foi submetido(a) a consulta/exames médicos.${infoMedicoAtendimento}`;
        } else if (tipo === 'Comparecimento') {
            texto = `Atesto para os devidos fins que ${artigo} paciente ${paciente.nome_completo || paciente.nome}, compareceu a esta clínica médica nesta data (${dataBR}) no período das ${horaInicio || '___'} às ${horaFim || '___'}.${infoMedicoAtendimento}`;
        } else if (tipo === 'Afastamento') {
            texto = `Atesto para os devidos fins que ${artigo} paciente ${paciente.nome_completo || paciente.nome}, foi ${submetido} a atendimento médico nesta data (${dataBR}), necessitando de ${dias} dia(s) de repouso e afastamento de suas atividades laborais.`;
        } else {
            texto = `Atesto para os devidos fins que ${artigo} paciente ${paciente.nome_completo || paciente.nome}, encontra-se ${apto} para a realização de suas atividades a partir desta data (${dataBR}).`;
        }

        setObservacoes(texto);
    }, [tipo, dias, horaInicio, horaFim, paciente, dataAtestado, nomeAcompanhante, rgAcompanhante, medicoNome, medicoCrm]);

    const handleSalvar = async () => {
        setLoading(true);
        try {
            const payload = {
                // TRUQUE DE MESTRE AQUI: Se for Acompanhante, o banco salva como Comparecimento. 
                // O texto do PDF já estará correto nas observações!
                tipo_atestado: tipo === 'Acompanhante' ? 'Comparecimento' : tipo,
                
                observacoes: observacoes,
                cid: cid,
                paciente_autorizou_cid: autorizouCid,
                is_acompanhante: tipo === 'Acompanhante',
                nome_acompanhante: tipo === 'Acompanhante' ? nomeAcompanhante : null,
                rg_acompanhante: tipo === 'Acompanhante' ? rgAcompanhante : null,
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
            if (onSaveSuccess) onSaveSuccess(); // <-- ISSO AQUI AVISA A OUTRA TELA!
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
                                onChange={(e) => {
                                    setTipo(e.target.value);
                                    // Limpa os campos de acompanhante se mudar para outro tipo
                                    if(e.target.value !== 'Acompanhante') {
                                        setNomeAcompanhante('');
                                        setRgAcompanhante('');
                                    }
                                }}
                                fullWidth
                                size="small"
                            >
                                <MenuItem value="Comparecimento">Declaração de Comparecimento</MenuItem>
                                <MenuItem value="Acompanhante">Declaração de Acompanhante</MenuItem>
                                {ehMedico && <MenuItem value="Afastamento">Atestado de Afastamento</MenuItem>}
                                {ehMedico && <MenuItem value="Aptidao">Atestado de Aptidão Física</MenuItem>}
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

                    {/* Exibe os campos de horários tanto para comparecimento quanto para acompanhante */}
                    {(tipo === 'Comparecimento' || tipo === 'Acompanhante') && (
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

                    {/* Exibe os inputs de dados do acompanhante somente se o tipo for 'Acompanhante' */}
                    {tipo === 'Acompanhante' && (
                        <Box sx={{ p: 2, border: '1px dashed #1C2E4A', borderRadius: '8px', bgcolor: '#f9fbfd' }}>
                            <Typography fontWeight="bold" variant="body2" sx={{ mb: 1.5, color: '#1C2E4A' }}>
                                Informações do Acompanhante
                            </Typography>
                            <Grid container spacing={2}>
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
                        </Box>
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

                    {/* CID é diagnóstico — informação clínica que só faz sentido junto de uma
                        assinatura médica, então não aparece pra quem não é médico. */}
                    {ehMedico && (
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
                    )}

                    {usaAssinaturaDigital && (
                        <Typography variant="caption" sx={{ color: '#2E7D32', fontWeight: 'bold' }}>
                            ✓ Este documento será salvo no histórico e receberá sua Assinatura Digital ICP-Brasil.
                        </Typography>
                    )}

                    {!ehMedico && (
                        <Typography variant="caption" sx={{ color: '#666' }}>
                            Este documento será assinado institucionalmente como "Secretária — Clínica Limalé", sem CRM.
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