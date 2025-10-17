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
  // ▼▼▼ ADICIONE ESTA LINHA DE DEBUG ▼▼▼
  console.log('DEBUG [AnamneseTab]: Prop initialAnamnese recebida:', initialAnamnese);
  
  const { showSnackbar } = useSnackbar();
  
  const defaultData = { 
      queixa_principal: '', 
      historia_doenca_atual: '', 
      historico_medico_pregresso: '',
  };

  const [formData, setFormData] = useState(initialAnamnese || defaultData);
  const [isSaving, setIsSaving] = useState(false);
  const [opcoesHDA, setOpcoesHDA] = useState([]);
  const [selecoesHDA, setSelecoesHDA] = useState(new Set());

  useEffect(() => {
    setFormData(initialAnamnese || defaultData);
    setSelecoesHDA(new Set()); // <-- ADICIONE ESTA LINHA para limpar os checkboxes

    const fetchOpcoes = async () => {
      // O if abaixo evita uma chamada de API desnecessária se não houver especialidade
      if (!especialidade) {
        setOpcoesHDA([]);
        return;
      }
      try {
        const response = await apiClient.get(`/prontuario/opcoes-clinicas/`, {
          params: { especialidade, area_clinica: 'HDA' }
        });
        setOpcoesHDA(response.data);
      } catch (error) {
        console.error('Erro ao carregar opções de anamnese:', error);
      }
    };
    fetchOpcoes();
  }, [initialAnamnese, especialidade]); // Adicionada a dependência correta

  // ▼▼▼ A FUNÇÃO FOI MOVIDA PARA CÁ (PARA O ESCOPO CORRETO) ▼▼▼
  const handleClear = () => {
    setFormData(defaultData);
    setSelecoesHDA(new Set()); // Limpa os checkboxes também
    showSnackbar('Campos limpos para um novo registro.', 'info');
  };

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

    // Lógica unificada para lidar com ambos os padrões de chamada do onChange
    const specialtyData = name === specialtyKey 
      ? value 
      : { ...(formData[specialtyKey] || {}), [name]: value };

    // Extrai o HDA gerado pelo componente da especialidade, se existir
    const hdaFromSpecialty = specialtyData.hda;

    setFormData(prev => {
      // Mantém o texto HDA digitado manualmente se o HDA gerado for indefinido ou vazio
      // e o usuário já tiver digitado algo.
      const newHda = hdaFromSpecialty !== undefined && hdaFromSpecialty !== ''
        ? hdaFromSpecialty
        : prev.historia_doenca_atual;

      return {
        ...prev,
        [specialtyKey]: specialtyData,
        historia_doenca_atual: newHda,
      };
    });
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
      handleClear={handleClear} // <-- PASSE A FUNÇÃO AQUI
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
