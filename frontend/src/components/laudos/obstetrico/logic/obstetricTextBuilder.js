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
    // ADICIONE ISTO: Via de Exame (Importante para Inicial/1º Tri)
    if (d.viaExame && d.viaExame !== 'não citar') {
        texto += `Exame realizado por via ${d.viaExame}.\n\n`;
    }
    
    // ADICIONE ISTO: Anexos (Corpo Lúteo) - Geralmente para Inicial/1º Tri
    if (d.subtipo === 'OBSTETRICO_INICIAL' || d.subtipo === 'OBSTETRICO_1_TRI') {
        if (d.corpoLuteo && d.corpoLuteo !== 'não citar') {
             texto += `ANEXOS\nVisualizado corpo lúteo gravídico em ovário ${d.corpoLuteo}. `;
             if (d.citarMedidasAnexo && d.anx1) {
                 texto += `Medindo ${d.anx1} x ${d.anx2} x ${d.anx3} mm`;
                 if (d.calcVolAnexo && d.resVolAnexo) texto += ` (Vol: ${d.resVolAnexo} cm³)`;
                 texto += `.`;
             }
             texto += `\n\n`;
        }
    }

    // -------------------------------------------------------------------------
    // 1. DATAÇÃO (Lógica Blindada com Fallback para CCN)
    // -------------------------------------------------------------------------
    
    // --- A. DUM (Data da Última Menstruação) ---
    if (d.usarDum) {
        if (d.dum) {
            if (d.exibirDataDum) texto += `Data da última menstruação: ${formatData(d.dum)}.\n`;
            
            if (d.citarDppDum && d.dppDum) {
                texto += `DPP (DUM): ${d.dppDum}`;
                if (d.igDum) texto += `, compatível com ${d.igDum}`;
                texto += `.\n`;
            } 
            else if (d.igDum) {
                texto += `Idade gestacional cronológica (DUM): ${d.igDum}.\n`;
            }
        } else {
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
        const igHojePeloAnterior = d.igIgCorrigidaCalculada;
        
        if (igHojePeloAnterior) {
            texto += `Idade gestacional datada pelo ultrassom de ${dataAnt}: ${igHojePeloAnterior}.\n`;
        } else {
            texto += `Exame anterior realizado em ${dataAnt} (IG na época: ${d.igAnteriorSemanas || 0}s ${d.igAnteriorDias || 0}d).\n`;
        }
    } 
    
    // --- D. Biometria Atual / CCN (O "Pulo do Gato") ---
    // Se o médico marcou explicitamente "Usar esta data"
    else if (d.citarDppBiometria && d.dppBiometriaCalculada) {
         texto += `Idade Gestacional pela biometria atual: ${d.igBiometria || '...'}.\n`;
         texto += `DPP (Biometria atual): ${d.dppBiometriaCalculada}.\n`;
    }
    // --- E. FALLBACK AUTOMÁTICO PARA CCN (1º Trimestre) ---
    // Se não marcou nada acima, mas tem CCN preenchido, usamos ele para datar.
    else if (d.subtipo === 'OBSTETRICO_1_TRI' && d.resIgCcn) {
         texto += `Idade Gestacional definida pelo Comprimento Cabeça-Nádegas (CCN): ${d.resIgCcn}.\n`;
         // Opcional: Calcular DPP do CCN aqui se quiser, ou deixar só a IG
    }
    
    // --- CORREÇÃO: INJEÇÃO DA OBSERVAÇÃO DE DATAÇÃO ---
    if (d.obsDatacao) {
        texto += `Nota: ${d.obsDatacao}\n`;
    }
    
    texto += '\n';

    // -------------------------------------------------------------------------
    // --- BLOCO 3: VITALIDADE E ESTÁTICA ---
    
    // Vitalidade (BCF e Movimentos)
    const textoVitalidade = [];
    if (d.bcf) textoVitalidade.push(`Batimentos cardíacos fetais rítmicos: ${d.bcf} bpm`);
    if (d.movFetal) textoVitalidade.push(`Movimentação fetal ativa: Presente`);
    if (d.degluticao) textoVitalidade.push(`Movimentos de deglutição visualizados`);
    
    if (textoVitalidade.length > 0) {
        texto += textoVitalidade.join('. ') + '.\n';
    }

    // Estática (Posição)
    if (d.situacao && d.apresentacao) {
        texto += `Situação ${d.situacao}, apresentação ${d.apresentacao}`;
        if (d.dorso) texto += ` e com dorso ${d.dorso}`;
        texto += `.\n`;
    }

    // Gemelaridade (Corionicidade)
    if (d.qtdFetos > 1) {
        if (d.corionicidade) texto += `Gestação ${d.corionicidade} / ${d.amnionicidade}.\n`;
        if (d.localizacaoFeto) texto += `Feto localizado: ${d.localizacaoFeto}.\n`;
    }
    texto += '\n';

    // -------------------------------------------------------------------------
    // --- BLOCO 4: BIOMETRIA ---

    // A. Se for Inicial / 1º Tri (Saco Gestacional e Útero)
    if (d.subtipo === 'OBSTETRICO_INICIAL' || d.subtipo === 'OBSTETRICO_1_TRI') {
        // Útero 1º Tri
        if (d.citarUteroMedidas && d.ut1) {
            texto += `ÚTERO: Dimensões de ${d.ut1} x ${d.ut2} x ${d.ut3} mm. `;
            texto += `Contornos e textura normais.\n`;
        } else if (d.subtipo === 'OBSTETRICO_INICIAL') { 
            // Só imprime texto genérico de útero no inicial se não tiver medidas
            texto += `ÚTERO: Apresenta-se com dimensões adequadas, contornos e textura normais.\n`;
        }
        if (d.citarNodulo && d.nod1) texto += `Nota-se nódulo miometrial (${d.nodTipo}) medindo ${d.nod1} x ${d.nod2} mm.\n`;

        // Saco Gestacional
        if (d.citarSg || d.subtipo.includes("INICIAL")) {
            if (d.sgLocalizacao) texto += `Saco gestacional de inserção ${d.sgLocalizacao}.\n`;
            if (d.sg1 && d.sg2 && d.sg3) texto += `Medidas do SG: ${d.sg1} x ${d.sg2} x ${d.sg3} mm.\n`;
            if (d.resDmsg) texto += `DMSG: ${d.resDmsg} mm.\n`;
            
            if (d.embriaoNaoVisualizado) texto += `Vesícula vitelina ${d.citarVv ? 'visualizada' : 'não visualizada'}. Embrião não caracterizado.\n`;
            else if (d.ccn) texto += `Embrião medindo ${d.ccn} mm de CCN.\n`;

            if (d.sgAbortoIncompleto) texto += `\nOBS: Sinais de Abortamento Incompleto (restos ovulares).\n`;
            else if (d.sgComDescolamento) texto += `\nOBS: Hematoma subcoriônico medindo ${d.desc1} x ${d.desc2} mm.\n`;
        }
        texto += '\n';
    }

    // B. Se for 2º/3º Trimestre (Biometria Completa)
    // Verifica se tem medidas para imprimir
    const temBiometria = d.dbp || d.cc || d.femur || d.ca;
    
    if (temBiometria) {
        texto += `BIOMETRIA FETAL\n`;
        const bios = [
            formatBioLine('Diâmetro Biparietal (DBP)', d.dbp),
            formatBioLine('Diâmetro Occipitofrontal (DOF)', d.dof),
            formatBioLine('Circunferência Cefálica (CC)', d.cc),
            formatBioLine('Circunferência Abdominal (CA)', d.ca),
            formatBioLine('Comprimento do Fêmur (CF)', d.femur),
            formatBioLine('Comprimento do Úmero', d.umero),
            formatBioLine('Cerebelo', d.cerebelo),
            formatBioLine('Cisterna Magna', d.cisternaMagna),
            formatBioLine('Ventrículo Lateral', d.ventriculoPosterior),
            formatBioLine('Osso Nasal', d.ossoNasal),
            formatBioLine('Translucência Nucal', d.tnMedida),
            formatBioLine('Comprimento Cabeça-Nádegas', d.ccn)
        ].filter(Boolean);
        
        texto += bios.join('\n') + '\n';

        // Índices e Peso
        if (d.pesoEstimado || d.resIc) {
             texto += `\nESTIMATIVAS:\n`;
             if (d.pesoEstimado || d.pesoFetal) {
                 texto += `- Peso Fetal Estimado: ${d.pesoEstimado || d.pesoFetal} g`;
                 if (d.percentil && !d.semDadosPercentil) texto += ` (Percentil: ${d.percentil})`;
                 texto += `.\n`;
             }
             if (d.resIc) texto += `- Índice Cefálico: ${d.resIc}.\n`;
             if (d.resCcCa) texto += `- Relação CC/CA: ${d.resCcCa}.\n`;
             if (d.resCfCa) texto += `- Relação Fêmur/CA: ${d.resCfCa}.\n`;
        }
        if (d.obsBiometria) texto += `Nota: ${d.obsBiometria}\n`;
        texto += '\n';
    }

    // -------------------------------------------------------------------------
    // --- BLOCO 5: ANÁLISE MORFOLÓGICA ---
    
    // A. Morfológico de 1º Trimestre
    if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `ANÁLISE MORFOLÓGICA (11-14 SEMANAS)\n`;
        
        if (d.morfCranio && d.morfCerebro) texto += `- Polo Cefálico: Contorno craniano íntegro e plexos coróides simétricos.\n`;
        else {
            if (d.morfCranio) texto += `- Crânio: Contorno craniano com ossificação presente.\n`;
            if (d.morfCerebro) texto += `- Encéfalo: Plexos coróides visibilizados.\n`;
        }
        if (d.morfFace) texto += `- Face: Perfil facial com aspecto adequado.\n`;
        if (d.morfColuna) texto += `- Coluna: Alinhamento preservado.\n`;
        if (d.morfTorax) texto += `- Tórax: Formato habitual.\n`;
        
        if (d.morfCoracao && d.morfVasosBase) texto += `- Coração: Situs solitus. 4 câmaras e vias de saída visibilizados.\n`;
        else if (d.morfCoracao) texto += `- Coração: Esboço das 4 câmaras cardíacas visibilizado.\n`;

        if (d.morfParedeAbd) texto += `- Parede Abdominal: Íntegra, com inserção normal do cordão.\n`;
        if (d.morfEstomago) texto += `- Estômago: Visibilizado no quadrante superior esquerdo.\n`;
        
        if (d.morfRins && d.morfBexiga) texto += `- Urinário: Rins e bexiga visibilizados.\n`;
        else if (d.morfBexiga) texto += `- Bexiga: Visibilizada na pelve.\n`;
        
        if (d.morfMembros) texto += `- Membros: Superiores e inferiores visibilizados.\n`;
        
        // Rastreamento Específico (TN / Osso Nasal / Ducto)
        texto += `\nRASTREAMENTO DE CROMOSSOMOPATIAS\n`;
        if (d.citarTn && d.tnMedida) texto += `- Translucência Nucal: ${d.tnMedida} mm.\n`;
        texto += `- Osso Nasal: ${d.ossoNasalPresente ? 'Presente' : 'Ausente/Não visualizado'}.\n`;
        if (d.checkDv || d.dvIP) {
             let onda = d.dvOndaAZero ? 'Zero' : (d.dvOndaAReversa ? 'Reversa' : 'Positiva');
             texto += `- Ducto Venoso: Onda A ${onda}. IP: ${d.dvIP || '-'}\n`;
        }
        
        // Tabela de Riscos (Texto descritivo, a tabela vai no PDF)
        if (d.riscoT21Basal || d.riscoT21Corrigido) {
            texto += `\nCÁLCULO DE RISCO (1:X)\n`;
            if(d.riscoT21Basal) texto += `Trissomia 21: Basal 1/${d.riscoT21Basal} | Corrigido 1/${d.riscoT21Corrigido}\n`;
            if(d.riscoT18Basal) texto += `Trissomia 18: Basal 1/${d.riscoT18Basal} | Corrigido 1/${d.riscoT18Corrigido}\n`;
            if(d.riscoT13Basal) texto += `Trissomia 13: Basal 1/${d.riscoT13Basal} | Corrigido 1/${d.riscoT13Corrigido}\n`;
        }
        texto += `\n`;
    }

    // B. Morfológico de 2º Trimestre / Obstétrico Padrão
    else {
        // Verifica se tem itens marcados
        const temMorfo = d.morfCranio || d.morfCerebro || d.morfFace || d.morfCoracao || d.morfRins;
        
        if (temMorfo) {
            texto += `ANÁLISE MORFOLÓGICA FETAL\n`;
            
            // Cabeça
            if (d.morfCranio && d.morfCerebro) texto += `- Polo Cefálico: Contorno craniano, cavum, tálamos e ventrículos normais.\n`;
            else if (d.morfCranio) texto += `- Crânio: Íntegro e formato habitual.\n`;

            // Face e Coluna
            if (d.morfFace) texto += `- Face: Lábio superior íntegro. Perfil facial normal.\n`;
            if (d.morfColuna) texto += `- Coluna Vertebral: Íntegra em toda sua extensão.\n`;

            // Tórax e Coração
            if (d.morfTorax) texto += `- Tórax: Pulmões homogêneos.\n`;
            if (d.morfCoracao && d.morfVasosBase) texto += `- Coração: Situs solitus, 4 câmaras e vias de saída normais.\n`;
            else if (d.morfCoracao) texto += `- Coração: Visibilizadas as 4 câmaras cardíacas.\n`;

            // Abdome
            if (d.morfEstomago && d.morfFigado) texto += `- Abdome: Estômago e vesícula visibilizados. Situs preservado.\n`;
            else if (d.morfEstomago) texto += `- Estômago: Visualizado à esquerda.\n`;
            if (d.morfParedeAbd) texto += `- Parede Abdominal: Íntegra.\n`;

            // Urinário e Genitália
            if (d.morfRins && d.morfBexiga) texto += `- Urinário: Rins tópicos e bexiga visualizada.\n`;
            if (d.morfGenitalia) texto += `- Genitália: Visualizada, compatível com o sexo fetal.\n`;

            // Membros
            if (d.morfMembros) texto += `- Membros: Visualizados ossos longos dos quatro membros.\n`;
            
            if (d.obsMorfologia) texto += `Nota: ${d.obsMorfologia}\n`;
            texto += `\n`;
        }
    }

    // -------------------------------------------------------------------------
    // --- BLOCO 6: ANEXOS E COLO ---

    // Placenta
    if (d.placentaLocalizacao) {
        texto += `PLACENTA: Inserção ${d.placentaLocalizacao}, grau ${d.placentaGrau || '0'} (Grannum).`;
        if (d.placentaEspessura) texto += ` Espessura de ${d.placentaEspessura} mm.`;
        texto += `\n`;
    }

    // Líquido
    if (d.liquidoAmniotico) {
        texto += `LÍQUIDO AMNIÓTICO: Quantidade ${d.liquidoAmniotico.toLowerCase()}. `;
        if (d.mbv) texto += `(Maior Bolsão Vertical = ${d.mbv} mm).`;
        else if (d.ila) texto += `(ILA = ${d.ila} mm).`;
        texto += `\n`;
    }
    if (d.obsPlacenta) texto += `Nota: ${d.obsPlacenta}\n`;

    // Cordão
    if (d.cordaoNormal || (d.cordaoCircular && d.cordaoCircular !== 'não citar')) {
        texto += `CORDÃO UMBILICAL: `;
        const partesCordao = [];
        if (d.cordaoNormal) partesCordao.push("3 vasos");
        if (d.cordaoCircular && d.cordaoCircular !== 'ausente') partesCordao.push(`circular cervical (${d.cordaoCircular})`);
        texto += partesCordao.join(', ') + `.\n`;
    }
    texto += '\n';
    
    // Vísceras Gerais (Se não saiu na morfologia)
    if (d.estomagoVisualizado || d.bexigaVisualizada) {
         texto += `Vísceras: ${d.estomagoVisualizado ? 'Estômago ' : ''}${d.bexigaVisualizada ? 'Bexiga' : ''} visualizados.\n\n`;
    }

    // Colo Uterino
    if (d.comprimentoColo || d.coloEge || d.coloSludge === 'presente' || d.citarColo1Tri) {
        texto += `AVALIAÇÃO DO COLO UTERINO (VIA ENDOVAGINAL)\n`;
        if (d.comprimentoColo) texto += `Comprimento do canal cervical: ${d.comprimentoColo} mm.\n`;
        if (d.coloEge) texto += `Eco Glandular Endocervical: ${d.coloEge === 'presente' ? 'Preservado' : 'Ausente'}.\n`;
        if (d.coloSludge === 'presente') texto += `Sinal do Sludge presente.\n`;
        if (d.coloAfunilamento) texto += `Ausência de afunilamento à manobra de compressão.\n`;
        if (d.coloConclusao) texto += `Parecer: ${d.coloConclusao}.\n`;
        texto += `\n`;
    }

    // -------------------------------------------------------------------------
    // --- BLOCO 7: COMPLEMENTARES E CONCLUSÃO ---

    // Doppler
    if (d.usarDoppler) {
        texto += `ESTUDO DOPPLERFLUXOMÉTRICO\n`;
        if (d.checkUtDir || d.utDirIP) texto += `- Art. Uterina Dir: IP ${d.utDirIP || '-'} ${d.utDirIncisura ? '(Incisura presente)' : ''}\n`;
        if (d.checkUtEsq || d.utEsqIP) texto += `- Art. Uterina Esq: IP ${d.utEsqIP || '-'} ${d.utEsqIncisura ? '(Incisura presente)' : ''}\n`;
        if (d.checkUmb || d.umbIP) texto += `- Art. Umbilical: IP ${d.umbIP || '-'} ${d.umbDiastoleZero ? '(Diástole Zero)' : ''}\n`;
        if (d.checkAcm || d.acmIP) texto += `- Art. Cerebral Média: IP ${d.acmIP || '-'}\n`;
        if (d.relacaoCerebroUmbilical) texto += `- Relação C/U: ${d.relacaoCerebroUmbilical}\n`;
        if (d.obsDoppler) texto += `Nota: ${d.obsDoppler}\n`;
        texto += `\n`;
    }

    // 3D/4D
    if (d.usar3D) {
        texto += `ESTUDO 3D/4D\n`;
        if (d.face3D) texto += `Face fetal: ${d.face3D}.\n`;
        texto += `Qualidade da imagem: ${d.qualidade3D || 'Satisfatória'}.\n`;
        if (d.obs3D) texto += `Obs: ${d.obs3D}\n`;
        texto += `\n`;
    }

    // Conclusão
    texto += `CONCLUSÃO\n`;
    
    let igFinal = d.igBiometria || d.igDum || "---";
    if (d.usarExameAnterior && d.igIgCorrigidaCalculada) igFinal = d.igIgCorrigidaCalculada;

    if (d.sgAbortoIncompleto) texto += `- Quadro compatível com Abortamento Incompleto.\n`;
    else if (d.subtipo === 'OBSTETRICO_1_TRI') {
        texto += `- Gestação compatível com ${d.resIgCcn || igFinal}.\n`;
        texto += `- Risco ajustado para cromossomopatias (Ver tabela/gráfico anexo).\n`;
    } else {
        texto += `- Gestação tópica, feto único vivo.\n`;
        texto += `- Biometria compatível com ${igFinal}.\n`;
        if (d.pesoEstimado) texto += `- Peso fetal estimado: ${d.pesoEstimado} g.\n`;
    }

    if (d.sugereRciu) texto += `- Obs: Acompanhar crescimento fetal (Suspeita de RCIU).\n`;
    if (d.obsAdicionais) texto += `\n${d.obsAdicionais}\n`;

    // -------------------------------------------------------------------------
    // --- FAXINA FINAL ---
    texto = texto.replace(/^[ \t]+/gm, ''); 
    texto = texto.replace(/\n{3,}/g, '\n\n'); 
    texto = texto.trim();

    return { texto, tituloExame: d.tituloExame || 'ULTRASSONOGRAFIA' }; // Placeholder temporário para o título
};