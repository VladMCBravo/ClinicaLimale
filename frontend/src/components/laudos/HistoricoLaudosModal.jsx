import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, IconButton, Alert, CircularProgress, Tooltip,
    Box, Typography, Accordion, AccordionSummary, AccordionDetails, Divider
} from '@mui/material';
import { FaWhatsapp, FaUserMd, FaKeyboard, FaTrash, FaSpinner, FaPrint } from 'react-icons/fa';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloseIcon from '@mui/icons-material/Close';

import apiClient from '../../api/axiosConfig';
import { useAuth } from '../../hooks/useAuth';

const HistoricoLaudosModal = ({ open, onClose, pacienteId, pacienteNome }) => {
    const [laudos, setLaudos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [gerandoId, setGerandoId] = useState(null); // 🚀 ADICIONE ESTA LINHA AQUI!
    const { user } = useAuth();

    useEffect(() => {
        if (open && pacienteId) {
            carregarLaudos();
        }
    }, [open, pacienteId]);

    const carregarLaudos = async () => {
        setLoading(true);
        try {
            const resLaudos = await apiClient.get('/prontuario/laudos/', { params: { paciente: pacienteId } });
            const laudosEstruturados = Array.isArray(resLaudos.data) ? resLaudos.data : resLaudos.data.results || [];

            const resExames = await apiClient.get('/prontuario/exames-paciente/', { params: { paciente_id: pacienteId } });
            const exames = Array.isArray(resExames.data) ? resExames.data : resExames.data.results || [];

            const examesComLaudoDigitado = laudosEstruturados.map(l => l.exame).filter(id => id != null);
            
            const pdfsExternos = exames.filter(ex => {
                if (examesComLaudoDigitado.includes(ex.id)) return false;
                return ex.arquivos && ex.arquivos.some(arq => arq.arquivo && arq.arquivo.toLowerCase().includes('.pdf'));
            }).map(ex => {
                const pdfObj = ex.arquivos.find(arq => arq.arquivo && arq.arquivo.toLowerCase().includes('.pdf'));
                return {
                    id: `ex_${ex.id}`, 
                    is_exame_externo: true, 
                    data_criacao: ex.data_exame,
                    titulo: "PDF Original (Máquina)", 
                    tipo_exame: ex.nome_paciente_pasta,
                    medico_responsavel: "---", 
                    medico_nome: "Enviado pelo Equipamento",
                    arquivo_pdf: pdfObj.arquivo, 
                    dados_estruturados: null
                };
            });

            const listaUnificada = [...laudosEstruturados, ...pdfsExternos];
            listaUnificada.sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao));
            setLaudos(listaUnificada);
            
        } catch (error) {
            console.error("Erro ao buscar histórico unificado:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGerar2Via = async (laudo) => {
        setGerandoId(laudo.id);
        try {
            // Solicita ao servidor que reconstrua o PDF com o nosso gerador avançado
            const res = await apiClient.post(`/prontuario/laudos/${laudo.id}/regerar-pdf/`);
            
            if (res.data && res.data.arquivo_url) {
                const baseUrl = apiClient.defaults.baseURL.replace('/api', '').replace(/\/$/, '');
                const fullUrl = res.data.arquivo_url.startsWith('/') ? `${baseUrl}${res.data.arquivo_url}` : res.data.arquivo_url;
                
                // Transforma o botão amarelo em botão vermelho na mesma hora!
                setLaudos(prev => prev.map(l => l.id === laudo.id ? { ...l, arquivo_pdf: fullUrl, status: 'FINALIZADO' } : l));
                
                window.open(fullUrl, '_blank');
            }
        } catch (error) {
            console.error("Erro ao regerar 2ª via:", error);
            alert("Erro ao recriar o PDF no servidor. Tente novamente.");
        } finally {
            setGerandoId(null);
        }
    };

    const handleDelete = async (id, status) => {
        if (status === 'FINALIZADO') {
            const confirmar = window.confirm(
                "🛑 ATENÇÃO: Este laudo já está FINALIZADO e disponível no portal do paciente.\n\n" +
                "Se você excluí-lo, o paciente perderá o acesso ao PDF imediatamente.\n\n" +
                "Tem certeza absoluta que deseja apagar este documento oficial?"
            );
            if (!confirmar) return;
        } else {
            const confirmarRascunho = window.confirm("Deseja excluir este laudo do sistema?");
            if (!confirmarRascunho) return;
        }

        try {
            await apiClient.delete(`/prontuario/laudos/${id}/`);
            setLaudos(prev => prev.filter(l => l.id !== id));
        } catch (error) {
            console.error("Erro ao excluir laudo:", error);
            alert("Erro ao excluir. Verifique se você tem permissão ou tente novamente.");
        }
    };

    const getLinkPDF = (laudo) => {
        let path = null;
        
        if (laudo.arquivo_pdf) {
            path = typeof laudo.arquivo_pdf === 'object' ? laudo.arquivo_pdf.url : laudo.arquivo_pdf;
        } else if (laudo.arquivos_exame && Array.isArray(laudo.arquivos_exame) && laudo.arquivos_exame.length > 0) {
            const arquivoPdf = laudo.arquivos_exame.find(f => f.arquivo && typeof f.arquivo === 'string' && f.arquivo.toLowerCase().includes('.pdf'));
            if (arquivoPdf) path = arquivoPdf.arquivo;
        }

        if (path) {
            // Se o Django mandou apenas a rota /media/..., nós colamos a base da API
            if (path.startsWith('/')) {
                const baseUrl = apiClient.defaults.baseURL.replace('/api', '').replace(/\/$/, '');
                return `${baseUrl}${path}`;
            }
            return path;
        }
        return null;
    };

    const handleEnviarZap = (linkPdf) => {
        if (!linkPdf) return alert("O PDF ainda não está disponível.");
        const texto = `Olá! Segue o link do seu laudo: ${linkPdf}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disableEscapeKeyDown={loading}>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: '#333', fontSize: '1.1rem' }}>
                    Histórico de Laudos
                </Typography>
                <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            
            <DialogContent dividers sx={{ p: 2, bgcolor: '#ffffff' }} className="tasy-compact-input">
                <Typography className="tasy-section-header">
                    Paciente: {pacienteNome || "Não Informado"}
                </Typography>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={30}/></Box>
                ) : laudos.length === 0 ? (
                    <Alert severity="info" sx={{ mt: 2 }}>Nenhum laudo encontrado para este paciente.</Alert>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {laudos.map((laudo) => {
                            const linkPdfReal = getLinkPDF(laudo);
                            const medicoAssinatura = laudo.medico_responsavel ? laudo.medico_responsavel : "---";
                            const crm = laudo.crm_medico || "";

                            return (
                                <Accordion key={laudo.id} disableGutters sx={{ border: '1px solid #e0e0e0', '&:before': { display: 'none' } }}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                                {new Date(laudo.data_criacao).toLocaleDateString('pt-BR')} - {laudo.titulo || laudo.tipo_exame}
                                            </Typography>
                                            {laudo.is_exame_externo && (
                                                <Typography variant="caption" color="text.secondary">Arquivo Original da Máquina</Typography>
                                            )}
                                        </Box>
                                    </AccordionSummary>
                                    
                                    <AccordionDetails sx={{ p: 1.5, pt: 0, bgcolor: '#f8f9fa' }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <FaUserMd color="#1976d2" size={12} />
                                                <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '11px', color: medicoAssinatura === "---" ? '#999' : '#000' }}>
                                                    Resp: {medicoAssinatura} {crm && `(CRM: ${crm})`}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <FaKeyboard color="#9e9e9e" size={12} />
                                                <Typography variant="caption" sx={{ color: '#757575', fontSize: '10px' }}>
                                                    Gerado por: {laudo.medico_nome}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        
                                        <Divider sx={{ my: 1 }} />
                                        
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            {linkPdfReal ? (
                                                <Button 
                                                    size="small" variant="contained" color="error" 
                                                    startIcon={<PictureAsPdfIcon />}
                                                    onClick={() => window.open(linkPdfReal, '_blank')}
                                                    sx={{ flexGrow: 1, textTransform: 'none', fontSize: '11px' }}
                                                    disableElevation
                                                >
                                                    Baixar PDF Finalizado
                                                </Button>
                                            ) : (
                                                <Button 
                                                    size="small" variant="outlined" color="warning"
                                                    startIcon={gerandoId === laudo.id ? <FaSpinner className="spin" /> : <FaPrint />}
                                                    onClick={() => handleGerar2Via(laudo)}
                                                    disabled={gerandoId === laudo.id}
                                                    sx={{ flexGrow: 1, textTransform: 'none', fontSize: '11px', fontWeight: 'bold' }}
                                                >
                                                    {gerandoId === laudo.id ? "Processando..." : "Gerar 2ª Via"}
                                                </Button>
                                            )}

                                            {linkPdfReal && (
                                                <Tooltip title="Enviar por WhatsApp">
                                                    <IconButton 
                                                        color="success" size="small"
                                                        onClick={() => handleEnviarZap(linkPdfReal)}
                                                        sx={{ border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fff' }}
                                                    >
                                                        <FaWhatsapp size={16} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}

                                            {!laudo.is_exame_externo && user?.id === laudo.medico && (
                                                <Tooltip title="Excluir Laudo">
                                                    <IconButton 
                                                        size="small" color="error" 
                                                        onClick={() => handleDelete(laudo.id, laudo.status)}
                                                        sx={{ border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fff' }}
                                                    >
                                                        <FaTrash size={14} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })}
                    </Box>
                )}
            </DialogContent>
            
            <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
                <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none' }}>Fechar</Button>
            </DialogActions>
        </Dialog>
    );
};

export default HistoricoLaudosModal;