import React, { useEffect } from 'react'; // Removi useState pois o estado fica no Pai
import { useObstetricoForm } from './hooks/useObstetricoForm';
import '../Laudos.css';

// Seções (Inputs)
import SecaoSubtipo from './sections/SecaoSubtipo';
import SecaoDadosGerais from './sections/SecaoDadosGerais';
import SecaoDatacao from './sections/SecaoDatacao';
import SecaoBiometria from './sections/SecaoBiometria';
import SecaoPlacentaLiquido from './sections/SecaoPlacentaLiquido';
import SecaoMorfologia from './sections/SecaoMorfologia';
import SecaoDoppler from './sections/SecaoDoppler';
import SecaoConclusao from './sections/SecaoConclusao';

// Recebe 'onUpdate' (função do pai) e 'initialValues' (se tiver rascunho salvo)
const FormObstetrico = ({ onUpdate, initialValues }) => {

  // Função interna que o Hook chama quando algo muda
  const handleInternalUpdate = (payload) => {
    // AQUI ESTÁ A MÁGICA: Passamos o texto e os dados para o PAI (LaudosPage)
    if (onUpdate) {
      onUpdate({
        texto: payload.texto,
        dadosEstruturados: payload.dados, // ou formState
        tituloExame: "USG OBSTÉTRICO" // Define o título para o pai saber
      });
    }
  };

  // Inicializa o Hook
  const { formState, handleInputChange } = useObstetricoForm(handleInternalUpdate, initialValues);

  if (!formState) return <div>Carregando formulário...</div>;

  // --- RETORNO LIMPO: Apenas os inputs, sem colunas de layout ---
  return (
    <div className="flex flex-col gap-2 pb-10"> {/* Removemos height fixa e overflow daqui, o pai controla */}
      
      {/* 1. Subtipo */}
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

      {/* 4. Biometria */}
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

      {/* 7. Doppler */}
      <div className="laudo-section">
        <div className="header-base header-blue">Doppler</div>
        <div className="laudo-section-body">
          <SecaoDoppler data={formState} onChange={handleInputChange} />
        </div>
      </div>

      {/* 8. Conclusão */}
      <div className="laudo-section bg-blue-50">
        <div className="header-base header-purple">Conclusão</div>
        <div className="laudo-section-body">
          <SecaoConclusao data={formState} onChange={handleInputChange} />
        </div>
      </div>

    </div>
  );
};

export default FormObstetrico;