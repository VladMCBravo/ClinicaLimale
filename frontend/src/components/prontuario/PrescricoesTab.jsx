import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Button, CircularProgress, TextField, Typography, 
  Accordion, AccordionSummary, AccordionDetails, IconButton, 
  Tabs, Tab, Chip, MenuItem, Select, FormControl, InputLabel,
  FormGroup, FormControlLabel, Switch, Divider, Tooltip,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

const initialItemState = { medicamento: '', via: 'Oral', dosagem: '', instrucoes: '' };
const VIAS_ADMINISTRACAO = ['Oral', 'Tópica', 'Intramuscular', 'Intravenosa', 'Inalatória', 'Retal', 'Oftálmica', 'Nasal'];

// Pode manter o seu catalogoRapido aqui igualzinho estava antes...
const catalogoRapido = {
  Neonatologia: [
    { medicamento: 'Vitamina A + D (Ad-Til)', via: 'Oral', dosagem: '2 gotas', instrucoes: 'Dar 1x ao dia direto na boca do bebê.' },
  ],
  Pediatria: [
    { medicamento: 'Amoxicilina 250mg/5ml', via: 'Oral', dosagem: '5 ml', instrucoes: 'Tomar de 8/8h por 7 dias.' },
  ],
  Cardiologia: [
    { medicamento: 'Losartana Potássica 50mg', via: 'Oral', dosagem: '1 comprimido', instrucoes: 'Tomar 1x ao dia (manhã).' },
  ],
  'Clínica Geral': [
    { medicamento: 'Dipirona 1g', via: 'Oral', dosagem: '1 comprimido', instrucoes: 'Tomar de 6/6h in caso de dor ou febre.' },
  ]
};

