import { formatData } from './obstetricCalculations';

// =============================================================================
// HELPERS (Formatação Visual)
// =============================================================================
const formatBioLine = (label, value, unit = 'mm') => {
    if (!value) return null;
    const spaces = 50 - label.length; 
    const dots = ".".repeat(Math.max(0, spaces)); 
    return `${label} ${dots} ${value} ${unit}.`; 
};

// =============================================================================
// TEXTOS FIXOS (DO RODAPÉ DA MÉDICA)
// =============================================================================
const TEXTO_DISCLAIMER_MORFO_1 = "A sensibilidade da medida da translucência nucal e a avaliação do osso nasal na detecção de cromossomopatias (trissomia 21) é de aproximadamente 90%, quando realizada entre 11 e 14 semanas (CCN de 45 a 84 mm) e de aproximadamente 95% quando associada a marcadores bioquímicos. Para o cálculo do risco de cromossomopatias utilizou-se o programa desenvolvido pela 'Fetal Medicine Foundation' de Londres. O risco corrigido foi calculado com base nos resultados obtidos em mais de 100.000 pacientes submetidas ao exame ultrassonográfico no primeiro trimestre de gestação. Deve-se considerar que os riscos nesta fase da gestação são superiores aos riscos avaliados no segundo e terceiro trimestre de gestação. Cerca de 40% dos fetos com trissomias resultam em abortamento espontâneo.";

const TEXTO_DISCLAIMER_MORFO_2 = "O exame morfológico tem uma sensibilidade de 83,5%, entre a 20ª e a 24ª semana de gestação, na detecção de anomalias estruturais, segundo estudo de F. Gonçalves. (Publicado na Revista da Sociedade Brasileira de Medicina Fetal, abril de 2000).";

