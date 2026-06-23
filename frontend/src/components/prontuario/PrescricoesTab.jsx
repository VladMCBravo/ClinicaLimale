// src/components/prontuario/PrescricoesTab.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Button, CircularProgress, TextField, Typography, 
  Accordion, AccordionSummary, AccordionDetails, IconButton, 
  Tabs, Tab, Chip, MenuItem, Select, FormControl, InputLabel,
  FormGroup, FormControlLabel, Switch
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

const initialItemState = { medicamento: '', via: 'Oral', dosagem: '', instrucoes: '' };
const VIAS_ADMINISTRACAO = ['Oral', 'Tópica', 'Intramuscular', 'Intravenosa', 'Inalatória', 'Retal', 'Oftálmica', 'Nasal'];

// 🌟 CATÁLOGO PROFUNDO POR ESPECIALIDADE (Acesso Rápido)
const catalogoRapido = {
  Neonatologia: [
    { medicamento: 'Vitamina A + D (Ad-Til)', via: 'Oral', dosagem: '2 gotas', instrucoes: 'Dar 1x ao dia direto na boca do bebê.' },
    { medicamento: 'Sulfato Ferroso 25mg/ml', via: 'Oral', dosagem: '1 gota/kg', instrucoes: 'Dar 1x ao dia, preferencialmente longe do leite.' },
    { medicamento: 'Simeticona 75mg/ml', via: 'Oral', dosagem: '3 a 5 gotas', instrucoes: 'Dar de 8/8h em caso de cólicas.' },
    { medicamento: 'Álcool 70%', via: 'Tópica', dosagem: 'Uso externo', instrucoes: 'Aplicar na base do coto umbilical a cada troca de fralda.' },
    { medicamento: 'Soro Fisiológico 0,9%', via: 'Nasal', dosagem: '1/2 conta-gotas', instrucoes: 'Aplicar em cada narina antes das mamadas.' }
  ],
  Pediatria: [
    { medicamento: 'Amoxicilina 250mg/5ml', via: 'Oral', dosagem: '5 ml', instrucoes: 'Tomar de 8/8h por 7 dias.' },
    { medicamento: 'Ibuprofeno 50mg/ml', via: 'Oral', dosagem: '1 gota/kg', instrucoes: 'Tomar de 6/6h se febre ou dor.' },
    { medicamento: 'Prednisolona 3mg/ml', via: 'Oral', dosagem: '1 ml/kg', instrucoes: 'Tomar pela manhã por 3 a 5 dias.' },
    { medicamento: 'Salbutamol Spray (100mcg)', via: 'Inalatória', dosagem: '2 jatos', instrucoes: 'Fazer com espaçador de 4/4h em caso de cansaço.' },
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
    { medicamento: 'Dipirona 1g', via: 'Oral', dosagem: '1 comprimido', instrucoes: 'Tomar de 6/6h em caso de dor ou febre.' },
    { medicamento: 'Omeprazol 20mg', via: 'Oral', dosagem: '1 cápsula', instrucoes: 'Tomar em jejum, 30 min antes do café.' },
    { medicamento: 'Cefalexina 500mg', via: 'Oral', dosagem: '1 comprimido', instrucoes: 'Tomar de 6/6h por 7 dias.' },
    { medicamento: 'Benzetacil 1.200.000 UI', via: 'Intramuscular', dosagem: '1 ampola', instrucoes: 'Aplicar via IM profunda (glúteo).' },
    { medicamento: 'Dexametasona 4mg', via: 'Intramuscular', dosagem: '1 ampola', instrucoes: 'Aplicar via IM dose única agora.' },
    { medicamento: 'Cetoprofeno 100mg', via: 'Oral', dosagem: '1 comprimido', instrucoes: 'Tomar de 12/12h após refeição por 5 dias.' }
  ]
};

