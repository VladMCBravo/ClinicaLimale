import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Button, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Autocomplete, TextField, Snackbar, Alert
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import { listarPendentes, vincularPaciente } from '../services/exames';
import { getPacientes } from '../services/pacientesService'; // Ajuste o import conforme seu projeto

export default function VincularExames() {
  const [exames, setExames] = useState([]);
  const [pacientes, setPacientes] = useState([]); // Lista para o autocomplete
  const [loading, setLoading] = useState(true);
  
  // Estado para o vínculo selecionado
  const [selecoes, setSelecoes] = useState({}); // { exame_id: paciente_obj }
  
  const [feedback, setFeedback] = useState({ open: false, msg: '', type: 'success' });

  // 1. Carrega dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [examesData, pacientesData] = await Promise.all([
        listarPendentes(),
        getPacientes() // Traz todos os pacientes para busca (se for muitos, precisaremos de busca assíncrona)
      ]);
      setExames(examesData);
      setPacientes(pacientesData);
    } catch (error) {
      console.error("Erro ao carregar:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Ação de Vincular
  const handleVincular = async (exameId) => {
    const pacienteSelecionado = selecoes[exameId];
    
    if (!pacienteSelecionado) {
      setFeedback({ open: true, msg: 'Selecione um paciente primeiro.', type: 'warning' });
      return;
    }

    try {
      await vincularPaciente(exameId, pacienteSelecionado.id);
      
      // Remove o exame da lista visualmente
      setExames(exames.filter(e => e.id !== exameId));
      setFeedback({ open: true, msg: 'Exame vinculado com sucesso!', type: 'success' });
    } catch (error) {
      setFeedback({ open: true, msg: 'Erro ao vincular.', type: 'error' });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, color: '#1976d2', fontWeight: 'bold' }}>
        📥 Caixa de Entrada de Exames (Pendentes)
      </Typography>

      {exames.length === 0 && !loading ? (
        <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          Nenhum exame pendente no momento. Tudo organizado! ✅
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Data / Hora</TableCell>
                <TableCell>Nome na Pasta (Ultrassom)</TableCell>
                <TableCell>Arquivos</TableCell>
                <TableCell width="30%">Vincular ao Paciente (Cadastro)</TableCell>
                <TableCell>Ação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {exames.map((exame) => (
                <TableRow key={exame.id} hover>
                  <TableCell>
                    {new Date(exame.data_exame).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="bold">{exame.nome_paciente_pasta}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cód: {exame.codigo_acesso}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={`${exame.arquivos?.length || 0} arquivos`} size="small" />
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      options={pacientes}
                      getOptionLabel={(option) => option.nome_completo || option.nome || ''}
                      onChange={(event, newValue) => {
                        setSelecoes({ ...selecoes, [exame.id]: newValue });
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="Buscar Paciente..." size="small" variant="outlined" />
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      size="small"
                      startIcon={<LinkIcon />}
                      onClick={() => handleVincular(exame.id)}
                      disabled={!selecoes[exame.id]}
                    >
                      Confirmar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Feedback Toast */}
      <Snackbar 
        open={feedback.open} 
        autoHideDuration={4000} 
        onClose={() => setFeedback({...feedback, open: false})}
      >
        <Alert severity={feedback.type} variant="filled">
          {feedback.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}