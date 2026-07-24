/**
 * Biblioteca de diagnósticos — Ecocardiograma Congênito / Pediátrico pós-natal.
 * Presets resumidos dos modelos do médico (PDF "Modelos eco MA"). Cada preset
 * sobrescreve apenas os campos segmentares alterados + conclusão. Todo o texto
 * é editável depois de selecionado.
 */
export const ECO_CONGENITO_DIAGNOSTICOS = {
    normal: {
        label: 'Exame normal',
        grupo: 'Normal',
        conclusao: 'Ecocardiograma dentro dos limites da normalidade.',
    },

    truncus: {
        label: 'Truncus arteriosus',
        grupo: 'Complexas',
        conexaoVA: 'Via de saída única através de tronco arterial comum, sem tronco pulmonar, com as artérias pulmonares originando-se do tronco arterial.',
        septoInteratrial: 'Forame oval patente, com fluxo direcionado do átrio esquerdo para o direito.',
        septoInterventricular: 'Comunicação interventricular perimembranosa de via de saída, com fluxo bidirecional, preferencialmente do ventrículo esquerdo para o direito, sem gradiente VE-VD significativo.',
        valvasSemilunares: 'Valva truncal, levemente espessada, com restrição de abertura gerando aceleração de fluxo. Regurgitação valvar truncal de grau discreto a moderado.',
        arteriasPulmonares: 'Artérias pulmonares originando-se do tronco arterial comum.',
        conclusao: 'Truncus arteriosus.',
    },

    dsavt_balanceado: {
        label: 'DSAVT total balanceado (tipo A de Rastelli)',
        grupo: 'Complexas',
        septoInteratrial: 'Comunicação interatrial tipo ostium primum, com fluxo direcionado do átrio esquerdo para o direito.',
        septoInterventricular: 'Comunicação interventricular de via de entrada (associada a DSAV), com fluxo direcionado do ventrículo esquerdo para o direito.',
        valvasAV: 'Valva atrioventricular única com um orifício, com regurgitação de grau discreto a moderado.',
        ventriculoEsquerdo: 'Ventrículo esquerdo com via de saída alongada tipo "goose neck", sem obstrução ao fluxo de via de saída. Função sistólica preservada à análise qualitativa.',
        atrios: 'Átrio esquerdo com dimensão aumentada. Átrio direito com dimensão normal.',
        conclusao: 'Defeito do septo atrioventricular forma total, balanceado (tipo A de Rastelli).',
    },

    tetralogia_fallot: {
        label: 'Tetralogia de Fallot',
        grupo: 'Complexas',
        septoInterventricular: 'Comunicação interventricular perimembranosa de via de saída, com mal alinhamento do septo (tipo T4F), com fluxo esquerda-direita.',
        ventriculoDireito: 'Ventrículo direito com hipertrofia. Presença de desvio anterior do septo infundibular, gerando aceleração ao fluxo, com gradiente sistólico VD-TP (infundibular + valvar). Função sistólica preservada à análise qualitativa.',
        valvasSemilunares: 'Estenose valvar pulmonar. Valva pulmonar espessada, com limitação de abertura ("em domus"), com aceleração de fluxo desde o infundíbulo pulmonar. Valva aórtica trivalvular sem disfunção.',
        arteriasPulmonares: 'Artérias pulmonares confluentes.',
        conclusao: 'Tetralogia de Fallot.',
    },

    shce: {
        label: 'Síndrome de hipoplasia do coração esquerdo (SHCE)',
        grupo: 'Hipoplasias',
        conexaoVA: 'Via de saída única através de tronco pulmonar solitário (atresia aórtica).',
        septoInteratrial: 'Comunicação interatrial tipo ostium secundum, com fluxo direcionado do átrio esquerdo para o direito.',
        valvasAV: 'Valva mitral atrésica. Valva tricúspide com regurgitação de grau discreto a moderado.',
        valvasSemilunares: 'Atresia da valva aórtica. Valva pulmonar trivalvular, sem disfunção.',
        ventriculoEsquerdo: 'Ventrículo esquerdo com hipoplasia acentuada (câmara rudimentar).',
        ventriculoDireito: 'Ventrículo direito com dilatação e hipertrofia. Função sistólica preservada à análise qualitativa.',
        arcoAortico: 'Arco aórtico hipoplásico. Aorta ascendente extremamente hipoplásica. Fluxo retrógrado em aorta ascendente proveniente do canal arterial.',
        canalArterial: 'Canal arterial patente, com fluxo bidirecional, preferencial do tronco pulmonar para a aorta descendente.',
        arteriasPulmonares: 'Artérias pulmonares confluentes. Tronco pulmonar dilatado.',
        conclusao: 'Síndrome de hipoplasia do coração esquerdo (atresia mitral e aórtica). Hipoplasia do arco aórtico. Comunicação interatrial tipo ostium secundum. Persistência do canal arterial.',
    },

    pos_op_fontan: {
        label: 'Pós-operatório de Fontan',
        grupo: 'Pós-operatório',
        momento: 'pos_op',
        septoInteratrial: 'Comunicação interatrial ampla, sem restrição ao fluxo.',
        valvasAV: 'Valvas atrioventriculares sem aceleração de fluxo, com regurgitação de grau discreto.',
        ventriculoDireito: 'Ventrículo direito hipoplásico.',
        ventriculoEsquerdo: 'Ventrículo esquerdo com função sistólica preservada à análise qualitativa.',
        achadosCirurgicos: 'Anastomose tubo-APD (Fontan) com fluxo fásico e laminar. Anastomose da veia cava superior com a artéria pulmonar direita (Glenn) com fluxo laminar e fásico. Fenestração com fluxo direcionado do tubo para o átrio direito.',
        arteriasPulmonares: 'Artérias pulmonares confluentes.',
        conclusao: 'Pós-operatório de cirurgia de Fontan.',
    },
};

export const listarDiagnosticosCongenitoPorGrupo = () => {
    const grupos = {};
    Object.entries(ECO_CONGENITO_DIAGNOSTICOS).forEach(([key, def]) => {
        const g = def.grupo || 'Outros';
        if (!grupos[g]) grupos[g] = [];
        grupos[g].push({ key, label: def.label });
    });
    return grupos;
};

// Campos segmentares que os presets podem sobrescrever (o restante volta ao
// default de exame normal ao trocar de diagnóstico).
export const CAMPOS_SEGMENTARES_CONGENITO = [
    'situs', 'conexoesVenosasSistemicas', 'conexoesVenosasPulmonares',
    'conexaoAV', 'conexaoVA', 'septoInteratrial', 'septoInterventricular',
    'valvasAV', 'atrios', 'ventriculoDireito', 'ventriculoEsquerdo',
    'valvasSemilunares', 'arteriasPulmonares', 'arcoAortico', 'canalArterial',
    'coronarias', 'pericardio', 'achadosCirurgicos',
];
