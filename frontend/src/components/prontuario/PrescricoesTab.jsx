// src/components/prontuario/PrescricoesTab.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Button, CircularProgress, TextField, Typography, 
  Accordion, AccordionSummary, AccordionDetails, IconButton, 
  Tabs, Tab, Chip, MenuItem, Select, FormControl, InputLabel,
  FormGroup, FormControlLabel, Switch, Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloseIcon from '@mui/icons-material/Close';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

const initialItemState = { medicamento: '', via: 'Oral', dosagem: '', instrucoes: '' };
const VIAS_ADMINISTRACAO = ['Oral', 'Tópica', 'Intramuscular', 'Intravenosa', 'Inalatória', 'Retal', 'Oftálmica', 'Nasal'];

const catalogoRapido = {
  Neonatologia: [
    { medicamento: 'Vitamina A + D (Ad-Til)', via: 'Oral', dosagem: '2 gotas', instrucoes: 'Dar 1x ao dia direto na boca do bebê.' },
    { medicamento: 'Sulfato Ferroso 25mg/ml', via: 'Oral', dosagem: '1 gota/kg', instrucoes: 'Dar 1x ao dia, preferencialmente longe do leite.' },
    { medicamento: 'Simeticona 75mg/ml', via: 'Oral', dosagem: '3 a 5 gotas', instrucoes: 'Dar de 8/8h in caso de cólicas.' },
    { medicamento: 'Álcool 70%', via: 'Tópica', dosagem: 'Uso externo', instrucoes: 'Aplicar na base do coto umbilical a cada troca de fralda.' },
    { medicamento: 'Soro Fisiológico 0,9%', via: 'Nasal', dosagem: '1/2 conta-gotas', instrucoes: 'Aplicar in cada narina antes das mamadas.' }
  ],
  Pediatria: [
    { medicamento: 'Amoxicilina 250mg/5ml', via: 'Oral', dosagem: '5 ml', instrucoes: 'Tomar de 8/8h por 7 dias.' },
    { medicamento: 'Ibuprofeno 50mg/ml', via: 'Oral', dosagem: '1 gota/kg', instrucoes: 'Tomar de 6/6h se febre ou dor.' },
    { medicamento: 'Prednisolona 3mg/ml', via: 'Oral', dosagem: '1 ml/kg', instrucoes: 'Tomar pela manhã por 3 a 5 dias.' },
    { medicamento: 'Salbutamol Spray (100mcg)', via: 'Inalatória', dosagem: '2 jatos', instrucoes: 'Fazer com espaçador de 4/4h in caso de cansaço.' },
    { medicamento: 'Desloratadina 0,5mg/ml', via: 'Oral', dosagem: '2,5 ml', instrucoes: 'Tomar 1x ao dia à noite.' }
  ],
  Cardiologia: [
    { medicamento: 'Losartana Potássica 50mg', via: 'Oral', dosagem: '1 comprimido', instrucoes: 'Tomar 1x ao dia (manhã).' },
    { medicamento: 'Hidroclorotiazida 25mg', via: 'Oral', dosagem: '1 comprimido', instrucoes: 'Tomar 1x ao dia pela manhã.' },
    { medicamento: 'Rosuvastatina 10mg', via: 'Oral', dosagem: '1 comprimido', instrucoes: 'Tomar 1x ao dia, após o jantar.' },
    { medicamento: 'Atenolol 50mg', via: 'Oral', dosagem: '1 comprimido', instrucoes: 'Tomar 1x ao dia.' },
    { medicamento: 'Furosemida 40mg', via: 'Oral', dosagem: '1 comprimido', instrucoes: 'Tomar pela manhã.' },
    { medicamento: 'AAS 100mg', via: 'Oral', dosagem: '1 comprimido', instrucoes: 'Tomar 1x ao dia após o almoço.' }
  ],
  'Clínica Geral': [
    { medicamento: 'Dipirona 1g', via: 'Oral', dosagem: '1 comprimido', instrucoes: 'Tomar de 6/6h in caso de dor ou febre.' },
    { medicamento: 'Omeprazol 20mg', via: 'Oral', dosagem: '1 cápsula', instrucoes: 'Tomar in jejum, 30 min antes do café.' },
    { medicamento: 'Cefalexina 500mg', via: 'Oral', dosagem: '1 comprimido', instrucoes: 'Tomar de 6/6h por 7 dias.' },
    { medicamento: 'Benzetacil 1.200.000 UI', via: 'Intramuscular', dosagem: '1 ampola', instrucoes: 'Aplicar via IM profunda (glúteo).' },
    { medicamento: 'Dexametasona 4mg', via: 'Intramuscular', dosagem: '1 ampola', instrucoes: 'Aplicar via IM dose única agora.' },
    { medicamento: 'Cetoprofeno 100mg', via: 'Oral', dosagem: '1 comprimido', instrucoes: 'Tomar de 12/12h após refeição por 5 dias.' }
  ]
};

