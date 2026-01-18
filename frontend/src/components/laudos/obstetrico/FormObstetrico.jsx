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

// --- NOVO COMPONENTE DE PAINEL (VISUAL LIMPO) ---
const DashboardPanel = ({ id, title, color, children, isOpen, onToggle }) => {
    return (
        <div className="dashboard-panel" style={{ borderLeft: `4px solid ${color}` }}>
            <div className="dashboard-panel-header" onClick={() => onToggle(id)}>
                <span>{title}</span>
                {isOpen ? <FaChevronUp size={10}/> : <FaChevronDown size={10}/>}
            </div>
            {isOpen && <div className="dashboard-panel-body">{children}</div>}
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

  // Controle de Seções (Default: Todas abertas = true)
  // Usamos um objeto onde a chave é o ID e true/false é o estado de fechado
  const [secoesFechadas, setSecoesFechadas] = useState({});

  const toggleSecao = (id) => {
      setSecoesFechadas(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const isAberto = (id) => !secoesFechadas[id];

  if (!formState) return <div className="p-4">Carregando...</div>;

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
      
      {/* 1. BARRA DE CONTROLE SUPERIOR (FIXA) */}
      <div className="dashboard-panel" style={{borderLeft: '4px solid #333', marginBottom: '5px'}}>
          <div className="dashboard-panel-body" style={{padding:'6px 10px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{flex: 1, marginRight: '20px'}}>
                      <SecaoSubtipo {...commonProps} />
                  </div>
                  
                  <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                           <FaLayerGroup /> GESTAÇÃO:
                      </span>
                      <div className="flex gap-1 bg-gray-100 p-1 rounded border border-gray-200">
                          {[1, 2, 3].map(qtd => (
                              <button 
                                key={qtd}
                                onClick={() => handleChangeQtdFetos(qtd)}
                                className={`px-2 py-1 rounded text-xs font-bold transition-all border ${
                                    qtdFetos === qtd 
                                    ? 'bg-purple-600 text-white border-purple-800' 
                                    : 'bg-white text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                  {qtd === 1 ? 'Única' : qtd === 2 ? 'Gemelar' : 'Tri'}
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
              {[1, 2, 3].slice(0, qtdFetos).map(num => (
                  <div 
                    key={num}
                    className={`gemelar-tab ${fetoAtivo === num ? 'active' : ''}`} 
                    onClick={() => handleTabChange(num)}
                  >
                      <FaBaby style={{marginRight:4}}/> Feto {num === 1 ? 'I' : num === 2 ? 'II' : 'III'}
                  </div>
              ))}
          </div>
      )}

      {/* 3. CONTEÚDO PRINCIPAL (GRID) */}
      <div className={qtdFetos > 1 ? "tab-content-wrapper" : ""}>
        
        {/* Aviso visual de qual feto está editando */}
        {qtdFetos > 1 && (
            <div className="mb-2 p-1 px-2 bg-blue-50 text-blue-800 text-xs font-bold rounded flex items-center gap-2 border border-blue-100">
                <MdChildCare size={14}/>
                EDITANDO: FETO {fetoAtivo === 1 ? 'I (A)' : fetoAtivo === 2 ? 'II (B)' : 'III (C)'}
            </div>
        )}

        <div className="dashboard-grid">
            
            {/* ================= COLUNA ESQUERDA (MÉTRICAS & CÁLCULOS) ================= */}
            <div className="col-left">
                
                {/* A. DATAÇÃO (Sempre Primeiro) */}
                <DashboardPanel id="datacao" title="1. Datação e Cronologia" color="#7B1FA2" isOpen={isAberto('datacao')} onToggle={toggleSecao}>
                    <SecaoDatacao {...commonProps} />
                </DashboardPanel>

                {/* B. SACO GESTACIONAL (Apenas Inicial) */}
                {isInicial && (
                    <DashboardPanel id="saco" title="Saco Gestacional" color="#00897B" isOpen={isAberto('saco')} onToggle={toggleSecao}>
                        <SecaoSacoGestacional {...commonProps} />
                    </DashboardPanel>
                )}

                {/* C. BIOMETRIA (O Coração do exame) */}
                <DashboardPanel id="biometria" title="Biometria Fetal" color="#2E7D32" isOpen={isAberto('biometria')} onToggle={toggleSecao}>
                    <SecaoBiometria {...commonProps} />
                </DashboardPanel>

                {/* D. DOPPLER (Numérico) */}
                {(is1Tri || isTardio) && (
                     <DashboardPanel id="doppler" title="Dopplerfluxometria" color="#1565C0" isOpen={isAberto('doppler')} onToggle={toggleSecao}>
                        <SecaoDoppler {...commonProps} />
                    </DashboardPanel>
                )}
                
                {/* E. COLO UTERINO (Tardio) */}
                {isTardio && (
                    <DashboardPanel id="colo" title="Colo Uterino" color="#AD1457" isOpen={isAberto('colo')} onToggle={toggleSecao}>
                        <SecaoColoDados {...commonProps} />
                    </DashboardPanel>
                )}

                 {/* F. GRÁFICOS (Fica bem no final da esquerda) */}
                 <DashboardPanel id="graficos" title="Gráficos" color="#8E24AA" isOpen={isAberto('graficos')} onToggle={toggleSecao}>
                    <SecaoIndicesGraficos {...commonProps} />
                </DashboardPanel>

            </div>

            {/* ================= COLUNA DIREITA (DESCRITIVA & CHECKLISTS) ================= */}
            <div className="col-right">

                {/* A. DADOS GERAIS (Rápido Check) */}
                <DashboardPanel id="dadosGerais" title="Dados Gerais / Estática" color="#0D47A1" isOpen={isAberto('dadosGerais')} onToggle={toggleSecao}>
                    <SecaoDadosGerais {...commonProps} />
                </DashboardPanel>

                {/* B. PLACENTA E LÍQUIDO (Alinha bem com Biometria visualmente) */}
                {(is1Tri || isTardio) && (
                    <DashboardPanel id="placenta" title="Placenta e Líquido" color="#D81B60" isOpen={isAberto('placenta')} onToggle={toggleSecao}>
                        <SecaoPlacentaLiquido {...commonProps} />
                    </DashboardPanel>
                )}

                {/* C. ÚTERO / ANEXOS */}
                {(isInicial || is1Tri) && (
                    <DashboardPanel id="anexos1tri" title="Útero e Anexos" color="#039BE5" isOpen={isAberto('anexos1tri')} onToggle={toggleSecao}>
                        <SecaoDadosMaternos1Tri {...commonProps} />
                    </DashboardPanel>
                )}

                {/* D. MORFOLOGIA (Lista Longa - Fica ótima na direita) */}
                {(is1Tri || isTardio) && (
                    <DashboardPanel id="morfo" title="Análise Morfológica" color="#EF6C00" isOpen={isAberto('morfo')} onToggle={toggleSecao}>
                        <SecaoMorfologia {...commonProps} />
                    </DashboardPanel>
                )}

                {/* E. 3D / 4D */}
                <DashboardPanel id="3d" title="3D / 4D" color="#FBC02D" isOpen={isAberto('3d')} onToggle={toggleSecao}>
                    <Secao3D {...commonProps} />
                </DashboardPanel>

            </div>
        </div>
        
        {/* 4. CONCLUSÃO (LARGURA TOTAL - Fora do Grid) */}
        <div style={{marginTop: '12px'}}>
             <DashboardPanel id="conclusao" title="Conclusão e Diagnóstico" color="#D32F2F" isOpen={true} onToggle={() => {}}>
                <SecaoConclusao {...commonProps} />
            </DashboardPanel>
        </div>

      </div>
    </div>
  );
};

export default FormObstetrico;