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

export const gerarRelatorioFeto = (d) => {
    let texto = '';
    
    // --- MAPA DE TÍTULOS ---
    const mapTitulos = {
        'OBSTETRICO_INICIAL': 'ULTRASSONOGRAFIA OBSTÉTRICA TRANSVAGINAL',
        'OBSTETRICO_1_TRI': 'ULTRASSOM MORFOLÓGICO FETAL DE PRIMEIRO TRIMESTRE',
        'OBSTETRICO_2_3_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA',
        'OBSTETRICO_DOPPLER': 'ULTRASSONOGRAFIA OBSTÉTRICA COM COLOR DOPPLER',
        'OBSTETRICO_MORFOLOGICO': 'ULTRASSOM MORFOLÓGICO FETAL SEGUNDO TRIMESTRE',
        'OBSTETRICO_3D': 'ULTRASSONOGRAFIA 3D'
    };

    const tituloExame = mapTitulos[d.subtipo] || 'ULTRASSONOGRAFIA OBSTÉTRICA';
    
    // =========================================================================
    // 1. DATAÇÃO 
    // =========================================================================
    if (d.usarDum) {
        if (d.exibirDataDum && d.dum) texto += `DUM: ${formatData(d.dum)}.\n`;
        if (d.citarDppDum && d.dppDum) {
            texto += `DPP: ${d.dppDum} (calculada pela DUM)`;
            if (d.igDum) texto += `, compatível com ${d.igDum}`;
            texto += `.\n`;
        } else if (d.igDum) texto += `IG (DUM): compatível com ${d.igDum}.\n`;
    } 
    else if (d.dumDesconhecida) texto += `DUM: Desconhecida / Não referida.\n`;

    if (d.usarExameAnterior && d.dataExameAnterior) {
        const dataAnt = formatData(d.dataExameAnterior);
        texto += `DPP: ${d.dppIgCorrigidaCalculada || '---'} (calculada pelo ultrassom de ${dataAnt}), compatível com ${d.igIgCorrigidaCalculada || '...'}.\n`;
    } else if (d.citarDppBiometria && d.dppBiometriaCalculada) {
        texto += `DPP: ${d.dppBiometriaCalculada} (Biometria Atual)`;
        if (!d.usarDum && d.igBiometria) texto += `, compatível com ${d.igBiometria}`;
        texto += `.\n`;
    }

    texto += '\n';

    // =========================================================================
    // 2. INICIAL (TRANSVAGINAL)
    // =========================================================================
    if (d.subtipo && d.subtipo.includes("INICIAL")) {
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
                // Lógica de Vitalidade no Inicial
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

        // CONCLUSÃO INICIAL
        texto += `\nImpressão diagnóstica:\n`;
        let igConclusao = d.resIgCcn || d.resIgSg || d.igDum || "--";
        if(d.usarExameAnterior && d.igIgCorrigidaCalculada) igConclusao = d.igIgCorrigidaCalculada;

        if (d.sgAbortoIncompleto) texto += `- Quadro compatível com Abortamento Incompleto.\n`;
        else if (d.embriaoNaoVisualizado) texto += `- Gestação tópica incipiente de aproximadamente ${igConclusao}.\n`;
        else {
            texto += `- Gestação tópica de aproximadamente ${igConclusao} (+/- 5 dias).\n`;
            if (d.bcf) texto += `- Embrião vivo.\n`;
        }

        if (d.obsAdicionais) texto += `\nObs: ${d.obsAdicionais}\n`;

        texto += `\nObs.:\n`;
        if (d.sugereDopplerRciu) texto += `- Sob julgamento clínico seria conveniente o acompanhamento com Doppler.\n`;
        if (d.embriaoNaoVisualizado && !d.sgAbortoIncompleto) texto += `- Sugere-se repetir o exame em 7 a 14 dias para reavaliação evolutiva.\n`;
        texto += `- A imagem diagnóstica não é absoluta, devendo ser interpretada pelo médico assistente.\n`;

        return { texto, tituloExame }; 
    }

    // =========================================================================
    // 3. GERAL (2º/3º TRI, DOPPLER, MORFO 1º TRI)
    // =========================================================================
    if (d.localizacaoFeto) texto += `Localização: ${d.localizacaoFeto}.\n`;

    if (d.bexigaMaterna && d.bexigaMaterna !== 'não citar') texto += `Bexiga materna ${d.bexigaMaterna}.\n`;
    else if (d.subtipo === 'OBSTETRICO_DOPPLER') texto += `Bexiga materna não visualizada.\n`;

    texto += `Gestação tópica, feto único.\n`;
    
    // Estática Fetal (Não exibe se for 1º Tri inicial pois feto é muito pequeno)
    if (d.subtipo !== 'OBSTETRICO_1_TRI') {
        texto += `Situação ${d.situacao}, apresentação ${d.apresentacao} e com dorso ${d.dorso}.\n\n`;
    } else {
        texto += `\n`; 
    }

    // --- VITALIDADE (CORRIGIDO: PRIORIDADE PARA INDETECTÁVEL) ---
    let vitalidade = [];
    
    if (d.bcfIndetectavel) {
        vitalidade.push(`Batimentos cardíacos ausentes/indetectáveis ao exame`);
    } else if (d.bcf && d.bcf !== '0') {
        vitalidade.push(`Batimentos cardíacos presentes e rítmicos (${d.bcf} bpm)`);
    }

    if (d.movFetal) vitalidade.push(`movimentos fetais ativos`); 
    if (d.degluticao) vitalidade.push(`movimentos de deglutição`);
    
    if (vitalidade.length > 0) texto += `${vitalidade.join(' e ')}.\n`;

    // Vísceras Humanizadas
    if (d.estomagoVisualizado && d.bexigaVisualizada) texto += `Estômago e bexiga visualizados e de aspecto habitual.\n`;
    else if (d.estomagoVisualizado) texto += `Estômago fetal visualizado.\n`;
    else if (d.bexigaVisualizada) texto += `Bexiga fetal visualizada.\n`;
    
    texto += `\n`;

    // Placenta
    if (d.placentaLocalizacao) {
        texto += `Placenta de inserção ${d.placentaLocalizacao}, homogênea, grau ${d.placentaGrau || '0'} (Grannum)`;
        texto += ` e de espessura normal`;
        if (d.placentaEspessura) texto += `, medindo ${d.placentaEspessura} mm`;
        texto += `.\n`;
    }

    // Líquido
    if (d.liquidoAmniotico) {
        texto += `Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()}`;
        if (d.mbv) texto += ` (MBV= ${d.mbv} mm)`;
        else if (d.ila) texto += ` (ILA= ${d.ila} mm)`;
        texto += `.\n`;
    }
    texto += `\n`;

    // Biometria
    if (d.dbp || d.cc || d.femur || d.ccn) {
        texto += `Medidas:\n`;
        const bioLines = [
            formatBioLine('CCN', d.ccn),
            formatBioLine('Diâmetro Biparietal', d.dbp),
            formatBioLine('Diâmetro Occipto Frontal', d.dof),
            formatBioLine('Circunferência Cefálica', d.cc),
            formatBioLine('Circunferência Abdominal', d.ca),
            formatBioLine('Comprimento do Fêmur', d.femur),
            formatBioLine('Comprimento do Úmero', d.umero),
            formatBioLine('Ulna', d.ulna),
            formatBioLine('Rádio', d.radio),
            formatBioLine('Tíbia', d.tibia),
            formatBioLine('Fíbula', d.fibula),
            formatBioLine('Comprimento de Pé', d.peMedida),
            formatBioLine('Cerebelo', d.cerebelo),
            formatBioLine('Cisterna Magna', d.cisternaMagna),
            formatBioLine('Ventrículo posterior', d.ventriculoPosterior),
            formatBioLine('Prega Nucal', d.pregaNucal),
            formatBioLine('Órbita externa', d.orbitaExterna),
            formatBioLine('Órbita interna', d.orbitaInterna),
            formatBioLine('Translucência Nucal', d.tnMedida),
            formatBioLine('Comprimento da Bexiga', d.compBexiga)
        ].filter(Boolean);
        texto += bioLines.join('\n') + `\n`;

        const indices = [];
        if (d.resIc) indices.push(`I.Cefálico: ${d.resIc}`);
        if (d.resCcCa) indices.push(`CC/CA: ${d.resCcCa}`);
        if (d.resCfCa) indices.push(`CF/CA: ${d.resCfCa}`);
        
        if (indices.length > 0) {
            texto += `Relações Biométricas: ${indices.join('  |  ')}.\n`;
        }
        texto += `\n`;
    }

    // =========================================================================
    // 4. ANÁLISE MORFOLÓGICA (AQUI ESTAVA O ERRO DE LÓGICA - CORRIGIDO)
    // =========================================================================
    
    // --- 1º TRIMESTRE ---
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `Análise Morfológica (11 - 14 semanas):\n`;
        
        const anatItens = [];
        // Verifica cada checkbox individualmente
        if (d.morf1Cerebro) anatItens.push("Pólo cefálico / Cérebro");
        if (d.morf1Globos) anatItens.push("Globos oculares");
        if (d.morf1Estomago) anatItens.push("Estômago");
        if (d.morf1Cordao) anatItens.push("Inserção do cordão");
        if (d.morf1Membros) anatItens.push("Membros superiores e inferiores");
        
        if (anatItens.length > 0) {
            texto += `- Visualizados: ${anatItens.join(', ')}.\n`;
        }

        // Osso Nasal
        if (d.morf1OssoNasal && d.morf1OssoNasal !== 'não citar') {
            texto += `- Osso Nasal: ${d.morf1OssoNasal}.\n`;
        } else if (d.ossoNasalPresente) {
            texto += `- Osso Nasal: Presente.\n`;
        }
        
        // Translucência Nucal
        if (d.citarTn && d.tnMedida) {
             texto += `- Translucência Nucal (TN): ${d.tnMedida} mm.\n`;
        }
        
        // Riscos T21 (Corrigido para exibir dentro do bloco)
        if (d.tnRisco) {
            texto += `\nCÁLCULO DE RISCO PARA TRISSOMIAS (T21):\n`;
            texto += `- Risco Basal (Idade Materna): 1/${d.riscoBasal || '---'}\n`;
            texto += `- Risco Corrigido (TN): 1/${d.riscoCorrigido || '---'}\n`;
        }
        texto += `\n`;
    } 
    
    // --- 2º / 3º TRIMESTRE ---
    else {
        const morfList = [
            { label: 'coluna vertebral', checked: d.morfColuna },
            { label: 'crânio', checked: d.morfCranio },
            { label: 'encéfalo', checked: d.morfCerebro },
            { label: 'face', checked: d.morfFace },
            { label: 'tórax/pulmões', checked: d.morfTorax || d.morfPulmoes },
            { label: 'coração (4 câmaras)', checked: d.morfCoracao },
            { label: 'vasos da base', checked: d.morfVasosBase },
            { label: 'estômago', checked: d.morfEstomago },
            { label: 'fígado', checked: d.morfFigado },
            { label: 'rins', checked: d.morfRins },
            { label: 'bexiga', checked: d.morfBexiga },
            { label: 'parede abdominal', checked: d.morfParedeAbd },
            { label: 'membros', checked: d.morfMembros },
            { label: 'genitália externa', checked: d.morfGenitalia },
        ];
        const textoMorf = listarNormais(morfList);
        if (textoMorf) texto += `Análise Morfológica:\n${textoMorf}\n\n`;
    }

    // =========================================================================
    // 7. DOPPLER (CORRIGIDO: AGORA INCLUI PATOLOGIAS)
    // =========================================================================
    if (d.usarDoppler) {
        texto += `ESTUDO DOPPLER\t\t\tÍNDICES\n`;
        
        // VASOS FETAIS
        if (d.checkAcm) {
            let partes = [`IP: ${d.acmIP || '--'}`];
            if(d.acmIR) partes.push(`IR: ${d.acmIR}`); // NOVO
            if(d.acmPVS) partes.push(`PVS: ${d.acmPVS} cm/s`); // NOVO
            
            texto += `Artéria Cerebral Média:\t\t${partes.join('  |  ')}`;
            if (d.acmDiastoleAlta) texto += ` (Centralização / Vasodilatação)`;
            texto += `\n`;
        }

        if (d.checkUmb) {
            let partes = [`IP: ${d.umbIP || '--'}`];
            if(d.umbIR) partes.push(`IR: ${d.umbIR}`); // NOVO
            if(d.umbSD) partes.push(`S/D: ${d.umbSD}`); // NOVO

            texto += `Artéria Umbilical:\t\t\t${partes.join('  |  ')}`;
            if (d.umbDiastoleZero) texto += ` (Diástole Zero)`;
            if (d.umbDiastoleReversa) texto += ` (Diástole Reversa)`;
            texto += `\n`;
        }

        if ((d.checkAcm || d.checkUmb) && d.relacaoCerebroUmbilical) {
            texto += `Relação cerebro/umbilical:\t\t${d.relacaoCerebroUmbilical} (n/l maior / igual à 1,0)\n`;
        }
        
        texto += `\nESTUDO DOPPLER\t\t\tÍNDICES\n`;
        
        // UTERINAS
        if (d.checkUtDir) {
            let partes = [`IP: ${d.utDirIP || '--'}`];
            if(d.utDirIR) partes.push(`IR: ${d.utDirIR}`); // NOVO
            
            texto += `Artéria uterina direita:\t\t${partes.join('  |  ')}`;
            if (d.utDirIncisura) texto += ` (Com Incisura Protodiastólica)`; // NOVO
            texto += `\n`;
        }

        if (d.checkUtEsq) {
            let partes = [`IP: ${d.utEsqIP || '--'}`];
            if(d.utEsqIR) partes.push(`IR: ${d.utEsqIR}`); // NOVO
            
            texto += `Artéria uterina esquerda:\t\t${partes.join('  |  ')}`;
            if (d.utEsqIncisura) texto += ` (Com Incisura Protodiastólica)`; // NOVO
            texto += `\n`;
        }

        if (d.ipMedioUterinas) {
            texto += `IP Médio Uterinas:\t\t\t\t${d.ipMedioUterinas}\n`;
        }
        
        // DUCTO VENOSO
        if (d.checkDv) {
             texto += `\nDucto Venoso:`;
             if (d.dvIP) texto += ` IP: ${d.dvIP}`;
             
             if (d.dvOndaAZero) texto += ` (Onda A Zero)`;
             else if (d.dvOndaAReversa) texto += ` (Onda A Reversa)`; // CORRIGIDO LOGICA
             else if (d.dvTraçadoNormal) texto += ` (Traçado Normal)`;
             texto += `\n`;
        }
        texto += `\n`;
    }

    // =========================================================================
    // 8. ESTUDO 3D / 4D (ATUALIZADO E COMPLETO)
    // =========================================================================
    if (d.usar3D) {
        texto += `ESTUDO TRIDIMENSIONAL (3D) E DINÂMICO (4D):\n`;
        
        // TÉCNICA E QUALIDADE
        let tecnica = [];
        if (d.modoSurface) tecnica.push("reconstrução de superfície (Surface rendering)");
        if (d.modoMultiplanar) tecnica.push("análise multiplanar");
        
        texto += `Exame realizado com ${tecnica.join(" e ")}. `;
        texto += `Obteve-se qualidade de imagem ${d.qualidade3D || 'satisfatória'}.`;
        
        // Justificativa se ruim
        if ((d.qualidade3D === 'regular' || d.qualidade3D === 'ruim') && d.fatorLimitante) {
            const mapFatores = {
                'posicao': 'devido à posição fetal desfavorável',
                'liquido': 'devido à redução do volume de líquido amniótico',
                'biotipo': 'limitada pelo biotipo materno (atenuação acústica)',
                'placenta': 'devido à interposição placentária',
                'membros': 'devido à interposição de membros fetais'
            };
            texto += ` (${mapFatores[d.fatorLimitante] || ''})`;
        }
        texto += `\n`;

        // ANÁLISE MORFOLÓGICA (3D)
        if (d.face3D === 'visualizada') {
            texto += `Face fetal visualizada, evidenciando integridade e aspecto habitual d`;
            const faceItens = [];
            if (d.labios3D) faceItens.push("os lábios (região nasolabial)");
            if (d.nariz3D) faceItens.push("o nariz");
            if (d.olhos3D) faceItens.push("as órbitas");
            if (d.orelhas3D) faceItens.push("as orelhas");
            
            if (faceItens.length > 0) texto += `${faceItens.join(', ')}. `;
            else texto += `as estruturas faciais. `;
        } else if (d.face3D === 'parcial') {
            texto += `Face fetal parcialmente visualizada. `;
        } else if (d.face3D === 'encoberta') {
            texto += `Visualização da face prejudicada por interposição de estruturas. `;
        }

        // Extremidades
        const membros3D = [];
        if (d.maoDir3D) membros3D.push('mão direita');
        if (d.maoEsq3D) membros3D.push('mão esquerda');
        if (d.peDir3D) membros3D.push('pé direito');
        if (d.peEsq3D) membros3D.push('pé esquerdo');
        
        if (membros3D.length > 0) {
            texto += `Identificação d${membros3D.length > 1 ? 'as' : 'a'} extremidades: ${membros3D.join(', ')}.\n`;
        } else {
            texto += `\n`;
        }

        // COMPORTAMENTO (4D)
        const comportamentos = [];
        if (d.movBocejo) comportamentos.push('bocejo');
        if (d.movSorriso) comportamentos.push('mímica de sorriso');
        if (d.movPiscar) comportamentos.push('movimento de piscar (blinking)');
        if (d.movLingua) comportamentos.push('extrusão da língua');
        if (d.movMaoFace) comportamentos.push('mão na face');
        if (d.movSuccao) comportamentos.push('sucção (dedo/mão)');
        if (d.movDegluticao3D) comportamentos.push('deglutição');

        if (comportamentos.length > 0) {
            texto += `No estudo dinâmico (4D), observou-se atividade fetal caracterizada por: ${comportamentos.join(', ')}.\n`;
        }

        if (d.obs3D) {
            texto += `${d.obs3D}\n`;
        }
        texto += `\n`;
    }

    // =========================================================================
    // 9. CONCLUSÃO
    // =========================================================================
    texto += `Impressão diagnóstica:\n`;
    
    let igFinal = d.igBiometria || d.igDum || "---";
    if (d.usarExameAnterior && d.igIgCorrigidaCalculada) {
        igFinal = d.igIgCorrigidaCalculada;
    }

    // Header Conclusão
    if (d.subtipo.includes("GEMELAR") || d.subtipo.includes("TRIGEMELAR")) {
        texto += `- ${d.tipoGestacaoTexto || 'Gestação múltipla'}.\n`; 
    } else {
        texto += `- Feto único vivo.\n`;
    }

    texto += `- Biometria fetal compatível com aproximadamente ${igFinal} +/- 14 dias.\n`;
    
    if (d.liquidoAmniotico) {
        const valLiq = d.mbv ? `(MBV = ${d.mbv} mm)` : (d.ila ? `(ILA = ${d.ila} mm)` : '');
        texto += `- Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()} ${valLiq}.\n`;
    }

    if (d.semDadosPercentil) {
        texto += `- Não foi possível informar o percentil de peso devido à falta de exame anterior e dum desconhecida.\n`;
        if (d.pesoEstimado) texto += `- Peso Fetal Estimado: ${d.pesoEstimado} g.\n`;
    } 
    else {
        if (d.pesoEstimado) {
            texto += `- Peso Fetal ${d.pesoEstimado} g (+/- 10%)`;
            if (d.pesoP10 || d.pesoP90) texto += ` (P10= ${d.pesoP10} | P90= ${d.pesoP90})`;
            texto += `.\n`;
        }
        if (d.percentil) texto += `- Percentil ${d.percentil}.\n`;
    }

    if (d.sexoFetal && d.sexoFetal !== 'NAO_CITAR') {
        texto += `- Sexo: Genitália compatível com ${d.sexoFetal}.\n`;
    }

    if (d.usarDoppler) {
        texto += `- Dopplerfluxometria sem anormalidades no presente estudo.\n`;
    }

    // Riscos T21 na Conclusão
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `- CÁLCULO DE RISCO PARA AS TRISSOMIAS:\n`;
        texto += `  SEGUNDO A IDADE MATERNA: 1/${d.riscoBasal || '---'}\n`;
        texto += `  SEGUNDO O EXAME: 1/${d.riscoExame || d.riscoCorrigido || '---'}\n`;
    }

    // Frases Extras
    if (d.sugereGolfBall) texto += `- Sugere-se a critério clínico, ampliação da propedêudica com ecocardiograma, devido à presença de foco ecogênico (GOLF BALL).\n`;
    if (d.sugerePieloectasia) texto += `- PIELOECTASIA: Dilatação pielo-calicial isolada. Geralmente de caráter benigno.\n`;
    if (d.sugereRciu) texto += `- Sob julgamento clínico seria conveniente o acompanhamento com Doppler (RCIU/Oligoâmnio).\n`;
    if (d.sugereNipt) texto += `- Sob julgamento clínico seria conveniente o estudo genético (NIPT).\n`;
    
    if (d.obsAdicionais) texto += `\nObs: ${d.obsAdicionais}\n`;

    texto += `\nObs.:\n`;
    if (d.morfoPrejudicado45mm) {
        texto += `- Não foi possível realizar Morfológico de primeiro trimestre, devido ao CCN menor que 45 mm. Sob julgamento clínico seria conveniente realizar morfológico entre 11 e 14 semanas.\n`;
    }
    
    texto += `- Nem todas as alterações que um feto possa vir apresentar após o nascimento, podem ser identificadas pelo exame ultra-sonográfico, devendo-se levar em consideração as limitações técnicas inerentes ao método e a idade gestacional.\n`;
    
    if (d.subtipo === 'OBSTETRICO_MORFOLOGICO') {
        texto += `- Ressaltamos que a eficácia do exame morfológico quando realizado entre 20 e 24 semanas é de 83%.\n`;
    }
    
    texto += `A imagem diagnóstica não é absoluta, devendo ser interpretada pelo médico assistente em conjunto com o exame físico e demais exames complementares.`;

    return { texto, tituloExame };
};

// =========================================================================
// MONTAGEM FINAL PARA MÚLTIPLOS (GEMELAR / TRIGEMELAR)
// =========================================================================
export const montarTextoFinalMultiplo = (resF1, resF2, resF3, qtdFetos, dadosGerais = {}) => {
    let textoFinal = '';
    
    if (resF1 && resF1.tituloExame) {
        if (qtdFetos > 1 && !resF1.tituloExame.includes("GEMELAR")) {
             textoFinal += `${resF1.tituloExame} ${qtdFetos === 2 ? 'GEMELAR' : 'TRIGEMELAR'}\n\n`;
        } else {
             textoFinal += `${resF1.tituloExame}\n\n`;
        }
    }

    if (qtdFetos > 1) {
        textoFinal += `Gestação ${qtdFetos === 2 ? 'gemelar' : 'trigemelar'}, ${dadosGerais.corionicidade || 'dicoriônica'} e ${dadosGerais.amnionicidade || 'diamniótica'}.\n`;
        if (resF1) textoFinal += `Feto I: ${dadosGerais.localizacaoFeto || 'Localização habitual'}.\n`;
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

    return textoFinal;
};

export const montarTextoFinal = (res) => res.texto;