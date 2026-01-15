import { formatData } from './obstetricCalculations';

// =============================================================================
// HELPERS
// =============================================================================
const formatBioLine = (label, value, unit = 'mm') => {
    if (!value) return null;
    const spaces = 60 - label.length; 
    const dots = ".".repeat(Math.max(0, spaces)); 
    return `${label} ${dots} ${value} ${unit}.`; 
};

// =============================================================================
// TEXTOS FIXOS / RODAPÉS
// =============================================================================
const TEXTO_RODAPE_PADRAO = `Favor trazer este exame quando vier realizar o próximo.\nA imagem diagnóstica não é absoluta, devendo ser interpretada pelo médico assistente em conjunto com o exame físico e demais exames complementares.`;

const TEXTO_OBS_MORFO_1 = "Obs.: A medida da translucência nucal consiste apenas em teste de rastreio e não um teste diagnóstico, devendo ser realizada entre a 11 e a 14 semanas de gestação. Este exame não substitui a ecocardiografia fetal.";

const TEXTO_OBS_MORFO_2 = "Obs.: Nem todas as alterações que um feto possa vir apresentar após o nascimento, podem ser identificadas pelo exame ultra-sonográfico, devendo-se levar em consideração as limitações técnicas inerentes ao método, posição assumida pelo feto e a idade gestacional. Ressaltamos que a eficácia do exame quando realizado entre 20 e 24 semanas é de 83%, fora deste período existem maiores restrições de diagnóstico. Este exame não substitui a ecocardiografia fetal.";

