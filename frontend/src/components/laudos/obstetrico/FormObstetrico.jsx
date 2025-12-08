import React, { useState, useEffect } from 'react';
import { useObstetricoForm } from './hooks/useObstetricoForm';
import '../Laudos.css'; // Seu CSS

// Seções (Inputs)
import SecaoSubtipo from './sections/SecaoSubtipo';
import SecaoDadosGerais from './sections/SecaoDadosGerais';
import SecaoDatacao from './sections/SecaoDatacao';
import SecaoBiometria from './sections/SecaoBiometria';
import SecaoPlacentaLiquido from './sections/SecaoPlacentaLiquido';
import SecaoMorfologia from './sections/SecaoMorfologia';
import SecaoDoppler from './sections/SecaoDoppler';
import SecaoConclusao from './sections/SecaoConclusao';
// import SecaoAnexos from './sections/SecaoAnexos'; // Comentei temporariamente para limpar

const FormObstetrico = () => {
  // Estado local apenas para o preview do texto
  const [textoLaudo, setTextoLaudo] = useState('');

  // Callback que recebe os dados do Hook sempre que algo muda
  const handleFormUpdate = (payload) => {
    if (payload && payload.texto) {
      setTextoLaudo(payload.texto);
    }
  };

  // Inicializa o Hook principal
  const { formState, handleInputChange } = useObstetricoForm(handleFormUpdate);

  if (!formState) return <div>Carregando...</div>;

  return (
    <div className="laudo-container flex gap-4 h-[calc(100vh-20px)] overflow-hidden p-2">
      
      {/* --- COLUNA ESQUERDA (Formulário / Inputs) --- */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2 pb-20">
        
        {/* 1. Subtipo (Primeira coisa a aparecer) */}
        <div className="laudo-section border-l-4 border-purple-600">
          <div className="header-base header-purple">Subtipo do Exame</div>
          <div className="laudo-section-body">
            <SecaoSubtipo data={formState} onChange={handleInputChange} />
          </div>
        </div>

        {/* 2. Dados Gerais */}
        <div className="laudo-section">
          <div className="header-base header-blue">Dados Gerais & Vitalidade</div>
          <div className="laudo-section-body">
            <SecaoDadosGerais data={formState} onChange={handleInputChange} />
          </div>
        </div>

        {/* 3. Datação */}
        <div className="laudo-section">
          <div className="header-base header-purple">Datação (DUM / DPP)</div>
          <div className="laudo-section-body">
            <SecaoDatacao data={formState} onChange={handleInputChange} />
          </div>
        </div>

        {/* 4. Biometria (Lógica simples: Mostra se não for 1º Tri puro) */}
        <div className="laudo-section">
          <div className="header-base header-green">Biometria Fetal</div>
          <div className="laudo-section-body">
            <SecaoBiometria data={formState} onChange={handleInputChange} />
          </div>
        </div>

        {/* 5. Placenta e Líquido */}
        <div className="laudo-section">
          <div className="header-base header-green">Placenta & Líquido</div>
          <div className="laudo-section-body">
            <SecaoPlacentaLiquido data={formState} onChange={handleInputChange} />
          </div>
        </div>

        {/* 6. Morfologia */}
        <div className="laudo-section">
          <div className="header-base header-green">Morfologia</div>
          <div className="laudo-section-body">
            <SecaoMorfologia data={formState} onChange={handleInputChange} />
          </div>
        </div>

        {/* 7. Doppler (Controle simples) */}
        <div className="laudo-section">
          <div className="header-base header-blue">Doppler</div>
          <div className="laudo-section-body">
            <SecaoDoppler data={formState} onChange={handleInputChange} />
          </div>
        </div>

        {/* 8. Conclusão (Apenas Inputs: Peso, Sexo, Obs) */}
        <div className="laudo-section bg-blue-50">
          <div className="header-base header-purple">Conclusão</div>
          <div className="laudo-section-body">
            <SecaoConclusao data={formState} onChange={handleInputChange} />
          </div>
        </div>

      </div>

      {/* --- COLUNA DIREITA (Texto Vivo / Preview) --- */}
      <div className="w-[45%] bg-white border border-gray-400 shadow-xl flex flex-col h-full rounded-md">
        {/* Barra de Ferramentas do Laudo */}
        <div className="bg-gray-100 p-2 border-b border-gray-300 flex justify-between items-center">
          <span className="font-bold text-gray-700 text-sm">PRÉ-VISUALIZAÇÃO</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">Copiar</button>
            <button className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">Salvar</button>
          </div>
        </div>

        {/* Área do Texto (Editável) */}
        <textarea 
          className="flex-1 p-8 w-full resize-none outline-none font-serif text-gray-900 leading-relaxed text-sm"
          value={textoLaudo}
          readOnly // Se quiser permitir edição manual, tire o readOnly e crie um handler
        />
      </div>

    </div>
  );
};

export default FormObstetrico;