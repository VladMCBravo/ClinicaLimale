// Arquivo: carotidas/logic/carotidasTextBuilder.js

// 1. Função Genérica para: Comum, Bulbo, Interna e Externa
const descreverVaso = (data, nomeVaso, lado, prefix) => {
  let texto = `${nomeVaso} ${lado}: `;
  
  // --- Morfologia (Placas) ---
  if (data[`${prefix}SemPlacas`]) {
    texto += `Calibre e trajeto preservados. Ausência de placas de ateroma. `;
  } else {
    if (data[`${prefix}PlacasMinimas`]) {
      texto += `Espessamento médio-intimal difuso/placas mínimas sem repercussão hemodinâmica significativa. `;
    } else {
      const tipo = data[`${prefix}PlacaTipo`] || 'calcificada';
      const local = (data[`${prefix}PlacaLocal`] || '').replace('_', ' ');
      texto += `Presença de placa ${tipo} na ${local}. `;
    }
  }

  // --- Hemodinâmica (AGORA IMPRIMINDO OS VALORES) ---
  const vps = data[`${prefix}Vps`];
  const vdf = data[`${prefix}Vdf`];

  // Só escreve se tiver VPS preenchido
  if (vps) {
    texto += `Fluxo laminar. VPS: ${vps} cm/s. `;
    // VDF (Externa geralmente não mede VDF rotineiramente, mas se tiver, imprime)
    if (vdf) texto += `VDF: ${vdf} cm/s. `;
  } else {
    // Fallback caso não tenha medida, mas tenha fluxo
    texto += `Fluxo laminar. `;
  }

  // --- Espessura Médio-Intimal (Exclusivo ACC) ---
  if (nomeVaso.includes('Comum')) {
    const espessura = data[`${prefix}Espessura`];
    if (espessura) texto += `Espessura médio-intimal: ${espessura} mm. `;
  }

  // --- Tortuosidade (Exclusivo ACI) ---
  if (nomeVaso.includes('Interna') && data[`${prefix}Tortuosidade`]) {
    texto += `Trajeto tortuoso. `;
  }

  return texto.trim() + '\n';
};

// 2. Função Específica para Vertebrais
const descreverVertebral = (data, lado, prefix) => {
  let txt = `Artéria Vertebral ${lado}: `;
  
  // Calibre e Sentido do Fluxo
  txt += `Calibre ${data[`${prefix}Calibre`]}. Fluxo ${data[`${prefix}Fluxo`]}. `;
  
  // --- Correção: Adicionando VPS aqui também ---
  if (data[`${prefix}Vps`]) {
      txt += `VPS: ${data[`${prefix}Vps`]} cm/s.`;
  }

  return txt.trim() + '\n';
};

// 3. Montagem do Relatório Geral
export const gerarRelatorio = (data) => {
  let t = `DOPPLER COLORIDO DE CARÓTIDAS E VERTEBRAIS\n\n`;

  // Grupo 1: Carótidas Comuns
  t += descreverVaso(data, 'Carótida Comum', 'Direita', 'accDir');
  t += descreverVaso(data, 'Carótida Comum', 'Esquerda', 'accEsq');
  t += '\n';

  // Grupo 2: Bulbos e Internas
  t += descreverVaso(data, 'Bulbo Carotídeo', 'Direito', 'bulbDir');
  t += descreverVaso(data, 'Carótida Interna', 'Direita', 'aciDir');
  t += '\n';
  t += descreverVaso(data, 'Bulbo Carotídeo', 'Esquerdo', 'bulbEsq');
  t += descreverVaso(data, 'Carótida Interna', 'Esquerda', 'aciEsq');
  t += '\n';

  // Grupo 3: Externas
  t += descreverVaso(data, 'Carótida Externa', 'Direita', 'aceDir');
  t += descreverVaso(data, 'Carótida Externa', 'Esquerda', 'aceEsq');
  t += '\n';

  // Grupo 4: Vertebrais
  t += descreverVertebral(data, 'Direita', 'vertDir');
  t += descreverVertebral(data, 'Esquerda', 'vertEsq');

  return t;
};

// 4. Conclusão Automática
export const gerarConclusaoAutomatica = (data, achados) => {
  if (data.conclusaoNormal) {
    return `CONCLUSÃO:\nEstudo Dopplerfluxométrico das artérias carótidas e vertebrais sem evidência de estenoses hemodinamicamente significativas.\nFluxo anterógrado nas artérias vertebrais.`;
  }

  let conc = `CONCLUSÃO:\n`;
  if (achados && achados.length > 0) {
    conc += `Exame compatível com:\n`;
    achados.forEach(a => conc += `- ${a}\n`);
    conc += `- Sugere-se correlação clínica.`;
  } else {
    conc += `Estudo dentro dos limites da normalidade para a faixa etária.`;
  }
  
  if (data.obsGerais) {
    conc += `\n\nOBS: ${data.obsGerais}`;
  }

  return conc;
};

// 5. Tabela de Medidas (Para o Rodapé do PDF)
export const gerarTabelaMedidas = (data) => {
  return [
    { vaso: 'ACC Dir', vps: data.accDirVps, vdf: data.accDirVdf },
    { vaso: 'ACC Esq', vps: data.accEsqVps, vdf: data.accEsqVdf },
    { vaso: 'ACI Dir', vps: data.aciDirVps, vdf: data.aciDirVdf },
    { vaso: 'ACI Esq', vps: data.aciEsqVps, vdf: data.aciEsqVdf },
    { vaso: 'ACE Dir', vps: data.aceDirVps, vdf: data.aceDirVdf },
    { vaso: 'ACE Esq', vps: data.aceEsqVps, vdf: data.aceEsqVdf },
    { vaso: 'Vert Dir', vps: data.vertDirVps, vdf: data.vertDirVdf },
    { vaso: 'Vert Esq', vps: data.vertEsqVps, vdf: data.vertEsqVdf },
  ].filter(item => item.vps || item.vdf);
};