// =============================================================================
// GERADOR DE RELATÓRIO (FUSÃO TOTAL: FUNCIONALIDADES + ESTILO MÉDICA)
// =============================================================================
export const gerarRelatorioFeto = (d) => {
    let texto = '';
    
    // Identificação dos Tipos de Exame
    const isMorfo1 = d.subtipo === 'OBSTETRICO_1_TRI';
    const isMorfo2 = d.subtipo === 'OBSTETRICO_MORFOLOGICO';
    const isInicial = d.subtipo === 'OBSTETRICO_INICIAL';
    const isStandard = !isMorfo1 && !isMorfo2 && !isInicial; // Obstétrico Padrão / Doppler / 3D

    // --- 1. TÍTULO DO EXAME ---
    const mapTitulos = {
        'OBSTETRICO_INICIAL': 'ULTRASSONOGRAFIA OBSTÉTRICA TRANSVAGINAL (INICIAL)',
        'OBSTETRICO_1_TRI': 'ULTRASSONOGRAFIA MORFOLÓGICA FETAL DE PRIMEIRO TRIMESTRE',
        'OBSTETRICO_2_3_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA',
        'OBSTETRICO_DOPPLER': 'ULTRASSONOGRAFIA OBSTÉTRICA COM COLOR DOPPLER',
        'OBSTETRICO_MORFOLOGICO': 'ULTRASSONOGRAFIA MORFOLÓGICA FETAL SEGUNDO TRIMESTRE',
        'OBSTETRICO_3D': 'ULTRASSONOGRAFIA OBSTÉTRICA 3D/4D'
    };
    const tituloExame = mapTitulos[d.subtipo] || 'ULTRASSONOGRAFIA OBSTÉTRICA';

    // Via de Exame (Importante se citado)
    if (d.viaExame && d.viaExame !== 'não citar') {
        texto += `Exame realizado por via ${d.viaExame}.\n\n`;
    }

    // --- 2. DATAÇÃO (Igual ao modelo: DPP e IG) ---
    // A. DUM
    if (d.usarDum && d.dum) {
        if (d.citarDppDum && d.dppDum) {
             texto += `DPP: ${d.dppDum} (DUM)`;
        } else {
             texto += `DUM: ${formatData(d.dum)}`;
        }
        if (d.igDum) texto += `, compatível com ${d.igDum}`;
        texto += `.\n`;
    } 
    // B. USG Anterior (Prioritário no modelo dela "Calculada pelo primeiro ultrassom")
    else if (d.usarExameAnterior && d.dataExameAnterior) {
        texto += `DPP: --- (calculada pelo primeiro ultrassom), compatível com ${d.igIgCorrigidaCalculada || '...'}.\n`;
    }
    // C. Biometria Atual
    else if (d.citarDppBiometria && d.dppBiometriaCalculada) {
         texto += `DPP: ${d.dppBiometriaCalculada} (Biometria atual), compatível com ${d.igBiometria}.\n`;
    }
    // D. 1º Tri (CCN)
    else if (isMorfo1 && d.resIgCcn) {
         texto += `Idade Gestacional definida pelo CCN: ${d.resIgCcn}.\n`;
    }

    if (d.obsDatacao) texto += `Nota: ${d.obsDatacao}\n`;
    texto += '\n';

    // --- 3. ESTÁTICA E DADOS GERAIS ---
    if (isInicial) {
        texto += `Bexiga vazia.\n`;
        // Útero no Inicial
        if (d.utero) texto += `Útero ${d.utero === 'globoso' ? 'globoso, aumentado de volume, de contornos regulares e miométrio homogêneo' : d.utero}.\n`;
        else texto += `Útero globoso, aumentado de volume, de contornos regulares e miométrio homogêneo.\n`;
        
        if (d.citarNodulo && d.nod1) texto += `Nota-se nódulo miometrial (${d.nodTipo}) medindo ${d.nod1} x ${d.nod2} mm.\n`;

        // Saco Gestacional
        if (d.citarSg || d.subtipo.includes("INICIAL")) {
            texto += `Observa-se na cavidade uterina, saco gestacional de contornos regulares`;
            if(d.sgLocalizacao) texto += ` (${d.sgLocalizacao})`;
            if(d.sg1) texto += ` medindo ${d.sg1} x ${d.sg2} x ${d.sg3} mm (DMSG: ${d.resDmsg} mm)`;
            
            if (d.embriaoNaoVisualizado) {
                 texto += `, vesícula vitelina ${d.citarVv ? 'visualizada' : 'não visualizada'}. Embrião não caracterizado.\n`;
            } else {
                 texto += `, contendo no seu interior embrião, com batimentos cardíacos presentes`;
                 if(d.bcf) texto += ` (${d.bcf} BPM)`;
                 if(d.ccn) texto += `, medindo ${d.ccn} mm de CCN`;
                 texto += `.\n`;
            }

            if(d.trofoblasto) texto += `As vilosidades placentárias tem inserção ${d.trofoblasto}.\n`;
            
            // Hematomas / Descolamentos
            if(d.sgComDescolamento) texto += `OBS: Hematoma subcoriônico medindo ${d.desc1} x ${d.desc2} mm.\n`;
            else texto += `Não se observa coágulo intra uterino.\n`;
        }

        // Anexos (Corpo Lúteo)
        if(d.corpoLuteo && d.corpoLuteo !== 'não citar') {
             texto += `Anexos: Visualizado corpo lúteo em ovário ${d.corpoLuteo}. `;
             if(d.citarMedidasAnexo && d.anx1) texto += `Medindo ${d.anx1} x ${d.anx2} x ${d.anx3} mm.`;
             texto += `\n`;
        }
        texto += `\n`;

    } else {
        // Exames de 2º/3º Tri e Morfológicos
        if (d.bexigaMaterna && d.bexigaMaterna !== 'não citar') {
            texto += `Bexiga materna ${d.bexigaMaterna}.\n`;
        }
        
        texto += `Gestação tópica, feto único.\n`; 
        
        if (d.situacao && d.apresentacao) {
            texto += `Situação ${d.situacao}, apresentação ${d.apresentacao}`;
            if (d.dorso) texto += ` e com dorso ${d.dorso}`;
            texto += `.\n`;
        }

        // Vitalidade
        if (d.bcf) texto += `Batimentos cardíacos e movimentos fetais presentes (${d.bcf} bpm).\n`;
        if (d.degluticao) texto += `Movimentos de deglutição visualizados.\n`;
        
        // Vísceras (Estilo da médica)
        if (d.estomagoVisualizado) texto += `Estômago fetal repleto e de conteúdo anecóide.\n`;
        if (d.bexigaVisualizada) texto += `Bexiga fetal repleta e de conteúdo anecóide.\n`;
        
        texto += `\n`;
    }

    // --- 4. LÓGICA DE ORDEM DAS SEÇÕES (O Pulo do Gato) ---
    // A Médica usa ordens diferentes para Morfológico vs Obstétrico Simples

    if (isStandard) {
        // ROTEIRO OBSTÉTRICO PADRÃO / DOPPLER
        // Ordem: Placenta -> Líquido -> Biometria
        
        // Placenta
        if (d.placentaLocalizacao) {
            texto += `Placenta de inserção ${d.placentaLocalizacao}, homogênea, grau ${d.placentaGrau || '0'}, na escala de Grannum`;
            if (d.placentaEspessura) texto += ` e de espessura normal, medindo ${d.placentaEspessura} mm`;
            texto += `.\n`;
        }
        // Líquido
        if (d.liquidoAmniotico) {
            texto += `Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()}`;
            if (d.ila) texto += ` (ILA = ${d.ila} mm)`;
            if (d.mbv) texto += ` (MBV = ${d.mbv} mm)`;
            texto += `.\n`;
        }
        if(d.obsPlacenta) texto += `Nota: ${d.obsPlacenta}\n`;
        texto += `\n`;

        // Biometria
        texto += renderBiometria(d);
    } 
    else if (isMorfo1) {
        // ROTEIRO MORFOLÓGICO 1º TRI
        // Ordem: Anatomia -> Biometria -> Placenta -> Líquido -> Ducto
        
        texto += `Análise fetal:\n\n`;
        
        // Segmento Cefálico
        texto += `Segmento cefálico\n`;
        if(d.morfCranio) texto += `Crânio de contornos regulares e dimensões normais.\n`;
        if(d.morfCerebro) texto += `Estruturas da linha média presentes e plexo coróide visualizado.\n`;
        texto += `Osso nasal ${d.ossoNasalPresente ? 'presente' : 'ausente/não visualizado'}.\n\n`;

        // Tórax
        texto += `Tórax\n`;
        texto += `Forma e características ecográficas habituais.\n`;
        texto += `Área cardíaca de dimensões e relação com o diâmetro torácico preservados.\n`;
        if(d.bcf) texto += `Batimentos cardíacos presentes e rítmicos (F.C.F = ${d.bcf} bpm).\n\n`;

        // Abdomem
        texto += `Abdomem\n`;
        texto += `Forma preservada.\n`;
        if(d.morfEstomago) texto += `Estômago repleto e visualizado em sua topografia habitual.\n`;
        if(d.morfBexiga) texto += `Bexiga repleta, de dimensões e aspectos preservados.\n\n`;

        // Membros
        texto += `Membros\n`;
        if(d.morfMembros) texto += `Membros inferiores e superiores visibilizados, sem anormalidades grosseiras.\n`;
        texto += `Movimentação fetal ativa e tônus adequado.\n\n`;
        
        if(d.obsMorfologia) texto += `Nota: ${d.obsMorfologia}\n\n`;

        // Biometria
        texto += renderBiometria(d);

        // Placenta e Líquido (No final no Morfo 1)
        if (d.placentaLocalizacao) {
            texto += `Placenta de inserção ${d.placentaLocalizacao}, homogênea, grau ${d.placentaGrau || '0'}, na escala de Grannum`;
            if (d.placentaEspessura) texto += ` e de espessura normal, medindo ${d.placentaEspessura} mm`;
            texto += `.\n\n`;
        }
        if (d.liquidoAmniotico) texto += `Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()}.\n\n`;

        // Ducto Venoso
        if(d.checkDv || d.dvIP) {
             let onda = d.dvOndaAZero ? 'Zero' : (d.dvOndaAReversa ? 'Reversa' : 'positiva');
             texto += `Ducto Venoso com Onda A ${onda}.\n`;
        }
        texto += `\n`;
    }
    else if (isMorfo2) {
        // ROTEIRO MORFOLÓGICO 2º TRI
        // Ordem: SNC -> Face -> Coluna -> Tórax -> Abdome -> Membros -> Biometria -> Placenta -> Cordão
        
        texto += `Análise fetal:\n\n`;

        // SNC
        texto += `Sistema Nervoso Central\n`;
        texto += `Crânio de contornos regulares e dimensões normais. Tábua óssea aparentemente íntegra.\n`;
        texto += `Parênquima encefálico (corpo caloso e talamos) de aspecto preservado.\n`;
        texto += `Ventrículos cerebrais não se mostram dilatados. Cerebelo de aspecto preservado.\n\n`;

        // Face
        texto += `Face\n`;
        texto += `Órbitas de características preservadas. Perfil facial característico.\n`;
        texto += `Nariz, lábio superior e inferior de conformação habitual.\n\n`;

        // Coluna
        texto += `Coluna vertebral (planos sagital, coronal e transversal)\n`;
        texto += `Corpos vertebrais íntegros, de ecotextura característica, não se observando anormalidades.\n\n`;

        // Tórax
        texto += `Tórax\n`;
        texto += `Forma e características ecográficas habituais.\n`;
        texto += `Área cardíaca de dimensões e relação com o diâmetro torácico normais.\n`;
        if(d.morfCoracao) texto += `Quatro câmaras cardíacas evidentes e simétricas.\n\n`;

        // Abdome
        texto += `Abdome\n`;
        texto += `Diafragma visibilizado e aparentemente sem anormalidades no presente estudo.\n`;
        texto += `Parede abdominal íntegra. Fígado de ecotextura preservada.\n`;
        texto += `Estômago repleto e visualizado em sua topografia habitual.\n`;
        texto += `Rins tópicos, de dimensões normais, não se observando dilatações.\n`;
        texto += `Bexiga repleta, de dimensões e aspectos preservados.\n\n`;

        // Membros
        texto += `Membros\n`;
        texto += `Aparentemente íntegros, identificando mãos e pés bilateralmente e em posição habitual.\n`;
        texto += `Movimentação fetal ativa e tonus adequado.\n\n`;

        if(d.obsMorfologia) texto += `Nota: ${d.obsMorfologia}\n\n`;

        // Biometria
        texto += renderBiometria(d);

        // Placenta
        if (d.placentaLocalizacao) {
            texto += `Placenta de inserção ${d.placentaLocalizacao}, homogênea, grau ${d.placentaGrau || '0'}, na escala de Grannum`;
            if (d.placentaEspessura) texto += ` e de espessura normal, medindo ${d.placentaEspessura} mm`;
            texto += `.\n\n`;
        }
        
        // Líquido
        if (d.liquidoAmniotico) {
            texto += `Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()}`;
            if (d.ila) texto += ` (ILA = ${d.ila} mm)`;
            texto += `.\n\n`;
        }

        // Cordão
        if (d.cordaoNormal) {
            texto += `Cordão umbilical de aspecto característico, com inserção habitual, visualizando-se duas artérias e uma veia de calibres preservados.\n\n`;
        }
    }

    // --- 5. COLO UTERINO (Recuperado) ---
    // Inserimos antes do Doppler ou Conclusão
    if (d.comprimentoColo || d.coloEge || d.coloSludge === 'presente' || d.citarColo1Tri) {
        texto += `AVALIAÇÃO DO COLO UTERINO (VIA ENDOVAGINAL)\n`;
        if (d.comprimentoColo) texto += `Comprimento do canal cervical: ${d.comprimentoColo} mm.\n`;
        if (d.coloEge) texto += `Eco Glandular Endocervical: ${d.coloEge === 'presente' ? 'Preservado' : 'Ausente'}.\n`;
        if (d.coloSludge === 'presente') texto += `Sinal do Sludge presente.\n`;
        if (d.coloAfunilamento) texto += `Ausência de afunilamento à manobra de compressão.\n`;
        if (d.coloConclusao) texto += `Parecer: ${d.coloConclusao}.\n`;
        texto += `\n`;
    }

    // --- 6. DOPPLER (Se houver) ---
    if (d.usarDoppler) {
        // Layout da médica: Colunas "ESTUDO DOPPLER" | "ÍNDICES DE PULSATILIDADE"
        texto += `ESTUDO DOPPLER\t\t\tÍNDICES DE PULSATILIDADE\n`;
        
        // Fetal
        if (d.checkAcm || d.acmIP) texto += `Artéria cerebral\t\t\t${d.acmIP || '-'}\n`;
        if (d.checkUmb || d.umbIP) texto += `Artéria umbilical\t\t\t${d.umbIP || '-'}\n`;
        if (d.relacaoCerebroUmbilical) texto += `Relação cerebro/umbilical\t\t${d.relacaoCerebroUmbilical} (n/l maior / igual à 1,0)\n`;
        
        texto += `\n`;

        // Materno
        if (d.checkUtDir || d.checkUtEsq) {
            texto += `Artéria uterina direita\t\t\t${d.utDirIP || '-'}\n`;
            texto += `Artéria uterina esquerda\t\t${d.utEsqIP || '-'}\n`;
            if (d.ipMedioUterinas) texto += `IP médio:\t\t\t\t${d.ipMedioUterinas}\n`;
        }

        if (d.obsDoppler) texto += `\nNota: ${d.obsDoppler}\n`;
        texto += `\n`;
    }

    // --- 7. ESTUDO 3D/4D (Recuperado) ---
    if (d.usar3D) {
        texto += `ESTUDO TRIDIMENSIONAL (3D/4D)\n`;
        
        // Técnica
        const modos = [];
        if (d.modoSurface) modos.push('Surface');
        if (d.modoMultiplanar) modos.push('Multiplanar');
        if (modos.length > 0) texto += `Modos utilizados: ${modos.join(' e ')}.\n`;
        
        if (d.qualidade3D) {
            texto += `Qualidade da imagem: ${d.qualidade3D}`;
            if (d.fatorLimitante) texto += ` (Limitada por: ${d.fatorLimitante})`;
            texto += `.\n`;
        }

        // Morfologia da Face 3D
        if (d.face3D) {
            texto += `Face fetal: ${d.face3D === 'visualizada' ? 'Bem visualizada, nítida' : d.face3D}.\n`;
            const faceParts = [];
            if (d.labios3D) faceParts.push('lábios');
            if (d.nariz3D) faceParts.push('nariz');
            if (d.olhos3D) faceParts.push('olhos');
            if (faceParts.length > 0) texto += `Estruturas identificadas: ${faceParts.join(', ')}.\n`;
        }

        // Comportamento 4D
        const comp = [];
        if (d.movSorriso) comp.push('sorriso');
        if (d.movBocejo) comp.push('bocejo');
        if (d.movPiscar) comp.push('piscar de olhos');
        if (d.movMaoFace) comp.push('mão na face');
        if (d.movSuccao) comp.push('sucção');
        if (comp.length > 0) texto += `Comportamento fetal observado: ${comp.join(', ')}.\n`;

        if (d.obs3D) texto += `Nota 3D: ${d.obs3D}\n`;
        texto += `\n`;
    }

    // --- 8. IMPRESSÃO DIAGNÓSTICA (CONCLUSÃO) ---
    texto += `Impressão diagnóstica:\n`;

    if (d.sgAbortoIncompleto) {
        texto += `- Quadro compatível com Abortamento Incompleto.\n`;
    } 
    else if (isInicial) {
        texto += `- Gestação tópica de aproximadamente ${d.resIgCcn || d.igBiometria || '...'} semanas.\n`;
    }
    else {
        // Frases padrão da médica
        if (!isMorfo1 && !isMorfo2) texto += `- Feto único vivo.\n`; // Só no Obstétrico padrão ela põe isso na conclusão

        let igFinal = d.igBiometria || d.igDum || "---";
        if (d.usarExameAnterior && d.igIgCorrigidaCalculada) igFinal = d.igIgCorrigidaCalculada;
        
        texto += `- Biometria fetal compatível com aproximadamente ${igFinal} +/- ${isMorfo1 ? '7' : '14'} dias.\n`;
        
        if (d.liquidoAmniotico) {
            texto += `- Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()} para idade gestacional`;
            if (d.ila) texto += ` (ILA = ${d.ila} mm)`;
            if (d.mbv) texto += ` (MBV = ${d.mbv} mm)`;
            texto += `.\n`;
        }

        if (d.pesoEstimado) {
             texto += `- Peso Fetal ${d.pesoEstimado} gr (+/- 10%)`;
             if (d.percentil) texto += ` (Percentil ${d.percentil}).`;
             texto += `\n`;
        }
        
        if (d.sexoFetal && d.sexoFetal !== 'NAO_CITAR') {
             let sexo = d.sexoFetal === 'MASCULINO' ? 'Masculino' : 'Feminino';
             texto += `- Sexo: Genitália compatível com ${sexo}.\n`;
        }

        if (d.usarDoppler) texto += `- Dopplerfluxometria sem anormalidades no presente estudo.\n`;
        
        // Risco 1º Tri na Conclusão
        if (isMorfo1 && (d.riscoT21Basal || d.riscoT21Corrigido)) {
            texto += `- CÁLCULO DE RISCO PARA AS TRISSOMIAS:\n`;
            if(d.riscoT21Basal) texto += `  SEGUNDO A IDADE MATERNA: T21 (1/${d.riscoT21Basal}) \n`;
            if(d.riscoT21Corrigido) texto += `  SEGUNDO O EXAME: T21 (1/${d.riscoT21Corrigido}) \n`;
        }
    }

    if (d.obsAdicionais) texto += `\nObs: ${d.obsAdicionais}\n`;

    // --- 9. FAXINA FINAL ---
    texto = texto.replace(/^[ \t]+/gm, ''); 
    texto = texto.replace(/\n{3,}/g, '\n\n'); 
    texto = texto.trim();

    return { texto, tituloExame }; 
};