export default function PrescricoesTab({ pacienteId, medicoId }) {
  const { showSnackbar } = useSnackbar();
  
  // Abas transformadas no cabeçalho
  const [tabIndex, setTabIndex] = useState(0);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Clínica Geral');
  
  // Estados de Dados
  const [modelosMedico, setModelosMedico] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estado do Formulário
  const [titulo, setTitulo] = useState('');
  const [itens, setItens] = useState([initialItemState]);
  const [salvarComoModelo, setSalvarComoModelo] = useState(false); // NOVO: Flag para salvar template

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulação da busca de modelos salvos pelo médico no BD
      // const resModelos = await apiClient.get(`/prontuario/medicos/${medicoId}/modelos/`);
      setModelosMedico([
        { id: 'm1', titulo: 'Infecção Urinária (ITU) Padrão', itens: [{ medicamento: 'Fosfomicina Trometamol 3g', via: 'Oral', dosagem: '1 envelope', instrucoes: 'Dissolver em água e tomar dose única à noite após esvaziar a bexiga.' }] },
        { id: 'm2', titulo: 'HAS + Dislipidemia Básica', itens: [catalogoRapido.Cardiologia[0], catalogoRapido.Cardiologia[2]] }
      ]);
    } catch (error) {
      showSnackbar('Erro ao carregar dados.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [medicoId, showSnackbar]);

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
    setTabIndex(0); // Pula para a aba de edição
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Salva a prescrição para o paciente
      await apiClient.post(`/prontuario/pacientes/${pacienteId}/prescricoes/`, { titulo, itens });
      
      // 2. Se o médico marcou a flag, salva também no banco de dados de modelos do médico
      if (salvarComoModelo && titulo.trim() !== '') {
        await apiClient.post(`/prontuario/medicos/${medicoId}/modelos/`, { titulo, itens });
        showSnackbar('Prescrição e Modelo salvos com sucesso!', 'success');
      } else if (salvarComoModelo && titulo.trim() === '') {
         showSnackbar('Prescrição salva! Dê um título para salvar como modelo da próxima vez.', 'warning');
      } else {
        showSnackbar('Prescrição salva para o paciente!', 'success');
      }

      // Reseta form
      setTitulo('');
      setItens([initialItemState]);
      setSalvarComoModelo(false);
      fetchData(); // Recarrega os modelos para atualizar a aba 1
    } catch (error) {
      showSnackbar('Erro ao processar prescrição.', 'error');
    }
  };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={24}/></Box>;

  return (
    <Box className="tasy-compact-input" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      
      {/* CABEÇALHO / ABAS OTMIZADAS - Ocupam o lugar do antigo Título */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabIndex} onChange={(e, newValue) => setTabIndex(newValue)} textColor="primary" indicatorColor="primary">
          <Tab label="Escrever Prescrição" sx={{ fontWeight: 'bold' }} />
          <Tab label={`Meus Modelos Salvos (${modelosMedico.length})`} sx={{ fontWeight: 'bold' }} />
        </Tabs>
      </Box>

      {/* ABA 0: ESCREVER PRESCRIÇÃO */}
      {tabIndex === 0 && (
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          
          {/* ACESSO RÁPIDO (CLICK-TO-BUILD) */}
          <Box sx={{ p: 1.5, bgcolor: '#f4f6f8', borderRadius: 1, border: '1px dashed #ccc' }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1, overflowX: 'auto', pb: 0.5 }}>
              {Object.keys(catalogoRapido).map(cat => (
                <Chip 
                  key={cat} label={cat} size="small" 
                  color={categoriaAtiva === cat ? 'primary' : 'default'}
                  onClick={() => setCategoriaAtiva(cat)} clickable
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {catalogoRapido[categoriaAtiva].map((med, idx) => (
                <Chip 
                  key={idx} label={med.medicamento} size="small" variant="outlined"
                  onClick={() => handleAddFromCatalog(med)} 
                  icon={<AddCircleOutlineIcon fontSize="small"/>}
                  clickable sx={{ bgcolor: 'white' }}
                />
              ))}
            </Box>
          </Box>

          {/* DADOS DA RECEITA */}
          <TextField 
            label="Título desta Prescrição / Diagnóstico (Opcional)" 
            placeholder="Ex: Tratamento Amigdalite, Uso Contínuo Hipertensão..."
            value={titulo} onChange={(e) => setTitulo(e.target.value)} 
            fullWidth size="small" 
          />
          
          {/* LISTA DE ITENS */}
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
              
              {item.via === 'Intramuscular' && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block', fontWeight: 'bold' }}>
                  * Atenção: Este item de via Intramuscular será impresso em folha separada para encaminhamento à enfermagem.
                </Typography>
              )}
            </Box>
          ))}

          {/* RODAPÉ DO FORMULÁRIO (Adicionar, Salvar e Checkbox de Modelo) */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, flexWrap: 'wrap', gap: 2 }}>
              <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAddItem} size="small" color="secondary">
                  Adicionar Outro Medicamento
              </Button>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* NOVO: SWITCH PARA SALVAR COMO MODELO */}
                <FormGroup>
                  <FormControlLabel 
                    control={<Switch size="small" checked={salvarComoModelo} onChange={(e) => setSalvarComoModelo(e.target.checked)} />} 
                    label={<Typography variant="body2" sx={{ fontWeight: salvarComoModelo ? 'bold' : 'normal' }}>Salvar nos Meus Modelos</Typography>} 
                  />
                </FormGroup>

                <Button type="submit" variant="contained" disableElevation>
                    Imprimir e Salvar
                </Button>
              </Box>
          </Box>
        </Box>
      )}

      {/* ABA 1: MEUS MODELOS SALVOS */}
      {tabIndex === 1 && (
        <Box>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Estes são os modelos que você criou para agilizar seus atendimentos. Clique em "Usar" para carregar as medicações na tela de edição.
          </Typography>
          {modelosMedico.length > 0 ? (
            modelosMedico.map(modelo => (
              <Accordion key={modelo.id} variant="outlined" sx={{ mb: 1, boxShadow: 'none' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#fafafa' }}>
                  <Typography sx={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1976d2' }}>
                    {modelo.titulo || 'Receita sem Título'}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 1 }}>
                  {modelo.itens.map((item, idx) => (
                    <Box key={idx} sx={{ mb: 1 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {item.medicamento} ({item.via}) - {item.dosagem}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Uso: {item.instrucoes}
                      </Typography>
                    </Box>
                  ))}
                  <Button startIcon={<ContentCopyIcon />} onClick={() => handleUsarModelo(modelo)} variant="outlined" size="small" sx={{ mt: 1 }}>
                    Usar este Modelo
                  </Button>
                </AccordionDetails>
              </Accordion>
            ))
          ) : (
            <Box sx={{ textAlign: 'center', p: 4, bgcolor: '#f9f9f9', borderRadius: 2 }}>
               <Typography variant="body1" color="text.secondary">Você ainda não salvou nenhum modelo.</Typography>
               <Typography variant="body2" color="text.secondary">Na aba "Escrever Prescrição", marque a opção "Salvar nos Meus Modelos" ao finalizar uma receita.</Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}