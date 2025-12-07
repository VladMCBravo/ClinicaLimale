/**
 * Verifica se existe alguma alteração hemodinâmica ou morfológica significativa
 * para sugerir a conclusão automática.
 */
export const verificarAlteracoes = (data) => {
  const vasos = ['acc', 'bulb', 'aci', 'ace'];
  const lados = ['Dir', 'Esq'];
  let temAlteracao = false;
  let achados = [];

  // 1. Verifica Placas e Estenoses
  vasos.forEach(vaso => {
    lados.forEach(lado => {
      const prefix = `${vaso}${lado}`;
      
      // Se não estiver marcado "Sem Placas" e nem "Placas Mínimas", assume-se placa relevante
      if (!data[`${prefix}SemPlacas`] && !data[`${prefix}PlacasMinimas`]) {
        temAlteracao = true;
        achados.push(`Placa em ${vaso.toUpperCase()} ${lado}`);
      }

      // Se houver tortuosidade (apenas ACI costuma ter esse flag no state)
      if (data[`${prefix}Tortuosidade`]) {
        temAlteracao = true;
        achados.push(`Tortuosidade em ${vaso.toUpperCase()} ${lado}`);
      }
    });
  });

  // 2. Verifica Vertebrais (Fluxo retrógrado ou hipoplasia)
  ['Dir', 'Esq'].forEach(lado => {
    const prefix = `vert${lado}`;
    if (data[`${prefix}Fluxo`] !== 'anterógrado') {
      temAlteracao = true;
      achados.push(`Fluxo alterado na Vertebral ${lado}`);
    }
    if (data[`${prefix}Calibre`] !== 'normal') {
      temAlteracao = true;
      achados.push(`Alteração de calibre na Vertebral ${lado}`);
    }
  });

  return { temAlteracao, achados };
};