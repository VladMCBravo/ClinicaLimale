import { formatData } from './obstetricCalculations';

// =============================================================================
// HELPERS GERAIS
// =============================================================================
const formatTab = (label, value, unit = 'mm') => {
    if (!value) return null;
    const spaces = 50 - label.length; 
    const dots = ".".repeat(Math.max(0, spaces)); 
    return `${label} ${dots} ${value} ${unit}.`; 
};

// Gera texto de Doppler se houver dados
const getTextoDoppler = (d) => {
    // Se o exame JÁ É Doppler (subtipo), não duplica.
    if (d.subtipo === 'OBSTETRICO_DOPPLER' || d.subtipo.includes('GEMELAR')) return ''; 
    
    // Se tiver dados preenchidos
    if (d.usarDoppler || d.umbIP || d.acmIP || d.utDirIP) {
        let t = `\nESTUDO DOPPLERFLUXOMÉTRICO ADICIONAL\n`;
        if (d.acmIP) t += `Artéria cerebral média IP: ${d.acmIP}.\n`;
        if (d.umbIP) t += `Artéria umbilical IP: ${d.umbIP}.\n`;
        if (d.relacaoCerebroUmbilical) t += `Relação C/U: ${d.relacaoCerebroUmbilical}.\n`;
        if (d.utDirIP || d.utEsqIP) t += `Artérias Uterinas: Dir ${d.utDirIP||'-'} / Esq ${d.utEsqIP||'-'}.\n`;
        if (d.dvIP) t += `Ducto Venoso IP: ${d.dvIP} (${d.dvOndaAZero?'Onda A Zero': d.dvOndaAReversa?'Onda A Reversa':'Onda A Positiva'}).\n`;
        
        if (d.obsDoppler) t += `Nota: ${d.obsDoppler}\n`;
        return t;
    }
    return '';
};

// Gera texto de 3D se houver
const getTexto3D = (d) => {
    if (!d.usar3D) return '';
    let t = `\nESTUDO 3D/4D\n`;
    t += `Realizada reconstrução tridimensional de superfície (Surface) e/ou multiplanar.\n`;
    t += `Face fetal: ${d.face3D === 'visualizada' ? 'Visualizada e íntegra' : d.face3D}.\n`;
    if (d.obs3D) t += `Obs: ${d.obs3D}\n`;
    return t;
};

