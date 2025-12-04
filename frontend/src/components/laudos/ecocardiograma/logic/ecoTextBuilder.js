/**
 * Lógica pura de montagem de texto e tabelas.
 */

// Mapeamento de Títulos
const MAP_TITULOS = {
    'ECO_TRANSTORACICO': 'ECOCARDIOGRAMA TRANSTORÁCICO',
    'ECO_DOPPLER': 'ECOCARDIOGRAMA TRANSTORÁCICO COM DOPPLER COLORIDO',
    'ECO_STRAIN': 'ECOCARDIOGRAMA COM ANÁLISE DE DEFORMAÇÃO (STRAIN)',
};

export const getTituloExame = (subtipo) => MAP_TITULOS[subtipo] || 'ECOCARDIOGRAMA';

// 1. Gerador da Tabela de Medidas (Estrutura para o PDF)
export const gerarTabelaMedidas = (data) => {
    return [
        { estrutura: 'Raiz aórtica', medida: data.raizAorta ? `${data.raizAorta} mm` : '-', ref: '21-37 mm' },
        { estrutura: 'Átrio esquerdo (AE)', medida: data.atrioEsq ? `${data.atrioEsq} mm` : '-', ref: '25-40 mm' },
        { estrutura: 'Volume indexado do AE', medida: data.volAe ? `${data.volAe} ml/m²` : '-', ref: '16-34 ml/m²' },
        { estrutura: 'VD (paraesternal eixo longo)', medida: data.ventriculoDir ? `${data.ventriculoDir} mm` : '-', ref: '<42 mm' },
        { estrutura: 'Septo ventricular (diástole)', medida: data.siv ? `${data.siv} mm` : '-', ref: 'F<10 mm; M<11 mm' },
        { estrutura: 'Parede posterior do VE (diástole)', medida: data.ppve ? `${data.ppve} mm` : '-', ref: 'F<10 mm; M<11 mm' },
        { estrutura: 'Diâmetro diastólico do VE', medida: data.ddve ? `${data.ddve} mm` : '-', ref: '36-52 mm' },
        { estrutura: 'Diâmetro sistólico do VE', medida: data.dsve ? `${data.dsve} mm` : '-', ref: '26-34 mm' },
        { estrutura: 'Fração de encurtamento', medida: data.resEncurtamento ? `${data.resEncurtamento}%` : '-', ref: '28-44%' },
        { estrutura: `Fração de Ejeção (${data.metodoFe})`, medida: data.resFe ? `${data.resFe}%` : '-', ref: '>55%' },
        { estrutura: 'Índice de massa VE', medida: data.resImVE ? `${data.resImVE} g/m²` : '-', ref: 'F<96; M<116' },
        { estrutura: 'Espessura relativa de parede (RWT)', medida: data.resRwt || '-', ref: '<0,42' },
    ];
};

