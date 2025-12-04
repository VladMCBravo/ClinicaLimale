import { formatData } from './obstetricCalculations';

/**
 * Função Auxiliar: Gera Conclusão Inteligente
 */
const gerarConclusaoAutomatica = (d) => {
    const achados = [];

    // 1. Vitalidade / Tipo de Gestação
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        if (d.embriaoNaoVisualizado) achados.push("Gestação incipiente / Embrião não visualizado.");
        else if (d.bcfIndetectavel) achados.push("Gestação inviável (Aborto retido).");
        else if (d.sgAbortoIncompleto) achados.push("Sinais de abortamento incompleto.");
        else achados.push("Gestação tópica e evolutiva.");

        if (d.sgComDescolamento) achados.push(`Hematoma subcoriônico / Descolamento (${d.desc1}x${d.desc2} mm).`);
        if (d.citarTn && d.tnRisco) achados.push(`Rastreamento de 1º trimestre realizado.`);
    } else {
        // 2/3 Tri
        achados.push("Gestação tópica, feto único, vivo.");
    }

    // 2. Anexos
    if (d.liquidoVolume === 'Reduzido') achados.push("Oligodrâmnio.");
    if (d.liquidoVolume === 'Aumentado') achados.push("Polidrâmnio.");
    if (d.placentaInsercao === 'Prévia') achados.push("Placenta Prévia.");
    if (d.placentaInsercao === 'Baixa') achados.push("Placenta de inserção baixa.");

    // 3. Doppler
    if (d.usarDoppler) {
        if (d.utDirIncisura || d.utEsqIncisura) achados.push("Doppler das artérias uterinas com aumento da resistência (Incisura presente).");
        if (d.umbDiastoleZero || d.umbDiastoleReversa) achados.push("Doppler umbilical alterado (Diástole Zero/Reversa).");
        if (d.acmDiastoleAlta) achados.push("Centralização fetal (Vasodilatação da ACM).");
    }

    // Padrão
    if (achados.length === 1 && achados[0].includes("Gestação")) {
        return "Desenvolvimento fetal compatível com a idade gestacional.";
    }

    return achados.join(' ');
};

/**
 * Gera os blocos de texto e tabelas para UM feto específico.
 */
