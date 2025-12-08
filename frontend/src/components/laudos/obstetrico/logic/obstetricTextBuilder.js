import { formatData } from './obstetricCalculations';

// Helper para alinhar Biometria estilo "Tabela" com tabulação visual
const formatBioLine = (label, value, unit = 'mm') => {
    if (!value) return null;
    // Tenta simular o espaçamento da médica. O "\t" não funciona bem em textareas HTML simples,
    // então usamos espaços fixos ou padEnd se a fonte for monoespaçada.
    // Aqui usaremos uma string fixa + valor.
    const spaces = 40 - label.length;
    const dots = " ".repeat(Math.max(0, spaces)); 
    return `${label}${dots}\t${value} ${unit}.`; 
};

export const gerarRelatorioFeto = (d) => {
    let texto = '';
    
    // TÍTULO DO EXAME (Mapeamento)
    const titulos = {
        'OBSTETRICO_INICIAL': 'ULTRASSONOGRAFIA OBSTÉTRICA TRANSVAGINAL',
        'OBSTETRICO_1_TRI': 'ULTRASSOM MORFOLÓGICO FETAL DE PRIMEIRO TRIMESTRE',
        'OBSTETRICO_2_3_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA',
        'OBSTETRICO_DOPPLER': 'ULTRASSONOGRAFIA OBSTÉTRICA COM COLOR DOPPLER',
        'OBSTETRICO_MORFOLOGICO': 'ULTRASSOM MORFOLÓGICO FETAL SEGUNDO TRIMESTRE'
    };
    
    // Se for gemelar, o título é tratado externamente ou concatenado, aqui focamos no corpo.
    // Mas se quiser incluir o título aqui:
    // texto += `${titulos[d.subtipo] || 'ULTRASSONOGRAFIA OBSTÉTRICA'}\n\n`;

    // =========================================================================
    // LÓGICA 1: GESTAÇÃO INICIAL (TRANSVAGINAL / < 12 SEMANAS)
    // =========================================================================
    if (d.subtipo && d.subtipo.includes("INICIAL")) {
        // Datação
        if (d.igDum || d.igBiometria) {
            texto += `IG: compatível com ${d.igDum || d.igBiometria}.\n\n`;
        }
        
        texto += `Bexiga vazia.\n\n`;
        
        texto += `Útero ${d.utero || 'globoso, aumentado de volume'}, de contornos regulares e miométrio ${d.miometrio || 'homogêneo'}.\n\n`;

        texto += `Observa-se na cavidade uterina, saco gestacional de contornos regulares`;
        if (d.resDmsg) texto += ` medindo ${d.resDmsg} mm`;
        
        if (d.embriaoNaoVisualizado) {
            texto += `, sem embrião visualizado no momento (Vesícula vitelina ${d.citarVv ? 'visualizada' : 'não visualizada'}).\n`;
        } else {
            texto += `, contendo no seu interior embrião`;
            if (d.bcf) texto += `, com batimentos cardíacos presentes (${d.bcf} BPM)`;
            if (d.ccn) texto += `, medindo ${d.ccn} mm de CCN`;
            texto += `.\n`;
        }

        texto += `\nAs vilosidades placentárias tem inserção ${d.trofoblasto || 'normal'}.\n`;
        texto += `Não se observa coágulo intra uterino.\n`;
        
        texto += `O orifício interno do colo permanece ${d.coloUterino || 'fechado'}`;
        if (d.comprimentoColo) texto += `, medindo ${d.comprimentoColo} mm`;
        texto += `.\n\n`;

        texto += `Anexos parauterinos ${d.anexos || 'normais'}.\n`;
        
        // Conclusão Inicial
        texto += `\n\nImpressão diagnóstica:\n`;
        texto += `- Gestação tópica de aproximadamente ${d.resIgCcn || d.igDum || '--'} (+/- 5 dias).\n`;
        
        return { texto };
    }

    // =========================================================================
    // LÓGICA 2: GESTAÇÃO 2º/3º TRIMESTRE & MORFOLÓGICO
    // =========================================================================
    
    // 1. DPP e IG
    // Modelo: "DPP: --- (calculada...), compatível com X semanas."
    let dataTexto = `DPP: `;
    if (d.dppDum) dataTexto += `${d.dppDum} (calculada pela DUM)`;
    else dataTexto += `--- (calculada pelo primeiro ultrassom)`;
    
    let igTexto = d.igBiometria || d.igDum;
    if (d.usarExameAnterior && d.igIgCorrigidaCalculada) igTexto = d.igIgCorrigidaCalculada;
    
    texto += `${dataTexto}, compatível com ${igTexto}.\n\n`;

    // 2. Situação e Feto
    texto += `Gestação tópica, feto único.\n`;
    texto += `Situação ${d.situacao}, apresentação ${d.apresentacao} e com dorso ${d.dorso}.\n\n`;

    // 3. Vitalidade e Vísceras (Texto exato da médica)
    texto += `Batimentos cardíacos e movimentos fetais presentes (${d.bcf || '--'} bpm).\n`;
    texto += `Estômago fetal repleto e de conteúdo anecóide.\n`;
    texto += `Bexiga fetal repleta e de conteúdo anecóide.\n\n`;

    // 4. Placenta
    texto += `Placenta de inserção ${d.placentaLocalizacao || 'corporal'}, homogênea, grau ${d.placentaGrau || '0'}, na escala de Grannum e de espessura normal`;
    if (d.placentaEspessura) texto += `, medindo ${d.placentaEspessura} mm`;
    texto += `.\n\n`;

    // 5. Líquido
    texto += `Líquido amniótico em quantidade ${d.liquidoAmniotico ? d.liquidoAmniotico.toLowerCase() : 'normal'} para idade gestacional`;
    if (d.ila) texto += ` (ILA= ${d.ila} mm)`;
    texto += ` (Ref: ${d.ilaRefMin || '-'} - ${d.ilaRefMax || ''}).\n\n`;

    // 6. Biometria (Estilo Tabela)
    texto += `Medidas:\n`;
    const bioLines = [
        formatBioLine('Diâmetro Biparietal', d.dbp),
        formatBioLine('Diâmetro Occipto Frontal', d.dof), // Nome exato dela
        formatBioLine('Circunferência Cefálica', d.cc),
        formatBioLine('Circunferência Abdominal', d.ca),
        formatBioLine('Comprimento do Fêmur', d.femur),
        formatBioLine('Comprimento do Úmero', d.umero),
        // Adicione outros se for morfológico (Cerebelo, etc)
        d.cerebelo ? formatBioLine('Cerebelo', d.cerebelo) : null,
        d.ossonasal ? formatBioLine('Osso nasal', d.ossonasal) : null,
        d.tnMedida ? formatBioLine('Translucência Nucal', d.tnMedida) : null
    ].filter(Boolean);
    
    texto += bioLines.join('\n') + `\n\n`;

    // 7. Doppler (Se houver) - Layout Específico
    if (d.usarDoppler) {
        texto += `ESTUDO DOPPLER\t\t\tÍNDICES DE PULSATILIDADE\n`;
        if (d.acmIP) texto += `Artéria cerebral\t\t\t\t${d.acmIP}\n`;
        if (d.umbIP) texto += `Artéria umbilical\t\t\t\t${d.umbIP}\n`;
        if (d.relacaoCerebroUmbilical) texto += `Relação cerebro/umbilical\t\t${d.relacaoCerebroUmbilical} (n/l maior / igual à 1,0)\n`;
        texto += `\n`;
        
        texto += `ESTUDO DOPPLER\t\t\tÍNDICES DE PULSATILIDADE\n`;
        if (d.utDirIP) texto += `Artéria uterina direita\t\t\t${d.utDirIP}\n`;
        if (d.utEsqIP) texto += `Artéria uterina esquerda\t\t${d.utEsqIP}\n`;
        if (d.utDirIP && d.utEsqIP) {
            const media = ((parseFloat(d.utDirIP.replace(',','.')) + parseFloat(d.utEsqIP.replace(',','.'))) / 2).toFixed(2).replace('.',',');
            texto += `IP médio:\t\t\t\t\t${media}\n`;
        }
        texto += `\n`;
    }

    // 8. Impressão Diagnóstica (Conclusão)
    texto += `Impressão diagnóstica:\n`;
    // Lógica para definir qual IG usar na conclusão
    const igFinal = d.igBiometria || d.igDum || "---"; 
    
    // Bullet points
    if (d.usarDoppler) texto += `- Feto único vivo.\n`; // Ela usa essa frase em exames com Doppler
    texto += `- Biometria fetal compatível com aproximadamente ${igFinal} +/- 14 dias.\n`;
    
    texto += `- Líquido amniótico em quantidade ${d.liquidoAmniotico ? d.liquidoAmniotico.toLowerCase() : 'normal'} para idade gestacional (ILA = ${d.ila || '-'} mm) (Ref: ${d.ilaRefMin || '-'} - ${d.ilaRefMax || ''}).\n`;
    
    if (d.pesoEstimado) {
        texto += `- Peso Fetal ${d.pesoEstimado} gr (+/- 10%) (P10= ${d.pesoP10 || ''}  P90= ${d.pesoP90 || ''}).\n`;
    }
    
    if (d.percentil) texto += `- Percentil ${d.percentil}\n`;
    
    if (d.sexoFetal && d.sexoFetal !== 'NAO_CITAR') {
        texto += `- Sexo: Genitália ${d.sexoFetal.includes('DUB') ? 'indefinida' : 'compatível com'} ${d.sexoFetal}.\n`;
    }

    if (d.usarDoppler) {
        texto += `- Dopplerfluxometria sem anormalidades no presente estudo.\n`;
    }

    // Obs Finais Obrigatórias
    texto += `\n\nObs.:\n`;
    texto += `- Nem todas as alterações que um feto possa vir apresentar após o nascimento, podem ser identificadas pelo exame ultra-sonográfico, devendo-se levar em consideração as limitações técnicas inerentes ao método e a idade gestacional em que o feto foi examinado, bem como a posição do mesmo no momento do exame.\n`;
    
    texto += `\nFavor trazer este exame quando vier realizar o próximo\n`;
    texto += `A imagem diagnóstica não é absoluta, devendo ser interpretada pelo médico assistente em conjunto com o exame físico e demais exames complementares.`;

    return { texto };
};

export const montarTextoFinal = (res) => res.texto;