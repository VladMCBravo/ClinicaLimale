import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, Paper, IconButton, Chip, Alert, CircularProgress, Tooltip,
    Box, Typography
} from '@mui/material';
import { FaFilePdf, FaTimes, FaWhatsapp, FaPrint, FaSpinner, FaUserMd, FaKeyboard } from 'react-icons/fa';
import apiClient from '../../api/axiosConfig';
import { gerarPDFLaudo } from '../../utils/laudoPdfGenerator';

const HistoricoLaudosModal = ({ open, onClose, pacienteId, pacienteNome }) => {
    const [laudos, setLaudos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [gerandoId, setGerandoId] = useState(null);

    useEffect(() => {
        if (open && pacienteId) {
            carregarLaudos();
        }
    }, [open, pacienteId]);

    const carregarLaudos = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/prontuario/laudos/', {
                params: { paciente: pacienteId }
            });
            setLaudos(res.data);
        } catch (error) {
            console.error("Erro ao buscar laudos", error);
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA INTELIGENTE PARA ENCONTRAR O PDF ---
    const getLinkPDF = (laudo) => {
        // 1. Prioridade: Arquivo PDF assinado e salvo no campo novo
        if (laudo.arquivo_pdf) return laudo.arquivo_pdf;

        // 2. Prioridade: Procurar um PDF dentro da lista de arquivos do exame
        // Isso evita abrir uma imagem JPG por engano
        if (laudo.arquivos_exame && laudo.arquivos_exame.length > 0) {
            const arquivoPdf = laudo.arquivos_exame.find(f => 
                f.arquivo && f.arquivo.toLowerCase().endsWith('.pdf')
            );
            if (arquivoPdf) return arquivoPdf.arquivo;
        }

        // 3. Se não achou PDF, retorna null (para ativar o botão de Gerar 2ª Via)
        return null;
    };

    const handleEnviarZap = (linkPdf) => {
        if (!linkPdf) return alert("Gere a 2ª via do PDF primeiro.");
        const texto = `Olá! Segue o link do seu laudo: ${linkPdf}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
    };

    const handleGerar2Via = async (laudo) => {
        setGerandoId(laudo.id);
        const pdfWindow = window.open('', '_blank');
        
        if (pdfWindow) {
            pdfWindow.document.write(`
                <html>
                    <head><title>Gerando PDF...</title></head>
                    <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#f5f5f5;">
                        <div style="text-align:center;">
                            <h3>Gerando 2ª via do Laudo...</h3>
                            <p>Aguarde um instante.</p>
                        </div>
                    </body>
                </html>
            `);
        } else {
            setGerandoId(null);
            return alert("O navegador bloqueou a janela. Permita pop-ups.");
        }

        try {
            let dadosEstruturados = laudo.dados_estruturados;
            if (typeof dadosEstruturados === 'string') {
                try { dadosEstruturados = JSON.parse(dadosEstruturados); } catch (e) {}
            }

            const nomeMedicoParaPDF = laudo.medico_responsavel || laudo.medico_nome;
            const crmMedicoParaPDF = laudo.crm_medico || '';

            const blob = await gerarPDFLaudo({
                pacienteNome: pacienteNome || laudo.paciente_nome,
                medicoNome: nomeMedicoParaPDF,
                medicoCrm: crmMedicoParaPDF,
                tituloExame: laudo.titulo || laudo.tipo_exame,
                textoLaudo: laudo.texto_laudo,
                dadosEstruturados: dadosEstruturados,
                imagensBase64: [], 
                comTimbre: true,
                usaAssinaturaDigital: false,
                retornarBlob: true
            });

            const pdfUrl = URL.createObjectURL(blob);
            if (pdfWindow) pdfWindow.location.href = pdfUrl;

        } catch (error) {
            console.error("Erro ao gerar 2ª via:", error);
            if (pdfWindow) pdfWindow.close();
            alert("Erro ao recriar o PDF.");
        } finally {
            setGerandoId(null);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8f9fa' }}>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <span style={{fontWeight:'bold'}}>Histórico de Laudos</span>
                    <Chip label={pacienteNome} size="small" color="primary" variant="outlined"/>
                </div>
                <IconButton onClick={onClose} size="small"><FaTimes /></IconButton>
            </DialogTitle>
            
            <DialogContent dividers sx={{ p: 0 }}>
                {loading ? (
                    <div style={{padding:'40px', textAlign:'center'}}><CircularProgress /></div>
                ) : laudos.length === 0 ? (
                    <div style={{padding:'20px'}}>
                        <Alert severity="info">Nenhum laudo encontrado para este paciente.</Alert>
                    </div>
                ) : (
                    <TableContainer component={Paper} elevation={0}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: '#eee' }}>
                                <TableRow>
                                    <TableCell><strong>Data</strong></TableCell>
                                    <TableCell><strong>Exame</strong></TableCell>
                                    <TableCell><strong>Responsáveis</strong></TableCell>
                                    <TableCell align="center"><strong>Ações</strong></TableCell>
                                    <TableCell align="center"><strong>Envio</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {laudos.map((laudo) => {
                                    // Determina o link real do PDF
                                    const linkPdfReal = getLinkPDF(laudo);
                                    
                                    // Determina os nomes
                                    // Se 'medico_responsavel' existir, usa ele. Se não, tenta pegar do CRM ou usa o usuário como fallback visual (com aviso)
                                    const nomeMedicoAssinatura = laudo.medico_responsavel || laudo.medico_nome;
                                    const crmMedico = laudo.crm_medico || "N/I";
                                    const usuarioGerador = laudo.medico_nome;

                                    return (
                                        <TableRow key={laudo.id} hover>
                                            <TableCell width="15%">{new Date(laudo.data_criacao).toLocaleDateString()}</TableCell>
                                            <TableCell width="25%">
                                                {laudo.titulo || laudo.tipo_exame}
                                                <div style={{fontSize:'10px', color:'#999'}}>{laudo.tipo_exame}</div>
                                            </TableCell>
                                            
                                            {/* COLUNA DE MÉDICOS CORRIGIDA */}
                                            <TableCell width="30%">
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    {/* 1. Quem Assina (Importante) */}
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <FaUserMd color="#1976d2" size={12} title="Médico Responsável (Assinatura)"/>
                                                        <div>
                                                            <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1, fontSize:'11px' }}>
                                                                {nomeMedicoAssinatura}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: '#555', fontSize:'10px' }}>
                                                                CRM: {crmMedico}
                                                            </Typography>
                                                        </div>
                                                    </Box>

                                                    {/* 2. Quem Digitou (Auditoria) */}
                                                    {/* Só mostra se for diferente do médico ou se for relevante */}
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, pt: 0.5, borderTop: '1px dashed #e0e0e0' }}>
                                                        <FaKeyboard color="#9e9e9e" size={12} title="Digitado/Gerado por"/>
                                                        <Typography variant="caption" sx={{ color: '#757575', fontSize:'10px' }}>
                                                            Digitado por: {usuarioGerador}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            
                                            {/* COLUNA DE AÇÕES (PDF vs 2ª VIA) */}
                                            <TableCell align="center">
                                                {linkPdfReal ? (
                                                    <Button 
                                                        size="small" 
                                                        variant="contained" 
                                                        color="error" 
                                                        startIcon={<FaFilePdf />}
                                                        onClick={() => window.open(linkPdfReal, '_blank')}
                                                        sx={{ textTransform: 'none', fontSize: '11px' }}
                                                    >
                                                        Abrir PDF
                                                    </Button>
                                                ) : (
                                                    <Tooltip title="Arquivo PDF não encontrado. Gere uma nova cópia baseada nos dados salvos.">
                                                        <Button 
                                                            size="small" 
                                                            variant="outlined" 
                                                            color="warning"
                                                            startIcon={gerandoId === laudo.id ? <FaSpinner className="spin" /> : <FaPrint />}
                                                            onClick={() => handleGerar2Via(laudo)}
                                                            disabled={gerandoId === laudo.id}
                                                            sx={{ textTransform: 'none', fontSize: '11px', fontWeight: 'bold' }}
                                                        >
                                                            {gerandoId === laudo.id ? "Gerando..." : "Gerar 2ª Via"}
                                                        </Button>
                                                    </Tooltip>
                                                )}
                                            </TableCell>

                                            <TableCell align="center">
                                                {linkPdfReal ? (
                                                    <IconButton 
                                                        color="success" 
                                                        size="small"
                                                        title="Enviar Link no WhatsApp"
                                                        onClick={() => handleEnviarZap(linkPdfReal)}
                                                    >
                                                        <FaWhatsapp />
                                                    </IconButton>
                                                ) : (
                                                    <span style={{color:'#ccc', fontSize:'10px'}}>-</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            
            <DialogActions sx={{ bgcolor: '#f8f9fa' }}>
                <Button onClick={onClose} color="inherit">Fechar</Button>
            </DialogActions>
        </Dialog>
    );
};

export default HistoricoLaudosModal;