export const gerarRelatorioFeto = (d) => {
    const tabelaBiometria = []; 
    const comentarios = [];     
    const conclusao = [];

    // --- 1. DATAÇÃO E APRESENTAÇÃO ---
    let datacaoTxt = "";
    if (d.usarDum && d.dum) {
        if (d.exibirDataDum) datacaoTxt += `DUM: ${formatData(d.dum)}. `;
        datacaoTxt += `Idade Gestacional (DUM): ${d.igDum || '---'}. `;
        if (d.citarDppDum) datacaoTxt += `DPP (DUM): ${d.dppDum || '---'}. `;
    } else if (d.dumDesconhecida) {
        datacaoTxt += `DUM: Desconhecida. `;
    }
    if (d.citarDppBiometria && d.dppBiometriaCalculada) datacaoTxt += `DPP (Biometria): ${d.dppBiometriaCalculada}. `;
    if (d.referirIgAnterior && d.dataExameAnterior) {
        datacaoTxt += `IG corrigida por USG anterior (${formatData(d.dataExameAnterior)}): ${d.igAnteriorSemanas || 0}s ${d.igAnteriorDias || 0}d. `;
        if (d.citarDppIgCorrigida && d.dppIgCorrigidaCalculada) datacaoTxt += `DPP (Corrigida): ${d.dppIgCorrigidaCalculada}. `;
    }
    if (datacaoTxt) comentarios.push(datacaoTxt);

    // --- 2. DADOS ESPECÍFICOS: 1º TRIMESTRE ---
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        let materno = '';
        if (d.viaExame && d.viaExame !== 'não citar') materno += `Exame realizado por via ${d.viaExame}. `;
        materno += `Útero em AVF, contornos regulares e ecotextura homogênea. `;
        if (d.citarUteroMedidas && d.ut1) materno += `Dimensões: ${d.ut1} x ${d.ut2} x ${d.ut3} mm. `;
        if (d.citarNodulo) materno += `Nódulo miometrial ${d.nodTipo}, parede ${d.nodLocal}, medindo ${d.nod1} x ${d.nod2} mm. `;
        if (d.citarColo1Tri) materno += `Colo uterino normal. `;
        if (d.citarCompColo1Tri && d.medidaColo1Tri) materno += `Comp.: ${d.medidaColo1Tri} mm. `;
        if (d.corpoLuteo !== 'não citar') {
            materno += `Corpo lúteo no ovário ${d.corpoLuteo}. `;
            if (d.citarMedidasAnexo && d.anx1) materno += `Medidas: ${d.anx1}x${d.anx2}x${d.anx3} mm. `;
        }
        comentarios.push(materno);

        if (d.citarSg) {
            let sgTxt = `Saco gestacional tópico, ${d.sgLocalizacao}. `;
            if (d.sg1) sgTxt += `Medidas: ${d.sg1}x${d.sg2}x${d.sg3} mm (DMSG: ${d.resDmsg} mm). `;
            if (d.resIgSg) sgTxt += `IG estimada pelo SG: ${d.resIgSg}. `;
            if (d.trofoblasto !== 'não citar') sgTxt += `Trofoblasto ${d.trofoblasto}. `;
            if (d.sgSemDescolamento) sgTxt += `Sem sinais de descolamento ovular. `;
            if (d.sgComDescolamento) sgTxt += `Presença de área de descolamento medindo ${d.desc1} x ${d.desc2} x ${d.desc3} mm. `;
            if (d.sgAbortoIncompleto) sgTxt += `ABORTAMENTO INCOMPLETO: cavidade uterina preenchida por restos ovulares. `;
            comentarios.push(sgTxt);
        }

        let vitalidade = '';
        if (d.embriaoNaoVisualizado) vitalidade = "Embrião não visualizado no presente exame.";
        else {
             if (d.bcfIndetectavel) vitalidade = "Batimentos cardiofetais indetectáveis.";
             else vitalidade = `Embrião vivo, BCF ${d.bcf} bpm.`;
             if (d.movFetal) vitalidade += " Movimentação fetal ativa.";
             if(d.ccn) vitalidade += ` CCN: ${d.ccn} mm.`;
             if(d.citarVv) vitalidade += ` Vesícula vitelina normal (${d.vvDiametro} mm).`;
        }
        comentarios.push(vitalidade);

         const morf1 = [];
         if(d.morf1Cerebro) morf1.push("cérebro");
         if(d.morf1Estomago) morf1.push("estômago");
         if(d.morf1Membros) morf1.push("membros");
         if(d.morf1Globos) morf1.push("globos oculares");
         if(d.morf1Cordao) morf1.push("inserção do cordão umbilical");
         if(d.morf1OssoNasal === 'presente') morf1.push("osso nasal presente");
         else if (d.morf1OssoNasal === 'ausente') morf1.push("osso nasal AUSENTE");
         else if (d.morf1OssoNasal === 'hipoplásico') morf1.push("osso nasal hipoplásico");
         if(morf1.length > 0) comentarios.push(`Morfologia precoce: Visualizados ${morf1.join(', ')}.`);

         if(d.citarTn) {
             let tnTxt = `Translucência Nucal: ${d.tnMedida} mm.`;
             if(d.tnRisco) {
                 tnTxt += ` Risco basal (idade): 1/${d.riscoBasal}.`;
                 tnTxt += ` Risco corrigido (T21): 1/${d.riscoCorrigido}.`;
             }
             comentarios.push(tnTxt);
             if (d.tnObs) comentarios.push(`Nota: O rastreamento de aneuploidias pela TN tem sensibilidade de cerca de 75-80% para T21.`);
         }

    } 
    // --- 3. DADOS ESPECÍFICOS: 2º/3º TRIMESTRE ---
    else {
        // Situação
        comentarios.push(`Feto em situação ${d.situacao ? d.situacao.toLowerCase() : 'longitudinal'}, apresentação ${d.apresentacao ? d.apresentacao.toLowerCase() : 'cefálica'}, dorso ${d.dorso ? d.dorso.toLowerCase() : 'lateral'}.`);
        
        // Colo
        if (d.citarColoNormal) comentarios.push(`Colo uterino de aspecto ecográfico normal (fechado).`);
        if (d.citarComprimentoColo && d.medidaColo) comentarios.push(`Comprimento do colo aferido em ${d.medidaColo} mm.`);

        // CORREÇÃO: VITALIDADE (Dinâmica)
        let vitalidade = `Batimentos cardiofetais presentes e rítmicos (${d.bcf} bpm).`;
        if (d.movFetal) vitalidade += " Movimentação fetal ativa.";
        if (d.degluticao) vitalidade += " Movimentos deglutitórios presentes."; // Nova linha adicionada
        comentarios.push(vitalidade);

        // Anexos (Placenta e Líquido)
        let placentaTxt = `Placenta: Inserção ${d.placentaInsercao.toLowerCase()}, aspecto ${d.placentaAspecto.toLowerCase()}.`;
        if(d.placentaEspessura) placentaTxt += ` Espessura: ${d.placentaEspessura} mm.`;
        comentarios.push(placentaTxt);

        let liquidoTxt = `Líquido Amniótico: Volume ${d.liquidoVolume.toLowerCase()}.`;
        if(d.ila) liquidoTxt += ` ILA: ${d.ila} cm.`;
        if(d.maiorBolso) liquidoTxt += ` Maior bolso: ${d.maiorBolso} cm.`;
        comentarios.push(liquidoTxt);

        // CORREÇÃO: CORDÃO UMBILICAL (Lógica completa)
        const cordaoTxt = [];
        if (d.cordaoNormal) cordaoTxt.push("3 vasos, inserção normal");
        
        // Verifica Circular
        if (d.cordaoCircular === 'ausente') cordaoTxt.push("ausência de circular cervical");
        else if (d.cordaoCircular === 'cervical (1 volta)') cordaoTxt.push("presença de circular cervical");
        // se 'não citar', não adiciona nada
        
        if (cordaoTxt.length > 0) {
            comentarios.push(`Cordão Umbilical: ${cordaoTxt.join(', ')}.`);
        }
    }

    // --- 4. BIOMETRIA ---
    const addBio = (label, val) => { if(val) tabelaBiometria.push({ estrutura: label, medida: val + ' mm' }); };
    
    if(d.subtipo !== 'OBSTETRICO_1_TRI') {
        addBio('Diâmetro Biparietal (DBP)', d.dbp);
        addBio('Diâmetro Occipitofrontal (DOF)', d.dof);
        addBio('Circunferência Craniana (CC)', d.cc);
        addBio('Circunferência Abdominal (CA)', d.ca);
        addBio('Fêmur', d.femur);
        addBio('Úmero', d.umero);
        addBio('Ulna', d.ulna);
        addBio('Tíbia', d.tibia);
        addBio('Rádio', d.radio);
        addBio('Fíbula', d.fibula);
        addBio('Pé', d.pe);
        addBio('Cerebelo', d.cerebelo);
        addBio('Cisterna Magna', d.cisternaMagna);
        addBio('Ventrículo Lateral', d.ventriculoLat);
        addBio('Osso Nasal', d.ossoNasal);
        addBio('Prega Nucal', d.pregaNucal);
        
        // Peso no texto
        if(d.pesoEstimado && d.checkPeso) {
            tabelaBiometria.push({ estrutura: 'Peso Fetal Estimado', medida: d.pesoEstimado + ' g' });
            let pesoTexto = `Peso Fetal Estimado: ${d.pesoEstimado} g`;
            if (d.percentil) pesoTexto += ` (Percentil: ${d.percentil})`;
            comentarios.push(pesoTexto + ".");
        }

        // Índices
        const indices = [];
        const mostrarRef = d.citarValoresNormais;
        if(d.checkIndiceCefalico && d.resIc) indices.push(`IC: ${d.resIc}%${mostrarRef ? ' (VN: 70-86%)' : ''}`);
        if(d.checkRelacaoCcCa && d.resCcCa) indices.push(`CC/CA: ${d.resCcCa}${mostrarRef ? ' (VN: > 1.0)' : ''}`);
        if(d.checkRelacaoCfCa && d.resCfCa) indices.push(`Fêmur/CA: ${d.resCfCa}%${mostrarRef ? ' (VN: 20-24%)' : ''}`);
        if(d.checkRelacaoCfDbp && d.resCfDbp) indices.push(`Fêmur/DBP: ${d.resCfDbp}%${mostrarRef ? ' (VN: 70-86%)' : ''}`);

        if(indices.length > 0) comentarios.push(`Relações biométricas: ${indices.join(' | ')}.`);
    }

    // --- 5. MORFOLOGIA (Revisão Geral) ---
    if(d.subtipo !== 'OBSTETRICO_1_TRI') {
        const morfList = [];
        if (d.morfCranio) morfList.push("crânio");
        if (d.morfCerebro) morfList.push("encéfalo");
        if (d.morfFace) morfList.push("face");
        if (d.morfColuna) morfList.push("coluna vertebral");
        if (d.morfTorax) morfList.push("tórax");
        if (d.morfPulmoes) morfList.push("pulmões"); // ADICIONADO
        if (d.morfCoracao) morfList.push("coração (4 câmaras)");
        if (d.morfVasosBase) morfList.push("vasos da base"); // ADICIONADO
        if (d.morfEstomago) morfList.push("estômago");
        if (d.morfFigado) morfList.push("fígado");
        if (d.morfRins) morfList.push("rins");
        if (d.morfBexiga) morfList.push("bexiga");
        if (d.morfParedeAbd) morfList.push("parede abdominal");
        if (d.morfMembros) morfList.push("membros");
        if (d.morfGenitalia) morfList.push("genitália externa"); // ADICIONADO

        if (morfList.length > 0) {
            comentarios.push(`Anatomia Fetal: Visualizados com aspecto habitual: ${morfList.join(', ')}.`);
        }
        
        // Sexo fetal (mantido separado para destaque)
        if (d.sexoFetal && d.sexoFetal !== 'NÃO VISUALIZADO') {
            comentarios.push(`Genitália externa compatível com sexo ${d.sexoFetal.toLowerCase()}.`);
        }
    }

    // --- 6. DOPPLER (Revisão) ---
    if (d.usarDoppler) {
        const dopComments = [];
        const mountMetrics = (items) => items.filter(i => i.val).map(i => `${i.label} ${i.val}`).join(', ');

        if(d.checkUtDir) {
            let txt = `Art. Uterina Dir: ${mountMetrics([{ label: 'IP', val: d.utDirIP }, { label: 'IR', val: d.utDirIR }, { label: 'S/D', val: d.utDirSD }]) || 'fluxo presente'}`;
            if(d.utDirIncisura) txt += ' (com incisura)';
            dopComments.push(txt);
        }
        if(d.checkUtEsq) {
             let txt = `Art. Uterina Esq: ${mountMetrics([{ label: 'IP', val: d.utEsqIP }, { label: 'IR', val: d.utEsqIR }, { label: 'S/D', val: d.utEsqSD }]) || 'fluxo presente'}`;
            if(d.utEsqIncisura) txt += ' (com incisura)';
            dopComments.push(txt);
        }
        if(d.checkUmb) {
            let txt = `Art. Umbilical: ${mountMetrics([{ label: 'IP', val: d.umbIP }, { label: 'IR', val: d.umbIR }, { label: 'S/D', val: d.umbSD }])}`;
            const qual = [];
            if (d.umbTraçadoNormal) qual.push("traçado normal");
            if (d.umbDiastoleBaixa) qual.push("diástole reduzida");
            if (d.umbDiastoleZero) qual.push("diástole zero");
            if (d.umbDiastoleReversa) qual.push("diástole reversa");
            if (qual.length) txt += ` (${qual.join(', ')})`;
            dopComments.push(txt);
        }
        if(d.checkAcm) {
            let txt = `ACM: ${mountMetrics([{ label: 'PVS', val: d.acmPVS ? d.acmPVS + ' cm/s' : ''}, { label: 'IP', val: d.acmIP }, { label: 'IR', val: d.acmIR }])}`;
            const qual = [];
            if (d.acmTraçadoNormal) qual.push("traçado normal");
            if (d.acmDiastoleAlta) qual.push("diástole alta");
            if (qual.length) txt += ` (${qual.join(', ')})`;
            dopComments.push(txt);
        }
        if(d.checkDv) {
             let txt = `Ducto Venoso: ${mountMetrics([{ label: 'IP', val: d.dvIP }])}`;
             const qual = [];
             if (d.dvTraçadoNormal) qual.push("traçado normal");
             if (d.dvOndaAZero) qual.push("onda A zero");
             if (d.dvOndaAReversa) qual.push("onda A reversa");
             if (qual.length) txt += ` (${qual.join(', ')})`;
             dopComments.push(txt);
        }
        if(dopComments.length > 0) {
            comentarios.push('Estudo Dopplerfluxométrico:');
            dopComments.forEach(c => comentarios.push(c));
        }
    }

    // --- 7. CONCLUSÃO ---
    let conclusaoManualAdicionada = false;
    
    if(d.conclusaoNormal) { conclusao.push("Desenvolvimento fetal compatível com a idade gestacional."); conclusaoManualAdicionada = true; }
    if(d.conclusaoMorfologiaNormal) { conclusao.push("Estudo morfológico fetal dentro dos limites da normalidade."); conclusaoManualAdicionada = true; }
    if(d.conclusaoDopplerNormal && d.usarDoppler) { conclusao.push("Dopplerfluxometria dentro dos limites da normalidade."); conclusaoManualAdicionada = true; }
    if(d.conclusaoTnNormal && d.citarTn) { conclusao.push("Translucência nucal normal."); conclusaoManualAdicionada = true; }

    if (!conclusaoManualAdicionada) {
        const autoConclusao = gerarConclusaoAutomatica(d);
        if (autoConclusao) conclusao.push(autoConclusao);
    }

    if(d.obsAdicionais) conclusao.push(d.obsAdicionais);

    return { tabelaBiometria, listaComentarios: comentarios, listaConclusao: conclusao };
};

/**
 * Monta o texto final
 */
export const montarTextoFinal = (dadosF1, dadosF2, isGemelar) => {
    let texto = "";
    if(isGemelar) texto += "--- FETO 1 ---\n";
    if(dadosF1.listaComentarios.length > 0) texto += dadosF1.listaComentarios.join('\n');
    if(dadosF1.listaConclusao.length > 0) texto += "\n\nCONCLUSÃO:\n" + dadosF1.listaConclusao.join('\n');

    if(isGemelar && dadosF2) {
        texto += `\n\n--- FETO 2 ---\n`;
        if(dadosF2.listaComentarios.length > 0) texto += dadosF2.listaComentarios.join('\n');
        if(dadosF2.listaConclusao.length > 0) texto += "\n\nCONCLUSÃO:\n" + dadosF2.listaConclusao.join('\n');
    }
    return texto;
};