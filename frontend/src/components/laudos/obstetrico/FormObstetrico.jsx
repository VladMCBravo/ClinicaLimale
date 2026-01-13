import React, { useState } from 'react';
import { useObstetricoForm } from './hooks/useObstetricoForm';

// Ícones
import { FaBaby, FaLayerGroup, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { MdChildCare } from 'react-icons/md';

// Seções
import SecaoSubtipo from './sections/SecaoSubtipo';
import SecaoDatacao from './sections/SecaoDatacao';
import SecaoDadosGerais from './sections/SecaoDadosGerais';
import SecaoSacoGestacional from './sections/SecaoSacoGestacional';
import SecaoBiometria from './sections/SecaoBiometria';
import SecaoMorfologia from './sections/SecaoMorfologia';
import SecaoDoppler from './sections/SecaoDoppler';
import Secao3D from './sections/Secao3D';
import SecaoConclusao from './sections/SecaoConclusao';
import SecaoDadosMaternos1Tri from './sections/SecaoDadosMaternos1Tri';
import SecaoColoDados from './sections/SecaoColoDados';
import SecaoPlacentaLiquido from './sections/SecaoPlacentaLiquido';
import SecaoIndicesGraficos from './sections/SecaoIndicesGraficos';

// COMPONENTE WRAPPER PARA COLAPSO E COR
const SectionWrapper = ({ id, title, colorHex, children, isOpen, onToggle }) => {
    return (
        <div className="laudo-section" style={{ 
            borderLeft: `4px solid ${colorHex}`, 
            marginBottom: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            borderRadius: '4px'
        }}>
            <div 
                onClick={() => onToggle(id)}
                style={{
                    background: `linear-gradient(90deg, ${colorHex} 0%, #fff 100%)`, 
                    padding: '8px 12px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
                <span style={{fontWeight: 'bold', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.2)'}}>
                    {title}
                </span>
                {isOpen ? <FaChevronUp color="#555"/> : <FaChevronDown color="#555"/>}
            </div>
            
            {/* Animação simples de display */}
            <div style={{ display: isOpen ? 'block' : 'none', padding: '0' }}>
                {children}
            </div>
        </div>
    );
};

const FormObstetrico = ({ onUpdate, initialValues }) => {

  const { 
      formState, 
      handleInputChange, 
      qtdFetos, 
      handleChangeQtdFetos,
      fetoAtivo,
      handleTabChange
  } = useObstetricoForm(onUpdate, initialValues);

  // --- NOVA LÓGICA DE ESTADO (CORRIGIDA) ---
  // Guardamos quais seções estão FECHADAS. O padrão é vazio (todas abertas).
  const [secoesFechadas, setSecoesFechadas] = useState({});

  const toggleSecao = (id) => {
      setSecoesFechadas(prev => ({
          ...prev,
          [id]: !prev[id] // Inverte: se undefined/false (aberto) -> true (fechado)
      }));
  };

  // Helper para o JSX saber se deve desenhar
  // Se não estiver na lista de fechadas, é true (aberto)
  const isAberto = (id) => !secoesFechadas[id];

  if (!formState) return <div className="p-4">Carregando formulário...</div>;

  const commonProps = {
      data: formState,
      handleChange: handleInputChange,
      onChange: handleInputChange,
      qtdFetos 
  };

  const subtipo = formState.subtipo;
  const isInicial = subtipo === "OBSTETRICO_INICIAL";
  const is1Tri = subtipo === "OBSTETRICO_1_TRI";
  const isTardio = !isInicial && !is1Tri;

  return (
    <div className="flex flex-col gap-3 pb-8">
      
      {/* 1. CABEÇALHO FIXO (Sempre visível) */}
      <div className="laudo-section" style={{borderLeft: '4px solid #333', overflow:'visible'}}>
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

      {/* 2. ABAS GÊMEOS */}
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

      {/* 3. CONTEÚDO ACORDEÃO */}
      <div className={qtdFetos > 1 ? "tab-content-wrapper" : ""}>
        
        {qtdFetos > 1 && (
            <div className="mb-3 p-2 bg-blue-50 text-blue-800 text-xs font-bold rounded flex items-center gap-2 border border-blue-100">
                <MdChildCare size={14}/>
                EDITANDO DADOS DO FETO {fetoAtivo === 1 ? 'I' : fetoAtivo === 2 ? 'II' : 'III'}
            </div>
        )}

        {/* --- DATAÇÃO (Sempre presente) - COR ROXA --- */}
        <SectionWrapper id="datacao" title="1. Datação e Cronologia" colorHex="#7B1FA2" isOpen={secaoAberta === 'datacao'} onToggle={toggleSecao}>
            <SecaoDatacao {...commonProps} />
        </SectionWrapper>

        {/* --- DADOS GERAIS (Sempre presente) - COR AZUL MARINHO --- */}
        <SectionWrapper id="dadosGerais" title="2. Dados Gerais e Estática" colorHex="#0D47A1" isOpen={secaoAberta === 'dadosGerais'} onToggle={toggleSecao}>
            <SecaoDadosGerais {...commonProps} />
        </SectionWrapper>

        {/* --- ROTEIRO 1: INICIAL (< 11 SEMANAS) --- */}
        {isInicial && (
            <>
                <SectionWrapper id="saco" title="3. Saco Gestacional" colorHex="#00897B" isOpen={secaoAberta === 'saco'} onToggle={toggleSecao}>
                    <SecaoSacoGestacional {...commonProps} />
                </SectionWrapper>
                
                <SectionWrapper id="anexos1tri" title="4. Útero e Anexos (1º Tri)" colorHex="#039BE5" isOpen={secaoAberta === 'anexos1tri'} onToggle={toggleSecao}>
                    <SecaoDadosMaternos1Tri {...commonProps} />
                </SectionWrapper>

                <SectionWrapper id="biometria" title="5. Biometria (CCN)" colorHex="#2E7D32" isOpen={secaoAberta === 'biometria'} onToggle={toggleSecao}>
                    <SecaoBiometria {...commonProps} /> 
                </SectionWrapper>
            </>
        )}

        {/* --- ROTEIRO 2: MORFOLÓGICO 1º TRI --- */}
        {is1Tri && (
            <>
                <SectionWrapper id="anexos1tri" title="3. Útero e Anexos" colorHex="#039BE5" isOpen={secaoAberta === 'anexos1tri'} onToggle={toggleSecao}>
                    <SecaoDadosMaternos1Tri {...commonProps} />
                </SectionWrapper>

                <SectionWrapper id="biometria" title="4. Biometria (CCN/TN)" colorHex="#2E7D32" isOpen={secaoAberta === 'biometria'} onToggle={toggleSecao}>
                    <SecaoBiometria {...commonProps} />
                </SectionWrapper>
                
                <SectionWrapper id="morfo" title="5. Morfologia e Riscos" colorHex="#EF6C00" isOpen={secaoAberta === 'morfo'} onToggle={toggleSecao}>
                    <SecaoMorfologia {...commonProps} />
                </SectionWrapper>

                <SectionWrapper id="doppler" title="6. Dopplerfluxometria" colorHex="#1565C0" isOpen={secaoAberta === 'doppler'} onToggle={toggleSecao}>
                    <SecaoDoppler {...commonProps} />
                </SectionWrapper>
            </>
        )}

        {/* --- ROTEIRO 3: TARDIO (2º/3º TRI) --- */}
        {isTardio && (
            <>
                <SectionWrapper id="placenta" title="3. Placenta e Líquido" colorHex="#D81B60" isOpen={secaoAberta === 'placenta'} onToggle={toggleSecao}>
                    <SecaoPlacentaLiquido {...commonProps} />
                </SectionWrapper>

                <SectionWrapper id="colo" title="4. Colo Uterino" colorHex="#AD1457" isOpen={secaoAberta === 'colo'} onToggle={toggleSecao}>
                    <SecaoColoDados {...commonProps} />
                </SectionWrapper>
                
                <SectionWrapper id="biometria" title="5. Biometria e Índices" colorHex="#2E7D32" isOpen={secaoAberta === 'biometria'} onToggle={toggleSecao}>
                    <SecaoBiometria {...commonProps} />
                </SectionWrapper>
                
                <SectionWrapper id="morfo" title="6. Análise Morfológica" colorHex="#EF6C00" isOpen={secaoAberta === 'morfo'} onToggle={toggleSecao}>
                    <SecaoMorfologia {...commonProps} />
                </SectionWrapper>

                <SectionWrapper id="doppler" title="7. Dopplerfluxometria" colorHex="#1565C0" isOpen={secaoAberta === 'doppler'} onToggle={toggleSecao}>
                    <SecaoDoppler {...commonProps} />
                </SectionWrapper>
            </>
        )}

        {/* --- UNIVERSAIS --- */}
        <SectionWrapper id="3d" title="3D / 4D" colorHex="#FBC02D" isOpen={secaoAberta === '3d'} onToggle={toggleSecao}>
            <Secao3D {...commonProps} />
        </SectionWrapper>

        <SectionWrapper id="graficos" title="Opções de Gráficos" colorHex="#8E24AA" isOpen={secaoAberta === 'graficos'} onToggle={toggleSecao}>
            <SecaoIndicesGraficos {...commonProps} />
        </SectionWrapper>

        <SectionWrapper id="conclusao" title="Conclusão e Laudo" colorHex="#D32F2F" isOpen={true} onToggle={() => {}}>
            <SecaoConclusao {...commonProps} />
        </SectionWrapper>

      </div>
    </div>
  );
};

export default FormObstetrico;