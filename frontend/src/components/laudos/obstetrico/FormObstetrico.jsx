import React from 'react';
// Importa o Hook que você já tem pronto (que usa o textBuilder internamente)
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

const FormObstetrico = ({ onUpdate, initialValues }) => {

  // O Hook 'useObstetricoForm' que você me mandou já faz tudo: 
  // calcula, gera o texto com o Builder e chama o onUpdate.
  // Só precisamos pegar o 'formState' (dados) e 'handleInputChange' (função de trocar).
  const { formState, handleInputChange } = useObstetricoForm(onUpdate, initialValues);

  if (!formState) return <div className="p-4">Carregando formulário...</div>;

  // Objeto de propriedades padrão para passar para todas as seções
  // Passamos tanto como 'handleChange' quanto 'onChange' para garantir compatibilidade
  const commonProps = {
      data: formState,
      handleChange: handleInputChange,
      onChange: handleInputChange 
  };

  return (
    // REMOVI AS BORDAS DUPLAS: Aqui é um container limpo, sem headers extras
    <div className="flex flex-col gap-3 pb-4">
      
      {/* 1. Subtipo (Define se é morfológico, 1º tri, etc) */}
      <SecaoSubtipo {...commonProps} />

      {/* LÓGICA DE EXIBIÇÃO CONDICIONAL */}
      
      {/* Se for exame inicial (ex: "US Obstétrico Inicial") mostra Saco Gestacional */}
      {formState.subtipo && formState.subtipo.includes("INICIAL") && (
          <SecaoSacoGestacional {...commonProps} />
      )}

      {/* Se for 1º Trimestre (TN), mostra Embrião */}
      {formState.subtipo && formState.subtipo.includes("1_TRI") && (
          <SecaoEmbriao {...commonProps} />
      )}
      
      {/* 2. Dados Gerais (Situação, Posição, BCF) */}
      {/* Essa seção é fundamental para o texto "Situação longitudinal..." */}
      <SecaoDadosGerais {...commonProps} />

      {/* 3. Datação (DUM / DPP) */}
      <SecaoDatacao {...commonProps} />

      {/* 4. Biometria (DBP, Fêmur...) - Gera a tabela de pontinhos */}
      <SecaoBiometria {...commonProps} />

      {/* 5. Placenta e Líquido - Gera o texto de Grannum e ILA */}
      <SecaoPlacentaLiquido {...commonProps} />

      {/* 6. Morfologia (Checkboxes de anatomia) */}
      <SecaoMorfologia {...commonProps} />

      {/* 7. Doppler (Só aparece se marcar checkbox dentro dele) */}
      <SecaoDoppler {...commonProps} />

      {/* 8. Conclusão (Peso e Sexo) */}
      <SecaoConclusao {...commonProps} />

    </div>
  );
};

export default FormObstetrico;