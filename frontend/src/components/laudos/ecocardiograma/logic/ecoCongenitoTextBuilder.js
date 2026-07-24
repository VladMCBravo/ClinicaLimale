/**
 * Montagem do texto do Ecocardiograma Congênito / Pediátrico pós-natal.
 * Saída em texto plano com marcadores `=== SEÇÃO ===` (compatível com o parser
 * do backend).
 */

import { ecoCongenitoInitialState } from './ecoCongenitoInitialState';
import { ECO_CONGENITO_DIAGNOSTICOS, CAMPOS_SEGMENTARES_CONGENITO } from './ecoCongenitoDiagnosticos';

const TITULO_EXAME = 'ECOCARDIOGRAMA';

const TIPO_EXAME_TXT = {
    transtoracico: 'Ecocardiograma transtorácico',
    transtoracico_uti: 'Ecocardiograma transtorácico à beira do leito (UTI)',
    intraop_tee: 'Ecocardiograma intraoperatório transesofágico',
};

/**
 * Aplica um preset de diagnóstico: parte dos defaults de exame normal e
 * sobrescreve os campos do preset. Assim trocar de diagnóstico nunca deixa
 * texto residual.
 */
export const aplicarDiagnosticoCongenito = (dataBase, diagnosticoKey) => {
    const def = ECO_CONGENITO_DIAGNOSTICOS[diagnosticoKey];
    if (!def) return { ...dataBase, diagnostico: diagnosticoKey };
    const novo = { ...dataBase, diagnostico: diagnosticoKey };
    CAMPOS_SEGMENTARES_CONGENITO.forEach((campo) => {
        novo[campo] = def[campo] !== undefined ? def[campo] : ecoCongenitoInitialState[campo];
    });
    if (def.momento !== undefined) novo.momento = def.momento;
    novo.conclusao = def.conclusao ?? ecoCongenitoInitialState.conclusao;
    novo.comentarios = def.comentarios ?? '';
    return novo;
};

const montarContexto = (data) => {
    const linhas = [];
    const tipo = TIPO_EXAME_TXT[data.tipoExame] || 'Ecocardiograma';
    if (data.momento === 'pos_op') {
        const po = data.diaPO ? `${data.diaPO}º pós-operatório` : 'pós-operatório';
        const dt = data.dataCirurgia ? ` (cirurgia em ${data.dataCirurgia})` : '';
        linhas.push(`${tipo} solicitado para avaliação de paciente em ${po}${dt}.`);
    } else if (data.momento === 'pre_op') {
        linhas.push(`${tipo} solicitado para avaliação pré-operatória.`);
    } else if (data.momento === 'intra_op') {
        const dt = data.dataCirurgia ? ` (${data.dataCirurgia})` : '';
        linhas.push(`${tipo} intraoperatório${dt}.`);
    } else {
        linhas.push(`${tipo}.`);
    }
    if (data.diagnosticoBase && data.diagnosticoBase.trim()) {
        linhas.push(`Base: ${data.diagnosticoBase.trim()}.`);
    }
    if (data.sc) linhas.push(`Superfície corpórea: ${data.sc} m².`);
    return linhas.join('\n');
};

const montarDescricao = (data) => {
    const linhas = [
        data.situs,
        data.conexoesVenosasSistemicas,
        data.conexoesVenosasPulmonares,
        data.conexaoAV,
        data.conexaoVA,
        data.septoInteratrial,
        data.septoInterventricular,
        data.valvasAV,
        data.atrios,
        data.ventriculoDireito,
        data.ventriculoEsquerdo,
        data.valvasSemilunares,
        data.arteriasPulmonares,
        data.arcoAortico,
        data.canalArterial,
        data.coronarias,
        data.pericardio,
        data.achadosCirurgicos,
    ].filter((l) => l && l.trim());
    return linhas.join('\n');
};

export const montarTextoCongenito = (data) => {
    let texto = '';

    const contexto = montarContexto(data);
    if (contexto) texto += contexto + '\n\n';

    texto += '=== DESCRIÇÃO ===\n' + montarDescricao(data);

    if (data.condicoesExame && data.condicoesExame.trim()) {
        texto += '\n\n=== OBSERVAÇÕES ===\n' + data.condicoesExame.trim();
    }

    texto += '\n\n=== CONCLUSÃO ===\n' + (data.conclusao || '-');

    if (data.comentarios && data.comentarios.trim()) {
        texto += '\n\n=== COMENTÁRIOS ===\n' + data.comentarios.trim();
    }

    return {
        textoPreview: texto,
        dadosEstruturados: { ...data, __tipo: 'ECO_CONGENITO' },
        tituloExame: TITULO_EXAME,
    };
};
