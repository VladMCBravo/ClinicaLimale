import { formatData } from './obstetricCalculations';

// =============================================================================
// HELPERS DE FORMATAÇÃO
// =============================================================================

const formatBioLine = (label, value, unit = 'mm') => {
    if (!value) return null;
    const spaces = 50 - label.length; 
    const dots = ".".repeat(Math.max(0, spaces)); 
    return `${label} ${dots} ${value} ${unit}.`; 
};

// Helper para listar itens normais
const listarNormais = (itens) => {
    if (!itens || !Array.isArray(itens)) return null;
    const validos = itens.filter(i => i.checked).map(i => i.label);
    if (validos.length === 0) return null;
    if (validos.length === 1) return `Visualizado ${validos[0]} de aspecto normal.`;
    const ultimo = validos.pop();
    return `Visualizados ${validos.join(', ')} e ${ultimo} de aspecto normal.`;
};

// =============================================================================
// TEXTOS FIXOS (DISCLAIMERS)
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
    // 2. SACO GESTACIONAL E VITALIDADE PRECOCE (CORRIGIDO)
    // -------------------------------------------------------------------------
    // Lógica alterada: Se tiver "citarSg" marcado OU for subtipo INICIAL, ele imprime.
    // Isso resolve o problema de não aparecer no exame de 1º Tri.
    if (d.citarSg || (d.subtipo && d.subtipo.includes("INICIAL"))) {
        
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
            
            // Verifica embrião
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
        
        // Trofoblasto (Corrigido para pegar do select da imagem)
        if (d.trofoblasto) {
            texto += `Trofoblasto de inserção ${d.trofoblasto}.\n`;
        }
        
        // Hematoma / Descolamento (Corrigido conforme imagem 3)
        // O checkbox 'sgComDescolamento' ou se tiver medidas preenchidas deve ativar
        if (d.sgComDescolamento || (d.desc1 && d.desc1 > 0)) {
            texto += `Observa-se área de descolamento / hematoma medindo ${d.desc1 || '-'} x ${d.desc2 || '-'} mm.\n`;
        } else if (d.sgSemDescolamento) {
            texto += `Não se observam áreas de descolamento ovular.\n`;
        }
        
        if (d.comprimentoColo) {
            texto += `Colo uterino fechado, medindo ${d.comprimentoColo} mm de comprimento.\n`;
        }
        texto += `Anexos parauterinos sem particularidades.\n`;

        // Se for ESTRITAMENTE INICIAL, encerra aqui. Se for 1º Tri, continua o laudo.
        if (d.subtipo === 'OBSTETRICO_INICIAL') {
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
    }
    // Se não for inicial puro, pula uma linha e continua para o resto do laudo
    texto += '\n';

    // -------------------------------------------------------------------------
    // 3. ESTRUTURA GERAL E ESTÁTICA FETAL
    // -------------------------------------------------------------------------
    // CORREÇÃO: Removida a trava que impedia de mostrar isso no 1º Trimestre
    
    // Gêmeos
    if (d.corionicidade || d.amnionicidade) {
        texto += `Gestação ${d.corionicidade || ''} e ${d.amnionicidade || ''}.\n`;
    }

    if (d.localizacaoFeto) {
        texto += `Feto localizado ${d.localizacaoFeto}.\n`;
    } else if (!d.subtipo.includes("GEMELAR")) {
        texto += `Gestação tópica, feto único.\n`; 
    }

    // Estática (Situação/Apresentação/Dorso)
    // AGORA EXIBE SEMPRE QUE TIVER DADOS PREENCHIDOS
    if (d.situacao && d.apresentacao) {
        texto += `Situação ${d.situacao}, apresentação ${d.apresentacao}`;
        if (d.dorso) texto += ` e dorso ${d.dorso}`;
        texto += `.\n`;
    }
    
    // Placenta e Líquido (Se não for Saco Gestacional puro)
    if (!d.citarSg || d.placentaLocalizacao) {
        if (d.placentaLocalizacao) {
            if (d.subtipo === 'OBSTETRICO_1_TRI') texto += `PLACENTA\n`;
            texto += `Placenta com inserção ${d.placentaLocalizacao}`;
            if (d.placentaGrau) texto += `, grau ${d.placentaGrau} (Grannum)`;
            if (d.placentaEspessura) texto += ` e espessura de ${d.placentaEspessura} mm`;
            texto += `. Não há sinais de descolamento.\n`;
        }

        if (d.liquidoAmniotico) {
            texto += `Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()}. `;
            if (d.mbv) texto += `Maior bolsão vertical medindo ${d.mbv} mm.`;
            else if (d.ila) texto += `Índice de Líquido Amniótico (ILA) de ${d.ila} mm.`;
            texto += `\n`;
        }
    }
    texto += '\n';

    // -------------------------------------------------------------------------
    // 4. AVALIAÇÃO DO COLO UTERINO (VIA ENDOVAGINAL)
    // -------------------------------------------------------------------------
    if ((d.comprimentoColo && !d.citarSg) || d.coloEge || d.coloSludge === 'presente' || d.coloConclusao) {
        texto += `AVALIAÇÃO DO COLO UTERINO (VIA ENDOVAGINAL)\n`;
        if (d.comprimentoColo) texto += `Colo uterino medindo ${d.comprimentoColo} mm de comprimento.\n`;
        if (d.coloEge && d.coloEge !== 'nao_visualizado') texto += `Eco Glandular Endocervical (EGE): ${d.coloEge}.\n`;
        if (d.coloSludge === 'presente') texto += `Presença de sinal do "Sludge".\n`;
        if (d.coloAfunilamento) texto += `Ausência de sinais de afunilamento (funneling).\n`;
        if (d.coloConclusao) texto += `Parecer: ${d.coloConclusao}.\n`;
        texto += `\n`;
    }

    // -------------------------------------------------------------------------
    // 5. MORFOLOGIA (CORRIGIDO PARA LER OS CHECKBOXES DA IMAGEM 2)
    // -------------------------------------------------------------------------
    
    // --> MORFOLÓGICO 1º TRIMESTRE
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `MORFOLOGIA FETAL\n`;
        
        // Verifica se os checkboxes específicos da imagem 2 estão marcados
        if (d.morfCranio || d.morfCerebro) texto += `POLO CEFÁLICO: Contorno craniano íntegro. Plexos coróides simétricos. Foice cerebral presente.\n`;
        
        if (d.morfFace) texto += `FACE: Perfil facial com aspecto adequado para a idade gestacional.\n`;
        
        if (d.morfColuna) texto += `COLUNA VERTEBRAL: Visibilizada em toda sua extensão, com aspecto aparentemente normal.\n`;
        
        if (d.morfTorax || d.morfCoracao) texto += `TÓRAX E CORAÇÃO: Tórax de forma normal. Coração com situs solitus. Visibilizado o corte de 4 câmaras.\n`;
        
        if (d.bcf) texto += `Batimentos cardíacos fetais presentes e rítmicos: ${d.bcf} bpm.\n`;
        
        if (d.morfEstomago || d.morfParedeAbd || d.morfBexiga) texto += `ABDOME: Parede abdominal íntegra. Estômago e bexiga visualizados.\n`;
        
        // CheckUmb
        if (d.checkUmb) texto += `Doppler colorido evidencia duas artérias umbilicais ladeando a bexiga.\n`;
        
        if (d.morfMembros) texto += `MEMBROS: Visualizados 4 membros com 3 segmentos cada, simétricos.\n`;
        
        texto += `\n`;
    }

    // --> MORFOLÓGICO 2º TRIMESTRE
    if (d.subtipo === 'OBSTETRICO_MORFOLOGICO') {
        texto += `ANÁLISE MORFOLÓGICA\n`;
        if (d.morfCranio) texto += `Crânio: Configuração e contornos normais.\n`;
        if (d.morfFace) texto += `Face: Perfil facial normal. Cristalinos visualizados.\n`;
        if (d.morfColuna) texto += `Coluna: Íntegra em toda sua extensão.\n`;
        if (d.morfCoracao) texto += `Coração: Situs solitus. 4 câmaras e Vias de Saída visualizados.\n`;
        if (d.morfEstomago || d.morfRins || d.morfBexiga) texto += `Abdome: Estômago e vesícula biliar à esquerda. Rins tópicos. Bexiga visualizada.\n`;
        if (d.morfMembros) texto += `Membros: Visualizados ossos longos dos 4 membros.\n`;
        texto += `\n`;
    }

    // -------------------------------------------------------------------------
    // 6. BIOMETRIA FETAL
    // -------------------------------------------------------------------------
    const temBiometria = d.dbp || d.cc || d.femur || d.ccn || d.cerebelo || d.tnMedida || d.ossoNasal || d.orbitaInterna || d.compBexiga;

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
            formatBioLine('Osso Nasal', d.ossoNasal), 
            formatBioLine('Distância Biorbitária (Ext)', d.orbitaExterna),
            formatBioLine('Distância Interorbitária (Int)', d.orbitaInterna),
        ].filter(Boolean);
        
        if (!d.ossoNasal && d.ossoNasalPresente) {
            neuroFace.push("Osso Nasal ..................................... Visualizado.");
        }

        const outros = [
            formatBioLine('Comprimento do Pé', d.peMedida),
            formatBioLine('Comprimento da Bexiga', d.compBexiga),
            // Se o colo não foi citado lá em cima no bloco específico, pode aparecer aqui na biometria
            !d.coloConclusao && !d.citarSg ? formatBioLine('Colo Uterino', d.comprimentoColo) : null,
        ].filter(Boolean);

        if (medidasBasicas.length) texto += medidasBasicas.join('\n') + '\n';
        if (neuroFace.length) texto += neuroFace.join('\n') + '\n';
        if (ossosLongos.length) texto += ossosLongos.join('\n') + '\n';
        if (outros.length) texto += outros.join('\n') + '\n';
        
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
        
        if (d.citarTn && d.tnMedida) texto += `Translucência Nucal: ${d.tnMedida} mm.\n`;
        if (d.ossoNasalPresente) texto += `Osso Nasal: Visualizado (Presente).\n`;
        
        if (d.dvOnda || d.dvIP) {
             texto += `Ducto Venoso: `;
             if (d.dvOnda === 'zero') texto += `Onda A Zero (anormal).`;
             else if (d.dvOnda === 'reversa') texto += `Onda A Reversa (anormal).`;
             else texto += `Onda A Positiva (Normal).`;
             if (d.dvIP) texto += ` IP: ${d.dvIP}`;
             texto += `\n`;
        }
        if (d.tricuspide) texto += `Regurgitação Tricúspide: Presente.\n`;

        // Tabela de Risco (Confirmação que está na Imagem 2)
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

    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        // Se tiver CCN, usa. Se não, usa a IG final
        if (d.ccn) {
            texto += `Gestação única com idade gestacional estimada pelo comprimento cabeça-nádegas (CCN) em ${diasParaTextoIG(calcularDiasPeloCCN(d.ccn))}, com variação de +/- 5 dias.\n`;
        } else {
            texto += `Gestação única com idade gestacional compatível com ${igFinal}.\n`;
        }
        
        if (d.riscoT21Corrigido && parseInt(d.riscoT21Corrigido) > 100) {
            texto += `Risco Ajustado para trissomias do 21, 18 e 13: BAIXO RISCO.\n`;
        }
        texto += `Ausência de malformações fetais grosseiras detectáveis ao método nesta idade gestacional.\n`;
    } 
    else {
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
    
    if (d.coloConclusao && d.coloConclusao !== 'Colo uterino ecograficamente preservado') {
        texto += `- ${d.coloConclusao}.\n`;
    }

    if (d.obsAdicionais) texto += `\nObs: ${d.obsAdicionais}\n`;

    return { texto, tituloExame };
};

// =============================================================================
// HELPERS FINAIS (MULTI-FETO)
// =============================================================================

export const montarTextoFinalMultiplo = (resF1, resF2, resF3, qtdFetos, dadosGerais = {}) => {
    let textoFinal = '';
    
    if (resF1 && resF1.tituloExame) {
        const sufixo = (qtdFetos > 1 && !resF1.tituloExame.includes("GEMELAR")) 
                       ? (qtdFetos === 2 ? ' GEMELAR' : ' TRIGEMELAR') 
                       : '';
        textoFinal += `${resF1.tituloExame}${sufixo}\n\n`;
    }

    if (qtdFetos > 1) {
        textoFinal += `Gestação ${qtdFetos === 2 ? 'gemelar' : 'trigemelar'}.\n`;
        if (dadosGerais.corionicidade) {
            textoFinal += `Gestação ${dadosGerais.corionicidade} e ${dadosGerais.amnionicidade || 'diamniótica'}.\n`;
        }
        textoFinal += `\n`;
    }

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

export const montarTextoFinal = (res) => res.texto;