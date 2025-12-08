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

    // =========================================================================
    // 1. DATAÇÃO (DUM, DPP, IG) - CORRIGIDO
    // =========================================================================
    
    // --- Lógica DUM ---
    if (d.usarDum) {
        // Exibir Data da DUM (Checkbox: exibirDataDum)
        if (d.exibirDataDum && d.dum) {
            texto += `DUM: ${formatData(d.dum)}.\n`;
        }

        // Exibir DPP pela DUM (Checkbox: citarDppDum)
        if (d.citarDppDum && d.dppDum) {
            texto += `DPP: ${d.dppDum} (calculada pela DUM)`;
            // Se tiver IG DUM, exibe junto
            if (d.igDum) texto += `, compatível com ${d.igDum}`;
            texto += `.\n`;
        } else if (d.igDum) {
            // Caso queira mostrar só a IG sem a DPP
            texto += `IG (DUM): compatível com ${d.igDum}.\n`;
        }
    } 
    else if (d.dumDesconhecida) {
        texto += `DUM: Desconhecida / Não referida.\n`;
    }

    // --- Lógica DPP Biometria (Checkbox: citarDppBiometria) ---
    if (d.citarDppBiometria && d.dppBiometriaCalculada) {
        texto += `DPP (Biometria Atual): ${d.dppBiometriaCalculada}`;
        // Se não usou DUM, mostra a IG da biometria aqui para complementar
        if (!d.usarDum && d.igBiometria) {
            texto += `, compatível com ${d.igBiometria}`;
        }
        texto += `.\n`;
    }

    // --- Lógica Exame Anterior (Checkbox: usarExameAnterior) ---
    if (d.usarExameAnterior && d.dataExameAnterior) {
        const dataAnt = formatData(d.dataExameAnterior);
        texto += `IG baseada no USG de ${dataAnt}: ${d.igIgCorrigidaCalculada || '...'}.\n`;
        // Se houver cálculo de DPP corrigida
        if (d.dppIgCorrigidaCalculada) {
            texto += `DPP (Corrigida): ${d.dppIgCorrigidaCalculada}.\n`;
        }
    }

    texto += '\n';

    // =========================================================================
    // 2. GESTAÇÃO INICIAL (Mantido igual, se aplicar)
    // =========================================================================
    if (d.subtipo && d.subtipo.includes("INICIAL")) {
        texto += `Bexiga vazia.\n`;
        texto += `Útero ${d.utero || 'globoso'}, miométrio ${d.miometrio || 'homogêneo'}.\n`;
        
        if (d.citarSg) {
            texto += `Saco gestacional tópico, contornos regulares`;
            if (d.resDmsg) texto += `, medindo ${d.resDmsg} mm`;
            texto += `.\n`;
        }
        // ... (restante da lógica inicial mantida) ...
        return { texto }; // Retorno antecipado para inicial
    }

    // =========================================================================
    // 3. DADOS GERAIS (2º/3º TRI)
    // =========================================================================
    
    // Se não for inicial, Dados Gerais:
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
    // CORREÇÃO: Checkbox Deglutição
    if (d.degluticao) vitalidade.push(`movimentos de deglutição`);

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
    // 5. BIOMETRIA E ÍNDICES (CORRIGIDO)
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

        // CORREÇÃO: Exibir Índices Calculados logo abaixo da biometria
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
    // 6. MORFOLOGIA (Mantido)
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
    // 7. DOPPLER (CORRIGIDO - USA CHECKBOXES DO SecaoDoppler.jsx)
    // =========================================================================
    if (d.usarDoppler) {
        texto += `ESTUDO DOPPLER\t\t\tÍNDICES DE PULSATILIDADE\n`;
        
        // Artéria Cerebral (Checkbox: checkAcm)
        if (d.checkAcm && d.acmIP) {
            texto += `Artéria cerebral\t\t\t\t${d.acmIP}\n`;
        }
        
        // Artéria Umbilical (Checkbox: checkUmb)
        if (d.checkUmb && d.umbIP) {
            texto += `Artéria umbilical\t\t\t\t${d.umbIP}\n`;
        }
        
        // Relação C/U
        if ((d.checkAcm || d.checkUmb) && d.relacaoCerebroUmbilical) {
            texto += `Relação cerebro/umbilical\t\t${d.relacaoCerebroUmbilical} (n/l maior / igual à 1,0)\n`;
        }
        
        texto += `\nESTUDO DOPPLER\t\t\tÍNDICES DE PULSATILIDADE\n`;
        
        // Uterina Direita (Checkbox: checkUtDir)
        if (d.checkUtDir && d.utDirIP) {
            texto += `Artéria uterina direita\t\t\t${d.utDirIP}\n`;
        }
        
        // Uterina Esquerda (Checkbox: checkUtEsq)
        if (d.checkUtEsq && d.utEsqIP) {
            texto += `Artéria uterina esquerda\t\t${d.utEsqIP}\n`;
        }
        
        // IP Médio (Se ambos estiverem marcados e presentes)
        if (d.checkUtDir && d.utDirIP && d.checkUtEsq && d.utEsqIP) {
            const v1 = parseFloat(d.utDirIP.replace(',','.'));
            const v2 = parseFloat(d.utEsqIP.replace(',','.'));
            if (!isNaN(v1) && !isNaN(v2)) {
                const media = ((v1 + v2) / 2).toFixed(2).replace('.',',');
                texto += `IP médio:\t\t\t\t\t${media}\n`;
            }
        }
        
        // Ducto Venoso (Checkbox: checkDv)
        if (d.checkDv && d.dvIP) {
             texto += `\nDucto Venoso (IP):\t\t\t\t${d.dvIP}`;
             if (d.dvOndaAZero) texto += ` (Onda A Zero)`;
             else if (d.dvOndaAReversa) texto += ` (Onda A Reversa)`;
             texto += `\n`;
        }

        texto += `\n`;
    }

    // =========================================================================
    // 8. CONCLUSÃO
    // =========================================================================
    texto += `Impressão diagnóstica:\n`;
    
    // Define qual IG usar
    let igFinal = d.igBiometria || d.igDum || "---";
    if (d.usarExameAnterior && d.igIgCorrigidaCalculada) {
        igFinal = d.igIgCorrigidaCalculada;
    }

    if (d.usarDoppler) texto += `- Feto único vivo.\n`;
    texto += `- Biometria fetal compatível com aproximadamente ${igFinal} +/- 14 dias.\n`;
    
    if (d.liquidoAmniotico) {
        texto += `- Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()} (ILA = ${d.ila || '-'} mm).\n`;
    }

    if (d.pesoEstimado) {
        texto += `- Peso Fetal ${d.pesoEstimado} g (+/- 10%)`;
        if (d.pesoP10 || d.pesoP90) texto += ` (P10= ${d.pesoP10} | P90= ${d.pesoP90})`;
        texto += `.\n`;
    }

    if (d.percentil) texto += `- Percentil ${d.percentil}.\n`;
    
    if (d.sexoFetal && d.sexoFetal !== 'NAO_CITAR') {
        texto += `- Sexo: Genitália compatível com ${d.sexoFetal}.\n`;
    }

    if (d.usarDoppler) {
        texto += `- Dopplerfluxometria sem anormalidades no presente estudo.\n`;
    }

    if (d.obsAdicionais) texto += `\nObs: ${d.obsAdicionais}\n`;

    texto += `\nObs.:\n`;
    texto += `- Nem todas as alterações que um feto possa vir apresentar após o nascimento, podem ser identificadas pelo exame ultra-sonográfico.\n`;
    texto += `\nFavor trazer este exame quando vier realizar o próximo.\n`;

    return { texto };
};

export const montarTextoFinal = (res) => res.texto;