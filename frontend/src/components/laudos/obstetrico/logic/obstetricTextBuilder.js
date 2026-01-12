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
// TEXTOS FIXOS (JURÍDICOS DA MÉDICA)
// =============================================================================
const TEXTO_DISCLAIMER_MORFO_1 = "A sensibilidade da medida da translucência nucal e a avaliação do osso nasal na detecção de cromossomopatias (trissomia 21) é de aproximadamente 90%, quando realizada entre 11 e 14 semanas (CCN de 45 a 84 mm) e de aproximadamente 95% quando associada a marcadores bioquímicos. Para o cálculo do risco de cromossomopatias utilizou-se o programa desenvolvido pela 'Fetal Medicine Foundation' de Londres. O risco corrigido foi calculado com base nos resultados obtidos em mais de 100.000 pacientes submetidas ao exame ultrassonográfico no primeiro trimestre de gestação. Deve-se considerar que os riscos nesta fase da gestação são superiores aos riscos avaliados no segundo e terceiro trimestre de gestação. Cerca de 40% dos fetos com trissomias resultam em abortamento espontâneo.";

const TEXTO_DISCLAIMER_MORFO_2 = "O exame morfológico tem uma sensibilidade de 83,5%, entre a 20ª e a 24ª semana de gestação, na detecção de anomalias estruturais, segundo estudo de F. Gonçalves. (Publicado na Revista da Sociedade Brasileira de Medicina Fetal, abril de 2000).";

