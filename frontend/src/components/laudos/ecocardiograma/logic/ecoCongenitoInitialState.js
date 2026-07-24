/**
 * Estado inicial do Ecocardiograma Congênito / Pediátrico pós-natal.
 *
 * Estrutura em 3 camadas (ver plano):
 *  1. Contexto do exame (tipo, momento, base, condições) — reproduz os blocos
 *     "# ... solicitado para...", "Base:", "Obs" dos modelos do médico.
 *  2. Análise segmentar (campos de texto editáveis; default = frase de normal).
 *  3. Achados adicionais em texto livre por segmento (para a anatomia específica).
 *
 * Cada campo segmentar é um texto editável; os presets de diagnóstico
 * sobrescrevem só os campos alterados.
 */
export const ecoCongenitoInitialState = {
    // ---- CONTEXTO DO EXAME ----
    tipoExame: 'transtoracico',   // transtoracico | transtoracico_uti | intraop_tee
    momento: 'diagnostico',       // diagnostico | pre_op | pos_op | intra_op
    diaPO: '',                    // dia de pós-operatório (momento = pos_op)
    dataCirurgia: '',             // data da cirurgia (momento = pos_op/intra_op)
    diagnosticoBase: '',          // "Base:" — diagnóstico de base
    condicoesExame: '',           // sedação, drogas vasoativas, dificuldade técnica

    // ---- BIOMETRIA (para BSA e percentis) ----
    peso: '',                     // kg
    altura: '',                   // cm
    sc: '',                       // BSA calculada (m²)

    // ---- DIAGNÓSTICO (biblioteca) ----
    diagnostico: 'normal',

    // ---- ANÁLISE SEGMENTAR (default = exame normal) ----
    situs: 'Situs atrial solitus. Levocardia.',
    conexoesVenosasSistemicas: 'Conexões venosas sistêmicas normais. Veia cava inferior com dimensão normal e colapsabilidade inspiratória preservada.',
    conexoesVenosasPulmonares: 'Conexões venosas pulmonares normais.',
    conexaoAV: 'Conexão atrioventricular biventricular concordante.',
    conexaoVA: 'Conexão ventrículo-arterial concordante.',
    septoInteratrial: 'Septo interatrial íntegro.',
    septoInterventricular: 'Septo interventricular íntegro.',
    valvasAV: 'Valvas atrioventriculares com morfologia e dinâmica normais.',
    atrios: 'Átrios com dimensões normais.',
    ventriculoDireito: 'Ventrículo direito com dimensões normais e função sistólica preservada à análise qualitativa.',
    ventriculoEsquerdo: 'Ventrículo esquerdo com dimensões normais e função sistólica preservada.',
    valvasSemilunares: 'Valvas aórtica e pulmonar trivalvulares, sem disfunção.',
    arteriasPulmonares: 'Artérias pulmonares confluentes, de calibre normal.',
    arcoAortico: 'Arco aórtico à esquerda com aorta abdominal posicionada à esquerda. Fluxo normal em aorta descendente e abdominal.',
    canalArterial: 'Ausência de fluxo em topografia de canal arterial.',
    coronarias: 'Óstios coronarianos contralaterais, de origem e trajeto habituais.',
    pericardio: 'Ausência de derrame pericárdico.',

    // ---- ACHADOS CIRÚRGICOS / PRÓTESES (texto livre) ----
    achadosCirurgicos: '',        // patch, Glenn, Fontan, Sano, bandagem, fluxos/gradientes

    // ---- CONCLUSÃO / COMENTÁRIOS ----
    conclusao: 'Ecocardiograma dentro dos limites da normalidade.',
    comentarios: '',
};
