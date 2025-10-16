// src/components/prontuario/AnamneseTab.jsx - VERSÃO REATORADA E DINÂMICA

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Box, CircularProgress } from '@mui/material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';
import AnamnesePadrao from './especialidades/AnamnesePadrao';

// Mapeia o nome da especialidade (string) para a importação dinâmica do componente
const especialidadeComponentMap = {
  'Cardiologia': lazy(() => import('./especialidades/AnamneseCardiologia')),
  'Ginecologia': lazy(() => import('./especialidades/AnamneseGinecologia')),
  'Neonatologia': lazy(() => import('./especialidades/AnamneseNeonatologia')),
  'Ortopedia': lazy(() => import('./especialidades/AnamneseOrtopedia')),
  'Pediatria': lazy(() => import('./especialidades/AnamnesePediatria')),
  'Reumatologia': lazy(() => import('./especialidades/AnamneseReumatologia')),
  'Reumatologia Pediátrica': lazy(() => import('./especialidades/AnamneseReumatologiaPediatrica')),
  // Adicione outras especialidades aqui conforme necessário
};

// Mapeia a especialidade para a chave usada no objeto formData
const especialidadeFormKeyMap = {
    'Cardiologia': 'cardiologica',
    'Ginecologia': 'ginecologica',
    'Neonatologia': 'neonatologia',
    'Ortopedia': 'ortopedica',
    'Pediatria': 'pediatrica',
    'Reumatologia': 'reumatologia',
    'Reumatologia Pediátrica': 'reumatologia_pediatrica',
};

export default function AnamneseTab({ pacienteId, especialidade, initialAnamnese, onAnamneseSalva }) {
  const { showSnackbar } = useSnackbar();

  // O estado inicial agora é mais genérico.
  // Os dados da especialidade serão aninhados sob uma chave dinâmica se necessário.
  const [formData, setFormData] = useState(initialAnamnese || { 
      queixa_principal: '', 
      historia_doenca_atual: '', 
      historico_medico_pregresso: '',
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [opcoesHDA, setOpcoesHDA] = useState([]);
  const [selecoesHDA, setSelecoesHDA] = useState(new Set());

  useEffect(() => {
    const defaultData = { 
        queixa_principal: '', 
        historia_doenca_atual: '', 
        historico_medico_pregresso: '',
    };
    setFormData(initialAnamnese || defaultData);

    // Busca as opções de checkbox para HDA
    const fetchOpcoes = async () => {
      try {
        const response = await apiClient.get(`/prontuario/opcoes-clinicas/`, {
          params: { especialidade, area_clinica: 'HDA' }
        });
        setOpcoesHDA(response.data);
      } catch (error) {
        console.error('Erro ao carregar opções de anamnese:', error);
        showSnackbar('Erro ao carregar opções de anamnese.', 'error');
      }
    };
    fetchOpcoes();
  }, [initialAnamnese, especialidade, showSnackbar]);

  const handleFieldChange = (event) => {
    setFormData(prev => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  // Handler genérico para os campos da especialidade.
  // Lida com os dois padrões de chamada do onChange encontrados nos componentes filhos.
  const handleSpecialtyChange = (event) => {
    const { name, value } = event.target;
    const specialtyKey = especialidadeFormKeyMap[especialidade];

    if (!specialtyKey) return;

    // Caso 1: O componente filho passa o objeto inteiro da especialidade.
    // O 'name' do evento corresponde à chave da especialidade (ex: 'cardiologica').
    if (name === specialtyKey) {
      setFormData(prev => ({
        ...prev,
        [specialtyKey]: value,
      }));
    } else {
      // Caso 2: O componente filho passa uma atualização de campo individual (ex: Reumatologia).
      // O 'name' do evento é o nome do campo (ex: 'sintomas').
      setFormData(prev => ({
        ...prev,
        [specialtyKey]: {
          ...(prev[specialtyKey] || {}),
          [name]: value,
        },
      }));
    }
  };

  const handleHdaCheckboxChange = (event) => {
    const opcaoId = parseInt(event.target.name, 10);
    const isChecked = event.target.checked;
    const newSelecoes = new Set(selecoesHDA);

    if (isChecked) {
      newSelecoes.add(opcaoId);
    } else {
      newSelecoes.delete(opcaoId);
    }
    setSelecoesHDA(newSelecoes);

    const textoNarrativo = opcoesHDA
      .filter(opt => newSelecoes.has(opt.id))
      .map(opt => opt.descricao)
      .join('. ');
      
    setFormData(prev => ({ ...prev, historia_doenca_atual: textoNarrativo ? textoNarrativo + '.' : '' }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const apiUrl = `/prontuario/pacientes/${pacienteId}/anamnese/`;
    try {
      if (initialAnamnese) {
        await apiClient.put(apiUrl, formData);
      } else {
        await apiClient.post(apiUrl, formData);
      }
      showSnackbar('Anamnese salva com sucesso!', 'success');
      
      if (onAnamneseSalva) {
        onAnamneseSalva();
      }
    } catch (error) {
      console.error("Erro ao salvar anamnese:", error.response?.data || error.message);
      showSnackbar(`Erro ao salvar anamnese: ${error.response?.data?.detail || 'verifique o console'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Seleciona o componente da especialidade com base na prop
  const SpecialtyComponent = especialidadeComponentMap[especialidade] || null;

  return (
    <AnamnesePadrao
      formData={formData}
      opcoesHDA={opcoesHDA}
      selecoesHDA={selecoesHDA}
      isSaving={isSaving}
      initialAnamnese={initialAnamnese}
      handleFieldChange={handleFieldChange}
      handleHdaCheckboxChange={handleHdaCheckboxChange}
      handleSave={handleSave}
    >
      {/* Renderiza o componente da especialidade dinamicamente */}
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
        {SpecialtyComponent ? (
          <SpecialtyComponent formData={formData} onChange={handleSpecialtyChange} />
        ) : (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            {/* <Typography variant="body2">Nenhum formulário de anamnese específico para esta especialidade.</Typography> */}
          </Box>
        )}
      </Suspense>
    </AnamnesePadrao>
  );
}
