import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, Grid, Typography, Box, CircularProgress, 
    Card, CardMedia, Checkbox 
} from '@mui/material';
import { FaCloudDownloadAlt, FaCheck, FaTimes, FaCalendarAlt } from 'react-icons/fa';
import apiClient from '../../api/axiosConfig'; // Ajuste o caminho conforme sua estrutura

const ImagensNuvemModal = ({ open, onClose, paciente, onConfirmar }) => {
    const [loading, setLoading] = useState(false);
    const [examesEncontrados, setExamesEncontrados] = useState([]);
    const [imagensSelecionadas, setImagensSelecionadas] = useState([]);

    // Busca exames assim que o modal abre
    useEffect(() => {
        if (open && paciente?.id) {
            buscarExamesNaNuvem();
        }
    }, [open, paciente]);

    const buscarExamesNaNuvem = async () => {
        setLoading(true);
        try {
            // Usa a rota que lista exames do paciente
            const response = await apiClient.get(`/prontuario/exames-paciente/?paciente_id=${paciente.id}`);
            setExamesEncontrados(response.data);
        } catch (error) {
            console.error("Erro ao buscar exames:", error);
            // Fallback: Se não achar vinculado, tenta buscar pendentes (opcional)
        } finally {
            setLoading(false);
        }
    };

    const toggleImagem = (urlImagem) => {
        setImagensSelecionadas(prev => {
            if (prev.includes(urlImagem)) {
                return prev.filter(img => img !== urlImagem);
            } else {
                return [...prev, urlImagem];
            }
        });
    };

    const handleConfirmar = async () => {
        setLoading(true);
        try {
            // Converter URLs em Base64 para o editor
            const promises = imagensSelecionadas.map(async (url) => {
                const response = await fetch(url);
                const blob = await response.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve("CLOUD:" + reader.result); // <-- TAG ADICIONADA AQUI
                    reader.readAsDataURL(blob);
                });
            });

            const base64List = await Promise.all(promises);
            onConfirmar(base64List);
            onClose();
            setImagensSelecionadas([]);
        } catch (error) {
            console.error("Erro ao processar imagens:", error);
            alert("Erro ao baixar imagens da nuvem.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle style={{ background: '#007FFF', color: 'white', display: 'flex', alignItems: 'center', gap: 10 }}>
                <FaCloudDownloadAlt /> Selecionar Imagens da Nuvem
            </DialogTitle>
            
            <DialogContent style={{ background: '#f5f5f5', padding: '20px', minHeight: '400px' }}>
                {loading && (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                        <CircularProgress />
                    </Box>
                )}

                {!loading && examesEncontrados.length === 0 && (
                    <Box textAlign="center" mt={5} color="#777">
                        <Typography variant="h6">Nenhum exame encontrado na nuvem para este paciente.</Typography>
                        <Typography variant="body2">Verifique se o script de upload finalizou o envio.</Typography>
                    </Box>
                )}

                {!loading && examesEncontrados.map((exame) => (
                    <Box key={exame.id} mb={3}>
                        <Box display="flex" alignItems="center" mb={1} gap={1}>
                            <FaCalendarAlt color="#555"/>
                            <Typography variant="subtitle1" fontWeight="bold">
                                {new Date(exame.data_exame).toLocaleDateString('pt-BR')} - {exame.nome_paciente_pasta}
                            </Typography>
                        </Box>
                        
                        <Grid container spacing={2}>
                            {exame.arquivos.map((arq) => {
                                const isSelected = imagensSelecionadas.includes(arq.url || arq.arquivo);
                                const imgUrl = arq.url || arq.arquivo; // Ajuste conforme seu backend retorna

                                return (
                                    <Grid item xs={6} sm={4} md={3} key={arq.id}>
                                        <Card 
                                            onClick={() => toggleImagem(imgUrl)}
                                            style={{ 
                                                cursor: 'pointer', 
                                                border: isSelected ? '3px solid #007FFF' : '1px solid #ddd',
                                                position: 'relative'
                                            }}
                                        >
                                            <CardMedia
                                                component="img"
                                                height="140"
                                                image={imgUrl}
                                                alt="Exame"
                                            />
                                            {isSelected && (
                                                <Box 
                                                    position="absolute" top={5} right={5} 
                                                    bgcolor="#007FFF" color="white" 
                                                    borderRadius="50%" width={24} height={24} 
                                                    display="flex" alignItems="center" justifyContent="center"
                                                >
                                                    <FaCheck size={12}/>
                                                </Box>
                                            )}
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Box>
                ))}
            </DialogContent>

            <DialogActions style={{ padding: 15 }}>
                <Typography variant="caption" style={{ flex: 1, marginLeft: 10 }}>
                    {imagensSelecionadas.length} imagens selecionadas
                </Typography>
                <Button onClick={onClose} color="inherit">Cancelar</Button>
                <Button 
                    onClick={handleConfirmar} 
                    variant="contained" 
                    style={{ background: '#007FFF', color: 'white' }}
                    disabled={imagensSelecionadas.length === 0}
                >
                    Importar Selecionadas
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ImagensNuvemModal;