// =============================================================================
// GERADOR MESTRE
// =============================================================================
export const gerarRelatorioFeto = (d) => {
    let texto = '';
    let tituloExame = 'ULTRASSONOGRAFIA OBSTÉTRICA';

    // Helper Datação
    const getDataText = () => {
        let dpp = '---';
        let ig = '---';
        if (d.usarDum && d.dppDum) { dpp = d.dppDum; ig = d.igDum; } 
        else if (d.usarExameAnterior && d.dppIgCorrigidaCalculada) { dpp = formatData(d.dppIgCorrigidaCalculada); ig = d.igIgCorrigidaCalculada; } 
        else if (d.dppBiometriaCalculada) { dpp = formatData(d.dppBiometriaCalculada); ig = d.igBiometria; } 
        else if (d.resIgCcn) { ig = d.resIgCcn; }
        return { dpp, ig };
    };
    const { dpp, ig } = getDataText();

    // =========================================================================
    // 1. OBSTÉTRICO INICIAL / TRANSVAGINAL
    // =========================================================================
    if (d.subtipo === 'OBSTETRICO_INICIAL') {
        tituloExame = 'ULTRASSONOGRAFIA OBSTÉTRICA TRANSVAGINAL';
        texto += `${tituloExame}\n\n`;
        texto += `IG: compatível com ${ig}.\n\n`;
        texto += `Bexiga vazia.\n`;
        
        const utero = d.utero || 'globoso, aumentado de volume';
        texto += `Útero ${utero}, de contornos regulares e miométrio homogêneo.\n\n`;

        if (d.sg1) {
            texto += `Observa-se na cavidade uterina, saco gestacional de contornos regulares medindo ${d.resDmsg || '---'} mm, contendo no seu interior embrião, com batimentos cardíacos presentes (${d.bcf || '---'} BPM), medindo ${d.ccn || '---'} mm de CCN.\n`;
        }
        
        texto += `As vilosidades placentárias tem inserção ${d.trofoblasto || 'normal'}.\n`;
        if(!d.sgComDescolamento) texto += `Não se observa coágulo intra uterino.\n`;
        else texto += `Observa-se área de descolamento medindo ${d.desc1} x ${d.desc2} mm.\n`;

        texto += `O orifício interno do colo permanece fechado.\n`;
        if(d.corpoLuteo) texto += `Anexos parauterinos: Corpo lúteo em ovário ${d.corpoLuteo}.\n`;
        else texto += `Anexos parauterinos normais.\n`;

        texto += `\nImpressão diagnóstica:\n`;
        texto += `- Gestação tópica de aproximadamente ${ig} (+/- 5 dias).\n`;
    }

    // =========================================================================
    // 2. MORFOLÓGICO 1º TRIMESTRE (COM PLACENTA E DADOS GERAIS)
    // =========================================================================
    else if (d.subtipo === 'OBSTETRICO_1_TRI') {
        tituloExame = d.qtdFetos > 1 ? 'ULTRASSOM MORFOLÓGICO FETAL GEMELAR DE PRIMEIRO TRIMESTRE' : 'ULTRASSOM MORFOLÓGICO FETAL DE PRIMEIRO TRIMESTRE';
        texto += `${tituloExame}\n\n`;
        texto += `DPP: ${dpp} (calculada pelo primeiro ultrassom), compatível com ${ig}.\n\n`;
        
        const tipoGestacao = d.qtdFetos > 1 ? `gemelar ${d.corionicidade} e ${d.amnionicidade}` : 'de feto único';
        texto += `Gestação tópica ${tipoGestacao}, em situação ${d.situacao || 'variável'}.\n\n`;

        texto += `Análise fetal:\n\nSegmento cefálico\n`;
        if(d.morfCranio) texto += `Crânio de contornos regulares e dimensões normais.\n`;
        if(d.morfCerebro) texto += `Estruturas da linha média presentes e plexo coróide visualizado.\n`;
        if(d.ossoNasalPresente) texto += `Osso nasal presente.\n`;
        
        texto += `\nTórax\nForma e características ecográficas habituais.\nÁrea cardíaca de dimensões e relação com o diâmetro torácico preservados.\n`;
        if(d.bcf) texto += `Batimentos cardíacos presentes e rítmicos (F.C.F = ${d.bcf} bpm).\n`;

        texto += `\nAbdomem\nForma preservada.\n`;
        if(d.morfEstomago) texto += `Estômago repleto e visualizado em sua topografia habitual.\n`;
        if(d.morfBexiga) texto += `Bexiga repleta, de dimensões e aspectos preservados.\n`;

        texto += `\nMembros\nMembros inferiores e superiores visibilizados, sem anormalidades grosseiras.\n`;
        if(d.movFetal) texto += `Movimentação fetal ativa e tônus adequado.\n`;

        texto += `\nBiometria Fetal\n`;
        const bio = [
            formatTab('Comprimento Cabeça-Nádega', d.ccn),
            formatTab('Diâmetro Biparietal', d.dbp),
            formatTab('Diâmetro Occipto Frontal', d.dof),
            formatTab('Circunferência Cefálica', d.cc),
            formatTab('Circunferência Abdominal', d.ca),
            d.compBexiga ? formatTab('Comprimento da Bexiga', d.compBexiga) + ' (valor de Ref. até 7 mm)' : null,
            formatTab('Comprimento do Fêmur', d.femur),
            formatTab('Comprimento do Úmero', d.umero),
            formatTab('Osso próprio do nariz', d.ossoNasal),
            formatTab('Translucência Nucal', d.tnMedida),
        ].filter(Boolean);
        texto += bio.join('\n') + '\n\n';

        if(d.placentaLocalizacao) texto += `Placenta de inserção ${d.placentaLocalizacao}, homogênea, grau ${d.placentaGrau||0}, na escala de Grannum e de espessura normal, medindo ${d.placentaEspessura||'-'} mm.\n\n`;
        if(d.liquidoAmniotico) texto += `Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()} para idade gestacional.\n\n`;
        
        let onda = 'positiva';
        if(d.dvOndaAZero) onda = 'zero';
        if(d.dvOndaAReversa) onda = 'reversa';
        texto += `Ducto Venoso com Onda A ${onda}.\n\n`;

        texto += `Impressão diagnóstica:\n`;
        texto += `- Biometria fetal compatível com ${ig} (+/- 7 dias).\n`;
        if(d.pesoEstimado) texto += `- Peso ${d.pesoEstimado} gramas.\n`;
        
        if (d.riscoT21Basal) {
            texto += `- CALCULO DE RISCO PARA AS TRISSOMIAS\n- SEGUNDO A IDADE MATERNA: ${d.riscoT21Basal}\n- SEGUNDO O EXAME: ${d.riscoT21Corrigido || '---'}\n`;
        }

        if (parseFloat(d.ccn) > 84) {
            texto += `\nSOBRE O CCN:\nObs.: Não foi possível calcular o risco das trissomias devido ao ccn maior que 84 mm, porém osso nasal, prega nucal e ducto venoso encontram-se normais.\n- Sob julgamento clínico seria conveniente um estudo genético (NIPT) devido ao risco menor de 1 em 300.\n`;
        }
    }

    // =========================================================================
    // 3. OBSTÉTRICO 2º/3º TRI (ROTINA)
    // =========================================================================
    else if (d.subtipo === 'OBSTETRICO_2_3_TRI') {
        tituloExame = 'ULTRASSONOGRAFIA OBSTÉTRICA';
        texto += `${tituloExame}\n\nDPP: ${dpp}, compatível com ${ig}.\n\n`;
        texto += `Gestação tópica, feto único.\nSituação ${d.situacao}, apresentação ${d.apresentacao}, dorso ${d.dorso}.\n\n`;
        
        texto += `Batimentos cardíacos e movimentos fetais presentes (${d.bcf} bpm).\n`;
        if(d.estomagoVisualizado) texto += `Estômago fetal repleto e de conteúdo anecóide.\n`;
        if(d.bexigaVisualizada) texto += `Bexiga fetal repleta e de conteúdo anecóide.\n\n`;

        texto += `Placenta de inserção ${d.placentaLocalizacao}, homogênea, grau ${d.placentaGrau||0}, na escala de Grannum e de espessura normal${d.placentaEspessura ? ', medindo '+d.placentaEspessura+' mm' : ''}.\n\n`;
        texto += `Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()} para idade gestacional (ILA= ${d.ila || '-'} mm) (Ref: ${d.ilaRefMin||80} - ${d.ilaRefMax||180}).\n\n`;

        texto += `Medidas:\n`;
        const bio = [
            formatTab('Diâmetro Biparietal', d.dbp),
            formatTab('Diâmetro Occipto Frontal', d.dof),
            formatTab('Circunferência Cefálica', d.cc),
            formatTab('Circunferência Abdominal', d.ca),
            formatTab('Comprimento do Fêmur', d.femur),
            formatTab('Comprimento do Úmero', d.umero)
        ].filter(Boolean);
        texto += bio.join('\n') + '\n\n';

        texto += `Impressão diagnóstica:\n`;
        texto += `- Biometria fetal compatível com aproximadamente ${ig} +/- 14 dias.\n`;
        texto += `- Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()} para idade gestacional.\n`;
        if(d.pesoEstimado) texto += `- Peso Fetal ${d.pesoEstimado} gr (+/- 10%) (P10= ${Math.round(d.pesoEstimado*0.9)} P90= ${Math.round(d.pesoEstimado*1.1)}).\n`;
        if(d.percentil) texto += `- Percentil ${d.percentil}\n`;
        if(d.sexoFetal && d.sexoFetal !== 'NAO_CITAR') texto += `- Sexo: Genitália compatível com ${d.sexoFetal}.\n`;
    }

    // =========================================================================
    // 4. OBSTÉTRICO COM DOPPLER
    // =========================================================================
    else if (d.subtipo === 'OBSTETRICO_DOPPLER') {
        tituloExame = 'ULTRASSONOGRAFIA OBSTÉTRICA COM COLOR DOPPLER';
        texto += `${tituloExame}\n\nDPP: ${dpp}, compatível com ${ig}.\n\n`;
        texto += `Bexiga materna não visualizada.\nGestação tópica, feto único.\nSituação ${d.situacao}, apresentação ${d.apresentacao}, dorso ${d.dorso}.\n\n`;
        
        texto += `Batimentos cardíacos e movimentos fetais presentes (${d.bcf} bpm).\n`;
        texto += `Estômago e Bexiga fetais repletos e de conteúdo anecóide.\n\n`;

        texto += `Placenta ${d.placentaLocalizacao}, grau ${d.placentaGrau}.\n`;
        texto += `Líquido amniótico ${d.liquidoAmniotico} (ILA = ${d.ila || '-'} mm).\n\n`;

        texto += `Medidas:\n`;
        const bio = [
            formatTab('Diâmetro Biparietal', d.dbp),
            formatTab('Diâmetro Occipto Frontal', d.dof),
            formatTab('Circunferência Cefálica', d.cc),
            formatTab('Circunferência Abdominal', d.ca),
            formatTab('Comprimento do Fêmur', d.femur),
            formatTab('Comprimento do Úmero', d.umero)
        ].filter(Boolean);
        texto += bio.join('\n') + '\n\n';

        texto += `ESTUDO DOPPLER\t\t\tÍNDICES DE PULSATILIDADE\n`;
        texto += `Artéria cerebral\t\t\t${d.acmIP || '-'}\n`;
        texto += `Artéria umbilical\t\t\t${d.umbIP || '-'}\n`;
        texto += `Relação cerebro/umbilical\t\t${d.relacaoCerebroUmbilical || '-'} (n/l maior / igual à 1,0)\n\n`;

        texto += `ESTUDO DOPPLER\t\t\tÍNDICES DE PULSATILIDADE\n`;
        texto += `Artéria uterina direita\t\t\t${d.utDirIP || '-'}\n`;
        texto += `Artéria uterina esquerda\t\t${d.utEsqIP || '-'}\n`;
        texto += `IP médio:\t\t\t\t${d.ipMedioUterinas || '-'}\n\n`;

        texto += `Impressão diagnóstica:\n`;
        texto += `- Feto único vivo.\n`;
        texto += `- Biometria fetal compatível com ${ig} +/- 14 dias.\n`;
        texto += `- Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()}.\n`;
        texto += `- Peso Fetal ${d.pesoEstimado} gr.\n`;
        texto += `- Percentil ${d.percentil}.\n`;
        if(d.sexoFetal) texto += `- Sexo: Genitália aparentemente compatível com ${d.sexoFetal}.\n`;
        texto += `- Dopplerfluxometria sem anormalidades no presente estudo.\n`;
    }

    // =========================================================================
    // 5. MORFOLÓGICO 2º TRIMESTRE
    // =========================================================================
    else if (d.subtipo === 'OBSTETRICO_MORFOLOGICO') {
        tituloExame = 'ULTRASSOM MORFOLÓGICO FETAL SEGUNDO TRIMESTRE';
        texto += `${tituloExame}\n\nDPP: ${dpp}, compatível com ${ig}.\n\n`;
        texto += `Gestação tópica de feto único, em situação ${d.situacao}, apresentação ${d.apresentacao} e dorso ${d.dorso}.\n\n`;

        texto += `Análise fetal:\n\nSistema Nervoso Central\n`;
        if(d.morfCranio) texto += `Crânio de contornos regulares e dimensões normais. Tábua óssea aparentemente íntegra.\n`;
        if(d.morfCerebro) texto += `Parênquima encefálico (corpo caloso e talamos) de aspecto preservado. Ventrículos cerebrais não se mostram dilatados. Cerebelo de aspecto preservado.\n`;
        
        texto += `\nFace\nÓrbitas de características preservadas. Perfil facial característico. Nariz, lábio superior e inferior de conformação habitual.\n`;
        texto += `\nColuna vertebral\nCorpos vertebrais íntegros, de ecotextura característica, não se observando anormalidades.\n`;
        
        texto += `\nTórax\nForma e características ecográficas habituais. Área cardíaca normal. Batimentos rítmicos (${d.bcf} bpm). Quatro câmaras cardíacas evidentes e simétricas.\n`;
        
        texto += `\nAbdome\nDiafragma visibilizado. Parede abdominal íntegra. Fígado de ecotextura preservada. Estômago repleto e visualizado. Rins tópicos e normais. Bexiga repleta.\n`;
        texto += `\nMembros\nAparentemente íntegros, identificando mãos e pés bilateralmente. Movimentação fetal ativa.\n\n`;

        texto += `Biometria fetal\n`;
        const bio = [
            formatTab('Diâmetro Biparietal', d.dbp),
            formatTab('Diâmetro Occipto Frontal', d.dof),
            formatTab('Circunferência Cefálica', d.cc),
            formatTab('Cerebelo', d.cerebelo),
            formatTab('Cisterna Magna', d.cisternaMagna),
            formatTab('Prega Nucal', d.pregaNucal),
            formatTab('Ventrículo posterior', d.ventriculoPosterior),
            formatTab('Órbita externa', d.orbitaExterna),
            formatTab('Órbita interna', d.orbitaInterna),
            formatTab('Osso nasal', d.ossoNasal),
            formatTab('Comprimento do Úmero', d.umero),
            formatTab('Comprimento de Ulna', d.ulna),
            formatTab('Comprimento de Rádio', d.radio),
            formatTab('Circunferência Abdominal', d.ca),
            formatTab('Comprimento do Fêmur', d.femur),
            formatTab('Comprimento de Tíbia', d.tibia),
            formatTab('Comprimento de Fíbula', d.fibula),
            formatTab('Comprimento de Pé', d.peMedida)
        ].filter(Boolean);
        texto += bio.join('\n') + '\n\n';

        texto += `Placenta ${d.placentaLocalizacao}, grau ${d.placentaGrau||0}, medindo ${d.placentaEspessura} mm.\n`;
        texto += `Líquido amniótico normal (ILA = ${d.ila || '-'} mm).\n`;
        if(d.cordaoNormal) texto += `Cordão umbilical de aspecto característico, com inserção habitual (3 vasos).\n\n`;

        texto += `Impressão diagnóstica:\n`;
        texto += `- Feto único vivo.\n`;
        texto += `- Biometria fetal compatível com ${ig} +/- 14 dias.\n`;
        texto += `- Peso Fetal ${d.pesoEstimado} gr (+/- 10%).\n`;
        texto += `- Percentil ${d.percentil}.\n`;
        if(d.sexoFetal) texto += `- Sexo: Genitália compatível com ${d.sexoFetal}.\n`;
    }

    // --- INJEÇÃO UNIVERSAL (DOPPLER E 3D EM QUALQUER EXAME) ---
    texto += getTextoDoppler(d);
    texto += getTexto3D(d);

    // --- DISCLAIMERS GERAIS ---
    texto += `\nObs.:\n- Nem todas as alterações que um feto possa vir apresentar após o nascimento, podem ser identificadas pelo exame ultra-sonográfico, devendo-se levar em consideração as limitações técnicas inerentes ao método e a idade gestacional.\n`;
    
    if(d.obsAdicionais) texto += `\nOBSERVAÇÕES ADICIONAIS:\n${d.obsAdicionais}\n`;

    texto += `\nFavor trazer este exame quando vier realizar o próximo.\n`;
    texto += `A imagem diagnóstica não é absoluta, devendo ser interpretada pelo médico assistente em conjunto com o exame físico e demais exames complementares.`;

    // Faxina Final
    texto = texto.replace(/^[ \t]+/gm, ''); 
    texto = texto.replace(/\n{3,}/g, '\n\n'); 
    texto = texto.trim();

    return { texto, tituloExame };
};