// 2. Gerador de Relatório (Comentários / Texto Corrido)
export const gerarRelatorio = (data) => {
    let comentarios = [];
    
    // Biometria
    if (data.peso || data.altura || data.sc) {
        const bio = [];
        if(data.peso) bio.push(`Peso: ${data.peso} kg`);
        if(data.altura) bio.push(`Altura: ${data.altura} cm`);
        if(data.imc) bio.push(`IMC: ${data.imc} kg/m²`);
        if(data.sc) bio.push(`SC: ${data.sc} m²`);
        comentarios.push(`Dados Biométricos: ${bio.join(' | ')}.`);
    }

    // Ritmo e Câmaras
    comentarios.push(`Ritmo cardíaco ${data.ritmo.toLowerCase()}.`);
    if(data.camaras === 'Normal') comentarios.push('Tamanho normal das câmaras cardíacas.');
    else {
        let camDesc = 'Alteração das câmaras: ';
        if(data.camIndVe !== 'normal') camDesc += `VE aumentado (${data.camIndVe}). `;
        if(data.camIndVd !== 'normal') camDesc += `VD aumentado (${data.camIndVd}). `;
        if(data.camIndAe !== 'normal') camDesc += `AE aumentado (${data.camIndAe}). `;
        if(data.camIndAd !== 'normal') camDesc += `AD aumentado (${data.camIndAd}). `;
        if(data.camDeformidade) camDesc += 'Presença de deformidade geométrica.';
        comentarios.push(camDesc);
    }

    // Ventrículo Esquerdo
    let veDesc = data.espessuraVe === 'normal' ? 'Espessura miocárdica normal do VE.' : `Hipertrofia do VE (${data.espessuraVeTipo.replace(/_/g, ' ')}).`;
    if(data.septoSigmoide) veDesc += ` Septo sigmoide (${data.septoSigmoide}mm).`;
    comentarios.push(veDesc);

    // Função VE
    if(data.sistolicoGlobal === 'normal' && !data.sistolicoReduzidoVe) {
        comentarios.push('Desempenho sistólico biventricular preservado.');
    } else {
        if(data.sistolicoReduzidoVe) comentarios.push(`Função sistólica do VE reduzida (${data.sistolicoReduzidoVeGrau}).`);
        if(data.sistolicoReduzidoVd) comentarios.push(`Função sistólica do VD reduzida (${data.sistolicoReduzidoVdGrau}).`);
    }

    if(data.contratilidadeAlterada) comentarios.push('Alteração da contratilidade segmentar do ventrículo esquerdo.');
    if(data.movAnomaloSepto) comentarios.push('Movimento anômalo do septo interventricular.');

    comentarios.push(`Índices de função diastólica ${data.diastolica === 'normal' ? 'normais' : `alterados (${data.diastolica.replace(/_/g, ' ')})`}.`);

    // AORTA
    const valvaAortica = [];
    if(data.aortaEstrutura !== 'normal') valvaAortica.push(`estrutura alterada (${data.aortaEstrutura})`);
    if(data.aortaPlacas) valvaAortica.push('placas de ateroma');
    if(data.aortaAteromatose) valvaAortica.push('ateromatose discreta');
    if(data.aortaDisseccao) valvaAortica.push('sinais de dissecção');
    if(data.aortaObsNaoVis) valvaAortica.push('arco aórtico não visualizado satisfatoriamente');
    if(data.aortaEctasiaRaiz || data.aortaEctasiaAsc || data.aortaEctasiaArco) valvaAortica.push('ectasia aórtica');
    comentarios.push(`Aorta: ${valvaAortica.length > 0 ? valvaAortica.join(', ') : 'Morfologia e dinâmica normais'}.`);

    // MITRAL
    const mitralDet = [];
    if(data.mitralAspecto !== 'normal') mitralDet.push(data.mitralAspecto.replace(/_/g, ' '));
    if(data.mitralEspessura !== 'normal') mitralDet.push(`espessura: ${data.mitralEspessura.replace(/_/g, ' ')}`);
    if(data.mitralMobilidade !== 'normal') mitralDet.push(`mobilidade: ${data.mitralMobilidade.replace(/_/g, ' ')}`);
    if(data.mitralCorda !== 'normal') mitralDet.push(`cordas: ${data.mitralCorda.replace(/_/g, ' ')}`);
    if(data.mitralAnel !== 'normal') mitralDet.push(`anel: ${data.mitralAnel.replace(/_/g, ' ')}`);
    if(data.mitralEstenose !== 'ausente') mitralDet.push(`estenose ${data.mitralEstenose}`);
    if(data.mitralRefluxo !== 'ausente') mitralDet.push(`insuficiência ${data.mitralRefluxo.replace(/_/g, '/')}`);
    comentarios.push(`Valva Mitral: ${mitralDet.length > 0 ? mitralDet.join(', ') : 'Morfologia e dinâmica normais'}.`);

    // TRICÚSPIDE
    const triDet = [];
    if(data.triAspecto !== 'normal') triDet.push(data.triAspecto.replace(/_/g, ' '));
    if(data.triEspessura !== 'normal') triDet.push(`espessura: ${data.triEspessura.replace(/_/g, ' ')}`);
    if(data.triMobilidade !== 'normal') triDet.push(`mobilidade: ${data.triMobilidade.replace(/_/g, ' ')}`);
    if(data.triRefluxo !== 'ausente') triDet.push(`insuficiência ${data.triRefluxo.replace(/_/g, '/')}`);
    if(data.triEstenose === 'severa') triDet.push('estenose severa');
    if(data.psap && data.checkPsap) triDet.push(`PSAP estimada em ${data.psap} mmHg`);
    comentarios.push(`Valva Tricúspide: ${triDet.length > 0 ? triDet.join(', ') : 'Morfologia e dinâmica normais'}.`);

    // PULMONAR
    const pulDet = [];
    if(data.pulAspecto !== 'normal') pulDet.push(data.pulAspecto.replace(/_/g, ' '));
    if(data.pulRefluxo !== 'ausente') pulDet.push(`insuficiência ${data.pulRefluxo}`);
    if(data.pulEstenose !== 'ausente') pulDet.push(`estenose ${data.pulEstenose}`);
    if(data.sinaisHipertensao) pulDet.push('sinais indiretos de hipertensão pulmonar');
    comentarios.push(`Valva Pulmonar e Artéria: ${pulDet.length > 0 ? pulDet.join(', ') : 'Morfologia e dinâmica normais'}.`);

    // CAVA E PERICÁRDIO
    if(data.veiaCava.includes('normal')) comentarios.push('Veia cava inferior com calibre normal e variação respiratória preservada.');
    else if(data.veiaCava !== 'nao_citar') comentarios.push('Veia cava inferior dilatada/alterada.');

    if(data.pericardioDerra === 'sem_derrame') comentarios.push('Ausência de derrame pericárdico.');
    else {
        let periTxt = `Derrame pericárdico ${data.pericardioDerra.replace('_', ' ')}.`;
        if(data.periLoculado) periTxt += ' (Loculado)';
        if(data.periRepercussao === 'com_repercussao') periTxt += ' Com repercussão hemodinâmica.';
        comentarios.push(periTxt);
    }

    if(data.subtipo === 'ECO_STRAIN' && data.strainGls) {
        comentarios.push(`Análise de Strain GLS: ${data.strainGls}%. Deformação ${data.strainConclusao}.`);
    }

    return comentarios;
};