// =============================================================================
// GERADOR DE RELATÓRIO (FRASEADO IDÊNTICO AOS PRINTS)
// =============================================================================
export const gerarRelatorioFeto = (d) => {
    let texto = '';
    
    // Título
    const mapTitulos = {
        'OBSTETRICO_INICIAL': 'ULTRASSONOGRAFIA OBSTÉTRICA TRANSVAGINAL (INICIAL)',
        'OBSTETRICO_1_TRI': 'ULTRASSONOGRAFIA MORFOLÓGICA DO I TRIMESTRE', // Ajustado cf. Print
        'OBSTETRICO_2_3_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA',
        'OBSTETRICO_DOPPLER': 'ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLERFLUXOMETRIA',
        'OBSTETRICO_MORFOLOGICO': 'ULTRASSONOGRAFIA MORFOLÓGICA DO 2º TRIMESTRE',
        'OBSTETRICO_3D': 'ULTRASSONOGRAFIA OBSTÉTRICA 3D/4D'
    };
    const tituloExame = mapTitulos[d.subtipo] || 'ULTRASSONOGRAFIA OBSTÉTRICA';
    
    // -------------------------------------------------------------------------
    // 1. DATAÇÃO (Conforme Print 4)
    // -------------------------------------------------------------------------
    if (d.usarDum) {
        if (d.exibirDataDum && d.dum) texto += `Data da última menstruação: ${formatData(d.dum)}\n`;
        if (d.citarDppDum && d.dppDum) {
            texto += `DPP (DUM): ${d.dppDum}`;
            if (d.igDum) texto += `, compatível com ${d.igDum}`;
            texto += `.\n`;
        } else if (d.igDum) {
            texto += `Exame ultrassonográfico realizado com ${d.igDum} de idade gestacional segundo a data da última menstruação.\n`;
        }
    } else if (d.dumDesconhecida) {
        texto += `Data da última menstruação: Desconhecida / Não referida.\n`;
    }

    if (d.usarExameAnterior && d.dataExameAnterior) {
        const dataAnt = formatData(d.dataExameAnterior);
        texto += `Idade gestacional datada pelo ultrassom de ${dataAnt}: ${d.igIgCorrigidaCalculada || '...'}.\n`;
    } 
    
    texto += '\n';

    // -------------------------------------------------------------------------
    // 2. ÚTERO E SACO GESTACIONAL
    // -------------------------------------------------------------------------
    
    // --> FRASE ESPECÍFICA DE ÚTERO 1º TRI (Print 4)
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `ÚTERO\n`;
        texto += `Apresenta-se em AVF com dimensões adequadas para a idade gestacional apresentando contornos e textura normais.\n\n`;
    } 
    else {
        // Frase Padrão para outros exames
        if (d.utero) {
            const uteroTexto = d.utero === 'globoso' ? 'globoso, aumentado de volume' : d.utero;
            texto += `Útero ${uteroTexto}`;
            if (d.miometrio) texto += `, de contornos regulares e miométrio ${d.miometrio}`;
            texto += `.\n`;
        }
    }

    // Bexiga (Se for citar)
    if (d.bexigaMaterna && d.bexigaMaterna !== 'não citar' && d.bexigaMaterna !== 'não visualizada') {
        texto += `Bexiga materna ${d.bexigaMaterna}.\n`;
    }

    // Saco Gestacional (Inicial)
    if (d.citarSg || (d.subtipo && d.subtipo.includes("INICIAL"))) {
        if (d.sgLocalizacao) texto += `Saco gestacional de inserção ${d.sgLocalizacao}, de contornos regulares.\n`;
        if (d.resDmsg) texto += `Diâmetro Médio do Saco Gestacional (DMSG): ${d.resDmsg} mm.\n`;
        
        if (d.embriaoNaoVisualizado) {
            texto += `Vesícula vitelina ${d.citarVv ? 'visualizada' : 'não visualizada'}. Embrião não caracterizado no momento.\n`;
        } else if (d.ccn) {
            texto += `Visualizado embrião medindo ${d.ccn} mm de CCN.\n`;
        }
        
        // Trofoblasto / Descolamento (Inicial)
        if (d.trofoblasto) texto += `As vilosidades placentárias têm inserção ${d.trofoblasto}.\n`;
        
        if (d.sgComDescolamento || (d.desc1 && parseFloat(d.desc1) > 0)) {
            texto += `Observa-se área de descolamento medindo ${d.desc1 || '-'} x ${d.desc2 || '-'} mm.\n`;
        } else if (d.sgSemDescolamento) {
            texto += `Não se observa coágulo intra uterino.\n`;
        }
        
        if (d.sgAbortoIncompleto) {
            texto += `Observa-se na cavidade uterina conteúdo heterogêneo amorfo, compatível com restos ovulares (Abortamento Incompleto).\n`;
        }
    }

    // -------------------------------------------------------------------------
    // 3. PLACENTA E LÍQUIDO (Texto da Médica - Print 4)
    // -------------------------------------------------------------------------
    if (d.placentaLocalizacao && !d.citarSg) {
        if (d.subtipo === 'OBSTETRICO_1_TRI') texto += `PLACENTA\n`;
        texto += `Inserção ${d.placentaLocalizacao}, grau ${d.placentaGrau || '0'} e espessura média normal`;
        if (d.placentaEspessura) texto += ` (${d.placentaEspessura} mm)`;
        texto += `, sem sinais de descolamento.\n`;
    }

    if (d.liquidoAmniotico) {
        texto += `Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()}. `;
        if (d.mbv) {
            texto += `(MBV = ${d.mbv} mm).`;
        } else if (d.ila) {
            texto += `(ILA = ${d.ila} mm)`;
            if (d.ilaRefMin || d.ilaRefMax) texto += ` (Ref: ${d.ilaRefMin || '80'} a ${d.ilaRefMax || '180'} mm)`;
            texto += `.`;
        }
        texto += `\n`;
    }
    texto += '\n';

    // -------------------------------------------------------------------------
    // 4. ESTÁTICA FETAL
    // -------------------------------------------------------------------------
    if (d.situacao && d.apresentacao && d.subtipo !== 'OBSTETRICO_1_TRI') {
        texto += `Situação ${d.situacao}, apresentação ${d.apresentacao}`;
        if (d.dorso) texto += ` e com dorso ${d.dorso}`;
        texto += `.\n\n`;
    }

    // -------------------------------------------------------------------------
    // 5. MORFOLOGIA FETAL (TEXTOS DO PRINT 4 E VÍDEO)
    // -------------------------------------------------------------------------
    
    // --> 1º TRIMESTRE (Cópia exata)
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `MORFOLOGIA FETAL\n`;
        
        texto += `POLO CEFÁLICO\n`;
        if (d.morfCranio || d.morfCerebro) texto += `Contorno craniano de aspecto habitual e plexos coróides simétricos.\n`;
        if (d.morfFace) texto += `Órbitas simétricas e aparentemente regulares.\nPerfil facial com aspecto adequado para a idade gestacional.\n`;
        
        texto += `\nCOLUNA VERTEBRAL\n`;
        if (d.morfColuna) texto += `Coluna vertebral visibilizada com aspecto aparentemente normal para a idade gestacional.\n`;
        
        texto += `\nTÓRAX\n`;
        texto += `Forma normal e contornos regulares. Parede anterior íntegra.\n`;
        if (d.morfCoracao) {
            texto += `Coração de tamanho normal para a idade gestacional com ápice voltado para a esquerda.\n`;
            texto += `Visibilizado o esboço das quatro câmaras cardíacas.\n`;
        }
        if (d.bcf) texto += `Batimentos cardíacos fetais ${d.bcf} bpm.\n`;
        
        texto += `\nABDOME\n`;
        texto += `Parede abdominal íntegra com inserção tópica do cordão umbilical.\n`;
        if (d.morfEstomago) texto += `Estômago com conteúdo líquido, ipsilateral à área cardíaca.\n`;
        if (d.morfBexiga) texto += `Bexiga fetal visibilizada${d.compBexiga ? ' medindo ' + d.compBexiga + ' mm' : ''}.\n`;
        if (d.checkUmb) texto += `Estudo Dopplerfluxométrico evidencia as duas artérias umbilicais.\n`;

        texto += `\nMEMBROS\n`;
        if (d.morfMembros) texto += `Membros superiores e inferiores visibilizados apresentando-se simétricos, sem dismorfismos aparentes, bem posicionados para a idade gestacional.\n`;
        
        texto += `\n`;
    }

    // --> 2º TRIMESTRE / OUTROS
    else if (d.subtipo === 'OBSTETRICO_MORFOLOGICO') {
        texto += `ANÁLISE MORFOLÓGICA\n`;
        if (d.morfCranio) texto += `Polo Cefálico: Estruturas intracranianas (cavum do septo pelúcido, tálamos, ventrículos e cerebelo) com aspecto habitual.\n`;
        if (d.morfFace) texto += `Face: Lábio superior íntegro. Perfil facial normal. Cristalinos visualizados.\n`;
        if (d.morfColuna) texto += `Coluna: Íntegra em toda sua extensão.\n`;
        if (d.morfCoracao) texto += `Coração: Situs solitus. 4 câmaras e Vias de Saída visualizados.\n`;
        if (d.morfEstomago || d.morfRins) texto += `Abdome: Estômago e vesícula biliar à esquerda. Rins tópicos e normais. Bexiga visualizada.\n`;
        if (d.morfMembros) texto += `Membros: Visualizados ossos longos dos 4 membros. Mãos e pés com dedos presentes.\n`;
        texto += `\n`;
    }
    
    // Vitalidade Fetal (Para exames que não são de 1º Tri, onde já está no tórax)
    if (d.subtipo !== 'OBSTETRICO_1_TRI' && (d.bcf || d.movFetal)) {
        if (d.bcf) texto += `Batimentos cardíacos fetais rítmicos: ${d.bcf} bpm.\n`;
        if (d.movFetal) texto += `Movimentação fetal ativa: Presente.\n`;
        texto += `\n`;
    }

    // -------------------------------------------------------------------------
    // 6. BIOMETRIA FETAL (Layout do Print 2)
    // -------------------------------------------------------------------------
    const temBiometria = d.dbp || d.cc || d.femur || d.ccn || d.tnMedida;

    if (temBiometria) {
        texto += `BIOMETRIA FETAL\n`;
        const bios = [
            formatBioLine('Comprimento cabeça-nádegas (CCN)', d.ccn),
            formatBioLine('Diâmetro biparietal (DBP)', d.dbp),
            formatBioLine('Diâmetro occipitofrontal (DOF)', d.dof),
            formatBioLine('Circunferência cefálica (CC)', d.cc),
            formatBioLine('Circunferência abdominal (CA)', d.ca),
            formatBioLine('Comprimento do fêmur (CF)', d.femur),
            formatBioLine('Comprimento do úmero', d.umero),
            formatBioLine('Comprimento da tíbia', d.tibia),
            formatBioLine('Comprimento da fíbula', d.fibula),
            formatBioLine('Comprimento do rádio', d.radio),
            formatBioLine('Comprimento da ulna', d.ulna),
        ].filter(Boolean);
        
        texto += bios.join('\n') + '\n\n';
    }

    // -------------------------------------------------------------------------
    // 7. RASTREAMENTO 1º TRI (Especificidades do Print 2)
    // -------------------------------------------------------------------------
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `RASTREAMENTO MORFOLÓGICO DE I TRIMESTRE\n`;
        
        if (d.dum) texto += `Data de nascimento estimada (DUM): ${formatData(new Date(new Date(d.dum).setDate(new Date(d.dum).getDate() + 280)).toISOString().split('T')[0])}.\n`; // Aproximado, ideal usar lib de data
        
        if (d.citarTn && d.tnMedida) texto += `Translucência Nucal: ${d.tnMedida} mm.\n`;
        
        if (d.ossoNasalPresente) texto += `Osso Nasal: presente.\n`;
        
        if (d.dvOnda || d.dvIP) {
             let ondaTexto = 'positiva (normal)';
             if (d.dvOnda === 'zero') ondaTexto = 'zero (anormal)';
             if (d.dvOnda === 'reversa') ondaTexto = 'reversa (anormal)';
             texto += `Dopplervelocimetria do Ducto Venoso: onda A ${ondaTexto}. IP: ${d.dvIP || '-'}\n`;
        }
        
        if (d.morfCerebro) texto += `Translucência intracraniana: visível.\n`;

        // Tabela de Risco (Gera o texto para o PDF converter em tabela)
        if (d.riscoT21Basal) {
            texto += `\nCÁLCULO DE RISCO (1:X)\n`;
            texto += `T21: Basal 1/${d.riscoT21Basal} | Corrigido 1/${d.riscoT21Corrigido}\n`;
            texto += `T18: Basal 1/${d.riscoT18Basal} | Corrigido 1/${d.riscoT18Corrigido}\n`;
            texto += `T13: Basal 1/${d.riscoT13Basal} | Corrigido 1/${d.riscoT13Corrigido}\n\n`;
        }
    }

    // -------------------------------------------------------------------------
    // 8. DOPPLER (Geral)
    // -------------------------------------------------------------------------
    if (d.usarDoppler) {
        texto += `ESTUDO DOPPLERFLUXOMÉTRICO\n`;
        if (d.utDirIP || d.utEsqIP) {
            texto += `Artérias Uterinas: Direita IP ${d.utDirIP || '-'} / Esquerda IP ${d.utEsqIP || '-'}.\n`;
            if (d.utDirIncisura || d.utEsqIncisura) texto += `Incisura protodiastólica presente.\n`;
        }
        if (d.umbIP) texto += `Artéria Umbilical: IP ${d.umbIP}. Diástole presente.\n`;
        if (d.acmIP) texto += `Artéria Cerebral Média: IP ${d.acmIP}.\n`;
        if (d.relacaoCerebroUmbilical) texto += `Relação C/U: ${d.relacaoCerebroUmbilical}.\n`;
        texto += `\n`;
    }

    // -------------------------------------------------------------------------
    // 9. CONCLUSÃO (Idêntica ao Print da Conclusão)
    // -------------------------------------------------------------------------
    texto += `CONCLUSÃO\n`;
    let igFinal = d.igBiometria || d.igDum || "---";
    if (d.usarExameAnterior && d.igIgCorrigidaCalculada) igFinal = d.igIgCorrigidaCalculada;

    // Caso Aborto
    if (d.sgAbortoIncompleto) {
        texto += `Quadro compatível com Abortamento Incompleto.\n`;
    }
    // Caso 1º Trimestre (Texto Exato)
    else if (d.subtipo === 'OBSTETRICO_1_TRI') {
        if (d.ccn) {
            texto += `Feto único com idade gestacional estimada pelo comprimento cabeça-nádegas (CCN), de ${diasParaTextoIG(calcularDiasPeloCCN(d.ccn))}, com variação de 5 dias.\n`;
        } else {
            texto += `Feto único com idade gestacional compatível com ${igFinal}.\n`;
        }
        
        texto += `Os marcadores de cromossomopatias do 1º trimestre reduziram o risco inicial baseado na idade materna.\n`;
        texto += `Não foram encontradas anomalias nas estruturas fetais observadas no presente exame.\n`;
    } 
    // Caso Padrão
    else {
        texto += `- Gestação tópica, feto único vivo.\n`;
        texto += `- Biometria fetal compatível com ${igFinal}.\n`;
        if (d.pesoEstimado || d.pesoFetal) texto += `- Peso fetal estimado: ${d.pesoEstimado || d.pesoFetal} g.\n`;
        if (d.subtipo === 'OBSTETRICO_MORFOLOGICO') texto += `- Exame morfológico sem evidências de anomalias estruturais.\n`;
    }
    
    if (d.sugereGolfBall) texto += `- Foco hiperecogênico (Golf Ball) em VE. Sugere-se controle.\n`;
    if (d.obsAdicionais) texto += `\nObs: ${d.obsAdicionais}\n`;

    return { texto, tituloExame };
};

