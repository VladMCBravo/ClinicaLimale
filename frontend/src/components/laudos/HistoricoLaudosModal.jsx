import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, Paper, IconButton, Chip, Alert, CircularProgress 
} from '@mui/material';
import { FaFilePdf, FaTimes, FaWhatsapp, FaEnvelope } from 'react-icons/fa';
import apiClient from '../../api/axiosConfig';

const HistoricoLaudosModal = ({ open, onClose, pacienteId, pacienteNome }) => {
    const [laudos, setLaudos] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && pacienteId) {
            carregarLaudos();
        }
    }, [open, pacienteId]);

    const carregarLaudos = async () => {
        setLoading(true);
        try {
            // Usa o mesmo endpoint que o médico usa
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

    const handleEnviarZap = (linkPdf) => {
        if (!linkPdf) return alert("Este laudo não tem PDF gerado.");
        const texto = `Olá! Segue o link do seu laudo: ${linkPdf}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
                Laudos de {pacienteNome}
                <IconButton onClick={onClose} size="small"><FaTimes /></IconButton>
            </DialogTitle>
            
            <DialogContent dividers>
                {loading ? <CircularProgress /> : laudos.length === 0 ? (
                    <Alert severity="info">Nenhum laudo encontrado para este paciente.</Alert>
                ) : (
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                <TableRow>
                                    <TableCell>Data</TableCell>
                                    <TableCell>Exame</TableCell>
                                    <TableCell>Médico</TableCell>
                                    <TableCell align="center">Arquivo</TableCell>
                                    <TableCell align="center">Enviar</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {laudos.map((laudo) => (
                                    <TableRow key={laudo.id}>
                                        <TableCell>{new Date(laudo.data_criacao).toLocaleDateString()}</TableCell>
                                        <TableCell>{laudo.titulo}</TableCell>
                                        <TableCell>{laudo.medico_nome}</TableCell>
                                        <TableCell align="center">
                                            {laudo.arquivo_pdf ? (
                                                <Button 
                                                    size="small" 
                                                    variant="outlined" 
                                                    color="error" 
                                                    startIcon={<FaFilePdf />}
                                                    onClick={() => window.open(laudo.arquivo_pdf, '_blank')}
                                                >
                                                    PDF
                                                </Button>
                                            ) : (
                                                <span style={{color:'#999', fontSize:'11px'}}>Não gerado</span>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            {laudo.arquivo_pdf && (
                                                <IconButton 
                                                    color="success" 
                                                    title="Enviar Link no WhatsApp"
                                                    onClick={() => handleEnviarZap(laudo.arquivo_pdf)}
                                                >
                                                    <FaWhatsapp />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            
            <DialogActions>
                <Button onClick={onClose}>Fechar</Button>
            </DialogActions>
        </Dialog>
    );
};

export default HistoricoLaudosModal;