export default function PrescricoesTab({ pacienteId, onClose }) {
  const { showSnackbar } = useSnackbar();
  
  const [tabIndex, setTabIndex] = useState(0);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Clínica Geral');
  
  const [prescricoesAnteriores, setPrescricoesAnteriores] = useState([]);
  const [modelosMedico, setModelosMedico] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);

  // Estados do Formulário
  const [titulo, setTitulo] = useState('');
  const [itens, setItens] = useState([initialItemState]);
  const [salvarComoModelo, setSalvarComoModelo] = useState(false);
  
  // Novos Estados para Edição e Exclusão
  const [modeloEdicaoId, setModeloEdicaoId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (pacienteId) {
        const resPaciente = await apiClient.get(`/prontuario/pacientes/${pacienteId}/prescricoes/`);
        setPrescricoesAnteriores(resPaciente.data);
      }
      try {
          const resModelos = await apiClient.get(`/prontuario/modelos-prescricao/`);
          setModelosMedico(resModelos.data);
      } catch (err) {
          console.warn("Erro ao buscar modelos do médico", err);
      }
    } catch (error) {
      showSnackbar('Erro ao carregar dados.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [pacienteId, showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleItemChange = (index, field, value) => {
    const newItens = [...itens];
    newItens[index][field] = value;
    setItens(newItens);
  };

  const handleAddItem = () => setItens([...itens, { ...initialItemState }]);
  const handleRemoveItem = (index) => setItens(itens.filter((_, i) => i !== index));

  const handleAddFromCatalog = (med) => {
    if (itens.length === 1 && !itens[0].medicamento) {
      setItens([{ ...med }]);
    } else {
      setItens([...itens, { ...med }]);
    }
  };

  const handleUsarModelo = (modelo) => {
    setTitulo(modelo.titulo);
    setItens(modelo.itens.map(item => ({ ...item }))); 
    setTabIndex(0);
  };

  // --- NOVAS FUNÇÕES DE EDIÇÃO E EXCLUSÃO ---
  const handleEditModelo = (modelo) => {
    setModeloEdicaoId(modelo.id);
    setTitulo(modelo.titulo);
    setItens(modelo.itens.map(item => ({ ...item })));
    setSalvarComoModelo(true);
    setTabIndex(0); // Pula para a aba de edição
  };

  const handleDeleteModelo = async () => {
    if (!confirmDeleteId) return;
    try {
        await apiClient.delete(`/prontuario/modelos-prescricao/${confirmDeleteId}/`);
        showSnackbar('Modelo excluído com sucesso!', 'success');
        fetchData();
    } catch (error) {
        showSnackbar('Erro ao excluir modelo.', 'error');
    } finally {
        setConfirmDeleteId(null);
    }
  };

  const handleCancelEdit = () => {
    setModeloEdicaoId(null);
    setTitulo('');
    setItens([initialItemState]);
    setSalvarComoModelo(false);
  };

  // Salva apenas o modelo, sem gerar para o paciente
  const handleApenasAtualizarModelo = async () => {
    if (!titulo.trim()) {
        showSnackbar('Dê um título ao modelo.', 'warning'); return;
    }
    try {
        await apiClient.put(`/prontuario/modelos-prescricao/${modeloEdicaoId}/`, { titulo, itens });
        showSnackbar('Modelo atualizado com sucesso!', 'success');
        handleCancelEdit();
        fetchData();
    } catch (error) {
        showSnackbar('Erro ao atualizar modelo.', 'error');
    }
  };
  // ------------------------------------------

  const handleGerarPdf = async (prescricaoId) => {
    try {
        const response = await apiClient.get(`/pdf/prescricao/${prescricaoId}/`, { responseType: 'blob' });
        const fileURL = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        window.open(fileURL, '_blank');
        setTimeout(() => URL.revokeObjectURL(fileURL), 100); 
    } catch (error) {
        showSnackbar('Erro ao gerar PDF da prescrição.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Salva a prescrição para o paciente atual
      await apiClient.post(`/prontuario/pacientes/${pacienteId}/prescricoes/`, { titulo, itens });
      
      // 2. Lógica de Modelos (Atualizar ou Criar Novo)
      if (modeloEdicaoId) {
          await apiClient.put(`/prontuario/modelos-prescricao/${modeloEdicaoId}/`, { titulo, itens });
          showSnackbar('Prescrição gerada e Modelo atualizado!', 'success');
      } else if (salvarComoModelo && titulo.trim() !== '') {
          await apiClient.post(`/prontuario/modelos-prescricao/`, { titulo, itens });
          showSnackbar('Prescrição e Modelo salvos com sucesso!', 'success');
      } else if (salvarComoModelo && titulo.trim() === '') {
         showSnackbar('Prescrição salva! Dê um título para salvar como modelo da próxima vez.', 'warning');
      } else {
        showSnackbar('Prescrição salva para o paciente!', 'success');
      }

      handleCancelEdit(); // Limpa a tela e reseta os estados
      fetchData(); 
    } catch (error) {
      showSnackbar('Erro ao processar prescrição.', 'error');
    }
  };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={24}/></Box>;

  return (
    <Box className="tasy-workspace tasy-compact-input" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* HEADER INTEGRADO */}
      <Box sx={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', 
          borderBottom: 1, borderColor: 'divider', bgcolor: '#ffffff', px: 2, pt: 1 
      }}>
        <Tabs value={tabIndex} onChange={(e, newValue) => setTabIndex(newValue)} textColor="primary" indicatorColor="primary" sx={{ minHeight: '40px' }}>
          <Tab label="Escrever Prescrição" sx={{ minHeight: '40px', fontWeight: 'bold', textTransform: 'none' }} />
          <Tab label="Meus Modelos" sx={{ minHeight: '40px', fontWeight: 'bold', textTransform: 'none' }} />
        </Tabs>
        
        {onClose && (
            <IconButton size="small" onClick={onClose} sx={{ mb: 0.5 }}>
                <CloseIcon fontSize="small" />
            </IconButton>
        )}
      </Box>

      {/* ÁREA DE SCROLL */}
      <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto' }}>
        
        {/* ABA 0: ESCREVER PRESCRIÇÃO E HISTÓRICO DO PACIENTE */}
        {tabIndex === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              
              {/* ALERTA DE MODO DE EDIÇÃO */}
              {modeloEdicaoId && (
                  <Box sx={{ bgcolor: '#fff3cd', p: 1, borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #ffe69c' }}>
                      <Typography variant="body2" color="#856404">
                          <strong>Modo de Edição:</strong> Você está alterando o modelo <b>"{titulo}"</b>.
                      </Typography>
                      <Button size="small" onClick={handleCancelEdit} color="inherit" sx={{ fontSize: '0.7rem' }}>Cancelar Edição</Button>
                  </Box>
              )}

              <Box sx={{ p: 1, bgcolor: '#f4f6f8', borderRadius: 1, border: '1px dashed #ccc' }}>
                <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'nowrap', overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
                  {Object.keys(catalogoRapido).map(cat => (
                    <Chip key={cat} label={cat} color={categoriaAtiva === cat ? 'primary' : 'default'} onClick={() => setCategoriaAtiva(cat)} clickable sx={{ height: '20px', '& .MuiChip-label': { px: 1, fontSize: '0.65rem', fontWeight: 'bold' } }} />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {catalogoRapido[categoriaAtiva].map((med, idx) => (
                    <Chip key={idx} label={med.medicamento} variant="outlined" onClick={() => handleAddFromCatalog(med)} icon={<AddCircleOutlineIcon sx={{ fontSize: '12px' }}/>} clickable sx={{ bgcolor: 'white', height: '20px', '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' }, '& .MuiChip-icon': { ml: 0.5 } }} />
                  ))}
                </Box>
              </Box>

              <TextField label="Título desta Prescrição / Diagnóstico (Opcional)" value={titulo} onChange={(e) => setTitulo(e.target.value)} fullWidth size="small" />
              
              {itens.map((item, index) => (
                <Box key={index} sx={{ p: 1.5, border: '1px solid #dee2e6', borderRadius: '2px', position: 'relative', bgcolor: '#ffffff' }}>
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
                  
                  {item.via === 'Intramuscular' && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block', fontWeight: 'bold', fontSize: '11px' }}>
                      * Atenção: Este item de via Intramuscular será impresso em folha separada para a enfermagem.
                    </Typography>
                  )}
                </Box>
              ))}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5, flexWrap: 'wrap', gap: 2 }}>
                  <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAddItem} size="small" color="secondary" sx={{ fontSize: '12px' }}>
                      Adicionar Medicamento
                  </Button>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {!modeloEdicaoId && (
                        <FormGroup>
                        <FormControlLabel control={<Switch size="small" checked={salvarComoModelo} onChange={(e) => setSalvarComoModelo(e.target.checked)} />} label={<Typography variant="body2" sx={{ fontWeight: salvarComoModelo ? 'bold' : 'normal', fontSize: '0.75rem' }}>Salvar nos Meus Modelos</Typography>} />
                        </FormGroup>
                    )}
                    
                    {/* Botões Variáveis dependendo do Modo (Novo vs Edição) */}
                    {modeloEdicaoId && (
                        <Button variant="outlined" color="warning" size="small" onClick={handleApenasAtualizarModelo} sx={{ fontSize: '12px', borderRadius: '2px' }}>
                            Apenas Atualizar Modelo
                        </Button>
                    )}
                    
                    <Button type="submit" variant="contained" disableElevation size="small" sx={{ fontSize: '12px', borderRadius: '2px' }}>
                        {modeloEdicaoId ? 'Imprimir e Atualizar Modelo' : 'Imprimir e Salvar'}
                    </Button>
                  </Box>
              </Box>
            </Box>

            <Box className="tasy-section-header" sx={{ mt: 1 }}>
              Prescrições Anteriores deste Paciente
            </Box>

            <Box>
              {prescricoesAnteriores.length > 0 ? (
                prescricoesAnteriores.map(prescricao => (
                  <Accordion key={prescricao.id} className="tasy-flat-panel" disableGutters sx={{ mb: 1, '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: '32px', height: '36px' }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                        {new Date(prescricao.data_prescricao).toLocaleDateString('pt-BR')} 
                        {prescricao.titulo ? ` - ${prescricao.titulo}` : ''}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 1.5, pt: 0, bgcolor: '#f8f9fa' }}>
                      {prescricao.itens.map((item, idx) => (
                        <Box key={idx} sx={{ mb: 1 }}>
                          <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>{item.medicamento} - {item.dosagem}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>{item.instrucoes}</Typography>
                          <Divider sx={{ my: 0.5 }} />
                        </Box>
                      ))}
                      <Button startIcon={<PictureAsPdfIcon />} onClick={() => handleGerarPdf(prescricao.id)} variant="outlined" size="small" fullWidth sx={{ mt: 1, fontSize: '11px', py: 0.2 }}>
                        Imprimir PDF
                      </Button>
                    </AccordionDetails>
                  </Accordion>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px', pl: 1 }}>Nenhuma prescrição salva para este paciente.</Typography>
              )}
            </Box>

          </Box>
        )}

        {/* ABA 1: MEUS MODELOS SALVOS */}
        {tabIndex === 1 && (
          <Box>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', fontSize: '12px' }}>
              Modelos criados para agilizar seus atendimentos. Clique em "Usar" para carregar as medicações na tela de edição.
            </Typography>
            {modelosMedico.length > 0 ? (
              modelosMedico.map(modelo => (
                <Accordion key={modelo.id} className="tasy-flat-panel" sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#fafafa', minHeight: '36px', height: '36px' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', pr: 2 }}>
                        <Typography sx={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#1976d2' }}>
                        {modelo.titulo || 'Receita sem Título'}
                        </Typography>
                        
                        {/* BOTÕES DE EDITAR E EXCLUIR */}
                        <Box>
                            <Tooltip title="Editar Modelo">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEditModelo(modelo); }}>
                                    <EditIcon sx={{ fontSize: '16px' }} color="action" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir Modelo">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(modelo.id); }}>
                                    <DeleteIcon sx={{ fontSize: '16px' }} color="error" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 1, px: 1.5 }}>
                    {modelo.itens.map((item, idx) => (
                      <Box key={idx} sx={{ mb: 1 }}>
                        <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.78rem' }}>
                          {item.medicamento} ({item.via}) - {item.dosagem}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.2, fontSize: '11px' }}>
                          Uso: {item.instrucoes}
                        </Typography>
                      </Box>
                    ))}
                    <Button startIcon={<ContentCopyIcon />} onClick={() => handleUsarModelo(modelo)} variant="outlined" size="small" sx={{ mt: 1, py: 0.3, fontSize: '0.75rem', borderRadius: '2px' }}>
                      Usar este Modelo
                    </Button>
                  </AccordionDetails>
                </Accordion>
              ))
            ) : (
              <Box sx={{ textAlign: 'center', p: 4, bgcolor: '#f9f9f9', border: '1px solid #dee2e6' }}>
                 <Typography variant="body1" color="text.secondary" sx={{ fontSize: '13px' }}>Você ainda não salvou nenhum modelo.</Typography>
                 <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px' }}>Na aba "Escrever Prescrição", marque a opção "Salvar nos Meus Modelos" ao finalizar uma receita.</Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
          <DialogTitle>Excluir Modelo?</DialogTitle>
          <DialogContent>
              <DialogContentText>
                  Tem certeza que deseja apagar este modelo de prescrição? Esta ação não pode ser desfeita.
              </DialogContentText>
          </DialogContent>
          <DialogActions>
              <Button onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
              <Button onClick={handleDeleteModelo} color="error" autoFocus>Sim, Excluir</Button>
          </DialogActions>
      </Dialog>
    </Box>
  );
}