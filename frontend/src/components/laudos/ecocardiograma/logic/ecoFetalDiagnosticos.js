/**
 * BIBLIOTECA DE DIAGNÓSTICOS — ECOCARDIOGRAMA FETAL
 *
 * Presets transcritos dos modelos de laudo fornecidos pelo médico
 * ("LAUDOS ECOCARDIOGRAFIA CONGÊNITA"). Cada preset sobrescreve apenas os
 * campos segmentares alterados em relação ao exame normal (ecoFetalInitialState),
 * além de conclusão / comentários / conduta.
 *
 * Campos aceitos por preset:
 *   label            → nome exibido no dropdown
 *   grupo            → agrupamento no dropdown (Normal, Arritmias, Septais, ...)
 *   situs, drenagemVenosa, conexaoAV, conexaoVA, forameOval, septoIV,
 *   valvas, camaras, tresVasos, arcos, funcaoVentricular → overrides segmentares
 *   ritmo, ritmoTextoLivre → override do ritmo
 *   conclusao, comentarios, conduta → texto final (string, \n separa linhas)
 *   descricaoCustom  → quando presente, SUBSTITUI todo o corpo segmentar
 *                      (usado em casos minimalistas: óbito fetal, união cardíaca)
 *
 * Todo o texto é editável pelo médico depois de selecionado — o preset é só
 * o ponto de partida.
 */

