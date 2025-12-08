import { formatData } from './obstetricCalculations';

// --- HELPERS ---

// Helper para alinhar Biometria (Estilo Tabela da Médica)
// Mantém a lógica: se não tiver valor, não retorna nada.
const formatBioLine = (label, value, unit = 'mm') => {
    if (!value) return null;
    // Cria uma linha com pontinhos para alinhar visualmente (simulando tabulação)
    const spaces = 45 - label.length; 
    const dots = ".".repeat(Math.max(0, spaces)); 
    // O \t ajuda em alguns editores, os dots ajudam visualmente
    return `${label} ${dots} ${value} ${unit}.`; 
};

// Helper para listar itens normais (Morfologia) - SUA LÓGICA ORIGINAL MANTIDA
const listarNormais = (itens) => {
    const validos = itens.filter(i => i.checked).map(i => i.label);
    if (validos.length === 0) return null;
    if (validos.length === 1) return `Visualizado ${validos[0]} de aspecto normal.`;
    const ultimo = validos.pop();
    return `Visualizados ${validos.join(', ')} e ${ultimo} de aspecto normal.`;
};

// --- FUNÇÃO PRINCIPAL ---

export const gerarRelatorioFeto = (d) => {
    let texto = '';
    
    // Título é gerado externamente ou aqui se preferir, vou focar no corpo do texto.
    // texto += `ULTRASSONOGRAFIA OBSTÉTRICA\n\n`;

    // =========================================================================
    // 1. DATAÇÃO (Lógica Original + Fraseado da Médica)
    // =========================================================================
    
    let dppTexto = '';
    let igTexto = '';

    // Lógica DUM
    if (d.usarDum) {
        if (d.dppDum) dppTexto = `${d.dppDum} (calculada pela DUM)`;
        if (d.igDum) igTexto = d.igDum;
    } 
    // Lógica Exame Anterior (Sobrescreve se marcado)
    if (d.usarExameAnterior && d.dataExameAnterior) {
        // Fraseado da médica: "DPP: --- (calculada pelo primeiro ultrassom)"
        dppTexto = `--- (calculada pelo primeiro ultrassom)`; 
        if (d.igIgCorrigidaCalculada) igTexto = d.igIgCorrigidaCalculada;
    }
    // Lógica Biometria (Último caso)
    else if (!d.usarDum && !d.usarExameAnterior) {
        dppTexto = `--- (calculada pela biometria atual)`;
        if (d.igBiometria) igTexto = d.igBiometria;
    }

    // Monta a linha da Datação se houver dados
    if (igTexto) {
        if (dppTexto) texto += `DPP: ${dppTexto}, `;
        texto += `compatível com ${igTexto}.\n\n`;
    } else if (d.dumDesconhecida) {
        texto += `DUM: Desconhecida / Não referida.\n\n`;
    }

    // =========================================================================
    // 2. GESTAÇÃO INICIAL / 1º TRIMESTRE (Lógica Específica)
    // =========================================================================
    if (d.subtipo && d.subtipo.includes("INICIAL")) {
        
        texto += `Bexiga vazia.\n`;
        // Tenta usar campo novo 'utero', senão fallback genérico
        texto += `Útero ${d.utero || 'globoso, aumentado de volume'}, de contornos regulares e miométrio ${d.miometrio || 'homogêneo'}.\n\n`;

        // Saco Gestacional (Respeita Checkbox 'citarSg')
        if (d.citarSg) {
            texto += `Observa-se na cavidade uterina, saco gestacional de contornos regulares`;
            if (d.resDmsg) texto += ` medindo ${d.resDmsg} mm`; // Usando o cálculo da média
            
            // Embrião (Respeita Checkbox 'embriaoNaoVisualizado')
            if (d.embriaoNaoVisualizado) {
                 texto += `, contendo no seu interior vesícula vitelina ${d.citarVv ? 'visualizada' : ''}`;
                 texto += `, porém sem embrião caracterizado no momento.\n`;
            } else {
                texto += `, contendo no seu interior embrião`;
                
                // BCF (Lógica original)
                if (d.bcfIndetectavel) {
                    texto += `, com batimentos cardíacos indetectáveis`;
                } else if (d.bcf) {
                    texto += `, com batimentos cardíacos presentes (${d.bcf} BPM)`;
                }

                // CCN (Lógica original)
                if (d.ccn) {
                    texto += `, medindo ${d.ccn} mm de CCN`;
                }
                texto += `.\n`;
            }
        }

        texto += `\nAs vilosidades placentárias tem inserção ${d.trofoblasto || 'normal'}.\n`;
        
        if (d.sgSemDescolamento) {
            texto += `Não se observa coágulo intra uterino.\n`;
        } else if (d.sgComDescolamento) {
            texto += `Observa-se área de descolamento medindo ${d.desc1 || '-'} x ${d.desc2 || '-'} mm.\n`;
        }

        texto += `O orifício interno do colo permanece fechado`;
        if (d.comprimentoColo) texto += `, medindo ${d.comprimentoColo} mm`;
        texto += `.\n`;

        texto += `Anexos parauterinos normais.\n`;

        // Pula para impressão diagnóstica se for só inicial
        // Mas vamos deixar o fluxo seguir caso tenha algo mais
    }
    
    // =========================================================================
    // 3. DADOS GERAIS (2º/3º TRI e MORFOLÓGICO)
    // =========================================================================
    else {
        // Bexiga Materna (Respeita select)
        if (d.bexigaMaterna && d.bexigaMaterna !== 'não citar' && d.bexigaMaterna !== 'não visualizada') {
             // A médica geralmente usa "Bexiga materna não visualizada" ou "Bexiga vazia" no início
             // Vamos manter simples se o usuário selecionou algo específico
             texto += `Bexiga materna ${d.bexigaMaterna}.\n`;
        } else if (d.subtipo === 'OBSTETRICO_DOPPLER') {
             texto += `Bexiga materna não visualizada.\n`;
        }

        texto += `Gestação tópica, feto único.\n`;
        texto += `Situação ${d.situacao}, apresentação ${d.apresentacao} e com dorso ${d.dorso}.\n\n`;

        // Vitalidade (Lógica original de presença)
        let vitalidade = [];
        if (d.bcf) vitalidade.push(`Batimentos cardíacos`);
        if (d.movFetal) vitalidade.push(`movimentos fetais presentes`);
        
        if (vitalidade.length > 0) {
            texto += `${vitalidade.join(' e ')}`;
            if (d.bcf) texto += ` (${d.bcf} bpm)`;
            texto += `.\n`;
        }

        // Vísceras (Respeita Checkboxes)
        if (d.estomagoVisualizado) {
            texto += `Estômago fetal repleto e de conteúdo anecóide.\n`;
        }
        if (d.bexigaVisualizada) {
            texto += `Bexiga fetal repleta e de conteúdo anecóide.\n`;
        }
        texto += `\n`;
    }

    // =========================================================================
    // 4. PLACENTA E LÍQUIDO (Comum a todos exceto inicial muito precoce)
    // =========================================================================
    if (!d.subtipo?.includes("INICIAL")) {
        // Placenta
        if (d.placentaLocalizacao || d.placentaGrau) {
            texto += `Placenta de inserção ${d.placentaLocalizacao || 'corporal'}, homogênea, grau ${d.placentaGrau || '0'}, na escala de Grannum`;
            texto += ` e de espessura normal`; // Frase padrão dela
            if (d.placentaEspessura) texto += `, medindo ${d.placentaEspessura} mm`;
            texto += `.\n`;
        }

        // Líquido
        if (d.liquidoAmniotico) {
            texto += `Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()} para idade gestacional`;
            if (d.ila) {
                texto += ` (ILA= ${d.ila} mm)`;
                // Adiciona ref se existir
                if (d.ilaRefMin || d.ilaRefMax) texto += ` (Ref: ${d.ilaRefMin || ''} - ${d.ilaRefMax || ''})`;
            }
            texto += `.\n`;
        }
        texto += `\n`;
    }

    // =========================================================================
    // 5. BIOMETRIA (Layout Tabela da Médica)
    // =========================================================================
    // Só exibe cabeçalho se tiver alguma medida
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
            // Ossos longos e morfologia (Lógica: só mostra se tiver valor)
            formatBioLine('Ulna', d.ulna),
            formatBioLine('Rádio', d.radio),
            formatBioLine('Tíbia', d.tibia),
            formatBioLine('Fíbula', d.fibula),
            formatBioLine('Cerebelo', d.cerebelo),
            formatBioLine('Cisterna Magna', d.cisternaMagna),
            formatBioLine('Prega Nucal', d.pregaNucal),
            formatBioLine('Osso nasal', d.ossoNasal || d.morf1OssoNasal), // Tenta pegar de ambos
            formatBioLine('Translucência Nucal', d.tnMedida)
        ].filter(Boolean); // Remove linhas vazias

        texto += bioLines.join('\n') + `\n\n`;
    }

    // =========================================================================
    // 6. MORFOLOGIA (Respeita Checkboxes e Função listarNormais)
    // =========================================================================
    
    // Morfologia 1º Tri
    if (d.subtipo?.includes("1_TRI")) {
         const morf1 = [
            { label: 'calota craniana', checked: d.morf1Cerebro },
            { label: 'estômago', checked: d.morf1Estomago },
            { label: 'inserção do cordão', checked: d.morf1Cordao },
            { label: 'membros superiores e inferiores', checked: d.morf1Membros },
            { label: 'globos oculares', checked: d.morf1Globos },
        ];
        const textoMorf1 = listarNormais(morf1);
        if (textoMorf1) texto += `Análise Morfológica:\n${textoMorf1}\n\n`;
    }
    
    // Morfologia 2º/3º Tri
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
        const textoMorf2 = listarNormais(morfList);
        if (textoMorf2) texto += `Análise Morfológica:\n${textoMorf2}\n\n`;
    }

    // =========================================================================
    // 7. DOPPLER (Lógica: Checkbox 'usarDoppler')
    // =========================================================================
    if (d.usarDoppler) {
        // Layout Tabela da Médica
        texto += `ESTUDO DOPPLER\t\t\tÍNDICES DE PULSATILIDADE\n`;
        
        // Só adiciona a linha se tiver o valor
        if (d.acmIP) texto += `Artéria cerebral\t\t\t\t${d.acmIP}\n`;
        if (d.umbIP) texto += `Artéria umbilical\t\t\t\t${d.umbIP}\n`;
        if (d.relacaoCerebroUmbilical) texto += `Relação cerebro/umbilical\t\t${d.relacaoCerebroUmbilical} (n/l maior / igual à 1,0)\n`;
        
        texto += `\nESTUDO DOPPLER\t\t\tÍNDICES DE PULSATILIDADE\n`;
        if (d.utDirIP) texto += `Artéria uterina direita\t\t\t${d.utDirIP}\n`;
        if (d.utEsqIP) texto += `Artéria uterina esquerda\t\t${d.utEsqIP}\n`;
        
        // Calcula IP médio se tiver os dois (Lógica extra de ajuda)
        if (d.utDirIP && d.utEsqIP) {
             const v1 = parseFloat(d.utDirIP.replace(',','.'));
             const v2 = parseFloat(d.utEsqIP.replace(',','.'));
             if (!isNaN(v1) && !isNaN(v2)) {
                 const media = ((v1 + v2) / 2).toFixed(2).replace('.',',');
                 texto += `IP médio:\t\t\t\t\t${media}\n`;
             }
        }
        texto += `\n`;
    }

    // =========================================================================
    // 8. CONCLUSÃO / IMPRESSÃO DIAGNÓSTICA
    // =========================================================================
    texto += `Impressão diagnóstica:\n`;

    // A. Lógica INICIAL
    if (d.subtipo?.includes("INICIAL")) {
        const igFinal = d.resIgCcn || d.igDum || "---";
        texto += `- Gestação tópica de aproximadamente ${igFinal} (+/- 5 dias).\n`;
    } 
    // B. Lógica OBSTÉTRICA GERAL
    else {
        if (d.usarDoppler) texto += `- Feto único vivo.\n`;
        
        // IG Final
        let igFinal = d.igBiometria || d.igDum || "---";
        if (d.usarExameAnterior && d.igIgCorrigidaCalculada) igFinal = d.igIgCorrigidaCalculada;
        
        texto += `- Biometria fetal compatível com aproximadamente ${igFinal} +/- 14 dias.\n`;
        
        // Líquido na Conclusão
        if (d.liquidoAmniotico) {
            texto += `- Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()} para idade gestacional`;
             if (d.ila) texto += ` (ILA = ${d.ila} mm)`;
             if (d.ilaRefMin || d.ilaRefMax) texto += ` (Ref: ${d.ilaRefMin || ''} - ${d.ilaRefMax || ''})`;
             texto += `.\n`;
        }

        // Peso com P10/P90 (Lógica: só mostra se preenchido)
        if (d.pesoEstimado) {
            texto += `- Peso Fetal ${d.pesoEstimado} gr (+/- 10%)`;
            if (d.pesoP10 || d.pesoP90) {
                texto += ` (P10= ${d.pesoP10 || '?'}  P90= ${d.pesoP90 || '?'})`;
            }
            texto += `.\n`;
        }

        if (d.percentil) texto += `- Percentil ${d.percentil}\n`;

        // Sexo (Respeita select)
        if (d.sexoFetal && d.sexoFetal !== 'NAO_CITAR') {
             let sexoTexto = d.sexoFetal;
             if (d.sexoFetal === 'MASCULINO' || d.sexoFetal === 'FEMININO') {
                 sexoTexto = `compatível com ${d.sexoFetal}`;
             }
             texto += `- Sexo: Genitália ${sexoTexto}.\n`;
        }

        if (d.usarDoppler) {
            texto += `- Dopplerfluxometria sem anormalidades no presente estudo.\n`;
        }
    }
    
    // Obs Adicionais do usuário
    if (d.obsAdicionais) {
        texto += `\nObs: ${d.obsAdicionais}\n`;
    }

    // Disclaimer Obrigatório da Médica
    texto += `\nObs.:\n`;
    texto += `- Nem todas as alterações que um feto possa vir apresentar após o nascimento, podem ser identificadas pelo exame ultra-sonográfico, devendo-se levar em consideração as limitações técnicas inerentes ao método e a idade gestacional em que o feto foi examinado, bem como a posição do mesmo no momento do exame.\n`;
    
    texto += `\nFavor trazer este exame quando vier realizar o próximo\n`;
    texto += `A imagem diagnóstica não é absoluta, devendo ser interpretada pelo médico assistente em conjunto com o exame físico e demais exames complementares.`;

    return { texto };
};

export const montarTextoFinal = (res) => res.texto;