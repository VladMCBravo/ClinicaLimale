// src/components/prontuario/LaudosTab.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Paper, Typography, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, IconButton, Chip, 
    Button, CircularProgress, Alert, Dialog, DialogTitle, 
    DialogContent, DialogActions, Grid
} from '@mui/material';
import { FaPrint, FaEye, FaPlus, FaTimes, FaFilePdf } from 'react-icons/fa';
import apiClient from '../../api/axiosConfig';
import { gerarPDFLaudo } from '../../utils/laudoPdfGenerator'; // Importando o gerador

const LaudosTab = ({ pacienteId }) => {
    const [laudos, setLaudos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState(null);
    
    // Estado para o Modal de Visualização
    const [laudoSelecionado, setLaudoSelecionado] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [loadingImagens, setLoadingImagens] = useState(false);

    useEffect(() => {
        if (!pacienteId) return;
        buscarLaudos();
    }, [pacienteId]);

    const buscarLaudos = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/prontuario/laudos/', {
                params: { paciente: pacienteId }
            });
            setLaudos(response.data);
            setErro(null);
        } catch (error) {
            console.error("Erro ao buscar laudos:", error);
            setErro("Não foi possível carregar o histórico.");
        } finally {
            setLoading(false);
        }
    };

    // Função Auxiliar: Converter URL da imagem (do backend) para Base64 (para o PDF)
    const converterImagensParaBase64 = async (listaImagens) => {
        if (!listaImagens || listaImagens.length === 0) return [];
        
        const promessas = listaImagens.map(async (imgObj) => {
            try {
                // imgObj.arquivo é a URL (ex: http://localhost:8000/media/...)
                const response = await fetch(imgObj.arquivo);
                const blob = await response.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            } catch (err) {
                console.error("Erro ao converter imagem:", err);
                return null;
            }
        });

        const resultados = await Promise.all(promessas);
        return resultados.filter(img => img !== null);
    };

    const handleImprimir = async (laudo) => {
        setLoadingImagens(true);
        try {
            // 1. Converte imagens do backend para Base64
            const imgsBase64 = await converterImagensParaBase64(laudo.imagens);

            // 2. Chama o gerador compartilhado
            gerarPDFLaudo({
                pacienteNome: laudo.paciente_nome || "Paciente", // Ajuste conforme seu serializer retorna o nome
                medicoNome: laudo.medico_nome,
                medicoCrm: laudo.crm_medico || "", // Se tiver salvo no laudo
                tituloExame: laudo.titulo,
                textoLaudo: laudo.texto_laudo,
                dadosEstruturados: laudo.dados_estruturados,
                imagensBase64: imgsBase64
            });
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert("Erro ao preparar imagens para impressão.");
        } finally {
            setLoadingImagens(false);
        }
    };

    const handleVisualizar = (laudo) => {
        setLaudoSelecionado(laudo);
        setOpenModal(true);
    };

    const handleFecharModal = () => {
        setOpenModal(false);
        setLaudoSelecionado(null);
    };

    if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
    if (erro) return <Alert severity="error">{erro}</Alert>;

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            {/* Cabeçalho */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" color="primary">Histórico de Laudos</Typography>
                <Button variant="contained" color="secondary" startIcon={<FaPlus />} onClick={() => alert("Vá para a página Laudos.")}>
                    Novo Laudo
                </Button>
            </Box>

            {/* Tabela */}
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell>Data</TableCell>
                            <TableCell>Título</TableCell>
                            <TableCell>Médico</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="center">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {laudos.map((laudo) => (
                            <TableRow key={laudo.id} hover>
                                <TableCell>{new Date(laudo.data_criacao).toLocaleDateString('pt-BR')}</TableCell>
                                <TableCell>{laudo.titulo}</TableCell>
                                <TableCell>{laudo.medico_nome}</TableCell>
                                <TableCell>
                                    <Chip label={laudo.status} size="small" color={laudo.status === 'FINALIZADO' ? 'success' : 'warning'} />
                                </TableCell>
                                <TableCell align="center">
    {/* 1. Botão do PDF Assinado (Prioridade) */}
    {laudo.arquivo_pdf ? (
        <IconButton 
            size="small" 
            color="error" // Vermelho para destacar PDF
            title="Baixar PDF Assinado Original"
            onClick={() => window.open(laudo.arquivo_pdf, '_blank')}
            sx={{ mr: 1 }}
        >
            <FaFilePdf />
        </IconButton>
    ) : (
        /* Se não tiver PDF salvo (legado), mostra o botão de Gerar na Hora */
        <IconButton 
            size="small" 
            color="primary" 
            title="Gerar PDF Agora"
            onClick={() => handleImprimir(laudo)} 
            disabled={loadingImagens}
            sx={{ mr: 1 }}
        >
            {loadingImagens ? <CircularProgress size={20} /> : <FaPrint />}
        </IconButton>
    )}

    {/* 2. Botão de Visualizar Texto Rápido */}
    <IconButton size="small" onClick={() => handleVisualizar(laudo)} title="Ver Detalhes">
        <FaEye />
    </IconButton>
</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Modal de Visualização na Tela */}
            <Dialog open={openModal} onClose={handleFecharModal} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
                    {laudoSelecionado?.titulo}
                    <IconButton onClick={handleFecharModal} size="small"><FaTimes /></IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {laudoSelecionado && (
                        <Box>
                            {/* Metadados */}
                            <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                                Realizado em: {new Date(laudoSelecionado.data_criacao).toLocaleString()} por {laudoSelecionado.medico_nome}
                            </Typography>
                            
                            {/* Texto do Laudo */}
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fafafa', mb: 3, whiteSpace: 'pre-wrap', fontFamily: 'serif', fontSize: '1.1rem' }}>
                                {laudoSelecionado.texto_laudo}
                            </Paper>

                            {/* Galeria de Imagens */}
                            {laudoSelecionado.imagens && laudoSelecionado.imagens.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>Imagens Anexadas:</Typography>
                                    <Grid container spacing={2}>
                                        {laudoSelecionado.imagens.map((img, idx) => (
                                            <Grid item xs={6} sm={4} key={img.id || idx}>
                                                <Box sx={{ border: '1px solid #ddd', borderRadius: 1, overflow: 'hidden', height: 150 }}>
                                                    <img 
                                                        src={img.arquivo} 
                                                        alt={`Anexo ${idx}`} 
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                                        onClick={() => window.open(img.arquivo, '_blank')}
                                                    />
                                                </Box>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleFecharModal}>Fechar</Button>
                    <Button variant="contained" onClick={() => handleImprimir(laudoSelecionado)}>
                        Imprimir PDF
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default LaudosTab;