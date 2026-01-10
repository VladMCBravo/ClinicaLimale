import { formatData } from './obstetricCalculations';

// =============================================================================
// HELPERS DE FORMATAÇÃO
// =============================================================================

// Helper para alinhar Biometria (Estilo Tabela com pontinhos)
const formatBioLine = (label, value, unit = 'mm') => {
    if (!value) return null;
    // Ajuste o 50 conforme a largura da fonte/impressão para alinhar perfeito
    const spaces = 50 - label.length; 
    const dots = ".".repeat(Math.max(0, spaces)); 
    return `${label} ${dots} ${value} ${unit}.`; 
};

// Helper para listar itens normais (Morfologia 2º Tri)
// Ex: "Visualizados Estômago, Rins e Bexiga de aspecto normal."
const listarNormais = (itens) => {
    if (!itens || !Array.isArray(itens)) return null;
    const validos = itens.filter(i => i.checked).map(i => i.label);
    
    if (validos.length === 0) return null;
    if (validos.length === 1) return `Visualizado ${validos[0]} de aspecto normal.`;
    
    const ultimo = validos.pop();
    return `Visualizados ${validos.join(', ')} e ${ultimo} de aspecto normal.`;
};

// =============================================================================
// TEXTOS FIXOS (DISCLAIMERS / NOTAS LEGAIS)
// =============================================================================
const TEXTO_DISCLAIMER_MORFO_1 = "A sensibilidade da medida da translucência nucal e a avaliação do osso nasal na detecção de cromossomopatias (trissomia 21) é de aproximadamente 90%, quando realizada entre 11 e 14 semanas (CCN de 45 a 84 mm) e de aproximadamente 95% quando associada a marcadores bioquímicos. Para o cálculo do risco de cromossomopatias utilizou-se o programa desenvolvido pela 'Fetal Medicine Foundation' de Londres. O risco corrigido foi calculado com base nos resultados obtidos em mais de 100.000 pacientes submetidas ao exame ultrassonográfico no primeiro trimestre de gestação. Deve-se considerar que os riscos nesta fase da gestação são superiores aos riscos avaliados no segundo e terceiro trimestre de gestação. Cerca de 40% dos fetos com trissomias resultam em abortamento espontâneo.";

const TEXTO_DISCLAIMER_MORFO_2 = "O ultrassom morfológico tem uma sensibilidade de 83,5%, entre a 20ª e a 24ª semana de gestação, na detecção de anomalias estruturais, segundo estudo de F. Gonçalves (Revista da Sociedade Brasileira de Medicina Fetal, abril de 2000).";