// =============================================================================
// FUNÇÃO MULTI-FETO (GEMELAR/TRIGEMELAR)
// =============================================================================
export const montarTextoFinalMultiplo = (resF1, resF2, resF3, qtdFetos, dadosGerais = {}) => {
    let textoFinal = '';
    
    // Título Geral
    if (resF1 && resF1.tituloExame) {
        // Tenta pegar o título do primeiro feto e adaptar para plural
        let base = resF1.tituloExame.replace('FETAL', 'FETAL GEMELAR').replace('ÚNICO', 'GEMELAR');
        if (qtdFetos === 3) base = base.replace('GEMELAR', 'TRIGEMELAR');
        textoFinal += `${base}\n\n`;
    }

    // Dados Comuns
    textoFinal += `DPP: ${resF1.texto.match(/DPP: (.*?),/)?.[1] || '---'}.\n`;
    textoFinal += `Gestação múltipla, ${dadosGerais.corionicidade} e ${dadosGerais.amnionicidade}.\n\n`;

    textoFinal += `Feto I: ${dadosGerais.localizacaoFeto || 'localização habitual'}.\n`;
    // ... (poderia adicionar localização feto II/III se tivesse campo específico) ...
    textoFinal += `\n`;

    // --- LOOP FETOS ---
    const addFeto = (titulo, res) => {
        if (!res) return '';
        // Remove cabeçalho e rodapé do texto individual para limpar
        let t = res.texto
            .replace(/ULTRASSOM.*?\n\n/s, '') // Remove título
            .replace(/DPP:.*?\n\n/s, '')      // Remove DPP
            .replace(/Gestação tópica.*/s, '') // Remove estática (já citada no geral se quiser)
            .replace(/Obs.:\n- Nem todas.*/s, '') // Remove disclaimer final
            .replace(/Favor trazer.*/s, '');
        
        return `${titulo}:\n${t.trim()}\n\n`;
    };

    textoFinal += addFeto('FETO I', resF1);
    if (qtdFetos >= 2) textoFinal += addFeto('FETO II', resF2);
    if (qtdFetos >= 3) textoFinal += addFeto('FETO III', resF3);

    // Disclaimers Finais (Uma vez só)
    textoFinal += `\nObs.:\n- Nem todas as alterações que um feto possa vir apresentar após o nascimento, podem ser identificadas pelo exame ultra-sonográfico.\n`;
    textoFinal += `Favor trazer este exame quando vier realizar o próximo.\n`;
    textoFinal += `A imagem diagnóstica não é absoluta...`;

    return textoFinal;
};