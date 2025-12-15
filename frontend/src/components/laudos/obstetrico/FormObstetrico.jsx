import React from 'react';
import { useObstetricoForm } from './hooks/useObstetricoForm';

// Ícones Visuais (LINHA CORRIGIDA ABAIXO)
import { FaBaby, FaRulerCombined, FaHeartbeat, FaWaveSquare, FaNotesMedical, FaFileMedicalAlt, FaLayerGroup, FaCheckSquare } from 'react-icons/fa';
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
import SecaoColoDados from './sections/SecaoColoDados'; // <--- 1. IMPORTAR AQUI

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
    <div className="flex flex-col gap-3 pb-8">
      
      {/* 1. CABEÇALHO COMPACTO (LADO A LADO) */}
      <div className="laudo-section" style={{borderLeft: '4px solid #4A3B80', overflow:'visible'}}>
          <div className="laudo-section-body" style={{padding:'8px 12px'}}>
              
              {/* GRID DE 2 COLUNAS: SUBTIPO | BOTÕES GÊMEOS */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'end', gap: '20px'}}>
                  
                  {/* Coluna 1: Select de Subtipo (Ocupa o espaço que sobrar) */}
                  <div>
                      <SecaoSubtipo {...commonProps} />
                  </div>

                  {/* Coluna 2: Botões de Gêmeos (Fixo à direita) */}
                  <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                          <FaLayerGroup /> TIPO DE GESTAÇÃO:
                      </span>
                      <div className="flex gap-1 bg-gray-100 p-1 rounded border border-gray-200">
                          {[1, 2, 3].map(qtd => (
                              <button 
                                key={qtd}
                                onClick={() => handleChangeQtdFetos(qtd)}
                                className={`px-3 py-1 rounded text-xs font-bold transition-all border ${
                                    qtdFetos === qtd 
                                    ? 'bg-purple-600 text-white border-purple-800 shadow-sm' 
                                    : 'bg-white text-gray-500 border-transparent hover:bg-gray-50'
                                }`}
                                style={{minWidth:'80px'}}
                              >
                                  {qtd === 1 ? 'Única' : qtd === 2 ? 'Gemelar' : 'Trigemelar'}
                              </button>
                          ))}
                      </div>
                  </div>

              </div>
          </div>
      </div>

      {/* 2. ABAS DE NAVEGAÇÃO ENTRE FETOS (Visual Pasta Física) */}
      {qtdFetos > 1 && (
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
      )}

      {/* 3. CONTEÚDO DO FORMULÁRIO */}
      <div className={qtdFetos > 1 ? "tab-content-wrapper" : ""}>
        
        {/* Aviso visual discreto */}
        {qtdFetos > 1 && (
            <div className="mb-3 p-2 bg-blue-50 text-blue-800 text-xs font-bold rounded flex items-center gap-2 border border-blue-100">
                <MdChildCare size={14}/>
                EDITANDO DADOS DO FETO {fetoAtivo === 1 ? 'I' : fetoAtivo === 2 ? 'II' : 'III'}
            </div>
        )}

        {/* --- SEÇÕES LÓGICAS --- */}
        <SecaoDatacao {...commonProps} />
        <SecaoDadosGerais {...commonProps} />
        {/* <--- 2. INSERIR AQUI: AVALIAÇÃO DO COLO */}
        {/* É útil em todas as fases, mas principalmente Inicial/1Tri/Morfológico */}
        <SecaoColoDados {...commonProps} />

        {/* Condicionais de Inicial */}
        {formState.subtipo && formState.subtipo.includes("INICIAL") && (
            <SecaoSacoGestacional {...commonProps} />
        )}

        {formState.subtipo && formState.subtipo.includes("1_TRI") && (
            <SecaoEmbriao {...commonProps} />
        )}
        
        {!isInicial && (
            <>
                <SecaoPlacentaLiquido {...commonProps} />
                <SecaoBiometria {...commonProps} />
                <SecaoMorfologia {...commonProps} />
                <SecaoDoppler {...commonProps} />
            </>
        )}

        <Secao3D {...commonProps} />
        <SecaoConclusao {...commonProps} />

      </div>
    </div>
  );
};

export default FormObstetrico;