// =============================================================================
// SUB-FUNÇÃO: RENDERIZAR LISTA DE MEDIDAS (BIOMETRIA)
// =============================================================================
const renderBiometria = (d) => {
    let t = `Medidas:\n`;
    const bios = [
        d.ccn ? formatBioLine('Comprimento Cabeça-Nádega (CCN)', d.ccn) : null,
        formatBioLine('Diâmetro Biparietal', d.dbp),
        formatBioLine('Diâmetro Occipitofrontal', d.dof),
        formatBioLine('Circunferência Cefálica', d.cc),
        formatBioLine('Circunferência Abdominal', d.ca),
        formatBioLine('Comprimento do Fêmur', d.femur),
        formatBioLine('Comprimento do Úmero', d.umero),
        formatBioLine('Comprimento de Tíbia', d.tibia),
        formatBioLine('Comprimento de Fíbula', d.fibula),
        formatBioLine('Comprimento de Rádio', d.radio),
        formatBioLine('Comprimento de Ulna', d.ulna),
        formatBioLine('Comprimento de Pé', d.peMedida),
        d.compBexiga ? formatBioLine('Comprimento da Bexiga', d.compBexiga) : null,
        formatBioLine('Cerebelo', d.cerebelo),
        formatBioLine('Cisterna Magna', d.cisternaMagna),
        formatBioLine('Prega Nucal', d.pregaNucal),
        formatBioLine('Ventrículo posterior', d.ventriculoPosterior),
        formatBioLine('Órbita externa', d.orbitaExterna),
        formatBioLine('Órbita interna', d.orbitaInterna),
        formatBioLine('Osso nasal', d.ossoNasal),
        formatBioLine('Translucência Nucal', d.tnMedida),
    ].filter(Boolean);

    t += bios.join('\n') + '\n\n';
    return t;
};

