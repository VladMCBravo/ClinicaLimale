/**
 * Montagem do texto final do Ecocardiograma Fetal.
 *
 * Saída em TEXTO PLANO com marcadores `=== SEÇÃO ===`, compatível com o
 * parser do backend (backend/prontuario/utils.py::formatar_texto_laudo_para_html),
 * que reconhece cabeçalhos como CONCLUSÃO / COMENTÁRIOS / CONDUTA.
 */

import { calcularScoreHuhta } from './ecoFetalCalculations';
import { ECO_FETAL_DIAGNOSTICOS } from './ecoFetalDiagnosticos';
import { ecoFetalInitialState } from './ecoFetalInitialState';

const CAMPOS_SEGMENTARES = [
    'situs', 'drenagemVenosa', 'conexaoAV', 'conexaoVA', 'forameOval',
    'septoIV', 'valvas', 'camaras', 'tresVasos', 'arcos', 'funcaoVentricular',
];

const TITULO_EXAME = 'ECOCARDIOGRAMA FETAL';

// Frase de ritmo por tipo (a parte "FC = X bpm" é anexada quando houver).
const frasesRitmo = (data) => {
    const fc = data.fcFetal ? ` FC fetal = ${data.fcFetal} bpm.` : '';
    switch (data.ritmo) {
        case 'regular':
            return `Ritmo cardíaco regular.${fc}`.trim();
        case 'extrassistoles_atriais':
            return `Ritmo cardíaco irregular por extrassístoles atriais frequentes durante o exame.${fc}`.trim();
        case 'extrassistoles_trigeminadas':
            return `Ritmo cardíaco irregular por extrassístoles atriais trigeminadas frequentes, conduzidas e não conduzidas para ventrículo, gerando um ritmo ventricular trigeminado.${fc}`.trim();
        case 'bavt':
            return `Bradicardia por bloqueio atrioventricular total.${data.fcFetal ? ` Frequência ventricular = ${data.fcFetal} bpm.` : ''}`.trim();
        case 'bloqueio_parcial':
            return `Ritmo cardíaco irregular por extrassístoles atriais trigeminadas frequentes.${fc}`.trim();
        case 'outro':
            return (data.ritmoTextoLivre || '').trim();
        default:
            return `Ritmo cardíaco regular.${fc}`.trim();
    }
};

// Corpo segmentar (descrição) de UM feto, a partir de seu estado.
const montarDescricaoSegmentar = (data) => {
    const def = ECO_FETAL_DIAGNOSTICOS[data.diagnostico] || {};

    // Casos minimalistas (óbito fetal) — sem análise segmentar.
    if (def.ocultarSegmentar) {
        return (def.descricaoCustom || '').trim();
    }

    // Casos com descrição totalmente customizada (ex.: união cardíaca).
    if (def.descricaoCustom) {
        return def.descricaoCustom.trim();
    }

    const linhas = [
        data.situs,
        data.drenagemVenosa,
        data.conexaoAV,
        data.conexaoVA,
        data.forameOval,
        data.septoIV,
        data.valvas,
        data.camaras,
        data.tresVasos,
        data.arcos,
        data.funcaoVentricular,
    ].filter((l) => l && l.trim());

    const ritmo = frasesRitmo(data);
    if (ritmo) linhas.push(ritmo);

    return linhas.join('\n');
};

// Bloco do Score de Huhta, quando habilitado.
const montarBlocoHuhta = (data) => {
    if (!data.incluirHuhta) return '';
    const { total, breakdown } = calcularScoreHuhta(data);
    let bloco = '=== SCORE DE HIDROPSIA (HUHTA) ===\n';
    breakdown.forEach((b) => {
        bloco += `${b.label}: ${b.texto} (${b.valor} pontos)\n`;
    });
    bloco += `Total: ${total}/10`;
    return bloco;
};

/**
 * Aplica um preset de diagnóstico sobre o estado, retornando um novo objeto de
 * dados com os campos segmentares/conclusão sobrescritos. Usado tanto pelo hook
 * (ao trocar o diagnóstico) quanto pelo feto 2 (gemelar).
 */
