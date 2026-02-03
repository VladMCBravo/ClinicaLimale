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

// HELPER NOVO: Garante que o texto do cordão seja igual em todos os lugares
const montarTextoCordao = (d) => {
    if (d.cordaoNormal === true || (d.cordaoCircular && d.cordaoCircular !== '')) {
        const cordaoParts = [];
        
        if (d.cordaoNormal === true) {
            cordaoParts.push("Cordão umbilical de aspecto característico, com inserção habitual, visualizando-se duas artérias e uma veia de calibres preservados");
        } else {
            // Caso não tenha marcado o normal, mas tenha circular, iniciamos a frase
            cordaoParts.push("Cordão umbilical");
        }
        
        if (d.cordaoCircular === 'ausente') {
            cordaoParts.push("ausência de circular cervical");
        } else if (d.cordaoCircular) {
            cordaoParts.push(`circular cervical: ${d.cordaoCircular}`);
        }
        
        if (cordaoParts.length > 0) {
            return cordaoParts.join('. ') + `.\n`;
        }
    }
    return '';
};

// HELPER NOVO: ÚTERO E MIOMAS (Mantém a lógica original + novos campos)
const montarTextoUtero = (d) => {
    let t = '';
    const isInicial = d.subtipo === 'OBSTETRICO_INICIAL';

    // Se o usuário marcou para citar medidas (Novo Painel)
    if (d.citarUteroMedidas && d.ut1 && d.ut2 && d.ut3) {
         t += `Útero em AVF, de contornos regulares e ecotextura homogênea, medindo ${d.ut1} x ${d.ut2} x ${d.ut3} mm.\n`;
    } 
    // Lógica Antiga (Select)
    else if (d.utero) {
         t += `Útero ${d.utero === 'globoso' ? 'globoso, aumentado de volume, de contornos regulares e miométrio homogêneo' : d.utero}.\n`;
    } 
    // Texto Padrão (Apenas para Inicial se nada for informado)
    else if (isInicial) {
         t += `Útero globoso, aumentado de volume, de contornos regulares e miométrio homogêneo.\n`;
    }

    // Miomas / Nódulos
    if (d.citarNodulo && d.nod1) {
        t += `Nota-se nódulo miometrial (${d.nodTipo || 'sugestivo de mioma'}) `;
        if(d.nodLocal) t += `em parede ${d.nodLocal}, `;
        t += `medindo ${d.nod1} x ${d.nod2} mm.\n`;
    }

    return t;
};

// HELPER NOVO: ANEXOS / OVÁRIOS (Lógica separada OD/OE)
const montarTextoAnexos = (d) => {
    let t = '';
    
    if(d.citarAnexos) {
        // Ovário Direito
        if (d.odVisualizado) {
            t += `Ovário Direito: Visualizado, de aspecto ${d.odAspecto || 'normal'}`;
            if (d.od1 && d.od2 && d.od3) {
                t += `, medindo ${d.od1} x ${d.od2} x ${d.od3} mm`;
                if (d.odVol) t += ` (Volume: ${d.odVol} cm³)`;
            }
            if (d.corpoLuteo === 'direito') t += `. Presença de corpo lúteo neste anexo`;
            t += `.\n`;
        } else {
            t += `Ovário Direito: Não visualizado ou não acessível neste exame.\n`;
        }

        // Ovário Esquerdo
        if (d.oeVisualizado) {
            t += `Ovário Esquerdo: Visualizado, de aspecto ${d.oeAspecto || 'normal'}`;
            if (d.oe1 && d.oe2 && d.oe3) {
                t += `, medindo ${d.oe1} x ${d.oe2} x ${d.oe3} mm`;
                if (d.oeVol) t += ` (Volume: ${d.oeVol} cm³)`;
            }
            if (d.corpoLuteo === 'esquerdo') t += `. Presença de corpo lúteo neste anexo`;
            t += `.\n`;
        } else {
            t += `Ovário Esquerdo: Não visualizado ou não acessível neste exame.\n`;
        }
    }
    return t;
};

// =============================================================================
// TEXTOS FIXOS / RODAPÉS
// =============================================================================
const TEXTO_RODAPE_PADRAO = `Favor trazer este exame quando vier realizar o próximo.\nA imagem diagnóstica não é absoluta, devendo ser interpretada pelo médico assistente em conjunto com o exame físico e demais exames complementares.`;

const TEXTO_OBS_MORFO_1 = "Obs.: A medida da translucência nucal consiste apenas em teste de rastreio e não um teste diagnóstico, devendo ser realizada entre a 11 e a 14 semanas de gestação. Este exame não substitui a ecocardiografia fetal.";

const TEXTO_OBS_MORFO_2 = "Obs.: Nem todas as alterações que um feto possa vir apresentar após o nascimento, podem ser identificadas pelo exame ultra-sonográfico, devendo-se levar em consideração as limitações técnicas inerentes ao método, posição assumida pelo feto e a idade gestacional. Ressaltamos que a eficácia do exame quando realizado entre 20 e 24 semanas é de 83%, fora deste período existem maiores restrições de diagnóstico. Este exame não substitui a ecocardiografia fetal.";

// FRASES DE CCN (Extraídas da imagem)
const FRASE_CCN_MENOR_45 = "Morfológico 1 trimestre: Não foi possível calcular o risco para trissomia do 21 por meio da medida da translucência nucal pois o feto com CCN abaixo de 45 mm.";
const FRASE_CCN_MAIOR_84 = "Morfológico 2 trimestre: Não foi possível calcular o risco para trissomia do 21 por meio da medida da translucência nucal pois o feto com CCN acima de 84 mm. Para essa fase de gestação, podem ser usados outros marcadores como medida da prega nucal e a presença e osso nasal, que no presente estudo encontram-se normais."

