import React, { useState } from 'react';

// Importação do Hook
import { useObstetricoForm } from './hooks/useObstetricoForm';

// Importação das Seções (Inputs)
import SecaoSubtipo from './sections/SecaoSubtipo';
import SecaoDadosGerais from './sections/SecaoDadosGerais';
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

// Importação do CSS (para garantir que suas classes funcionem)
import '../Laudos.css'; 

const FormObstetrico = () => {
  // 1. Estado para armazenar o Texto Gerado (Lado Direito)
  const [textoLaudo, setTextoLaudo] = useState('');

  // 2. Função de Callback que o Hook vai chamar toda vez que algo mudar
  const handleFormUpdate = (payload) => {
    // payload contém: { texto, dadosEstruturados, tituloExame }
    if (payload && payload.texto) {
      setTextoLaudo(payload.texto);
    }
  };

  // 3. Inicializa o hook passando a função de callback
  const { formState, handleInputChange } = useObstetricoForm(handleFormUpdate);

  // Trava de segurança para não quebrar a tela
  if (!formState) return <div className="text-xs p-4">Carregando...</div>;

  return (
    <div className="laudo-container w-full max-w-[1800px] mx-auto p-2 bg-gray-50 min-h-screen flex gap-4 items-start">
      
      {/* =======================================================
          COLUNA DA ESQUERDA (INPUTS & CONTROLES)
          Organizado: Subtipo -> Dados -> Datação -> Biometria -> Morfologia -> Conclusão
         ======================================================= */}
      <div className="w-1/2 flex flex-col gap-3 h-screen overflow-y-auto pb-20 scrollbar-thin">
        
        {/* Bloco 1: Definição do Exame (Obrigatório Primeiro) */}
        <div className="laudo-section">
          <div className="header-base header-purple">Subtipo do Exame</div>
          <div className="laudo-section-body">
            <SecaoSubtipo data={formState} onChange={handleInputChange} />
          </div>
        </div>

        {/* Bloco 2: Dados Vitais e Gerais */}
        <div className="laudo-section">
          <div className="header-base header-blue">Dados Gerais & Vitalidade</div>
          <div className="laudo-section-body">
            <SecaoDadosGerais data={formState} onChange={handleInputChange} />
          </div>
        </div>

        {/* Bloco 3: Datação (DUM/DPP) */}
        <div className="laudo-section">
          <div className="header-base header-purple">DUM / DPP / Idade Gestacional</div>
          <div className="laudo-section-body">
            <SecaoDatacao data={formState} onChange={handleInputChange} />
          </div>
        </div>

        {/* Lógica Condicional: Se for 1º Trimestre (mostra embrião), senão (mostra Biometria) */}
        {formState.subtipo === 'OBSTETRICO_1_TRI' ? (
          <>
            <div className="laudo-section">
              <div className="header-base header-green">Saco Gestacional & Embrião</div>
              <div className="laudo-section-body">
                <SecaoSacoGestacional data={formState} onChange={handleInputChange} />
                <SecaoEmbriao data={formState} onChange={handleInputChange} />
              </div>
            </div>
            <div className="laudo-section">
              <div className="header-base header-green">Dados Maternos (1º Tri)</div>
              <div className="laudo-section-body">
                <SecaoDadosMaternos1Tri data={formState} onChange={handleInputChange} />
              </div>
            </div>
          </>
        ) : (
          <div className="laudo-section">
            <div className="header-base header-green">Biometria Fetal</div>
            <div className="laudo-section-body">
              <SecaoBiometria data={formState} onChange={handleInputChange} />
            </div>
          </div>
        )}

        {/* Bloco 4: Placenta, Líquido e Anexos */}
        <div className="laudo-section">
          <div className="header-base header-green">Placenta, Líquido & Colo</div>
          <div className="laudo-section-body">
            <SecaoPlacentaLiquido data={formState} onChange={handleInputChange} />
            <SecaoColoDados data={formState} onChange={handleInputChange} />
          </div>
        </div>

        {/* Bloco 5: Doppler (Opcional visualmente, mas o controle está dentro) */}
        <div className="laudo-section">
          <div className={`header-base ${formState.usarDoppler ? 'header-blue' : 'header-gray'}`}>
            Estudo Dopplerfluxométrico
          </div>
          <div className="laudo-section-body">
            <SecaoDoppler data={formState} onChange={handleInputChange} />
          </div>
        </div>

        {/* Bloco 6: Morfologia */}
        <div className="laudo-section">
          <div className="header-base header-green">Anatomia Fetal</div>
          <div className="laudo-section-body">
            <SecaoMorfologia data={formState} onChange={handleInputChange} />
          </div>
        </div>

        {/* Bloco 7: Conclusão */}
        <div className="laudo-section bg-blue-50">
          <div className="header-base header-purple">Conclusão do Laudo</div>
          <div className="laudo-section-body">
            <SecaoConclusao data={formState} onChange={handleInputChange} />
            <SecaoAnexos data={formState} onChange={handleInputChange} />
          </div>
        </div>

      </div>

      {/* =======================================================
          COLUNA DA DIREITA (LIVE PREVIEW - O TEXTO FINAL)
          Fica fixo enquanto você rola a esquerda
         ======================================================= */}
      <div className="w-1/2 h-screen sticky top-0 pt-0">
        <div className="bg-white border border-gray-300 shadow-lg h-[95vh] flex flex-col rounded">
          
          {/* Cabeçalho da Preview */}
          <div className="bg-gray-100 p-2 border-b border-gray-300 flex justify-between items-center">
            <span className="font-bold text-gray-700 text-xs uppercase">Visualização do Laudo</span>
            <div className="space-x-2">
               <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">Copiar Texto</button>
               <button className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">Gerar PDF</button>
            </div>
          </div>

          {/* Área do Texto - Simula uma folha A4 */}
          <div className="flex-1 p-8 overflow-y-auto bg-gray-50">
            <div className="bg-white shadow-sm min-h-full p-8 text-sm text-gray-900 font-serif leading-relaxed whitespace-pre-wrap border border-gray-200">
              {textoLaudo || "Preencha os dados à esquerda para gerar o laudo..."}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default FormObstetrico;