// =============================================================================
// HELPERS FINAIS (MULTI-FETO & DISCLAIMERS)
// =============================================================================
export const montarTextoFinalMultiplo = (resF1, resF2, resF3, qtdFetos, dadosGerais = {}) => {
    let textoFinal = '';
    
    // Header Geral
    if (resF1 && resF1.tituloExame) {
        const sufixo = (qtdFetos > 1 && !resF1.tituloExame.includes("GEMELAR")) ? ' GEMELAR' : '';
        textoFinal += `${resF1.tituloExame}${sufixo}\n\n`;
    }
    
    // Datação Geral (Puxa do Feto 1, pois DUM é a mesma)
    // A médica coloca DPP logo no topo
    // Vamos extrair a linha de DPP do texto do Feto 1 para não repetir
    const linhasF1 = resF1.texto.split('\n');
    const linhaDPP = linhasF1.find(l => l.startsWith('DPP:') || l.startsWith('DUM:'));
    if(linhaDPP) textoFinal += `${linhaDPP}\n\n`;

    if (qtdFetos > 1) {
        textoFinal += `Gestação múltipla, ${dadosGerais.corionicidade || 'dicoriônica'} e ${dadosGerais.amnionicidade || 'diamniótica'}.\n`;
        if(dadosGerais.localizacaoFeto) textoFinal += `Feto I: ${dadosGerais.localizacaoFeto}.\n`;
        // Para simplificar, assumimos Feto II oposto ou não citamos posição específica no header se não tiver
        textoFinal += `\n`;
    }

    // Corpos dos Fetus (Removemos a linha de DPP do corpo individual pois já está no topo)
    const limparCabecalho = (txt) => txt.replace(/^DPP:.*\n/, '').replace(/^DUM:.*\n/, '').trim();

    if (qtdFetos > 1) textoFinal += `FETO I:\n`;
    textoFinal += limparCabecalho(resF1.texto);
    
    if (qtdFetos >= 2 && resF2) { 
        textoFinal += `\n\n--------------------------------------------------------------\n`;
        textoFinal += `FETO II:\n`; 
        textoFinal += limparCabecalho(resF2.texto); 
    }
    if (qtdFetos >= 3 && resF3) { 
        textoFinal += `\n\n--------------------------------------------------------------\n`;
        textoFinal += `FETO III:\n`; 
        textoFinal += limparCabecalho(resF3.texto); 
    }

    // DISCLAIMERS FINAIS (Conforme modelo)
    textoFinal += `\n\n`;
    if (dadosGerais.subtipo === 'OBSTETRICO_1_TRI') {
        textoFinal += TEXTO_OBS_MORFO_1;
    } 
    else if (dadosGerais.subtipo === 'OBSTETRICO_MORFOLOGICO') {
        textoFinal += TEXTO_OBS_MORFO_2;
    }
    
    textoFinal += `\n\n${TEXTO_RODAPE_PADRAO}`;

    return textoFinal;
};

export const montarTextoFinal = (res) => {
    // Para feto único, adicionamos o rodapé padrão se não for morfológico (que já tem obs específica)
    // Mas o helper montarTextoFinalMultiplo já cuida disso se usarmos ele sempre.
    // Vamos manter a compatibilidade simples aqui:
    let t = res.texto;
    if (!t.includes("Favor trazer este exame")) {
        t += `\n\n${TEXTO_RODAPE_PADRAO}`;
    }
    return t;
};