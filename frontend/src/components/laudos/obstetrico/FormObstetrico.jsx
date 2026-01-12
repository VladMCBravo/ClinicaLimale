import React from 'react';
import { useObstetricoForm } from './hooks/useObstetricoForm';

// Ícones
import { FaBaby, FaLayerGroup } from 'react-icons/fa';
import { MdChildCare } from 'react-icons/md';

// Seções (Todas as peças do quebra-cabeça)
import SecaoSubtipo from './sections/SecaoSubtipo';
import SecaoDatacao from './sections/SecaoDatacao';
import SecaoDadosGerais from './sections/SecaoDadosGerais';
import SecaoSacoGestacional from './sections/SecaoSacoGestacional';
import SecaoBiometria from './sections/SecaoBiometria';
import SecaoMorfologia from './sections/SecaoMorfologia';
import SecaoDoppler from './sections/SecaoDoppler';
import Secao3D from './sections/Secao3D';
import SecaoConclusao from './sections/SecaoConclusao';

// Seções Específicas por Fase
import SecaoDadosMaternos1Tri from './sections/SecaoDadosMaternos1Tri'; // Ovários/Útero Inicial
import SecaoColoDados from './sections/SecaoColoDados'; // Colo detalhado (2º/3º Tri)
import SecaoPlacentaLiquido from './sections/SecaoPlacentaLiquido'; // Placenta/ILA (2º/3º Tri)
import SecaoIndicesGraficos from './sections/SecaoIndicesGraficos'; // Índices e Gráficos Doppler

const FormObstetrico = ({ onUpdate, initialValues }) => {

  const { 
      formState, 
      handleInputChange, 
      qtdFetos, 
      handleChangeQtdFetos,
      fetoAtivo,
      handleTabChange
  } = useObstetricoForm(onUpdate, initialValues);

  if (!formState) return <div className="p-4">Carregando formulário...</div>;

  const commonProps = {
      data: formState,
      handleChange: handleInputChange,
      onChange: handleInputChange,
      qtdFetos // Necessário para Placenta/Líquido (ILA vs MBV)
  };

  const subtipo = formState.subtipo;

  // --- LÓGICA DE EXIBIÇÃO POR SUBTIPO (O CORAÇÃO DO SISTEMA) ---
  
  // 1. Fase Inicial (< 11 semanas)
  const isInicial = subtipo === "OBSTETRICO_INICIAL";
  
  // 2. Morfológico 1º Tri (11 - 14 semanas)
  const is1Tri = subtipo === "OBSTETRICO_1_TRI";
  
  // 3. Fases Tardias (2º/3º Tri, Morfológico 2º Tri, Doppler)
  const isTardio = !isInicial && !is1Tri;

  return (
    <div className="flex flex-col gap-3 pb-8">
      
      {/* 1. CABEÇALHO & CONFIGURAÇÃO */}
      <div className="laudo-section" style={{borderLeft: '4px solid #4A3B80', overflow:'visible'}}>
          <div className="laudo-section-body" style={{padding:'8px 12px'}}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'end', gap: '20px'}}>
                  <div>
                      <SecaoSubtipo {...commonProps} />
                  </div>
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

      {/* 2. ABAS (Só aparecem se for gêmeos) */}
      {qtdFetos > 1 && (
          <div className="gemelar-tabs-container">
              <div className={`gemelar-tab ${fetoAtivo === 1 ? 'active' : ''}`} onClick={() => handleTabChange(1)}>
                  <FaBaby style={{marginRight:4}}/> Feto I (A)
              </div>
              <div className={`gemelar-tab ${fetoAtivo === 2 ? 'active' : ''}`} onClick={() => handleTabChange(2)}>
                  <FaBaby style={{marginRight:4}}/> Feto II (B)
              </div>
              {qtdFetos === 3 && (
                  <div className={`gemelar-tab ${fetoAtivo === 3 ? 'active' : ''}`} onClick={() => handleTabChange(3)}>
                      <FaBaby style={{marginRight:4}}/> Feto III (C)
                  </div>
              )}
          </div>
      )}

      {/* 3. CONTEÚDO DINÂMICO BASEADO NO SUBTIPO */}
      <div className={qtdFetos > 1 ? "tab-content-wrapper" : ""}>
        
        {/* Aviso de Gêmeos */}
        {qtdFetos > 1 && (
            <div className="mb-3 p-2 bg-blue-50 text-blue-800 text-xs font-bold rounded flex items-center gap-2 border border-blue-100">
                <MdChildCare size={14}/>
                EDITANDO DADOS DO FETO {fetoAtivo === 1 ? 'I' : fetoAtivo === 2 ? 'II' : 'III'}
            </div>
        )}

        {/* -----------------------------------------------------------
            ROTEIRO 1: OBSTÉTRICO INICIAL (< 11 SEMANAS)
            Foco: Onde está o saco? Tem embrião? Como estão os ovários?
           ----------------------------------------------------------- */}
        {isInicial && (
            <>
                <SecaoDatacao {...commonProps} />
                <SecaoSacoGestacional {...commonProps} />
                <SecaoDadosGerais {...commonProps} /> {/* Para Vitalidade/BCF */}
                
                {/* Aqui entra a avaliação de Útero/Ovários/Corpo Lúteo */}
                <SecaoDadosMaternos1Tri {...commonProps} />
                
                {/* Biometria simplificada (CCN) */}
                <SecaoBiometria {...commonProps} /> 
            </>
        )}

        {/* -----------------------------------------------------------
            ROTEIRO 2: MORFOLÓGICO 1º TRIMESTRE (11 - 14 SEMANAS)
            Foco: TN, Osso Nasal, Ducto, Anatomia Precoce
           ----------------------------------------------------------- */}
        {is1Tri && (
            <>
                <SecaoDatacao {...commonProps} />
                <SecaoDadosGerais {...commonProps} />
                
                {/* No 1º Tri, avaliamos o Colo/Útero de forma diferente (Via TV ou Abd) */}
                <SecaoDadosMaternos1Tri {...commonProps} />
                
                {/* Medidas (CCN, TN) */}
                <SecaoBiometria {...commonProps} />
                
                {/* Anatomia (Osso Nasal, Tricúspide removida, Ducto) */}
                <SecaoMorfologia {...commonProps} />
                
                {/* Doppler (Opcional nesta fase, mas Ducto e Uterinas são comuns) */}
                <SecaoDoppler {...commonProps} />
            </>
        )}

        {/* -----------------------------------------------------------
            ROTEIRO 3: OBSTÉTRICO TARDIO / MORFOLÓGICO 2º TRI / DOPPLER
            Foco: Anatomia completa, Placenta, Líquido, Crescimento
           ----------------------------------------------------------- */}
        {isTardio && (
            <>
                <SecaoDatacao {...commonProps} />
                <SecaoDadosGerais {...commonProps} />
                
                {/* Avaliação do Colo (Sludge, Funneling) */}
                <SecaoColoDados {...commonProps} />
                
                {/* Placenta e Líquido (Grannum, ILA) */}
                <SecaoPlacentaLiquido {...commonProps} />
                
                <SecaoBiometria {...commonProps} />
                <SecaoMorfologia {...commonProps} />
                <SecaoDoppler {...commonProps} />
            </>
        )}

        {/* MÓDULOS UNIVERSAIS (Sempre disponíveis no final) */}
        <Secao3D {...commonProps} />
        <SecaoIndicesGraficos {...commonProps} />
        <SecaoConclusao {...commonProps} />

      </div>
    </div>
  );
};

export default FormObstetrico;