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
    // 1. DATAÇÃO (DUM, DPP, IG)
    // =========================================================================
    
    // --- Lógica DUM ---
    if (d.usarDum) {
        if (d.exibirDataDum && d.dum) {
            texto += `DUM: ${formatData(d.dum)}.\n`;
        }

        if (d.citarDppDum && d.dppDum) {
            texto += `DPP: ${d.dppDum} (calculada pela DUM)`;
            if (d.igDum) texto += `, compatível com ${d.igDum}`;
            texto += `.\n`;
        } else if (d.igDum) {
            texto += `IG (DUM): compatível com ${d.igDum}.\n`;
        }
    } 
    else if (d.dumDesconhecida) {
        texto += `DUM: Desconhecida / Não referida.\n`;
    }

    // --- Lógica DPP Biometria ---
    if (d.citarDppBiometria && d.dppBiometriaCalculada) {
        texto += `DPP (Biometria Atual): ${d.dppBiometriaCalculada}`;
        if (!d.usarDum && d.igBiometria) {
            texto += `, compatível com ${d.igBiometria}`;
        }
        texto += `.\n`;
    }

    // --- Lógica Exame Anterior ---
    if (d.usarExameAnterior && d.dataExameAnterior) {
        const dataAnt = formatData(d.dataExameAnterior);
        texto += `IG baseada no USG de ${dataAnt}: ${d.igIgCorrigidaCalculada || '...'}.\n`;
        if (d.dppIgCorrigidaCalculada) {
            texto += `DPP (Corrigida): ${d.dppIgCorrigidaCalculada}.\n`;
        }
    }

    texto += '\n';

    // =========================================================================
    // 2. GESTAÇÃO INICIAL
    // =========================================================================
    if (d.subtipo && d.subtipo.includes("INICIAL")) {
        texto += `Bexiga vazia.\n`;
        texto += `Útero ${d.utero || 'globoso'}, miométrio ${d.miometrio || 'homogêneo'}.\n`;
        
        if (d.citarSg) {
            texto += `Saco gestacional tópico, contornos regulares`;
            if (d.resDmsg) texto += `, medindo ${d.resDmsg} mm`;
            texto += `.\n`;
        }

        if (d.embriaoNaoVisualizado) {
             texto += `Sem embrião visualizado no momento.\n`;
             if (d.citarVv) texto += `Vesícula vitelina visualizada.\n`;
        } else {
             texto += `Embrião visualizado`;
             if (d.ccn) texto += `, medindo ${d.ccn} mm de CCN`;
             if (d.bcf) texto += `, com BCF presentes (${d.bcf} bpm)`;
             texto += `.\n`;
        }

        texto += `\nAs vilosidades placentárias tem inserção ${d.trofoblasto || 'normal'}.\n`;
        
        if (d.sgSemDescolamento) texto += `Não se observa coágulo intra uterino.\n`;
        
        texto += `O orifício interno do colo permanece fechado`;
        if (d.comprimentoColo) texto += `, medindo ${d.comprimentoColo} mm`;
        texto += `.\n`;
        
        texto += `Anexos parauterinos normais.\n`;

        // Retorna o objeto completo com título
        return { texto, tituloExame }; 
    }

    // =========================================================================
    // 3. DADOS GERAIS (2º/3º TRI)
    // =========================================================================
    
    if (d.bexigaMaterna && d.bexigaMaterna !== 'não citar' && d.bexigaMaterna !== 'não visualizada') {
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
    if (d.degluticao) vitalidade.push(`movimentos de deglutição`); // <--- Novo

    if (vitalidade.length > 0) {
        texto += `${vitalidade.join(' e ')} presentes.\n`;
    }

    if (d.estomagoVisualizado) texto += `Estômago fetal repleto e de conteúdo anecóide.\n`;
    if (d.bexigaVisualizada) texto += `Bexiga fetal repleta e de conteúdo anecóide.\n`;
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
        if (d.ila) {
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
            formatBioLine('Cerebelo', d.cerebelo),
            formatBioLine('Cisterna Magna', d.cisternaMagna),
            formatBioLine('Prega Nucal', d.pregaNucal),
            formatBioLine('Osso nasal', d.ossoNasal || d.morf1OssoNasal),
            formatBioLine('Translucência Nucal', d.tnMedida)
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

    if (d.usarDoppler) texto += `- Feto único vivo.\n`;
    texto += `- Biometria fetal compatível com aproximadamente ${igFinal} +/- 14 dias.\n`;
    
    if (d.liquidoAmniotico) {
        texto += `- Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()} (ILA = ${d.ila || '-'} mm).\n`;
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

    // === FRASES EXTRAS / SUGESTÕES ===

    // Frase do Doppler/RCIU
    if (d.sugereDopplerRciu) {
        texto += `- Sob julgamento clínico seria conveniente o acompanhamento do crescimento e vitalidade fetal devido ao percentil menor que 10, com ultrassom obstétrico com Doppler.\n`;
    }

    // Obs Adicionais Digitadas
    if (d.obsAdicionais) texto += `\nObs: ${d.obsAdicionais}\n`;

    // --- BLOCO DE OBSERVAÇÕES FINAIS (Disclaimer) ---
    texto += `\nObs.:\n`;
    
    // Frase do Morfológico Prejudicado
    if (d.morfoPrejudicado45mm) {
        texto += `- Não foi possível realizar Morfológico de primeiro trimestre, devido ao CCN menor que 45 mm. Sob julgamento clínico seria conveniente realizar morfológico entre 11 e 14 semanas.\n`;
    }

    // Frase do NIPT
    if (d.sugereNipt) {
        texto += `- Sob julgamento clínico seria conveniente o estudo genético (NIPT), devido ao risco menor de 1 em 300.\n`;
    }

    texto += `- Nem todas as alterações que um feto possa vir apresentar após o nascimento, podem ser identificadas pelo exame ultra-sonográfico.\n`;

    return { texto, tituloExame };
};

export const montarTextoFinal = (res) => res.texto;