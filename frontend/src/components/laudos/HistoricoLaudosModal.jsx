import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, Paper, IconButton, Chip, Alert, CircularProgress, Tooltip 
} from '@mui/material';
import { FaFilePdf, FaTimes, FaWhatsapp, FaPrint, FaSpinner } from 'react-icons/fa';
import apiClient from '../../api/axiosConfig';
import { gerarPDFLaudo } from '../../utils/laudoPdfGenerator'; // <--- IMPORTANTE: O gerador de PDF

const HistoricoLaudosModal = ({ open, onClose, pacienteId, pacienteNome }) => {
    const [laudos, setLaudos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [gerandoId, setGerandoId] = useState(null); // Para mostrar loading no botão específico

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

    // --- A MÁGICA DA 2ª VIA ---
    const handleGerar2Via = async (laudo) => {
        setGerandoId(laudo.id);
        try {
            // Prepara os dados. O backend pode mandar string ou objeto no JSONField
            let dadosEstruturados = laudo.dados_estruturados;
            if (typeof dadosEstruturados === 'string') {
                try { dadosEstruturados = JSON.parse(dadosEstruturados); } catch (e) {}
            }

            // --- CORREÇÃO AQUI ---
            // Usa o nome do médico salvo no formulário, não o usuário logado
            const nomeMedicoFinal = laudo.medico_responsavel || laudo.medico_nome;
            const crmMedicoFinal = laudo.crm_medico || ''; 

            const blob = await gerarPDFLaudo({
                pacienteNome: pacienteNome || laudo.paciente_nome,
                medicoNome: nomeMedicoFinal, // <--- CORRIGIDO
                medicoCrm: crmMedicoFinal,   // <--- CORRIGIDO
                tituloExame: laudo.titulo,
                textoLaudo: laudo.texto_laudo,
                dadosEstruturados: dadosEstruturados,
                imagensBase64: [], 
                comTimbre: true,
                usaAssinaturaDigital: false,
                retornarBlob: true
            });

        } catch (error) {
            console.error("Erro ao gerar 2ª via:", error);
            alert("Erro ao recriar o PDF.");
        } finally {
            setGerandoId(null);
        }
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
                                        {/* --- CORREÇÃO VISUAL NA TABELA --- */}
                                        <TableCell>
                                            <div style={{display:'flex', flexDirection:'column'}}>
                                                <span style={{fontWeight:'bold'}}>
                                                    {laudo.medico_responsavel || laudo.medico_nome}
                                                </span>
                                                {laudo.crm_medico && (
                                                    <span style={{fontSize:'10px', color:'#666'}}>
                                                        CRM: {laudo.crm_medico}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        {/* ---------------------------------- */}
                                        {/* COLUNA DO ARQUIVO */}
                                        <TableCell align="center">
                                            {/* Se tem PDF salvo no servidor (novos) */}
                                            {laudo.arquivos_exame && laudo.arquivos_exame.length > 0 ? (
                                                <Button 
                                                    size="small" 
                                                    variant="contained" 
                                                    color="error" 
                                                    startIcon={<FaFilePdf />}
                                                    onClick={() => window.open(laudo.arquivos_exame[0].arquivo, '_blank')}
                                                    sx={{ textTransform: 'none', fontSize: '11px' }}
                                                >
                                                    Abrir PDF
                                                </Button>
                                            ) : (
                                                /* Se NÃO tem PDF (antigos), mostra botão de Gerar na Hora */
                                                <Tooltip title="Recria o PDF usando os dados salvos">
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

                                        {/* COLUNA DE ENVIAR */}
                                        <TableCell align="center">
                                            {/* Só permite enviar link se o arquivo existir no servidor */}
                                            {laudo.arquivos_exame && laudo.arquivos_exame.length > 0 ? (
                                                <IconButton 
                                                    color="success" 
                                                    size="small"
                                                    title="Enviar Link no WhatsApp"
                                                    onClick={() => handleEnviarZap(laudo.arquivos_exame[0].arquivo)}
                                                >
                                                    <FaWhatsapp />
                                                </IconButton>
                                            ) : (
                                                <span style={{color:'#ccc', fontSize:'10px'}}>-</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
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