export const aplicarDiagnostico = (dataBase, diagnosticoKey) => {
    const def = ECO_FETAL_DIAGNOSTICOS[diagnosticoKey];
    if (!def) return { ...dataBase, diagnostico: diagnosticoKey };

    const novo = { ...dataBase, diagnostico: diagnosticoKey };
    // Todo campo segmentar parte do padrão "normal" e só então recebe o
    // override do preset. Assim, trocar de um diagnóstico complexo para outro
    // (ou de volta para "normal") sempre gera a descrição correta, sem texto
    // residual do diagnóstico anterior.
    CAMPOS_SEGMENTARES.forEach((campo) => {
        novo[campo] = def[campo] !== undefined ? def[campo] : ecoFetalInitialState[campo];
    });
    // Ritmo: preset define, senão volta ao padrão.
    novo.ritmo = def.ritmo !== undefined ? def.ritmo : ecoFetalInitialState.ritmo;
    novo.ritmoTextoLivre = def.ritmoTextoLivre !== undefined ? def.ritmoTextoLivre : ecoFetalInitialState.ritmoTextoLivre;
    if (def.incluirHuhta !== undefined) novo.incluirHuhta = def.incluirHuhta;
    novo.conclusao = def.conclusao ?? '';
    novo.comentarios = def.comentarios ?? '';
    novo.conduta = def.conduta ?? '';
    return novo;
};

/**
 * Monta a descrição de um segundo feto (gemelar) apenas a partir do preset de
 * diagnóstico escolhido, mais comentários livres. Não replica toda a UI do
 * feto 1 — cobre o formato dos laudos gemelares dos modelos.
 */
const montarDescricaoFeto2 = (data) => {
    const base = aplicarDiagnostico({ ...data }, data.feto2Diagnostico);
    const corpo = montarDescricaoSegmentar({ ...base, fcFetal: '', ritmo: base.ritmo || 'regular' });
    return { corpo, def: ECO_FETAL_DIAGNOSTICOS[data.feto2Diagnostico] || {} };
};

/**
 * Função principal: retorna { textoPreview, dadosEstruturados, tituloExame }.
 */
export const montarTextoFetal = (data) => {
    const gemelar = Number(data.qtdFetos) > 1;

    let texto = '';

    // Cabeçalho de gestação.
    const cab = [];
    if (data.idadeGestacional) cab.push(`Idade gestacional: ${data.idadeGestacional}`);
    if (cab.length) texto += cab.join(' | ') + '\n\n';

    // ---- DESCRIÇÃO ----
    texto += '=== DESCRIÇÃO ===\n';
    if (gemelar) texto += 'FETO I:\n';
    texto += montarDescricaoSegmentar(data);

    if (gemelar) {
        const { corpo } = montarDescricaoFeto2(data);
        texto += '\n\n----------------------------------------\nFETO II:\n';
        texto += corpo;
    }

    // ---- SCORE DE HUHTA ----
    const huhta = montarBlocoHuhta(data);
    if (huhta) texto += '\n\n' + huhta;

    // ---- CONCLUSÃO ----
    texto += '\n\n=== CONCLUSÃO ===\n';
    if (gemelar) {
        const def2 = ECO_FETAL_DIAGNOSTICOS[data.feto2Diagnostico] || {};
        texto += `FETO I: ${data.conclusao || '-'}\n`;
        texto += `FETO II: ${def2.conclusao || '-'}`;
    } else {
        texto += data.conclusao || '-';
    }

    // ---- COMENTÁRIOS ----
    const comentarios = [];
    if (data.comentarios && data.comentarios.trim()) comentarios.push(data.comentarios.trim());
    if (gemelar && data.feto2Comentarios && data.feto2Comentarios.trim()) {
        comentarios.push('FETO II: ' + data.feto2Comentarios.trim());
    }
    if (comentarios.length) {
        texto += '\n\n=== COMENTÁRIOS ===\n' + comentarios.join('\n');
    }

    // ---- CONDUTA ----
    if (data.conduta && data.conduta.trim()) {
        texto += '\n\n=== CONDUTA ===\n' + data.conduta.trim();
    }

    return {
        textoPreview: texto,
        dadosEstruturados: { ...data, __tipo: 'ECO_FETAL' },
        tituloExame: TITULO_EXAME,
    };
};
