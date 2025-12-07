// Função auxiliar (privada ao módulo) para gerar estado de um vaso padrão
const vasoInitialState = (prefixo) => ({
  [`${prefixo}Vps`]: '',
  [`${prefixo}Vdf`]: '',
  [`${prefixo}SemPlacas`]: true,
  [`${prefixo}PlacasMinimas`]: false,
  [`${prefixo}PlacaTipo`]: 'calcificada', // calcificada, mole, mista, ulcerada
  [`${prefixo}PlacaLocal`]: 'parede_posterior',
  [`${prefixo}PlacaExtensao`]: 'nao_citar',
  [`${prefixo}PlacaSuperficie`]: 'nao_citar',
  [`${prefixo}Obs`]: '',
  [`${prefixo}Estenose`]: '0-50%', 
  // Campos específicos que podem não ser usados em todos, mas garantem segurança
  [`${prefixo}Tortuosidade`]: false, 
});

export const carotidasInitialState = {
  subtipo: 'DOPPLER_CAROTIDAS',

  // --- Carótida Comum (ACC) ---
  ...vasoInitialState('accDir'),
  ...vasoInitialState('accEsq'),
  accDirEspessura: '', 
  accEsqEspessura: '',

  // --- Bulbo Carotídeo ---
  ...vasoInitialState('bulbDir'),
  ...vasoInitialState('bulbEsq'),

  // --- Carótida Interna (ACI) ---
  ...vasoInitialState('aciDir'),
  ...vasoInitialState('aciEsq'),

  // --- Carótida Externa (ACE) ---
  ...vasoInitialState('aceDir'),
  ...vasoInitialState('aceEsq'),

  // --- Vertebrais ---
  vertDirVps: '', vertDirVdf: '', vertDirFluxo: 'anterógrado', vertDirCalibre: 'normal',
  vertEsqVps: '', vertEsqVdf: '', vertEsqFluxo: 'anterógrado', vertEsqCalibre: 'normal',

  // --- Conclusão e Obs ---
  conclusaoNormal: false,
  obsGerais: ''
};