// FRASES DE MARCADORES
const TXT_GOLFBALL_LAUDO = "Nota-se a presença de foco ecogênico com ventrículo esquerdo (Golf Ball). O Golf Ball não é considerado malformação cardíaca e quando encontrado isoladamente não eleva o risco fetal para aneuploidias. Sugere-se a critério clínico, ampliação da propedêutica com ecocardiograma fetal.";
const TXT_PIELO_LAUDO = "Nota-se leve dilatação pielo-calicial (Pieloectasia). Quando isolada não eleva o risco fetal para aneuploidias e geralmente tem caráter benigno quando estável. Sugere-se acompanhamento evolutivo."

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

    // =========================================================================
    // 1. ESTABELECER A "FONTE DA VERDADE" (CRONOLOGIA ÚNICA)
    // =========================================================================
    // Aqui resolvemos o conflito: definimos a IG Final UMA ÚNICA VEZ.
    // O resto do laudo vai apenas ler estas variáveis.
    let igFinal = '';
    let dppFinal = '';
    let metodoTexto = '';

    // REGRA 0: OVERRIDE MANUAL (PRIORIDADE ABSOLUTA DA BIOMETRIA)
    // Se o médico marcou "Usar esta data no laudo", ignoramos todo o resto.
    if (d.citarDppBiometria && d.igBiometria) {
        igFinal = d.igBiometria;
        dppFinal = d.dppBiometriaCalculada;
        metodoTexto = '(Calculada pela biometria fetal atual)';
    }
    // REGRA 1: Veredito Automático (1º Tri / CCN / DUM Validada)
    else if (d.igVeredito) {
        igFinal = d.igVeredito;
        // Se for DUM, verificamos se o usuário quer citar a DPP
        if (d.metodoDatacao === 'DUM') {
            dppFinal = d.citarDppDum ? d.dppDum : ''; // Respeita o checkbox
        } else {
            dppFinal = d.dppBiometriaCalculada;
        }
        
        // Montagem do texto do método com RESPEITO AOS CHECKBOXES DA DUM
        if (d.metodoDatacao === 'DUM') {
            const trechoData = d.exibirDataDum ? `: ${formatData(d.dum)}` : '';
            metodoTexto = `(Compatível com a DUM referida${trechoData})`;
        } else if (d.metodoDatacao === 'CCN_REDATADO') {
            metodoTexto = '(Redatada pelo CCN)';
        } else {
            metodoTexto = '(Baseada no CCN)';
        }
                      
    } 
    // REGRA 2: USG Anterior
    else if (d.usarExameAnterior && d.igIgCorrigidaCalculada) {
        igFinal = d.igIgCorrigidaCalculada;
        dppFinal = d.dppIgCorrigidaCalculada;
        metodoTexto = `(Projetada a partir de USG anterior de ${formatData(d.dataExameAnterior)})`;
    } 
    // REGRA 3: Fallback Biometria
    else if (d.igBiometria) {
        igFinal = d.igBiometria;
        dppFinal = d.dppBiometriaCalculada;
        metodoTexto = '(Baseada na biometria fetal atual - Hadlock)';
    }

    // --- 1. TÍTULO DO EXAME ---
    const mapTitulos = {
        'OBSTETRICO_INICIAL': 'ULTRASSONOGRAFIA OBSTÉTRICA INICIAL',
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

    // -------------------------------------------------------------------------
    // 2. EXIBIÇÃO DA DATAÇÃO NO CABEÇALHO (USANDO A FONTE ÚNICA)
    // -------------------------------------------------------------------------
    if (igFinal) {
        // MUDANÇA: Removi o \n do final desta linha para não quebrar
        texto += `Idade Gestacional: ${igFinal} ${metodoTexto}.`; 
        
        // Exibe a DPP na MESMA LINHA (sem \n antes), apenas um espaço.
        // Como a linha agora começa com "Idade...", o sistema não vai mais 
        // arrancar a DPP para o topo, mantendo as duas juntas.
        if (dppFinal) {
            texto += ` DPP: ${dppFinal}.`;
        } else if (d.metodoDatacao === 'DUM' && d.citarDppDum && d.dppDum) {
             texto += ` DPP: ${d.dppDum}.`;
        }
        
        // Agora sim damos a quebra de linha final
        texto += `\n`;
    }

    // --- 3. CORPO DO LAUDO INICIAL (REFORMULADO) ---
    if (isInicial) {
        texto += `Bexiga vazia.\n`;
        
        // --- ÚTERO (USANDO HELPER) ---
        texto += montarTextoUtero(d);

        // === SACO GESTACIONAL (SÓ APARECE SE CHECKBOX ATIVO) ===
        if (d.citarSg) {
            texto += `Observa-se na cavidade uterina, saco gestacional de contornos regulares`;
            
            // Localização (Se selecionado)
            if(d.sgLocalizacao) texto += ` (${d.sgLocalizacao})`;
            
            // Medidas e DMSG (Se preenchido)
            if(d.sg1 && d.sg2 && d.sg3) {
                texto += ` medindo ${d.sg1} x ${d.sg2} x ${d.sg3} mm`;
                if(d.resDmsg) texto += ` (DMSG: ${d.resDmsg} mm)`;
            }
            
            // IG Pelo DMSG (Nova Solicitação)
            if(d.resIgSg) texto += ` (IG estimada: ${d.resIgSg})`;
            
            texto += `.\n`; // Fecha frase do SG

            // === EMBRIÃO E CONTEÚDO (Baseado no Select) ===
            if (d.embriaoStatus === 'presente') {
                 texto += `Visualiza-se embrião único, com batimentos cardíacos presentes`;
                 if(d.bcf) texto += ` (${d.bcf} BPM)`;
                 if(d.ccn) texto += `, medindo ${d.ccn} mm de CCN`;
                 texto += `.\n`;
            } 
            else if (d.embriaoStatus === 'ausente') {
                 // Vesícula Vitelina
                 texto += `Vesícula vitelina visualizada. Embrião não caracterizado no momento.\n`;
            }
            else if (d.embriaoStatus === 'anembrionada') {
                 texto += `Ausência de embrião ou vesícula vitelina (Gestação anembrionada).\n`;
            }
            else if (d.embriaoNaoVisualizado) { // Fallback antigo
                 texto += `Embrião não caracterizado.\n`;
            }

            // === TROFOBLASTO (Só aparece se selecionado) ===
            if(d.trofoblasto && d.trofoblasto !== '') {
                texto += `As vilosidades placentárias tem inserção ${d.trofoblasto}.\n`;
            }
            
            // Hematomas / Descolamentos
            if(d.sgComDescolamento) texto += `OBS: Hematoma subcoriônico medindo ${d.desc1} x ${d.desc2} mm.\n`;
            else if (d.sgSemDescolamento) texto += `Não se observa coágulo intra uterino.\n`;
        }

        // --- ANEXOS (USANDO HELPER) ---
        texto += montarTextoAnexos(d);
                                
        texto += `\n`; // Espaço final

    } else {
        // Exames de 2º/3º Tri e Morfológicos
        if (d.bexigaMaterna && d.bexigaMaterna !== 'não citar') {
            texto += `Bexiga materna ${d.bexigaMaterna}.\n`;
        }
        
        texto += `Gestação tópica, feto único.\n`; 
        
        // 1. Situação
if (d.situacao) {
    texto += `Situação fetal ${d.situacao}. `;
}

// 2. Apresentação
if (d.apresentacao) {
    texto += `Apresentação ${d.apresentacao}. `;
}

// 3. Dorso
if (d.dorso) {
    texto += `Dorso ${d.dorso}. `; // Ajustei para "Dorso à direita/esquerda" ficar mais natural
}

// Adiciona quebra de linha se algum dado fetal foi inserido
if (d.situacao || d.apresentacao || d.dorso) {
    texto += `\n`;
}

        // --- VITALIDADE FETAL (CORRIGIDO) ---
        const textoVitalidade = [];
        if (d.bcf) textoVitalidade.push(`Batimentos cardíacos fetais presentes e rítmicos (${d.bcf} bpm)`);
        
        // CORREÇÃO MOV. FETAIS
        if (d.movFetal) textoVitalidade.push(`movimentação fetal ativa presente`);
        if (d.degluticao) textoVitalidade.push(`movimentos de deglutição observados`);
        
        if (textoVitalidade.length > 0) texto += textoVitalidade.join(', ') + `.\n`;

        if (d.estomagoVisualizado) texto += `Estômago fetal repleto e de conteúdo anecóide.\n`;
        if (d.bexigaVisualizada) texto += `Bexiga fetal repleta e de conteúdo anecóide.\n`;
        
        texto += `\n`;
        // >>> INSERÇÃO CIRÚRGICA: DADOS MATERNOS NO MORFOLÓGICO <<<
        // Adicionamos aqui para que apareça antes da Análise Fetal
        if (d.citarUteroMedidas || d.citarNodulo || d.citarAnexos) {
            texto += montarTextoUtero(d);
            texto += montarTextoAnexos(d);
            texto += `\n`; // Espaçamento
        }
    }

    // -------------------------------------------------------------------------
    // 4. LÓGICA DE ORDEM DAS SEÇÕES (ATUALIZADO COM FRASES DA MÉDICA)
    // -------------------------------------------------------------------------

    // === CASO A: OBSTÉTRICO PADRÃO / DOPPLER ===
    if (isStandard) {
        
        // 1. Análise Fetal (Se houver checkboxes marcados, usa o texto detalhado dela)
        texto += montarAnaliseMorfologica(d);

        // 2. Placenta e Líquido (Frase exata: "homogênea, grau X, na escala de Grannum...")
        if (d.placentaLocalizacao) {
            texto += `Placenta de inserção ${d.placentaLocalizacao}, homogênea, grau ${d.placentaGrau || '0'}, na escala de Grannum`;
            if (d.placentaEspessura) texto += ` e de espessura normal, medindo ${d.placentaEspessura} mm`;
            texto += `.\n`;
        }
        
        if (d.liquidoAmniotico) {
            texto += `Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()}`;
            if (d.ila) {
                texto += ` (ILA = ${d.ila} mm)`;
                // CORREÇÃO REF ILA:
                if (d.ilaRefMin && d.ilaRefMax) texto += ` (Ref: ${d.ilaRefMin} - ${d.ilaRefMax})`;
            }
            if (d.mbv) texto += ` (MBV = ${d.mbv} mm)`;
            texto += `.\n`;
        }
        
        if(d.obsPlacenta) texto += `Nota: ${d.obsPlacenta}\n`;

        // --- CORDÃO UMBILICAL (CORRIGIDO: CHAMADA NA FUNÇÃO HELPER) ---
        texto += montarTextoCordao(d);

        // AQUI ESTÁ A BIOMETRIA (Na posição correta do Standard)
        texto += `BIOMETRIA FETAL\n`;
        texto += renderBiometria(d);

        // Índices (Peso somente se calculado)
        if (d.resIc || d.resCcCa || d.resCfCa || d.pesoEstimado) {
            texto += `\nÍNDICES E ESTIMATIVAS:\n`;
            if (d.pesoEstimado) {
                 texto += `- Peso Fetal ${d.pesoEstimado} gr (+/- 10%)`;
                 if (d.percentil && !d.semDadosPercentil) texto += ` (P=${d.percentil})`;
                 texto += `.\n`;
            }
            if (d.resIc) texto += `- Índice Cefálico: ${d.resIc} (Ref: 70-86).\n`;
            if (d.resCcCa) texto += `- Relação CC/CA: ${d.resCcCa}.\n`;
            if (d.resCfCa) texto += `- Relação Fêmur/CA: ${d.resCfCa} (Ref: 20-24).\n`;
            if (d.resCfCc) texto += `- Relação Fêmur/CC: ${d.resCfCc}.\n`;
            // NOVO
            if (d.resCfDbp) texto += `- Relação Fêmur/DBP: ${d.resCfDbp}.\n`;
        }
        if (d.obsBiometria) texto += `Nota: ${d.obsBiometria}\n`;
    }
    
    // === CASO B: MORFOLÓGICO 1º TRIMESTRE (Limpo e Unificado) ===
    else if (isMorfo1) {
        
        // 1. Análise Fetal (Agora chama o HELPER unificado, evitando duplicação)
        // Só vai escrever se você tiver marcado os checkboxes
        texto += montarAnaliseMorfologica(d);

        // 2. Biometria
        texto += `BIOMETRIA FETAL\n`;
        texto += renderBiometria(d);
        // --- ADICIONADO: ÍNDICES TAMBÉM NO MORFOLÓGICO 1º TRI ---
        if (d.resIc || d.resCcCa || d.resCfCa || d.pesoEstimado) {
            texto += `\nÍNDICES E ESTIMATIVAS:\n`;
            if (d.pesoEstimado) {
                 texto += `- Peso Fetal ${d.pesoEstimado} gr (+/- 10%)`;
                 if (d.percentil && !d.semDadosPercentil) texto += ` (P=${d.percentil})`;
                 texto += `.\n`;
            }
            if (d.resIc) texto += `- Índice Cefálico: ${d.resIc} (Ref: 70-86).\n`;
            if (d.resCcCa) texto += `- Relação CC/CA: ${d.resCcCa}.\n`;
            if (d.resCfCa) texto += `- Relação Fêmur/CA: ${d.resCfCa} (Ref: 20-24).\n`;
            if (d.resCfCc) texto += `- Relação Fêmur/CC: ${d.resCfCc}.\n`;
            // NOVO
            if (d.resCfDbp) texto += `- Relação Fêmur/DBP: ${d.resCfDbp}.\n`;
        }
        // ---------------------------------------------------------
        if (d.obsBiometria) texto += `Nota: ${d.obsBiometria}\n`;

        // 3. Placenta e Líquido (No final no 1º Tri)
        if (d.placentaLocalizacao) {
            texto += `Placenta de inserção ${d.placentaLocalizacao}, homogênea, grau ${d.placentaGrau || '0'}, na escala de Grannum`;
            if (d.placentaEspessura) texto += ` e de espessura normal, medindo ${d.placentaEspessura} mm`;
            texto += `.\n`;
        }
        
        if (d.liquidoAmniotico) {
            texto += `Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()}`;
            if (d.ila) {
                texto += ` (ILA = ${d.ila} mm)`;
                if (d.ilaRefMin && d.ilaRefMax) texto += ` (Ref: ${d.ilaRefMin} - ${d.ilaRefMax})`;
            }
            if (d.mbv) texto += ` (MBV = ${d.mbv} mm)`;
            texto += `.\n`;
        }

        // --- CORDÃO UMBILICAL (ADICIONADO TAMBÉM NO 1º TRI) ---
        texto += montarTextoCordao(d);

        // 4. Ducto Venoso (Totalmente Independente)
        // Verifica se qualquer dado do ducto foi preenchido
        if (d.dvOndaAPositiva || d.dvOndaAZero || d.dvOndaAReversa || d.dvIP) {
             
             texto += `Ducto Venoso`;
             
             // Parte da Onda A
             if (d.dvOndaAPositiva) texto += ` com Onda A positiva (normal)`;
             if (d.dvOndaAZero) texto += ` com Onda A ZERO (anormal)`;
             if (d.dvOndaAReversa) texto += ` com Onda A REVERSA (anormal)`;
             
             // Parte do IP
             if (d.dvIP) {
                 texto += ` (IP: ${d.dvIP})`;
             }
             
             texto += `.\n`;
        }
        
        // Tabela de Riscos (FMF) - MODO TEXTO (COPY/PASTE)
        if (d.textoRiscosFMF) {
            texto += `RASTREAMENTO DE ANEUPLOIDIAS (Cálculo de Risco - FMF):\n`;
            texto += `${d.textoRiscosFMF}\n`;
        } else {
            // Mantém compatibilidade caso tenha dados antigos salvos nos campos individuais
            if (d.riscoT21Basal || d.riscoT21Corrigido) {
                texto += `RASTREAMENTO DE ANEUPLOIDIAS (Cálculo de Risco 1:X):\n`;
                if(d.riscoT21Basal) texto += `- T21 (Basal): 1:${d.riscoT21Basal}  |  (Corrigido): 1:${d.riscoT21Corrigido || '--'}\n`;
                if(d.riscoT18Basal) texto += `- T18 (Basal): 1:${d.riscoT18Basal}  |  (Corrigido): 1:${d.riscoT18Corrigido || '--'}\n`;
                if(d.riscoT13Basal) texto += `- T13 (Basal): 1:${d.riscoT13Basal}  |  (Corrigido): 1:${d.riscoT13Corrigido || '--'}\n`;
            }
        }

        texto += `\n`;
    }
    
    // === CASO C: MORFOLÓGICO 2º TRI / OUTROS ===
    else {
        // 1. Análise Fetal (Usa a função auxiliar com as frases detalhadas)
        texto += montarAnaliseMorfologica(d);
        
        // 2. Biometria
        texto += `BIOMETRIA FETAL\n`;
        texto += renderBiometria(d);

        if (d.resIc || d.resCcCa || d.resCfCa || d.resCfCc || d.pesoEstimado) {
            texto += `\nÍNDICES E ESTIMATIVAS:\n`;
            if (d.pesoEstimado || d.pesoFetal) {
                 texto += `- Peso Fetal ${d.pesoEstimado || d.pesoFetal} gr (+/- 10%)`;
                 if (d.percentil && !d.semDadosPercentil) texto += ` (P=${d.percentil})`;
                 texto += `.\n`;
            }
            if (d.resIc) texto += `- Índice Cefálico: ${d.resIc} (Ref: 70-86).\n`;
            if (d.resCcCa) texto += `- Relação CC/CA: ${d.resCcCa}.\n`;
            if (d.resCfCa) texto += `- Relação Fêmur/CA: ${d.resCfCa} (Ref: 20-24).\n`;
            if (d.resCfCc) texto += `- Relação Fêmur/CC: ${d.resCfCc}.\n`;
            // NOVO
            if (d.resCfDbp) texto += `- Relação Fêmur/DBP: ${d.resCfDbp}.\n`;
        }
        if (d.obsBiometria) texto += `Nota: ${d.obsBiometria}\n`;

        // 3. Placenta (Vem DEPOIS da biometria no Morfo 2)
        if (d.placentaLocalizacao) {
            texto += `Placenta de inserção ${d.placentaLocalizacao}, homogênea, grau ${d.placentaGrau || '0'}, na escala de Grannum`;
            if (d.placentaEspessura) texto += ` e de espessura normal, medindo ${d.placentaEspessura} mm`;
            texto += `.\n`;
        }
        
        if (d.liquidoAmniotico) {
            texto += `Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()}`;
            if (d.ila) {
                texto += ` (ILA = ${d.ila} mm)`;
                // CORREÇÃO REF ILA:
                if (d.ilaRefMin && d.ilaRefMax) texto += ` (Ref: ${d.ilaRefMin} - ${d.ilaRefMax})`;
            }
            if (d.mbv) texto += ` (MBV = ${d.mbv} mm)`;
            texto += `.\n`;
        }

       // --- CORDÃO UMBILICAL (GARANTIDO AQUI NO MORFO 2 E OUTROS) ---
        texto += montarTextoCordao(d);

        if(d.obsPlacenta) texto += `Nota: ${d.obsPlacenta}\n`;
        texto += `\n`;
    }

    // --- 5. COLO UTERINO (Recuperado) ---
    // Inserimos antes do Doppler ou Conclusão
    if (d.comprimentoColo || d.coloEge || d.coloSludge === 'presente' || d.citarColo1Tri) {
        texto += `AVALIAÇÃO DO COLO UTERINO (VIA ENDOVAGINAL)\n`;
        // CORREÇÃO: ADICIONADA A FRASE DO CHECKBOX
        if (d.citarColo1Tri) {
            texto += `Colo uterino de aspecto ecográfico normal, fechado.\n`;
        }
        if (d.comprimentoColo) texto += `Comprimento do canal cervical: ${d.comprimentoColo} mm.\n`;
        if (d.coloEge) texto += `Eco Glandular Endocervical: ${d.coloEge === 'presente' ? 'Preservado' : 'Ausente'}.\n`;
        if (d.coloSludge === 'presente') texto += `Sinal do Sludge presente.\n`;
        if (d.coloAfunilamento) texto += `Ausência de afunilamento à manobra de compressão.\n`;
        if (d.coloConclusao) texto += `Parecer: ${d.coloConclusao}.\n`;
        texto += `\n`;
    }

    // --- 6. DOPPLER (CORRIGIDO: IR, PVS E DUCTO) ---
    if (d.usarDoppler) {
        texto += `ESTUDO DOPPLERFLUXOMÉTRICO\n\t\t\tÍNDICES DE PULSATILIDADE\n`;
        
        // Fetal: Artéria Cerebral Média
        if (d.checkAcm || d.acmIP) {
            texto += `Artéria cerebral\t\t\tIP: ${d.acmIP || '-'}`;
            if(d.acmIR) texto += ` | IR: ${d.acmIR}`;  // ADD IR
            if(d.acmPVS) texto += ` | PVS: ${d.acmPVS} cm/s`; // ADD PVS
            if(d.acmDiastoleAlta) texto += ` (Centralização)`;
            texto += `\n`;
        }
        // Fetal: Artéria Umbilical
        if (d.checkUmb || d.umbIP) {
            texto += `Artéria umbilical\t\t\tIP: ${d.umbIP || '-'}`;
            if(d.umbIR) texto += ` | IR: ${d.umbIR}`; // ADD IR
            if(d.umbSD) texto += ` | S/D: ${d.umbSD}`; 
            if(d.umbDiastoleZero) texto += ` (Diástole Zero)`;
            if(d.umbDiastoleReversa) texto += ` (Diástole Reversa)`;
            texto += `\n`;
        }
        // Relação C/U
        if (d.relacaoCerebroUmbilical) {
            texto += `Relação cerebro/umbilical\t\t${d.relacaoCerebroUmbilical} (n/l maior / igual à 1,0)\n`;
        }
        
        texto += `\n`;

        // Materno: Artérias Uterinas
        if (d.checkUtDir || d.utDirIP) {
            texto += `Artéria uterina direita\t\t\tIP: ${d.utDirIP || '-'}`;
            if(d.utDirIR) texto += ` | IR: ${d.utDirIR}`; // ADD IR
            if(d.utDirIncisura) texto += ` (Incisura presente)`;
            texto += `\n`;
        }
        if (d.checkUtEsq || d.utEsqIP) {
            texto += `Artéria uterina esquerda\t\tIP: ${d.utEsqIP || '-'}`;
            if(d.utEsqIR) texto += ` | IR: ${d.utEsqIR}`; // ADD IR
            if(d.utEsqIncisura) texto += ` (Incisura presente)`;
            texto += `\n`;
        }
        if (d.ipMedioUterinas) texto += `IP médio:\t\t\t\t${d.ipMedioUterinas}\n`;
        
        texto += `\n`;

        // Ducto Venoso (Adicionado ao Bloco Doppler se selecionado aqui)
        if (d.checkDv || d.dvIP || d.dvOndaAZero || d.dvOndaAReversa) {
             let onda = 'Positiva';
             if (d.dvOndaAZero) onda = 'Zero';
             if (d.dvOndaAReversa) onda = 'Reversa';
             
             texto += `Ducto Venoso\t\t\t\tIP: ${d.dvIP || '-'} | Onda A: ${onda}\n`;
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

        // Face 3D
        if (d.face3D) {
            texto += `Face fetal: ${d.face3D === 'visualizada' ? 'Bem visualizada' : d.face3D}.\n`;
        }
        
        // Estruturas da Face e Extremidades (Checkboxes)
        const parts3D = [];
        if (d.labios3D) parts3D.push('lábios');
        if (d.nariz3D) parts3D.push('nariz');
        if (d.olhos3D) parts3D.push('olhos');
        if (d.orelhas3D) parts3D.push('orelhas');
        if (d.maoDir3D) parts3D.push('mão direita');
        if (d.maoEsq3D) parts3D.push('mão esquerda');
        if (d.peDir3D) parts3D.push('pé direito');
        if (d.peEsq3D) parts3D.push('pé esquerdo');
        
        if (parts3D.length > 0) texto += `Estruturas identificadas em 3D: ${parts3D.join(', ')}.\n`;

        // Comportamento 4D
        const comp = [];
        if (d.movSorriso) comp.push('sorriso');
        if (d.movBocejo) comp.push('bocejo');
        if (d.movPiscar) comp.push('piscar de olhos');
        if (d.movMaoFace) comp.push('mão na face');
        if (d.movSuccao) comp.push('sucção');
        if (d.movLingua) comp.push('protusão da língua');
        if (d.movDegluticao3D) comp.push('deglutição');
        
        if (comp.length > 0) texto += `Comportamento fetal observado (4D): ${comp.join(', ')}.\n`;

        if (d.obs3D) texto += `Nota 3D: ${d.obs3D}\n`;
        texto += `\n`;
    }

    // =========================================================================
    // NOVA SEÇÃO: AVALIAÇÃO COMPLEMENTAR (Solicitado: Osso Nasal, TN e Ducto)
    // =========================================================================
    
    let textoComp = "";
    let temDadosComp = false;

    // 1. Osso Nasal
    if (d.ossoNasal) {
        textoComp += `- Osso Nasal: Presente, medindo ${d.ossoNasal} mm.\n`;
        temDadosComp = true;
    } else if (d.ossoNasalPresente) {
        // Fallback caso tenha marcado apenas o checkbox de presença sem medida
        textoComp += `- Osso Nasal: Visualizado.\n`;
        temDadosComp = true;
    }

    // 2. Translucência Nucal
    if (d.tnMedida) {
        textoComp += `- Translucência Nucal: ${d.tnMedida} mm.\n`;
        temDadosComp = true;
    }

    // 3. Ducto Venoso
    // Verifica se algum dado do ducto foi preenchido
    if (d.checkDv || d.dvIP || d.dvOndaAPositiva || d.dvOndaAZero || d.dvOndaAReversa) {
        textoComp += `- Ducto Venoso: `;
        const dvDetalhes = [];

        // Classificação da Onda
        if (d.dvOndaAPositiva) dvDetalhes.push("Onda A Positiva (Normal)");
        if (d.dvOndaAZero) dvDetalhes.push("Onda A Zero (Anormal)");
        if (d.dvOndaAReversa) dvDetalhes.push("Onda A Reversa (Anormal)");

        // IP
        if (d.dvIP) dvDetalhes.push(`IP: ${d.dvIP}`);

        if (dvDetalhes.length > 0) {
            textoComp += dvDetalhes.join(" | ");
        } else {
            textoComp += "Avaliado";
        }
        textoComp += `.\n`;
        temDadosComp = true;
    }

    // Se houver algum dado, adiciona ao texto principal com o título
    if (temDadosComp) {
        texto += `AVALIAÇÃO COMPLEMENTAR\n${textoComp}\n`;
    }

    // -------------------------------------------------------------------------
    // 8. IMPRESSÃO DIAGNÓSTICA (AGORA 100% SINCRONIZADA)
    // -------------------------------------------------------------------------
    texto += `\nIMPRESSÃO DIAGNÓSTICA:\n`;

    if (d.sgAbortoIncompleto) {
        texto += `- Quadro compatível com Abortamento Incompleto.\n`;
    } 
    else if (isInicial) {
        texto += `- Gestação tópica de aproximadamente ${igFinal || '...'}.\n`;
        if (d.embriaoStatus === 'presente') texto += `- Vitalidade embrionária comprovada.\n`;
    }
    else {
        if (!isMorfo1) texto += `- Feto único vivo.\n`; 
        
        // AQUI ESTÁ A CORREÇÃO PRINCIPAL: 
        // Em vez de "Biometria compatível com...", dizemos a IG Final de forma firme.
        texto += `- Idade Gestacional atual: ${igFinal || '...'} ${metodoTexto}.\n`;

        if (d.liquidoAmniotico) {
            texto += `- Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()}`;
            if (d.ila) texto += ` (ILA = ${d.ila} mm)`;
            if (d.mbv) texto += ` (MBV = ${d.mbv} mm)`;
            texto += `.\n`;
        }

        if (d.pesoEstimado) {
             texto += `- Peso Fetal ${d.pesoEstimado} gr (+/- 10%)`;
             if (d.percentil && !d.semDadosPercentil) texto += ` (Percentil: ${d.percentil} - Hadlock)`;
             texto += `.\n`;
        }
        
        if (d.sexoFetal && d.sexoFetal !== 'NAO_CITAR') {
             if (d.sexoFetal === 'NAO_VISUALIZADO') {
                 texto += `- Sexo: Não visualizado neste exame.\n`;
             } else {
                 let sexo = d.sexoFetal === 'MASCULINO' ? 'Masculino' : 'Feminino';
                 texto += `- Sexo: Genitália compatível com ${sexo}.\n`;
             }
        }

        if (d.usarDoppler) texto += `- Dopplerfluxometria sem anormalidades no presente estudo.\n`;
        
        if (isMorfo1 && (d.riscoT21Basal || d.riscoT21Corrigido)) {
            texto += `- CÁLCULO DE RISCO PARA AS TRISSOMIAS (Ver tabela).\n`;
        }
    }

    // =========================================================================
    // REGRAS AUTOMÁTICAS (INTELIGÊNCIA DO SISTEMA)
    // =========================================================================
    
    // Regra 1: CCN (Automatização Estrita por Subtipo)
    const ccnValor = parseFloat(d.ccn);
    
    if (!isNaN(ccnValor)) {
        // CASO 1: Morfológico 1º Trimestre E CCN < 45
        if (isMorfo1 && ccnValor < 45) {
            texto += `- ${FRASE_CCN_MENOR_45}\n`;
        }
        // CASO 2: Morfológico 2º Trimestre E CCN > 84
        else if (isMorfo2 && ccnValor > 84) {
             texto += `- ${FRASE_CCN_MAIOR_84}\n`;
        }
    }

    // Regra 2: Oligoâmnio -> Sugerir Doppler
    if (d.liquidoAmniotico === 'Oligoâmnio') {
        texto += `- Sugere-se acompanhamento da vitalidade fetal com USG Obstétrico Doppler devido ao Oligoâmnio (Sob julgamento clínico).\n`;
    }

    // 3. RCIU / DOPPLER / NIPT (Unificação Inteligente)
    // Se marcou "Sugerir Doppler (RCIU)" OU o percentil deu baixo (<10)
    const pValor = parseInt(d.percentil);
    if (d.sugereDopplerRciu || d.sugereRciu || (!isNaN(pValor) && pValor < 10)) {
        // Texto técnico completo solicitado
        texto += `- RCIU: Sob julgamento clínico seria conveniente o acompanhamento da vitalidade fetal com USG Obstétrico doppler.\n`;
    }

    // Se marcou "Sugerir NIPT"
    if (d.sugereNipt) {
        texto += `- Sob julgamento clínico seria conveniente um estudo genético (NIPT), devido ao risco aumentado.\n`;
    }

    // 4. Outras Notas (Golf Ball, Pieloectasia, etc)
    if (d.sugereGolfBall) texto += `- ${TXT_GOLFBALL_LAUDO}\n`;
    if (d.sugerePieloectasia) texto += `- ${TXT_PIELO_LAUDO}\n`;
    if (d.semDadosPercentil) texto += `- Idade gestacional/biometria não permite cálculo preciso do percentil de crescimento neste momento.\n`;

    // 5. Observações Manuais Adicionais
    if (d.obsAdicionais) texto += `\nObs: ${d.obsAdicionais}\n`;

    /// === SOLUÇÃO PARA "CURVA NO LAUDO" (INSIRA AQUI) ===
    const graficos = [];
    if (d.checkGraficoPeso) graficos.push('Peso Fetal');
    if (d.checkGraficoDbp) graficos.push('DBP');
    if (d.checkGraficoFemur) graficos.push('Fêmur');
    if (d.checkGraficoUmero) graficos.push('Úmero');
    if (d.checkGraficoCa) graficos.push('Circunferência Abdominal');
    if (d.checkGraficoCc) graficos.push('Circunferência Cefálica');

    if (graficos.length > 0) {
        texto += `\nANEXOS:\n- Seguem anexas as curvas de crescimento fetal (${graficos.join(', ')}).\n`;
    }
    // ====================================================

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
    let t = ``;
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

    // --- NOTA AUTOMÁTICA DE CCN (BIOMETRIA) ---
    // Segue a mesma lógica estrita da conclusão
    const ccnVal = parseFloat(d.ccn);
    const isMorfo1 = d.subtipo === 'OBSTETRICO_1_TRI';
    const isMorfo2 = d.subtipo === 'OBSTETRICO_MORFOLOGICO';

    if (!isNaN(ccnVal)) {
        if (isMorfo1 && ccnVal < 45) {
            t += `NOTA: Medida de CCN abaixo de 45 mm limita a avaliação de risco para trissomias pela TN.\n\n`;
        }
        else if (isMorfo2 && ccnVal > 84) {
            t += `NOTA: Medida de CCN acima de 84 mm. Avaliação de risco pela TN não aplicável nesta fase.\n\n`;
        }
    }

    return t;
};

// =============================================================================
// NOVO HELPER: GERA O TEXTO DE MORFOLOGIA (PARA TODOS OS TIPOS DE EXAME)
// =============================================================================

const montarAnaliseMorfologica = (d) => {
    // Verifica se há pelo menos um item marcado
    const temMorfo = d.morfCranio || d.morfCerebro || d.morfFace || d.ossoNasalPresente || d.morfColuna || 
                     d.morfTorax || d.morfCoracao || d.morfVasosBase || 
                     d.morfParedeAbd || d.morfEstomago || d.morfFigado || d.morfRins || d.morfBexiga || 
                     d.morfMembros || d.morfGenitalia;

    if (!temMorfo) return '';

    let t = `ANÁLISE FETAL:\n\n`; 
    
    // 1. SISTEMA NERVOSO CENTRAL
    if (d.morfCranio || d.morfCerebro) {
        t += `Segmento Cefálico\n`;
        if(d.morfCranio) t += `Crânio de contornos regulares e dimensões normais. Tábua óssea aparentemente íntegra.\n`;
        if(d.morfCerebro) t += `Parênquima encefálico (corpo caloso e talamos) de aspecto preservado. Ventrículos cerebrais não se mostram dilatados. Cerebelo de aspecto preservado.\n`;
        t += `\n`;
    }

    // 2. FACE & OSSO NASAL (Atualizado)
    if (d.morfFace || d.ossoNasalPresente) {
        t += `Face\n`;
        if (d.morfFace) t += `Órbitas de características preservadas. Perfil facial característico. Nariz, lábio superior e inferior de conformação habitual.\n`;
        // Adicionado para cobrir o 1º Trimestre
        if (d.ossoNasalPresente) t += `Osso nasal presente e visualizado.\n`; 
        t += `\n`;
    }

    // 3. COLUNA
    if (d.morfColuna) {
        t += `Coluna vertebral (planos sagital, coronal e transversal)\nCorpos vertebrais íntegros, de ecotextura característica, não se observando anormalidades.\n\n`;
    }

    // 4. TÓRAX E CORAÇÃO
    if (d.morfTorax || d.morfCoracao || d.sugereGolfBall || d.morfVasosBase || d.bcf) {
        t += `Tórax\n`;
        if (d.morfTorax) t += `Forma e características ecográficas habituais. Área cardíaca de dimensões e relação com o diâmetro torácico preservados.\n`;
        // Verifica GOLF BALL ou CORAÇÃO NORMAL
        if (d.sugereGolfBall) {
            // Se tem Golf Ball, usa texto neutro + OBS
            t += `Quatro câmaras cardíacas visibilizadas. OBSERVAÇÃO CARDÍACA: ${TXT_GOLFBALL_LAUDO}\n`;
        } else if (d.morfCoracao) {
            // Se NÃO tem Golf Ball e está marcado normal
            t += `Quatro câmaras cardíacas evidentes e simétricas.\n`;
        }
        if (d.morfVasosBase) t += `Vias de saída dos ventrículos e cruzamento dos grandes vasos visibilizados.\n`;
        // Opcional: Incluir BCF aqui se preferir não deixar em dados gerais
        if (d.bcf) t += `Batimentos cardíacos presentes e rítmicos (F.C.F. = ${d.bcf} bpm).\n`;
        t += `\n`;
    }

    // 5. ABDÔMEM
    // --- CORREÇÃO 2: RINS INTELIGENTES ---
    if (d.morfParedeAbd || d.morfEstomago || d.morfFigado || d.morfRins || d.sugerePieloectasia || d.morfBexiga) {
        t += `Abdômem\n`;
        if(d.morfParedeAbd) t += `Diafragma visibilizado e aparentemente sem anormalidades no presente estudo. Parede abdominal íntegra.\n`;
        if(d.morfFigado) t += `Fígado de ecotextura preservada.\n`;
        if(d.morfEstomago) t += `Estômago repleto e visualizado em sua topografia habitual.\n`;
        // Verifica PIELOECTASIA ou RINS NORMAIS
        if (d.sugerePieloectasia) {
             // Se tem Pieloectasia, remove o texto de "dimensões normais"
             t += `Rins tópicos. OBSERVAÇÃO RENAL: ${TXT_PIELO_LAUDO}\n`;
        } else if (d.morfRins) {
             // Se é normal
             t += `Rins tópicos, de dimensões normais. Não se observando dilatações ou alterações texturais.\n`;
        }
        if(d.morfBexiga) t += `Bexiga repleta, de dimensões e aspectos preservados.\n`;
        t += `\n`;
    }

    // 6. MEMBROS E GENITÁLIA
    if (d.morfMembros || d.morfGenitalia) {
        t += `Membros\n`;
        if(d.morfMembros) t += `Membros inferiores e superiores visibilizados, sem anormalidades grosseiras.\nMovimentação fetal ativa e tônus adequado.\n`;
        if(d.morfGenitalia) t += `Genitália externa compatível com o sexo fetal.\n`;
        t += `\n`;
    }
    
    // Observação manual da Morfologia
    if (d.obsMorfologia) t += `Nota: ${d.obsMorfologia}\n\n`;

    return t;
};
// =============================================================================
// HELPERS FINAIS (MULTI-FETO & DISCLAIMERS)
// =============================================================================
export const montarTextoFinalMultiplo = (resF1, resF2, resF3, qtdFetos, listaFetos = []) => {
    let textoFinal = '';
    const f1Data = listaFetos[0] || {};
    
    // 1. Título do Exame (Baseado no Feto 1)
    if (resF1 && resF1.tituloExame) {
        const sufixo = (qtdFetos > 1 && !resF1.tituloExame.includes("GEMELAR")) ? ' GEMELAR' : '';
        textoFinal += `${resF1.tituloExame}${sufixo}\n\n`;
    }
    
    // 2. Datação Geral (Extrai do texto do Feto 1 para não repetir)
    const linhasF1 = resF1.texto.split('\n');
    const linhaDPP = linhasF1.find(l => l.startsWith('DPP:') || l.startsWith('DUM:'));
    if(linhaDPP) textoFinal += `${linhaDPP}\n\n`;

    // 3. Cabeçalho Gemelar (Posições)
    if (qtdFetos > 1) {
        textoFinal += `Gestação múltipla, ${f1Data.corionicidade || 'dicoriônica'} e ${f1Data.amnionicidade || 'diamniótica'}.\n`;
        
        // Lista as posições de cada feto
        const pos1 = f1Data.localizacaoFeto ? `Feto I: ${f1Data.localizacaoFeto}` : '';
        const pos2 = (listaFetos[1] && listaFetos[1].localizacaoFeto) ? `Feto II: ${listaFetos[1].localizacaoFeto}` : '';
        const pos3 = (qtdFetos > 2 && listaFetos[2] && listaFetos[2].localizacaoFeto) ? `Feto III: ${listaFetos[2].localizacaoFeto}` : '';
        
        if(pos1) textoFinal += `${pos1}.\n`;
        if(pos2) textoFinal += `${pos2}.\n`;
        if(pos3) textoFinal += `${pos3}.\n`;
        textoFinal += `\n`;
    }

    // CÓDIGO CORRIGIDO
// Adicionamos as flags 'gm' para pegar o início da linha mesmo se houver texto antes
const limparCabecalho = (txt) => txt.replace(/^DPP:.*\n/gm, '').replace(/^DUM:.*\n/gm, '').trim();

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

    // 5. Rodapés e Disclaimers
    textoFinal += `\n\n`;
    if (f1Data.subtipo === 'OBSTETRICO_1_TRI') {
        textoFinal += TEXTO_OBS_MORFO_1;
    } 
    else if (f1Data.subtipo === 'OBSTETRICO_MORFOLOGICO') {
        textoFinal += TEXTO_OBS_MORFO_2;
    }
    
    textoFinal += `\n\n${TEXTO_RODAPE_PADRAO}`;

    return textoFinal;
};