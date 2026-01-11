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
// TEXTOS FIXOS (Disclaimers)
// =============================================================================
const TEXTO_DISCLAIMER_MORFO_1 = "A sensibilidade da medida da translucência nucal e a avaliação do osso nasal na detecção de cromossomopatias (trissomia 21) é de aproximadamente 90%, quando realizada entre 11 e 14 semanas. O risco corrigido foi calculado com base na Fetal Medicine Foundation.";
const TEXTO_DISCLAIMER_MORFO_2 = "O ultrassom morfológico tem uma sensibilidade de 83,5%, entre a 20ª e a 24ª semana de gestação, na detecção de anomalias estruturais (Estudo F. Gonçalves).";

// =============================================================================
// GERADOR DE RELATÓRIO (AUDITORIA TOTAL BASEADA NAS IMAGENS)
// =============================================================================
export const gerarRelatorioFeto = (d) => {
    let texto = '';
    
    // Título (Mapeamento padrão)
    const mapTitulos = {
        'OBSTETRICO_INICIAL': 'ULTRASSONOGRAFIA OBSTÉTRICA TRANSVAGINAL (INICIAL)',
        'OBSTETRICO_1_TRI': 'ULTRASSONOGRAFIA MORFOLÓGICA DO 1º TRIMESTRE',
        'OBSTETRICO_2_3_TRI': 'ULTRASSONOGRAFIA OBSTÉTRICA',
        'OBSTETRICO_DOPPLER': 'ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLERFLUXOMETRIA',
        'OBSTETRICO_MORFOLOGICO': 'ULTRASSONOGRAFIA MORFOLÓGICA DO 2º TRIMESTRE',
        'OBSTETRICO_3D': 'ULTRASSONOGRAFIA OBSTÉTRICA 3D/4D'
    };
    const tituloExame = mapTitulos[d.subtipo] || 'ULTRASSONOGRAFIA OBSTÉTRICA';
    
    // -------------------------------------------------------------------------
    // 1. DATAÇÃO (Sempre roda)
    // -------------------------------------------------------------------------
    if (d.usarDum) {
        if (d.exibirDataDum && d.dum) texto += `Data da última menstruação (DUM): ${formatData(d.dum)}\n`;
        if (d.citarDppDum && d.dppDum) {
            texto += `DPP (DUM): ${d.dppDum}`;
            if (d.igDum) texto += `, compatível com ${d.igDum}`;
            texto += `.\n`;
        } else if (d.igDum) {
            texto += `Exame realizado com ${d.igDum} (cronológica).\n`;
        }
    } else if (d.dumDesconhecida) {
        texto += `Data da última menstruação: Desconhecida.\n`;
    }

    if (d.usarExameAnterior && d.dataExameAnterior) {
        const dataAnt = formatData(d.dataExameAnterior);
        texto += `IG datada pelo ultrassom de ${dataAnt}: ${d.igIgCorrigidaCalculada || '...'}.\n`;
    } else if (d.citarDppBiometria && d.dppBiometriaCalculada) {
         texto += `DPP (Biometria atual): ${d.dppBiometriaCalculada}.\n`;
    }
    texto += '\n';

    // -------------------------------------------------------------------------
    // 2. ÚTERO E SACO GESTACIONAL (Imagens 2, 4, 6)
    // -------------------------------------------------------------------------
    
    // Bexiga Materna (Universal)
    if (d.bexigaMaterna && d.bexigaMaterna !== 'não citar' && d.bexigaMaterna !== 'não visualizada') {
        texto += `Bexiga materna ${d.bexigaMaterna}.\n`;
    }

    // Útero
    if (d.utero) {
        const uteroTexto = d.utero === 'globoso' ? 'globoso, aumentado de volume' : d.utero;
        texto += `Útero ${uteroTexto}`;
        if (d.miometrio) texto += `, miométrio ${d.miometrio}`;
        texto += `.\n`;
    }

    // Lógica do Saco Gestacional
    // Ativa se checkbox "Citar Saco" estiver on OU se for subtipo INICIAL
    if (d.citarSg || (d.subtipo && d.subtipo.includes("INICIAL"))) {
        
        // Localização
        if (d.sgLocalizacao) texto += `Saco gestacional implantado na parede ${d.sgLocalizacao}.\n`;
        
        // Biometria SG (Imagem 4)
        if (d.resDmsg) texto += `Diâmetro Médio do Saco Gestacional (DMSG): ${d.resDmsg} mm.\n`;
        
        // Embrião / Vesícula
        if (d.embriaoNaoVisualizado) {
            texto += `Vesícula vitelina ${d.citarVv ? 'visualizada' : 'não visualizada'}. Embrião não caracterizado.\n`;
        } else if (d.ccn) {
            texto += `Visualizado embrião medindo ${d.ccn} mm (CCN).\n`;
        }
        
        // Trofoblasto (Imagem 2)
        if (d.trofoblasto) texto += `Trofoblasto de inserção ${d.trofoblasto}.\n`;
        
        // Hematoma / Descolamento (Imagem 2)
        if (d.sgComDescolamento || (d.desc1 && parseFloat(d.desc1) > 0)) {
            texto += `Observa-se área de descolamento/hematoma medindo ${d.desc1 || '-'} x ${d.desc2 || '-'} mm.\n`;
        } else if (d.sgSemDescolamento) {
            texto += `Não se observam áreas de descolamento ovular.\n`;
        }
        
        // Abortamento (Imagem 6)
        if (d.sgAbortoIncompleto) {
            texto += `Cavidade uterina preenchida por conteúdo heterogêneo (restos ovulares).\n`;
        }
    }
    texto += '\n';

    // -------------------------------------------------------------------------
    // 3. ESTÁTICA FETAL (Imagem 1)
    // -------------------------------------------------------------------------
    if (d.corionicidade) texto += `Gestação ${d.corionicidade} / ${d.amnionicidade}.\n`;

    if (d.localizacaoFeto) texto += `Feto localizado: ${d.localizacaoFeto}.\n`;
    
    // Agora imprime SEMPRE que preenchido (destravado)
    if (d.situacao && d.apresentacao) {
        texto += `Situação ${d.situacao}, apresentação ${d.apresentacao}`;
        if (d.dorso) texto += ` e dorso ${d.dorso}`;
        texto += `.\n`;
    }

    // Anatomia Básica (Checkboxes "Estômago" e "Bexiga" da imagem 4)
    const anatomiaBasica = [];
    if (d.estomagoVisualizado) anatomiaBasica.push("Estômago");
    if (d.bexigaVisualizada) anatomiaBasica.push("Bexiga");
    if (anatomiaBasica.length > 0) texto += `Anatomia básica: ${anatomiaBasica.join(' e ')} visualizados.\n`;

    // -------------------------------------------------------------------------
    // 4. PLACENTA E LÍQUIDO (Imagem 5)
    // -------------------------------------------------------------------------
    if (d.placentaLocalizacao) {
        texto += `Placenta ${d.placentaLocalizacao}`;
        if (d.placentaGrau) texto += `, grau ${d.placentaGrau}`;
        if (d.placentaEspessura) texto += `, espessura ${d.placentaEspessura} mm`;
        texto += `.\n`;
    }

    if (d.liquidoAmniotico) {
        texto += `Líquido amniótico: ${d.liquidoAmniotico}. `;
        if (d.mbv) {
            texto += `Maior bolsão vertical: ${d.mbv} mm.`;
        } else if (d.ila) {
            texto += `ILA: ${d.ila} mm`;
            // CORREÇÃO: Referência do líquido (Imagem 5)
            if (d.ilaRefMin || d.ilaRefMax) {
                texto += ` (Ref: ${d.ilaRefMin || '80'} a ${d.ilaRefMax || '180'} mm)`;
            }
            texto += `.`;
        }
        texto += `\n`;
    }
    texto += '\n';

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
    // 6. MORFOLOGIA GERAL (Imagens 3 e 4)
    // -------------------------------------------------------------------------
    // Lógica unificada: Se o checkbox está true, imprime o texto.
    
    const itensMorfo = [];
    
    // Cabeça e Pescoço
    if (d.morfCranio) itensMorfo.push("Crânio/Calota íntegros");
    if (d.morfCerebro) itensMorfo.push("Encéfalo/Ventrículos normais");
    if (d.morfFace) itensMorfo.push("Face/Perfil normais");
    if (d.morfColuna) itensMorfo.push("Coluna Vertebral íntegra");
    
    // Tórax
    if (d.morfTorax) itensMorfo.push("Pulmões homogêneos");
    if (d.morfCoracao) itensMorfo.push("Coração (4 câmaras) visualizado");
    if (d.morfVasosBase) itensMorfo.push("Vasos da base visualizados");
    
    // Abdome
    if (d.morfEstomago) itensMorfo.push("Estômago visualizado");
    if (d.morfFigado) itensMorfo.push("Fígado/Vesícula visualizados");
    if (d.morfRins) itensMorfo.push("Rins tópicos");
    if (d.morfBexiga) itensMorfo.push("Bexiga visualizada");
    if (d.morfParedeAbd) itensMorfo.push("Parede Abdominal íntegra");
    
    // Outros
    if (d.morfGenitalia) itensMorfo.push("Genitália Externa normal");
    if (d.morfMembros) itensMorfo.push("Membros (sup/inf) visualizados");

    // Se tiver itens marcados, imprime a seção
    if (itensMorfo.length > 0 || d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `ANÁLISE MORFOLÓGICA\n`;
        
        // Rastreamento 1º Tri Específico (Imagem 3 - Risco)
        if (d.subtipo === 'OBSTETRICO_1_TRI') {
             if (d.citarTn && d.tnMedida) texto += `Translucência Nucal: ${d.tnMedida} mm.\n`;
             if (d.ossoNasalPresente) texto += `Osso Nasal: Presente.\n`;
             if (d.tricuspide) texto += `Regurgitação Tricúspide: Presente.\n`;
             // Ducto Venoso (Imagem 8 e 10)
             if (d.dvOnda || d.dvIP) {
                 texto += `Ducto Venoso: IP ${d.dvIP || '-'}, Onda A ${d.dvOnda === 'zero' ? 'Zero' : d.dvOnda === 'reversa' ? 'Reversa' : 'Positiva'}.\n`;
             }
             
             // Tabela de Risco (Imagem 3)
             if (d.riscoT21Basal) {
                 texto += `\nCÁLCULO DE RISCO (1:X)\n`;
                 texto += `T21: Basal 1/${d.riscoT21Basal} | Corrigido 1/${d.riscoT21Corrigido}\n`;
                 texto += `T18: Basal 1/${d.riscoT18Basal} | Corrigido 1/${d.riscoT18Corrigido}\n`;
                 texto += `T13: Basal 1/${d.riscoT13Basal} | Corrigido 1/${d.riscoT13Corrigido}\n\n`;
             }
        }
        
        // Lista os itens anatômicos checados
        if (itensMorfo.length > 0) {
            texto += `Estruturas visualizadas de aspecto habitual: ${itensMorfo.join(', ')}.\n`;
        }
    }
    texto += '\n';

    // -------------------------------------------------------------------------
    // 7. VITALIDADE
    // -------------------------------------------------------------------------
    if (d.bcf || d.movFetal || d.degluticao) { // Imagem: Checkbox Deglutição
        texto += `VITALIDADE FETAL: `;
        if (d.bcf) texto += `BCF ${d.bcf} bpm. `;
        if (d.movFetal) texto += `Movimentação somática presente. `;
        if (d.degluticao) texto += `Movimentos de deglutição visualizados. `;
        texto += `\n\n`;
    }

    // -------------------------------------------------------------------------
    // 8. DOPPLERFLUXOMETRIA (CORRIGIDO: CHECKBOXES E TRAVA)
    // -------------------------------------------------------------------------
    // Só imprime se a trava "usarDoppler" estiver ativada
    if (d.usarDoppler) {
        texto += `ESTUDO DOPPLERFLUXOMÉTRICO\n`;
        
        // Uterinas
        if (d.checkUtDir || d.checkUtEsq || d.utDirIP || d.utEsqIP) {
            texto += `Artérias Uterinas: `;
            if (d.utDirIP) texto += `Direita (IP: ${d.utDirIP}, IR: ${d.utDirIR}). `;
            if (d.utEsqIP) texto += `Esquerda (IP: ${d.utEsqIP}, IR: ${d.utEsqIR}). `;
            
            const incisuras = [];
            if (d.utDirIncisura) incisuras.push("Direita");
            if (d.utEsqIncisura) incisuras.push("Esquerda");
            if (incisuras.length > 0) texto += `Incisura presente: ${incisuras.join(', ')}.`;
            texto += `\n`;
        }

        // Umbilical
        if (d.checkUmb || d.umbIP) {
            texto += `Artéria Umbilical: IP: ${d.umbIP}, IR: ${d.umbIR}, S/D: ${d.umbSD}. `;
            if (d.umbDiastoleZero) texto += `(Diástole Zero). `;
            if (d.umbDiastoleReversa) texto += `(Diástole Reversa). `;
            texto += `\n`;
        }

        // Cerebral (ACM)
        if (d.checkAcm || d.acmIP) {
            texto += `Artéria Cerebral Média: IP: ${d.acmIP}, PVS: ${d.acmPVS} cm/s. `;
            if (d.acmDiastoleAlta) texto += `(Sinais de Centralização). `;
            texto += `\n`;
        }

        // Ducto Venoso (Seção Doppler)
        if (d.checkDv || d.dvIP) {
             texto += `Ducto Venoso: ${d.dvIP ? 'IP '+d.dvIP : 'Avaliado'}`;
             if (d.dvOndaAZero) texto += ` (Onda A Zero)`;
             else if (d.dvOndaAReversa) texto += ` (Onda A Reversa)`;
             else if (d.dvIP) texto += ` (Onda A Positiva)`;
             texto += `.\n`;
        }

        // Relação C/U
        if (d.relacaoCerebroUmbilical) {
            texto += `Relação Cérebro/Umbilical: ${d.relacaoCerebroUmbilical}.\n`;
        }
        texto += '\n';
    }

    // -------------------------------------------------------------------------
    // 9. BIOMETRIA (Imagens 7 e 9)
    // -------------------------------------------------------------------------
    // Verificando todos os campos das imagens
    const temBiometria = d.dbp || d.cc || d.femur || d.orbitaInterna || d.tibia || d.peMedida;

    if (temBiometria) {
        texto += `BIOMETRIA FETAL\n`;
        const bios = [
            formatBioLine('CCN', d.ccn),
            formatBioLine('DBP', d.dbp),
            formatBioLine('DOF', d.dof),
            formatBioLine('CC', d.cc),
            formatBioLine('CA', d.ca),
            // Ossos Longos (Imagem 9)
            formatBioLine('Fêmur', d.femur),
            formatBioLine('Úmero', d.umero),
            formatBioLine('Tíbia', d.tibia),
            formatBioLine('Fíbula', d.fibula),
            formatBioLine('Rádio', d.radio),
            formatBioLine('Ulna', d.ulna),
            // Face e Neuro (Imagem 7)
            formatBioLine('TN', d.tnMedida),
            formatBioLine('Prega Nucal', d.pregaNucal),
            formatBioLine('Osso Nasal', d.ossoNasal),
            formatBioLine('Dist. Biorbitária (Ext)', d.orbitaExterna),
            formatBioLine('Dist. Interorbitária (Int)', d.orbitaInterna), // <--- Adicionado
            formatBioLine('Cerebelo', d.cerebelo),
            formatBioLine('Cisterna Magna', d.cisternaMagna),
            formatBioLine('Ventrículo Lateral', d.ventriculoPosterior),
            // Outros (Imagem 9)
            formatBioLine('Comp. Pé', d.peMedida), // <--- Adicionado
            formatBioLine('Comp. Bexiga', d.compBexiga), // <--- Adicionado
        ].filter(Boolean);
        
        texto += bios.join('\n') + '\n';
        
        if (d.pesoFetal) {
            texto += `\nPeso Fetal Estimado: ${d.pesoFetal} g (+/- 15%).\n`;
            if (d.percentil) texto += `Percentil: ${d.percentil}\n`;
        }
        texto += '\n';
    }

    // -------------------------------------------------------------------------
    // 10. 3D/4D (CORRIGIDO: MODOS, OBS E TRAVA)
    // -------------------------------------------------------------------------
    // Só imprime se a trava "usar3D" estiver ativada
    if (d.usar3D) {
        texto += `ESTUDO TRIDIMENSIONAL (3D) E DINÂMICO (4D)\n`;
        
        // Modos
        const modos = [];
        if (d.modoSurface) modos.push('Surface');
        if (d.modoMultiplanar) modos.push('Multiplanar');
        if (modos.length > 0) texto += `Modos utilizados: ${modos.join(' e ')}.\n`;
        
        // Qualidade
        texto += `Qualidade da imagem: ${d.qualidade3D || 'Satisfatória'}. `;
        
        // Fator Limitante (Só se não for ótima/boa)
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
        
        // Análise Facial
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
        
        // Observações Específicas 3D
        if (d.obs3D) texto += `Obs: ${d.obs3D}\n`;
        texto += `\n`;
    }

    // -------------------------------------------------------------------------
    // 11. CONCLUSÃO E DIAGNÓSTICO (CORRIGIDO: PESO, SEXO, NOTAS)
    // -------------------------------------------------------------------------
    texto += `CONCLUSÃO\n`;
    let igFinal = d.igBiometria || d.igDum || "---";
    if (d.usarExameAnterior && d.igIgCorrigidaCalculada) igFinal = d.igIgCorrigidaCalculada;

    // Aborto
    if (d.sgAbortoIncompleto) {
        texto += `Quadro compatível com Abortamento Incompleto (Restos ovulares).\n`;
    }
    else {
        // Frase Principal
        if (d.subtipo === 'OBSTETRICO_1_TRI') {
            texto += `Gestação única de ${d.ccn ? diasParaTextoIG(calcularDiasPeloCCN(d.ccn)) : igFinal}.\n`;
        } else {
            texto += `- Gestação tópica.\n`;
            texto += `- Biometria compatível com ${igFinal}.\n`;
        }
        
        // 1. Peso (Prioridade: pesoEstimado > pesoFetal)
        const pesoFinal = d.pesoEstimado || d.pesoFetal;
        if (pesoFinal) {
            texto += `- Peso fetal estimado: ${pesoFinal} g (+/- 10%).`;
            if (d.percentil) texto += ` (Percentil: ${d.percentil}).`;
            texto += `\n`;
        }
        
        // 2. Sexo Fetal
        if (d.sexoFetal && d.sexoFetal !== 'NAO_CITAR') {
             let sexoTexto = d.sexoFetal.toLowerCase();
             if(d.sexoFetal === 'MASCULINO') sexoTexto = 'Masculino';
             if(d.sexoFetal === 'FEMININO') sexoTexto = 'Feminino';
             if(d.sexoFetal === 'NAO_VISUALIZADO') sexoTexto = 'Não visualizado';
             texto += `- Sexo fetal: ${sexoTexto}.\n`;
        }

        // 3. Notas e Sugestões (Checkboxes)
        if (d.morfoPrejudicado45mm) texto += `- Avaliação morfológica prejudicada (CCN < 45mm).\n`;
        if (d.sugereNipt) texto += `- Risco aumentado para cromossomopatias. Sugere-se NIPT ou cariótipo.\n`;
        if (d.sugereGolfBall) texto += `- Foco hiperecogênico no VE (Golf Ball). Sugere-se controle.\n`;
        if (d.sugerePieloectasia) texto += `- Pieloectasia fetal. Sugere-se controle evolutivo.\n`;
        if (d.sugereDopplerRciu) texto += `- Sugere-se acompanhamento com Dopplerfluxometria (Risco de RCIU).\n`;
        
        // Conclusão Morfológico/Doppler
        if (d.subtipo === 'OBSTETRICO_MORFOLOGICO') texto += `- Exame morfológico sem evidências de anomalias estruturais.\n`;
        if (d.usarDoppler) texto += `- Estudo Dopplerfluxométrico dentro dos padrões de normalidade.\n`;
    }
    
    // Observações Finais
    if (d.obsAdicionais) texto += `\nObs: ${d.obsAdicionais}\n`;

    return { texto, tituloExame };
};

// =============================================================================
// HELPERS FINAIS
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

    if (dadosGerais.subtipo === 'OBSTETRICO_1_TRI') textoFinal += `\n\n---\n${TEXTO_DISCLAIMER_MORFO_1}`;
    if (dadosGerais.subtipo === 'OBSTETRICO_MORFOLOGICO') textoFinal += `\n\n---\n${TEXTO_DISCLAIMER_MORFO_2}`;
    
    return textoFinal;
};

export const montarTextoFinal = (res) => res.texto;
const calcularDiasPeloCCN = (ccn) => Math.round(parseFloat(ccn) + 42);
const diasParaTextoIG = (totalDias) => `${Math.floor(totalDias / 7)} semanas e ${totalDias % 7} dias`;