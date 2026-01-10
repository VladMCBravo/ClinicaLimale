import { formatData } from './obstetricCalculations';

// Helper para alinhar Biometria (Estilo Tabela)
const formatBioLine = (label, value, unit = 'mm') => {
    if (!value) return null;
    const spaces = 45 - label.length; 
    const dots = ".".repeat(Math.max(0, spaces)); 
    return `${label} ${dots} ${value} ${unit}.`; 
};

// Helper para listar itens normais (Morfologia 2º Tri)
const listarNormais = (itens) => {
    const validos = itens.filter(i => i.checked).map(i => i.label);
    if (validos.length === 0) return null;
    if (validos.length === 1) return `Visualizado ${validos[0]} de aspecto normal.`;
    const ultimo = validos.pop();
    return `Visualizados ${validos.join(', ')} e ${ultimo} de aspecto normal.`;
};

// TEXTOS FIXOS (DISCLAIMERS)
const TEXTO_DISCLAIMER_MORFO_1 = "A sensibilidade da medida da translucência nucal e a avaliação do osso nasal na detecção de cromossomopatias (trissomia 21) é de aproximadamente 90%, quando realizada entre 11 e 14 semanas (CCN de 45 a 84 mm) e de aproximadamente 95% quando associada a marcadores bioquímicos. Para o cálculo do risco de cromossomopatias utilizou-se o programa desenvolvido pela 'Fetal Medicine Foundation' de Londres. O risco corrigido foi calculado com base nos resultados obtidos em mais de 100.000 pacientes submetidas ao exame ultrassonográfico no primeiro trimestre de gestação. Deve-se considerar que os riscos nesta fase da gestação são superiores aos riscos avaliados no segundo e terceiro trimestre de gestação. Cerca de 40% dos fetos com trissomias resultam em abortamento espontâneo.";

const TEXTO_DISCLAIMER_MORFO_2 = "US Morfológico tem uma sensibilidade de 83,5%, entre a 20ª e a 24ª semana de gestação, segundo estudo de F. Gonçalves. (Publicado na Revista da Sociedade Brasileira de Medicina Fetal, abril de 2000).";


