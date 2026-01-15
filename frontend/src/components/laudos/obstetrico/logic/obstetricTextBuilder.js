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

    // -------------------------------------------------------------------------
    // 2. DATAÇÃO E CRONOLOGIA (HIERARQUIA: Biometria > Anterior > DUM)
    // -------------------------------------------------------------------------
    
    // CASO 1: Biometria Atual (O médico marcou "Usar esta data no laudo")
    // Manda em tudo. Usado para corrigir DUM errada ou datação inicial por CCN.
    if (d.citarDppBiometria && d.dppBiometriaCalculada) {
         texto += `DPP: ${d.dppBiometriaCalculada} (Calculada pela biometria atual).\n`;
         texto += `Idade Gestacional: ${d.igBiometria || '...'}.\n`;
         
         // Opcional: Citar a DUM apenas como histórico se ela existir
         if (d.usarDum && d.dum && d.exibirDataDum) {
             texto += `(DUM referida: ${formatData(d.dum)}).\n`;
         }
    }
    
    // CASO 2: USG Anterior (Padrão Ouro para datar se DUM incerta)
    else if (d.usarExameAnterior && d.dataExameAnterior) {
        // Frase exata da médica para USG anterior
        texto += `DPP: --- (calculada pelo primeiro ultrassom), compatível com ${d.igIgCorrigidaCalculada || '...'}.\n`;
    }

    // CASO 3: DUM (Padrão Menstrual)
    else if (d.usarDum && d.dum) {
        // Lógica dos checkboxes "Exibir Data" e "Citar DPP"
        if (d.citarDppDum && d.dppDum) {
             texto += `DPP: ${d.dppDum}`;
             if (d.exibirDataDum) texto += ` (DUM: ${formatData(d.dum)})`;
        } else {
             if (d.exibirDataDum) texto += `DUM: ${formatData(d.dum)}`;
        }
        
        if (d.igDum) texto += `, compatível com ${d.igDum}`;
        texto += `.\n`;
    } 
    
    // CASO 4: DUM Desconhecida / Não usar
    else if (d.dumDesconhecida) {
        texto += `Data da última menstruação: Desconhecida / Não referida.\n`;
        // Tenta salvar usando a biometria se nada mais estiver marcado
        if (d.igBiometria) texto += `Idade Gestacional pela biometria: ${d.igBiometria}.\n`;
    }
    else if (d.subtipo === 'OBSTETRICO_1_TRI' && d.resIgCcn) {
         // Fallback específico para 1º tri se nada for marcado
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

        // 3. Biometria + Índices
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
        }
        if (d.obsBiometria) texto += `Nota: ${d.obsBiometria}\n`;
    } 
    
    // === CASO B: MORFOLÓGICO 1º TRIMESTRE (FRASES ESPECÍFICAS DA MÁSCARA 1º TRI) ===
    else if (isMorfo1) {
        
        texto += `Análise fetal:\n\n`;
        
        // Segmento Cefálico
        texto += `Segmento cefálico\n`;
        if(d.morfCranio) texto += `Crânio de contornos regulares e dimensões normais.\n`;
        if(d.morfCerebro) texto += `Estruturas da linha média presentes e plexo coróide visualizado.\n`;
        // Translucência Intracraniana (Novo Checkbox)
        if(d.morf1Cerebro) texto += `Translucência Intracraniana (TI) visibilizada.\n`;
        texto += `Osso nasal ${d.ossoNasalPresente ? 'presente' : 'ausente/não visualizado'}.\n\n`;

        // Tórax
        texto += `Tórax\n`;
        texto += `Forma e características ecográficas habituais.\n`;
        texto += `Área cardíaca de dimensões e relação com o diâmetro torácico preservados.\n`;
        if(d.bcf) texto += `Batimentos cardíacos presentes e rítmicos (F.C.F = ${d.bcf} bpm).\n\n`;

        // Abdome
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
        texto += `BIOMETRIA FETAL\n`;
        texto += renderBiometria(d);
        if (d.obsBiometria) texto += `Nota: ${d.obsBiometria}\n`;

        // Placenta e Líquido (No final no 1º Tri)
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

        // Ducto Venoso
        if(d.checkDv || d.dvIP) {
             let onda = d.dvOndaAZero ? 'Zero' : (d.dvOndaAReversa ? 'Reversa' : 'positiva');
             texto += `Ducto Venoso com Onda A ${onda}.\n`;
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

       // --- CORREÇÃO CORDÃO UMBILICAL ---
        // Verifica se o checkbox '3 vasos' está marcado OU se o select de circular tem algum valor (mesmo que 'ausente')
        // CORREÇÃO: Frase completa da médica para Cordão 3 vasos
        if (d.cordaoNormal === true || (d.cordaoCircular && d.cordaoCircular !== '')) {
            // Nota: Se quiser o título "Cordão umbilical:" antes, mantenha. 
            // Se a frase já começa com "Cordão...", não precisa repetir.
            // Vou montar para ficar fluído:
            
            const cordaoParts = [];
            
            if (d.cordaoNormal === true) {
                // FRASE NOVA SOLICITADA:
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
            
            // Junta tudo com ". "
            if (cordaoParts.length > 0) {
                texto += cordaoParts.join('. ') + `.\n`;
            }
        }
        if(d.obsPlacenta) texto += `Nota: ${d.obsPlacenta}\n`;
        texto += `\n`;
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

    // --- 8. IMPRESSÃO DIAGNÓSTICA (CONCLUSÃO COMPLETA) ---
    texto += `Impressão diagnóstica:\n`;

    if (d.sgAbortoIncompleto) {
        texto += `- Quadro compatível com Abortamento Incompleto.\n`;
    } 
    else if (isInicial) {
        texto += `- Gestação tópica de aproximadamente ${d.resIgCcn || d.igBiometria || '...'} semanas.\n`;
    }
    else {
        // Frase feto único (exceto 1º tri/morfo que já tem intro detalhada)
        if (!isMorfo1 && !isMorfo2) texto += `- Feto único vivo.\n`; 

        let igFinal = d.igBiometria || d.igDum || "---";
        if (d.usarExameAnterior && d.igIgCorrigidaCalculada) igFinal = d.igIgCorrigidaCalculada;
        
        texto += `- Biometria fetal compatível com aproximadamente ${igFinal} +/- ${isMorfo1 ? '7' : '14'} dias.\n`;
        
        if (d.liquidoAmniotico) {
            texto += `- Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()}`;
            if (d.ila) texto += ` (ILA = ${d.ila} mm)`;
            if (d.mbv) texto += ` (MBV = ${d.mbv} mm)`;
            texto += `.\n`;
        }

        if (d.pesoEstimado || d.pesoFetal) {
                 texto += `- Peso Fetal Estimado: ${d.pesoEstimado || d.pesoFetal} g (+/- 10%)`;
                 // ALTERADO AQUI:
                 if (d.percentil && !d.semDadosPercentil) texto += ` (Percentil: ${d.percentil} - Hadlock)`;
                 texto += `.\n`;
            }
        
        // CORREÇÃO SEXO:
        if (d.sexoFetal && d.sexoFetal !== 'NAO_CITAR') {
             if (d.sexoFetal === 'NAO_VISUALIZADO') {
                 texto += `- Sexo: Não visualizado neste exame.\n`;
             } else {
                 let sexo = d.sexoFetal === 'MASCULINO' ? 'Masculino' : 'Feminino';
                 texto += `- Sexo: Genitália compatível com ${sexo}.\n`;
             }
        }

        if (d.usarDoppler) texto += `- Dopplerfluxometria sem anormalidades no presente estudo.\n`;
        
        // 1º Tri Riscos
        if (isMorfo1 && (d.riscoT21Basal || d.riscoT21Corrigido)) {
            texto += `- CÁLCULO DE RISCO PARA AS TRISSOMIAS (Ver tabela).\n`;
        }
    }

    // CORREÇÃO CHECKBOXES DE SUGESTÃO:
    if (d.semDadosPercentil) texto += `- Obs: Idade gestacional não permite cálculo de percentil.\n`;
    if (d.morfoPrejudicado45mm) texto += `- Análise morfológica prejudicada (CCN < 45mm).\n`;
    if (d.sugereNipt) texto += `- Sugere-se avaliação genética (NIPT) devido ao risco aumentado.\n`;
    if (d.sugereGolfBall) texto += `- Nota-se foco ecogênico intracardíaco (Golf Ball). Isoladamente não aumenta risco de aneuploidias.\n`;
    if (d.sugerePieloectasia) texto += `- Nota-se pieloectasia renal. Sugere-se controle evolutivo.\n`;
    if (d.sugereDopplerRciu || d.sugereRciu) texto += `- Sugere-se acompanhamento do crescimento e vitalidade com Doppler (Risco de RCIU).\n`;

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
    return t;
};

/// =============================================================================
// NOVO HELPER: GERA O TEXTO DE MORFOLOGIA (PARA TODOS OS TIPOS DE EXAME)
// =============================================================================
const montarAnaliseMorfologica = (d) => {
    // Verifica se há pelo menos um item marcado
    const temMorfo = d.morfCranio || d.morfCerebro || d.morfFace || d.morfColuna || 
                     d.morfTorax || d.morfCoracao || d.morfVasosBase || 
                     d.morfParedeAbd || d.morfEstomago || d.morfFigado || d.morfRins || d.morfBexiga || 
                     d.morfMembros || d.morfGenitalia;

    if (!temMorfo) return '';

    let t = `Análise fetal:\n\n`; 
    
    // 1. SISTEMA NERVOSO CENTRAL
    if (d.morfCranio || d.morfCerebro) {
        t += `Sistema Nervoso Central\n`;
        if(d.morfCranio) t += `Crânio de contornos regulares e dimensões normais. Tábua óssea aparentemente íntegra.\n`;
        if(d.morfCerebro) t += `Parênquima encefálico (corpo caloso e talamos) de aspecto preservado. Ventrículos cerebrais não se mostram dilatados. Cerebelo de aspecto preservado.\n`;
        t += `\n`;
    }

    // 2. FACE
    if (d.morfFace) {
        t += `Face\nÓrbitas de características preservadas. Perfil facial característico.\nNariz, lábio superior e inferior de conformação habitual.\n\n`;
    }

    // 3. COLUNA
    if (d.morfColuna) {
        t += `Coluna vertebral (planos sagital, coronal e transversal)\nCorpos vertebrais íntegros, de ecotextura característica, não se observando anormalidades.\n\n`;
    }

    // 4. TÓRAX E CORAÇÃO
    if (d.morfTorax || d.morfCoracao || d.morfVasosBase) {
        t += `Tórax\n`;
        if (d.morfTorax) t += `Forma e características ecográficas habituais. Área cardíaca de dimensões e relação com o diâmetro torácico normais.\n`;
        if (d.morfCoracao) t += `Batimentos cardíacos presentes e rítmicos. Quatro câmaras cardíacas evidentes e simétricas.\n`;
        if (d.morfVasosBase) t += `Vias de saída dos ventrículos e cruzamento dos grandes vasos visibilizados.\n`;
        t += `\n`;
    }

    // 5. ABDÔMEM
    if (d.morfParedeAbd || d.morfEstomago || d.morfFigado || d.morfRins || d.morfBexiga) {
        t += `Abdômem\n`;
        if(d.morfParedeAbd) t += `Diafragma visibilizado e aparentemente sem anormalidades no presente estudo. Parede abdominal íntegra.\n`;
        if(d.morfFigado) t += `Fígado de ecotextura preservada.\n`;
        if(d.morfEstomago) t += `Estômago repleto e visualizado em sua topografia habitual.\n`;
        if(d.morfRins) t += `Rins tópicos, de dimensões normais, não se observando dilatações ou alterações texturais.\n`;
        if(d.morfBexiga) t += `Bexiga repleta, de dimensões e aspectos preservados.\n`;
        t += `\n`;
    }

    // 6. MEMBROS E GENITÁLIA
    if (d.morfMembros || d.morfGenitalia) {
        t += `Membros\n`;
        if(d.morfMembros) t += `Aparentemente íntegros, identificando mãos e pés bilateralmente e em posição habitual.\nMovimentação fetal ativa e tonus adequado.\n`;
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

    // 4. Corpos dos Textos
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