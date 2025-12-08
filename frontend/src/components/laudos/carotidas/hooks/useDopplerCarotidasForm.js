import { useState, useEffect, useCallback } from 'react';
import { carotidasInitialState } from '../logic/carotidasInitialState';
import { verificarAlteracoes } from '../logic/carotidasCalculations';
import { gerarRelatorio, gerarConclusaoAutomatica, gerarTabelaMedidas } from '../logic/carotidasTextBuilder';

// 1. Receba initialValues no argumento
const useDopplerCarotidasForm = (onUpdate, initialValues) => {
  
  // 2. No useState, use a lógica de verificação
  const [data, setData] = useState(() => {
      if (initialValues && Object.keys(initialValues).length > 0) {
          return { ...carotidasInitialState, ...initialValues };
      }
      return carotidasInitialState;
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Lógica específica: Mutuamente exclusivo (Sem Placas vs Placas Mínimas)
    if (name.includes('SemPlacas') && checked) {
        const prefix = name.replace('SemPlacas', '');
        setData(prev => ({ 
            ...prev, 
            [name]: checked, 
            [`${prefix}PlacasMinimas`]: false // Desmarca o outro
        }));
    } else if (name.includes('PlacasMinimas') && checked) {
        const prefix = name.replace('PlacasMinimas', '');
        setData(prev => ({ 
            ...prev, 
            [name]: checked, 
            [`${prefix}SemPlacas`]: false // Desmarca o outro
        }));
    } else {
        setData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  // Efeito principal: Gera o laudo sempre que 'data' mudar
  useEffect(() => {
    // 1. Cálculos / Análise Lógica
    const { achados } = verificarAlteracoes(data);

    // 2. Montagem dos Textos
    const corpoLaudo = gerarRelatorio(data);
    const conclusao = gerarConclusaoAutomatica(data, achados);
    const textoFinal = `${corpoLaudo}\n${conclusao}`;
    
    // 3. Montagem da Tabela de Medidas (Dados Estruturados para o PDF)
    const tabelaMedidas = gerarTabelaMedidas(data);

    // 4. Envia para o componente pai
    if (onUpdate) {
      onUpdate({
        texto: textoFinal,
        dadosEstruturados: { ...data, tabelaMedidas }, // Incluímos a tabela processada aqui
        tituloExame: 'DOPPLER DE CARÓTIDAS E VERTEBRAIS'
      });
    }
  }, [data, onUpdate]);

  return {
    data,
    handleChange
  };
};

export default useDopplerCarotidasForm;