import { formatData } from './obstetricCalculations';

// Helper para alinhar pontinhos (Biometria)
const formatLine = (label, value, unit = 'mm') => {
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
    let texto = `ULTRASSONOGRAFIA OBSTÉTRICA${d.usarDoppler ? ' COM DOPPLERFLUXOMETRIA' : ''}\n\n`;
    
    // =========================================================================
    // 1. DATAÇÃO (DUM, DPP, IG)
    // =========================================================================
    if (d.usarDum) {
        const partesDum = [];
        if (d.exibirDataDum && d.dum) partesDum.push(`DUM: ${formatData(d.dum)}`);
        if (d.citarDppDum && d.dppDum) partesDum.push(`DPP: ${d.dppDum}`);
        if (d.igDum) partesDum.push(`IG (DUM): ${d.igDum}`);
        
        if (partesDum.length > 0) texto += partesDum.join('  //  ') + '.\n';
    } 
    else if (d.dumDesconhecida) {
        texto += `DUM: Desconhecida / Não referida.\n`;
    }

    // Exame Anterior
    if (d.usarExameAnterior && d.dataExameAnterior) {
        const dataAnt = formatData(d.dataExameAnterior);
        texto += `IG baseada no USG de ${dataAnt} (${d.igAnteriorSemanas}s ${d.igAnteriorDias}d): ${d.igIgCorrigidaCalculada || '...'}.\n`;
        if (d.citarDppCorrigida && d.dppIgCorrigidaCalculada) {
            texto += `DPP (Corrigida): ${d.dppIgCorrigidaCalculada}.\n`;
        }
    }

    // DPP Biometria
    if (d.citarDppBiometria && d.dppBiometriaCalculada) {
        texto += `DPP (Biometria Atual): ${d.dppBiometriaCalculada}.\n`;
    }

    texto += '\n'; 

    // =========================================================================
    // 2. EMBRIÃO E 1º TRIMESTRE (SEÇÃO ESPECÍFICA)
    // =========================================================================
    if (d.subtipo && d.subtipo.includes("1_TRI")) {
        // Saco Gestacional
        if (d.citarSg) {
            texto += `Saco gestacional tópico, contornos regulares`;
            if (d.sgLocalizacao) texto += `, implantado na região ${d.sgLocalizacao}`;
            if (d.resDmsg) texto += `. DMSG: ${d.resDmsg} mm`;
            texto += `.\n`;
        }
        
        // Vesícula Vitelina
        if (d.citarVv) {
            texto += `Vesícula vitelina tópica, contornos regulares`;
            if (d.vvDiametro) texto += `, medindo ${d.vvDiametro} mm`;
            texto += `.\n`;
        }

        // Embrião / CCN
        if (d.embriaoNaoVisualizado) {
            texto += `Embrião não visualizado no presente exame.\n`;
        } else {
            if (d.ccn) {
                texto += `Embrião visualizado. Comprimento Cabeça-Nádegas (CCN): ${d.ccn} mm`;
                if (d.resIgCcn) texto += ` (IG: ${d.resIgCcn})`;
                texto += `.\n`;
            }
            
            // BCF Embrião
            if (d.bcfIndetectavel) {
                texto += `Batimentos cardiofetais indetectáveis ao Mapeamento Colorido e ao Doppler pulsado.\n`;
            } else if (d.bcf) {
                texto += `Batimentos cardiofetais presentes e rítmicos (${d.bcf} bpm).\n`;
            }
            
            // Vitalidade 1º Tri
            if (d.movFetal) texto += `Movimentos embrionários presentes.\n`;
        }

        // Translucência Nucal (TN)
        if (d.citarTn && d.tnMedida) {
            texto += `Translucência Nucal (TN): ${d.tnMedida} mm.\n`;
            if (d.tnObs) texto += `(Nota: A medida da TN é um marcador de rastreio, não diagnóstico).\n`;
            
            // Riscos
            if (d.tnRisco) {
                 texto += `Risco Basal (Idade): 1/${d.riscoBasal || '---'}.  Risco Corrigido (TN): 1/${d.riscoCorrigido || '---'}.\n`;
            }
        }

        // Morfologia 1º Tri (Ossos, Membros, etc)
        const morf1 = [
            { label: 'calota craniana', checked: d.morf1Cerebro },
            { label: 'estômago', checked: d.morf1Estomago },
            { label: 'inserção do cordão', checked: d.morf1Cordao },
            { label: 'membros superiores e inferiores', checked: d.morf1Membros },
            { label: 'globos oculares', checked: d.morf1Globos },
        ];
        const textoMorf1 = listarNormais(morf1);
        if (textoMorf1) texto += textoMorf1 + '\n';
        
        if (d.morf1OssoNasal && d.morf1OssoNasal !== 'não citar') {
            texto += `Osso nasal ${d.morf1OssoNasal}.\n`;
        }
        
        texto += '\n'; // Espaço antes do resto
    }

    // =========================================================================
    // 3. DADOS GERAIS (2º/3º TRI)
    // =========================================================================
    // Só mostramos dados gerais clássicos se NÃO for só um exame de embrião inicial
    if (!d.embriaoNaoVisualizado) {
        if (d.bexigaMaterna && d.bexigaMaterna !== 'não citar') {
            texto += `Bexiga materna ${d.bexigaMaterna}.\n`;
        }
        
        texto += `Feto único em situação ${d.situacao}, apresentação ${d.apresentacao} e dorso ${d.dorso}.\n`;

        // Vitalidade Fetal (2º/3º Tri)
        if (!d.subtipo?.includes("1_TRI")) {
             let vitalidade = [];
             if (d.bcf) vitalidade.push(`BCF rítmicos (${d.bcf} bpm)`);
             if (d.movFetal) vitalidade.push(`movimentos fetais ativos`); // Correção solicitada
             if (d.degluticao) vitalidade.push(`movimentos de deglutição`); // Correção solicitada
             
             if (vitalidade.length > 0) {
                 texto += `Vitalidade: ${vitalidade.join(', ')}.\n`;
             }

             // Vísceras Básicas
             if (d.estomagoVisualizado) texto += `Estômago visualizado.\n`;
             if (d.bexigaVisualizada) texto += `Bexiga visualizada.\n`;
        }
        texto += '\n';
    }

    // =========================================================================
    // 4. PLACENTA E LÍQUIDO
    // =========================================================================
    // Se for 1º Tri, placenta geralmente é descrita diferente, mas vamos manter o padrão se preenchido
    if (d.placentaLocalizacao || d.placentaGrau !== '0') {
        texto += `Placenta ${d.placentaLocalizacao}`;
        if (d.placentaGrau) texto += `, grau ${d.placentaGrau} (Grannum)`;
        if (d.placentaEspessura) texto += `, espessura ${d.placentaEspessura} mm`;
        texto += `.\n`;
    }
    
    if (d.liquidoAmniotico) {
        texto += `Líquido amniótico ${d.liquidoAmniotico.toLowerCase()}`;
        if (d.ila) texto += ` (ILA: ${d.ila} mm)`;
        texto += `.\n`;
    }
    texto += '\n';

    // =========================================================================
    // 5. BIOMETRIA (Corrigido: Ossos Longos e Índices)
    // =========================================================================
    if (d.dbp || d.cc || d.femur || d.ccn) { // Só mostra se tiver alguma medida
        texto += `Biometria Fetal:\n`;
        
        // Medidas Padrão
        const linhas = [
            formatLine('CCN (Cabeça-Nádegas)', d.ccn),
            formatLine('Diâmetro Biparietal (DBP)', d.dbp),
            formatLine('Diâmetro Occipitofrontal (DOF)', d.dof),
            formatLine('Circunferência Cefálica (CC)', d.cc),
            formatLine('Circunferência Abdominal (CA)', d.ca),
            formatLine('Comprimento do Fêmur', d.femur),
            formatLine('Comprimento do Úmero', d.umero),
            // Ossos Longos (Solicitado)
            formatLine('Ulna', d.ulna),
            formatLine('Rádio', d.radio),
            formatLine('Tíbia', d.tibia),
            formatLine('Fíbula', d.fibula),
            // Outros
            formatLine('Cerebelo', d.cerebelo),
            formatLine('Cisterna Magna', d.cisternaMagna),
            formatLine('Prega Nucal', d.pregaNucal),
        ].filter(Boolean).join('\n');
        texto += linhas + `\n`;

        // Índices Calculados (Solicitado)
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
    // 6. MORFOLOGIA FETAL (2º/3º Tri - Checklist)
    // =========================================================================
    const morfList = [
        { label: 'coluna vertebral', checked: d.morfColuna },
        { label: 'crânio', checked: d.morfCranio },
        { label: 'encéfalo', checked: d.morfCerebro }, // Cuidado com nome duplicado no state se houver
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

    const textoMorfologia = listarNormais(morfList);
    if (textoMorfologia) {
        texto += `Análise Morfológica:\n${textoMorfologia}\n\n`;
    }

    // =========================================================================
    // 7. DOPPLERFLUXOMETRIA (Corrigido: Incluir se checkbox marcado)
    // =========================================================================
    if (d.usarDoppler) {
        texto += `ESTUDO DOPPLERVELOCIMÉTRICO:\n`;
        
        if (d.artUterinaDirIP || d.artUterinaEsqIP) {
            texto += `- Artérias Uterinas: IP Dir: ${d.artUterinaDirIP || '--'} | IP Esq: ${d.artUterinaEsqIP || '--'}`;
            if (d.incisuraDir || d.incisuraEsq) texto += ` (Com incisura protodiastólica)`;
            texto += `\n`;
        }

        if (d.artUmbilicalIP) {
            texto += `- Artéria Umbilical: IP: ${d.artUmbilicalIP} | IR: ${d.artUmbilicalIR || '--'}`;
            if (d.umbilicalDiastole && d.umbilicalDiastole !== 'normal') texto += ` (Diástole: ${d.umbilicalDiastole})`;
            texto += `\n`;
        }

        if (d.artCerebralIP) {
            texto += `- Artéria Cerebral Média: IP: ${d.artCerebralIP} | V Máx: ${d.acmPVS || '--'} cm/s.\n`;
        }

        if (d.relacaoCerebroUmbilical) {
            texto += `- Relação Cérebro/Umbilical: ${d.relacaoCerebroUmbilical}\n`;
        }

        if (d.ductoVenosoIP) {
            texto += `- Ducto Venoso: IP: ${d.ductoVenosoIP} (Onda A: ${d.ductoVenosoOndaA || 'positiva'}).\n`;
        }
        texto += `Conclusão Doppler: Padrão hemodinâmico materno-fetal conservado.\n\n`;
    }

    // =========================================================================
    // 8. CONCLUSÃO
    // =========================================================================
    texto += `CONCLUSÃO:\n`;

    // A. Gestação / IG
    // Prioridade da IG Final: Anterior > DUM > Biometria > CCN
    let igFinal = d.usarDum ? d.igDum : (d.igBiometria || "---");
    if (d.usarExameAnterior && d.igIgCorrigidaCalculada) igFinal = d.igIgCorrigidaCalculada;
    if (d.subtipo?.includes("1_TRI") && d.resIgCcn) igFinal = d.resIgCcn;

    if (d.embriaoNaoVisualizado) {
        texto += `- Gestação inicial / Embrião não visualizado. Sugere-se controle evolutivo.\n`;
    } else {
        texto += `- Gestação tópica compatível com ${igFinal}.\n`;
    }

    // B. Peso e Sexo
    if (d.pesoEstimado) {
        texto += `- Peso Fetal Estimado: ${d.pesoEstimado} g (+/- 10%)`;
        if (d.percentil) texto += ` (Percentil: ${d.percentil})`;
        texto += `.\n`;
    }
    
    if (d.sexoFetal && d.sexoFetal !== 'NAO_VISUALIZADO' && d.sexoFetal !== 'NAO_CITAR') {
        texto += `- Sexo Fetal: ${d.sexoFetal}.\n`;
    }

    // C. Doppler (Resumo)
    if (d.usarDoppler) {
        texto += `- Dopplerfluxometria normal.\n`;
    }

    // D. Observações Extras (Digitadas manualmente no campo 'obsAdicionais' se houver)
    if (d.obsAdicionais) {
        texto += `- ${d.obsAdicionais}\n`;
    }

    texto += `\nObs: Exame realizado conforme solicitação médica.`;

    return { texto };
};

export const montarTextoFinal = (resultadoFeto1) => {
    return resultadoFeto1.texto;
};