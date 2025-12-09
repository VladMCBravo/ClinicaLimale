import React from 'react';
import { useObstetricoForm } from './hooks/useObstetricoForm';

// Ícones Visuais
import { FaBaby, FaRulerCombined, FaHeartbeat, FaWaveSquare, FaNotesMedical, FaFileMedicalAlt, FaLayerGroup } from 'react-icons/fa';
import { GiFetus, GiWaterDrop } from 'react-icons/gi';
import { MdChildCare, MdDateRange } from 'react-icons/md';

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
  const isInicial = formState.subtipo && (formState.subtipo.includes("INICIAL") || formState.subtipo.includes("1_TRI"));

  return (
    <div className="flex flex-col gap-4 pb-8">
      
      {/* 1. CABEÇALHO PRINCIPAL (Card Moderno) */}
      <div className="laudo-section" style={{borderLeft: '4px solid #4A3B80'}}>
          <div className="laudo-section-body">
              <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center gap-2 text-purple-800 font-bold uppercase text-xs mb-1">
                          <FaFileMedicalAlt /> Configuração do Exame
                      </div>
                      <SecaoSubtipo {...commonProps} />
                  </div>
              </div>
              
              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-4">
                  <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                      <FaLayerGroup /> Tipo de Gestação:
                  </span>
                  <div className="flex gap-2">
                      {[1, 2, 3].map(qtd => (
                          <button 
                            key={qtd}
                            onClick={() => handleChangeQtdFetos(qtd)}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                qtdFetos === qtd 
                                ? 'bg-purple-600 text-white shadow-md' 
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                              {qtd === 1 ? 'Única' : qtd === 2 ? 'Gemelar' : 'Trigemelar'}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      </div>

      {/* 2. ABAS DE NAVEGAÇÃO ENTRE FETOS (Visual Pasta Física) */}
      {qtdFetos > 1 && (
          <div>
              <div className="gemelar-tabs-container">
                  <div 
                      className={`gemelar-tab ${fetoAtivo === 1 ? 'active' : ''}`}
                      onClick={() => handleTabChange(1)}
                  >
                      <FaBaby style={{marginRight:4}}/> Feto I (A)
                  </div>
                  <div 
                      className={`gemelar-tab ${fetoAtivo === 2 ? 'active' : ''}`}
                      onClick={() => handleTabChange(2)}
                  >
                      <FaBaby style={{marginRight:4}}/> Feto II (B)
                  </div>
                  {qtdFetos === 3 && (
                      <div 
                          className={`gemelar-tab ${fetoAtivo === 3 ? 'active' : ''}`}
                          onClick={() => handleTabChange(3)}
                      >
                          <FaBaby style={{marginRight:4}}/> Feto III (C)
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* 3. CONTEÚDO DO FORMULÁRIO (Wrapper da Aba) */}
      {/* Se for gemelar, aplicamos a classe tab-content-wrapper para fechar a caixa da aba */}
      <div className={qtdFetos > 1 ? "tab-content-wrapper" : ""}>
        
        {/* Aviso visual discreto */}
        {qtdFetos > 1 && (
            <div className="mb-4 p-2 bg-blue-50 text-blue-800 text-xs font-bold rounded flex items-center gap-2 border border-blue-100">
                <MdChildCare size={14}/>
                Editando dados do Feto {fetoAtivo === 1 ? 'I' : fetoAtivo === 2 ? 'II' : 'III'}
            </div>
        )}

        {/* --- SEÇÕES LÓGICAS --- */}
        
        {/* Datação (Ícone Calendário) */}
        <SecaoDatacao {...commonProps} icon={<MdDateRange />} />
        
        {/* Dados Gerais (Ícone Feto) */}
        <SecaoDadosGerais {...commonProps} icon={<GiFetus />} />

        {/* Condicionais de Inicial */}
        {formState.subtipo && formState.subtipo.includes("INICIAL") && (
            <SecaoSacoGestacional {...commonProps} />
        )}

        {formState.subtipo && formState.subtipo.includes("1_TRI") && (
            <SecaoEmbriao {...commonProps} />
        )}
        
        {!isInicial && (
            <>
                <SecaoPlacentaLiquido {...commonProps} icon={<GiWaterDrop />} />
                <SecaoBiometria {...commonProps} icon={<FaRulerCombined />} />
                <SecaoMorfologia {...commonProps} icon={<FaCheckSquare />} />
                <SecaoDoppler {...commonProps} icon={<FaWaveSquare />} />
            </>
        )}

        <Secao3D {...commonProps} icon={<FaBaby />} />
        
        <SecaoConclusao {...commonProps} icon={<FaNotesMedical />} />

      </div>
    </div>
  );
};

export default FormObstetrico;