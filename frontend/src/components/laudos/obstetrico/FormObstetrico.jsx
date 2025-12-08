import React from 'react';

// 1. Importação do Hook que gerencia a lógica (estado, cálculos, mudanças)
import { useObstetricoForm } from './hooks/useObstetricoForm';

// 2. Importação das Seções (Os "livros" da estante)
import SecaoDadosGerais from './sections/SecaoDadosGerais';
import SecaoSubtipo from './sections/SecaoSubtipo';
import SecaoDatacao from './sections/SecaoDatacao';
import SecaoDadosMaternos1Tri from './sections/SecaoDadosMaternos1Tri';
import SecaoSacoGestacional from './sections/SecaoSacoGestacional';
import SecaoEmbriao from './sections/SecaoEmbriao';
import SecaoBiometria from './sections/SecaoBiometria';
import SecaoPlacentaLiquido from './sections/SecaoPlacentaLiquido';
import SecaoMorfologia from './sections/SecaoMorfologia';
import SecaoDoppler from './sections/SecaoDoppler';
import SecaoColoDados from './sections/SecaoColoDados';
import SecaoConclusao from './sections/SecaoConclusao';
import SecaoAnexos from './sections/SecaoAnexos';
// import SecaoIndicesGraficos from './sections/SecaoIndicesGraficos'; // Use se necessário

const FormObstetrico = () => {
  // Inicializa o hook para pegar os dados e funções de controle
  // Ajuste 'formState', 'handleInputChange', etc. conforme estão nomeados no seu hook real
  const { formState, handleInputChange, setFormState } = useObstetricoForm();

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 bg-gray-50 min-h-screen">
      
      {/* Cabeçalho Opcional (Espaço para o seletor de Hospitais futuro) */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Ultrassonografia Obstétrica</h1>
        {/* <BotaoConfiguracaoHospitais /> -> Futuro componente */}
      </div>

      {/* --- GRID PRINCIPAL (DIVISÃO ESQUERDA / DIREITA) --- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* =======================================================
            COLUNA DA ESQUERDA: Dados Base, Biometria e Medições
           ======================================================= */}
        <div className="space-y-6">
          
          {/* Bloco 1: Identificação e Datação */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-blue-700 mb-4 border-b pb-2">Identificação & Datação</h2>
            <div className="space-y-6">
              <SecaoDadosGerais data={formState} onChange={handleInputChange} />
              <SecaoSubtipo data={formState} onChange={handleInputChange} />
              <SecaoDatacao data={formState} onChange={handleInputChange} />
            </div>
          </div>

          {/* Bloco 2: Inicial (1º Trimestre) - Pode ter lógica para esconder se for 2º/3º Tri */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
             <h2 className="text-lg font-semibold text-blue-700 mb-4 border-b pb-2">Dados Iniciais (1º Tri)</h2>
             <div className="space-y-6">
               <SecaoSacoGestacional data={formState} onChange={handleInputChange} />
               <SecaoEmbriao data={formState} onChange={handleInputChange} />
               <SecaoDadosMaternos1Tri data={formState} onChange={handleInputChange} />
             </div>
          </div>

          {/* Bloco 3: Biometria Fetal (Medições principais) */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-blue-700 mb-4 border-b pb-2">Biometria Fetal</h2>
            <SecaoBiometria data={formState} onChange={handleInputChange} />
          </div>

        </div>

        {/* =======================================================
            COLUNA DA DIREITA: Vitalidade, Morfologia e Laudo
           ======================================================= */}
        <div className="space-y-6">

          {/* Bloco 4: Avaliação Fetal e Materna */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-blue-700 mb-4 border-b pb-2">Avaliação Fetal e Anexos</h2>
            <div className="space-y-6">
              <SecaoPlacentaLiquido data={formState} onChange={handleInputChange} />
              <SecaoColoDados data={formState} onChange={handleInputChange} />
              <SecaoDoppler data={formState} onChange={handleInputChange} />
            </div>
          </div>

          {/* Bloco 5: Morfologia */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-blue-700 mb-4 border-b pb-2">Morfologia</h2>
            <SecaoMorfologia data={formState} onChange={handleInputChange} />
          </div>

          {/* Bloco 6: Conclusão e Anexos */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 bg-blue-50">
            <h2 className="text-lg font-semibold text-blue-800 mb-4 border-b border-blue-200 pb-2">Laudo & Conclusão</h2>
            <div className="space-y-6">
              <SecaoConclusao data={formState} onChange={handleInputChange} />
              <SecaoAnexos data={formState} onChange={handleInputChange} />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

// ESTA É A LINHA QUE CORRIGE O SEU ERRO DE DEPLOY:
export default FormObstetrico;