// =============================================================================
// GERADOR DE RELATÓRIO (FUSÃO: LÓGICA ATUAL + TEXTO DA MÉDICA)
// =============================================================================
export const gerarRelatorioFeto = (d) => {
    let texto = '';
    
    // --- TÍTULO DO EXAME ---
    const mapTitulos = {
        'OBSTETRICO_INICIAL': 'ULTRASSONOGRAFIA OBSTÉTRICA TRANSVAGINAL (INICIAL)',
        'OBSTETRICO_1_TRI': 'ULTRASSONOGRAFIA MORFOLÓGICA DO I TRIMESTRE', // Ajuste Romano (I)
        'OBSTETRICO_2_3_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA',
        'OBSTETRICO_DOPPLER': 'ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLERFLUXOMETRIA',
        'OBSTETRICO_MORFOLOGICO': 'ULTRASSONOGRAFIA MORFOLÓGICA DO 2º TRIMESTRE',
        'OBSTETRICO_3D': 'ULTRASSONOGRAFIA OBSTÉTRICA 3D/4D'
    };
    const tituloExame = mapTitulos[d.subtipo] || 'ULTRASSONOGRAFIA OBSTÉTRICA';
    
    // -------------------------------------------------------------------------
    // 1. DATAÇÃO (Corrigido: Variáveis exatas do SecaoDatacao.jsx)
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
        // CORREÇÃO AQUI: Nomes exatos do formulário (igAnteriorSemanas)
        let igAnt = d.igIgCorrigidaCalculada; 
        if (!igAnt && (d.igAnteriorSemanas || d.igAnteriorDias)) {
            igAnt = `${d.igAnteriorSemanas || 0} semanas e ${d.igAnteriorDias || 0} dias`;
        }
        texto += `Idade gestacional datada pelo ultrassom de ${dataAnt}: ${igAnt || '...'}.\n`;
    } 
    
    texto += '\n';

    // -------------------------------------------------------------------------
    // 2. ÚTERO E SACO GESTACIONAL (Corrigido: Medidas SG e Placenta)
    // -------------------------------------------------------------------------
    
    // --> ÚTERO (Frase da Médica 1º Tri)
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `ÚTERO\nApresenta-se em AVF com dimensões adequadas para a idade gestacional apresentando contornos e textura normais.\n\n`;
    } 
    else {
        if (d.utero) {
            const uteroTexto = d.utero === 'globoso' ? 'globoso, aumentado de volume' : d.utero;
            texto += `Útero ${uteroTexto}`;
            if (d.miometrio) texto += `, miométrio ${d.miometrio}`;
            texto += `.\n`;
        }
    }

    if (d.bexigaMaterna && d.bexigaMaterna !== 'não citar' && d.bexigaMaterna !== 'não visualizada') {
        texto += `Bexiga materna ${d.bexigaMaterna}.\n`;
    }

    // SACO GESTACIONAL
    if (d.citarSg || (d.subtipo && d.subtipo.includes("INICIAL"))) {
        if (d.sgLocalizacao) texto += `Saco gestacional de inserção ${d.sgLocalizacao}, de contornos regulares.\n`;
        
        // Correção: Mostra as 3 medidas se existirem
        if (d.sg1 && d.sg2 && d.sg3) {
            texto += `Medidas do Saco Gestacional: ${d.sg1} x ${d.sg2} x ${d.sg3} mm.\n`;
        }
        if (d.resDmsg) texto += `Diâmetro Médio do Saco Gestacional (DMSG): ${d.resDmsg} mm.\n`;
        
        if (d.embriaoNaoVisualizado) {
            texto += `Vesícula vitelina ${d.citarVv ? 'visualizada' : 'não visualizada'}. Embrião não caracterizado no momento.\n`;
        } else if (d.ccn) {
            texto += `Visualizado embrião medindo ${d.ccn} mm de CCN.\n`;
        }
        
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
    // 3. PLACENTA E LÍQUIDO (Corrigido: Aparece sempre que preenchido)
    // -------------------------------------------------------------------------
    // Removida a trava "!d.citarSg" que escondia a placenta
    if (d.placentaLocalizacao) {
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
    // 4. ESTÁTICA FETAL (Corrigido: Aparece sempre que preenchido)
    // -------------------------------------------------------------------------
    // Removida a trava de subtipo que impedia aparecer no 1º Tri ou Inicial
    if (d.corionicidade) texto += `Gestação ${d.corionicidade} / ${d.amnionicidade}.\n`;
    if (d.localizacaoFeto) texto += `Feto localizado: ${d.localizacaoFeto}.\n`;
    
    if (d.situacao && d.apresentacao) {
        texto += `Situação ${d.situacao}, apresentação ${d.apresentacao}`;
        if (d.dorso) texto += ` e com dorso ${d.dorso}`;
        texto += `.\n\n`;
    }

    // -------------------------------------------------------------------------
    // 5. COLO UTERINO
    // -------------------------------------------------------------------------
    if (d.comprimentoColo || d.coloEge || d.coloSludge === 'presente' || d.coloConclusao) {
        texto += `AVALIAÇÃO DO COLO UTERINO (VIA ENDOVAGINAL)\n`;
        if (d.comprimentoColo) texto += `Comprimento: ${d.comprimentoColo} mm.\n`;
        if (d.coloEge && d.coloEge !== 'nao_visualizado') texto += `Eco Glandular (EGE): ${d.coloEge}.\n`;
        if (d.coloSludge === 'presente') texto += `Sinal do "Sludge": Presente.\n`;
        if (d.coloAfunilamento) texto += `Ausência de afunilamento (funneling).\n`;
        if (d.coloConclusao) texto += `Parecer: ${d.coloConclusao}.\n`;
        texto += `\n`;
    }

    // -------------------------------------------------------------------------
    // 6. MORFOLOGIA FETAL (Corrigido: Membros, Osso Nasal, Vitalidade)
    // -------------------------------------------------------------------------
    
    // --> 1º TRIMESTRE
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
        // Só mostra se o checkbox 'morfMembros' estiver marcado
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
    
    // Vitalidade Geral (Corrigido: Funciona para todos os tipos se preenchido)
    if (d.bcf || d.movFetal || d.degluticao) {
        if (d.bcf) texto += `Batimentos cardíacos fetais rítmicos: ${d.bcf} bpm.\n`;
        if (d.movFetal) texto += `Movimentação fetal ativa: Presente.\n`;
        if (d.degluticao) texto += `Movimentos de deglutição: Visualizados.\n`;
        texto += `\n`;
    }

    // -------------------------------------------------------------------------
    // 7. BIOMETRIA FETAL (LÓGICA RESTAURADA: CAMPOS NOVOS INCLUÍDOS)
    // -------------------------------------------------------------------------
    const temBiometria = d.dbp || d.cc || d.femur || d.orbitaInterna || d.tibia || d.peMedida;

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
            formatBioLine('Translucência Nucal', d.tnMedida),
            formatBioLine('Prega Nucal', d.pregaNucal),
            formatBioLine('Osso Nasal', d.ossoNasal),
            formatBioLine('Dist. Biorbitária (Ext)', d.orbitaExterna),
            formatBioLine('Dist. Interorbitária (Int)', d.orbitaInterna), // Mantido
            formatBioLine('Cerebelo', d.cerebelo),
            formatBioLine('Cisterna Magna', d.cisternaMagna),
            formatBioLine('Ventrículo Lateral', d.ventriculoPosterior),
            formatBioLine('Comp. Pé', d.peMedida), // Mantido
            formatBioLine('Comp. Bexiga', d.compBexiga), // Mantido
        ].filter(Boolean);
        
        texto += bios.join('\n') + '\n\n';
    }

    // -------------------------------------------------------------------------
    // 8. RASTREAMENTO 1º TRI (Lógica Funcional + Texto Médica)
    // -------------------------------------------------------------------------
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `RASTREAMENTO MORFOLÓGICO DE I TRIMESTRE\n`;
        
        if (d.dum) texto += `Data de nascimento estimada (DUM): ${formatData(new Date(new Date(d.dum).setDate(new Date(d.dum).getDate() + 280)).toISOString().split('T')[0])}.\n`;
        
        if (d.citarTn && d.tnMedida) texto += `Translucência Nucal: ${d.tnMedida} mm.\n`;
        
        // Correção Osso Nasal: Se marcado é Presente, se desmarcado é Ausente (ou lógica similar dependendo do seu uso)
        // Se você quer explícito "Ausente" quando desmarcado, use assim:
        texto += `Osso Nasal: ${d.ossoNasalPresente ? 'presente' : 'ausente / não visualizado'}.\n`;
        
        // Ducto Venoso com lógica detalhada
        if (d.checkDv || d.dvIP) {
             let ondaTexto = 'positiva (normal)';
             if (d.dvOndaAZero) ondaTexto = 'zero (anormal)'; // Corrigido nome da variável
             else if (d.dvOndaAReversa) ondaTexto = 'reversa (anormal)'; // Corrigido nome da variável
             
             texto += `Dopplervelocimetria do Ducto Venoso: onda A ${ondaTexto}. IP: ${d.dvIP || '-'}\n`;
        }
        
        if (d.morfCerebro) texto += `Translucência intracraniana: visível.\n`;

        if (d.riscoT21Basal) {
            texto += `\nCÁLCULO DE RISCO (1:X)\n`;
            texto += `T21: Basal 1/${d.riscoT21Basal} | Corrigido 1/${d.riscoT21Corrigido}\n`;
            texto += `T18: Basal 1/${d.riscoT18Basal} | Corrigido 1/${d.riscoT18Corrigido}\n`;
            texto += `T13: Basal 1/${d.riscoT13Basal} | Corrigido 1/${d.riscoT13Corrigido}\n\n`;
        }
    }

    // -------------------------------------------------------------------------
    // 9. DOPPLER (LÓGICA RESTAURADA)
    // -------------------------------------------------------------------------
    if (d.usarDoppler) {
        texto += `ESTUDO DOPPLERFLUXOMÉTRICO\n`;
        
        // Uterinas
        if (d.checkUtDir || d.checkUtEsq || d.utDirIP || d.utEsqIP) {
            texto += `Artérias Uterinas:\n`;
            if (d.checkUtDir || d.utDirIP) {
                texto += `- Direita: ${d.utDirIP ? 'IP '+d.utDirIP : 'Visualizada'}`;
                if (d.utDirIR) texto += `, IR ${d.utDirIR}`;
                if (d.utDirIncisura) texto += ` (Com Incisura Protodiastólica)`;
                texto += `.\n`;
            }
            if (d.checkUtEsq || d.utEsqIP) {
                texto += `- Esquerda: ${d.utEsqIP ? 'IP '+d.utEsqIP : 'Visualizada'}`;
                if (d.utEsqIR) texto += `, IR ${d.utEsqIR}`;
                if (d.utEsqIncisura) texto += ` (Com Incisura Protodiastólica)`;
                texto += `.\n`;
            }
        }

        // Umbilical
        if (d.checkUmb || d.umbIP) {
            texto += `Artéria Umbilical: ${d.umbIP ? 'IP '+d.umbIP : 'Avaliada'}`;
            if (d.umbIR) texto += `, IR ${d.umbIR}`;
            if (d.umbSD) texto += `, S/D ${d.umbSD}`;
            if (d.umbDiastoleZero) texto += ` (Diástole Zero)`;
            if (d.umbDiastoleReversa) texto += ` (Diástole Reversa)`;
            texto += `.\n`;
        }

        // Cerebral
        if (d.checkAcm || d.acmIP) {
            texto += `Artéria Cerebral Média: ${d.acmIP ? 'IP '+d.acmIP : 'Avaliada'}`;
            if (d.acmPVS) texto += `, PVS ${d.acmPVS} cm/s`;
            if (d.acmDiastoleAlta) texto += ` (Sinais de Centralização)`;
            texto += `.\n`;
        }

        // Relação
        if (d.relacaoCerebroUmbilical) {
            texto += `Relação Cérebro/Umbilical: ${d.relacaoCerebroUmbilical}.\n`;
        }
        texto += `\n`;

        // Repete Ducto Venoso aqui se for exame tardio
        if ((d.checkDv || d.dvIP) && d.subtipo !== 'OBSTETRICO_1_TRI') {
             let ondaTexto = 'positiva';
             if (d.dvOndaAZero) ondaTexto = 'zero';
             else if (d.dvOndaAReversa) ondaTexto = 'reversa';
             texto += `Ducto Venoso: onda A ${ondaTexto}, IP ${d.dvIP || '-'}.\n`;
        }
        texto += `\n`;
    }

    // -------------------------------------------------------------------------
    // 10. 3D/4D (LÓGICA RESTAURADA)
    // -------------------------------------------------------------------------
    if (d.usar3D) {
        texto += `ESTUDO TRIDIMENSIONAL (3D) E DINÂMICO (4D)\n`;
        
        const modos = [];
        if (d.modoSurface) modos.push('Surface');
        if (d.modoMultiplanar) modos.push('Multiplanar');
        if (modos.length > 0) texto += `Modos utilizados: ${modos.join(' e ')}.\n`;
        
        texto += `Qualidade da imagem: ${d.qualidade3D || 'Satisfatória'}. `;
        if ((d.qualidade3D === 'regular' || d.qualidade3D === 'ruim') && d.fatorLimitante) {
            let motivo = d.fatorLimitante;
            if (motivo === 'liquido') motivo = 'Líquido Reduzido';
            if (motivo === 'posicao') motivo = 'Posição Fetal';
            if (motivo === 'biotipo') motivo = 'Biotipo Materno';
            if (motivo === 'placenta') motivo = 'Interposição Placentária';
            if (motivo === 'membros') motivo = 'Membros na face';
            texto += `Fator limitante: ${motivo}.`;
        }
        texto += `\n`;
        
        if (d.face3D) {
            let faceTexto = d.face3D;
            if(d.face3D === 'visualizada') faceTexto = 'Visualizada e íntegra';
            if(d.face3D === 'parcial') faceTexto = 'Parcialmente Visualizada';
            if(d.face3D === 'encoberta') faceTexto = 'Encoberta / Não visualizada';
            texto += `Face fetal: ${faceTexto}.\n`;
        }
        
        // Estruturas 3D
        const estruturas3d = [];
        if (d.labios3D) estruturas3d.push("Lábios");
        if (d.olhos3D) estruturas3d.push("Olhos");
        if (d.nariz3D) estruturas3d.push("Nariz");
        if (d.orelhas3D) estruturas3d.push("Orelhas");
        
        if (d.maoDir3D) estruturas3d.push("Mão Dir");
        if (d.maoEsq3D) estruturas3d.push("Mão Esq");
        if (d.peDir3D) estruturas3d.push("Pé Dir");
        if (d.peEsq3D) estruturas3d.push("Pé Esq");
        
        if (estruturas3d.length > 0) texto += `Estruturas identificadas: ${estruturas3d.join(', ')}.\n`;
        
        // Comportamento
        const comportamento = [];
        if (d.movBocejo) comportamento.push("Bocejo");
        if (d.movSorriso) comportamento.push("Sorriso");
        if (d.movPiscar) comportamento.push("Piscar");
        if (d.movLingua) comportamento.push("Protrusão de língua");
        if (d.movMaoFace) comportamento.push("Mão na face");
        if (d.movSuccao) comportamento.push("Sucção");
        if (d.movDegluticao3D) comportamento.push("Deglutição");
        
        if (comportamento.length > 0) texto += `Comportamento fetal (4D): ${comportamento.join(', ')}.\n`;
        
        if (d.obs3D) texto += `Obs: ${d.obs3D}\n`;
        texto += `\n`;
    }

    // -------------------------------------------------------------------------
    // 11. CONCLUSÃO (Corrigido: Peso/Sexo/Percentil aparecem SEMPRE)
    // -------------------------------------------------------------------------
    texto += `CONCLUSÃO\n`;
    let igFinal = d.igBiometria || d.igDum || "---";
    if (d.usarExameAnterior && d.igIgCorrigidaCalculada) igFinal = d.igIgCorrigidaCalculada;

    // 1. Frase de Abertura (Varia por tipo)
    if (d.sgAbortoIncompleto) {
        texto += `Quadro compatível com Abortamento Incompleto.\n`;
    }
    else if (d.subtipo === 'OBSTETRICO_1_TRI') {
        if (d.ccn) {
            texto += `Feto único com idade gestacional estimada pelo comprimento cabeça-nádegas (CCN), de ${diasParaTextoIG(calcularDiasPeloCCN(d.ccn))}, com variação de 5 dias.\n`;
        } else {
            texto += `Feto único com idade gestacional compatível com ${igFinal}.\n`;
        }
        texto += `Os marcadores de cromossomopatias do 1º trimestre reduziram o risco inicial baseado na idade materna.\n`;
        texto += `Não foram encontradas anomalias nas estruturas fetais observadas no presente exame.\n`;
    } 
    else {
        // Frase Padrão
        texto += `- Gestação tópica, feto único vivo.\n`;
        texto += `- Biometria fetal compatível com ${igFinal}.\n`;
        if (d.subtipo === 'OBSTETRICO_MORFOLOGICO') texto += `- Exame morfológico sem evidências de anomalias estruturais.\n`;
    }

    // 2. Dados do Feto (UNIVERSAL - Roda para qualquer exame se preenchido)
    
    // Peso e Percentil
    if (d.pesoEstimado || d.pesoFetal) {
        texto += `- Peso fetal estimado: ${d.pesoEstimado || d.pesoFetal} g.`;
        // Checkbox "Sem dados" no JSX se chama 'semDadosPercentil'
        if (d.percentil && !d.semDadosPercentil) {
            texto += ` (Percentil: ${d.percentil})`;
        }
        texto += `.\n`;
    }
    
    // Sexo Fetal
    if (d.sexoFetal && d.sexoFetal !== 'NAO_CITAR' && d.sexoFetal !== 'NAO_VISUALIZADO') {
         let sexoTexto = d.sexoFetal.toLowerCase();
         if(d.sexoFetal === 'MASCULINO') sexoTexto = 'Masculino';
         if(d.sexoFetal === 'FEMININO') sexoTexto = 'Feminino';
         texto += `- Sexo fetal: ${sexoTexto}.\n`;
    } else if (d.sexoFetal === 'NAO_VISUALIZADO') {
         texto += `- Sexo fetal: Não visualizado.\n`;
    }

    // 3. Notas e Sugestões (UNIVERSAL)
    if (d.sugereGolfBall) texto += `- Foco hiperecogênico (Golf Ball) em VE. Sugere-se controle.\n`;
    if (d.morfoPrejudicado45mm) texto += `- Avaliação morfológica prejudicada (CCN < 45mm).\n`;
    if (d.sugereNipt) texto += `- Risco aumentado para cromossomopatias. Sugere-se NIPT ou cariótipo.\n`;
    if (d.sugerePieloectasia) texto += `- Pieloectasia fetal. Sugere-se controle evolutivo.\n`;
    if (d.sugereDopplerRciu) texto += `- Sugere-se acompanhamento com Dopplerfluxometria (Risco de RCIU).\n`;

    if (d.obsAdicionais) texto += `\nObs: ${d.obsAdicionais}\n`;

    return { texto, tituloExame }; };

// =============================================================================
// HELPERS FINAIS (MULTI-FETO & DISCLAIMERS)
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