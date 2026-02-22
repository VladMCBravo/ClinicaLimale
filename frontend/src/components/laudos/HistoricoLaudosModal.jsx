import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, Paper, IconButton, Chip, Alert, CircularProgress, Tooltip,
    Box, Typography
} from '@mui/material';
import { FaFilePdf, FaTimes, FaWhatsapp, FaPrint, FaSpinner, FaUserMd, FaKeyboard, FaTrash } from 'react-icons/fa';
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
            // 1. Busca os laudos estruturados (digitados pela ajudante no sistema)
            const resLaudos = await apiClient.get('/prontuario/laudos/', {
                params: { paciente: pacienteId }
            });
            const laudosEstruturados = resLaudos.data;

            // 2. Busca os exames/pastas (enviados pela Samsung V7)
            const resExames = await apiClient.get('/exames/exames-paciente/', {
                params: { paciente_id: pacienteId }
            });
            const exames = resExames.data;

            // 3. Descobre quais exames já têm laudo digitado para não duplicar na tela
            const examesComLaudoDigitado = laudosEstruturados
                .map(l => l.exame)
                .filter(id => id != null);
            
            // 4. Filtra e formata os PDFs que vieram direto da máquina
            const pdfsExternos = exames.filter(ex => {
                // Ignora se o exame já tem um laudo digitado conectado a ele
                if (examesComLaudoDigitado.includes(ex.id)) return false;
                // Só entra se houver algum arquivo PDF nessa pasta
                return ex.arquivos && ex.arquivos.some(arq => arq.arquivo.toLowerCase().endsWith('.pdf'));
            }).map(ex => {
                const pdfObj = ex.arquivos.find(arq => arq.arquivo.toLowerCase().endsWith('.pdf'));
                return {
                    id: `ex_${ex.id}`, // ID com prefixo para o React não confundir
                    is_exame_externo: true, // Flag de segurança
                    data_criacao: ex.data_exame,
                    titulo: "PDF Externo / Máquina",
                    tipo_exame: ex.nome_paciente_pasta,
                    medico_responsavel: "---", 
                    medico_nome: "Enviado pela Máquina",
                    arquivo_pdf: pdfObj.arquivo, 
                    dados_estruturados: null
                };
            });

            // 5. Junta tudo na mesma lista e ordena por data
            const listaUnificada = [...laudosEstruturados, ...pdfsExternos];
            listaUnificada.sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao));

            setLaudos(listaUnificada);
            
        } catch (error) {
            console.error("Erro ao buscar histórico unificado:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("⚠️ TEM CERTEZA? Isso apagará o laudo permanentemente.")) return;
        try {
            await apiClient.delete(`/prontuario/laudos/${id}/`);
            setLaudos(prev => prev.filter(l => l.id !== id));
            alert("Laudo excluído!");
        } catch (error) {
            alert("Erro ao excluir. Verifique permissões.");
        }
    };

    const getLinkPDF = (laudo) => {
        if (laudo.arquivo_pdf) return laudo.arquivo_pdf;
        if (laudo.arquivos_exame && laudo.arquivos_exame.length > 0) {
            const arquivoPdf = laudo.arquivos_exame.find(f => 
                f.arquivo && f.arquivo.toLowerCase().endsWith('.pdf')
            );
            if (arquivoPdf) return arquivoPdf.arquivo;
        }
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

            // Fallback inteligente para o PDF:
            // Se não tiver médico responsável salvo (antigo), usa o nome do login,
            // mas na TABELA (visualização) mostraremos separado.
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
                                    <TableCell align="center" sx={{color:'red'}}><strong>Excluir</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {laudos.map((laudo) => {
                                    const linkPdfReal = getLinkPDF(laudo);
                                    
                                    // --- LÓGICA DE NOMES CRISTALINA ---
                                    // 1. Assinatura: Se null, mostra "---". Não inventa.
                                    const medicoAssinatura = laudo.medico_responsavel ? laudo.medico_responsavel : "---";
                                    const crm = laudo.crm_medico || "";
                                    
                                    // 2. Gerador: Sempre mostra o login.
                                    const usuarioGerador = laudo.medico_nome; 

                                    return (
                                        <TableRow key={laudo.id} hover>
                                            <TableCell width="15%">{new Date(laudo.data_criacao).toLocaleDateString()}</TableCell>
                                            <TableCell width="25%">
                                                {laudo.titulo || laudo.tipo_exame}
                                                <div style={{fontSize:'10px', color:'#999'}}>{laudo.tipo_exame}</div>
                                            </TableCell>
                                            
                                            <TableCell width="30%">
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    {/* LINHA 1: MÉDICO (ASSINATURA) */}
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <FaUserMd color="#1976d2" size={12} title="Médico Responsável (Assinatura)"/>
                                                        <div>
                                                            <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1, fontSize:'11px', color: medicoAssinatura === "---" ? '#999' : '#000' }}>
                                                                {medicoAssinatura}
                                                            </Typography>
                                                            {crm && (
                                                                <Typography variant="caption" sx={{ color: '#555', fontSize:'10px' }}>
                                                                    CRM: {crm}
                                                                </Typography>
                                                            )}
                                                        </div>
                                                    </Box>

                                                    {/* LINHA 2: GERADO POR (LOGIN) - SEMPRE VISÍVEL */}
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, pt: 0.5, borderTop: '1px dashed #e0e0e0' }}>
                                                        <FaKeyboard color="#9e9e9e" size={12} title="Digitado/Gerado por"/>
                                                        <Typography variant="caption" sx={{ color: '#757575', fontSize:'10px' }}>
                                                            Gerado por: {usuarioGerador}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            
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
                                                        PDF
                                                    </Button>
                                                ) : (
                                                    <Tooltip title="Gerar 2ª via">
                                                        <Button 
                                                            size="small" 
                                                            variant="outlined" 
                                                            color="warning"
                                                            startIcon={gerandoId === laudo.id ? <FaSpinner className="spin" /> : <FaPrint />}
                                                            onClick={() => handleGerar2Via(laudo)}
                                                            disabled={gerandoId === laudo.id}
                                                            sx={{ textTransform: 'none', fontSize: '11px', fontWeight: 'bold' }}
                                                        >
                                                            {gerandoId === laudo.id ? "..." : "2ª Via"}
                                                        </Button>
                                                    </Tooltip>
                                                )}
                                            </TableCell>

                                            <TableCell align="center">
                                                {linkPdfReal ? (
                                                    <IconButton 
                                                        color="success" 
                                                        size="small"
                                                        onClick={() => handleEnviarZap(linkPdfReal)}
                                                    >
                                                        <FaWhatsapp />
                                                    </IconButton>
                                                ) : <span style={{color:'#ccc'}}>-</span>}
                                            </TableCell>

                                            <TableCell align="center">
                                                {laudo.is_exame_externo ? (
                                                    <Tooltip title="Protegido: Arquivo original da máquina">
                                                        <span>
                                                            <IconButton size="small" disabled sx={{ color: '#eee' }}>
                                                                <FaTrash size={14} />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                ) : (
                                                    <IconButton 
                                                        size="small" 
                                                        color="default" 
                                                        onClick={() => handleDelete(laudo.id)}
                                                        sx={{ '&:hover': { color: 'red' } }}
                                                    >
                                                        <FaTrash size={14} />
                                                    </IconButton>
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