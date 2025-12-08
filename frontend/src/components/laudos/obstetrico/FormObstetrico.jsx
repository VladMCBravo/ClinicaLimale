import React from 'react';
import { FaChartLine, FaUserFriends } from 'react-icons/fa';
import '../Laudos.css'; 
import GraficosObstetricos from '../GraficosObstetricos'; 

// Importação do Hook Personalizado
import { useObstetricoForm } from './hooks/useObstetricoForm';

// Importação das Seções Visuais
import SecaoSubtipo from './sections/SecaoSubtipo';
import SecaoDatacao from './sections/SecaoDatacao';
import SecaoColoDados from './sections/SecaoColoDados';
import SecaoBiometria from './sections/SecaoBiometria';
import SecaoMorfologia from './sections/SecaoMorfologia';
import SecaoAnexos from './sections/SecaoAnexos';
import SecaoDoppler from './sections/SecaoDoppler';
import SecaoIndicesGraficos from './sections/SecaoIndicesGraficos';
import SecaoConclusao from './sections/SecaoConclusao';

import SecaoDadosMaternos1Tri from './sections/SecaoDadosMaternos1Tri';
import SecaoSacoGestacional from './sections/SecaoSacoGestacional';
import SecaoEmbriao from './sections/SecaoEmbriao';

import SecaoDadosGerais from './sections/SecaoDadosGerais'; // Novo: Situação, Apresentação, BCF
import SecaoPlacentaLiquido from './sections/SecaoPlacentaLiquido'; // Novo: Placenta e ILA

const FormObstetrico = ({ onUpdate, initialValues }) => {
  const { data, handleChange, ...rest } = useObstetricoForm(onUpdate, initialValues);

  return (
    <div className="laudo-container">
      {/* 1. DATAÇÃO (Topo sempre) */}
      <SecaoDatacao data={data} handleChange={handleChange} handleDatacaoChange={rest.handleDatacaoChange} />
      
      {/* 2. DADOS GERAIS E VITALIDADE (Logo abaixo da data) */}
      {/* Aqui entram: Situação, Apresentação, Dorso, BCF, Movimentos, Estomago, Bexiga */}
      <SecaoDadosGerais data={data} handleChange={handleChange} />

      {/* 3. ANEXOS (Placenta e Líquido - antes da biometria no texto dela) */}
      <SecaoPlacentaLiquido data={data} handleChange={handleChange} />

      {/* 4. BIOMETRIA (O "miolo" do exame) */}
      <SecaoBiometria data={data} handleChange={handleChange} />
      
      {/* 5. ÍNDICES E GRÁFICOS (Opcional visualização) */}
      <SecaoIndicesGraficos data={data} handleChange={handleChange} />

      {/* 6. DOPPLER (Se ativado) */}
      <SecaoDoppler data={data} handleChange={handleChange} />

      {/* 7. CONCLUSÃO (Apenas campos extras como Peso, Sexo e Obs, pois o resto é automático) */}
      <SecaoConclusao data={data} handleChange={handleChange} />
      
    </div>
  );
};