// =============================================================================
// FUNÇÃO PRINCIPAL: GERAR RELATÓRIO
// =============================================================================
export const gerarRelatorioFeto = (d) => {
    let texto = '';
    
    // --- MAPA DE TÍTULOS ---
    const mapTitulos = {
        'OBSTETRICO_INICIAL': 'ULTRASSONOGRAFIA OBSTÉTRICA TRANSVAGINAL (INICIAL)',
        'OBSTETRICO_1_TRI': 'ULTRASSONOGRAFIA MORFOLÓGICA DO 1º TRIMESTRE',
        'OBSTETRICO_2_3_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA',
        'OBSTETRICO_DOPPLER': 'ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLERFLUXOMETRIA',
        'OBSTETRICO_MORFOLOGICO': 'ULTRASSONOGRAFIA MORFOLÓGICA DO 2º TRIMESTRE',
        'OBSTETRICO_3D': 'ULTRASSONOGRAFIA OBSTÉTRICA 3D/4D'
    };

    const tituloExame = mapTitulos[d.subtipo] || 'ULTRASSONOGRAFIA OBSTÉTRICA';
    
    // -------------------------------------------------------------------------
    // 1. DATAÇÃO E IDADE GESTACIONAL
    // -------------------------------------------------------------------------
    if (d.usarDum) {
        if (d.exibirDataDum && d.dum) texto += `Data da última menstruação (DUM): ${formatData(d.dum)}\n`;
        
        if (d.citarDppDum && d.dppDum) {
            texto += `Data provável do parto (DUM): ${d.dppDum}`;
            if (d.igDum) texto += `, compatível com ${d.igDum}`;
            texto += `.\n`;
        } else if (d.igDum) {
            texto += `Exame realizado com ${d.igDum} de idade gestacional (cronológica).\n`;
        }
    } 
    else if (d.dumDesconhecida) {
        texto += `Data da última menstruação: Desconhecida / Não referida.\n`;
    }

    if (d.usarExameAnterior && d.dataExameAnterior) {
        const dataAnt = formatData(d.dataExameAnterior);
        texto += `Idade gestacional datada pelo ultrassom de ${dataAnt}: ${d.igIgCorrigidaCalculada || '...'}.\n`;
    } 
    else if (d.citarDppBiometria && d.dppBiometriaCalculada) {
         texto += `Data provável do parto (Biometria atual): ${d.dppBiometriaCalculada}.\n`;
    }

    texto += '\n';

    // -------------------------------------------------------------------------
    // 2. OBSTÉTRICO INICIAL (TRANSVAGINAL)
    // -------------------------------------------------------------------------
    if (d.subtipo && d.subtipo.includes("INICIAL")) {
        if (d.bexigaMaterna && d.bexigaMaterna !== 'não citar') texto += `Bexiga materna ${d.bexigaMaterna}.\n`;
        
        const uteroTexto = d.utero === 'globoso' ? 'globoso, aumentado de volume' : (d.utero || 'em AVF, de contornos regulares');
        texto += `Útero ${uteroTexto}, com miométrio de textura ${d.miometrio || 'homogênea'}.\n\n`;
        
        if (d.sgAbortoIncompleto) {
            texto += `Observa-se na cavidade uterina conteúdo heterogêneo amorfo, compatível com restos ovulares (Abortamento Incompleto).\n`;
        } 
        else if (d.citarSg) {
            texto += `Observa-se na cavidade uterina, saco gestacional tópico`;
            if (d.sgLocalizacao) texto += `, implantado no ${d.sgLocalizacao}`;
            texto += `, de contornos regulares`;
            if (d.resDmsg) texto += `, medindo ${d.resDmsg} mm (DMSG)`;
            
            if (d.embriaoNaoVisualizado) {
                texto += `.\nVesícula vitelina ${d.citarVv ? 'visualizada' : 'não visualizada'}. Embrião não caracterizado no momento.\n`;
            } else {
                texto += `.\nVisualizado embrião`;
                if (d.ccn) texto += ` medindo ${d.ccn} mm de CCN`;
                
                if (d.bcfIndetectavel) texto += `, com batimentos cardíacos indetectáveis ao Doppler`;
                else if (d.bcf) texto += `, com batimentos cardíacos presentes e rítmicos (${d.bcf} bpm)`;
                texto += `.\n`;
            }
        }
        
        // Trofoblasto / Descolamento
        texto += `Trofoblasto de inserção ${d.trofoblasto || 'normal'}.\n`;
        
        if (d.sgSemDescolamento) texto += `Não se observam áreas de descolamento ovular.\n`;
        else if (d.sgComDescolamento) texto += `Observa-se área de descolamento medindo ${d.desc1 || '-'} x ${d.desc2 || '-'} mm.\n`;
        
        // Colo e Anexos
        texto += `Colo uterino fechado`;
        if (d.comprimentoColo) texto += `, medindo ${d.comprimentoColo} mm de comprimento`;
        texto += `.\n`;
        
        texto += `Anexos parauterinos sem particularidades.\n`;
        
        // CONCLUSÃO DO INICIAL
        texto += `\nIMPRESSÃO DIAGNÓSTICA:\n`;
        let igConclusao = d.resIgCcn || d.resIgSg || d.igDum || "--";
        if(d.usarExameAnterior && d.igIgCorrigidaCalculada) igConclusao = d.igIgCorrigidaCalculada;

        if (d.sgAbortoIncompleto) texto += `- Quadro compatível com Abortamento Incompleto.\n`;
        else if (d.embriaoNaoVisualizado) texto += `- Gestação tópica incipiente. Sugere-se controle evolutivo em 15 dias.\n`;
        else {
            texto += `- Gestação tópica de ${igConclusao} (+/- 5 dias).\n`;
            if (d.bcf) texto += `- Embrião vivo.\n`;
            else if (d.bcfIndetectavel) texto += `- Ausência de vitalidade embrionária no momento do exame.\n`;
        }
        if (d.obsAdicionais) texto += `\nObs: ${d.obsAdicionais}\n`;
        return { texto, tituloExame }; 
    }

    // -------------------------------------------------------------------------
    // 3. ESTRUTURA GERAL (ÚTERO, PLACENTA, MEMBROS) - PARA OUTROS EXAMES
    // -------------------------------------------------------------------------
    
    // Cabeçalho Básico
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `ÚTERO\nApresenta-se em AVF, com dimensões adequadas para a idade gestacional, apresentando contornos regulares e textura miometrial homogênea.\n\n`;
    } else {
        if (d.localizacaoFeto) texto += `Feto em situação ${d.localizacaoFeto}.\n`; // Ex: Longitudinal cefálica
        else texto += `Gestação tópica, feto único.\n`; 
        
        if (d.situacao && d.apresentacao) {
            texto += `Situação ${d.situacao}, apresentação ${d.apresentacao}`;
            if (d.dorso) texto += ` e dorso ${d.dorso}`;
            texto += `.\n`;
        }
    }
    
    // Placenta
    if (d.placentaLocalizacao) {
        if (d.subtipo === 'OBSTETRICO_1_TRI') texto += `PLACENTA\n`;
        texto += `Placenta com inserção ${d.placentaLocalizacao}`;
        if (d.placentaGrau) texto += `, grau ${d.placentaGrau} (Grannum)`;
        if (d.placentaEspessura) texto += ` e espessura de ${d.placentaEspessura} mm`;
        texto += `. Não há sinais de descolamento.\n`;
    }

    // Líquido Amniótico
    if (d.liquidoAmniotico && d.subtipo !== 'OBSTETRICO_1_TRI') {
        texto += `Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()}`;
        if (d.mbv) texto += ` (Maior bolsão vertical = ${d.mbv} mm)`;
        else if (d.ila) texto += ` (ILA = ${d.ila} mm)`;
        texto += `.\n`;
    }
    
    texto += '\n';

    // -------------------------------------------------------------------------
    // 4. MORFOLOGIA FETAL (1º TRIMESTRE)
    // -------------------------------------------------------------------------
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `MORFOLOGIA FETAL\n`;
        
        // Cabeça
        texto += `POLO CEFÁLICO: Contorno craniano íntegro. Plexos coróides simétricos (“sinal da borboleta”). Foice cerebral presente. Tálamos visualizados.\n`;
        
        // Face
        texto += `FACE: Perfil facial com aspecto adequado para a idade gestacional.\n`;

        // Coluna
        texto += `COLUNA VERTEBRAL: Visibilizada em toda sua extensão, com aspecto aparentemente normal.\n`;

        // Tórax / Coração
        texto += `TÓRAX E CORAÇÃO: Tórax de forma normal e contornos regulares. Coração com situs solitus. Visibilizado o corte de 4 câmaras.\n`;
        if (d.bcf) texto += `Batimentos cardíacos fetais presentes e rítmicos: ${d.bcf} bpm.\n`;
        
        // Abdome
        texto += `ABDOME: Parede abdominal íntegra com inserção tópica do cordão umbilical. Estômago e bexiga visualizados.\n`;
        if (d.checkUmb) texto += `Doppler colorido evidencia duas artérias umbilicais ladeando a bexiga.\n`;

        // Membros
        texto += `MEMBROS: Visualizados 4 membros com 3 segmentos cada, simétricos e com motilidade preservada.\n\n`;
    }

    // -------------------------------------------------------------------------
    // 5. MORFOLOGIA FETAL (2º TRIMESTRE)
    // -------------------------------------------------------------------------
    if (d.subtipo === 'OBSTETRICO_MORFOLOGICO') {
        texto += `ANÁLISE MORFOLÓGICA\n`;
        
        // Usando o helper listarNormais se houver lista de itens checados no frontend
        if (d.itensCabeca) texto += `Cabeça: ${listarNormais(d.itensCabeca)}\n`;
        else texto += `Polo Cefálico: Estruturas intracranianas (cavum do septo pelúcido, tálamos, ventrículos e cerebelo) com aspecto habitual.\n`;
        
        texto += `Face: Lábio superior íntegro. Perfil facial normal. Cristalinos visualizados.\n`;
        texto += `Coluna: Íntegra em toda sua extensão (cortes sagital, coronal e transversal).\n`;
        texto += `Tórax: Pulmões de ecotextura homogênea.\n`;
        texto += `Coração: Situs solitus. 4 câmaras, Vias de Saída (VE/VD) e Arco aórtico visualizados. Ritmo regular.\n`;
        texto += `Abdome: Estômago e vesícula biliar à esquerda. Rins tópicos e normais. Bexiga visualizada. Inserção umbilical normal.\n`;
        texto += `Membros: Visualizados ossos longos dos 4 membros. Mãos e pés com dedos presentes.\n\n`;
    }

    // -------------------------------------------------------------------------
    // 6. BIOMETRIA FETAL (TABELA COM PONTINHOS)
    // -------------------------------------------------------------------------
    const temBiometria = d.dbp || d.cc || d.femur || d.ccn || d.cerebelo || d.tnMedida || d.ossoNasal;

    if (temBiometria) {
        texto += `BIOMETRIA E ANATOMIA FETAL\n`;
        
        const medidasBasicas = [
            formatBioLine('Comprimento cabeça-nádegas (CCN)', d.ccn),
            formatBioLine('Diâmetro biparietal (DBP)', d.dbp),
            formatBioLine('Diâmetro occipitofrontal (DOF)', d.dof),
            formatBioLine('Circunferência cefálica (CC)', d.cc),
            formatBioLine('Circunferência abdominal (CA)', d.ca),
        ].filter(Boolean);

        const ossosLongos = [
            formatBioLine('Fêmur', d.femur),
            formatBioLine('Úmero', d.umero),
            formatBioLine('Tíbia', d.tibia),
            formatBioLine('Fíbula', d.fibula),
            formatBioLine('Rádio', d.radio),
            formatBioLine('Ulna', d.ulna),
        ].filter(Boolean);

        const neuroFace = [
            formatBioLine('Translucência Nucal (TN)', d.tnMedida),
            formatBioLine('Prega Nucal', d.pregaNucal),
            formatBioLine('Cerebelo (Transverso)', d.cerebelo),
            formatBioLine('Cisterna Magna', d.cisternaMagna),
            formatBioLine('Ventrículo Lateral (Átrio)', d.ventriculoPosterior),
            formatBioLine('Osso Nasal', d.ossoNasal), // Se tiver medida
            formatBioLine('Distância Biorbitária', d.orbitaExterna),
        ].filter(Boolean);
        
        // Se Osso Nasal foi marcado como presente mas sem medida numérica
        if (!d.ossoNasal && d.ossoNasalPresente) {
            neuroFace.push("Osso Nasal ..................................... Visualizado.");
        }

        const outros = [
            formatBioLine('Comprimento do Pé', d.peMedida),
            formatBioLine('Colo Uterino', d.comprimentoColo),
        ].filter(Boolean);

        // Renderiza os grupos
        if (medidasBasicas.length) texto += medidasBasicas.join('\n') + '\n';
        if (neuroFace.length) texto += neuroFace.join('\n') + '\n';
        if (ossosLongos.length) texto += ossosLongos.join('\n') + '\n';
        if (outros.length) texto += outros.join('\n') + '\n';
        
        // Peso Fetal
        if (d.pesoFetal) {
            texto += `\nEstimativa de Peso Fetal (Hadlock): ${d.pesoFetal} gramas (+/- 15%).\n`;
            if (d.percentil) texto += `Percentil: ${d.percentil}\n`;
        }
        texto += '\n';
    }

    // -------------------------------------------------------------------------
    // 7. RASTREAMENTO MORFOLÓGICO DE 1º TRIMESTRE (RISCO)
    // -------------------------------------------------------------------------
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `RASTREAMENTO DE ANEUPLOIDIAS (11-14 SEMANAS)\n`;
        
        // Marcadores
        if (d.citarTn && d.tnMedida) texto += `Translucência Nucal: ${d.tnMedida} mm.\n`;
        if (d.ossoNasalPresente) texto += `Osso Nasal: Visualizado (Presente).\n`;
        
        if (d.checkDv) {
             texto += `Ducto Venoso: `;
             if (d.dvOndaAZero) texto += `Onda A Zero (anormal).`;
             else if (d.dvOndaAReversa) texto += `Onda A Reversa (anormal).`;
             else texto += `Onda A Positiva (Normal).`;
             if (d.dvIP) texto += ` IP: ${d.dvIP}`;
             texto += `\n`;
        }
        
        if (d.checkTricuspide) {
            texto += `Regurgitação Tricúspide: ${d.tricuspide ? 'Presente' : 'Ausente'}.\n`;
        }

        // Tabela de Risco (Layout dos Prints)
        if (d.riscoT21Basal || d.riscoT21Corrigido) {
            texto += `\nCÁLCULO DE RISCO (Fetal Medicine Foundation)\n`;
            texto += `----------------------------------------------------------------------\n`;
            texto += `                 | TRISSOMIA 21    | TRISSOMIA 18    | TRISSOMIA 13   \n`;
            texto += `----------------------------------------------------------------------\n`;
            texto += `Risco Basal      | 1 / ${d.riscoT21Basal?.padEnd(11) || '---        '} | 1 / ${d.riscoT18Basal?.padEnd(11) || '---        '} | 1 / ${d.riscoT13Basal || '---'}\n`;
            texto += `Risco Corrigido  | 1 / ${d.riscoT21Corrigido?.padEnd(11) || '---        '} | 1 / ${d.riscoT18Corrigido?.padEnd(11) || '---        '} | 1 / ${d.riscoT13Corrigido || '---'}\n`;
            texto += `----------------------------------------------------------------------\n`;
        }
        texto += `\n`;
    }

    // -------------------------------------------------------------------------
    // 8. CONCLUSÃO
    // -------------------------------------------------------------------------
    texto += `CONCLUSÃO\n`;
    
    let igFinal = d.igBiometria || d.igDum || "---";
    if (d.usarExameAnterior && d.igIgCorrigidaCalculada) igFinal = d.igIgCorrigidaCalculada;

    if (d.subtipo === 'OBSTETRICO_1_TRI' && d.ccn) {
        texto += `Gestação única com idade gestacional estimada pelo comprimento cabeça-nádegas (CCN) em ${diasParaTextoIG(calcularDiasPeloCCN(d.ccn))}, com variação de +/- 5 dias.\n`;
        
        // Frase da Médica para Baixo Risco
        if (d.riscoT21Corrigido && parseInt(d.riscoT21Corrigido) > 100) {
            texto += `Risco Ajustado para trissomias do 21, 18 e 13: BAIXO RISCO.\n`;
        }
        texto += `Ausência de malformações fetais grosseiras detectáveis ao método nesta idade gestacional.\n`;
    } 
    else {
        // Conclusão Padrão (2/3 Tri e Morfológico)
        if (d.subtipo.includes("GEMELAR")) texto += `- Gestação múltipla.\n`; 
        else texto += `- Gestação tópica, feto único vivo.\n`;
        
        texto += `- Biometria fetal compatível com ${igFinal}.\n`;
        
        if (d.subtipo === 'OBSTETRICO_DOPPLER') {
            texto += `- Estudo Dopplerfluxométrico dentro dos padrões de normalidade.\n`;
        }
        
        if (d.subtipo === 'OBSTETRICO_MORFOLOGICO') {
            texto += `- Exame morfológico de 2º trimestre sem evidências de anomalias estruturais.\n`;
        }
    }
    
    if (d.sugereGolfBall) texto += `- Nota-se foco hiperecogênico no ventrículo esquerdo (Golf Ball). Sugere-se ecocardiograma fetal a critério clínico.\n`;
    
    if (d.obsAdicionais) texto += `\nObs: ${d.obsAdicionais}\n`;

    return { texto, tituloExame };
};

