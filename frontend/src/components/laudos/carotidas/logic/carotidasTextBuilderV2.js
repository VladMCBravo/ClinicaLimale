// Arquivo: carotidas/logic/carotidasTextBuilderV2.js

const tituloSecao = (texto) => `<h4 style="color: #1C2E4A; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 15px; margin-bottom: 10px; font-size: 14px;">${texto}</h4>`;

const descreverVaso = (data, nomeVaso, lado, prefix) => {
  let texto = `<p style="margin-bottom: 8px; line-height: 1.4;"><strong>${nomeVaso} ${lado}:</strong> `;
  
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

  const vps = data[`${prefix}Vps`];
  const vdf = data[`${prefix}Vdf`];

  if (vps) {
    texto += `Fluxo laminar. VPS: <strong>${vps} cm/s</strong>. `;
    if (vdf) texto += `VDF: <strong>${vdf} cm/s</strong>. `;
  } else {
    texto += `Fluxo laminar. `;
  }

  if (nomeVaso.includes('Comum')) {
    const espessura = data[`${prefix}Espessura`];
    if (espessura) texto += `Espessura médio-intimal: ${espessura} mm. `;
  }

  if (nomeVaso.includes('Interna') && data[`${prefix}Tortuosidade`]) {
    texto += `Trajeto tortuoso. `;
  }

  return texto.trim() + '</p>';
};

const descreverVertebral = (data, lado, prefix) => {
  let txt = `<p style="margin-bottom: 8px; line-height: 1.4;"><strong>Artéria Vertebral ${lado}:</strong> `;
  txt += `Calibre ${data[`${prefix}Calibre`]}. Fluxo ${data[`${prefix}Fluxo`]}. `;
  
  if (data[`${prefix}Vps`]) {
      txt += `VPS: <strong>${data[`${prefix}Vps`]} cm/s</strong>.`;
  }
  return txt.trim() + '</p>';
};

export const gerarRelatorioHTML = (data) => {
  let t = ``;

  t += tituloSecao('CARÓTIDAS COMUNS');
  t += descreverVaso(data, 'Carótida Comum', 'Direita', 'accDir');
  t += descreverVaso(data, 'Carótida Comum', 'Esquerda', 'accEsq');

  t += tituloSecao('BULBOS E CARÓTIDAS INTERNAS');
  t += descreverVaso(data, 'Bulbo Carotídeo', 'Direito', 'bulbDir');
  t += descreverVaso(data, 'Carótida Interna', 'Direita', 'aciDir');
  t += descreverVaso(data, 'Bulbo Carotídeo', 'Esquerdo', 'bulbEsq');
  t += descreverVaso(data, 'Carótida Interna', 'Esquerda', 'aciEsq');

  t += tituloSecao('CARÓTIDAS EXTERNAS');
  t += descreverVaso(data, 'Carótida Externa', 'Direita', 'aceDir');
  t += descreverVaso(data, 'Carótida Externa', 'Esquerda', 'aceEsq');

  t += tituloSecao('ARTÉRIAS VERTEBRAIS');
  t += descreverVertebral(data, 'Direita', 'vertDir');
  t += descreverVertebral(data, 'Esquerda', 'vertEsq');

  return t;
};

export const gerarConclusaoAutomaticaHTML = (data, achados) => {
  let conc = tituloSecao('CONCLUSÃO');
  
  if (data.conclusaoNormal) {
    conc += `<p>Estudo Dopplerfluxométrico das artérias carótidas e vertebrais sem evidência de estenoses hemodinamicamente significativas.<br/>Fluxo anterógrado nas artérias vertebrais.</p>`;
    return conc;
  }

  if (achados && achados.length > 0) {
    conc += `<p style="margin-bottom: 5px;">Exame compatível com:</p><ul style="margin-top: 0;">`;
    achados.forEach(a => conc += `<li style="margin-bottom: 4px;">${a}</li>`);
    conc += `<li>Sugere-se correlação clínica.</li></ul>`;
  } else {
    conc += `<p>Estudo dentro dos limites da normalidade para a faixa etária.</p>`;
  }
  
  if (data.obsGerais) {
    conc += `<p><strong>OBS:</strong> ${data.obsGerais}</p>`;
  }

  return conc;
};

export const gerarTabelaMedidasHTML = (data) => {
  const medidas = [
    { vaso: 'ACC Dir', vps: data.accDirVps, vdf: data.accDirVdf },
    { vaso: 'ACC Esq', vps: data.accEsqVps, vdf: data.accEsqVdf },
    { vaso: 'ACI Dir', vps: data.aciDirVps, vdf: data.aciDirVdf },
    { vaso: 'ACI Esq', vps: data.aciEsqVps, vdf: data.aciEsqVdf },
    { vaso: 'ACE Dir', vps: data.aceDirVps, vdf: data.aceDirVdf },
    { vaso: 'ACE Esq', vps: data.aceEsqVps, vdf: data.aceEsqVdf },
    { vaso: 'Vert Dir', vps: data.vertDirVps, vdf: data.vertDirVdf },
    { vaso: 'Vert Esq', vps: data.vertEsqVps, vdf: data.vertEsqVdf },
  ].filter(item => item.vps || item.vdf);

  if (medidas.length === 0) return '';

  let tableHtml = `
  <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; font-size: 12px; text-align: center;">
    <thead>
      <tr style="background-color: #f8f9fa;">
        <th style="border: 1px solid #dee2e6; padding: 6px;">Vaso</th>
        <th style="border: 1px solid #dee2e6; padding: 6px;">VPS (cm/s)</th>
        <th style="border: 1px solid #dee2e6; padding: 6px;">VDF (cm/s)</th>
      </tr>
    </thead>
    <tbody>
  `;

  medidas.forEach(m => {
    tableHtml += `
      <tr>
        <td style="border: 1px solid #dee2e6; padding: 6px; font-weight: bold;">${m.vaso}</td>
        <td style="border: 1px solid #dee2e6; padding: 6px;">${m.vps || '-'}</td>
        <td style="border: 1px solid #dee2e6; padding: 6px;">${m.vdf || '-'}</td>
      </tr>
    `;
  });

  tableHtml += `</tbody></table>`;
  return tableHtml;
};