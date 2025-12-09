import { formatData } from './obstetricCalculations';

// Helper para alinhar Biometria (Estilo Tabela)
const formatBioLine = (label, value, unit = 'mm') => {
    if (!value) return null;
    const spaces = 45 - label.length; 
    const dots = ".".repeat(Math.max(0, spaces)); 
    return `${label} ${dots} ${value} ${unit}.`; 
};

// Helper para listar itens normais (Morfologia)
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

    // Pega o título correto baseada na seleção
    const tituloExame = mapTitulos[d.subtipo] || 'ULTRASSONOGRAFIA OBSTÉTRICA';
    
    // =========================================================================
    // 1. DATAÇÃO (GLOBAL - Funciona para TODOS os tipos de exame)
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
    // 2. GESTAÇÃO INICIAL (CORRIGIDO: AGORA TEM CONCLUSÃO)
    // =========================================================================
    if (d.subtipo && d.subtipo.includes("INICIAL")) {
        
        // CORREÇÃO 1: BEXIGA MATERNA (Obedece o Select)
        if (d.bexigaMaterna && d.bexigaMaterna !== 'não citar') {
            texto += `Bexiga materna ${d.bexigaMaterna}.\n`;
        } else {
            // Fallback padrão se nada for selecionado
            texto += `Bexiga vazia.\n`;
        }
        
        // Útero (Texto Fluido)
        const uteroTexto = d.utero === 'globoso' ? 'globoso, aumentado de volume' : (d.utero || 'globoso');
        texto += `Útero ${uteroTexto}, de contornos regulares e miométrio ${d.miometrio || 'homogêneo'}.\n\n`;
        
        // Saco Gestacional e Embrião (Texto Fluido)
        if (d.sgAbortoIncompleto) {
            texto += `Observa-se na cavidade uterina conteúdo heterogêneo amorfo, compatível com restos ovulares (Abortamento Incompleto).\n`;
        } 
        else if (d.citarSg) {
            // CORREÇÃO: Incluindo Localização
            texto += `Observa-se na cavidade uterina, saco gestacional`;
            if (d.sgLocalizacao) texto += ` de inserção ${d.sgLocalizacao}`;
            texto += `, de contornos regulares`;
            
            // Medida do SG
            if (d.resDmsg) texto += ` medindo ${d.resDmsg} mm (DMSG)`;
            else if (d.sg1) texto += ` medindo ${d.sg1} mm`;

            // Conteúdo (Embrião)
            if (d.embriaoNaoVisualizado) {
                texto += `, contendo no seu interior vesícula vitelina ${d.citarVv ? 'visualizada' : 'não visualizada'}, sem embrião caracterizado no momento.\n`;
            } else {
                texto += `, contendo no seu interior embrião`;
                
                // Vitalidade
                if (d.bcf) texto += `, com batimentos cardíacos presentes (${d.bcf} BPM)`;
                else if (d.bcfIndetectavel) texto += `, com batimentos cardíacos indetectáveis`;
                
                // CCN
                if (d.ccn) texto += `, medindo ${d.ccn} mm de CCN`;
                
                texto += `.\n`;
            }
        }

        // Detalhes Adicionais
        texto += `As vilosidades placentárias tem inserção ${d.trofoblasto || 'normal'}.\n`;

        if (d.sgSemDescolamento) {
            texto += `Não se observa coágulo intra uterino.\n`;
        } else if (d.sgComDescolamento) {
            texto += `Observa-se área de descolamento medindo ${d.desc1 || '-'} x ${d.desc2 || '-'} mm.\n`;
        }

        texto += `O orifício interno do colo permanece fechado`;
        if (d.comprimentoColo) texto += `, medindo ${d.comprimentoColo} mm`;
        texto += `.\n`;

        texto += `Anexos parauterinos normais.\n`;

        // CORREÇÃO: 3D/4D DENTRO DO INICIAL
        if (d.usar3D) {
            texto += `\nESTUDO TRIDIMENSIONAL (3D/4D):\n`;
            texto += `Realizada reconstrução de superfície com qualidade ${d.qualidade3D}.\n`;
            if (d.obs3D) texto += `${d.obs3D}\n`;
        }

        // --- CONCLUSÃO (INICIAL) ---
        texto += `\nImpressão diagnóstica:\n`;
        
        // Determina IG da conclusão
        let igConclusao = d.resIgCcn || d.resIgSg || d.igDum || "--";
        if(d.usarExameAnterior && d.igIgCorrigidaCalculada) igConclusao = d.igIgCorrigidaCalculada;

        if (d.sgAbortoIncompleto) {
            texto += `- Quadro compatível com Abortamento Incompleto.\n`;
        } else if (d.embriaoNaoVisualizado) {
            texto += `- Gestação tópica incipiente de aproximadamente ${igConclusao}.\n`;
        } else {
            texto += `- Gestação tópica de aproximadamente ${igConclusao} (+/- 5 dias).\n`;
            if (d.bcf) texto += `- Embrião vivo.\n`;
        }

        // CORREÇÃO: TODAS AS FUNÇÕES DE CONCLUSÃO AGORA AQUI TAMBÉM
        if (d.obsAdicionais) texto += `\nObs: ${d.obsAdicionais}\n`;

        texto += `\nObs.:\n`;
        
        // Frases automáticas
        if (d.sugereDopplerRciu) texto += `- Sob julgamento clínico seria conveniente o acompanhamento com Doppler.\n`;
        if (d.morfoPrejudicado45mm) texto += `- Não foi possível realizar Morfológico (CCN < 45 mm).\n`;
        if (d.sugereNipt) texto += `- Sob julgamento clínico seria conveniente o estudo genético (NIPT).\n`;

        if (d.embriaoNaoVisualizado && !d.sgAbortoIncompleto) {
             texto += `- Sugere-se repetir o exame em 7 a 14 dias para reavaliação evolutiva.\n`;
        }
        texto += `- A imagem diagnóstica não é absoluta, devendo ser interpretada pelo médico assistente.\n`;

        return { texto, tituloExame }; 
    }

    // =========================================================================
    // 3. CORPO DO LAUDO - GERAL (2º/3º TRI, DOPPLER, MORFO)
    // =========================================================================
    // --- LOCALIZAÇÃO (NOVO: Importante para Gêmeos) ---
    if (d.localizacaoFeto) { // Ex: "à direita da mãe"
        texto += `Localização: ${d.localizacaoFeto}.\n`;
    }

    // CORREÇÃO: Bexiga materna agora aceita "não visualizada" se selecionada
    if (d.bexigaMaterna && d.bexigaMaterna !== 'não citar') {
        texto += `Bexiga materna ${d.bexigaMaterna}.\n`;
    } else if (d.subtipo === 'OBSTETRICO_DOPPLER') {
        texto += `Bexiga materna não visualizada.\n`;
    }

    texto += `Gestação tópica, feto único.\n`;
    texto += `Situação ${d.situacao}, apresentação ${d.apresentacao} e com dorso ${d.dorso}.\n\n`;

    // Vitalidade Fetal
    let vitalidade = [];
    if (d.bcf) vitalidade.push(`Batimentos cardíacos (${d.bcf} bpm)`);
    if (d.movFetal) vitalidade.push(`movimentos fetais`); 
    if (d.degluticao) vitalidade.push(`movimentos de deglutição`);

    if (vitalidade.length > 0) {
        texto += `${vitalidade.join(' e ')} presentes.\n`;
    }

    // --- NOVA LÓGICA HUMANIZADA PARA VÍSCERAS ---
    const estomagoOk = d.estomagoVisualizado;
    const bexigaOk = d.bexigaVisualizada; // Assumindo que o checkbox agora significa "Visualizada/Normal"

    // Caso 1: Ambos visualizados
    if (estomagoOk && bexigaOk) {
        texto += `Estômago e bexiga visualizados e de aspecto habitual.\n`;
    } 
    // Caso 2: Só Estômago
    else if (estomagoOk) {
        texto += `Estômago fetal visualizado.\n`;
    }
    // Caso 3: Só Bexiga
    else if (bexigaOk) {
        texto += `Bexiga fetal visualizada.\n`;
    }
    
    texto += `\n`;
    // =========================================================================
    // 4. PLACENTA E LÍQUIDO
    // =========================================================================
    if (d.placentaLocalizacao) {
        texto += `Placenta de inserção ${d.placentaLocalizacao}, homogênea, grau ${d.placentaGrau || '0'} (Grannum)`;
        texto += ` e de espessura normal`;
        if (d.placentaEspessura) texto += `, medindo ${d.placentaEspessura} mm`;
        texto += `.\n`;
    }

    if (d.liquidoAmniotico) {
        texto += `Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()}`;
        // Se for gemelar, o cliente usa MBV. Se for único, usa ILA.
        // Vamos supor que se 'mbv' estiver preenchido, usa ele.
        if (d.mbv) {
             texto += ` (MBV= ${d.mbv} mm)`;
        } else if (d.ila) {
            texto += ` (ILA= ${d.ila} mm)`;
            if (d.ilaRefMin || d.ilaRefMax) texto += ` (Ref: ${d.ilaRefMin || ''} - ${d.ilaRefMax || ''})`;
        }
        texto += `.\n`;
    }
    texto += `\n`;

    // =========================================================================
    // 5. BIOMETRIA E ÍNDICES
    // =========================================================================
    if (d.dbp || d.cc || d.femur || d.ccn) {
        texto += `Medidas:\n`;
        const bioLines = [
            formatBioLine('CCN (Cabeça-Nádegas)', d.ccn),
            formatBioLine('Diâmetro Biparietal', d.dbp),
            formatBioLine('Diâmetro Occipto Frontal', d.dof),
            formatBioLine('Circunferência Cefálica', d.cc),
            formatBioLine('Circunferência Abdominal', d.ca),
            formatBioLine('Comprimento do Fêmur', d.femur),
            formatBioLine('Comprimento do Úmero', d.umero),
            // Outros ossos
            formatBioLine('Ulna', d.ulna),
            formatBioLine('Rádio', d.radio),
            formatBioLine('Tíbia', d.tibia),
            formatBioLine('Fíbula', d.fibula),
            formatBioLine('Comprimento de Pé', d.peMedida), // Novo
            formatBioLine('Cerebelo', d.cerebelo),
            formatBioLine('Cisterna Magna', d.cisternaMagna),
            formatBioLine('Ventrículo posterior', d.ventriculoPosterior), // Novo
            formatBioLine('Prega Nucal', d.pregaNucal),
            formatBioLine('Osso nasal', d.ossoNasal || d.morf1OssoNasal),
            formatBioLine('Órbita externa', d.orbitaExterna), // Novo
            formatBioLine('Órbita interna', d.orbitaInterna), // Novo
            formatBioLine('Translucência Nucal', d.tnMedida),
            formatBioLine('Comprimento da Bexiga', d.compBexiga) // Novo Morfo 1
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
    // 6. MORFOLOGIA
    // =========================================================================
    // Morfológico 1º Tri Específico
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `Análise Fetal (1º Trimestre):\n`;
        texto += `- Crânio de contornos regulares. Estruturas da linha média presentes e plexo coróide visualizado.\n`;
        if (d.ossoNasalPresente) texto += `- Osso nasal presente.\n`;
        texto += `- Tórax e área cardíaca preservados. Ducto Venoso com Onda A positiva.\n`;
        texto += `- Abdome com estômago e bexiga visualizados.\n`;
        texto += `- Membros superiores e inferiores visibilizados.\n\n`;
    }

    // Morfológico 2º/3º Tri
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

    // =========================================================================
    // 7. DOPPLER
    // =========================================================================
    if (d.usarDoppler) {
        texto += `ESTUDO DOPPLER\t\t\tÍNDICES DE PULSATILIDADE\n`;
        
        if (d.checkAcm && d.acmIP) {
            texto += `Artéria cerebral\t\t\t\t${d.acmIP}\n`;
        }
        if (d.checkUmb && d.umbIP) {
            texto += `Artéria umbilical\t\t\t\t${d.umbIP}\n`;
        }
        if ((d.checkAcm || d.checkUmb) && d.relacaoCerebroUmbilical) {
            texto += `Relação cerebro/umbilical\t\t${d.relacaoCerebroUmbilical} (n/l maior / igual à 1,0)\n`;
        }
        
        texto += `\nESTUDO DOPPLER\t\t\tÍNDICES DE PULSATILIDADE\n`;
        
        if (d.checkUtDir && d.utDirIP) {
            texto += `Artéria uterina direita\t\t\t${d.utDirIP}\n`;
        }
        if (d.checkUtEsq && d.utEsqIP) {
            texto += `Artéria uterina esquerda\t\t${d.utEsqIP}\n`;
        }
        if (d.checkUtDir && d.utDirIP && d.checkUtEsq && d.utEsqIP) {
            const v1 = parseFloat(d.utDirIP.replace(',','.'));
            const v2 = parseFloat(d.utEsqIP.replace(',','.'));
            if (!isNaN(v1) && !isNaN(v2)) {
                const media = ((v1 + v2) / 2).toFixed(2).replace('.',',');
                texto += `IP médio:\t\t\t\t\t${media}\n`;
            }
        }
        
        if (d.checkDv && d.dvIP) {
             texto += `\nDucto Venoso (IP):\t\t\t\t${d.dvIP}`;
             if (d.dvOndaAZero) texto += ` (Onda A Zero)`;
             else if (d.dvOndaAReversa) texto += ` (Onda A Reversa)`;
             texto += `\n`;
        }

        texto += `\n`;
    }

    // =========================================================================
    // 8. ESTUDO 3D / 4D (NOVO)
    // =========================================================================
    if (d.usar3D) {
        texto += `ESTUDO TRIDIMENSIONAL (3D/4D):\n`;
        texto += `Realizada reconstrução de superfície com qualidade ${d.qualidade3D}.\n`;
        
        if (d.face3D === 'visualizada') {
            texto += `Face fetal visualizada, evidenciando integridade do lábio superior e nariz.\n`;
        } else if (d.face3D === 'encoberta') {
            texto += `Visualização da face prejudicada por interposição de estruturas (placenta/membros).\n`;
        }

        const membros3D = [];
        if (d.mao3D) membros3D.push('mãos');
        if (d.pe3D) membros3D.push('pés');
        
        if (membros3D.length > 0) {
            texto += `Identificados ${membros3D.join(' e ')} na renderização.\n`;
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

    // Cabeçalho da Conclusão
    if (d.subtipo.includes("GEMELAR") || d.subtipo.includes("TRIGEMELAR")) {
        // Gemelares tem o tipo no header principal, aqui repete ou simplifica
        texto += `- ${d.tipoGestacaoTexto || 'Gestação múltipla'}.\n`; 
    } else {
        texto += `- Feto único vivo.\n`;
    }

    texto += `- Biometria fetal compatível com aproximadamente ${igFinal} +/- 14 dias.\n`;
    
    if (d.liquidoAmniotico) {
        const valLiq = d.mbv ? `(MBV = ${d.mbv} mm)` : (d.ila ? `(ILA = ${d.ila} mm)` : '');
        texto += `- Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()} ${valLiq}.\n`;
    }

    // === LÓGICA DO PESO E PERCENTIL (ALTERADA) ===
    
    // Se marcou "Sem dados", exibe a frase específica e IGNORA o resto do peso
    if (d.semDadosPercentil) {
        texto += `- Não foi possível informar o percentil de peso devido à falta de exame anterior e dum desconhecida.\n`;
        // Ainda mostra o peso absoluto se tiver digitado? Geralmente sim.
        if (d.pesoEstimado) texto += `- Peso Fetal Estimado: ${d.pesoEstimado} g.\n`;
    } 
    // Caso contrário, segue o padrão normal
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

    // --- CÁLCULO DE RISCO (MORFOLÓGICO 1º TRI) ---
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `- CÁLCULO DE RISCO PARA AS TRISSOMIAS:\n`;
        texto += `  SEGUNDO A IDADE MATERNA: ${d.riscoIdade || '---'}\n`;
        texto += `  SEGUNDO O EXAME: ${d.riscoExame || '---'}\n`;
    }

    // --- FRASES PRONTAS (SOLICITAÇÃO DO CLIENTE) ---
    if (d.sugereGolfBall) texto += `- Sugere-se a critério clínico, ampliação da propedêudica com ecocardiograma, devido à presença de foco ecogênico (GOLF BALL).\n`;
    if (d.sugerePieloectasia) texto += `- PIELOECTASIA: Dilatação pielo-calicial isolada. Geralmente de caráter benigno.\n`;
    if (d.sugereRciu) texto += `- Sob julgamento clínico seria conveniente o acompanhamento com Doppler (RCIU/Oligoâmnio).\n`;
    if (d.sugereNipt) texto += `- Sob julgamento clínico seria conveniente o estudo genético (NIPT).\n`;
    
    if (d.obsAdicionais) texto += `\nObs: ${d.obsAdicionais}\n`;

    // --- RODAPÉ OBRIGATÓRIO (CLIENTE) ---
    texto += `\nObs.:\n`;
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
    
    // Título Geral
    if (resF1 && resF1.tituloExame) {
        if (qtdFetos > 1 && !resF1.tituloExame.includes("GEMELAR")) {
             textoFinal += `${resF1.tituloExame} ${qtdFetos === 2 ? 'GEMELAR' : 'TRIGEMELAR'}\n\n`;
        } else {
             textoFinal += `${resF1.tituloExame}\n\n`;
        }
    }

    // CABEÇALHO COMUM (DUM e DPP) - Pega do Feto 1 (que guarda os dados da mãe)
    // Precisamos extrair o início do texto do Feto 1 que fala de DUM/DPP para não repetir em todos
    // Uma estratégia melhor: Os dados de DUM/DPP estão no objeto `dadosGerais` (ou resF1 se ele tiver tudo).
    
    // Header de Gemelaridade (Pedido do cliente)
    if (qtdFetos > 1) {
        // Ex: Gestação gemelar, dicoriônica e diamniótica.
        textoFinal += `Gestação ${qtdFetos === 2 ? 'gemelar' : 'trigemelar'}, ${dadosGerais.corionicidade || 'dicoriônica'} e ${dadosGerais.amnionicidade || 'diamniótica'}.\n`;
        
        // Descrição das posições
        if (resF1) textoFinal += `Feto I: ${dadosGerais.localizacaoFeto1 || 'Localização habitual'}.\n`;
        if (resF2) textoFinal += `Feto II: ${dadosGerais.localizacaoFeto2 || 'Localização habitual'}.\n`;
        if (resF3) textoFinal += `Feto III: ${dadosGerais.localizacaoFeto3 || 'Localização habitual'}.\n`;
        textoFinal += `\n`;
    }

    // --- FETO I ---
    if (qtdFetos > 1) textoFinal += `--- FETO I ---\n`;
    textoFinal += resF1.texto;

    // --- FETO II ---
    if (qtdFetos >= 2 && resF2) {
        textoFinal += `\n\n--- FETO II ---\n`;
        textoFinal += resF2.texto; 
    }

    // --- FETO III ---
    if (qtdFetos >= 3 && resF3) {
        textoFinal += `\n\n--- FETO III ---\n`;
        textoFinal += resF3.texto;
    }

    return textoFinal;
};

export const montarTextoFinal = (res) => res.texto;