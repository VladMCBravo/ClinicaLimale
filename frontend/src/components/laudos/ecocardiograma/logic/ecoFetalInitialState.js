/**
 * Estado inicial do formulário de Ecocardiograma Fetal.
 *
 * A estrutura espelha a análise segmentar dos modelos de laudo fetal:
 * situs → posição → drenagem venosa → conexões AV/VA → forame oval →
 * septo interventricular → valvas → câmaras → corte dos 3 vasos →
 * arco aórtico/ductal → função → ritmo/FC → conclusão/comentários/conduta.
 *
 * Cada "campo segmentar" tem um valor 'normal' (frase padrão do exame normal)
 * ou um texto alternativo. Os presets de diagnóstico (ecoFetalDiagnosticos.js)
 * sobrescrevem apenas os campos alterados.
 */
export const ecoFetalInitialState = {
    subtipoFetal: 'ECO_FETAL',

    // ---- GESTAÇÃO / BIOMETRIA ----
    idadeGestacional: '',      // ex.: "24s3d"
    fcFetal: '',               // bpm
    comprimentoFemur: '',      // mm (insumo do Escore-Z do istmo)

    // ---- BIBLIOTECA DE DIAGNÓSTICO ----
    diagnostico: 'normal',     // chave em ecoFetalDiagnosticos

    // ---- ANÁLISE SEGMENTAR (texto por segmento; 'normal' = frase padrão) ----
    situs: 'Situs solitus em levocardia e levoposição do ápice.',
    drenagemVenosa: 'Drenagem venosa pulmonar e sistêmica normal.',
    conexaoAV: 'Conexão atrioventricular biventricular concordante, modo duas valvas.',
    conexaoVA: 'Conexão ventriculoarterial concordante, modo duas valvas.',
    forameOval: 'Forame oval normofuncionante.',
    septoIV: 'Septo interventricular íntegro, com espessura dentro dos limites da normalidade para a idade gestacional.',
    valvas: 'Aparelhos valvares com morfologia e dinâmica normais.',
    camaras: 'Câmaras cardíacas de dimensões preservadas.',
    tresVasos: 'Corte dos 3 vasos com aspecto habitual.',
    arcos: 'Arco aórtico e arco ductal com calibre e pulsatilidade normais.',
    funcaoVentricular: 'Boa função ventricular à análise qualitativa.',

    // ---- ARCO AÓRTICO / ISTMO (com Escore-Z) ----
    istmoMedida: '',           // mm
    istmoZManual: '',          // Escore-Z digitado (fallback enquanto não há cálculo automático)

    // ---- RITMO ----
    ritmo: 'regular',          // regular | extrassistoles_atriais | extrassistoles_trigeminadas | bavt | bloqueio_parcial | outro
    ritmoTextoLivre: '',       // usado quando ritmo === 'outro'

    // ---- SCORE DE HUHTA (opcional) ----
    incluirHuhta: false,
    huhtaHidropsia: 2,
    huhtaVenoso: 2,
    huhtaTamanho: 2,
    huhtaFuncao: 2,
    huhtaArterial: 2,

    // ---- CONCLUSÃO / COMENTÁRIOS / CONDUTA ----
    // Preenchidos pelo preset de diagnóstico; totalmente editáveis pelo médico.
    conclusao: 'ECOCARDIOGRAMA FETAL NORMAL PARA A IDADE GESTACIONAL',
    comentarios: '',
    conduta: '',

    // ---- GEMELAR (opcional) ----
    qtdFetos: 1,               // 1 ou 2
    feto2Diagnostico: 'normal',
    feto2Comentarios: '',
};