// =============================================================================
// HELPERS E LÓGICA FINAL
// =============================================================================

export const montarTextoFinalMultiplo = (resF1, resF2, resF3, qtdFetos, dadosGerais = {}) => {
    let textoFinal = '';
    
    // Título Geral
    if (resF1 && resF1.tituloExame) {
        const sufixo = (qtdFetos > 1 && !resF1.tituloExame.includes("GEMELAR")) 
                       ? (qtdFetos === 2 ? ' GEMELAR' : ' TRIGEMELAR') 
                       : '';
        textoFinal += `${resF1.tituloExame}${sufixo}\n\n`;
    }

    if (qtdFetos > 1) {
        textoFinal += `Gestação ${qtdFetos === 2 ? 'gemelar' : 'trigemelar'}.\n\n`;
    }

    // Fetos
    if (qtdFetos > 1) textoFinal += `--- FETO I ---\n`;
    textoFinal += resF1.texto;
    
    if (qtdFetos >= 2 && resF2) { 
        textoFinal += `\n\n--- FETO II ---\n`; 
        textoFinal += resF2.texto; 
    }
    if (qtdFetos >= 3 && resF3) { 
        textoFinal += `\n\n--- FETO III ---\n`; 
        textoFinal += resF3.texto; 
    }

    // Disclaimers de Rodapé
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

const calcularDiasPeloCCN = (ccn) => Math.round(parseFloat(ccn) + 42);

const diasParaTextoIG = (totalDias) => {
    const s = Math.floor(totalDias / 7);
    const d = totalDias % 7;
    return `${s} semanas e ${d} dias`;
};

const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

export const montarTextoFinal = (res) => res.texto;