export default function PrescricoesTab({ pacienteId, medicoId, onClose }) {
  const { showSnackbar } = useSnackbar();
  
  const [tabIndex, setTabIndex] = useState(0);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Clínica Geral');
  
  const [prescricoesAnteriores, setPrescricoesAnteriores] = useState([]);
  const [modelosMedico, setModelosMedico] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);

  const [titulo, setTitulo] = useState('');
  const [itens, setItens] = useState([initialItemState]);
  const [salvarComoModelo, setSalvarComoModelo] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Busca as prescrições anteriores do paciente atual
      if (pacienteId) {
        const resPaciente = await apiClient.get(`/prontuario/pacientes/${pacienteId}/prescricoes/`);
        setPrescricoesAnteriores(resPaciente.data);
      }

      // 2. Busca os modelos REAIS salvos por este médico no banco de dados
      if (medicoId) {
          try {
              const resModelos = await apiClient.get(`/prontuario/medicos/${medicoId}/modelos/`);
              setModelosMedico(resModelos.data);
          } catch (err) {
              console.warn("Erro ao buscar modelos do médico", err);
          }
      }

    } catch (error) {
      showSnackbar('Erro ao carregar dados.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [pacienteId, medicoId, showSnackbar]);

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
      // 1. Salva a prescrição para o paciente
      await apiClient.post(`/prontuario/pacientes/${pacienteId}/prescricoes/`, { titulo, itens });
      
      // 2. Lógica para salvar como modelo
      if (salvarComoModelo && titulo.trim() !== '') {
          // Proteção caso medicoId venha undefined do componente pai
          if (!medicoId) {
              showSnackbar('Erro: ID do médico não encontrado. O modelo não foi salvo.', 'error');
          } else {
              await apiClient.post(`/prontuario/medicos/${medicoId}/modelos/`, { titulo, itens });
              showSnackbar('Prescrição e Modelo salvos com sucesso!', 'success');
          }
      } else if (salvarComoModelo && titulo.trim() === '') {
         showSnackbar('Prescrição salva! Dê um título para salvar como modelo da próxima vez.', 'warning');
      } else {
        showSnackbar('Prescrição salva para o paciente!', 'success');
      }

      setTitulo('');
      setItens([initialItemState]);
      setSalvarComoModelo(false);
      fetchData(); 
    } catch (error) {
      showSnackbar('Erro ao processar prescrição.', 'error');
    }
  };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={24}/></Box>;

  return (
    /* 🌟 PADRONIZADO: Inclusão da classe tasy-workspace para ativar seu scroll customizado de 6px e tasy-compact-input para os inputs */
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
              
              <Box sx={{ p: 1, bgcolor: '#f4f6f8', borderRadius: 1, border: '1px dashed #ccc' }}>
                {/* ESPECIALIDADES MICRO */}
                <Box sx={{ 
                  display: 'flex', gap: 0.5, mb: 1, flexWrap: 'nowrap', overflowX: 'auto', 
                  '&::-webkit-scrollbar': { display: 'none' }, msOverflowStyle: 'none', scrollbarWidth: 'none' 
                }}>
                  {Object.keys(catalogoRapido).map(cat => (
                    <Chip 
                        key={cat} label={cat} 
                        color={categoriaAtiva === cat ? 'primary' : 'default'} 
                        onClick={() => setCategoriaAtiva(cat)} clickable 
                        sx={{ height: '20px', '& .MuiChip-label': { px: 1, fontSize: '0.65rem', fontWeight: 'bold' } }} 
                    />
                  ))}
                </Box>
                
                {/* MEDICAMENTOS MICRO */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {catalogoRapido[categoriaAtiva].map((med, idx) => (
                    <Chip 
                        key={idx} label={med.medicamento} variant="outlined" 
                        onClick={() => handleAddFromCatalog(med)} 
                        icon={<AddCircleOutlineIcon sx={{ fontSize: '12px' }}/>} clickable 
                        sx={{ bgcolor: 'white', height: '20px', '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' }, '& .MuiChip-icon': { ml: 0.5 } }} 
                    />
                  ))}
                </Box>
              </Box>

              {/* Inputs ganham automaticamente a estilização compacta via classe do container pai */}
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
                    <FormGroup>
                      <FormControlLabel control={<Switch size="small" checked={salvarComoModelo} onChange={(e) => setSalvarComoModelo(e.target.checked)} />} label={<Typography variant="body2" sx={{ fontWeight: salvarComoModelo ? 'bold' : 'normal', fontSize: '0.75rem' }}>Salvar nos Meus Modelos</Typography>} />
                    </FormGroup>
                    <Button type="submit" variant="contained" disableElevation size="small" sx={{ fontSize: '12px', borderRadius: '2px' }}>
                        Imprimir e Salvar
                    </Button>
                  </Box>
              </Box>
            </Box>

            {/* 🌟 PADRONIZADO: Uso da sua classe tasy-section-header. Ela sangra perfeitamente até as bordas devido aos seus valores de margin negativos! */}
            <Box className="tasy-section-header" sx={{ mt: 1 }}>
              Prescrições Anteriores deste Paciente
            </Box>

            <Box>
              {prescricoesAnteriores.length > 0 ? (
                prescricoesAnteriores.map(prescricao => (
                  /* 🌟 PADRONIZADO: tasy-flat-panel remove arredondamentos e sombras inúteis */
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
                /* 🌟 PADRONIZADO: tasy-flat-panel aplicado aos modelos corporativos */
                <Accordion key={modelo.id} className="tasy-flat-panel" sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#fafafa', minHeight: '36px', height: '36px' }}>
                    <Typography sx={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#1976d2' }}>
                      {modelo.titulo || 'Receita sem Título'}
                    </Typography>
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
    </Box>
  );
}