// src/components/prontuario/PrescricoesTab.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Button, CircularProgress, TextField, Typography, 
  Accordion, AccordionSummary, AccordionDetails, IconButton, Divider, 
  Tabs, Tab, Chip, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

const initialItemState = { medicamento: '', via: 'Oral', dosagem: '', instrucoes: '' };

const VIAS_ADMINISTRACAO = ['Oral', 'Tópica', 'Intramuscular', 'Intravenosa', 'Inalatória'];

// 🌟 CATÁLOGO DE MEDICAMENTOS RÁPIDOS (Pode vir do backend futuramente)
const catalogoRapido = {
  Pediatria: [
    { medicamento: 'Amoxicilina 250mg/5ml', via: 'Oral', dosagem: '5 ml', instrucoes: 'Tomar de 8/8h por 7 dias.' },
    { medicamento: 'Ibuprofeno 50mg/ml', via: 'Oral', dosagem: '1 gota/kg', instrucoes: 'Tomar de 6/6h se febre ou dor.' },
  ],
  Cardiologia: [
    { medicamento: 'Losartana 50mg', via: 'Oral', dosagem: '1 comprimido', instrucoes: 'Tomar 1x ao dia pela manhã.' },
    { medicamento: 'Enalapril 20mg', via: 'Oral', dosagem: '1 comprimido', instrucoes: 'Tomar de 12/12h.' },
  ],
  Geral: [
    { medicamento: 'Dipirona 500mg', via: 'Oral', dosagem: '1 comprimido', instrucoes: 'Tomar de 6/6h em caso de dor.' },
    { medicamento: 'Benzetacil 1.200.000 UI', via: 'Intramuscular', dosagem: '1 ampola', instrucoes: 'Aplicar via IM profunda.' },
    { medicamento: 'Dexametasona Creme', via: 'Tópica', dosagem: '1 aplicação', instrucoes: 'Aplicar no local afetado 2x ao dia.' }
  ]
};