export const gerarRelatorioFeto = (d) => {
    let texto = '';
    
    // --- MAPA DE TÍTULOS ---
    const mapTitulos = {
        'OBSTETRICO_INICIAL': 'ULTRASSONOGRAFIA OBSTÉTRICA TRANSVAGINAL (INICIAL)',
        'OBSTETRICO_1_TRI': 'ULTRASSONOGRAFIA MORFOLÓGICA DO I TRIMESTRE', // <--- CORRIGIDO
        'OBSTETRICO_2_3_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA',
        'OBSTETRICO_DOPPLER': 'ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLERFLUXOMETRIA',
        'OBSTETRICO_MORFOLOGICO': 'ULTRASSOM MORFOLÓGICO DE 2º TRIMESTRE',
        'OBSTETRICO_3D': 'ULTRASSONOGRAFIA OBSTÉTRICA 3D/4D'
    };

    const tituloExame = mapTitulos[d.subtipo] || 'ULTRASSONOGRAFIA OBSTÉTRICA';
    
    // =========================================================================
    // 1. DATAÇÃO 
    // =========================================================================
    if (d.usarDum) {
        if (d.exibirDataDum && d.dum) texto += `Data da última menstruação: ${formatData(d.dum)}\n`;
        if (d.citarDppDum && d.dppDum) {
            texto += `DPP: ${d.dppDum} (calculada pela DUM)`;
            if (d.igDum) texto += `, compatível com ${d.igDum}`;
            texto += `.\n`;
        } else if (d.igDum) {
            texto += `Exame ultrassonográfico realizado com ${d.igDum} de idade gestacional segundo a data da última menstruação.\n`;
        }
    } 
    else if (d.dumDesconhecida) texto += `Data da última menstruação: Desconhecida / Não referida.\n`;

    if (d.usarExameAnterior && d.dataExameAnterior) {
        const dataAnt = formatData(d.dataExameAnterior);
        texto += `Idade gestacional datada pelo ultrassom de ${dataAnt}: ${d.igIgCorrigidaCalculada || '...'}.\n`;
    } 
    else if (d.citarDppBiometria && d.dppBiometriaCalculada) {
         // Lógica caso use biometria atual
    }

    texto += '\n';

    // =========================================================================
    // 2. INICIAL (TRANSVAGINAL) - MANTIDO IGUAL
    // =========================================================================
    if (d.subtipo && d.subtipo.includes("INICIAL")) {
        // ... (Mantendo lógica do inicial igual) ...
        if (d.bexigaMaterna && d.bexigaMaterna !== 'não citar') texto += `Bexiga materna ${d.bexigaMaterna}.\n`;
        else texto += `Bexiga vazia.\n`;
        
        const uteroTexto = d.utero === 'globoso' ? 'globoso, aumentado de volume' : (d.utero || 'globoso');
        texto += `Útero ${uteroTexto}, de contornos regulares e miométrio ${d.miometrio || 'homogêneo'}.\n\n`;
        
        if (d.sgAbortoIncompleto) {
            texto += `Observa-se na cavidade uterina conteúdo heterogêneo amorfo, compatível com restos ovulares (Abortamento Incompleto).\n`;
        } 
        else if (d.citarSg) {
            texto += `Observa-se na cavidade uterina, saco gestacional`;
            if (d.sgLocalizacao) texto += ` de inserção ${d.sgLocalizacao}`;
            texto += `, de contornos regulares`;
            if (d.resDmsg) texto += ` medindo ${d.resDmsg} mm (DMSG)`;
            else if (d.sg1) texto += ` medindo ${d.sg1} mm`;

            if (d.embriaoNaoVisualizado) {
                texto += `, contendo no seu interior vesícula vitelina ${d.citarVv ? 'visualizada' : 'não visualizada'}, sem embrião caracterizado no momento.\n`;
            } else {
                texto += `, contendo no seu interior embrião`;
                if (d.bcfIndetectavel) texto += `, com batimentos cardíacos indetectáveis`;
                else if (d.bcf) texto += `, com batimentos cardíacos presentes (${d.bcf} BPM)`;
                if (d.ccn) texto += `, medindo ${d.ccn} mm de CCN`;
                texto += `.\n`;
            }
        }
        texto += `As vilosidades placentárias tem inserção ${d.trofoblasto || 'normal'}.\n`;
        if (d.sgSemDescolamento) texto += `Não se observa coágulo intra uterino.\n`;
        else if (d.sgComDescolamento) texto += `Observa-se área de descolamento medindo ${d.desc1 || '-'} x ${d.desc2 || '-'} mm.\n`;
        texto += `O orifício interno do colo permanece fechado`;
        if (d.comprimentoColo) texto += `, medindo ${d.comprimentoColo} mm`;
        texto += `.\n`;
        texto += `Anexos parauterinos normais.\n`;
        texto += `\nIMPRESSÃO DIAGNÓSTICA:\n`;
        let igConclusao = d.resIgCcn || d.resIgSg || d.igDum || "--";
        if(d.usarExameAnterior && d.igIgCorrigidaCalculada) igConclusao = d.igIgCorrigidaCalculada;
        if (d.sgAbortoIncompleto) texto += `- Quadro compatível com Abortamento Incompleto.\n`;
        else if (d.embriaoNaoVisualizado) texto += `- Gestação tópica incipiente de aproximadamente ${igConclusao}.\n`;
        else {
            texto += `- Gestação tópica de aproximadamente ${igConclusao} (+/- 5 dias).\n`;
            if (d.bcf) texto += `- Embrião vivo.\n`;
        }
        if (d.obsAdicionais) texto += `\nObs: ${d.obsAdicionais}\n`;
        return { texto, tituloExame }; 
    }

    // =========================================================================
    // 3. ESTRUTURA GERAL (ÚTERO, PLACENTA, MEMBROS)
    // =========================================================================
    if (d.localizacaoFeto) texto += `Localização: ${d.localizacaoFeto}.\n`;

    // FRASE ÚTERO
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `ÚTERO\nApresenta-se em AVF com dimensões adequadas para a idade gestacional apresentando contornos e textura normais.\n\n`;
    } else {
        if (d.bexigaMaterna && d.bexigaMaterna !== 'não citar') texto += `Bexiga materna ${d.bexigaMaterna}.\n`;
        else if (d.subtipo === 'OBSTETRICO_DOPPLER') texto += `Bexiga materna não visualizada.\n`;
        texto += `Gestação tópica, feto único.\n`;
    }
    
    // PLACENTA
    if (d.placentaLocalizacao) {
        texto += `PLACENTA\nInserção ${d.placentaLocalizacao}, grau ${d.placentaGrau || '0'} e espessura média normal`;
        if (d.placentaEspessura) texto += ` (${d.placentaEspessura} mm)`;
        texto += `, sem sinais de descolamento.\n\n`;
    }

    if (d.subtipo !== 'OBSTETRICO_1_TRI') {
        texto += `Situação ${d.situacao}, apresentação ${d.apresentacao} e com dorso ${d.dorso}.\n`;
        if (d.liquidoAmniotico) {
            texto += `Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()}`;
            if (d.mbv) texto += ` (MBV= ${d.mbv} mm)`;
            else if (d.ila) texto += ` (ILA= ${d.ila} mm)`;
            texto += `.\n\n`;
        }
    }

    // MORFOLOGIA FETAL
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `MORFOLOGIA FETAL\n`;
        texto += `POLO CEFÁLICO\n`;
        const itensCefalico = [];
        if (d.morf1Cerebro) itensCefalico.push("Contorno craniano de aspecto habitual e plexos coróides simétricos.");
        if (d.morf1Globos) itensCefalico.push("Órbitas simétricas e aparentemente regulares.");
        if (d.morf1Face) itensCefalico.push("Perfil facial com aspecto adequado para a idade gestacional.");
        else itensCefalico.push("Perfil facial com aspecto adequado para a idade gestacional.");
        texto += itensCefalico.join('\n') + `\n\n`;

        texto += `COLUNA VERTEBRAL\n`;
        texto += `Coluna vertebral visibilizada com aspecto aparentemente normal para a idade gestacional.\n\n`;

        texto += `TÓRAX\n`;
        texto += `Forma normal e contornos regulares. Parede anterior íntegra.\n`;
        texto += `Coração de tamanho normal para a idade gestacional com ápice voltado para a esquerda.\n`;
        texto += `Visibilizado o esboço das quatro câmaras cardíacas.\n`;
        if (d.bcf) texto += `Batimentos cardíacos fetais ${d.bcf} bpm.\n\n`;
        
        texto += `ABDOME\n`;
        texto += `Parede abdominal íntegra com inserção tópica do cordão umbilical.\n`;
        texto += `Estômago com conteúdo líquido, ipsilateral à área cardíaca.\n`;
        if(d.morf1Rins) texto += `Rins visualizados.\n`; 
        if(d.bexigaVisualizada) texto += `Bexiga fetal visibilizada medindo ${d.compBexiga || '3'} mm.\n`;
        if (d.checkUmb) texto += `Estudo Dopplerfluxométrico evidencia as duas artérias umbilicais.\n\n`;

        texto += `MEMBROS\nMembros superiores e inferiores visibilizados apresentando-se simétricos, sem dismorfismos aparentes, bem posicionados para a idade gestacional.\n\n`;
    }

    // =========================================================================
    // 4. BIOMETRIA FETAL (AQUI ESTAVA O PROBLEMA - CORRIGIDO)
    // =========================================================================
    // Verifica se tem algum dado de biometria para não imprimir título vazio
    const temBiometria = d.dbp || d.cc || d.femur || d.ccn || d.cerebelo || d.tnMedida || d.ossoNasal;

    if (temBiometria) {
        texto += `BIOMETRIA E ANATOMIA FETAL\n`;
        
        // Vamos criar grupos para organizar melhor
        const medidasBasicas = [
            formatBioLine('Comprimento cabeça-nádegas (CCN)', d.ccn),
            formatBioLine('Diâmetro biparietal (DBP)', d.dbp),
            formatBioLine('Diâmetro occipitofrontal (DOF)', d.dof),
            formatBioLine('Circunferência cefálica (CC)', d.cc),
            formatBioLine('Circunferência abdominal (CA)', d.ca),
        ].filter(Boolean);

        const ossosLongos = [
            formatBioLine('Comprimento do fêmur (CF)', d.femur),
            formatBioLine('Comprimento do úmero', d.umero),
            formatBioLine('Comprimento da tíbia', d.tibia),
            formatBioLine('Comprimento da fíbula', d.fibula),
            formatBioLine('Comprimento do rádio', d.radio),
            formatBioLine('Comprimento da ulna', d.ulna),
        ].filter(Boolean);

        const neuroFace = [
            formatBioLine('Translucência Nucal (TN)', d.tnMedida),
            formatBioLine('Prega Nucal', d.pregaNucal),
            formatBioLine('Cerebelo (Transverso)', d.cerebelo),
            formatBioLine('Cisterna Magna', d.cisternaMagna),
            formatBioLine('Ventrículo Lateral (Átrio)', d.ventriculoPosterior),
            formatBioLine('Distância Biorbitária (Externa)', d.orbitaExterna),
            formatBioLine('Distância Interorbitária (Interna)', d.orbitaInterna),
        ].filter(Boolean);

        const outros = [
            formatBioLine('Comprimento do Pé', d.peMedida),
            formatBioLine('Comprimento da Bexiga', d.compBexiga),
        ].filter(Boolean);

        // LÓGICA ESPECIAL PARA OSSO NASAL (Unificando Biometria e Checkbox)
        let linhaOssoNasal = null;
        if (d.ossoNasal) {
            // Se tem medida (Biometria)
            linhaOssoNasal = formatBioLine('Osso Nasal', d.ossoNasal);
        } else if (d.ossoNasalPresente) {
            // Se só tem o checkbox (Morfologia)
            linhaOssoNasal = "Osso Nasal ..................................... Visualizado.";
        }
        if (linhaOssoNasal) neuroFace.push(linhaOssoNasal);

        // Monta o bloco
        if (medidasBasicas.length) texto += medidasBasicas.join('\n') + '\n';
        if (neuroFace.length) texto += neuroFace.join('\n') + '\n';
        if (ossosLongos.length) texto += ossosLongos.join('\n') + '\n';
        if (outros.length) texto += outros.join('\n') + '\n';
        
        texto += '\n';
    }

    // =========================================================================
    // RASTREAMENTO MORFOLÓGICO DE I TRIMESTRE
    // =========================================================================
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `RASTREAMENTO MORFOLÓGICO DE I TRIMESTRE\n`;
        if (d.dum) texto += `Data de nascimento estimada (DUM): ${formatData(addDays(new Date(d.dum), 280).toISOString().split('T')[0])}.\n`;

        if (d.citarTn && d.tnMedida) texto += `Translucência Nucal: ${d.tnMedida} mm.\n`;

        if (d.morf1OssoNasal && d.morf1OssoNasal !== 'não citar') texto += `Osso Nasal: ${d.morf1OssoNasal}.\n`;
        else if (d.ossoNasalPresente) texto += `Osso Nasal: presente.\n`;

        if (d.checkDv) {
             texto += `Dopplervelocimetria do Ducto Venoso: `;
             if (d.dvOndaAZero) texto += `onda A zero (anormal).`;
             else if (d.dvOndaAReversa) texto += `onda A reversa (anormal).`;
             else texto += `onda A positiva (normal).`;
             if (d.dvIP) texto += ` IP: ${d.dvIP}`;
             texto += `\n`;
        }

        if (d.morf1Cerebro) texto += `Translucência intracraniana: visível.\n`;

        // CÁLCULO DE RISCO (AGORA COM A TABELA DA FOTO)
        if (d.riscoT21Basal || d.riscoT21Corrigido) {
            texto += `\nCÁLCULO DE RISCO PARA CROMOSSOMOPATIAS\n`;
            texto += `------------------------------------------------------------------------------------------------\n`;
            texto += `                         | Risco T21       | Risco T18       | Risco T13       \n`;
            texto += `------------------------------------------------------------------------------------------------\n`;
            texto += `Risco Inicial    | 1/${d.riscoT21Basal?.padEnd(10) || '---       '} | 1/${d.riscoT18Basal?.padEnd(10) || '---       '} | 1/${d.riscoT13Basal || '---'}\n`;
            texto += `Risco Corrigido | 1/${d.riscoT21Corrigido?.padEnd(10) || '---       '} | 1/${d.riscoT18Corrigido?.padEnd(10) || '---       '} | 1/${d.riscoT13Corrigido || '---'}\n`;
            texto += `------------------------------------------------------------------------------------------------\n`;
        }
        texto += `\n`;
    }

    // CONCLUSÃO
    texto += `CONCLUSÃO\n`;
    
    let igFinal = d.igBiometria || d.igDum || "---";
    if (d.usarExameAnterior && d.igIgCorrigidaCalculada) igFinal = d.igIgCorrigidaCalculada;

    if (d.subtipo === 'OBSTETRICO_1_TRI' && d.ccn) {
        texto += `Feto único com idade gestacional estimada pelo comprimento cabeça-nádegas (CCN), de ${diasParaTextoIG(calcularDiasPeloCCN(d.ccn))}, com variação de 5 dias.\n`;
        texto += `Os marcadores de cromossomopatias do 1º trimestre reduziram o risco inicial baseado na idade materna.\n`;
        texto += `Não foram encontradas anomalias nas estruturas fetais observadas no presente exame.\n`;
    } else {
        if (d.subtipo.includes("GEMELAR")) texto += `- Gestação múltipla.\n`; 
        else texto += `- Feto único vivo.\n`;
        texto += `- Biometria fetal compatível com aproximadamente ${igFinal}.\n`;
    }
    
    if (d.sugereGolfBall) texto += `- Sugere-se a critério clínico, ecocardiograma (GOLF BALL).\n`;
    if (d.obsAdicionais) texto += `\nObs: ${d.obsAdicionais}\n`;

    return { texto, tituloExame };
};

// =========================================================================
// MONTAGEM FINAL PARA MÚLTIPLOS
// =========================================================================
export const montarTextoFinalMultiplo = (resF1, resF2, resF3, qtdFetos, dadosGerais = {}) => {
    let textoFinal = '';
    
    if (resF1 && resF1.tituloExame) {
        const sufixo = (qtdFetos > 1 && !resF1.tituloExame.includes("GEMELAR")) ? (qtdFetos === 2 ? ' GEMELAR' : ' TRIGEMELAR') : '';
        textoFinal += `${resF1.tituloExame}${sufixo}\n\n`;
    }
    if (qtdFetos > 1) {
        textoFinal += `Gestação ${qtdFetos === 2 ? 'gemelar' : 'trigemelar'}.\n\n`;
    }
    if (qtdFetos > 1) textoFinal += `--- FETO I ---\n`;
    textoFinal += resF1.texto;
    if (qtdFetos >= 2 && resF2) { textoFinal += `\n\n--- FETO II ---\n`; textoFinal += resF2.texto; }
    if (qtdFetos >= 3 && resF3) { textoFinal += `\n\n--- FETO III ---\n`; textoFinal += resF3.texto; }

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

// Helpers
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