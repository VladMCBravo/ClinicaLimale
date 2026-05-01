// src/pages/PacientesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { useAuth } from '../hooks/useAuth';
import PacienteModal from '../components/PacienteModal';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton, Button, TextField
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import WhatsAppIcon from '@mui/icons-material/WhatsApp'; // Opcional: ícone visual
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'; // --- NOVO: Ícone para os laudos

import { useSnackbar } from '../contexts/SnackbarContext';
import ModalVincularExame from '../components/prontuario/ModalVincularExame';
// --- NOVO: Import do Modal de Histórico de Laudos ---
// Certifique-se que o caminho está correto conforme onde você criou o arquivo
import HistoricoLaudosModal from '../components/laudos/HistoricoLaudosModal';

// Função auxiliar para formatar data (YYYY-MM-DD -> DD/MM/YYYY)
const formatData = (dataString) => {
    if (!dataString) return '-';
    // Evita problemas de timezone fazendo split direto na string
    const partes = dataString.split('-'); 
    if(partes.length < 3) return dataString;
    return `${partes[2]}/${partes[1]}/${partes[0]}`; 
};

export default function PacientesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  
  // --- ESTADOS ---
  const [pacientes, setPacientes] = useState([]);
  const [filteredPacientes, setFilteredPacientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados Modal Edição/Criação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pacienteParaEditar, setPacienteParaEditar] = useState(null);
  
  // Estados Busca
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados Modal Vincular Exame
  const [modalVincularOpen, setModalVincularOpen] = useState(false);
  const [pacienteParaVincular, setPacienteParaVincular] = useState(null);

  // --- NOVO: Estados Modal Histórico de Laudos (Recepção) ---
  const [modalHistoricoOpen, setModalHistoricoOpen] = useState(false);
  const [pacienteParaHistorico, setPacienteParaHistorico] = useState(null);

  // --- HANDLERS ---
  const handleOpenVincular = (paciente) => {
      setPacienteParaVincular(paciente);
      setModalVincularOpen(true);
  };
  // --- NOVO: Abre o modal de laudos ---
  const handleOpenHistorico = (paciente) => {
      setPacienteParaHistorico(paciente);
      setModalHistoricoOpen(true);
  };

  const fetchPacientes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/pacientes/');
      
      const dadosOrdenados = response.data.sort((a, b) => 
        a.nome_completo.localeCompare(b.nome_completo, 'pt-BR', { sensitivity: 'base' })
      );

      setPacientes(dadosOrdenados);
      setFilteredPacientes(dadosOrdenados); 
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []); 
  
  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  useEffect(() => {
    if (!pacientes) return;
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = pacientes.filter(item =>
      (item.nome_completo && item.nome_completo.toLowerCase().includes(lowercasedFilter)) ||
      (item.cpf && item.cpf.includes(lowercasedFilter))
    );
    setFilteredPacientes(filteredData);
  }, [searchTerm, pacientes]);

  const handleOpenProntuario = (pacienteId) => {
    navigate(`/pacientes/${pacienteId}/prontuario`);
  };

  const handleEdit = (paciente) => {
    setPacienteParaEditar(paciente);
    setIsModalOpen(true);
  };

  const handleDelete = async (pacienteId) => {
    if (window.confirm('Tem certeza que deseja deletar este paciente?')) {
      try {
        await apiClient.delete(`/pacientes/${pacienteId}/`);
        showSnackbar('Paciente deletado com sucesso!', 'success');
        fetchPacientes();
      } catch (error) {
        console.error("Erro ao deletar paciente:", error);
        showSnackbar('Erro ao deletar paciente.', 'error');
      }
    }
  };

  const handleOpenNewModal = () => {
    setPacienteParaEditar(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPacienteParaEditar(null);
  };

  // --- NOVO: Enviar Credenciais por WhatsApp ---
  const handleEnviarWhatsApp = async (paciente) => {
      console.log("=== INICIANDO ENVIO WHATSAPP ===");
      console.log("1. Paciente clicado:", paciente.id, paciente.nome_completo);
      
      try {
          // MUDANÇA AQUI: Apontando para o endereço novo e exclusivo
          const url = `/prontuario/buscar-senha-paciente/?paciente_id=${paciente.id}`;
          console.log("2. Chamando a API no endereço:", url);
          
          const res = await apiClient.get(url);
          console.log("3. Resposta recebida da API (Sucesso):", res.data);

          const credenciais = res.data;
          
          if (!credenciais || !credenciais.codigo) {
              console.warn("4. A API respondeu, mas não trouxe as chaves de acesso.");
              alert("Este paciente não possui credenciais válidas.");
              return;
          }

          const cod = credenciais.codigo;
          const pass = credenciais.senha;
          const link = credenciais.link || "https://clinica-limale.vercel.app/resultados";
          const nomePct = paciente.nome_completo.split(' ')[0];

          const texto = `Olá, *${nomePct}*! \n\nPor motivos de segurança, atualizamos o sistema de laudos e suas credenciais de acesso foram renovadas.\n\nAcesse seus resultados e imagens no link abaixo:\n${link}\n\n*SEUS NOVOS DADOS DE ACESSO:*\nUsuário: *${cod}*\nSenha: *${pass}*\n\nAtt, Clínica Limalé`;

          const telefoneRaw = paciente.telefone_celular || paciente.telefone || "";
          const apenasNumeros = telefoneRaw.replace(/\D/g, "");
          
          let urlWhats = apenasNumeros.length >= 10 
              ? `https://wa.me/55${apenasNumeros}?text=${encodeURIComponent(texto)}`
              : `https://wa.me/?text=${encodeURIComponent(texto)}`;

          console.log("5. Abrindo WhatsApp Web...");
          window.open(urlWhats, '_blank');

      } catch (error) {
          console.error("ERRO GRAVE NA CHAMADA:", error.response || error);
          if (error.response && error.response.status === 404) {
              alert("Nenhum laudo com senha encontrado para este paciente no banco de dados.");
          } else {
              alert("A API falhou ou a rota não foi encontrada (veja o console F12).");
          }
      }
  };

  return (
    <Box sx={{ 
      height: 'calc(100vh - 64px)', 
      display: 'flex', 
      flexDirection: 'column', 
      p: 2, 
      overflow: 'hidden' 
    }}>
      {/* CABEÇALHO FIXO */}
      <Paper sx={{ p: 2, mb: 1, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1C2E4A' }}>
            Gestão de Pacientes
          </Typography>
          
          {/* NOVA ÁREA DE ESTATÍSTICAS (KPIs) */}
          <Stack direction="row" spacing={3} sx={{ textAlign: 'center' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">TOTAL</Typography>
              <Typography variant="h6" sx={{ lineHeight: 1 }}>{pacientes.length}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">FILTRADOS</Typography>
              <Typography variant="h6" sx={{ lineHeight: 1, color: 'primary.main' }}>{filteredPacientes.length}</Typography>
            </Box>
          </Stack>

          <Button variant="contained" color="primary" onClick={handleOpenNewModal}>
            Novo Paciente
          </Button>
        </Box>

        <TextField
          fullWidth
          variant="outlined"
          size="small"
          label="Buscar paciente por nome ou CPF..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Paper>

      {/* ÁREA DE RESULTADOS COM ROLAGEM PRÓPRIA */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ flexGrow: 1, overflowY: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{fontWeight: 'bold', bgcolor: '#fff'}}>Nome Completo</TableCell>
                <TableCell sx={{fontWeight: 'bold', bgcolor: '#fff'}}>Telefone / WhatsApp</TableCell>
                <TableCell sx={{fontWeight: 'bold', bgcolor: '#fff'}}>Nascimento</TableCell>
                <TableCell sx={{fontWeight: 'bold', bgcolor: '#fff'}}>Email</TableCell>
                <TableCell align="right" sx={{fontWeight: 'bold', bgcolor: '#fff'}}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPacientes.map((paciente) => (
                <TableRow key={paciente.id} hover>
                  <TableCell>{paciente.nome_completo}</TableCell>
                  
                  <TableCell>
                      {paciente.telefone_celular ? (
                          <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
                              <WhatsAppIcon sx={{fontSize: 16, color: '#25D366'}} />
                              {paciente.telefone_celular}
                          </Box>
                      ) : '-'}
                  </TableCell>
                  <TableCell>{formatData(paciente.data_nascimento)}</TableCell>
                  
                  <TableCell>{paciente.email || '-'}</TableCell>
                  
                  <TableCell align="right">
                    <IconButton 
                        onClick={() => handleEnviarWhatsApp(paciente)} 
                        title="Enviar nova senha pelo WhatsApp"
                    >
                        <WhatsAppIcon sx={{ color: '#25D366' }} /> 
                    </IconButton>
                    <IconButton 
                        onClick={() => handleOpenHistorico(paciente)} 
                        title="Ver Laudos e Resultados"
                    >
                        <PictureAsPdfIcon color="error" />
                    </IconButton>
                    <IconButton onClick={() => handleOpenVincular(paciente)} title="Vincular Exame Solto">
                        <LinkIcon color="primary" />
                    </IconButton>
                    <IconButton onClick={() => handleOpenProntuario(paciente.id)} title="Abrir Prontuário">
                        <FolderOpenIcon />
                    </IconButton>
                    <IconButton onClick={() => handleEdit(paciente)} title="Editar Paciente">
                        <EditIcon />
                    </IconButton>
                    {user && user.isAdmin && (
                        <IconButton onClick={() => handleDelete(paciente.id)} title="Deletar Paciente">
                            <DeleteIcon color="error" />
                        </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredPacientes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">Nenhum paciente encontrado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* MODAIS INVISÍVEIS AGORA DENTRO DO CONTEINER PAI (<Box>) */}
      <PacienteModal 
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={fetchPacientes}
        pacienteParaEditar={pacienteParaEditar}
      />
      <ModalVincularExame 
        open={modalVincularOpen}
        onClose={() => setModalVincularOpen(false)}
        paciente={pacienteParaVincular}
        onSuccess={() => showSnackbar('Exame vinculado com sucesso!', 'success')}
      />
      <HistoricoLaudosModal 
          open={modalHistoricoOpen}
          onClose={() => setModalHistoricoOpen(false)}
          pacienteId={pacienteParaHistorico?.id}
          pacienteNome={pacienteParaHistorico?.nome_completo}
      />
    </Box>
  );
}