export default function PrescricoesTab({ pacienteId, medicoId }) {
  const { showSnackbar } = useSnackbar();
  
  // Estados de Abas e UI
  const [tabIndex, setTabIndex] = useState(0);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Geral');
  
  // Estados de Dados
  const [modelosMedico, setModelosMedico] = useState([]); // "Minhas Prescrições"
  const [historicoPaciente, setHistoricoPaciente] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estado do Formulário Atual
  const [titulo, setTitulo] = useState('');
  const [itens, setItens] = useState([initialItemState]);

  // Busca dados iniciais
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Busca histórico do paciente
      const resPaciente = await apiClient.get(`/prontuario/pacientes/${pacienteId}/prescricoes/`);
      setHistoricoPaciente(resPaciente.data);

      // Busca modelos do médico logado (Exemplo de rota)
      // const resModelos = await apiClient.get(`/prontuario/medicos/${medicoId}/modelos-prescricao/`);
      // setModelosMedico(resModelos.data);
      
      // MOCK para exemplo de "Minhas Prescrições"
      setModelosMedico([
        { id: 'm1', titulo: 'Padrão Amigdalite', itens: [catalogoRapido.Pediatria[0], catalogoRapido.Geral[0]] },
        { id: 'm2', titulo: 'Rotina HAS', itens: [catalogoRapido.Cardiologia[0]] }
      ]);
    } catch (error) {
      showSnackbar('Erro ao carregar dados.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [pacienteId, medicoId, showSnackbar]);

  useEffect(() => {
    if (pacienteId) fetchData();
  }, [fetchData, pacienteId]);

  // Funções de manipulação do formulário
  const handleItemChange = (index, field, value) => {
    const newItens = [...itens];
    newItens[index][field] = value;
    setItens(newItens);
  };

  const handleAddItem = () => setItens([...itens, { ...initialItemState }]);
  const handleRemoveItem = (index) => setItens(itens.filter((_, i) => i !== index));

  const handleAddFromCatalog = (med) => {
    // Se o primeiro item estiver vazio, substitui. Se não, adiciona na lista.
    if (itens.length === 1 && !itens[0].medicamento) {
      setItens([{ ...med }]);
    } else {
      setItens([...itens, { ...med }]);
    }
    showSnackbar(`${med.medicamento} adicionado.`, 'success');
  };

  const handleUsarModelo = (modelo) => {
    setTitulo(modelo.titulo);
    setItens(modelo.itens.map(item => ({ ...item }))); // Clone profundo simples
    setTabIndex(0); // Volta pra aba de Nova Prescrição
    showSnackbar('Modelo carregado para edição.', 'success');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Opcional: Aqui você pode separar a requisição se tiver Intramuscular
      // const itensIM = itens.filter(i => i.via === 'Intramuscular');
      // const itensOutros = itens.filter(i => i.via !== 'Intramuscular');
      
      await apiClient.post(`/prontuario/pacientes/${pacienteId}/prescricoes/`, { titulo, itens });
      showSnackbar('Prescrição salva com sucesso!', 'success');
      setTitulo('');
      setItens([initialItemState]);
      fetchData();
    } catch (error) {
      showSnackbar('Erro ao salvar a prescrição.', 'error');
    }
  };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={24}/></Box>;

  return (
    <Box className="tasy-compact-input" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      
      {/* ABAS */}
      <Tabs value={tabIndex} onChange={(e, newValue) => setTabIndex(newValue)} size="small" sx={{ minHeight: '36px' }}>
        <Tab label="Nova Prescrição" sx={{ minHeight: '36px', py: 0 }} />
        <Tab label="Meus Modelos" sx={{ minHeight: '36px', py: 0 }} />
      </Tabs>

      {/* ABA 0: NOVA PRESCRIÇÃO */}
      {tabIndex === 0 && (
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          
          {/* SELEÇÃO RÁPIDA (CLICK-TO-BUILD) */}
          <Box sx={{ p: 1.5, bgcolor: '#f4f6f8', borderRadius: 1 }}>
            <Typography variant="caption" fontWeight="bold" sx={{ mb: 1, display: 'block' }}>
              Adição Rápida por Especialidade:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
              {Object.keys(catalogoRapido).map(cat => (
                <Chip 
                  key={cat} 
                  label={cat} 
                  size="small" 
                  color={categoriaAtiva === cat ? 'primary' : 'default'}
                  onClick={() => setCategoriaAtiva(cat)}
                  clickable
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {catalogoRapido[categoriaAtiva].map((med, idx) => (
                <Chip 
                  key={idx} 
                  label={med.medicamento} 
                  size="small" 
                  variant="outlined"
                  onClick={() => handleAddFromCatalog(med)} 
                  icon={<AddCircleOutlineIcon fontSize="small"/>}
                  clickable
                  sx={{ bgcolor: 'white' }}
                />
              ))}
            </Box>
          </Box>

          <TextField 
            label="Título da Prescrição (Ex: Uso Contínuo)" 
            value={titulo} 
            onChange={(e) => setTitulo(e.target.value)} 
            fullWidth size="small" 
          />
          
          {/* LISTA DE ITENS DA PRESCRIÇÃO */}
          {itens.map((item, index) => (
            <Box key={index} sx={{ p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1, position: 'relative' }}>
              {itens.length > 1 && (
                <IconButton size="small" color="error" onClick={() => handleRemoveItem(index)} sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'white' }}>
                  <RemoveCircleOutlineIcon />
                </IconButton>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 1, mb: 1 }}>
                  <TextField label="Medicamento" value={item.medicamento} onChange={(e) => handleItemChange(index, 'medicamento', e.target.value)} required size="small" />
                  
                  <FormControl size="small" fullWidth>
                    <InputLabel>Via</InputLabel>
                    <Select value={item.via} label="Via" onChange={(e) => handleItemChange(index, 'via', e.target.value)}>
                      {VIAS_ADMINISTRACAO.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                    </Select>
                  </FormControl>

                  <TextField label="Dosagem" value={item.dosagem} onChange={(e) => handleItemChange(index, 'dosagem', e.target.value)} required size="small" />
              </Box>
              <TextField label="Instruções de Uso" value={item.instrucoes} onChange={(e) => handleItemChange(index, 'instrucoes', e.target.value)} required fullWidth size="small" />
              
              {/* Alerta visual se for Intramuscular */}
              {item.via === 'Intramuscular' && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                  * Esta medicação será impressa em uma folha separada.
                </Typography>
              )}
            </Box>
          ))}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAddItem} size="small" color="secondary">
                  Adicionar Linha em Branco
              </Button>
              <Button type="submit" variant="contained" size="small" disableElevation>
                  Salvar Prescrição
              </Button>
          </Box>
        </Box>
      )}

      {/* ABA 1: MEUS MODELOS */}
      {tabIndex === 1 && (
        <Box>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Selecione uma de suas prescrições salvas para usar como base neste atendimento.
          </Typography>
          {modelosMedico.length > 0 ? (
            modelosMedico.map(modelo => (
              <Accordion key={modelo.id} variant="outlined" sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{modelo.titulo || 'Sem título'}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  {modelo.itens.map((item, idx) => (
                    <Typography key={idx} variant="caption" display="block">
                      • {item.medicamento} ({item.via}) - {item.dosagem}
                    </Typography>
                  ))}
                  <Button startIcon={<ContentCopyIcon />} onClick={() => handleUsarModelo(modelo)} variant="contained" size="small" sx={{ mt: 2 }}>
                    Usar este Modelo
                  </Button>
                </AccordionDetails>
              </Accordion>
            ))
          ) : (
            <Typography variant="body2">Você ainda não possui modelos salvos.</Typography>
          )}
        </Box>
      )}
    </Box>
  );
}