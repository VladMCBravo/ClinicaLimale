/**
 * Lógica pura de montagem de texto e tabelas.
 * Atualizado para incluir todos os campos detalhados.
 */

const MAP_TITULOS = {
    'ECO_TRANSTORACICO': 'ECOCARDIOGRAMA TRANSTORÁCICO',
    'ECO_DOPPLER': 'ECOCARDIOGRAMA TRANSTORÁCICO COM DOPPLER COLORIDO',
    'ECO_STRAIN': 'ECOCARDIOGRAMA COM ANÁLISE DE DEFORMAÇÃO (STRAIN)',
};

export const getTituloExame = (subtipo) => MAP_TITULOS[subtipo] || 'ECOCARDIOGRAMA';

// --- HELPER PARA FORMATAR STRINGS ---
const formatString = (str) => str ? str.replace(/_/g, ' ') : '';

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

export const gerarRelatorio = (data) => {
    let comentarios = [];
    
    // 1. TÉCNICA E BIOMETRIA
    if (data.peso || data.altura || data.sc) {
        const bio = [];
        if(data.peso) bio.push(`Peso: ${data.peso} kg`);
        if(data.altura) bio.push(`Altura: ${data.altura} cm`);
        if(data.imc) bio.push(`IMC: ${data.imc} kg/m²`);
        if(data.sc) bio.push(`SC: ${data.sc} m²`);
        comentarios.push(`Dados Biométricos: ${bio.join(' | ')}.`);
    }

    if (data.citarTecnica) {
        let tec = [];
        if(data.tecnicaQualidade === 'boa') tec.push('Exame realizado com boa qualidade técnica.');
        if(data.tecnicaQualidade === 'limitada') tec.push('Exame realizado com janela acústica limitada.');
        
        if(data.localExame === 'leito_uti') tec.push('Exame realizado à beira do leito (UTI).');
        else if(data.localExame === 'leito_enfermaria') tec.push('Exame realizado à beira do leito (Enfermaria).');
        
        if(data.posicaoPaciente !== 'nao_citar') tec.push(`Paciente em ${formatString(data.posicaoPaciente)}.`);
        
        if(tec.length > 0) comentarios.push(tec.join(' '));
    }

    // 2. RITMO E CÂMARAS
    comentarios.push(`Ritmo cardíaco ${data.ritmo.toLowerCase()}.`);
    
    if(data.camaras === 'Normal') {
        comentarios.push('Tamanho normal das câmaras cardíacas.');
    } else if (data.camaras === 'AumentoGlobal') {
        comentarios.push('Aumento global das câmaras cardíacas.');
    } else {
        // Individual
        let camDesc = [];
        if(data.camIndVe !== 'normal') camDesc.push(`VE aumentado (${data.camIndVe})`);
        if(data.camIndVd !== 'normal') camDesc.push(`VD aumentado (${data.camIndVd})`);
        if(data.camIndAe !== 'normal') camDesc.push(`AE aumentado (${data.camIndAe})`);
        if(data.camIndAd !== 'normal') camDesc.push(`AD aumentado (${data.camIndAd})`);
        
        if(camDesc.length > 0) comentarios.push(`Alteração das câmaras: ${camDesc.join(', ')}.`);
        if(data.camDeformidade) comentarios.push('Presença de deformidade geométrica.');
    }

    // 3. ESPESSURA MIOCÁRDICA (Corrigido)
    if (data.espessuraVe === 'normal') {
        comentarios.push('Espessura miocárdica normal do VE.');
    } else if (data.espessuraVe === 'septo_sigmoide') {
        comentarios.push(`Septo interventricular em sigmoide medindo ${data.septoSigmoide || ''} mm.`);
    } else if (data.espessuraVe !== 'nao_citar') {
        // Mapeia hipertrofias
        comentarios.push(formatString(data.espessuraVe) + '.');
    }
    
    if(data.espessuraVd !== 'nao_citar' && data.espessuraVd !== 'normal') {
        if(data.espessuraVd === 'limite') comentarios.push('VD com espessura no limite superior da normalidade.');
        else comentarios.push('Hipertrofia do ventrículo direito.');
    }

    // 4. FUNÇÃO VENTRICULAR
    if(data.sistolicoGlobal === 'normal' && !data.sistolicoReduzidoVe) {
        comentarios.push('Desempenho sistólico biventricular preservado.');
    } else {
        if(data.sistolicoReduzidoVe) comentarios.push(`Função sistólica do VE reduzida (${data.sistolicoReduzidoVeGrau}).`);
        if(data.sistolicoReduzidoVd) comentarios.push(`Função sistólica do VD reduzida (${data.sistolicoReduzidoVdGrau}).`);
    }
    if(data.contratilidadeAlterada) comentarios.push('Alteração da contratilidade segmentar do ventrículo esquerdo.');
    if(data.movAnomaloSepto) comentarios.push('Movimento anômalo do septo interventricular.');

    comentarios.push(`Índices de função diastólica ${data.diastolica === 'normal' ? 'normais' : `alterados (${formatString(data.diastolica)})`}.`);

    // 5. AORTA
    const valvaAortica = [];
    if(data.aortaEstrutura !== 'normal') valvaAortica.push(`estrutura alterada (${data.aortaEstrutura})`);
    if(data.aortaPlacas) valvaAortica.push('placas de ateroma no arco aórtico');
    if(data.aortaAteromatose) valvaAortica.push('ateromatose discreta');
    if(data.aortaDisseccao) valvaAortica.push('sinais sugestivos de dissecção');
    if(data.aortaEctasiaRaiz) valvaAortica.push('ectasia da raiz');
    if(data.aortaEctasiaAsc) valvaAortica.push('ectasia da aorta ascendente');
    if(data.aortaEctasiaArco) valvaAortica.push('ectasia do arco aórtico');
    comentarios.push(`Aorta: ${valvaAortica.length > 0 ? valvaAortica.join(', ') : 'Morfologia e dinâmica normais'}.`);

    // 6. VALVA MITRAL (Corrigido Abertura e Estenose)
    const mitralDet = [];
    if(data.mitralAspecto !== 'normal') mitralDet.push(`aspecto ${formatString(data.mitralAspecto)}`);
    if(data.mitralEspessura !== 'normal') mitralDet.push(`espessura: ${formatString(data.mitralEspessura)}`);
    if(data.mitralMobilidade !== 'normal') mitralDet.push(`mobilidade: ${formatString(data.mitralMobilidade)}`);
    if(data.mitralAbertura !== 'normal') mitralDet.push(`abertura: ${formatString(data.mitralAbertura)}`);
    if(data.mitralCorda !== 'normal') mitralDet.push(`cordas: ${formatString(data.mitralCorda)}`);
    if(data.mitralAnel !== 'normal') mitralDet.push(`anel: ${formatString(data.mitralAnel)}`);
    
    // Estenose
    if(data.mitralEstenose !== 'ausente') {
        let estTxt = `estenose ${data.mitralEstenose}`;
        if(data.mitralEstenose === 'leve' && data.mitralArea) estTxt += ` (Área valvar: ${data.mitralArea} cm²)`;
        mitralDet.push(estTxt);
    }
    
    if(data.mitralRefluxo !== 'ausente') mitralDet.push(`insuficiência ${data.mitralRefluxo.replace(/_/g, '/')}`);
    
    comentarios.push(`Valva Mitral: ${mitralDet.length > 0 ? mitralDet.join(', ') : 'Morfologia e dinâmica normais'}.`);

    // 7. VALVA TRICÚSPIDE
    const triDet = [];
    if(data.triAspecto !== 'normal') triDet.push(formatString(data.triAspecto));
    if(data.triEspessura !== 'normal') triDet.push(`espessura: ${formatString(data.triEspessura)}`);
    if(data.triMobilidade !== 'normal') triDet.push(`mobilidade: ${formatString(data.triMobilidade)}`);
    if(data.triAbertura !== 'normal') triDet.push(`abertura: ${formatString(data.triAbertura)}`);
    if(data.triCorda !== 'normal') triDet.push(`cordas: ${formatString(data.triCorda)}`);
    if(data.triRefluxo !== 'ausente') triDet.push(`insuficiência ${data.triRefluxo.replace(/_/g, '/')}`);
    
    if(data.triEstenose === 'severa') {
        let triEst = 'estenose severa';
        if(data.triSeveraArea) triEst += ` (Área: ${data.triSeveraArea} cm²)`;
        triDet.push(triEst);
    }
    comentarios.push(`Valva Tricúspide: ${triDet.length > 0 ? triDet.join(', ') : 'Morfologia e dinâmica normais'}.`);

    // 8. ARTÉRIA E VALVA PULMONAR (Corrigido)
    const pulDet = [];
    // Artéria
    if(data.artPulmonar === 'ectasia') pulDet.push('ectasia da artéria pulmonar');
    if(data.artPulmonar === 'dificil') pulDet.push('artéria pulmonar de difícil visibilização');
    
    // Valva
    if(data.pulAspecto !== 'normal') pulDet.push(`valva: ${formatString(data.pulAspecto)}`);
    if(data.pulRefluxo !== 'ausente') pulDet.push(`insuficiência ${data.pulRefluxo}`);
    
    if(data.pulEstenose !== 'ausente') {
        let pulEst = `estenose ${data.pulEstenose}`;
        if(data.pulPicoVel) pulEst += ` (Vmáx: ${data.pulPicoVel} m/s`;
        if(data.pulPicoGrad) pulEst += `, Grad: ${data.pulPicoGrad} mmHg)`; else pulEst += ')';
        pulDet.push(pulEst);
    }
    
    // Pressões
    let pressoes = [];
    if(data.sinaisHipertensao) pressoes.push('sinais indiretos de hipertensão pulmonar');
    if(data.checkPsap && data.psap) pressoes.push(`PSAP estimada em ${data.psap} mmHg`);
    if(data.checkPmap && data.pmap) pressoes.push(`PMAP estimada em ${data.pmap} mmHg`);
    if(pressoes.length > 0) pulDet.push(pressoes.join(', '));

    comentarios.push(`Valva Pulmonar e Artéria: ${pulDet.length > 0 ? pulDet.join(', ') : 'Morfologia e dinâmica normais'}.`);

    // 9. CAVA
    if(data.veiaCava.includes('normal')) comentarios.push('Veia cava inferior com calibre normal e variação respiratória preservada.');
    else if(data.veiaCava !== 'nao_citar') comentarios.push('Veia cava inferior dilatada/alterada.');

    // 10. PERICÁRDIO
    if(data.pericardioDerra === 'sem_derrame') {
        comentarios.push('Ausência de derrame pericárdico.');
    } else {
        let periTxt = `Derrame pericárdico ${formatString(data.pericardioDerra)}`;
        let caracs = [];
        if(data.periLoculado) caracs.push('loculado');
        if(data.periCircunferencial) caracs.push('circunferencial');
        if(data.periHomogeneo) caracs.push('de conteúdo homogêneo');
        if(data.periHeterogeneo) caracs.push('de conteúdo heterogêneo');
        if(caracs.length > 0) periTxt += ` (${caracs.join(', ')})`;
        periTxt += '.';
        if(data.periRepercussao === 'com_repercussao') periTxt += ' Com repercussão hemodinâmica.';
        comentarios.push(periTxt);
    }

    // 11. STRAIN
    if(data.subtipo === 'ECO_STRAIN' && data.strainGls) {
        let strainTxt = `Análise de Strain Longitudinal Global (GLS): ${data.strainGls}%.`;
        strainTxt += ` Deformação miocárdica global ${data.strainConclusao === 'preservado' ? 'preservada' : 'reduzida'}.`;
        comentarios.push(strainTxt);
    }

    return comentarios;
};

