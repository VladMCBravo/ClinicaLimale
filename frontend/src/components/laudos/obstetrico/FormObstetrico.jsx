import React from 'react';
import { useObstetricoForm } from './hooks/useObstetricoForm';

// Seções (Visual)
import SecaoSubtipo from './sections/SecaoSubtipo';
import SecaoDadosGerais from './sections/SecaoDadosGerais';
import SecaoDatacao from './sections/SecaoDatacao';
import SecaoBiometria from './sections/SecaoBiometria';
import SecaoPlacentaLiquido from './sections/SecaoPlacentaLiquido';
import SecaoMorfologia from './sections/SecaoMorfologia';
import SecaoDoppler from './sections/SecaoDoppler';
import SecaoConclusao from './sections/SecaoConclusao';
import SecaoSacoGestacional from './sections/SecaoSacoGestacional';
import SecaoEmbriao from './sections/SecaoEmbriao';
import Secao3D from './sections/Secao3D'; // <--- 1. IMPORTAR AQUI

const FormObstetrico = ({ onUpdate, initialValues }) => {

  const { 
      formState, 
      handleInputChange, 
      // Novos exports do hook:
      qtdFetos, 
      handleChangeQtdFetos,
      fetoAtivo,
      handleTabChange
  } = useObstetricoForm(onUpdate, initialValues);

  if (!formState) return <div className="p-4">Carregando formulário...</div>;

  const commonProps = {
      data: formState,
      handleChange: handleInputChange,
      onChange: handleInputChange 
  };

  // Lógica para esconder seções que não fazem sentido no Transvaginal Inicial
  const isInicial = formState.subtipo === 'OBSTETRICO_INICIAL';
  // Estilos simples para as abas (Tailwind classes sugeridas)
  const tabBaseClass = "px-4 py-2 text-sm font-medium rounded-t-lg cursor-pointer transition-colors border-b-2";
  const tabActiveClass = "border-blue-600 text-blue-600 bg-blue-50";
  const tabInactiveClass = "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300";

  return (
    <div className="flex flex-col gap-3 pb-4">
      
      {/* 1. SELEÇÃO DE TIPO DE GESTAÇÃO E SUBTIPO */}
      <div className="bg-white p-3 rounded shadow-sm border border-gray-200">
          <SecaoSubtipo {...commonProps} />
          
          <div className="mt-4 flex items-center gap-4 border-t pt-3">
              <span className="text-sm font-bold text-gray-700">Tipo de Gestação:</span>
              <div className="flex gap-2">
                  <button 
                    onClick={() => handleChangeQtdFetos(1)}
                    className={`px-3 py-1 rounded border ${qtdFetos === 1 ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                  >
                      Única
                  </button>
                  <button 
                    onClick={() => handleChangeQtdFetos(2)}
                    className={`px-3 py-1 rounded border ${qtdFetos === 2 ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                  >
                      Gemelar
                  </button>
                  <button 
                    onClick={() => handleChangeQtdFetos(3)}
                    className={`px-3 py-1 rounded border ${qtdFetos === 3 ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                  >
                      Trigemelar
                  </button>
              </div>
          </div>
      </div>

      {/* 2. BARRA DE ABAS (Só aparece se for múltipla) */}
      {qtdFetos > 1 && (
          <div className="flex border-b border-gray-200 mt-2 bg-white rounded-t">
              <div 
                  className={`${tabBaseClass} ${fetoAtivo === 1 ? tabActiveClass : tabInactiveClass}`}
                  onClick={() => handleTabChange(1)}
              >
                  Feto A
              </div>
              <div 
                  className={`${tabBaseClass} ${fetoAtivo === 2 ? tabActiveClass : tabInactiveClass}`}
                  onClick={() => handleTabChange(2)}
              >
                  Feto B
              </div>
              {qtdFetos === 3 && (
                  <div 
                      className={`${tabBaseClass} ${fetoAtivo === 3 ? tabActiveClass : tabInactiveClass}`}
                      onClick={() => handleTabChange(3)}
                  >
                      Feto C
                  </div>
              )}
          </div>
      )}

      {/* 3. CONTEÚDO DO FORMULÁRIO (Renderiza o Feto Ativo) */}
      {/* Container com cor diferente nas bordas para indicar que é uma aba */}
      <div className={`flex flex-col gap-3 ${qtdFetos > 1 ? 'border-l-4 border-blue-500 pl-2' : ''}`}>
        
        {/* Aviso visual de qual feto está editando */}
        {qtdFetos > 1 && (
            <div className="bg-blue-50 p-2 text-xs text-blue-800 font-bold uppercase mb-[-8px]">
                Editando dados do Feto {fetoAtivo === 1 ? 'A' : fetoAtivo === 2 ? 'B' : 'C'}
            </div>
        )}

      {/* DATAÇÃO (DUM, DPP, IG) */}
      {/* "DPP: 17/06/2026..." - Primeira linha do texto */}
      <SecaoDatacao {...commonProps} />
      
      {/* DADOS GERAIS (Bexiga, Situação, Apresentação) */}
      {/* "Bexiga materna não visualizada..." - Segunda linha do texto */}
      <SecaoDadosGerais {...commonProps} />

      {/* --- SEÇÕES EXCLUSIVAS DE INICIAL/1º TRI --- */}
      {formState.subtipo && formState.subtipo.includes("INICIAL") && (
          <SecaoSacoGestacional {...commonProps} />
      )}

      {formState.subtipo && formState.subtipo.includes("1_TRI") && (
          <SecaoEmbriao {...commonProps} />
      )}
      
      {/* --- SEÇÕES EXCLUSIVAS DE 2º/3º TRI (Esconder se for inicial) --- */}
      
      {/* Placenta e Líquido - Geralmente não se descreve ILA/Grannum em SG incipiente */}
      {!isInicial && (
        <SecaoPlacentaLiquido {...commonProps} />
      )}

      {/* Biometria - Não tem Fêmur/BPD em SG de 6 semanas */}
      {!isInicial && (
        <SecaoBiometria {...commonProps} />
      )}

      {/* Morfologia - Não vê rins/estômago em SG incipiente */}
      {!isInicial && (
        <SecaoMorfologia {...commonProps} />
      )}

      {/* Doppler - Não se faz uterina/umbilical em rotina inicial */}
      {!isInicial && (
        <SecaoDoppler {...commonProps} />
      )}

      {/* 3D sempre pode aparecer se quiser */}
      <Secao3D {...commonProps} />

      {/* Conclusão adaptada */}
      <SecaoConclusao {...commonProps} />

    </div>
  </div>
  
  );
};

export default FormObstetrico;