// 3. Conclusão Inteligente
export const gerarConclusaoAutomatica = (data) => {
    let conclusao = [];
    
    if(data.ritmo !== 'Regular' && data.ritmo !== 'Sinusal') conclusao.push(`Ritmo ${data.ritmo}.`);
    if(data.sistolicoReduzidoVe) conclusao.push(`Disfunção sistólica do VE de grau ${data.sistolicoReduzidoVeGrau}.`);
    if(data.diastolica !== 'normal') conclusao.push(`Disfunção diastólica do VE (${data.diastolica.replace(/_/g, ' ')}).`);
    if(data.espessuraVe !== 'normal') conclusao.push(`Hipertrofia ventricular esquerda ${data.espessuraVeTipo.replace(/_/g, ' ')}.`);
    
    if(data.mitralEstenose !== 'ausente') conclusao.push(`Estenose mitral ${data.mitralEstenose}.`);
    if(data.mitralRefluxo !== 'ausente' && data.mitralRefluxo !== 'discreto') conclusao.push(`Insuficiência mitral ${data.mitralRefluxo.replace(/_/g, '/')}.`);
    
    if(data.triEstenose === 'severa') conclusao.push(`Estenose tricúspide severa.`);
    if(data.triRefluxo !== 'ausente' && data.triRefluxo !== 'discreto') conclusao.push(`Insuficiência tricúspide ${data.triRefluxo.replace(/_/g, '/')}.`);
    
    if(data.sinaisHipertensao) conclusao.push('Sinais ecocardiográficos de hipertensão pulmonar.');
    if(data.pericardioDerra !== 'sem_derrame') conclusao.push(`Derrame pericárdico ${data.pericardioDerra.replace('_', ' ')}.`);
    
    if(conclusao.length === 0) conclusao.push('Exame ecocardiográfico dentro dos limites da normalidade.');
    
    return conclusao;
};

// 4. Função Orquestradora Final
export const montarTextoFinal = (data) => {
    const tabelaMedidas = gerarTabelaMedidas(data);
    const listaComentarios = gerarRelatorio(data);
    const listaConclusao = gerarConclusaoAutomatica(data);
    const tituloExame = getTituloExame(data.subtipo);

    // Preview de texto plano (para debug ou clipboard simples)
    let textoPreview = "=== TABELA DE MEDIDAS (Ver PDF) ===\n";
    tabelaMedidas.forEach(m => textoPreview += `${m.estrutura}: ${m.medida}\n`);
    textoPreview += "\n=== COMENTÁRIOS ===\n" + listaComentarios.join('\n');
    textoPreview += "\n\n=== CONCLUSÃO ===\n" + listaConclusao.join('\n');

    return {
        textoPreview,
        dadosEstruturados: {
            ...data,
            tabelaMedidas,
            listaComentarios,
            listaConclusao
        },
        tituloExame
    };
};