// =============================================================================
// HELPERS FINAIS
// =============================================================================
export const montarTextoFinalMultiplo = (resF1, resF2, resF3, qtdFetos, dadosGerais = {}) => {
    let textoFinal = '';
    
    if (resF1 && resF1.tituloExame) {
        const sufixo = (qtdFetos > 1 && !resF1.tituloExame.includes("GEMELAR")) ? ' GEMELAR' : '';
        textoFinal += `${resF1.tituloExame}${sufixo}\n\n`;
    }
    if (qtdFetos > 1) {
        textoFinal += `Gestação múltipla.\n`;
        if(dadosGerais.corionicidade) textoFinal += `${dadosGerais.corionicidade} / ${dadosGerais.amnionicidade}.\n\n`;
    }

    if (qtdFetos > 1) textoFinal += `--- FETO I ---\n`;
    textoFinal += resF1.texto;
    if (qtdFetos >= 2 && resF2) { textoFinal += `\n\n--- FETO II ---\n`; textoFinal += resF2.texto; }
    if (qtdFetos >= 3 && resF3) { textoFinal += `\n\n--- FETO III ---\n`; textoFinal += resF3.texto; }

    // DISCLAIMERS FINAIS (Idêntico ao Print)
    if (dadosGerais.subtipo === 'OBSTETRICO_1_TRI') {
        textoFinal += `\n\n--------------------------------------------------------------\n`;
        textoFinal += TEXTO_DISCLAIMER_MORFO_1;
    } 
    else if (dadosGerais.subtipo === 'OBSTETRICO_MORFOLOGICO') {
        textoFinal += `\n\n--------------------------------------------------------------\n`;
        textoFinal += TEXTO_DISCLAIMER_MORFO_2;
    }

    return textoFinal;
};

export const montarTextoFinal = (res) => res.texto;
const calcularDiasPeloCCN = (ccn) => Math.round(parseFloat(ccn) + 42);
const diasParaTextoIG = (totalDias) => {
    const s = Math.floor(totalDias / 7);
    const d = totalDias % 7;
    return `${s} semanas e ${d} dias`;
};