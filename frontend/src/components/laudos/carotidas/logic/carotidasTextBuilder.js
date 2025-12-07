// Função auxiliar para formatar texto de um vaso específico
const descreverVaso = (data, nomeVaso, lado, prefix) => {
  let texto = `${nomeVaso} ${lado}: `;
  
  // Morfologia
  if (data[`${prefix}SemPlacas`]) {
    texto += `Calibre e trajeto preservados. Ausência de placas de ateroma ou espessamento médio-intimal significativo. `;
  } else {
    if (data[`${prefix}PlacasMinimas`]) {
      texto += `Espessamento médio-intimal difuso/placas mínimas sem repercussão hemodinâmica significativa. `;
    } else {
      // Placa mais detalhada
      const tipo = data[`${prefix}PlacaTipo`] || 'calcificada';
      const local = (data[`${prefix}PlacaLocal`] || '').replace('_', ' ');
      texto += `Presença de placa ${tipo} na ${local}. `;
    }
  }

  // Hemodinâmica (Vps/Vdf vão para tabela, mas mencionamos fluxo laminar)
  const vps = data[`${prefix}Vps`];
  if (vps) {
    texto += `Fluxo laminar e velocidades dentro dos limites da normalidade (ver tabela). `;
  }

  // Tortuosidade (ACI)
  if (nomeVaso.includes('Interna') && data[`${prefix}Tortuosidade`]) {
    texto += `Trajeto tortuoso. `;
  }

  // EIM (ACC)
  if (nomeVaso.includes('Comum')) {
    const espessura = data[`${prefix}Espessura`];
    if (espessura) texto += `Espessura médio-intimal: ${espessura} mm. `;
  }

  return texto.trim() + '\n';
};

const descreverVertebral = (data, lado, prefix) => {
  let txt = `Artéria Vertebral ${lado}: `;
  txt += `Calibre ${data[`${prefix}Calibre`]}. Fluxo ${data[`${prefix}Fluxo`]}. `;
  return txt.trim() + '\n';
};

export const gerarRelatorio = (data) => {
  let t = `DOPPLER COLORIDO DE CARÓTIDAS E VERTEBRAIS\n\n`;

  // 1. Carótidas Comuns
  t += descreverVaso(data, 'Carótida Comum', 'Direita', 'accDir');
  t += descreverVaso(data, 'Carótida Comum', 'Esquerda', 'accEsq');
  t += '\n';

  // 2. Bulbo e Interna
  t += descreverVaso(data, 'Bulbo Carotídeo', 'Direito', 'bulbDir');
  t += descreverVaso(data, 'Carótida Interna', 'Direita', 'aciDir');
  t += '\n';
  t += descreverVaso(data, 'Bulbo Carotídeo', 'Esquerdo', 'bulbEsq');
  t += descreverVaso(data, 'Carótida Interna', 'Esquerda', 'aciEsq');
  t += '\n';

  // 3. Externa
  t += descreverVaso(data, 'Carótida Externa', 'Direita', 'aceDir');
  t += descreverVaso(data, 'Carótida Externa', 'Esquerda', 'aceEsq');
  t += '\n';

  // 4. Vertebrais
  t += descreverVertebral(data, 'Direita', 'vertDir');
  t += descreverVertebral(data, 'Esquerda', 'vertEsq');

  return t;
};

export const gerarConclusaoAutomatica = (data, achados) => {
  // Se o usuário forçou "Conclusão Normal"
  if (data.conclusaoNormal) {
    return `CONCLUSÃO:\nEstudo Dopplerfluxométrico das artérias carótidas e vertebrais sem evidência de estenoses hemodinamicamente significativas.\nFluxo anterógrado nas artérias vertebrais.`;
  }

  // Lógica inteligente simples
  let conc = `CONCLUSÃO:\n`;
  if (achados && achados.length > 0) {
    conc += `Exame compatível com:\n`;
    achados.forEach(a => conc += `- ${a}\n`);
    conc += `- Sugere-se correlação clínica.`;
  } else {
    // Fallback se não detectou nada grave mas o médico não marcou "Normal"
    conc += `Estudo dentro dos limites da normalidade para a faixa etária.`;
  }
  
  if (data.obsGerais) {
    conc += `\n\nOBS: ${data.obsGerais}`;
  }

  return conc;
};

// Gera Array para tabela do PDF
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
  ].filter(item => item.vps || item.vdf); // Só mostra se tiver valor
};