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

  // Lógica para esconder seções que não fazem sentido no Transvaginal Inicial
  const isInicial = formState.subtipo === 'OBSTETRICO_INICIAL';

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

      {/* --- SEÇÕES EXCLUSIVAS DE INICIAL/1º TRI --- */}
      {formState.subtipo && formState.subtipo.includes("INICIAL") && (
          <SecaoSacoGestacional {...commonProps} />
      )}

      {formState.subtipo && formState.subtipo.includes("1_TRI") && (
          <SecaoEmbriao {...commonProps} />
      )}
      
      {/* --- SEÇÕES EXCLUSIVAS DE 2º/3º TRI (Esconder se for inicial) --- */}
      
      {/* Placenta e Líquido - Geralmente não se descreve ILA/Grannum em SG incipiente */}
      {!isInicial && (
        <SecaoPlacentaLiquido {...commonProps} />
      )}

      {/* Biometria - Não tem Fêmur/BPD em SG de 6 semanas */}
      {!isInicial && (
        <SecaoBiometria {...commonProps} />
      )}

      {/* Morfologia - Não vê rins/estômago em SG incipiente */}
      {!isInicial && (
        <SecaoMorfologia {...commonProps} />
      )}

      {/* Doppler - Não se faz uterina/umbilical em rotina inicial */}
      {!isInicial && (
        <SecaoDoppler {...commonProps} />
      )}

      {/* 3D sempre pode aparecer se quiser */}
      <Secao3D {...commonProps} />

      {/* Conclusão adaptada */}
      <SecaoConclusao {...commonProps} />

    </div>
  );
};

export default FormObstetrico;