export const ECO_FETAL_DIAGNOSTICOS = {
    // ============================ NORMAL ============================
    normal: {
        label: 'Exame normal',
        grupo: 'Normal',
        conclusao: 'ECOCARDIOGRAMA FETAL NORMAL PARA A IDADE GESTACIONAL',
        comentarios: '',
        conduta: '',
    },
    golf_ball: {
        label: 'Golf Ball (foco ecogênico)',
        grupo: 'Normal',
        valvas: 'Aparelhos valvares com morfologia e dinâmica normais. Presença de foco ecogênico mínimo em músculo papilar da valva mitral (golf ball / variação da normalidade).',
        conclusao: 'ECOCARDIOGRAMA FETAL NORMAL PARA A IDADE GESTACIONAL',
        comentarios: 'O foco ecogênico em ventrículo esquerdo não é considerado uma malformação cardíaca, não causa nenhuma repercussão hemodinâmica e não costuma estar relacionado com problemas genéticos em gestações de baixo risco.',
        conduta: '',
    },

    // ======================= ARRITMIAS =======================
    bavt: {
        label: 'BAVT (bloqueio atrioventricular total)',
        grupo: 'Arritmias',
        ritmo: 'bavt',
        conclusao: 'ANATOMIA CARDÍACA NORMAL PARA A IDADE GESTACIONAL.\nBLOQUEIO ATRIOVENTRICULAR TOTAL.',
        comentarios: '- Feto com arritmia, com necessidade de nascer em centro de referência para avaliação de cirurgia cardíaca no período neonatal.\n- Via de parto: cesárea.',
        conduta: '',
    },
    bloqueio_parcial: {
        label: 'Bloqueio parcial (extrassístoles trigeminadas)',
        grupo: 'Arritmias',
        ritmo: 'bloqueio_parcial',
        conclusao: 'ANATOMICAMENTE NORMAL PARA A IDADE GESTACIONAL\nEXTRASSÍSTOLES ATRIAIS TRIGEMINADAS FREQUENTES',
        comentarios: '- Arritmia benigna, que costuma desaparecer espontaneamente antes ou após parto.\n- O período de bradicardia observado, chamado de "bloqueio parcial", provavelmente foi devido às extrassístoles atriais trigeminadas e não conduzidas para ventrículo, não se tratando de bloqueio atrioventricular verdadeiro.',
        conduta: '',
    },
    extrassistoles_atriais: {
        label: 'Extrassístoles atriais',
        grupo: 'Arritmias',
        ritmo: 'extrassistoles_atriais',
        conclusao: 'ANATOMICAMENTE NORMAL PARA A IDADE GESTACIONAL\nEXTRASSÍSTOLES ATRIAIS',
        comentarios: '- Arritmia benigna, que costuma desaparecer espontaneamente antes ou após parto.\n- Orientada a evitar a ingestão de alimentos e bebidas ricos em substâncias estimulantes, como café, chocolate, refrigerante ou chá preto, entre outras.',
        conduta: '',
    },

    // ===================== CÂMARAS / FLUXO =====================
    aumento_camaras_direitas: {
        label: 'Aumento de câmaras direitas',
        grupo: 'Câmaras / Fluxo',
        septoIV: 'Septo interventricular íntegro, com espessura dentro dos valores da normalidade para a idade gestacional atual.',
        valvas: 'Insuficiência tricúspide mínima. Demais aparelhos valvares com morfologia e dinâmica normais.',
        camaras: 'Câmaras direitas com dilatação discreta. Câmaras cardíacas esquerdas com dimensões normais.',
        tresVasos: 'Artéria pulmonar dilatada na posição dos três vasos.',
        arcos: 'Arco ductal com calibre e pulsatilidade normais. Istmo aórtico estreito, medindo 3,5mm, com Z score = +0,8 (nl: > -2), risco diminuído para Coarctação da Aorta (Pasquini L et al., Ultrasound Obstet Gynecol 2007; 29: 628-633).',
        conclusao: 'AUMENTO DE CÂMARAS CARDÍACAS\nANATOMICAMENTE NORMAL PARA IDADE GESTACIONAL',
        comentarios: 'A desproporção das cavidades cardíacas na posição das quatro câmaras eventualmente poderá estar relacionada com coartação de aorta em vida pós-natal. Como não é possível confirmar este diagnóstico em vida fetal, pois o istmo da aorta é normalmente estreito nos fetos, um ecocardiograma deverá ser realizado no primeiro dia de vida para confirmação da normalidade.',
        conduta: '',
    },
    canal_restritivo: {
        label: 'Canal arterial restritivo',
        grupo: 'Câmaras / Fluxo',
        valvas: 'Insuficiência tricúspide holossistólica, com moderada repercussão hemodinâmica. Demais aparelhos valvares com morfologia e dinâmica normais.',
        camaras: 'Dilatação moderada de câmaras cardíacas direitas. Câmaras cardíacas esquerdas com dimensões normais.',
        tresVasos: 'Canal arterial restritivo, com velocidade sistólica máxima de ___ m/s, diastólica final de ___ m/s e índice de pulsatilidade de ___.',
        arcos: 'Arco aórtico com calibre e pulsatilidade normais.',
        funcaoVentricular: 'Disfunção sistólica moderada do ventrículo direito. Função sistólica preservada do ventrículo esquerdo.',
        conclusao: 'CANAL ARTERIAL RESTRITIVO.\nDISFUNÇÃO SISTÓLICA MODERADA DO VENTRÍCULO DIREITO.\nINSUFICIÊNCIA TRICÚSPIDE HOLOSSISTÓLICA DE MODERADA REPERCUSSÃO HEMODINÂMICA.',
        comentarios: '',
        conduta: '',
    },
    hernia_diafragmatica: {
        label: 'Hérnia diafragmática',
        grupo: 'Câmaras / Fluxo',
        situs: 'Situs solitus, com dextrocardia secundária devido à presença de hérnia diafragmática, ponta para esquerda.',
        camaras: 'Câmaras direitas aumentadas por dois mecanismos possíveis: 1) diminuição do retorno venoso pulmonar pela diminuição da massa pulmonar; 2) diminuição do shunt AD-AE pelo aumento da pressão de átrio esquerdo, aumentando câmaras direitas.',
        arcos: 'Arco aórtico e arco ductal sem alterações evidentes.',
        conclusao: 'AUMENTO DE CÂMARAS CARDÍACAS DIREITAS.\nDEXTROCARDIA SECUNDÁRIA À HÉRNIA DIAFRAGMÁTICA.',
        comentarios: '',
        conduta: '',
    },

    // ===================== DEFEITOS SEPTAIS =====================
    civ_perimembranosa: {
        label: 'CIV perimembranosa',
        grupo: 'Defeitos septais',
        conexaoAV: 'Concordância atrioventricular e ventriculoarterial.',
        septoIV: 'Septo interventricular com comunicação perimembranosa subaórtica medindo cerca de 2mm.',
        conclusao: 'COMUNICAÇÃO INTERVENTRICULAR SEM REPERCUSSÃO HEMODINÂMICA.',
        comentarios: '',
        conduta: '',
    },
    civ_trabecular: {
        label: 'CIV trabecular muscular',
        grupo: 'Defeitos septais',
        septoIV: 'Septo interventricular com comunicação muscular trabecular medindo ___ mm, com shunt bidirecional e velocidade de fluxo de 0,6 m/s.',
        conclusao: 'COMUNICAÇÃO INTERVENTRICULAR SEM REPERCUSSÃO HEMODINÂMICA.',
        comentarios: 'Cardiopatia congênita benigna, sem necessidade de cirurgia no período neonatal.',
        conduta: '',
    },
    civ_coarctacao: {
        label: 'CIV + Coarctação de Aorta',
        grupo: 'Defeitos septais',
        septoIV: 'Comunicação interventricular perimembranosa mínima, medindo 1,4mm, com shunt bidirecional e velocidade de fluxo de 0,6 m/s.',
        valvas: 'Valva tricúspide displásica, sem disfunção. Demais aparelhos valvares com morfologia e dinâmica normais.',
        camaras: 'Câmaras direitas com dilatação importante. Câmaras cardíacas esquerdas com dimensões preservadas.',
        tresVasos: 'Artéria pulmonar dilatada na posição dos três vasos (AP=5,2mm, Ao=4,3mm e VCS=4,2mm).',
        arcos: 'Arco ductal com calibre e pulsatilidade normais. Istmo aórtico estreito, medindo 2mm, com Z score = -2,8 (nl: > -2) (coarctação segundo Pasquini L et al., Ultrasound Obstet Gynecol 2007; 29: 628-633).',
        conclusao: 'RISCO AUMENTADO PARA COARCTAÇÃO DA AORTA.\nCOMUNICAÇÃO INTERVENTRICULAR.',
        comentarios: 'A desproporção das cavidades cardíacas na posição das quatro câmaras eventualmente poderá estar relacionada com coartação de aorta em vida pós-natal. Como não é possível confirmar este diagnóstico em vida fetal, pois o istmo da aorta é normalmente estreito nos fetos, um ecocardiograma deverá ser realizado no primeiro dia de vida para confirmação da normalidade.',
        conduta: '',
    },
    coarctacao: {
        label: 'Coarctação de Aorta',
        grupo: 'Defeitos septais',
        conexaoAV: 'Conexões atrioventricular e ventrículo-arterial concordantes.',
        septoIV: 'Septo interventricular íntegro.',
        camaras: 'Câmaras direitas com dilatação moderada. Câmaras esquerdas com dimensões normais.',
        tresVasos: 'Artéria pulmonar dilatada e aorta pequena na posição dos três vasos.',
        arcos: 'Arco ductal com calibre e pulsatilidade normais. Istmo aórtico estreito, medindo 2,8mm, com Z score = -3,77 (nl: > -2) (coarctação segundo Pasquini L et al., Ultrasound Obstet Gynecol 2007; 29: 628-633).',
        conclusao: 'RISCO AUMENTADO PARA COARCTAÇÃO DA AORTA.',
        comentarios: 'A desproporção das cavidades cardíacas na posição das quatro câmaras eventualmente poderá estar relacionada com coartação de aorta em vida pós-natal. Como não é possível confirmar este diagnóstico em vida fetal, pois o istmo da aorta é normalmente estreito nos fetos, um ecocardiograma deverá ser realizado no primeiro dia de vida para confirmação da normalidade.',
        conduta: '',
    },

    // ================= CARDIOPATIAS COMPLEXAS =================
    dsav_total: {
        label: 'DSAV total (defeito de septo atrioventricular)',
        grupo: 'Complexas',
        conexaoAV: 'Conexão atrioventricular concordante, modo valva atrioventricular única.',
        conexaoVA: 'Conexão ventriculoarterial concordante, modo 2 valvas.',
        forameOval: 'Forame oval normofuncionante. Comunicação interatrial tipo Ostium Primum, medindo 7,3mm.',
        septoIV: 'Comunicação interventricular de via de entrada, medindo 9mm, com extensão para a via de saída. O anel da valva atrioventricular se relaciona com os ventrículos de maneira balanceada. As cordas da valva atrioventricular se inserem no topo do septo interventricular.',
        valvas: 'Via de saída do ventrículo esquerdo alongada tipo "Goose Neck". Demais aparelhos valvares com morfologia e dinâmica normais.',
        camaras: 'Dilatação discreta de câmaras cardíacas direitas. Câmaras cardíacas esquerdas com dimensões normais.',
        arcos: 'Arco ductal e arco aórtico com calibre e pulsatilidade normais.',
        conclusao: 'DEFEITO DE SEPTO ATRIOVENTRICULAR TOTAL.',
        comentarios: '- Cardiopatia congênita fortemente associada com trissomias, em especial com trissomia 21.\n- Cardiopatia congênita sem necessidade de nascer em centro de referência para cirurgia cardíaca no período neonatal.',
        conduta: '',
    },
    dsav_fallot: {
        label: 'DSAV total + Tetralogia de Fallot',
        grupo: 'Complexas',
        conexaoAV: 'Conexão atrioventricular concordante, modo valva única.',
        conexaoVA: 'Conexão ventriculoarterial concordante, modo duas valvas.',
        forameOval: 'Comunicação interatrial tipo Ostium Primum medindo 11mm.',
        septoIV: 'Comunicação interventricular de via de entrada medindo 5,4mm. Presença de desvio anterior do septo infundibular. O anel da valva atrioventricular se relaciona com os ventrículos de maneira balanceada. As cordas da valva atrioventricular se inserem no topo do septo interventricular.',
        valvas: 'Presença de estenose pulmonar infundíbulo-valvar importante. Valva pulmonar espessada, com abertura em domus, mede ___ mm. Presença de fluxo anterógrado acelerado pela valva pulmonar. Valva aórtica com dilatação do anel, mede ___ mm, cavalga o septo interventricular em menos de 50%.',
        tresVasos: 'Posição dos três vasos com tronco pulmonar menor que aorta. O tronco pulmonar mede 4mm, a aorta mede 6mm, artéria pulmonar direita 3,2mm e artéria pulmonar esquerda 3,8mm.',
        conclusao: 'DEFEITO DE SEPTO ATRIOVENTRICULAR TOTAL\nTETRALOGIA DE FALLOT',
        comentarios: '- Cardiopatia congênita complexa, com necessidade de assistência de parto em centro de referência em cirurgia cardíaca infantil.\n- Cardiopatia congênita com forte associação com trissomias, em especial a trissomia do 21.\n- Do ponto de vista cardiológico, não há contraindicação para parto normal.',
        conduta: '',
    },
    fallot_estenose_pulmonar: {
        label: 'Tetralogia de Fallot (com estenose pulmonar)',
        grupo: 'Complexas',
        conexaoAV: 'Conexão atrioventricular concordante, modo duas valvas.',
        conexaoVA: 'Conexão ventrículo-arterial concordante, modo duas valvas.',
        septoIV: 'Comunicação interventricular tipo mau alinhamento por desvio anterior do septo infundibular medindo 4mm.',
        valvas: 'Insuficiência tricúspide discreta protossistólica. Valva mitral sem disfunção. Anel valvar pulmonar estenótico, aceleração de fluxo em VSVD, com velocidade de 115 cm/s e gradiente VD-TP de 5mmHg. Valva aórtica com dilatação do anel, sem disfunção.',
        tresVasos: 'Posição de 3 vasos com tronco pulmonar menor que aorta (VP=4,2mm, TP=6,5mm, Ao=8,6mm, APE=4,0mm e APD=4,3mm).',
        funcaoVentricular: 'Boa função ventricular ao bidimensional.',
        conclusao: 'TETRALOGIA DE FALLOT',
        comentarios: '- Cardiopatia congênita de bom prognóstico, mas que necessita de assistência de parto em centro de referência em cirurgia cardíaca infantil.\n- Do ponto de vista cardiológico, não há contraindicação para realização de parto normal.',
        conduta: '',
    },
    fallot_agenesia_pulmonar: {
        label: 'Fallot com agenesia da valva pulmonar',
        grupo: 'Complexas',
        conexaoAV: 'Concordância atrioventricular e ventriculoarterial.',
        septoIV: 'Comunicação interventricular tipo mal alinhamento por desvio anterior do septo infundibular medindo 4,9mm.',
        valvas: 'O anel da valva pulmonar é hipoplásico e mede 2,7mm. Insuficiência pulmonar importante por agenesia dos folhetos. Dilatação aneurismática do tronco pulmonar, que mede 16,5mm. A artéria pulmonar direita mede 4,0mm e a artéria pulmonar esquerda mede 4,2mm. A valva aórtica cavalga o septo interventricular cerca de 50%. A aorta ascendente é discretamente dilatada e mede 6,2mm.',
        camaras: 'Dilatação discreta de câmaras cardíacas direitas. Câmaras cardíacas esquerdas com dimensões normais.',
        arcos: 'Arco aórtico com calibre e pulsatilidade normais.',
        funcaoVentricular: 'Boa função biventricular à análise qualitativa.',
        conclusao: 'TETRALOGIA DE FALLOT COM AGENESIA DE VALVA PULMONAR',
        comentarios: '- Cardiopatia congênita de boa anatomia. Porém, necessita nascer em centro de referência para cirurgia cardíaca no período neonatal.\n- Do ponto de vista cardiológico, não há contraindicação para realização de parto normal.',
        conduta: '',
    },
    atresia_pulmonar_civ: {
        label: 'Atresia pulmonar com CIV',
        grupo: 'Complexas',
        drenagemVenosa: 'Drenagem venosa sistêmica normal. Conexão venosa pulmonar normal.',
        conexaoVA: 'Conexão ventrículo-arterial: ausência de conexão à direita (atresia pulmonar).',
        septoIV: 'Comunicação interventricular tipo mal alinhamento medindo ___ mm.',
        valvas: 'Atresia pulmonar. Demais aparelhos valvares com morfologia e dinâmica normais. Presença de fluxo reverso na artéria pulmonar proveniente do canal arterial.',
        camaras: 'Dilatação discreta de câmaras direitas.',
        tresVasos: 'Posição de 3 vasos com tronco pulmonar não visualizado (Ao=___ mm).',
        funcaoVentricular: 'Boa função ventricular ao bidimensional.',
        conclusao: 'ATRESIA PULMONAR.\nCOMUNICAÇÃO INTERVENTRICULAR.',
        comentarios: '- Cardiopatia congênita complexa, com necessidade de assistência de parto em centro de referência em cirurgia cardíaca infantil.\n- Do ponto de vista cardiológico, não há contraindicação para parto normal.\n- Encaminhada para o ambulatório de medicina fetal.',
        conduta: 'Agendar retorno em ___.',
    },
    atresia_tricuspide: {
        label: 'Atresia tricúspide',
        grupo: 'Complexas',
        conexaoAV: 'Conexão atrioventricular: ausência de conexão à direita.',
        conexaoVA: 'Conexão ventrículo-arterial concordante, modo duas valvas.',
        forameOval: 'Comunicação interatrial ampla, fluxo do átrio direito para o esquerdo sem restrição.',
        septoIV: 'Comunicação interventricular muscular mede ___ mm, com fluxo do ventrículo esquerdo para o direito sem restrição.',
        valvas: 'Atresia tricúspide. Demais aparelhos valvares com morfologia e dinâmica normais. Presença de fluxo anterógrado em artéria pulmonar.',
        camaras: 'Ventrículo direito hipoplásico. Demais câmaras cardíacas com dimensões normais.',
        tresVasos: 'Artéria Pulmonar: 5,3 mm; Aorta: 11,8 mm; VCS: 5 mm.',
        funcaoVentricular: 'Boa função ventricular ao bidimensional.',
        conclusao: 'ATRESIA TRICÚSPIDE TIPO IB',
        comentarios: '- Cardiopatia congênita complexa, com necessidade de assistência de parto em centro de referência em cirurgia cardíaca infantil.\n- Do ponto de vista cardiológico, não há contraindicação para parto normal.\n- Encaminhada para o ambulatório de medicina fetal.',
        conduta: 'Agendar retorno em ___.',
    },
    dvsvd: {
        label: 'DVSVD (dupla via de saída do VD)',
        grupo: 'Complexas',
        conexaoAV: 'Conexão atrioventricular concordante, modo duas valvas.',
        conexaoVA: 'Conexão ventriculoarterial do tipo dupla via de saída do ventrículo direito.',
        septoIV: 'Comunicação interventricular subpulmonar medindo 7 mm.',
        valvas: 'Valva aórtica pequena, sem hipoplasia, anel mede ___ mm. Valva pulmonar com dilatação do anel, mede ___ mm, cavalga o septo interventricular em mais de 50%.',
        camaras: 'Câmaras direitas com dilatação moderada. Câmaras cardíacas esquerdas com dimensões normais.',
        tresVasos: 'Artéria pulmonar posterior e à esquerda. Aorta anterior e à direita. Tronco e ramos da artéria pulmonar com calibre e pulsatilidade normais. Aorta ascendente pequena, sem hipoplasia, mede ___ mm.',
        arcos: 'Istmo aórtico estreito, medindo 3mm, com Z score = -3,2 (nl: > -2) (coarctação segundo Pasquini L et al., Ultrasound Obstet Gynecol 2007; 29: 628-633).',
        conclusao: 'DUPLA VIA DE SAÍDA DE VENTRÍCULO DIREITO.\nCOMUNICAÇÃO INTERVENTRICULAR SUBPULMONAR.\nRISCO AUMENTADO PARA COARCTAÇÃO DA AORTA.',
        comentarios: '- Cardiopatia congênita complexa, necessita nascer em centro de referência para cirurgia cardíaca no período neonatal.\n- Do ponto de vista cardiológico, não há contraindicação para parto normal.\n- Agendar consulta no Ambulatório de Medicina Fetal.',
        conduta: '',
    },
    truncus: {
        label: 'Truncus arteriosus',
        grupo: 'Complexas',
        situs: 'Situs solitus em levocardia.',
        conexaoAV: 'Conexão atrioventricular concordante.',
        conexaoVA: 'Conexão ventrículo-arterial com via de saída única arterial tipo tronco arterial comum.',
        septoIV: 'Comunicação interventricular tipo mal alinhamento medindo 4,5mm.',
        valvas: 'Valvas atrioventriculares e ventrículo-arterial sem disfunção.',
        camaras: 'Câmaras cardíacas balanceadas.',
        tresVasos: 'Tronco arterial comum de onde emerge o tronco pulmonar medindo 3,5mm e aorta medindo 6,1mm. A veia cava superior mede 2,7mm.',
        conclusao: 'TRUNCUS ARTERIOSUS COMUNIS TIPO 1',
        comentarios: '- Cardiopatia complexa, necessita nascer em centro de referência.\n- Via de parto: conduta obstétrica.',
        conduta: 'Retorno com ___ semanas.',
    },
    tga_classica: {
        label: 'TGA clássica (transposição das grandes artérias)',
        grupo: 'Complexas',
        conexaoAV: 'Concordância atrioventricular, modo duas valvas.',
        conexaoVA: 'Discordância ventriculoarterial, modo duas valvas.',
        forameOval: 'Forame oval sem sinais de restrição ao fluxo.',
        septoIV: 'Septo interventricular íntegro.',
        valvas: 'Valvas mitral e tricúspide sem disfunção.',
        tresVasos: 'Aorta anterior, relacionada ao ventrículo direito, medindo 4,5mm. Artéria pulmonar posterior, relacionada ao ventrículo esquerdo, medindo 5,7mm.',
        arcos: 'Arco ductal e arco aórtico com calibre e pulsatilidade normais.',
        conclusao: 'TRANSPOSIÇÃO DAS GRANDES ARTÉRIAS',
        comentarios: '- Cardiopatia congênita canal-dependente, necessita nascer em centro de referência para cirurgia cardíaca no período neonatal.',
        conduta: '',
    },
    tga_civ: {
        label: 'TGA + CIV',
        grupo: 'Complexas',
        situs: 'Situs solitus.',
        drenagemVenosa: 'Conexões venosas sistêmicas e pulmonares concordantes.',
        conexaoAV: 'Concordância atrioventricular com discordância ventrículo-arterial.',
        forameOval: 'Forame oval com movimentação bidirecional.',
        septoIV: 'Comunicação interventricular por mal alinhamento posterior do septo infundibular, medindo 2,6mm.',
        valvas: 'Straddling da valva mitral.',
        tresVasos: 'Aorta anterior, relacionada ao ventrículo direito, medindo 5,5mm. Artéria pulmonar posterior, relacionada ao ventrículo esquerdo, medindo 7mm.',
        arcos: 'Canal arterial com fluxo sem sinais de restrição, PI: 2,3.',
        conclusao: 'TRANSPOSIÇÃO DAS GRANDES ARTÉRIAS\nCOMUNICAÇÃO INTERVENTRICULAR\nSTRADDLING DA VALVA MITRAL',
        comentarios: '',
        conduta: '',
    },

    // ================= ISOMERISMOS =================
    isomerismo_direito: {
        label: 'Isomerismo atrial direito',
        grupo: 'Isomerismos',
        situs: 'Situs ambiguus em levocardia e levoposição do ápice.',
        drenagemVenosa: 'Drenagem venosa pulmonar à esquerda e drenagem venosa sistêmica à direita.',
        conexaoAV: 'Conexão atrioventricular ambígua, modo valva atrioventricular única.',
        conexaoVA: 'Conexão ventriculoarterial tipo dupla via de saída do ventrículo direito.',
        forameOval: 'Forame oval normofuncionante. Comunicação interatrial tipo ostium primum, medindo 4,8mm.',
        septoIV: 'Comunicação interventricular de via de entrada, medindo 5mm com extensão perimembranosa medindo em seu maior diâmetro 8mm; comunicação muscular trabecular pequena. O anel da valva atrioventricular se relaciona com os ventrículos de maneira balanceada. As cordas da valva atrioventricular se inserem no topo do septo interventricular.',
        valvas: 'Insuficiência moderada da valva atrioventricular, com jatos regurgitativos à direita e à esquerda. Presença de duplo infundíbulo com obstrução subvalvar pulmonar. Valva pulmonar com aspecto espessado, medindo 4mm. Observa-se presença de fluxo anterógrado e retrógrado pela pulmonar. Valva aórtica normofuncionante medindo 7,8mm.',
        tresVasos: 'Aorta dilatada (9mm) emerge anterior e à direita da pulmonar. TP 6mm, APD 4mm, APE 3,6mm.',
        arcos: 'Canal arterial de calibre e pulsatilidade normal.',
        conclusao: 'ISOMERISMO ATRIAL DIREITO\nDEFEITO DE SEPTO ATRIOVENTRICULAR TOTAL\nDUPLA VIA DE SAÍDA DO VENTRÍCULO DIREITO\nESTENOSE PULMONAR INFUNDÍBULO-VALVAR IMPORTANTE',
        comentarios: '- Cardiopatia congênita com necessidade de nascer em centro de referência para cirurgia cardíaca no período neonatal.\n- Do ponto de vista cardiológico, não há contraindicação para realização de parto normal.',
        conduta: '',
    },
    isomerismo_esquerdo: {
        label: 'Isomerismo atrial esquerdo',
        grupo: 'Isomerismos',
        situs: 'Situs ambiguus em isomerismo atrial esquerdo. Levocardia com levoposição do ápice. Discordância no posicionamento entre coração e estômago (coração à esquerda e estômago à direita).',
        drenagemVenosa: 'Interrupção da porção intra-hepática da veia cava inferior com drenagem venosa realizada pela veia hemiázigos à esquerda. Drenagem venosa pulmonar aparentemente à esquerda.',
        conexaoAV: 'Conexão atrioventricular ambígua, modo valva única.',
        conexaoVA: 'Conexão ventriculoarterial concordante, modo 2 valvas.',
        forameOval: 'Comunicação interatrial ampla, do tipo átrio único.',
        septoIV: 'Comunicação interventricular de via de entrada medindo 4,2 mm com extensão para via de saída, medindo 8,3 mm. O anel da valva atrioventricular se relaciona com os ventrículos de maneira balanceada.',
        valvas: 'Valva atrioventricular única com regurgitação de grau discreto. Via de saída alongada com obstrução dinâmica pela valva atrioventricular. Fluxo aórtico com velocidade de 1,6 m/s.',
        camaras: 'Câmaras cardíacas direitas com dimensões normais. Dilatação discreta de câmaras cardíacas esquerdas.',
        tresVasos: 'Corte dos 3 vasos com tronco pulmonar dilatado medindo 10,4 mm (Z score +4,74). Artérias pulmonares confluentes.',
        arcos: 'Arco ductal e arco aórtico com calibre e pulsatilidade normais.',
        funcaoVentricular: 'Boa função ventricular ao bidimensional.',
        ritmo: 'outro',
        ritmoTextoLivre: 'Ritmo cardíaco com condução atrioventricular 1:1. FC 107 bpm (bradicardia).',
        conclusao: 'ISOMERISMO ATRIAL ESQUERDO\nDEFEITO DE SEPTO ATRIOVENTRICULAR TOTAL\nOBSTRUÇÃO DINÂMICA NA VIA DE SAÍDA DO VENTRÍCULO ESQUERDO.\nBRADICARDIA POR PROVÁVEL FOCO ECTÓPICO.\nAUSÊNCIA DE SINAIS DE HIDROPSIA FETAL.',
        comentarios: '- Cardiopatia congênita complexa, com necessidade de assistência de parto em centro de referência em cirurgia cardíaca infantil.\n- Provável parto cesariano por conta da bradicardia.',
        conduta: '',
    },

    // ============== SÍNDROMES DE HIPOPLASIA ==============
    hipoplasia_coracao_direito: {
        label: 'Síndrome da hipoplasia do coração direito',
        grupo: 'Hipoplasias',
        conexaoAV: 'Conexão atrioventricular concordante, modo duas valvas.',
        conexaoVA: 'Conexão ventriculoarterial do tipo via de saída única aórtica.',
        septoIV: 'Septo interventricular íntegro.',
        valvas: 'Hipoplasia ânulo-valvar tricúspide, com insuficiência discreta. Anel valvar mitral dilatado, com insuficiência discreta. Atresia pulmonar. Valva aórtica dilatada, sem disfunção.',
        camaras: 'Ventrículo direito hipoplásico. Dilatação moderada de câmaras cardíacas esquerdas.',
        tresVasos: 'Fístula entre a artéria coronária esquerda e o ventrículo direito. Artéria pulmonar hipoplásica, com ramos confluentes. Fluxo reverso na artéria pulmonar proveniente do canal arterial.',
        arcos: 'Arco aórtico à esquerda, com calibre e pulsatilidade normais.',
        conclusao: 'SÍNDROME DA HIPOPLASIA DO CORAÇÃO DIREITO\nHIPOPLASIA ÂNULO-VALVAR TRICÚSPIDE\nVENTRÍCULO DIREITO HIPOPLÁSICO\nATRESIA PULMONAR\nFÍSTULA CORONÁRIO-CAVITÁRIA',
        comentarios: '- Cardiopatia congênita complexa, com necessidade de nascer em centro de referência para cirurgia cardíaca no período neonatal.\n- Não há, do ponto de vista cardiológico, contraindicação para realização de parto normal.',
        conduta: '',
    },
    hipoplasia_coracao_esquerdo: {
        label: 'Síndrome da hipoplasia do coração esquerdo',
        grupo: 'Hipoplasias',
        drenagemVenosa: 'Drenagem venosa sistêmica normal. Drenagem venosa pulmonar normal. Fluxo de veias pulmonares sem sinais de restrição ao fluxo interatrial - Taketasu tipo A.',
        conexaoAV: 'Conexão atrioventricular univentricular com ausência de conexão à esquerda (atresia mitral).',
        conexaoVA: 'Conexão ventrículo-arterial tipo via de saída única pulmonar do ventrículo direito (atresia aórtica).',
        forameOval: 'Forame oval pérvio com fluxo direcionado do átrio esquerdo para o átrio direito, sem sinais de restrição no momento.',
        septoIV: 'Septo interventricular íntegro.',
        valvas: 'Atresia mitral e aórtica. Demais aparelhos valvares com morfologia e dinâmica normais. Ausência de regurgitação tricúspide.',
        camaras: 'Dilatação moderada de câmaras cardíacas direitas. Átrio esquerdo com dimensões reduzidas. Ventrículo esquerdo rudimentar.',
        tresVasos: 'Artéria pulmonar dilatada. Ramos pulmonares confluentes e de bom tamanho.',
        arcos: 'Aorta ascendente hipoplásica, mede 2,4 mm (Z-score -6,85). Istmo aórtico mede 3 mm (Z-score -1,96). Presença de fluxo reverso no arco aórtico e aorta ascendente proveniente do canal arterial.',
        funcaoVentricular: 'Boa função ventricular direita à análise qualitativa.',
        conclusao: 'SÍNDROME DA HIPOPLASIA DO CORAÇÃO ESQUERDO COM ATRESIA MITRAL E AÓRTICA.',
        comentarios: 'Cardiopatia congênita complexa, com necessidade de assistência de parto em centro de referência em cirurgia cardíaca infantil. Para melhor coordenação entre os serviços, é sugerido parto cesárea agendado.',
        conduta: '',
    },

    // ================= OUTROS =================
    hidropsia: {
        label: 'Hidropsia fetal / insuficiência cardíaca',
        grupo: 'Outros',
        conexaoAV: 'Conexões atrioventricular e ventriculoarterial concordantes.',
        incluirHuhta: true,
        conclusao: '- ANATOMIA CARDÍACA FETAL NORMAL PARA IDADE GESTACIONAL.\n- INSUFICIÊNCIA CARDÍACA',
        comentarios: '',
        conduta: '',
    },
    rabdomioma: {
        label: 'Rabdomioma (tumores cardíacos)',
        grupo: 'Outros',
        conexaoAV: 'Conexões atrioventricular e ventriculoarterial concordantes.',
        septoIV: 'Septo interventricular íntegro, com espessura dentro dos limites da normalidade para a idade gestacional. Presença de 3 massas ventriculares sendo uma em ventrículo esquerdo com área de 4,7 cm² e duas em ventrículo direito, sendo uma abaixo da valva tricúspide com área de 1,1 cm² e outra na região trabecular com área de 0,7 cm². Sem causar obstrução aos fluxos de entrada ou saída dos ventrículos, sugestivas de rabdomioma. Observam-se outras massas menores no septo interventricular.',
        conclusao: 'TUMORES CARDÍACOS COM CARACTERÍSTICAS ECOCARDIOGRÁFICAS SUGESTIVAS DE RABDOMIOMA.',
        comentarios: '- Cardiopatia com necessidade de nascer em centro de referência para cirurgia cardíaca no período neonatal.\n- Via de parto: cesárea.',
        conduta: '',
    },
    uniao_cardiaca: {
        label: 'União cardíaca (gêmeos)',
        grupo: 'Outros',
        descricaoCustom: 'União cardíaca tipo D, compartilhando uma mesma massa cardíaca composta de átrio único e duas cavidades ventriculares. Da cavidade ventricular à esquerda saem três vasos e da cavidade ventricular à direita sai um vaso. A valva atrioventricular não tem disfunção. Há uma grande comunicação interventricular.',
        conclusao: 'UNIÃO CARDÍACA TIPO D',
        comentarios: 'Do ponto de vista cardiológico, não há possibilidade de separação cirúrgica pós-natal. Prognóstico letal.',
        conduta: '',
    },
    obito_fetal: {
        label: 'Óbito fetal',
        grupo: 'Outros',
        descricaoCustom: 'Não foi observada movimentação fetal.\nAusência de batimentos cardíacos.\nAusência de fluxo sanguíneo no feto ao Color Doppler.',
        conclusao: 'ÓBITO FETAL',
        comentarios: '',
        conduta: '',
        ocultarSegmentar: true,   // sem análise segmentar nem ritmo/FC
    },
};

/**
 * Retorna a lista de opções para o dropdown, agrupada por 'grupo'.
 */
export const listarDiagnosticosPorGrupo = () => {
    const grupos = {};
    Object.entries(ECO_FETAL_DIAGNOSTICOS).forEach(([key, def]) => {
        const g = def.grupo || 'Outros';
        if (!grupos[g]) grupos[g] = [];
        grupos[g].push({ key, label: def.label });
    });
    return grupos;
};
