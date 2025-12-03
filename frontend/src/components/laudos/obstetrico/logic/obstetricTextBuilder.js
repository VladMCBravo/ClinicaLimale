import { formatData } from './obstetricCalculations';

/**
 * Gera os blocos de texto e tabelas para UM feto específico.
 * @param {Object} d - Dados do feto (estado do formulário)
 */
export const gerarRelatorioFeto = (d) => {
    const tabelaBiometria = []; // Vai para a tabela no PDF
    const comentarios = [];     // Vai para o texto descritivo
    const conclusao = [];       // Vai para a conclusão

    // --- 1. DATAÇÃO E APRESENTAÇÃO ---
    let datacaoTxt = "";
    
    // DUM
    if (d.usarDum && d.dum) {
        if (d.exibirDataDum) datacaoTxt += `DUM: ${formatData(d.dum)}. `;
        datacaoTxt += `Idade Gestacional (DUM): ${d.igDum || '---'}. `;
        if (d.citarDppDum) datacaoTxt += `DPP (DUM): ${d.dppDum || '---'}. `;
    } else if (d.dumDesconhecida) {
        datacaoTxt += `DUM: Desconhecida. `;
    }

    // DPP Biometria
    if (d.citarDppBiometria && d.dppBiometriaCalculada) {
        datacaoTxt += `DPP (Biometria): ${d.dppBiometriaCalculada}. `;
    }

    // Exame Anterior
    if (d.referirIgAnterior && d.dataExameAnterior) {
        datacaoTxt += `IG corrigida por USG anterior (${formatData(d.dataExameAnterior)}): ${d.igAnteriorSemanas || 0}s ${d.igAnteriorDias || 0}d. `;
        if (d.citarDppIgCorrigida && d.dppIgCorrigidaCalculada) {
            datacaoTxt += `DPP (Corrigida): ${d.dppIgCorrigidaCalculada}. `;
        }
    }
    
    if (datacaoTxt) comentarios.push(datacaoTxt);

    // --- 2. DADOS ESPECÍFICOS: 1º TRIMESTRE ---
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        let materno = '';
        // Via de Exame
        if (d.viaExame && d.viaExame !== 'não citar') materno += `Exame realizado por via ${d.viaExame}. `;
        
        // Útero
        materno += `Útero em AVF, contornos regulares e ecotextura homogênea. `;
        if (d.citarUteroMedidas && d.ut1) materno += `Dimensões: ${d.ut1} x ${d.ut2} x ${d.ut3} mm. `;
        
        // Nódulo / Mioma
        if (d.citarNodulo) {
            materno += `Nódulo miometrial ${d.nodTipo}, parede ${d.nodLocal}, medindo ${d.nod1} x ${d.nod2} mm. `;
        }

        // Colo (1º Tri)
        if (d.citarColo1Tri) materno += `Colo uterino normal. `;
        if (d.citarCompColo1Tri && d.medidaColo1Tri) materno += `Comp.: ${d.medidaColo1Tri} mm. `;

        // Anexos (1º Tri)
        if (d.corpoLuteo !== 'não citar') {
            materno += `Corpo lúteo no ovário ${d.corpoLuteo}. `;
            if (d.citarMedidasAnexo && d.anx1) {
                materno += `Medidas: ${d.anx1}x${d.anx2}x${d.anx3} mm. `;
                if (d.calcVolAnexo && d.resVolAnexo) materno += `Vol: ${d.resVolAnexo} cm³. `;
            }
        }
        comentarios.push(materno);

        // Saco Gestacional
        if (d.citarSg) {
            let sgTxt = `Saco gestacional tópico, ${d.sgLocalizacao}. `;
            if (d.sg1) sgTxt += `Medidas: ${d.sg1}x${d.sg2}x${d.sg3} mm (DMSG: ${d.resDmsg} mm). `;
            if (d.resIgSg) sgTxt += `IG estimada pelo SG: ${d.resIgSg}. `; // Adiciona a IG no texto se quiser
            
            if (d.trofoblasto !== 'não citar') sgTxt += `Trofoblasto ${d.trofoblasto}. `;
            
            // CORREÇÃO 1: Checkbox "Sem sinais de descolamento"
            if (d.sgSemDescolamento) {
                sgTxt += `Sem sinais de descolamento ovular. `;
            }

            // CORREÇÃO 2: Checkbox "Com descolamento" + 3 Medidas
            if (d.sgComDescolamento) {
                // Adicionada a terceira medida (desc3)
                sgTxt += `Presença de área de descolamento medindo ${d.desc1} x ${d.desc2} x ${d.desc3} mm. `;
            }

            // CORREÇÃO 3: Abortamento Incompleto
            if (d.sgAbortoIncompleto) {
                sgTxt += `ABORTAMENTO INCOMPLETO: cavidade uterina preenchida por restos ovulares. `;
            }

            comentarios.push(sgTxt);
        }

        // EMBRIÃO E VITALIDADE
        let vitalidade = '';
        if (d.embriaoNaoVisualizado) {
            vitalidade = "Embrião não visualizado no presente exame.";
        } else {
             // BCF
             if (d.bcfIndetectavel) vitalidade = "Batimentos cardiofetais indetectáveis.";
             else vitalidade = `Embrião vivo, BCF ${d.bcf} bpm.`;
             
             // Movimentação (CORREÇÃO AQUI)
             if (d.movFetal) vitalidade += " Movimentação fetal ativa.";

             // CCN e VV
             if(d.ccn) vitalidade += ` CCN: ${d.ccn} mm.`;
             if(d.citarVv) vitalidade += ` Vesícula vitelina normal (${d.vvDiametro} mm).`;
        }
        comentarios.push(vitalidade);

         // MORFOLOGIA PRECOCE
         const morf1 = [];
         if(d.morf1Cerebro) morf1.push("cérebro");
         if(d.morf1Estomago) morf1.push("estômago");
         if(d.morf1Membros) morf1.push("membros");
         if(d.morf1Globos) morf1.push("globos oculares");
         
         // Cordão (CORREÇÃO AQUI)
         if(d.morf1Cordao) morf1.push("inserção do cordão umbilical");

         if(d.morf1OssoNasal === 'presente') morf1.push("osso nasal presente");
         else if (d.morf1OssoNasal === 'ausente') morf1.push("osso nasal AUSENTE");
         else if (d.morf1OssoNasal === 'hipoplásico') morf1.push("osso nasal hipoplásico");
         
         if(morf1.length > 0) comentarios.push(`Morfologia precoce: Visualizados ${morf1.join(', ')}.`);

         // TRANSLUCÊNCIA NUCAL (TN)
         if(d.citarTn) {
             let tnTxt = `Translucência Nucal: ${d.tnMedida} mm.`;
             
             // Riscos (CORREÇÃO AQUI)
             if(d.tnRisco) {
                 tnTxt += ` Risco basal (idade): 1/${d.riscoBasal}.`; // Adicionado basal
                 tnTxt += ` Risco corrigido (T21): 1/${d.riscoCorrigido}.`;
             }
             comentarios.push(tnTxt);

             // Obs no Final (CORREÇÃO AQUI)
             if (d.tnObs) {
                 // Adiciona uma nota explicativa ou leva para conclusão
                 comentarios.push(`Nota: O rastreamento de aneuploidias pela TN tem sensibilidade de cerca de 75-80% para T21.`); 
                 // Se preferir que vá para a CONCLUSÃO, mude para:
                 // conclusao.push(`Rastreamento de 1º trimestre: TN ${d.tnMedida} mm. Risco ajustado 1/${d.riscoCorrigido}.`);
             }
         }

    } 
    // --- 3. DADOS ESPECÍFICOS: 2º/3º TRIMESTRE ---
    else {
        // Situação e Apresentação
        comentarios.push(`Feto em situação ${d.situacao ? d.situacao.toLowerCase() : 'longitudinal'}, apresentação ${d.apresentacao ? d.apresentacao.toLowerCase() : 'cefálica'}, dorso ${d.dorso ? d.dorso.toLowerCase() : 'lateral'}.`);
        
        // Colo (2º Tri)
        if (d.citarColoNormal) comentarios.push(`Colo uterino de aspecto ecográfico normal (fechado).`);
        if (d.citarComprimentoColo && d.medidaColo) comentarios.push(`Comprimento do colo aferido em ${d.medidaColo} mm.`);

        // Vitalidade
        comentarios.push(`Batimentos cardiofetais presentes e rítmicos (${d.bcf} bpm). Movimentação fetal ativa.`);

        // Anexos (Placenta, Liquido, Cordão)
        let placentaTxt = `Placenta: Inserção ${d.placentaInsercao.toLowerCase()}, aspecto ${d.placentaAspecto.toLowerCase()}.`;
        if(d.placentaEspessura) placentaTxt += ` Espessura: ${d.placentaEspessura} mm.`;
        comentarios.push(placentaTxt);

        let liquidoTxt = `Líquido Amniótico: Volume ${d.liquidoVolume.toLowerCase()}.`;
        if(d.ila) liquidoTxt += ` ILA: ${d.ila} cm.`;
        if(d.maiorBolso) liquidoTxt += ` Maior bolso: ${d.maiorBolso} cm.`;
        comentarios.push(liquidoTxt);

        if(d.cordaoCircular !== 'não citar' && d.cordaoCircular !== 'ausente') {
            comentarios.push(`Cordão Umbilical: Presença de circular ${d.cordaoCircular}.`);
        } else if (d.cordaoNormal) {
            comentarios.push(`Cordão Umbilical: 3 vasos, inserção normal.`);
        }
    }

    // --- 4. BIOMETRIA (Vai para a Tabela PDF) ---
    // A função auxiliar adiciona na tabela se o valor existir
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
        
        if(d.pesoEstimado && d.checkPeso) {
            tabelaBiometria.push({ estrutura: 'Peso Fetal Estimado', medida: d.pesoEstimado + ' g' });
        }

        // --- ÍNDICES (Texto Descritivo) ---
        const indices = [];
        if(d.checkIndiceCefalico && d.resIc) indices.push(`IC: ${d.resIc}%`);
        if(d.checkRelacaoCcCa && d.resCcCa) indices.push(`CC/CA: ${d.resCcCa}`);
        if(d.checkRelacaoCfCa && d.resCfCa) indices.push(`Fêmur/CA: ${d.resCfCa}%`);
        if(d.checkRelacaoCfDbp && d.resCfDbp) indices.push(`Fêmur/DBP: ${d.resCfDbp}%`);
        if(d.checkRelacaoCfCc && d.resCfCc) indices.push(`Fêmur/CC: ${d.resCfCc}%`);

        if(indices.length > 0) comentarios.push(`Relações biométricas: ${indices.join(' | ')}.`);
    }

    // --- 5. MORFOLOGIA (Checklist 2º/3º Tri) ---
    if(d.subtipo !== 'OBSTETRICO_1_TRI') {
        const morfList = [];
        if (d.morfCranio) morfList.push("crânio");
        if (d.morfCerebro) morfList.push("encéfalo");
        if (d.morfFace) morfList.push("face");
        if (d.morfColuna) morfList.push("coluna vertebral");
        if (d.morfTorax) morfList.push("tórax");
        if (d.morfCoracao) morfList.push("coração");
        if (d.morfEstomago) morfList.push("estômago");
        if (d.morfFigado) morfList.push("fígado");
        if (d.morfRins) morfList.push("rins");
        if (d.morfBexiga) morfList.push("bexiga");
        if (d.morfParedeAbd) morfList.push("parede abdominal");
        if (d.morfMembros) morfList.push("membros");

        if (morfList.length > 0) {
            comentarios.push(`Anatomia Fetal: Visualizados com aspecto habitual: ${morfList.join(', ')}.`);
        }
        if (d.sexoFetal && d.sexoFetal !== 'NÃO VISUALIZADO') {
            comentarios.push(`Genitália externa compatível com sexo ${d.sexoFetal.toLowerCase()}.`);
        }
    }

    // --- 6. DOPPLERFLUXOMETRIA ---
    if (d.usarDoppler) {
        const dopComments = [];
        
        // Helper para montar medidas (Ex: "IP: 0,5, IR: 0,6")
        const mountMetrics = (items) => {
            return items.filter(i => i.val).map(i => `${i.label} ${i.val}`).join(', ');
        };

        // 1. ARTÉRIAS UTERINAS
        if(d.checkUtDir) {
            let measures = mountMetrics([
                { label: 'IP', val: d.utDirIP }, { label: 'IR', val: d.utDirIR }, { label: 'S/D', val: d.utDirSD }
            ]);
            let txt = `Art. Uterina Dir: ${measures || 'fluxo presente'}`;
            if(d.utDirIncisura) txt += ' (com incisura protodiastólica)';
            dopComments.push(txt);
        }

        if(d.checkUtEsq) {
            let measures = mountMetrics([
                { label: 'IP', val: d.utEsqIP }, { label: 'IR', val: d.utEsqIR }, { label: 'S/D', val: d.utEsqSD }
            ]);
            let txt = `Art. Uterina Esq: ${measures || 'fluxo presente'}`;
            if(d.utEsqIncisura) txt += ' (com incisura protodiastólica)';
            dopComments.push(txt);
        }

        // 2. ARTÉRIAS UMBILICAIS
        if(d.checkUmb) {
            let measures = mountMetrics([
                { label: 'IP', val: d.umbIP }, { label: 'IR', val: d.umbIR }, { label: 'S/D', val: d.umbSD }
            ]);
            let txt = `Artérias Umbilicais: ${measures}`;
            
            // Qualitativo
            const qual = [];
            if (d.umbTraçadoNormal) qual.push("traçado normal");
            if (d.umbDiastoleBaixa) qual.push("diástole reduzida/baixa");
            if (d.umbDiastoleZero) qual.push("diástole zero");
            if (d.umbDiastoleReversa) qual.push("diástole reversa");
            
            if (qual.length > 0) {
                txt += measures ? ` (${qual.join(', ')})` : qual.join(', ');
            }
            dopComments.push(txt);
        }

        // 3. ARTÉRIA CEREBRAL MÉDIA (ACM)
        if(d.checkAcm) {
            let measures = mountMetrics([
                { label: 'PVS', val: d.acmPVS ? d.acmPVS + ' cm/s' : '' },
                { label: 'IP', val: d.acmIP }, { label: 'IR', val: d.acmIR }, { label: 'S/D', val: d.acmSD }
            ]);
            let txt = `Artéria Cerebral Média: ${measures}`;

            // Qualitativo
            const qual = [];
            if (d.acmTraçadoNormal) qual.push("traçado normal");
            if (d.acmDiastoleAlta) qual.push("diástole alta (efeito brain-sparing/vasodilatação)");
            
            if (qual.length > 0) {
                txt += measures ? ` (${qual.join(', ')})` : qual.join(', ');
            }
            dopComments.push(txt);
        }

        // 4. DUCTO VENOSO
        if(d.checkDv) {
            let measures = mountMetrics([{ label: 'IP', val: d.dvIP }]);
            let txt = `Ducto Venoso: ${measures}`;

            // Qualitativo
            const qual = [];
            if (d.dvTraçadoNormal) qual.push("traçado normal");
            if (d.dvOndaAZero) qual.push("onda A zero");
            if (d.dvOndaAReversa) qual.push("onda A reversa");
            
            if (qual.length > 0) {
                txt += measures ? ` (${qual.join(', ')})` : qual.join(', ');
            }
            dopComments.push(txt);
        }

        if(dopComments.length > 0) {
            comentarios.push('Estudo Dopplerfluxométrico:');
            dopComments.forEach(c => comentarios.push(c));
        }
    }

    // --- 7. CONCLUSÃO ---
    if(d.conclusaoNormal) conclusao.push("Desenvolvimento fetal compatível com a idade gestacional.");
    if(d.obsAdicionais) conclusao.push(d.obsAdicionais);

    return { tabelaBiometria, listaComentarios: comentarios, listaConclusao: conclusao };
};

/**
 * Monta a string final que aparecerá no textarea "LAUDO FINAL".
 * Concatena os comentários dos fetos e conclusões.
 */
export const montarTextoFinal = (dadosF1, dadosF2, isGemelar) => {
    let texto = "";
    
    // Header do Feto 1 (só se gemelar, ou se preferir sempre marcar)
    if(isGemelar) texto += "--- FETO 1 ---\n";
    
    // Relatório Feto 1
    if(dadosF1.listaComentarios.length > 0) {
        texto += dadosF1.listaComentarios.join('\n');
    }
    
    // Conclusão Feto 1
    if(dadosF1.listaConclusao.length > 0) {
        texto += "\n\nCONCLUSÃO:\n" + dadosF1.listaConclusao.join('\n');
    }

    // Feto 2 (Gemelar)
    if(isGemelar && dadosF2) {
        texto += `\n\n--- FETO 2 ---\n`;
        if(dadosF2.listaComentarios.length > 0) {
            texto += dadosF2.listaComentarios.join('\n');
        }
        if(dadosF2.listaConclusao.length > 0) {
            texto += "\n\nCONCLUSÃO:\n" + dadosF2.listaConclusao.join('\n');
        }
    }

    return texto;
};