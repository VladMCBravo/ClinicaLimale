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
    // 1. DATAÇÃO (Lógica Blindada)
    // -------------------------------------------------------------------------
    
    // --- A. DUM (Data da Última Menstruação) ---
    if (d.usarDum) {
        // Se tem DUM preenchida
        if (d.dum) {
            if (d.exibirDataDum) {
                texto += `Data da última menstruação: ${formatData(d.dum)}.\n`;
            }
            // Se pede para citar a DPP baseada na DUM
            if (d.citarDppDum && d.dppDum) {
                texto += `DPP (DUM): ${d.dppDum}`;
                // Só mostra a IG se ela foi calculada
                if (d.igDum) texto += `, compatível com ${d.igDum}`;
                texto += `.\n`;
            } 
            // Se não citar DPP, mas quiser dizer a IG pela DUM
            else if (d.igDum) {
                texto += `Idade gestacional cronológica (DUM): ${d.igDum}.\n`;
            }
        } else {
            // Checkbox marcado mas sem data
            texto += `Data da última menstruação referida, porém não informada.\n`;
        }
    } 
    // --- B. DUM Desconhecida ---
    else if (d.dumDesconhecida) {
        texto += `Data da última menstruação: Desconhecida / Não referida.\n`;
    }

    // --- C. USG Anterior (Para datação principal) ---
    if (d.usarExameAnterior && d.dataExameAnterior) {
        const dataAnt = formatData(d.dataExameAnterior);
        // O IMPORTANTE: Usar a IG Corrigida (Projetada para hoje) e não a antiga
        const igHojePeloAnterior = d.igIgCorrigidaCalculada;
        
        if (igHojePeloAnterior) {
            texto += `Idade gestacional datada pelo ultrassom de ${dataAnt}: ${igHojePeloAnterior}.\n`;
        } else {
            // Fallback de segurança caso o cálculo falhe, mas avisando que é a IG da época
            texto += `Exame anterior realizado em ${dataAnt} (IG na época: ${d.igAnteriorSemanas || 0}s ${d.igAnteriorDias || 0}d).\n`;
        }
    } 
    
    // --- D. Biometria Atual (Se escolhida como Datador Principal) ---
    // Usado quando a DUM não é confiável e não tem exame anterior
    else if (d.citarDppBiometria && d.dppBiometriaCalculada) {
         texto += `Idade Gestacional pela biometria atual: ${d.igBiometria || '...'}.\n`;
         texto += `DPP (Biometria atual): ${d.dppBiometriaCalculada}.\n`;
    }
    
    texto += '\n';

    // -------------------------------------------------------------------------
    // 2. ÚTERO E SACO GESTACIONAL (Blindado para Aborto e Medidas Exatas)
    // -------------------------------------------------------------------------
    
    // --> ÚTERO (Frase da Médica 1º Tri ou Descrição Geral)
    if (d.subtipo === 'OBSTETRICO_1_TRI' || d.subtipo === 'OBSTETRICO_INICIAL') {
        // Se houver medidas do útero preenchidas (SecaoDadosMaternos1Tri)
        if (d.citarUteroMedidas && d.ut1) {
            texto += `ÚTERO\nApresenta-se em AVF, com dimensões de ${d.ut1} x ${d.ut2} x ${d.ut3} mm. `;
            texto += `Contornos e textura normais.\n`;
        } else {
            texto += `ÚTERO\nApresenta-se em AVF com dimensões adequadas para a idade gestacional, apresentando contornos e textura normais.\n`;
        }
        
        // Nódulo / Mioma
        if (d.citarNodulo && d.nod1) {
            texto += `Nota-se nódulo miometrial (${d.nodTipo}) medindo ${d.nod1} x ${d.nod2} mm, em parede ${d.nodLocal}.\n`;
        }
        texto += `\n`;
    } 
    else {
        // Frase Padrão 2º/3º Tri
        if (d.utero) {
            const uteroTexto = d.utero === 'globoso' ? 'globoso, aumentado de volume' : d.utero; // caso venha do select simples
            texto += `Útero ${uteroTexto}`;
            if (d.miometrio) texto += `, miométrio ${d.miometrio}`;
            texto += `.\n`;
        }
    }

    // SACO GESTACIONAL
    if (d.citarSg || (d.subtipo && d.subtipo.includes("INICIAL"))) {
        
        // Localização
        if (d.sgLocalizacao) texto += `Saco gestacional de inserção ${d.sgLocalizacao}, de contornos regulares.\n`;
        
        // Medidas (Só mostra se tiver as 3)
        if (d.sg1 && d.sg2 && d.sg3) {
            texto += `Medidas do Saco Gestacional: ${d.sg1} x ${d.sg2} x ${d.sg3} mm.\n`;
        }
        
        // DMSG Calculado
        if (d.resDmsg) texto += `Diâmetro Médio do Saco Gestacional (DMSG): ${d.resDmsg} mm.\n`;
        
        // Trofoblasto
        if (d.trofoblasto && d.trofoblasto !== 'normal') texto += `As vilosidades placentárias têm inserção ${d.trofoblasto}.\n`;
        else if (d.trofoblasto === 'normal') texto += `Reação decidual de aspecto habitual.\n`;
        
        // Vesícula Vitelina
        if (d.embriaoNaoVisualizado) {
            // Se embrião não visto, detalha VV
            texto += `Vesícula vitelina ${d.citarVv ? 'visualizada' : 'não visualizada'}. Embrião não caracterizado no momento (CCN < 2mm).\n`;
        } else if (d.ccn) {
            texto += `Visualizado embrião medindo ${d.ccn} mm de CCN.\n`;
        }
        
        // Patologias (Descolamento vs Aborto)
        if (d.sgAbortoIncompleto) {
            texto += `\nOBS: Observa-se na cavidade uterina conteúdo heterogêneo amorfo, compatível com restos ovulares (Sinais de Abortamento Incompleto).\n`;
        } 
        else if (d.sgComDescolamento || (d.desc1 && parseFloat(d.desc1) > 0)) {
            texto += `\nOBS: Observa-se área de descolamento / hematoma subcoriônico medindo ${d.desc1 || '-'} x ${d.desc2 || '-'} mm.\n`;
        } 
        else if (d.sgSemDescolamento) {
            texto += `Não se observa sinais de descolamento ovular.\n`;
        }
    }
    texto += '\n';

    // -------------------------------------------------------------------------
    // 3. PLACENTA E LÍQUIDO (Lógica ILA vs MBV)
    // -------------------------------------------------------------------------
    // Só imprime se tiver localização definida
    if (d.placentaLocalizacao) {
        if (d.subtipo === 'OBSTETRICO_1_TRI') texto += `PLACENTA\n`;
        
        texto += `Inserção ${d.placentaLocalizacao}`;
        texto += `, grau ${d.placentaGrau || '0'} (Grannum)`;
        
        if (d.placentaEspessura) texto += ` e espessura de ${d.placentaEspessura} mm`;
        texto += `.\n`;
    }

    if (d.liquidoAmniotico) {
        texto += `Líquido amniótico em quantidade ${d.liquidoAmniotico.toLowerCase()}. `;
        
        // Se tem MBV (Gêmeos)
        if (d.mbv) {
            texto += `(Maior Bolsão Vertical = ${d.mbv} mm).`;
        } 
        // Se tem ILA (Único)
        else if (d.ila) {
            texto += `(ILA = ${d.ila} mm)`;
            // Se preencheu referência
            if (d.ilaRefMin || d.ilaRefMax) texto += ` (Ref: ${d.ilaRefMin || '80'} a ${d.ilaRefMax || '180'} mm)`;
            texto += `.`;
        }
        texto += `\n`;
    }
    texto += '\n';

    // -------------------------------------------------------------------------
    // 4. ESTÁTICA E DADOS GERAIS (Compatível com SecaoDadosGerais.jsx)
    // -------------------------------------------------------------------------
    
    // Gêmeos
    if (d.corionicidade) texto += `Gestação ${d.corionicidade} / ${d.amnionicidade}.\n`;
    if (d.localizacaoFeto) texto += `Feto localizado: ${d.localizacaoFeto}.\n`;
    
    // Estática
    if (d.situacao && d.apresentacao) {
        texto += `Situação ${d.situacao}, apresentação ${d.apresentacao}`;
        if (d.dorso) texto += ` e com dorso ${d.dorso}`;
        texto += `.\n`;
    }

    // Bexiga Materna
    if (d.bexigaMaterna && d.bexigaMaterna !== 'não citar' && d.bexigaMaterna !== 'não visualizada') {
        texto += `Bexiga materna ${d.bexigaMaterna}.\n`;
    }
    texto += '\n';

    // -------------------------------------------------------------------------
    // 5. COLO UTERINO (Compatível com SecaoColoDados.jsx)
    // -------------------------------------------------------------------------
    const temDadosColo = d.comprimentoColo || d.coloEge || d.coloSludge === 'presente' || d.coloConclusao;
    
    if (temDadosColo || d.citarColo1Tri) {
        texto += `AVALIAÇÃO DO COLO UTERINO (VIA ENDOVAGINAL)\n`;
        
        if (d.comprimentoColo || d.medidaColo1Tri) {
            texto += `Comprimento do canal cervical: ${d.comprimentoColo || d.medidaColo1Tri} mm.\n`;
        }
        
        if (d.coloEge && d.coloEge !== 'nao_visualizado') {
            const egeTexto = d.coloEge === 'presente' ? 'presente (preservado)' : 'ausente';
            texto += `Eco Glandular Endocervical (EGE): ${egeTexto}.\n`;
        }
        
        if (d.coloSludge === 'presente') {
            texto += `Sinal do "Sludge": Presente (Ecos particulados junto ao orifício interno).\n`;
        }
        
        if (d.coloAfunilamento) {
            texto += `Ausência de sinais de afunilamento (funneling) à manobra de compressão fúndica.\n`;
        }
        
        if (d.coloConclusao) {
            texto += `Parecer: ${d.coloConclusao}.\n`;
        } else if (d.citarColo1Tri) {
            texto += `Colo uterino de aspecto normal, fechado.\n`;
        }
        texto += `\n`;
    }

    // -------------------------------------------------------------------------
    // 6. MORFOLOGIA FETAL (Corrigido: Membros, Osso Nasal, Vitalidade)
    // -------------------------------------------------------------------------
    
    // --> A. VITALIDADE (Aparece antes ou depois, conforme preferência. Aqui coloco integrado)
    const textoVitalidade = [];
    if (d.bcf) textoVitalidade.push(`Batimentos cardíacos fetais rítmicos: ${d.bcf} bpm`);
    if (d.movFetal) textoVitalidade.push(`Movimentação fetal ativa: Presente`);
    if (d.degluticao) textoVitalidade.push(`Movimentos de deglutição visualizados`);
    
    if (textoVitalidade.length > 0) {
        texto += textoVitalidade.join('. ') + '.\n\n';
    }

    // --> B. 1º TRIMESTRE (Morfológico Precoce)
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `ANÁLISE MORFOLÓGICA (11 - 14 SEMANAS)\n`;
        
        // Checklist Anatômico 1º Tri
        if (d.morfCranio || d.morfCerebro) texto += `- Polo Cefálico: Contorno craniano de aspecto habitual e plexos coróides simétricos.\n`;
        if (d.morfFace) texto += `- Face: Órbitas simétricas. Perfil facial com aspecto adequado.\n`;
        if (d.morfColuna) texto += `- Coluna: Visibilizada com aspecto aparentemente normal.\n`;
        if (d.morfTorax || d.morfCoracao) texto += `- Tórax/Coração: Forma normal. Situs solitus. Esboço das 4 câmaras visibilizado.\n`;
        if (d.morfParedeAbd || d.morfEstomago) texto += `- Abdome: Parede íntegra. Estômago visibilizado.\n`;
        if (d.morfBexiga) texto += `- Bexiga: Visibilizada.\n`;
        if (d.morfMembros) texto += `- Membros: Superiores e inferiores visibilizados e simétricos.\n`;

        texto += `\nRASTREAMENTO DE CROMOSSOMOPATIAS\n`;
        // Osso Nasal
        const statusOsso = d.ossoNasalPresente ? "Presente" : "Ausente / Não visualizado";
        texto += `- Osso Nasal: ${statusOsso}.\n`;
        
        // Tricúspide
        if (d.tricuspide) texto += `- Valva Tricúspide: Com regurgitação (marcador positivo).\n`;
        else texto += `- Valva Tricúspide: Fluxo habitual (sem regurgitação).\n`;

        // Ducto Venoso (Lógica corrigida para os Radios)
        let ondaA = "Positiva (Normal)";
        if (d.dvOndaAZero) ondaA = "Zero (Anormal)";
        if (d.dvOndaAReversa) ondaA = "Reversa (Anormal)";
        
        texto += `- Ducto Venoso: Onda A ${ondaA}`;
        if (d.dvIP) texto += ` (IP: ${d.dvIP})`;
        texto += `.\n`;

        // Tabela de Risco (Só imprime se tiver preenchido o Basal T21)
        if (d.riscoT21Basal) {
            texto += `\nCÁLCULO DE RISCO (Fetal Medicine Foundation):\n`;
            texto += `Trissomia 21: Basal 1:${d.riscoT21Basal}  |  Corrigido 1:${d.riscoT21Corrigido || '-'}\n`;
            if(d.riscoT18Basal) texto += `Trissomia 18: Basal 1:${d.riscoT18Basal}  |  Corrigido 1:${d.riscoT18Corrigido || '-'}\n`;
            if(d.riscoT13Basal) texto += `Trissomia 13: Basal 1:${d.riscoT13Basal}  |  Corrigido 1:${d.riscoT13Corrigido || '-'}\n`;
        }
        texto += `\n`;
    }

    // --> C. 2º TRIMESTRE / MORFOLÓGICO
    else {
        // Verifica se QUALQUER item da morfologia foi marcado para exibir o título
        const temMorfo = d.morfCranio || d.morfCerebro || d.morfFace || d.morfColuna || 
                         d.morfCoracao || d.morfVasosBase || d.morfTorax || 
                         d.morfEstomago || d.morfFigado || d.morfRins || d.morfBexiga || 
                         d.morfParedeAbd || d.morfGenitalia || d.morfMembros;
        
        if (temMorfo) {
            texto += `ANÁLISE MORFOLÓGICA FETAL\n`;
            
            // 1. Polo Cefálico (Crânio OU Encéfalo)
            if (d.morfCranio || d.morfCerebro) {
                texto += `- Polo Cefálico: Contorno craniano, cavum do septo pelúcido, tálamos, ventrículos e cerebelo com aspecto habitual.\n`;
            }
            // 2. Face
            if (d.morfFace) {
                texto += `- Face: Lábio superior íntegro. Perfil facial normal. Cristalinos visualizados.\n`;
            }
            // 3. Coluna
            if (d.morfColuna) {
                texto += `- Coluna Vertebral: Íntegra em toda sua extensão (cortes sagitais, coronais e transversais).\n`;
            }
            // 4. Tórax
            if (d.morfTorax) {
                texto += `- Tórax: Pulmões com ecotextura homogênea. Sem derrames ou massas.\n`;
            }
            // 5. Coração (Coração OU Vasos da Base) - CORREÇÃO AQUI
            if (d.morfCoracao || d.morfVasosBase) {
                texto += `- Coração: Situs solitus. Quatro câmaras cardíacas, vias de saída (VE/VD) e vasos da base visualizados.\n`;
            }
            // 6. Abdome Superior (Estômago OU Fígado) - CORREÇÃO AQUI
            if (d.morfEstomago || d.morfFigado) {
                texto += `- Abdome Superior: Estômago e vesícula biliar visualizados à esquerda. Aspecto habitual.\n`;
            }
            // 7. Parede Abdominal
            if (d.morfParedeAbd) {
                texto += `- Parede Abdominal: Íntegra, com inserção normal do cordão umbilical.\n`;
            }
            // 8. Aparelho Urinário (Rins OU Bexiga)
            if (d.morfRins || d.morfBexiga) {
                texto += `- Aparelho Urinário: Rins tópicos com ecotextura preservada. Bexiga visualizada.\n`;
            }
            // 9. Genitália
            if (d.morfGenitalia) {
                texto += `- Genitália: Visualizada, compatível com o sexo fetal.\n`;
            }
            // 10. Membros
            if (d.morfMembros) {
                texto += `- Membros: Visualizados ossos longos dos quatro membros. Mãos e pés com dedos presentes.\n`;
            }
            
            texto += `\n`;
        }
    }

    // -------------------------------------------------------------------------
    // 7. BIOMETRIA FETAL (ATUALIZADO PARA SECAO BIOMETRIA.JSX)
    // -------------------------------------------------------------------------
    
    // Verifica se tem alguma medida preenchida para decidir se exibe o título
    const temBiometria = d.dbp || d.cc || d.femur || d.ca || d.umero || d.cerebelo;

    if (temBiometria) {
        texto += `BIOMETRIA FETAL\n`;
        
        // Array com a ordem exata que deve aparecer no laudo
        // O helper formatBioLine cuida dos pontinhos "....." e da unidade "mm"
        const bios = [
            // Medidas Básicas (Hadlock)
            formatBioLine('Diâmetro Biparietal (DBP)', d.dbp),
            formatBioLine('Diâmetro Occipitofrontal (DOF)', d.dof),
            formatBioLine('Circunferência Cefálica (CC)', d.cc),
            formatBioLine('Circunferência Abdominal (CA)', d.ca),
            
            // Ossos Longos
            formatBioLine('Comprimento do Fêmur (CF)', d.femur),
            formatBioLine('Comprimento do Úmero', d.umero),
            formatBioLine('Comprimento da Tíbia', d.tibia),
            formatBioLine('Comprimento da Fíbula', d.fibula),
            formatBioLine('Comprimento do Rádio', d.radio),
            formatBioLine('Comprimento da Ulna', d.ulna),
            
            // Neuro e Face
            formatBioLine('Cerebelo', d.cerebelo),
            formatBioLine('Cisterna Magna', d.cisternaMagna),
            formatBioLine('Ventrículo Lateral (Átrio)', d.ventriculoPosterior), // Nome técnico ajustado
            formatBioLine('Translucência Nucal', d.tnMedida),
            formatBioLine('Prega Nucal', d.pregaNucal),
            formatBioLine('Osso Nasal', d.ossoNasal),
            formatBioLine('Dist. Biorbitária Externa', d.orbitaExterna),
            formatBioLine('Dist. Interorbitária (Int)', d.orbitaInterna),
            
            // Outros
            formatBioLine('Comprimento do Pé', d.peMedida),
            formatBioLine('Comprimento da Bexiga', d.compBexiga),
            
            // CCN (Caso seja inserido aqui, embora comum no 1º tri)
            formatBioLine('Comprimento Cabeça-Nádegas', d.ccn),
        ].filter(Boolean); // Remove linhas vazias (campos não preenchidos)
        
        texto += bios.join('\n') + '\n';

        // Adiciona os Índices calculados logo abaixo das medidas, se existirem
        if (d.resIc || d.resCcCa || d.resCfCa || d.pesoEstimado) {
            texto += `\nÍNDICES E ESTIMATIVAS:\n`;
            if (d.pesoEstimado || d.pesoFetal) {
                 texto += `- Peso Fetal Estimado: ${d.pesoEstimado || d.pesoFetal} g`;
                 if (d.percentil && !d.semDadosPercentil) texto += ` (Percentil: ${d.percentil})`;
                 texto += `.\n`;
            }
            if (d.resIc) texto += `- Índice Cefálico: ${d.resIc} (Ref: 70-86).\n`;
            // Outros índices se o médico quiser que saia no papel:
            // if (d.resCcCa) texto += `- Relação CC/CA: ${d.resCcCa}.\n`; 
        }
        
        texto += '\n';
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
        
        // 1. Artérias Uterinas (Materno)
        if (d.checkUtDir || d.checkUtEsq || d.utDirIP || d.utEsqIP) {
            texto += `Artérias Uterinas:\n`;
            // Direita
            if (d.checkUtDir || d.utDirIP) {
                texto += `- Direita: IP ${d.utDirIP || '---'}`;
                if (d.utDirIR) texto += `, IR ${d.utDirIR}`;
                if (d.utDirIncisura) texto += ` (Presença de Incisura Protodiastólica)`;
                texto += `.\n`;
            }
            // Esquerda
            if (d.checkUtEsq || d.utEsqIP) {
                texto += `- Esquerda: IP ${d.utEsqIP || '---'}`;
                if (d.utEsqIR) texto += `, IR ${d.utEsqIR}`;
                if (d.utEsqIncisura) texto += ` (Presença de Incisura Protodiastólica)`;
                texto += `.\n`;
            }
            // Média
            if (d.ipMedioUterinas) {
                texto += `- IP Médio das Uterinas: ${d.ipMedioUterinas}.\n`;
            }
        }

        // 2. Artéria Umbilical (Fetal)
        if (d.checkUmb || d.umbIP) {
            texto += `Artéria Umbilical: IP ${d.umbIP || '---'}`;
            if (d.umbIR) texto += `, IR ${d.umbIR}`;
            if (d.umbSD) texto += `, S/D ${d.umbSD}`;
            
            // Alertas Graves
            if (d.umbDiastoleZero) texto += `. OBS: DIÁSTOLE ZERO (Fluxo ausente na diástole)`;
            else if (d.umbDiastoleReversa) texto += `. OBS: DIÁSTOLE REVERSA (Fluxo reverso na diástole)`;
            else texto += `. (Fluxo diastólico preservado)`;
            
            texto += `.\n`;
        }

        // 3. Artéria Cerebral Média (Fetal)
        if (d.checkAcm || d.acmIP) {
            texto += `Artéria Cerebral Média: IP ${d.acmIP || '---'}`;
            if (d.acmPVS) texto += `, Pico de Velocidade Sistólica (PVS): ${d.acmPVS} cm/s`;
            
            if (d.acmDiastoleAlta) texto += `. (Sinais de Centralização Fetal / Vasodilatação)`;
            texto += `.\n`;
        }

        // 4. Relação C/U
        if (d.relacaoCerebroUmbilical) {
            texto += `Relação Cérebro/Umbilical (RCP): ${d.relacaoCerebroUmbilical}.\n`;
        }

        // 5. Ducto Venoso (Repetido aqui caso não seja exame de 1º Tri)
        if ((d.checkDv || d.dvIP) && d.subtipo !== 'OBSTETRICO_1_TRI') {
             let ondaTexto = 'Positiva';
             if (d.dvOndaAZero) ondaTexto = 'Zero';
             if (d.dvOndaAReversa) ondaTexto = 'Reversa';
             
             texto += `Ducto Venoso: Onda A ${ondaTexto}`;
             if (d.dvIP) texto += `, IP ${d.dvIP}`;
             texto += `.\n`;
        }
        
        texto += `\n`;
    }

    // -------------------------------------------------------------------------
    // 10. 3D/4D (Compatível com Secao3D.jsx)
    // -------------------------------------------------------------------------
    if (d.usar3D) {
        texto += `ESTUDO TRIDIMENSIONAL (3D) E DINÂMICO (4D)\n`;
        
        // Modos
        const modos = [];
        if (d.modoSurface) modos.push('Surface');
        if (d.modoMultiplanar) modos.push('Multiplanar');
        if (modos.length > 0) texto += `Modos utilizados: ${modos.join(' e ')}.\n`;
        
        // Qualidade
        texto += `Qualidade da imagem: ${d.qualidade3D || 'Satisfatória'}. `;
        if ((d.qualidade3D === 'regular' || d.qualidade3D === 'ruim') && d.fatorLimitante) {
            let motivo = d.fatorLimitante;
            if (motivo === 'liquido') motivo = 'Líquido Amniótico Reduzido';
            if (motivo === 'posicao') motivo = 'Posição Fetal Desfavorável';
            if (motivo === 'biotipo') motivo = 'Biotipo Materno (Atenuação acústica)';
            if (motivo === 'placenta') motivo = 'Interposição Placentária';
            if (motivo === 'membros') motivo = 'Membros encobrindo a face';
            texto += `Fator limitante: ${motivo}.`;
        }
        texto += `\n`;
        
        // Face
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
        if (d.nariz3D) estruturas3d.push("Nariz");
        if (d.olhos3D) estruturas3d.push("Olhos");
        if (d.orelhas3D) estruturas3d.push("Orelhas");
        if (d.maoDir3D) estruturas3d.push("Mão Direita");
        if (d.maoEsq3D) estruturas3d.push("Mão Esquerda");
        if (d.peDir3D) estruturas3d.push("Pé Direito");
        if (d.peEsq3D) estruturas3d.push("Pé Esquerdo");
        
        if (estruturas3d.length > 0) texto += `Estruturas identificadas: ${estruturas3d.join(', ')}.\n`;
        
        // Comportamento (4D)
        const comportamento = [];
        if (d.movBocejo) comportamento.push("Bocejo");
        if (d.movSorriso) comportamento.push("Sorriso / Mímica Facial");
        if (d.movPiscar) comportamento.push("Piscar de olhos");
        if (d.movLingua) comportamento.push("Protrusão de língua");
        if (d.movMaoFace) comportamento.push("Mão na face");
        if (d.movSuccao) comportamento.push("Sucção");
        if (d.movDegluticao3D) comportamento.push("Deglutição");
        
        if (comportamento.length > 0) texto += `Comportamento fetal (4D): ${comportamento.join(', ')}.\n`;
        
        if (d.obs3D) texto += `Obs: ${d.obs3D}\n`;
        texto += `\n`;
    }

    // -------------------------------------------------------------------------
    // 11. CONCLUSÃO (Finalização Blindada)
    // -------------------------------------------------------------------------
    texto += `CONCLUSÃO\n`;
    
    // Recalcula IG Final para garantir consistência
    let igFinal = d.igBiometria || d.igDum || "---";
    if (d.usarExameAnterior && d.igIgCorrigidaCalculada) igFinal = d.igIgCorrigidaCalculada;

    // 1. Frase de Abertura
    if (d.sgAbortoIncompleto) {
        texto += `Quadro compatível com restos ovulares em cavidade uterina (Abortamento Incompleto).\n`;
    }
    else if (d.subtipo === 'OBSTETRICO_1_TRI') {
        if (d.ccn) {
            texto += `Feto único com idade gestacional estimada pelo comprimento cabeça-nádegas (CCN), de ${d.resIgCcn || '...'}, com variação de 5 dias.\n`;
        } else {
            texto += `Feto único com idade gestacional compatível com ${igFinal}.\n`;
        }
        texto += `Os marcadores de cromossomopatias do 1º trimestre reduziram o risco inicial baseado na idade materna (Tabela FMF).\n`;
        texto += `Não foram encontradas anomalias nas estruturas fetais observadas no presente exame.\n`;
    } 
    else {
        texto += `- Gestação tópica, feto único vivo.\n`;
        texto += `- Biometria fetal compatível com ${igFinal}.\n`;
        if (d.subtipo === 'OBSTETRICO_MORFOLOGICO') texto += `- Exame morfológico sem evidências de anomalias estruturais.\n`;
    }

    // 2. Peso e Percentil
    if (d.pesoEstimado || d.pesoFetal) {
        texto += `- Peso fetal estimado: ${d.pesoEstimado || d.pesoFetal} g`;
        
        if (d.semDadosPercentil) {
             texto += `.\n`;
        } else if (d.percentil) {
             // Lógica para destacar RCIU na conclusão
             const percVal = parseInt(d.percentil);
             if (!isNaN(percVal) && percVal < 10) {
                 texto += ` (PERCENTIL ${d.percentil} - Risco de RCIU).\n`;
             } else {
                 texto += ` (Percentil: ${d.percentil}).\n`;
             }
        } else {
             texto += `.\n`;
        }
    }
    
    // 3. Sexo Fetal
    if (d.sexoFetal && d.sexoFetal !== 'NAO_CITAR') {
         let sexoTexto = 'Não visualizado';
         if(d.sexoFetal === 'MASCULINO') sexoTexto = 'Masculino';
         if(d.sexoFetal === 'FEMININO') sexoTexto = 'Feminino';
         texto += `- Sexo fetal: ${sexoTexto}.\n`;
    }

    // 4. Notas e Sugestões (Conforme Checkboxes da Conclusão)
    if (d.sugereGolfBall) texto += `- Foco hiperecogênico (Golf Ball) em ventrículo esquerdo. Achado isolado habitualmente benigno.\n`;
    if (d.morfoPrejudicado45mm) texto += `- Avaliação morfológica prejudicada pela idade gestacional precoce (CCN < 45mm).\n`;
    if (d.sugereNipt) texto += `- Risco aumentado para cromossomopatias. Sugere-se aconselhamento genético e NIPT/Cariótipo.\n`;
    if (d.sugerePieloectasia) texto += `- Pieloectasia fetal. Sugere-se controle evolutivo no 3º trimestre.\n`;
    if (d.sugereDopplerRciu) texto += `- Sugere-se acompanhamento rigoroso com Dopplerfluxometria (Risco de RCIU).\n`;
    if (d.coloConclusao === 'Incompetência istmo-cervical') texto += `- Achados sugestivos de Incompetência Istmo-Cervical (Colo curto/afunilado).\n`;

    if (d.obsAdicionais) texto += `\nObs: ${d.obsAdicionais}\n`;

    return { texto, tituloExame };
};

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