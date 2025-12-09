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

  const { formState, handleInputChange } = useObstetricoForm(onUpdate, initialValues);

  if (!formState) return <div className="p-4">Carregando formulário...</div>;

  const commonProps = {
      data: formState,
      handleChange: handleInputChange,
      onChange: handleInputChange 
  };

  return (
    <div className="flex flex-col gap-3 pb-4">
      
      {/* 1. SUBTIPO (Sempre o primeiro para definir o layout) */}
      <SecaoSubtipo {...commonProps} />

      {/* 2. DATAÇÃO (DUM, DPP, IG) */}
      {/* "DPP: 17/06/2026..." - Primeira linha do texto */}
      <SecaoDatacao {...commonProps} />
      
      {/* 3. DADOS GERAIS (Bexiga, Situação, Apresentação) */}
      {/* "Bexiga materna não visualizada..." - Segunda linha do texto */}
      <SecaoDadosGerais {...commonProps} />

      {/* --- SEÇÕES ESPECÍFICAS DE 1º TRIMESTRE --- */}
      {/* Elas entram aqui pois geralmente descrevem o feto/embrião logo após os dados gerais */}
      
      {/* Se for exame inicial (Saco Gestacional) */}
      {formState.subtipo && formState.subtipo.includes("INICIAL") && (
          <SecaoSacoGestacional {...commonProps} />
      )}

      {/* Se for 1º Trimestre (Embrião, CCN, TN) */}
      {formState.subtipo && formState.subtipo.includes("1_TRI") && (
          <SecaoEmbriao {...commonProps} />
      )}
      
      {/* 4. PLACENTA E LÍQUIDO */}
      {/* "Placenta de inserção..." - Próximo parágrafo do texto */}
      <SecaoPlacentaLiquido {...commonProps} />

      {/* 5. BIOMETRIA (Medidas) */}
      {/* "Medidas: Diâmetro Biparietal..." */}
      <SecaoBiometria {...commonProps} />

      {/* 6. MORFOLOGIA (Checkboxes de anatomia) */}
      <SecaoMorfologia {...commonProps} />

      {/* 7. DOPPLER (Opcional) */}
      <SecaoDoppler {...commonProps} />

      {/* --- 2. INSERIR SEÇÃO 3D AQUI --- */}
      {/* Ela aparecerá se o subtipo for 3D OU se o checkbox interno estiver marcado */}
      <Secao3D {...commonProps} />

      {/* 8. CONCLUSÃO (Peso, Sexo, Obs finais) */}
      <SecaoConclusao {...commonProps} />

    </div>
  );
};

export default FormObstetrico;