export const gerarConclusaoAutomatica = (data) => {
    let conclusao = [];
    
    if(data.ritmo !== 'Regular' && data.ritmo !== 'Sinusal') conclusao.push(`Ritmo ${data.ritmo}.`);
    if(data.sistolicoReduzidoVe) conclusao.push(`Disfunção sistólica do VE de grau ${data.sistolicoReduzidoVeGrau}.`);
    if(data.diastolica !== 'normal') conclusao.push(`Disfunção diastólica do VE (${formatString(data.diastolica)}).`);
    
    // Hipertrofia na conclusão
    if (data.espessuraVe !== 'normal' && data.espessuraVe !== 'septo_sigmoide' && data.espessuraVe !== 'limite' && data.espessuraVe !== 'nao_citar') {
        conclusao.push(formatString(data.espessuraVe) + ".");
    }

    // Valvopatias Importantes
    if(data.mitralEstenose !== 'ausente') conclusao.push(`Estenose mitral ${data.mitralEstenose}.`);
    if(data.mitralRefluxo !== 'ausente' && data.mitralRefluxo !== 'discreto') conclusao.push(`Insuficiência mitral ${data.mitralRefluxo.replace(/_/g, '/')}.`);
    
    if(data.triEstenose === 'severa') conclusao.push(`Estenose tricúspide severa.`);
    if(data.triRefluxo !== 'ausente' && data.triRefluxo !== 'discreto') conclusao.push(`Insuficiência tricúspide ${data.triRefluxo.replace(/_/g, '/')}.`);
    
    // Pulmonar
    if(data.sinaisHipertensao) conclusao.push('Sinais ecocardiográficos de hipertensão pulmonar.');
    if(data.checkPsap && data.psap > 40) conclusao.push(`Hipertensão pulmonar (PSAP: ${data.psap} mmHg).`);

    // Pericardio
    if(data.pericardioDerra !== 'sem_derrame') {
        let concPeri = `Derrame pericárdico ${formatString(data.pericardioDerra)}.`;
        if(data.periRepercussao === 'com_repercussao') concPeri += ' (Com repercussão).';
        conclusao.push(concPeri);
    }

    if(conclusao.length === 0) conclusao.push('Exame ecocardiográfico dentro dos limites da normalidade.');
    
    return conclusao;
};

export const montarTextoFinal = (data) => {
    const tabelaMedidas = gerarTabelaMedidas(data);
    const listaComentarios = gerarRelatorio(data);
    const listaConclusao = gerarConclusaoAutomatica(data);
    const tituloExame = getTituloExame(data.subtipo);

    let textoPreview = "=== TABELA DE MEDIDAS (Ver PDF) ===\n";
    tabelaMedidas.forEach(m => textoPreview += `${m.estrutura}: ${m.medida}\n`);
    textoPreview += "\n=== COMENTÁRIOS ===\n" + listaComentarios.join('\n');
    textoPreview += "\n\n=== CONCLUSÃO ===\n" + listaConclusao.join('\n');

    return {
        textoPreview,
        dadosEstruturados: { ...data, tabelaMedidas, listaComentarios, listaConclusao },
        tituloExame
    };
};