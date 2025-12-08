import React from 'react';
import { useObstetricoForm } from './hooks/useObstetricoForm';

// Importação das Seções
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

const FormObstetrico = () => {
  const { formState, handleInputChange } = useObstetricoForm();

  // --- TRAVA DE SEGURANÇA ---
  // Se por algum motivo o formState vier nulo, evita a tela branca
  if (!formState) {
    return <div className="p-10 text-center text-gray-500">Carregando formulário...</div>;
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 bg-gray-50 min-h-screen">
      
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Ultrassonografia Obstétrica</h1>
      </div>

      {/* Grid de 2 Colunas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* --- COLUNA ESQUERDA --- */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-blue-700 mb-4 border-b pb-2">Identificação & Datação</h2>
            <div className="space-y-6">
              {/* Passando props com segurança */}
              <SecaoDadosGerais data={formState} onChange={handleInputChange} />
              <SecaoSubtipo data={formState} onChange={handleInputChange} />
              <SecaoDatacao data={formState} onChange={handleInputChange} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
             <h2 className="text-lg font-semibold text-blue-700 mb-4 border-b pb-2">Dados Iniciais (1º Tri)</h2>
             <div className="space-y-6">
               <SecaoSacoGestacional data={formState} onChange={handleInputChange} />
               <SecaoEmbriao data={formState} onChange={handleInputChange} />
               <SecaoDadosMaternos1Tri data={formState} onChange={handleInputChange} />
             </div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-blue-700 mb-4 border-b pb-2">Biometria Fetal</h2>
            <SecaoBiometria data={formState} onChange={handleInputChange} />
          </div>
        </div>

        {/* --- COLUNA DIREITA --- */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-blue-700 mb-4 border-b pb-2">Avaliação Fetal e Anexos</h2>
            <div className="space-y-6">
              <SecaoPlacentaLiquido data={formState} onChange={handleInputChange} />
              <SecaoColoDados data={formState} onChange={handleInputChange} />
              <SecaoDoppler data={formState} onChange={handleInputChange} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-blue-700 mb-4 border-b pb-2">Morfologia</h2>
            <SecaoMorfologia data={formState} onChange={handleInputChange} />
          </div>

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

export default FormObstetrico;