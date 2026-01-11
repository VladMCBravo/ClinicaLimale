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

const listarNormais = (itens) => {
    if (!itens || !Array.isArray(itens)) return null;
    const validos = itens.filter(i => i.checked).map(i => i.label);
    if (validos.length === 0) return null;
    if (validos.length === 1) return `Visualizado ${validos[0]} de aspecto normal.`;
    const ultimo = validos.pop();
    return `Visualizados ${validos.join(', ')} e ${ultimo} de aspecto normal.`;
};

// =============================================================================
// TEXTOS FIXOS (Disclaimers)
// =============================================================================
const TEXTO_DISCLAIMER_MORFO_1 = "A sensibilidade da medida da translucência nucal e a avaliação do osso nasal na detecção de cromossomopatias (trissomia 21) é de aproximadamente 90%, quando realizada entre 11 e 14 semanas. O risco corrigido foi calculado com base na Fetal Medicine Foundation. Riscos nesta fase são superiores aos do 2º trimestre.";
const TEXTO_DISCLAIMER_MORFO_2 = "O ultrassom morfológico tem uma sensibilidade de 83,5%, entre a 20ª e a 24ª semana de gestação, na detecção de anomalias estruturais (Estudo F. Gonçalves).";

// =============================================================================
// GERADOR DE RELATÓRIO (LÓGICA UNIVERSAL)
// =============================================================================
export const gerarRelatorioFeto = (d) => {
    let texto = '';
    
    // 1. TÍTULO DO EXAME
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
    // 2. DATAÇÃO E IDADE GESTACIONAL (Sempre roda)
    // -------------------------------------------------------------------------
    if (d.usarDum) {
        if (d.exibirDataDum && d.dum) texto += `Data da última menstruação (DUM): ${formatData(d.dum)}\n`;
        if (d.citarDppDum && d.dppDum) {
            texto += `Data provável do parto (DUM): ${d.dppDum}`;
            if (d.igDum) texto += `, compatível com ${d.igDum}`;
            texto += `.\n`;
        } else if (d.igDum) {
            texto += `Exame realizado com ${d.igDum} de idade gestacional (cronológica).\n`;
        }
    } else if (d.dumDesconhecida) {
        texto += `Data da última menstruação: Desconhecida / Não referida.\n`;
    }

    if (d.usarExameAnterior && d.dataExameAnterior) {
        const dataAnt = formatData(d.dataExameAnterior);
        texto += `Idade gestacional datada pelo ultrassom de ${dataAnt}: ${d.igIgCorrigidaCalculada || '...'}.\n`;
    } else if (d.citarDppBiometria && d.dppBiometriaCalculada) {
         texto += `Data provável do parto (Biometria atual): ${d.dppBiometriaCalculada}.\n`;
    }
    texto += '\n';

    // -------------------------------------------------------------------------
    // 3. ANATOMIA MATERNA E SACO GESTACIONAL
    // -------------------------------------------------------------------------
    
    // Bexiga Materna (Auditado: Funciona para qualquer exame agora)
    if (d.bexigaMaterna && d.bexigaMaterna !== 'não citar' && d.bexigaMaterna !== 'não visualizada') {
        texto += `Bexiga materna ${d.bexigaMaterna}.\n`;
    }

    // Útero (Se tiver descrição)
    if (d.utero) {
        const uteroTexto = d.utero === 'globoso' ? 'globoso, aumentado de volume' : d.utero;
        texto += `Útero ${uteroTexto}`;
        if (d.miometrio) texto += `, com miométrio de textura ${d.miometrio}`;
        texto += `.\n`;
    }

    // Lógica de Saco Gestacional (Se houver dados de SG, imprime)
    if (d.citarSg || (d.subtipo && d.subtipo.includes("INICIAL"))) {
        if (d.sgLocalizacao) texto += `Saco gestacional tópico, implantado no ${d.sgLocalizacao}.\n`;
        if (d.resDmsg) texto += `Diâmetro Médio do Saco Gestacional (DMSG): ${d.resDmsg} mm.\n`;
        
        // Vesícula / Embrião
        if (d.embriaoNaoVisualizado) {
            texto += `Vesícula vitelina ${d.citarVv ? 'visualizada' : 'não visualizada'}. Embrião não caracterizado no momento.\n`;
        } else if (d.ccn) {
            texto += `Visualizado embrião medindo ${d.ccn} mm (CCN).\n`;
        }
        
        // Trofoblasto e Descolamentos
        if (d.trofoblasto) texto += `Trofoblasto de inserção ${d.trofoblasto}.\n`;
        
        if (d.sgComDescolamento || (d.desc1 && parseFloat(d.desc1) > 0)) {
            texto += `Observa-se área de descolamento/hematoma medindo ${d.desc1 || '-'} x ${d.desc2 || '-'} mm.\n`;
        } else if (d.sgSemDescolamento) {
            texto += `Não se observam áreas de descolamento ovular.\n`;
        }
    }
    texto += '\n';

    // -------------------------------------------------------------------------
    // 4. ESTÁTICA FETAL E DADOS GERAIS (Auditado)
    // -------------------------------------------------------------------------
    
    // Gêmeos
    if (d.corionicidade || d.amnionicidade) {
        texto += `Gestação ${d.corionicidade || ''} e ${d.amnionicidade || ''}.\n`;
    }

    // Localização e Posição
    if (d.localizacaoFeto) texto += `Feto localizado: ${d.localizacaoFeto}.\n`;
    
    // Situação/Apresentação (Auditado: Funciona para 1º Tri e 2º Tri se preenchido)
    if (d.situacao && d.apresentacao) {
        texto += `Situação ${d.situacao}, apresentação ${d.apresentacao}`;
        if (d.dorso) texto += ` e dorso ${d.dorso}`;
        texto += `.\n`;
    }

    // Anatomia Básica (Checkboxes "Estômago" e "Bexiga" do SecaoDadosGerais)
    const anatomiaBasica = [];
    if (d.estomagoVisualizado) anatomiaBasica.push("Estômago");
    if (d.bexigaVisualizada) anatomiaBasica.push("Bexiga");
    
    if (anatomiaBasica.length > 0) {
        texto += `Anatomia fetal básica: ${anatomiaBasica.join(' e ')} visualizados.\n`;
    }

    // -------------------------------------------------------------------------
    // 5. PLACENTA E LÍQUIDO
    // -------------------------------------------------------------------------
    if (d.placentaLocalizacao) {
        if (d.subtipo === 'OBSTETRICO_1_TRI') texto += `PLACENTA\n`; // Título opcional
        texto += `Placenta ${d.placentaLocalizacao}`;
        if (d.placentaGrau) texto += `, grau ${d.placentaGrau} (Grannum)`;
        if (d.placentaEspessura) texto += `, espessura ${d.placentaEspessura} mm`;
        texto += `. Sem sinais de descolamento.\n`;
    }

    if (d.liquidoAmniotico) {
        texto += `Líquido amniótico: ${d.liquidoAmniotico}. `;
        if (d.mbv) texto += `Maior bolsão vertical: ${d.mbv} mm.`;
        else if (d.ila) texto += `ILA: ${d.ila} mm.`;
        texto += `\n`;
    }
    texto += '\n';

    // -------------------------------------------------------------------------
    // 6. COLO UTERINO (Auditado)
    // -------------------------------------------------------------------------
    // Imprime se qualquer dado de colo estiver preenchido
    if (d.comprimentoColo || d.coloEge || d.coloSludge === 'presente' || d.coloConclusao) {
        texto += `AVALIAÇÃO DO COLO UTERINO (VIA ENDOVAGINAL)\n`;
        if (d.comprimentoColo) texto += `Comprimento do colo: ${d.comprimentoColo} mm.\n`;
        if (d.coloEge && d.coloEge !== 'nao_visualizado') texto += `Eco Glandular Endocervical (EGE): ${d.coloEge}.\n`;
        if (d.coloSludge === 'presente') texto += `Presença de sinal do "Sludge".\n`;
        if (d.coloAfunilamento) texto += `Ausência de afunilamento (funneling) à compressão fúndica.\n`;
        if (d.coloConclusao) texto += `Parecer: ${d.coloConclusao}.\n`;
        texto += `\n`;
    }

    // -------------------------------------------------------------------------
    // 7. MORFOLOGIA (Auditado: Checkboxes 1º Tri vs 2º Tri)
    // -------------------------------------------------------------------------
    
    // --> 1º TRIMESTRE (Rastreamento)
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `MORFOLOGIA FETAL (11-14 SEMANAS)\n`;
        
        // Checkboxes individuais (Imagem 2)
        if (d.morfCranio || d.morfCerebro) texto += `POLO CEFÁLICO: Contorno craniano íntegro, plexos coróides simétricos.\n`;
        if (d.morfFace) texto += `FACE: Perfil facial adequado.\n`;
        if (d.morfColuna) texto += `COLUNA: Visibilizada e íntegra.\n`;
        if (d.morfTorax || d.morfCoracao) texto += `TÓRAX/CORAÇÃO: Situs solitus, 4 câmaras visualizadas.\n`;
        if (d.morfParedeAbd || d.morfEstomago) texto += `ABDOME: Parede íntegra, estômago visualizado.\n`;
        if (d.morfMembros) texto += `MEMBROS: Visualizados 4 membros com 3 segmentos.\n`;
        
        // Marcadores Específicos
        if (d.citarTn && d.tnMedida) texto += `Translucência Nucal: ${d.tnMedida} mm.\n`;
        if (d.ossoNasalPresente) texto += `Osso Nasal: Visualizado (Presente).\n`;
        if (d.dvOnda || d.dvIP) texto += `Ducto Venoso: Onda A ${d.dvOnda === 'zero' ? 'Zero' : d.dvOnda === 'reversa' ? 'Reversa' : 'Positiva'}.\n`;
        if (d.tricuspide) texto += `Regurgitação Tricúspide: Presente.\n`;

        // Tabela de Risco
        if (d.riscoT21Basal || d.riscoT21Corrigido) {
            texto += `\nCÁLCULO DE RISCO (Fetal Medicine Foundation)\n`;
            texto += `Trissomia 21: Basal 1/${d.riscoT21Basal || '-'} | Corrigido 1/${d.riscoT21Corrigido || '-'}\n`;
            texto += `Trissomia 18: Basal 1/${d.riscoT18Basal || '-'} | Corrigido 1/${d.riscoT18Corrigido || '-'}\n`;
            texto += `Trissomia 13: Basal 1/${d.riscoT13Basal || '-'} | Corrigido 1/${d.riscoT13Corrigido || '-'}\n`;
        }
        texto += `\n`;
    }

    // --> 2º TRIMESTRE (Morfológico Detalhado)
    if (d.subtipo === 'OBSTETRICO_MORFOLOGICO') {
        texto += `ANÁLISE MORFOLÓGICA\n`;
        // Usa a função auxiliar para listar os normais checados
        if (d.itensCabeca) texto += `Cabeça: ${listarNormais(d.itensCabeca)}\n`;
        else {
             // Fallback para checkboxes manuais se não usar lista
            if (d.morfCranio) texto += `Crânio normal. `;
            if (d.morfCerebro) texto += `Encéfalo normal. `;
            if (d.morfFace) texto += `Face/Perfil normal. `;
            if (d.morfColuna) texto += `Coluna íntegra. `;
            if (d.morfCoracao) texto += `Coração (4 câmaras/Vias) normal. `;
            if (d.morfEstomago) texto += `Estômago visualizado. `;
            if (d.morfRins) texto += `Rins normais. `;
            if (d.morfBexiga) texto += `Bexiga visualizada. `;
            if (d.morfMembros) texto += `Membros visualizados. `;
            texto += `\n`;
        }
    }

    // Vitalidade (Qualquer exame)
    if (d.bcf || d.movFetal) {
        texto += `VITALIDADE: `;
        if (d.bcf) texto += `BCF ${d.bcf} bpm, rítmicos. `;
        if (d.movFetal) texto += `Movimentação fetal presente. `;
        texto += `\n\n`;
    }

    // -------------------------------------------------------------------------
    // 8. BIOMETRIA (Auditado)
    // -------------------------------------------------------------------------
    const temBiometria = d.dbp || d.cc || d.femur || d.ccn || d.cerebelo || d.tnMedida || d.ossoNasal || d.orbitaInterna || d.compBexiga;

    if (temBiometria) {
        texto += `BIOMETRIA FETAL\n`;
        const bios = [
            formatBioLine('CCN', d.ccn),
            formatBioLine('DBP', d.dbp),
            formatBioLine('DOF', d.dof),
            formatBioLine('CC', d.cc),
            formatBioLine('CA', d.ca),
            formatBioLine('Fêmur', d.femur),
            formatBioLine('Úmero', d.umero),
            formatBioLine('TN', d.tnMedida),
            formatBioLine('Osso Nasal', d.ossoNasal),
            !d.ossoNasal && d.ossoNasalPresente ? "Osso Nasal ..................................... Visualizado." : null,
            formatBioLine('Cerebelo', d.cerebelo),
            formatBioLine('Cisterna Magna', d.cisternaMagna),
            formatBioLine('Ventrículo Lateral', d.ventriculoPosterior),
            formatBioLine('Colo Uterino', d.comprimentoColo), // Redundância útil na tabela
        ].filter(Boolean);
        
        texto += bios.join('\n') + '\n';
        
        if (d.pesoFetal) {
            texto += `\nPeso Fetal Estimado: ${d.pesoFetal} g (+/- 15%).\n`;
            if (d.percentil) texto += `Percentil: ${d.percentil}\n`;
        }
        texto += '\n';
    }

    // -------------------------------------------------------------------------
    // 9. CONCLUSÃO (Auditado)
    // -------------------------------------------------------------------------
    texto += `CONCLUSÃO\n`;
    let igFinal = d.igBiometria || d.igDum || "---";
    if (d.usarExameAnterior && d.igIgCorrigidaCalculada) igFinal = d.igIgCorrigidaCalculada;

    // Conclusão Específica 1º Tri
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `Gestação única de ${d.ccn ? diasParaTextoIG(calcularDiasPeloCCN(d.ccn)) : igFinal}.\n`;
        if (d.riscoT21Corrigido && parseInt(d.riscoT21Corrigido) > 100) {
            texto += `Rastreamento de 1º Trimestre: BAIXO RISCO para cromossomopatias avaliadas.\n`;
        }
        texto += `Morfologia fetal adequada para a idade gestacional.\n`;
    } 
    // Conclusão Inicial / Aborto
    else if (d.subtipo === 'OBSTETRICO_INICIAL' && d.sgAbortoIncompleto) {
        texto += `Quadro compatível com Abortamento Incompleto.\n`;
    }
    // Conclusão Padrão
    else {
        texto += `- Gestação tópica, feto único.\n`;
        texto += `- Biometria compatível com ${igFinal}.\n`;
        if (d.subtipo === 'OBSTETRICO_MORFOLOGICO') texto += `- Exame morfológico sem evidências de anomalias.\n`;
        if (d.subtipo === 'OBSTETRICO_DOPPLER') texto += `- Dopplerfluxometria normal.\n`;
    }
    
    if (d.sugereGolfBall) texto += `- Foco hiperecogênico (Golf Ball) em VE. Sugere-se controle.\n`;
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